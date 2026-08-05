import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
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

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <div class="search-container">
                    <input 
                        type="text" 
                        class="search-bar" 
                        v-model="query" 
                        placeholder="Search levels or creators..." 
                    />
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
                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
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
        loading: true,
        selected: 0,
        query: '',
        copied: false,
        errors: [],
        roleIconMap,
        store
    }),
    computed: {
        level() {
            return this.list[this.selected]?.[0] || null;
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
            
            // Map original list items to include their index position
            const mappedList = this.list.map(([level, err], i) => ({
                level,
                err,
                originalIndex: i
            }));

            if (!this.query.trim()) {
                return mappedList;
            }

            const q = this.query.toLowerCase().trim();
            return mappedList.filter(({ level }) => {
                if (!level) return false;
                
                const nameMatch = level.name?.toLowerCase().includes(q);
                const authorMatch = level.author?.toLowerCase().includes(q);
                const creatorMatch = level.creators?.some(c => c.toLowerCase().includes(q));

                return nameMatch || authorMatch || creatorMatch;
            });
        }
    },
    async mounted() {
        // Hide loading spinner
        this.list = await fetchList();
        this.editors = await fetchEditors();

        const param = this.$route.params.level;
    
        if (param && this.list) {
            // Find by Level ID or Level Name
            const foundIndex = this.list.findIndex(([lvl]) => 
                lvl && (lvl.id.toString() === param || lvl.name.toLowerCase() === param.toLowerCase())
            );
        
            // If found, select it; otherwise default to #1 rank
            this.selected = foundIndex !== -1 ? foundIndex : 0;
        } else {
            this.selected = 0; // Default fallback to #1 level
        }

        this.loading = false;
    },
    methods: {
        embed,
        score,
        selectLevel(index) {
            this.selected = index;
            const currentLevel = this.list[index]?.[0];
            if (currentLevel) {
                // Updates URL to /136135870 (or /1 for rank)
                this.$router.push(`/${currentLevel.id}`);
            }
        }
        copyId(id) {
            navigator.clipboard.writeText(id.toString());
            this.copied = true;
            setTimeout(() => {
                this.copied = false;
            }, 1500);
        },
    },
};
