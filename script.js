document.addEventListener('DOMContentLoaded', () => {
    const UPLOAD_SECTION = document.getElementById('upload-section');
    const VERSION_SECTION = document.getElementById('version-section');
    const MODS_SECTION = document.getElementById('mods-section');
    const DOWNLOAD_SECTION = document.getElementById('download-section');

    const UPLOAD_INPUT = document.getElementById('mrpack-upload');
    const MC_VERSION_INPUT = document.getElementById('mc-version');
    const LOADER_VERSION_INPUT = document.getElementById('loader-version');
    const CHECK_UPDATES_BTN = document.getElementById('check-updates-btn');
    const GENERATE_PACK_BTN = document.getElementById('generate-pack-btn');

    const CURRENT_PACK_INFO = document.getElementById('current-pack-info');
    const MOD_LIST_BODY = document.getElementById('mod-list-body');
    const LOADING_INDICATOR = document.getElementById('loading-indicator');
    
    const SEARCH_BAR = document.getElementById('search-bar');
    const STATUS_FILTER = document.getElementById('status-filter');

    const appState = {
        originalZip: null,
        indexJson: null,
        modDetails: [],
        otherFiles: [],
    };

    async function populateMcVersions() {
        try {
            const response = await fetch('https://meta.fabricmc.net/v2/versions/game');
            if (!response.ok) throw new Error('Could not fetch Fabric game versions.');
            const versions = await response.json();
            
            MC_VERSION_INPUT.innerHTML = '<option value="">Select a version...</option>';
            versions
                .filter(v => v.stable === true)
                .forEach(v => {
                    const option = document.createElement('option');
                    option.value = v.version;
                    option.textContent = v.version;
                    MC_VERSION_INPUT.appendChild(option);
                });
            MC_VERSION_INPUT.disabled = false;
        } catch (error) {
            console.error(error);
            MC_VERSION_INPUT.innerHTML = '<option>Error loading versions</option>';
        }
    }

    async function populateLoaderVersions(mcVersion) {
        if (!mcVersion) {
            LOADER_VERSION_INPUT.innerHTML = '<option>Select MC version first...</option>';
            LOADER_VERSION_INPUT.disabled = true;
            return;
        }

        LOADER_VERSION_INPUT.innerHTML = '<option>Loading loaders...</option>';
        LOADER_VERSION_INPUT.disabled = true;

        try {
            const response = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
            if (!response.ok) throw new Error(`Could not fetch loaders for MC ${mcVersion}.`);
            const loaders = await response.json();

            LOADER_VERSION_INPUT.innerHTML = '<option value="">Select a loader...</option>';
            loaders.forEach(entry => {
                const version = entry.loader.version;
                const option = document.createElement('option');
                option.value = version;
                option.textContent = version;
                LOADER_VERSION_INPUT.appendChild(option);
            });
            LOADER_VERSION_INPUT.disabled = false;
        } catch (error) {
            console.error(error);
            LOADER_VERSION_INPUT.innerHTML = `<option>No loaders found</option>`;
        }
    }

    MC_VERSION_INPUT.addEventListener('change', async () => {
        await populateLoaderVersions(MC_VERSION_INPUT.value);
        CHECK_UPDATES_BTN.disabled = true;
    });
    
    LOADER_VERSION_INPUT.addEventListener('change', () => {
        CHECK_UPDATES_BTN.disabled = !LOADER_VERSION_INPUT.value;
    });
    
    function extractVersion(filename) {
        if (!filename || filename === 'N/A') return 'N/A';
        const match = filename.match(/(\d+\.\d+[\w.-]*)/);
        return match ? match[0] : '???';
    }

    UPLOAD_INPUT.addEventListener('change', async (event) => {
        const file = event.target.files[0]; 
        if (!file) return;

        try {
            appState.originalZip = await JSZip.loadAsync(file);
            const indexFile = appState.originalZip.file('modrinth.index.json');
            if (!indexFile) throw new Error('modrinth.index.json not found.');
            const indexContent = await indexFile.async('string');
            appState.indexJson = JSON.parse(indexContent);
            
            await populateMcVersions();
            await displayPackInfo();
            UPLOAD_SECTION.classList.add('hidden');
            VERSION_SECTION.classList.remove('hidden');
        } catch (error) {
            console.error("Error reading .mrpack file:", error);
            alert('An error occurred while reading the file. Is it a valid .mrpack?');
        }
    });

    async function displayPackInfo() {
        const { name, versionId, dependencies } = appState.indexJson;
        CURRENT_PACK_INFO.innerHTML = `<p><strong>Pack Name:</strong> ${name} (${versionId})</p><p><strong>Current MC Version:</strong> ${dependencies.minecraft}</p><p><strong>Current Loader:</strong> fabric-loader ${dependencies['fabric-loader']}</p>`;
        
        MC_VERSION_INPUT.value = dependencies.minecraft;
        await populateLoaderVersions(dependencies.minecraft);

        LOADER_VERSION_INPUT.value = dependencies['fabric-loader'];
        CHECK_UPDATES_BTN.disabled = !LOADER_VERSION_INPUT.value;
    }
    
    CHECK_UPDATES_BTN.addEventListener('click', async () => {
        LOADING_INDICATOR.classList.remove('hidden');
        CHECK_UPDATES_BTN.disabled = true;

        const targetMcVersion = MC_VERSION_INPUT.value; 
        if (!targetMcVersion) {
            alert('Please specify a target Minecraft version.');
            LOADING_INDICATOR.classList.add('hidden');
            CHECK_UPDATES_BTN.disabled = false;
            return;
        }
        
        const modsToScan = [];
        const otherFilesToKeep = [];
        appState.indexJson.files.forEach(file => {
            if (file.path.startsWith('mods/')) {
                modsToScan.push(file);
            } else {
                otherFilesToKeep.push(file);
            }
        });
        
        appState.otherFiles = otherFilesToKeep;

        const promises = modsToScan.map(file => getModUpdateInfo(file, targetMcVersion, 'fabric'));
        appState.modDetails = await Promise.all(promises);

        applyFiltersAndRender();
        LOADING_INDICATOR.classList.add('hidden');
        CHECK_UPDATES_BTN.disabled = false;
        VERSION_SECTION.classList.add('hidden');
        MODS_SECTION.classList.remove('hidden');
        DOWNLOAD_SECTION.classList.remove('hidden');
    });

    async function getModUpdateInfo(file, mcVersion, loader) {
        const modFileName = file.path.split('/').pop();
        const baseInfo = {
            originalFile: file,
            modFileName: modFileName,
            displayName: modFileName
                .replace(/\.disabled$/, '')
                .replace(/\.jar$/, '')
                .replace(/[-_.]?fabric[-_.]?/, ' ')
                .replace(/[-_.]?forge[-_.]?/, ' ')
                .replace(/[-_.]?quilt[-_.]?/, ' ')
                .replace(/[-_.]?(\d+\.\d+.*)/, '')
                .replace(/[-_]/g, ' ')
                .replace(/\s+/, ' ')
                .trim(),
            projectId: null,
            status: 'Unknown',
            updateData: null,
        };

        try {
            const hash = file.hashes.sha1;
            const versionFileResponse = await fetch(`https://api.modrinth.com/v2/version_file/${hash}`);
            if (!versionFileResponse.ok) throw new Error(`API Error on version_file`);
            const versionFileData = await versionFileResponse.json();
            baseInfo.projectId = versionFileData.project_id;

            const projectVersionsResponse = await fetch(`https://api.modrinth.com/v2/project/${baseInfo.projectId}/version?game_versions=["${mcVersion}"]&loaders=["${loader}"]`);
            if (!projectVersionsResponse.ok) throw new Error(`API Error on project/version`);
            const projectVersionsData = await projectVersionsResponse.json();

            if (projectVersionsData.length > 0) {
                const latestVersion = projectVersionsData[0];
                const latestFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
                baseInfo.status = (latestFile.hashes.sha1 === hash) ? 'Compatible' : 'Update';
                if (baseInfo.status === 'Update') {
                    baseInfo.updateData = { path: `mods/${latestFile.filename}`, hashes: latestFile.hashes, downloads: [latestFile.url], fileSize: latestFile.size, env: file.env };
                }
            } else {
                baseInfo.status = 'Incompatible';
            }
        } catch (error) {
            console.error(`Error checking ${baseInfo.modFileName}:`, error);
            baseInfo.status = 'Error';
        }
        return baseInfo;
    }

    function applyFiltersAndRender() {
        MOD_LIST_BODY.innerHTML = '';
        const searchTerm = SEARCH_BAR.value.toLowerCase();
        const statusFilter = STATUS_FILTER.value;
        const defaultActionForIncompatible = document.querySelector('input[name="default-action"]:checked').value;

        appState.modDetails
            .filter(mod => {
                const nameMatch = mod.displayName.toLowerCase().includes(searchTerm);
                const statusMatch = statusFilter === 'all' || mod.status.toLowerCase() === statusFilter;
                return nameMatch && statusMatch;
            })
            .forEach((mod) => {
                const row = document.createElement('tr');
                row.dataset.modId = mod.projectId || mod.modFileName; 

                let statusText, statusIcon, statusClass;
                switch(mod.status) {
                    case 'Update':
                        statusText = 'Update Available';
                        statusIcon = '↑';
                        statusClass = 'status-update';
                        break;
                    case 'Compatible':
                        statusText = 'Up-to-date';
                        statusIcon = '✓';
                        statusClass = 'status-compatible';
                        break;
                    default:
                        statusText = 'Incompatible';
                        statusIcon = '✗';
                        statusClass = 'status-incompatible';
                        break;
                }
                
                let defaultAction;
                if (mod.status === 'Update') defaultAction = 'update';
                else if (mod.status === 'Compatible') defaultAction = 'keep';
                else defaultAction = defaultActionForIncompatible;

                const baseFileName = mod.modFileName.replace(/\.disabled$/, '');
                let targetVersionText = 'N/A';
                if (defaultAction === 'update') targetVersionText = extractVersion(mod.updateData.path.split('/').pop());
                else if (defaultAction === 'keep') targetVersionText = extractVersion(mod.modFileName);
                else if (defaultAction === 'disable') targetVersionText = extractVersion(baseFileName);

                row.innerHTML = `
                    <td><a href="https://modrinth.com/mod/${mod.projectId || ''}" target="_blank" rel="noopener noreferrer">${mod.displayName}</a></td>
                    <td class="target-version-cell">${targetVersionText}</td>
                    <td>
                        <div class="status-cell ${statusClass}">
                            <span class="status-icon">${statusIcon}</span>
                            <span>${statusText}</span>
                        </div>
                    </td>
                    <td>
                        <select class="action-select">
                            ${mod.status === 'Update' ? `<option value="update" ${defaultAction === 'update' ? 'selected' : ''}>Update</option>` : ''}
                            <option value="keep" ${defaultAction === 'keep' ? 'selected' : ''}>Keep</option>
                            <option value="disable" ${defaultAction === 'disable' ? 'selected' : ''}>Disable</option>
                            <option value="remove" ${defaultAction === 'remove' ? 'selected' : ''}>Remove</option>
                        </select>
                    </td>
                `;
                MOD_LIST_BODY.appendChild(row);
            });
    }

    SEARCH_BAR.addEventListener('input', applyFiltersAndRender);
    STATUS_FILTER.addEventListener('change', applyFiltersAndRender);
    document.querySelectorAll('input[name="default-action"]').forEach(radio => {
        radio.addEventListener('change', applyFiltersAndRender);
    });

    MOD_LIST_BODY.addEventListener('change', (event) => {
        if (event.target.classList.contains('action-select')) {
            const row = event.target.closest('tr');
            const modId = row.dataset.modId;
            const mod = appState.modDetails.find(m => (m.projectId || m.modFileName) === modId);
            if (!mod) return;

            const targetCell = row.querySelector('.target-version-cell');
            const selectedAction = event.target.value;
            const baseFileName = mod.modFileName.replace(/\.disabled$/, '');

            let newText = 'N/A';
            if (selectedAction === 'update' && mod.updateData) newText = extractVersion(mod.updateData.path.split('/').pop());
            else if (selectedAction === 'keep') newText = extractVersion(mod.modFileName);
            else if (selectedAction === 'disable') newText = extractVersion(baseFileName);
            
            targetCell.textContent = newText;
        }
    });

    GENERATE_PACK_BTN.addEventListener('click', async () => {
        const btnText = GENERATE_PACK_BTN.querySelector('.btn-text');
        const btnSpinner = GENERATE_PACK_BTN.querySelector('.spinner-inline');
        
        GENERATE_PACK_BTN.disabled = true;
        btnText.textContent = 'Generating...';
        btnSpinner.classList.remove('hidden');

        try {
            const newIndexJson = JSON.parse(JSON.stringify(appState.indexJson));
            newIndexJson.dependencies.minecraft = MC_VERSION_INPUT.value;
            newIndexJson.dependencies['fabric-loader'] = LOADER_VERSION_INPUT.value;
            newIndexJson.files = [];

            document.querySelectorAll('#mod-list-body tr').forEach(row => {
                const modId = row.dataset.modId;
                const mod = appState.modDetails.find(m => (m.projectId || m.modFileName) === modId);
                const action = row.querySelector('.action-select').value;
                
                if (action === 'update' && mod.updateData) {
                    newIndexJson.files.push(mod.updateData);
                } else if (action === 'keep') {
                    newIndexJson.files.push(mod.originalFile);
                } else if (action === 'disable') {
                    const disabledFile = JSON.parse(JSON.stringify(mod.originalFile));
                    disabledFile.path = disabledFile.path.replace(/\.disabled$/, '') + '.disabled';
                    newIndexJson.files.push(disabledFile);
                }
            });

            if (appState.otherFiles.length > 0) {
                newIndexJson.files.push(...appState.otherFiles);
            }
            
            const newZip = new JSZip();
            newZip.file('modrinth.index.json', JSON.stringify(newIndexJson, null, 2));
            for (const fileName in appState.originalZip.files) {
                if (fileName !== 'modrinth.index.json') {
                    const fileData = await appState.originalZip.files[fileName].async('blob');
                    newZip.file(fileName, fileData);
                }
            }
            const content = await newZip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `updated-${appState.indexJson.name.replace(/\s/g, '_')}.mrpack`;
            link.click();
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error("Error generating the new .mrpack file:", error);
            alert('An error occurred while generating the new file.');
        } finally {
            GENERATE_PACK_BTN.disabled = false;
            btnText.textContent = 'Download New Modpack';
            btnSpinner.classList.add('hidden');
        }
    });
});