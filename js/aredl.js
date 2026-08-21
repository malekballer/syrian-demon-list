let aredlCache = null;

/**
 * Fetches AREDL rankings via AllOrigins proxy to bypass CORS and 403 blocks.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    try {
        // Use AllOrigins raw endpoint to strip CORS restrictions reliably
        const targetUrl = encodeURIComponent('https://api.aredl.net/api/arelist');
        const response = await fetch(`https://api.allorigins.win/raw?url=${targetUrl}`);
        
        if (!response.ok) throw new Error(`AREDL API HTTP ${response.status}`);
        
        const data = await response.json();
        aredlCache = {};

        // Map level_id to rank position
        data.forEach((entry) => {
            const levelId = entry.level_id || entry.id || entry.levelID;
            if (levelId) {
                aredlCache[levelId] = entry.position;
            }
        });

        return aredlCache;
    } catch (err) {
        console.warn("Could not load AREDL rankings:", err);
        return {};
    }
}
