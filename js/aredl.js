export async function fetchAredlRankings() {
    try {
        const res = await fetch("https://api.aredl.net/v2/api/aredl/list");
        if (!res.ok) return {};
        const data = await res.json();
        const rankings = {};
        data.forEach(item => {
            if (item.level_id) {
                rankings[item.level_id] = item.position;
            }
        });
        return rankings;
    } catch (e) {
        console.error("Failed to fetch AREDL rankings:", e);
        return {};
    }
}

// Fetch detailed level info with localStorage caching
export async function fetchAredlLevelDetails(levelId) {
    if (!levelId) return null;

    // Check localStorage cache first
    const cacheKey = `aredl_tags_${levelId}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            return JSON.parse(cachedData);
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const res = await fetch(`https://api.aredl.net/v2/api/aredl/levels/${levelId}`);
        if (!res.ok) return null;
        const data = await res.json();
        
        // Cache response in localStorage
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (e) {
        console.error(`Failed to fetch AREDL details for ${levelId}:`, e);
        return null;
    }
}
