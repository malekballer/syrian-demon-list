let aredlCache = null;

/**
 * Fetches the current AREDL list via CORS proxy and maps GD Level IDs to positions.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    try {
        // Use corsproxy.io to bypass the browser CORS restriction
        const response = await fetch('https://corsproxy.io/?https://api.aredl.net/api/arelist');
        if (!response.ok) throw new Error(`AREDL API error: ${response.status}`);
        
        const data = await response.json();
        aredlCache = {};

        // Build lookup map: level_id -> position
        data.forEach((entry) => {
            // AREDL matches on level_id or id
            const levelId = entry.level_id || entry.id;
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
