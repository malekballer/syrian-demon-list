export async function fetchAredlData() {
    try {
        const res = await fetch("./data/aredl.json");
        if (!res.ok) return { ranks: {}, tags: {} };
        const data = await res.json();
        
        const ranks = {};
        const tags = {};

        Object.entries(data).forEach(([levelId, info]) => {
            if (typeof info === 'number') {
                // Legacy fallback if info is just a rank number
                ranks[levelId] = info;
            } else {
                ranks[levelId] = info.rank;
                tags[levelId] = info.tags || [];
            }
        });

        return { ranks, tags };
    } catch (e) {
        console.error("Failed to load local AREDL data:", e);
        return { ranks: {}, tags: {} };
    }
}
