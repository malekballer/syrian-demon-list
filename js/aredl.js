let aredlCache = null;

/**
 * Fetches AREDL V2 rankings using AllOrigins proxy to bypass CORS restrictions completely.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    try {
        // Route through AllOrigins proxy to bypass browser CORS headers
        const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://api.aredl.net/v2/levels');
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Proxy error: ${response.status}`);
        }

        const outerData = await response.json();
        // AllOrigins returns the raw text in outerData.contents
        const levels = JSON.parse(outerData.contents);
        
        aredlCache = {};

        // Parse list of levels and build ID -> Position map
        const levelArray = Array.isArray(levels) ? levels : (levels.data || []);
        
        levelArray.forEach((entry, index) => {
            const levelId = entry.level_id || entry.gd_id || entry.id;
            const position = entry.position || entry.rank || (index + 1);

            if (levelId) {
                aredlCache[levelId] = position;
            }
        });

        return aredlCache;
    } catch (err) {
        console.warn("Could not load AREDL rankings via proxy:", err);
        return {};
    }
}
