import os
import tkinter as tk
from tkinter import filedialog
import zipfile
import json
import io
import time

try:
    import requests
    REQUESTS_AVAILABLE = True
    REQUEST_HEADERS = {
        'User-Agent': 'ModUpdaterCheckerClient/PythonSlugFinder/1.1'
    }
    print("Note: 'requests' module found. Modrinth API search is enabled.\nThis makes it more reliable for the web app but may take a while!")

except ImportError:
    REQUESTS_AVAILABLE = False
    print("WARNING: 'requests' module not found. Cannot search Modrinth for slugs.")
    print("Install it with: pip install requests")
    print("The script will only attempt to extract internal IDs (less reliable for the web app).")

try:
    import pyperclip
    PYPERCLIP_AVAILABLE = True
except ImportError:
    PYPERCLIP_AVAILABLE = False

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib
    except ImportError:
        tomllib = None

def search_modrinth_project(identifier, mod_name=None):
    if not REQUESTS_AVAILABLE:
        return None

    time.sleep(0.3)

    try:
        print(f"  [API] Attempting direct access for: {identifier}")
        direct_url = f"https://api.modrinth.com/v2/project/{requests.utils.quote(identifier)}"
        response = requests.get(direct_url, headers=REQUEST_HEADERS, timeout=10)

        if response.status_code == 200:
            project_data = response.json()
            slug = project_data.get('slug')
            if slug:
                print(f"  [API] Direct match found: {slug}")
                return slug
            else:
                 print(f"  [API] Direct access ok, but no slug in response for {identifier}.")


        elif response.status_code == 404:
             print(f"  [API] Direct access for '{identifier}' failed (404). Attempting search...")
             search_url = f"https://api.modrinth.com/v2/search?limit=5&query={requests.utils.quote(identifier)}"
             search_response = requests.get(search_url, headers=REQUEST_HEADERS, timeout=10)

             if search_response.status_code == 200:
                 search_data = search_response.json()
                 hits = search_data.get('hits', [])
                 if hits:
                    first_hit = hits[0]
                    hit_slug = first_hit.get('slug')
                    hit_title = first_hit.get('title')
                    hit_project_id = first_hit.get('project_id')


                    if hit_slug == identifier or hit_project_id == identifier:
                        print(f"  [API] Search match (ID match) found: {hit_slug} (for {identifier})")
                        return hit_slug
                    elif mod_name and hit_title and mod_name.lower() in hit_title.lower():
                         print(f"  [API] Search match (Name Match: '{mod_name}' -> '{hit_title}') found: {hit_slug}")
                         return hit_slug
                    elif not mod_name:
                         print(f"  [API] Search match (first hit) found: {hit_slug} (for {identifier})")
                         return hit_slug
                    else:
                         print(f"  [API] Search for '{identifier}' found hits, but unclear which is correct (Name: {mod_name}, Hit: {hit_title}). Skipping.")


                 else:
                      print(f"  [API] Search for '{identifier}' returned no results.")
                      if mod_name and mod_name.lower() != identifier.lower():
                          print(f"  [API] Attempting search with name: {mod_name}")
                          return search_modrinth_project(mod_name)

             else:
                 print(f"  [API] Search failed for '{identifier}', Status: {search_response.status_code}")

        else:
            print(f"  [API] Unexpected status during direct access for '{identifier}': {response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"  [API] Network error during query for '{identifier}': {e}")
    except Exception as e:
        print(f"  [API] Unknown error processing '{identifier}': {e}")

    return None

def extract_mod_info_from_jar(jar_path):
    mod_info = {'id': None, 'name': None}
    try:
        with zipfile.ZipFile(jar_path, 'r') as zf:
            for json_filename in ['fabric.mod.json', 'quilt.mod.json']:
                if json_filename in zf.namelist():
                    try:
                        with zf.open(json_filename) as f:
                            data = json.load(io.TextIOWrapper(f, encoding='utf-8'))
                            mod_info['id'] = data.get('id')
                            mod_info['name'] = data.get('name')
                            if mod_info['id']:
                                print(f"  [JAR] Info from {json_filename}: ID={mod_info['id']}, Name={mod_info['name']}")
                                return mod_info
                    except Exception as e:
                        print(f"  [WARN] Error reading {json_filename} in {os.path.basename(jar_path)}: {e}")

            toml_path = 'META-INF/mods.toml'
            if tomllib and toml_path in zf.namelist():
                try:
                    with zf.open(toml_path) as f:
                        data = tomllib.load(io.TextIOWrapper(f, encoding='utf-8'))
                        mods = data.get('mods')
                        if isinstance(mods, list) and len(mods) > 0:
                            first_mod = mods[0]
                            mod_info['id'] = first_mod.get('modId')
                            mod_info['name'] = first_mod.get('displayName', mod_info['id'])
                            if mod_info['id']:
                                print(f"  [JAR] Info from {toml_path}: ID={mod_info['id']}, Name={mod_info['name']}")
                                return mod_info
                except Exception as e:
                    print(f"  [WARN] Error reading/parsing {toml_path} in {os.path.basename(jar_path)}: {e}")

            if not mod_info['id']:
                return None
            else:
                 return mod_info

    except zipfile.BadZipFile:
        print(f"  [ERROR] {os.path.basename(jar_path)} is not a valid JAR/ZIP file.")
        return None
    except Exception as e:
        print(f"  [ERROR] Unexpected error processing {os.path.basename(jar_path)}: {e}")
        return None

def main():
    if not REQUESTS_AVAILABLE:
        print("\nWARNING: 'requests' is not installed. The script cannot find Modrinth Slugs.")
        print("The extracted IDs might NOT be directly usable in the web app.")


    root = tk.Tk()
    root.withdraw()

    print("\nPlease select your mods folder...")
    mod_folder = filedialog.askdirectory(title="Select your mods folder")

    if not mod_folder:
        print("No folder selected. Script will exit.")
        return

    print(f"Scanning folder: {mod_folder}")

    found_modrinth_slugs = set()
    jars_without_metadata = []
    jars_without_modrinth_project = []
    processed_files = 0

    try:
        all_files = [f for f in os.listdir(mod_folder) if os.path.isfile(os.path.join(mod_folder, f)) and f.lower().endswith('.jar')]
        total_files = len(all_files)
        print(f"Found: {total_files} .jar files.")

        for i, item in enumerate(all_files):
            item_path = os.path.join(mod_folder, item)
            processed_files += 1
            print(f"\n[{processed_files}/{total_files}] Checking: {item}")

            mod_info = extract_mod_info_from_jar(item_path)

            if mod_info and mod_info.get('id'):
                mod_id = mod_info['id']
                mod_name = mod_info.get('name')

                if REQUESTS_AVAILABLE:
                    modrinth_slug = search_modrinth_project(mod_id, mod_name)

                    if modrinth_slug:
                        found_modrinth_slugs.add(modrinth_slug)
                        print(f"  -> Modrinth Slug found: {modrinth_slug}")
                    else:
                        print(f"  -> Could not find a matching Modrinth project for ID '{mod_id}'.")
                        jars_without_modrinth_project.append({'file': item, 'id': mod_id, 'name': mod_name})
                else:
                    found_modrinth_slugs.add(mod_id)
                    jars_without_modrinth_project.append({'file': item, 'id': mod_id, 'name': mod_name})


            else:
                print(f"  -> No metadata (Mod ID) found in the JAR.")
                jars_without_metadata.append(item)

    except FileNotFoundError:
        print(f"Error: The folder '{mod_folder}' was not found.")
        return
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return

    print("\n" + "="*40)
    print("  SUMMARY")
    print("="*40)

    output_string = ""
    if found_modrinth_slugs:
        sorted_slugs = sorted(list(found_modrinth_slugs))
        print(f"\n--- Found Modrinth Slugs/IDs ({len(sorted_slugs)}) ---")
        if not REQUESTS_AVAILABLE:
             print("WARNING: Since 'requests' is missing, these are only the INTERNAL IDs!")
        for slug in sorted_slugs:
            print(f"- {slug}")
        output_string = "\n".join(sorted_slugs)
    else:
        print("\nNo Modrinth Slugs/IDs found.")


    if jars_without_modrinth_project:
        print(f"\n--- Mods with ID, but without found Modrinth Project ({len(jars_without_modrinth_project)}) ---")
        if not REQUESTS_AVAILABLE:
             print("(These are all mods, as 'requests' is missing)")
        for item_info in sorted(jars_without_modrinth_project, key=lambda x: x['file']):
            print(f"- {item_info['file']} (ID: {item_info['id']}, Name: {item_info.get('name', 'N/A')})")

    if jars_without_metadata:
        print(f"\n--- JARs without recognizable Mod ID in metadata ({len(jars_without_metadata)}) ---")
        for fname in sorted(jars_without_metadata):
            print(f"- {fname}")

    print("\n" + "="*40)

    if output_string:
        if not PYPERCLIP_AVAILABLE:
            print("\nNote: 'pyperclip' module not found. Copy to clipboard is not available.")
            print("Install it with: pip install pyperclip")

        while True:
            print("\nChoose an action:")
            print("1: Copy list of Slugs/IDs to clipboard")
            print("2: Save list of Slugs/IDs to 'modrinth_slugs.txt'")
            print("3: Continue without action")
            choice = input("Your choice (1/2/3): ").strip()

            if choice == '1':
                if PYPERCLIP_AVAILABLE:
                    try:
                        pyperclip.copy(output_string)
                        print("\nSuccess: List copied to clipboard.")
                        break
                    except Exception as e:
                        print(f"\nError copying to clipboard: {e}")
                else:
                    print("\nError: pyperclip is not installed.")

            elif choice == '2':
                try:
                    filepath = 'modrinth_slugs.txt'
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(output_string)
                        f.write("\n\n" + "="*20 + "\n")
                        if jars_without_modrinth_project:
                            f.write(f"\nMods with ID, but without found Modrinth Project ({len(jars_without_modrinth_project)}):\n")
                            for item_info in sorted(jars_without_modrinth_project, key=lambda x: x['file']):
                                f.write(f"- {item_info['file']} (ID: {item_info['id']}, Name: {item_info.get('name', 'N/A')})\n")
                        if jars_without_metadata:
                            f.write(f"\nJARs without recognizable Mod ID in metadata ({len(jars_without_metadata)}):\n")
                            for fname in sorted(jars_without_metadata):
                                f.write(f"- {fname}\n")

                    print(f"\nSuccess: List saved to '{os.path.abspath(filepath)}'.")
                    break
                except Exception as e:
                    print(f"\nError saving the file: {e}")

            elif choice == '3':
                print("\nContinuing without action.")
                break
            else:
                print("Invalid input. Please enter 1, 2, or 3.")
    else:
        print("\nNo list generated, nothing to copy or save.")


    input("\nPress Enter to exit...")


if __name__ == "__main__":
    if tomllib is None:
         print("WARNING: Module 'tomli' or 'tomllib' not found. Cannot read 'mods.toml' (Forge).")
         print("Install it with: pip install tomli")
    main()