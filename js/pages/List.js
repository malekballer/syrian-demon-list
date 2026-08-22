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
                        style="padding: 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: var(--color-background, #111); color: inherit; cursor: pointer;"
                    >
                        ⚙️ Filters {{ selectedTags.length ? \`(\${selectedTags.length})\` : '' }}
                    </button>
                </div>

                <!-- Categorized Tag Filter Menu -->
                <div v-if="showFilterMenu" style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(0,0,0,0.25); border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); max-height: 320px; overflow-y: auto;">
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
                    <tr v-for="({ level, err, originalIndex }) in filteredList" :key="originalIndex">
                        <td class="rank">
                            <p v-if="originalIndex + 1 <= 150" class="type-label-lg">#{{ originalIndex + 1 }}</p>
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
                    
                    <!-- Display Level Tags from Local AREDL Data -->
                    <div v-if="currentAredlTags.length > 0" style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin: 0.5rem 0;">
                        <span v-for="tag in currentAredlTags" :key="tag" class="type-label-sm" style="background: rgba(0, 122, 61, 0.2); border: 1px solid #007A3D; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">
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

            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
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
                    <h3>Submission Requirements</h3>
                    <p>
                        Achieved the record without using hacks (however, FPS bypass is allowed)
                    </p>
                    <p>
                        Achieved the record on the level that is listed on the site - please check the level ID before you submit a record
                    </p>
                    <p>
                        Have either source audio or clicks/taps in the video. Edited audio only does not count
                    </p>
                    <p>
                        The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt. Everyplay records are exempt from this
                    </p>
                    <p>
                        The recording must also show the player hit the endwall, or the completion will be invalidated.
                    </p>
                    <p>
                        Do not use secret routes or bug routes
                    </p>
                    <p>
                        Do not use easy modes, only a record of the unmodified level qualifies
                    </p>
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
            
            const mappedList = this.list.map(([level, err], i) => ({
                level,
                err,
                originalIndex: i
            }));

            let result = mappedList;

            // Filter levels by selected tags
            if (this.selectedTags.length > 0) {
                result = result.filter(({ level }) => {
                    if (!level?.id) return false;
                    const levelTags = this.aredlTagsMap[level.id] || [];
                    return this.selectedTags.every(t => levelTags.includes(t));
                });
            }

            if (this.query.trim()) {
                const q = this.query.toLowerCase().trim();
                result = result.filter(({ level }) => {
                    if (!level) return false;
                    
                    const nameMatch = level.name?.toLowerCase().includes(q);
                    const authorMatch = level.author?.toLowerCase().includes(q);
                    const creatorMatch = level.creators?.some(c => c.toLowerCase().includes(q));

                    return nameMatch || authorMatch || creatorMatch;
                });
            }

            return result;
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
