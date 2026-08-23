import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchAredlData } from "../aredl.js";
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

const CATEGORIZED_TAGS = {
    "Versions": ["2.2", "2.1", "2.0", "1.9PS", "1.9", "1.8", "1.7", "1.6PS", "1.6", "1.5"],
    "Length": ["Medium", "Long", "XL", "XXL", "XXL+"],
    "Gamemodes": ["Cube", "Ship", "Ball", "UFO", "Wave", "Robot", "Spider", "Old Swing", "New Swing", "Duals", "2P"],
    "Gameplay & Style": [
        "NONG", "Circles", "Clicksync", "Fast-Paced", "Timings", "Chokepoints", 
        "Learny", "Memory", "High CPS", "Gimmicky", "Flow", "Slow-Paced", 
        "Bossfight", "Mirror", "Nerve Control", "Overall"
    ]
};

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <div class="search-container" style="display: flex; gap: 0.5rem; align-items: center;">
                    <input 
                        type="text" 
                        class="search-bar type-label-lg" 
                        v-model="query" 
                        placeholder="Search levels or creators..." 
                        style="flex: 1;"
                    />
                    <button 
                        @click="showFilterMenu = !showFilterMenu"
                        class="type-label-lg"
                        style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: inherit; cursor: pointer;"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14"></line>
                            <line x1="4" y1="10" x2="4" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12" y2="3"></line>
                            <line x1="20" y1="21" x2="20" y2="16"></line>
                            <line x1="20" y1="10" x2="20" y2="3"></line>
                            <line x1="1" y1="14" x2="7" y2="14"></line>
                            <line x1="9" y1="8" x2="15" y2="8"></line>
                            <line x1="17" y1="16" x2="23" y2="16"></line>
                        </svg>
                        <span>Filters</span>
                        <span v-if="selectedTags.length" style="background: #007A3D; padding: 0.1rem 0.35rem; border-radius: 10px; font-size: 0.75rem; margin-left: 0.1rem;">{{ selectedTags.length }}</span>
                    </button>
                </div>

                <div v-if="showFilterMenu" style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(0,0,0,0.25); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); max-height: 380px; overflow-y: auto;">
                    <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span class="type-label-sm" style="opacity: 0.7;">Sort By:</span>
                            <select v-model="sortBy" class="type-label-sm" style="background: rgba(255,255,255,0.08); color: inherit; border: 1px solid rgba(255,255,255,0.12); padding: 0.25rem 0.4rem; border-radius: 4px; cursor: pointer;">
                                <option value="list">List Rank</option>
                                <option value="aredl">AREDL Rank</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                            <span class="type-label-sm" style="opacity: 0.7;">Order:</span>
                            <button 
                                @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'" 
                                class="type-label-sm"
                                style="background: rgba(255,255,255,0.08); color: inherit; border: 1px solid rgba(255,255,255,0.12); padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer;"
                            >
                                {{ sortOrder === 'asc' ? '▲ Ascending' : '▼ Descending' }}
                            </button>
                        </div>
                    </div>

                    <div v-for="(tags, category) in tagCategories" :key="category" style="margin-bottom: 0.6rem;">
                        <div class="type-label-sm" style="opacity: 0.6; font-weight: bold; margin-bottom: 0.25rem; text-transform: uppercase;">{{ category }}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                            <button 
                                v-for="tag in tags" 
                                :key="tag"
                                @click="toggleTag(tag)"
                                class="type-label-sm"
                                :style="{
                                    padding: '0.2rem 0.45rem',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: selectedTags.includes(tag) ? '#007A3D' : 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer'
                                }"
                            >
                                {{ tag }}
                            </button>
                        </div>
                    </div>
                    <div v-if="selectedTags.length > 0" style="margin-top: 0.5rem; text-align: right;">
                        <button @click="selectedTags = []" class="type-label-sm" style="background: none; border: none; color: #ce1126; cursor: pointer; text-decoration: underline;">
                            Reset Tags
                        </button>
                    </div>
                </div>

                <table class="list" v-if="list">
                    <tr v-for="({ level, err, originalIndex, displayRank }) in filteredList" :key="originalIndex">
                        <td class="rank">
                            <p v-if="displayRank !== null" class="type-label-lg">#{{ displayRank }}</p>
                            <p v-else class="type-label-lg">Legacy</p>
                        </td>
                        <td class="level" :class="{ 'active': selected == originalIndex, 'error': !level }">
                            <button @click="selectLevel(originalIndex)">
                                <span class="type-label-lg">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="level-container">
                <div class="level" v-if="level">
                    <h1>{{ level.name }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    
                    <div v-if="currentAredlTags.length > 0" style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin: 0.75rem 0 0.5rem 0;">
                        <span v-for="tag in currentAredlTags" :key="tag" class="type-label-lg" style="background: rgba(0, 122, 61, 0.2); border: 1px solid #007A3D; padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 600;">
                            {{ tag }}
                        </span>
                    </div>

                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify, list.length) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p
                                @click="copyId(level.id)"
                                style="cursor: pointer; user-select: none;"
                                title="Click to copy ID"
                            >
                                {{ copied ? 'Copied!' : level.id }}
                            </p>
                        </li>
                        <li>
                            <div class="type-title-sm">AREDL Rank</div>
                            <p v-if="aredlRanks[level.id]">#{{ aredlRanks[level.id] }}</p>
                            <p v-else style="opacity: 0.6;">N/A</p>
                        </li>
                    </ul>
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
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>

            <!-- Right Column Meta: Enhanced & Flare Editor Cards -->
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    
                    <template v-if="editors">
                        <h3 style="margin-bottom: 0.85rem;">List Editors</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.5rem;">
                            <div 
                                v-for="editor in editors" 
                                :key="editor.name"
                                style="display: flex; align-items: center; gap: 0.85rem; padding: 0.8rem 1rem; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; transition: transform 0.2s, border-color 0.2s; position: relative; overflow: hidden;"
                            >
                                <!-- Accent glow line -->
                                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #007A3D;"></div>

                                <!-- Avatar -->
                                <img 
                                    :src="editor.pfp || 'https://assets.aredl.net/avatars/default.png'" 
                                    alt="pfp" 
                                    style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.15); box-shadow: 0 4px 10px rgba(0,0,0,0.3);"
                                />
                                
                                <!-- User & Role Details -->
                                <div style="display: flex; flex-direction: column; flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                                        <!-- Dynamically Inverted SVG Icon -->
                                        <img 
                                            :src="'/syrian-demon-list/assets/' + roleIconMap[editor.role] + '.svg'" 
                                            :alt="editor.role" 
                                            :style="{
                                                width: '16px', 
                                                height: '16px', 
                                                filter: store.dark ? 'invert(1)' : 'none'
                                            }"
                                        >
                                        <a v-if="editor.link" :href="editor.link" target="_blank" class="type-label-lg link" style="font-weight: 800; font-size: 1rem; text-decoration: none;">
                                            {{ editor.name }}
                                        </a>
                                        <span v-else class="type-label-lg" style="font-weight: 800; font-size: 1rem;">{{ editor.name }}</span>
                                    </div>
                                    
                                    <!-- Role Tag Badge -->
                                    <span class="type-label-sm" style="font-size: 0.72rem; opacity: 0.8; margin-top: 0.15rem; font-weight: 600;">
                                        {{ editor.tag || editor.role }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>

                    <h3>Submission Requirements</h3>
                    <p>Achieved the record without using hacks (however, FPS bypass is allowed)</p>
                    <p>Achieved the record on the level that is listed on the site - please check the level ID before you submit a record</p>
                    <p>Have either source audio or clicks/taps in the video. Edited audio only does not count</p>
                    <p>The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt. Everyplay records are exempt from this</p>
                    <p>The recording must also show the player hit the endwall, or the completion will be invalidated.</p>
                    <p>Do not use secret routes or bug routes</p>
                    <p>Do not use easy modes, only a record of the unmodified level qualifies</p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        aredlRanks: {},
        aredlTagsMap: {},
        loading: true,
        selected: 0,
        query: '',
        showFilterMenu: false,
        selectedTags: [],
        sortBy: 'list',
        sortOrder: 'asc',
        tagCategories: CATEGORIZED_TAGS,
        copied: false,
        errors: [],
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
            return this.aredlTagsMap[this.selectedLevelId] || [];
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
        filteredList() {
            if (!this.list) return [];
            
            let mappedList = this.list.map(([level, err], i) => ({
                level,
                err,
                originalIndex: i
            }));

            if (this.selectedTags.length > 0) {
                mappedList = mappedList.filter(({ level }) => {
                    if (!level?.id) return false;
                    const levelTags = this.aredlTagsMap[level.id] || [];
                    return this.selectedTags.every(t => levelTags.includes(t));
                });
            }

            if (this.query.trim()) {
                const q = this.query.toLowerCase().trim();
                mappedList = mappedList.filter(({ level }) => {
                    if (!level) return false;
                    
                    const nameMatch = level.name?.toLowerCase().includes(q);
                    const authorMatch = level.author?.toLowerCase().includes(q);
                    const creatorMatch = level.creators?.some(c => c.toLowerCase().includes(q));

                    return nameMatch || authorMatch || creatorMatch;
                });
            }

            mappedList.sort((a, b) => {
                let rankA = a.originalIndex + 1;
                let rankB = b.originalIndex + 1;

                if (this.sortBy === 'aredl') {
                    rankA = this.aredlRanks[a.level?.id] || 9999;
                    rankB = this.aredlRanks[b.level?.id] || 9999;
                }

                return this.sortOrder === 'asc' ? rankA - rankB : rankB - rankA;
            });

            return mappedList.map(item => {
                let displayRank = item.originalIndex + 1;
                if (this.sortBy === 'aredl') {
                    displayRank = this.aredlRanks[item.level?.id] || null;
                } else if (displayRank > 150) {
                    displayRank = null;
                }
                return { ...item, displayRank };
            });
        }
    },
    async mounted() {
        const [listData, editorsData, aredlData] = await Promise.all([
            fetchList(),
            fetchEditors(),
            fetchAredlData()
        ]);

        this.list = listData;
        this.editors = editorsData;
        this.aredlRanks = aredlData.ranks;
        this.aredlTagsMap = aredlData.tagsMap;

        const param = this.$route.params.level;

        if (param && this.list) {
            const foundIndex = this.list.findIndex(([lvl]) => 
                lvl && (lvl.id.toString() === param || lvl.name.toLowerCase() === param.toLowerCase())
            );
            if (foundIndex !== -1) {
                this.selected = foundIndex;
            } else {
                this.selected = 0;
                if (this.list[0]?.[0]) {
                    this.$router.replace(`/${this.list[0][0].id}`);
                }
            }
        } else {
            this.selected = 0;
            if (this.list[0]?.[0]) {
                this.$router.replace(`/${this.list[0][0].id}`);
            }
        }

        this.loading = false;
    },
    methods: {
        embed,
        score,
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
            setTimeout(() => {
                this.copied = false;
            }, 1500);
        },
    },
};
