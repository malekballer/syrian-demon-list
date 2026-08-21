let aredlCache = null;

export async function fetchAredlRankings() {
    if (aredlCache) {
        return aredlCache;
    }

    try {
        const response = await fetch('./data/aredl.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        aredlCache = await response.json();
        return aredlCache;
    } catch (err) {
        console.warn("Could not load local AREDL rankings:", err);
        return {};
    }
}
