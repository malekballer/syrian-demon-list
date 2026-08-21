let aredlCache = null;

/**
 * Fetches the current AREDL V2 level list and maps GD Level IDs to positions.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    try {
        // Updated V2 API endpoint
        const response = await fetch('https://api.aredl.net/v2/api/levels');
        if (!response.ok) throw new Error(`AREDL V2 API Error: ${response.status}`);
        
        const data = await response.json();
        aredlCache = {};

        // V2 JSON structure mapping
        data.forEach((entry) => {
            // Check for level_id or id in V2 response
            const levelId = entry.level_id || entry.id;
            if (levelId) {
                aredlCache[levelId] = entry.position;
            }
        });

        return aredlCache;
    } catch (err) {
        console.warn("Could not load AREDL V2 rankings:", err);
        return {};
    }
}
