// Memory cache to avoid hitting the API multiple times per session
let aredlCache = null;

/**
 * Fetches the current AREDL list and maps GD Level IDs to their positions.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    try {
        const response = await fetch('https://api.aredl.net/api/arelist');
        if (!response.ok) throw new Error(`AREDL API error: ${response.status}`);
        
        const data = await response.json();
        aredlCache = {};

        // Build key-value map: level_id -> position
        data.forEach((entry) => {
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
