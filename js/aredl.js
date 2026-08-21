let aredlCache = null;

/**
 * Fetches AREDL rankings using direct fallback endpoints.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    // List of endpoints to try sequentially
    const endpoints = [
        'https://api.aredl.net/api/arelist',
        'https://aredl.pages.dev/api/arelist',
        'https://api.codetabs.com/v1/proxy?quest=https://api.aredl.net/api/arelist'
    ];

    for (const url of endpoints) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;

            const text = await response.text();
            
            // Validate that response is actual JSON, not an HTML error page
            if (!text.trim().startsWith('[')) continue;

            const data = JSON.parse(text);
            aredlCache = {};

            data.forEach((entry) => {
                const levelId = entry.level_id || entry.id || entry.levelID;
                if (levelId) {
                    aredlCache[levelId] = entry.position;
                }
            });

            return aredlCache;
        } catch (e) {
            // Try next endpoint if this one fails
            continue;
        }
    }

    console.warn("Could not load AREDL rankings from any endpoint.");
    return {};
}
