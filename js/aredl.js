export async function fetchAredlData() {
    try {
        const res = await fetch("./data/aredl.json");
        if (!res.ok) return { ranks: {}, tagsMap: {} };
        const data = await res.json();
        
        const ranks = {};
        const tagsMap = {};

        Object.entries(data).forEach(([levelId, info]) => {
            if (typeof info === 'number') {
                // Legacy fallback if old format
                ranks[levelId] = info;
                tagsMap[levelId] = [];
            } else {
                ranks[levelId] = info.rank;
                tagsMap[levelId] = info.tags || [];
            }
        });

        return { ranks, tagsMap };
    } catch (e) {
        console.error("Failed to load local AREDL data:", e);
        return { ranks: {}, tagsMap: {} };
    }
}
