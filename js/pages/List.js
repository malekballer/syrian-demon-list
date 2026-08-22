import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchAredlRankings, fetchAredlLevelDetails } from "../aredl.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

const FILTER_TAGS = ["2.2", "Long", "NONG", "Fast-Paced", "Timings", "Chokepoints", "Ship", "Wave", "Flow"];

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <!-- Sidebar Level Selection & Filter Controls -->
            <div class="list-container">
                
                <!-- Search & Filter Bar Row -->
                <div class="search-filter-row" style="display: flex; gap: 0.5rem; align-items: center;">
                    <input 
                        type="text" 
                        class="search-bar" 
                        v-model="query" 
                        placeholder="Search levels or creators..." 
                        style="flex: 1;"
                    />
                    <button 
                        @click="showFilterMenu = !showFilterMenu"
                        :style="{
                            padding: '0.6rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid var(--card-border, #333)',
                            background: selectedTags.length > 0 ? 'var(--color-primary, #007A3D)' : 'var(--card-sub-bg, #1f222c)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.85rem'
                        }"
                    >
                        ⚙️ Filters {{ selectedTags.length ? \`(\${selectedTags.length})\` : '' }}
                    </button>
                </div>

                <!-- Dropdown Tag Filter Selection Box -->
                <div v-if="showFilterMenu" style="margin-top: 0.75rem; padding: 0.75rem; background: var(--card-sub-bg, #1a1c23); border: 1px solid var(--card-border, #333); border-radius: 8px;">
                    <div style="font-size: 0.8rem; font-weight: 700; opacity: 0.8; margin-bottom: 0.5rem;">FILTER BY AREDL TAGS:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                        <button 
                            v-for="tag in availableTags" 
                            :key="tag"
                            @click="toggleTag(tag)"
                            :style="{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                border: '1px solid var(--card-border, #333)',
                                background: selectedTags.includes(tag) ? 'var(--color-primary, #007A3D)' : 'transparent',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                            }"
                        >
                            {{ tag }}
                        </button>
                    </div>
                    <div v-if="selectedTags.length > 0" style="margin-top: 0.5rem; text-align: right;">
                        <button @click="selectedTags = []" style="background: none; border: none; color: #ce1126; cursor: pointer; font-size: 0.75rem; text-decoration: underline;">
                            Reset Filters
                        </button>
                    </div>
                </div>

                <!-- Level List -->
                <table class="list" v-if="list" style="margin-top: 0.75rem;">
                    <tr v-for="({ level, err, originalIndex }) in filteredList" :key="originalIndex">
                        <td class="rank">
                            <p v-if="originalIndex + 1 <= 150" class="type-label-lg">#{{ originalIndex + 1 }}</p>
                            <p v-else class="type-label-lg">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selectedLevelId === level?.id, 'error': !level }">
                            <button @click="selectLevel(originalIndex)">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Middle Level Detail View -->
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem;">{{ level.name }}</h1>
                    
                    <!-- Author Meta & Dynamic AREDL Tags -->
                    <div class="level-meta-box">
                        <div class="level-meta-row"><strong>CREATORS:</strong> <span>{{ level.creators ? level.creators.join(', ') : level.author }}</span></div>
                        <div class="level-meta-row"><strong>VERIFIER:</strong> <span>{{ level.verifier }}</span></div>
                        <div class="level-meta-row"><strong>PUBLISHER:</strong> <span>{{ level.author }}</span></div>
                        
                        <div class="level-meta-row" v-if="currentAredlTags.length > 0" style="margin-top: 0.25rem;">
                            <strong>TAGS:</strong> 
                            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                                <span v-for="tag in currentAredlTags" :key="tag" style="background: rgba(0,122,61,0.2); border: 1px solid var(--color-primary, #007A3D); padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                                    {{ tag }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <iframe class="video" id="videoframe" :src="video" frameborder="0" style="border-radius: 10px; width: 100%; aspect-ratio: 16/9; margin-bottom: 1rem;"></iframe>

                    <!-- Stat Cards -->
                    <div class="stat-pill-grid">
                        <div class="stat-pill-item">
                            <span class="stat-pill-label">Points When Completed</span>
                            <span class="stat-pill-value">{{ score(selected + 1, 100, level.percentToQualify, list.length) }}</span>
                        </div>
                        <div class="stat-pill-item">
                            <span class="stat-pill-label">ID</span>
                            <span class="stat-pill-value" @click="copyId(level.id)" style="cursor: pointer;">
                                {{ copied ? 'Copied!' : level.id }}
                            </span>
                        </div>
                        <div class="stat-pill-item">
                            <span class="stat-pill-label">AREDL Rank</span>
                            <span class="stat-pill-value">{{ aredlRanks[level.id] ? '#' + aredlRanks[level.id] : 'N/A' }}</span>
                        </div>
                    </div>

                    <h2>Records</h2>
                    <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected + 1 <= 150"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`./assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Right Column Meta -->
            <div class="meta-container">
                <div class="meta">
                    <template v-if="editors">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="'/syrian-demon-list/assets/' + roleIconMap[editor.role] + '.svg'" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        aredlRanks: {},
        aredlDetailsMap: {},
        loading: true,
        selected: 0,
        query: '',
        showFilterMenu: false,
        selectedTags: [],
        availableTags: FILTER_TAGS,
        copied: false,
        roleIconMap,
        store
    }),
    computed: {
        level() {
            return this.list[this.selected]?.[0] || null;
        },
        selectedLevelId() {
            return this.level?.id || null;
        },
        currentAredlTags() {
            if (!this.selectedLevelId) return [];
            return this.aredlDetailsMap[this.selectedLevelId]?.tags || [];
        },
        video() {
            if (!this.level) return '';
            const rawUrl = this.level.showcase || this.level.verification || this.level.video;
            return rawUrl ? embed(rawUrl) : '';
        },
        filteredList() {
            if (!this.list) return [];
            
            let result = this.list.map(([level, err], i) => ({
                level,
                err,
                originalIndex: i
            }));

            // Filter by AREDL Tags
            if (this.selectedTags.length > 0) {
                result = result.filter(({ level }) => {
                    if (!level?.id) return false;
                    const levelTags = this.aredlDetailsMap[level.id]?.tags || [];
                    return this.selectedTags.every(t => levelTags.includes(t));
                });
            }

            // Text Search Filter
            if (this.query.trim()) {
                const q = this.query.toLowerCase().trim();
                result = result.filter(({ level }) => {
                    if (!level) return false;
                    const nameMatch = level.name?.toLowerCase().includes(q);
                    const authorMatch = level.author?.toLowerCase().includes(q);
                    const verifierMatch = level.verifier?.toLowerCase().includes(q);
                    const idMatch = level.id?.toString().includes(q);
                    const creatorMatch = level.creators?.some(c => c.toLowerCase().includes(q));

                    return nameMatch || authorMatch || verifierMatch || idMatch || creatorMatch;
                });
            }

            return result;
        }
    },
    async mounted() {
        const [listData, editorsData, aredlData] = await Promise.all([
            fetchList(),
            fetchEditors(),
            fetchAredlRankings()
        ]);

        this.list = listData;
        this.editors = editorsData;
        this.aredlRanks = aredlData;

        const param = this.$route.params.level;
        if (param && this.list) {
            const foundIndex = this.list.findIndex(([lvl]) => 
                lvl && (lvl.id.toString() === param || lvl.name.toLowerCase() === param.toLowerCase())
            );
            this.selected = foundIndex !== -1 ? foundIndex : 0;
        }

        this.loading = false;

        // Fetch AREDL level details in the background for tag filtering
        this.fetchAllAredlDetails();
    },
    methods: {
        embed,
        score,
        async fetchAllAredlDetails() {
            for (const item of this.list) {
                const lvl = item?.[0];
                if (lvl?.id && !this.aredlDetailsMap[lvl.id]) {
                    const details = await fetchAredlLevelDetails(lvl.id);
                    if (details) {
                        this.aredlDetailsMap[lvl.id] = details;
                    }
                }
            }
        },
        toggleTag(tag) {
            if (this.selectedTags.includes(tag)) {
                this.selectedTags = this.selectedTags.filter(t => t !== tag);
            } else {
                this.selectedTags.push(tag);
            }
        },
        selectLevel(index) {
            this.selected = index;
            const currentLevel = this.list[index]?.[0];
            if (currentLevel) {
                this.$router.push(`/${currentLevel.id}`);
            }
        },
        copyId(id) {
            navigator.clipboard.writeText(id.toString());
            this.copied = true;
            setTimeout(() => { this.copied = false; }, 1500);
        }
    }
};
