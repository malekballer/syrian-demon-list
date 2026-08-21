let aredlCache = null;

/**
 * Fetches AREDL list via jsDelivr open CDN to bypass CORS restrictions completely.
 * @returns {Promise<Object>} Map of { [levelId]: position }
 */
export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    try {
        // Fetch public list data via open CDN (always allows CORS)
        const response = await fetch('https://cdn.jsdelivr.net/gh/All-Rated-Extreme-Demon-List/guidelines@main/list.json');
        
        if (!response.ok) {
            throw new Error(`CDN Response Error: ${response.status}`);
        }

        const data = await response.json();
        aredlCache = {};

        data.forEach((entry, index) => {
            const levelId = entry.level_id || entry.id || entry.gd_id;
            const position = entry.position || (index + 1);

            if (levelId) {
                aredlCache[levelId] = position;
            }
        });

        return aredlCache;
    } catch (err) {
        console.warn("CDN fetch failed, switching to static fallback...", err);
        return {};
    }
}
