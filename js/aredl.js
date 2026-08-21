let aredlCache = null;

/**
 * Fetches AREDL V2 rankings and maps GD level IDs to positions.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    // Endpoints in order of V2 API schema paths
    const endpoints = [
        'https://api.aredl.net/v2/levels',
        'https://api.aredl.net/v2/list',
        'https://corsproxy.io/?url=https://api.aredl.net/v2/levels'
    ];

    for (const url of endpoints) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;

            const data = await response.json();
            aredlCache = {};

            // Handle both array response or paginated object response ({ data: [...] })
            const levelsList = Array.isArray(data) ? data : (data.data || data.levels || []);

            levelsList.forEach((entry, index) => {
                const levelId = entry.level_id || entry.gd_id || entry.id;
                const position = entry.position || entry.rank || (index + 1);

                if (levelId) {
                    aredlCache[levelId] = position;
                }
            });

            if (Object.keys(aredlCache).length > 0) {
                return aredlCache;
            }
        } catch (err) {
            continue;
        }
    }

    console.warn("Could not load AREDL rankings from V2 endpoints.");
    return {};
}
