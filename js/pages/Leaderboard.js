import { fetchLeaderboard, fetchList } from '../content.js';
import { localize } from '../util.js';
import { score } from '../score.js';
import { supabase } from '../supabase.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        err: [],
    }),
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                <div class="board-container">
                    <table class="board">
                        <tr v-for="(ientry, i) in leaderboard" :key="ientry.user">
                            <td class="rank">
                                <p class="type-label-lg">#{{ i + 1 }}</p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': selected == i }">
                                <button @click="selectUser(i)">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="player-container">
                    <div class="player" v-if="entry">
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ localize(entry.total) }}</h3>
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table" v-if="entry.verified.length > 0">
                            <tr v-for="score in entry.verified" :key="score.level">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table" v-if="entry.completed.length > 0">
                            <tr v-for="score in entry.completed" :key="score.level">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table" v-if="entry.progressed.length > 0">
                            <tr v-for="score in entry.progressed" :key="score.level">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        entry() {
            return this.leaderboard[this.selected];
        },
    },
    watch: {
        entry: {
            immediate: true,
            handler(newEntry) {
                if (newEntry && newEntry.user) {
                    document.title = `${newEntry.user}'s Profile`;
                } else {
                    document.title = 'Leaderboard';
                }
            }
        }
    },
    async mounted() {
        await this.loadLiveLeaderboard();

        const param = this.$route.params.user;

        if (param && this.leaderboard.length > 0) {
            const foundIndex = this.leaderboard.findIndex(
                (entry) => entry.user.toLowerCase() === param.toLowerCase()
            );
            if (foundIndex !== -1) {
                this.selected = foundIndex;
            } else {
                this.selected = 0;
                if (this.leaderboard[0]?.user) {
                    this.$router.replace(`/leaderboard/${encodeURIComponent(this.leaderboard[0].user)}`);
                }
            }
        } else {
            this.selected = 0;
            if (this.leaderboard[0]?.user) {
                this.$router.replace(`/leaderboard/${encodeURIComponent(this.leaderboard[0].user)}`);
            }
        }

        this.loading = false;
    },
    methods: {
        localize,
        selectUser(index) {
            this.selected = index;
            const currentUser = this.leaderboard[index]?.user;
            if (currentUser) {
                this.$router.push(`/leaderboard/${encodeURIComponent(currentUser)}`);
            }
        },
        async loadLiveLeaderboard() {
            // 1. Fetch static records and list data
            const [baseBoard, errs] = await fetchLeaderboard();
            const listData = await fetchList();
            this.err = errs || [];

            const playerMap = new Map();

            // Populate existing players
            baseBoard.forEach(p => {
                playerMap.set(p.user.toLowerCase(), {
                    user: p.user,
                    total: p.total,
                    verified: [...p.verified],
                    completed: [...p.completed],
                    progressed: [...p.progressed]
                });
            });

            // 2. Query approved submissions from Supabase
            const { data: approvedSubs } = await supabase
                .from('submissions')
                .select('*')
                .eq('status', 'approved');

            if (approvedSubs && approvedSubs.length > 0) {
                // Fetch player usernames
                const uIds = [...new Set(approvedSubs.map(d => d.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .in('id', uIds);

                const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));

                // Index levels by ID
                const totalLevels = listData.length;
                const levelIndex = new Map();
                listData.forEach(([lvl], index) => {
                    if (lvl) levelIndex.set(lvl.id.toString(), { lvl, rank: index + 1 });
                });

                // Merge submissions into scores
                approvedSubs.forEach(sub => {
                    const username = profileMap.get(sub.user_id);
                    if (!username) return;

                    const match = levelIndex.get(sub.level_id.toString());
                    if (!match) return;

                    const { lvl, rank } = match;
                    const key = username.toLowerCase();

                    if (!playerMap.has(key)) {
                        playerMap.set(key, {
                            user: username,
                            total: 0,
                            verified: [],
                            completed: [],
                            progressed: []
                        });
                    }

                    const player = playerMap.get(key);
                    const earnedScore = score(rank, sub.percent, lvl.percentToQualify, totalLevels);

                    const recordObj = {
                        rank,
                        level: lvl.name,
                        score: earnedScore,
                        link: sub.video_link,
                        percent: sub.percent
                    };

                    if (sub.percent === 100) {
                        if (!player.completed.some(c => c.level === lvl.name)) {
                            player.completed.push(recordObj);
                            player.total += earnedScore;
                        }
                    } else if (sub.percent >= lvl.percentToQualify) {
                        if (!player.progressed.some(p => p.level === lvl.name)) {
                            player.progressed.push(recordObj);
                            player.total += earnedScore;
                        }
                    }
                });
            }

            // 3. Sort leaderboard by total score
            this.leaderboard = Array.from(playerMap.values()).sort((a, b) => b.total - a.total);
        }
    },
};
