function openTab(evt, tabName) {
    window.dispatchEvent(new CustomEvent('tabchange', { detail: { evt, tabName } }));
}

document.addEventListener('DOMContentLoaded', () => {
    anime.timeline({ easing: 'easeOutExpo' }).add({
        targets: 'main > *',
        translateY: [-25, 0],
        opacity: [0, 1],
        duration: 800,
        delay: anime.stagger(100, { start: 200 })
    });

    const navLinksContainer = document.querySelector('.nav-links');
    if (navLinksContainer) {
        const tabButtons = navLinksContainer.querySelectorAll('.nav-link');
        const underline = document.createElement('span');
        underline.classList.add('nav-underline');
        navLinksContainer.appendChild(underline);

        function positionUnderline(element) {
            if (element) {
                underline.style.width = `${element.offsetWidth}px`;
                underline.style.left = `${element.offsetLeft}px`;
            }
        }

        window.addEventListener('tabchange', ({ detail }) => {
            document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
            tabButtons.forEach(btn => btn.classList.remove("active"));
            
            document.getElementById(detail.tabName).style.display = "flex";
            detail.evt.currentTarget.classList.add("active");
            
            positionUnderline(detail.evt.currentTarget);
        });
        
        const initialActiveButton = document.querySelector(".nav-link.active");
        if (initialActiveButton) {
            setTimeout(() => { initialActiveButton.click(); }, 50);
        }
    }

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
    const INITIAL_LOADING_OVERLAY = document.getElementById('initial-loading-overlay');
    const MOD_STATS_SUMMARY = document.getElementById('mod-stats-summary');
    const API_ERROR_MESSAGE = document.getElementById('api-error-message');

    const appState = { originalZip: null, indexJson: null, modDetails: [], otherFiles: [] };

    UPLOAD_INPUT.addEventListener('change', async (event) => {
        const file = event.target.files[0]; if (!file) return;
        API_ERROR_MESSAGE.classList.add('hidden');
        INITIAL_LOADING_OVERLAY.classList.remove('hidden');
        setTimeout(async () => {
            try {
                appState.originalZip = await JSZip.loadAsync(file);
                const indexFile = appState.originalZip.file('modrinth.index.json');
                if (!indexFile) throw new Error('modrinth.index.json not found.');
                appState.indexJson = JSON.parse(await indexFile.async('string'));
                await populateMcVersions();
                await displayPackInfo();
                UPLOAD_SECTION.classList.add('hidden');
                VERSION_SECTION.classList.remove('hidden');
            } catch (error) { console.error("Error reading .mrpack file:", error); alert('An error occurred. Is it a valid .mrpack?'); } 
            finally { INITIAL_LOADING_OVERLAY.classList.add('hidden'); }
        }, 50);
    });

    MC_VERSION_INPUT.addEventListener('change', () => populateLoaderVersions(MC_VERSION_INPUT.value));
    LOADER_VERSION_INPUT.addEventListener('change', () => { CHECK_UPDATES_BTN.disabled = !LOADER_VERSION_INPUT.value; });

    CHECK_UPDATES_BTN.addEventListener('click', async () => {
        LOADING_INDICATOR.classList.remove('hidden');
        API_ERROR_MESSAGE.classList.add('hidden');
        CHECK_UPDATES_BTN.disabled = true;
        const targetMcVersion = MC_VERSION_INPUT.value;
        if (!targetMcVersion) { alert('Please select a target Minecraft version.'); LOADING_INDICATOR.classList.add('hidden'); CHECK_UPDATES_BTN.disabled = false; return; }
        try {
            appState.otherFiles = appState.indexJson.files.filter(f => !f.path.startsWith('mods/'));
            const modsToScan = appState.indexJson.files.filter(f => f.path.startsWith('mods/'));
            appState.modDetails = await Promise.all(modsToScan.map(file => getModUpdateInfo(file, targetMcVersion, 'fabric')));
            updateModStatsSummary();
            applyFiltersAndRender();
            VERSION_SECTION.classList.add('hidden');
            MODS_SECTION.classList.remove('hidden');
            DOWNLOAD_SECTION.classList.remove('hidden');
        } catch (error) {
            const errorText = API_ERROR_MESSAGE.querySelector('p');
            if (error.message === 'RATE_LIMIT_EXCEEDED') {
                errorText.textContent = 'Modrinth API rate limit exceeded. Please wait a few minutes for the API to "cool down" before trying again.';
            } else {
                console.error("An error occurred during update check:", error);
                errorText.textContent = 'Could not connect to the API. Please try again later.';
            }
            API_ERROR_MESSAGE.classList.remove('hidden');
        } finally {
            LOADING_INDICATOR.classList.add('hidden');
            CHECK_UPDATES_BTN.disabled = false;
        }
    });

    SEARCH_BAR.addEventListener('input', applyFiltersAndRender);
    STATUS_FILTER.addEventListener('change', applyFiltersAndRender);
    document.querySelectorAll('input[name="default-action"]').forEach(radio => radio.addEventListener('change', applyFiltersAndRender));

    MOD_LIST_BODY.addEventListener('change', (event) => {
        if (event.target.classList.contains('action-select')) {
            const row = event.target.closest('tr');
            const mod = appState.modDetails.find(m => (m.projectId || m.modFileName) === row.dataset.modId);
            if (!mod) return;
            const versionCell = row.querySelector('.version-cell');
            const selectedAction = event.target.value;
            versionCell.textContent = (selectedAction === 'update' && mod.updateData) ? mod.updateData.version_number : mod.currentVersionNumber;
        }
    });

    GENERATE_PACK_BTN.addEventListener('click', async () => {
        const btnText = GENERATE_PACK_BTN.querySelector('.btn-text');
        const btnSpinner = GENERATE_PACK_BTN.querySelector('.spinner-inline');
        GENERATE_PACK_BTN.disabled = true; btnText.textContent = 'Generating...'; btnSpinner.classList.remove('hidden');
        try {
            const newIndexJson = JSON.parse(JSON.stringify(appState.indexJson));
            newIndexJson.dependencies.minecraft = MC_VERSION_INPUT.value;
            newIndexJson.dependencies['fabric-loader'] = LOADER_VERSION_INPUT.value;
            newIndexJson.files = [];

            const newZip = new JSZip();
            
            newIndexJson.files.push(...appState.otherFiles);
            for (const fileInfo of appState.otherFiles) {
                const originalFile = appState.originalZip.file(fileInfo.path);
                if (originalFile) {
                    const blob = await originalFile.async('blob');
                    newZip.file(fileInfo.path, blob);
                }
            }

            const modRows = document.querySelectorAll('#mod-list-body tr');
            for (const row of modRows) {
                const modId = row.dataset.modId;
                const mod = appState.modDetails.find(m => (m.projectId || m.modFileName) === modId);
                if (!mod) continue;
                
                const action = row.querySelector('.action-select').value;

                if (action === 'update' && mod.updateData) {
                    newIndexJson.files.push(mod.updateData);
                } else if (action === 'keep') {
                    newIndexJson.files.push(mod.originalFile);
                } else if (action === 'disable') {
                    const disabledFileEntry = { ...mod.originalFile, path: mod.originalFile.path.replace(/\.disabled$/, '') + '.disabled' };
                    newIndexJson.files.push(disabledFileEntry);
                }
            }

            newZip.file('modrinth.index.json', JSON.stringify(newIndexJson, null, 2));
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

    async function getModUpdateInfo(file, mcVersion, loader) {
        const modFileName = file.path.split('/').pop();
        const baseInfo = { originalFile: file, modFileName, projectId: null, status: 'Unknown', updateData: null, displayName: modFileName.replace(/\.disabled$|\.jar$/g, '').replace(/[-_.]?(fabric|forge|quilt)[-_.]?/g, ' ').replace(/[-_.]?(\d+\.\d+.*)/, '').replace(/[-_]/g, ' ').trim(), currentVersionNumber: 'N/A' };
        try {
            const vfr = await fetch(`https://api.modrinth.com/v2/version_file/${file.hashes.sha1}`);
            if (!vfr.ok) { if (vfr.status === 429) throw new Error('RATE_LIMIT_EXCEEDED'); throw new Error('API Error on version_file'); }
            const vfd = await vfr.json();
            baseInfo.projectId = vfd.project_id;
            baseInfo.currentVersionNumber = vfd.version_number;
            const pvr = await fetch(`https://api.modrinth.com/v2/project/${vfd.project_id}/version?game_versions=["${mcVersion}"]&loaders=["${loader}"]`);
            if (!pvr.ok) { if (pvr.status === 429) throw new Error('RATE_LIMIT_EXCEEDED'); throw new Error('API Error on project/version'); }
            const pvd = await pvr.json();
            if (pvd.length > 0) {
                const latestVersion = pvd[0];
                const latestFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];
                baseInfo.status = (latestFile.hashes.sha1 === file.hashes.sha1) ? 'Compatible' : 'Update';
                if (baseInfo.status === 'Update') {
                    baseInfo.updateData = { path: `mods/${latestFile.filename}`, hashes: latestFile.hashes, downloads: [latestFile.url], fileSize: latestFile.size, env: file.env, version_number: latestVersion.version_number };
                }
            } else { baseInfo.status = 'Incompatible'; }
        } catch (error) { if (error.message === 'RATE_LIMIT_EXCEEDED') throw error; console.error(`Error checking ${modFileName}:`, error); baseInfo.status = 'Error'; }
        return baseInfo;
    }
    
    function applyFiltersAndRender() {
        MOD_LIST_BODY.innerHTML = '';
        const searchTerm = SEARCH_BAR.value.toLowerCase();
        const statusFilter = STATUS_FILTER.value;
        const defaultActionForIncompatible = document.querySelector('input[name="default-action"]:checked').value;
        appState.modDetails
            .filter(mod => mod.displayName.toLowerCase().includes(searchTerm) && (statusFilter === 'all' || mod.status.toLowerCase() === statusFilter))
            .forEach(mod => {
                const row = document.createElement('tr');
                row.dataset.modId = mod.projectId || mod.modFileName;
                let defaultAction = (mod.status === 'Update') ? 'update' : (mod.status === 'Compatible') ? 'keep' : defaultActionForIncompatible;
                row.innerHTML = `
                    <td><a href="https://modrinth.com/mod/${mod.projectId || ''}" target="_blank">${mod.displayName}</a></td>
                    <td class="version-cell">${mod.currentVersionNumber}</td>
                    <td><div class="status-tag status-${mod.status.toLowerCase()}">${mod.status}</div></td>
                    <td><select class="action-select">
                        ${mod.status === 'Update' ? `<option value="update" ${defaultAction === 'update' ? 'selected' : ''}>Update</option>` : ''}
                        <option value="keep" ${defaultAction === 'keep' ? 'selected' : ''}>Keep</option>
                        <option value="disable" ${defaultAction === 'disable' ? 'selected' : ''}>Disable</option>
                        <option value="remove" ${defaultAction === 'remove' ? 'selected' : ''}>Remove</option>
                    </select></td>`;
                MOD_LIST_BODY.appendChild(row);
            });
    }
    
    function updateModStatsSummary() {
        const stats = appState.modDetails.reduce((acc, mod) => { acc.total++; acc[mod.status.toLowerCase()] = (acc[mod.status.toLowerCase()] || 0) + 1; return acc; }, { total: 0, update: 0, compatible: 0, incompatible: 0, error: 0 });
        MOD_STATS_SUMMARY.innerHTML = `<span class="stat-item stat-total">Total: ${stats.total}</span><span class="stat-item stat-update">Updates: ${stats.update || 0}</span><span class="stat-item stat-compatible">Compatible: ${stats.compatible || 0}</span><span class="stat-item stat-incompatible">Incompatible: ${stats.incompatible || 0}</span>`;
        MOD_STATS_SUMMARY.classList.remove('hidden');
    }

    async function displayPackInfo() {
        const { name, versionId, dependencies: deps } = appState.indexJson;
        CURRENT_PACK_INFO.innerHTML = `<div><p>Pack Name:</p><p>${name} (${versionId})</p></div><div><p>Current MC Version:</p><p>${deps.minecraft}</p></div><div><p>Current Loader:</p><p>fabric-loader ${deps['fabric-loader']}</p></div>`;
        MC_VERSION_INPUT.value = deps.minecraft;
        await populateLoaderVersions(deps.minecraft);
        LOADER_VERSION_INPUT.value = deps['fabric-loader'];
        CHECK_UPDATES_BTN.disabled = !!LOADER_VERSION_INPUT.value;
    }
    
    async function populateMcVersions() {
        try {
            const res = await fetch('https://meta.fabricmc.net/v2/versions/game');
            const versions = await res.json();
            MC_VERSION_INPUT.innerHTML = '<option value="">Select a version...</option>';
            versions.filter(v => v.stable).forEach(v => { const opt = document.createElement('option'); opt.value = opt.textContent = v.version; MC_VERSION_INPUT.appendChild(opt); });
            MC_VERSION_INPUT.disabled = false;
        } catch (e) { MC_VERSION_INPUT.innerHTML = '<option>Error</option>'; }
    }

    async function populateLoaderVersions(mcVersion) {
        LOADER_VERSION_INPUT.disabled = true;
        if (!mcVersion) { LOADER_VERSION_INPUT.innerHTML = '<option>Select MC version first...</option>'; return; }
        LOADER_VERSION_INPUT.innerHTML = '<option>Loading...</option>';
        try {
            const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
            const loaders = await res.json();
            LOADER_VERSION_INPUT.innerHTML = '<option value="">Select a loader...</option>';
            loaders.forEach(entry => { const opt = document.createElement('option'); opt.value = opt.textContent = entry.loader.version; LOADER_VERSION_INPUT.appendChild(opt); });
            LOADER_VERSION_INPUT.disabled = false;
        } catch (e) { LOADER_VERSION_INPUT.innerHTML = '<option>No loaders found</option>'; }
    }
});