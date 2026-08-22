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

// Fetch detailed level info (including tags) for a specific GD ID
export async function fetchAredlLevelDetails(levelId) {
    if (!levelId) return null;
    try {
        const res = await fetch(`https://api.aredl.net/v2/api/aredl/levels/${levelId}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(`Failed to fetch AREDL details for ${levelId}:`, e);
        return null;
    }
}
