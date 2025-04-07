// Get DOM Elements
const modListTextarea = document.getElementById('mod-list');
const currentMcVersionInput = document.getElementById('current-mc-version');
const currentLoaderSelect = document.getElementById('current-loader');
const targetMcVersionInput = document.getElementById('target-mc-version');
const targetLoaderSelect = document.getElementById('target-loader');
const checkButton = document.getElementById('check-button');
const statusMessage = document.getElementById('status-message');
const resultsBody = document.getElementById('results-body');
const resultsTable = document.getElementById('results-table');
const filterNameInput = document.getElementById('filter-name');
const filterAvailabilitySelect = document.getElementById('filter-availability');

let allModResults = [];

// --- Event Listeners ---
checkButton.addEventListener('click', handleCheckUpdates);
filterNameInput.addEventListener('input', applyFilters);
filterAvailabilitySelect.addEventListener('change', applyFilters);

// --- Main Update Check Function ---
async function handleCheckUpdates() {
    const modIdentifiers = modListTextarea.value.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const targetMcVersion = targetMcVersionInput.value.trim();
    const targetLoader = targetLoaderSelect.value;

    if (modIdentifiers.length === 0) {
        statusMessage.textContent = 'Please enter Mod IDs or Slugs.';
        statusMessage.style.color = 'red';
        return;
    }
    if (!targetMcVersion) {
        statusMessage.textContent = 'Please enter a target Minecraft version.';
        statusMessage.style.color = 'red';
        return;
    }

    resultsBody.innerHTML = '';
    statusMessage.textContent = 'Checking mods...';
    statusMessage.style.color = 'orange';
    checkButton.disabled = true;
    allModResults = [];

    const promises = modIdentifiers.map(idOrSlug => checkModAvailability(idOrSlug, targetMcVersion, targetLoader));

    try {
        const results = await Promise.all(promises);
        allModResults = results.filter(result => result !== null);
        applyFilters();
        statusMessage.textContent = `Check complete for ${allModResults.length} mods.`;
        statusMessage.style.color = 'green';

    } catch (error) {
        console.error('Error fetching mod data:', error);
        statusMessage.textContent = 'An error occurred. Check the console for details.';
        statusMessage.style.color = 'red';
    } finally {
         checkButton.disabled = false;
    }
}

// --- Function to Query Modrinth API for a Single Mod ---
async function checkModAvailability(idOrSlug, targetMcVersion, targetLoader) {
    const apiUrl = `https://api.modrinth.com/v2/project/${encodeURIComponent(idOrSlug)}`;
    const versionsUrl = `${apiUrl}/version`;

    try {
        const projectResponse = await fetch(apiUrl);
        if (!projectResponse.ok) {
            console.warn(`Project ${idOrSlug} not found or API error: ${projectResponse.status}`);
            return { name: `${idOrSlug} (Not Found)`, id: idOrSlug, available: false, link: null, statusText: 'Not Found' };
        }
        const projectData = await projectResponse.json();
        const modName = projectData.title || idOrSlug;
        const modLink = `https://modrinth.com/mod/${projectData.slug || idOrSlug}`;

        const params = new URLSearchParams({
            loaders: JSON.stringify([targetLoader]),
            game_versions: JSON.stringify([targetMcVersion])
        });
        const versionResponse = await fetch(`${versionsUrl}?${params.toString()}`);

        if (!versionResponse.ok) {
            console.warn(`Could not load versions for ${modName}: ${versionResponse.status}`);
            return { name: modName, id: idOrSlug, available: false, link: modLink, statusText: 'Not Available' }; // Simplified status
        }

        const versions = await versionResponse.json();

        const isAvailable = versions.length > 0;
        const statusText = isAvailable ? 'Available' : 'Not Available';

        return { name: modName, id: idOrSlug, available: isAvailable, link: modLink, statusText: statusText };

    } catch (error) {
        console.error(`Error processing mod ${idOrSlug}:`, error);
         return { name: `${idOrSlug} (Error)`, id: idOrSlug, available: false, link: null, statusText: 'API Error' };
    }
}

// --- Function to Apply Filters and Display Results ---
function applyFilters() {
    const nameFilter = filterNameInput.value.toLowerCase();
    const availabilityFilter = filterAvailabilitySelect.value; // 'all', 'available', 'not-available'

    const filteredResults = allModResults.filter(mod => {
        const nameMatch = mod.name.toLowerCase().includes(nameFilter);

        let availabilityMatch = true;
        if (availabilityFilter === 'available') {
            availabilityMatch = mod.available;
        } else if (availabilityFilter === 'not-available') {
            availabilityMatch = !mod.available;
        }

        return nameMatch && availabilityMatch;
    });

    displayResults(filteredResults);
}

// --- Function to Display Results in the Table ---
function displayResults(results) {
    resultsBody.innerHTML = '';

    if (results.length === 0 && allModResults.length > 0) {
         const row = resultsBody.insertRow();
         const cell = row.insertCell();
         cell.colSpan = 3;
         cell.textContent = 'No mods match the current filters.';
         cell.style.textAlign = 'center';
         cell.style.fontStyle = 'italic';
         return;
    }
    if (results.length === 0 && allModResults.length === 0 && !statusMessage.textContent.includes('Checking')) { // Check against English status
         const row = resultsBody.insertRow();
         const cell = row.insertCell();
         cell.colSpan = 3;
         cell.textContent = 'No mods checked yet or none found.';
         cell.style.textAlign = 'center';
         cell.style.fontStyle = 'italic';
         return;
    }

    results.forEach(mod => {
        const row = resultsBody.insertRow();
        row.className = mod.available ? 'available' : 'not-available';

        const nameCell = row.insertCell();
        const statusCell = row.insertCell();
        const linkCell = row.insertCell();

        nameCell.textContent = mod.name;
        statusCell.textContent = mod.statusText;

        if (mod.link) {
            const link = document.createElement('a');
            link.href = mod.link;
            link.textContent = 'Modrinth Page';
            link.target = '_blank';
            linkCell.appendChild(link);
        } else {
            linkCell.textContent = '-';
        }
    });
}