import { fetchLeaderboard, fetchList } from '../content.js';
import { localize } from '../util.js';
import { score } from '../score.js';
import { supabase } from '../supabase.js';

import Spinner from '../components/Spinner.js';

const FALLBACK_PFP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23007A3D"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="40" font-family="sans-serif">?</text></svg>`;

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
                        Leaderboard may be incomplete: {{ err.join(', ') }}
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
                        <!-- Profile Card Banner -->
                        <div style="display: flex; align-items: flex-start; gap: 1.25rem; margin-bottom: 1.5rem; padding: 1.25rem; background: rgba(128,128,128,0.06); border: 1px solid rgba(128,128,128,0.15); border-radius: 14px;">
                            <img 
                                :src="entry.pfp_url || fallbackPfp" 
                                @error="handleImgError"
                                alt="" 
                                style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 3px solid #007A3D; flex-shrink: 0;"
                            />
                            <div style="display: flex; flex-direction: column; gap: 0.3rem; width: 100%;">
                                <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem;">
                                    <h1 style="margin: 0; font-size: 1.8rem; font-weight: 800; color: inherit;">#{{ selected + 1 }} {{ entry.user }}</h1>
                                    <span style="font-size: 1.1rem; font-weight: 800; color: #00FF80;">{{ localize(entry.total) }} pts</span>
                                </div>

                                <p v-if="entry.bio" style="margin: 0.2rem 0 0.5rem 0; font-size: 0.95rem; opacity: 0.85; line-height: 1.4; font-style: italic;">
                                    "{{ entry.bio }}"
                                </p>
                                
                                <div style="display: flex; gap: 0.6rem; align-items: center; margin-top: 0.25rem; font-size: 0.85rem; opacity: 0.9; flex-wrap: wrap;">
                                    <span v-if="entry.governorate" style="background: rgba(0, 122, 61, 0.2); border: 1px solid #007A3D; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; color: inherit;">
                                        📍 {{ entry.governorate }}
                                    </span>
                                    <a v-if="entry.youtube" :href="entry.youtube" target="_blank" style="color: #ff4d4d; text-decoration: none; font-weight: 700; background: rgba(255, 77, 77, 0.1); padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid rgba(255, 77, 77, 0.3);">
                                        ▶ YouTube
                                    </a>
                                    <a v-if="entry.twitch" :href="entry.twitch" target="_blank" style="color: #a970ff; text-decoration: none; font-weight: 700; background: rgba(169, 112, 255, 0.1); padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid rgba(169, 112, 255, 0.3);">
                                        👾 Twitch
                                    </a>
                                    <a v-if="entry.twitter" :href="entry.twitter" target="_blank" style="color: #1da1f2; text-decoration: none; font-weight: 700; background: rgba(29, 161, 242, 0.1); padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid rgba(29, 161, 242, 0.3);">
                                        🐦 Twitter
                                    </a>
                                    <a v-if="entry.instagram" :href="entry.instagram" target="_blank" style="color: #e1306c; text-decoration: none; font-weight: 700; background: rgba(225, 48, 108, 0.1); padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid rgba(225, 48, 108, 0.3);">
                                        📸 Instagram
                                    </a>
                                    <a v-if="entry.tiktok" :href="entry.tiktok" target="_blank" style="color: #00f2fe; text-decoration: none; font-weight: 700; background: rgba(0, 242, 254, 0.1); padding: 0.2rem 0.55rem; border-radius: 6px; border: 1px solid rgba(0, 242, 254, 0.3);">
                                        🎵 TikTok
                                    </a>
                                    <span v-if="entry.discord_tag" style="background: rgba(88, 101, 242, 0.15); border: 1px solid rgba(88, 101, 242, 0.3); padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; color: inherit;">
                                        💬 {{ entry.discord_tag }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Completion Breakdown Tables -->
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length }})</h2>
                        <table class="table" v-if="entry.verified.length > 0">
                            <tr v-for="s in entry.verified" :key="s.level">
                                <td class="rank"><p>#{{ s.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="s.link">{{ s.level }}</a></td>
                                <td class="score"><p>+{{ localize(s.score) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table" v-if="entry.completed.length > 0">
                            <tr v-for="s in entry.completed" :key="s.level">
                                <td class="rank"><p>#{{ s.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="s.link">{{ s.level }}</a></td>
                                <td class="score"><p>+{{ localize(s.score) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.progressed.length > 0">Progressed ({{ entry.progressed.length }})</h2>
                        <table class="table" v-if="entry.progressed.length > 0">
                            <tr v-for="s in entry.progressed" :key="s.level">
                                <td class="rank"><p>#{{ s.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="s.link">{{ s.percent }}% {{ s.level }}</a></td>
                                <td class="score"><p>+{{ localize(s.score) }}</p></td>
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
        fallbackPfp() {
            return FALLBACK_PFP;
        }
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
                (entry) => entry.user.toLowerCase() === decodeURIComponent(param).trim().toLowerCase()
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
        handleImgError(evt) {
            evt.target.onerror = null;
            evt.target.src = FALLBACK_PFP;
        },
        selectUser(index) {
            this.selected = index;
            const currentUser = this.leaderboard[index]?.user;
            if (currentUser) {
                this.$router.push(`/leaderboard/${encodeURIComponent(currentUser)}`);
            }
        },
        async loadLiveLeaderboard() {
            const [baseBoard, errs] = await fetchLeaderboard();
            const listData = await fetchList();
            this.err = errs || [];

            // Query profiles safely using select('*')
            const { data: dbProfiles } = await supabase
                .from('profiles')
                .select('*');

            const profileDetails = new Map();
            if (dbProfiles) {
                dbProfiles.forEach(p => {
                    if (p.username) {
                        profileDetails.set(p.username.trim().toLowerCase(), p);
                    }
                });
            }

            const playerMap = new Map();

            // Populate base static entries and merge profile metadata
            baseBoard.forEach(p => {
                const key = p.user.trim().toLowerCase();
                const meta = profileDetails.get(key) || {};

                playerMap.set(key, {
                    user: p.user,
                    total: p.total,
                    verified: [...p.verified],
                    completed: [...p.completed],
                    progressed: [...p.progressed],
                    pfp_url: meta.pfp_url || null,
                    governorate: meta.governorate || null,
                    bio: meta.bio || null,
                    youtube: meta.youtube || null,
                    twitch: meta.twitch || null,
                    twitter: meta.twitter || null,
                    instagram: meta.instagram || null,
                    tiktok: meta.tiktok || null,
                    discord_tag: meta.discord_tag || null
                });
            });

            // Fetch approved submissions from Supabase
            const { data: approvedSubs } = await supabase
                .from('submissions')
                .select('*')
                .eq('status', 'approved');

            if (approvedSubs && approvedSubs.length > 0) {
                const uIds = [...new Set(approvedSubs.map(d => d.user_id))];
                const { data: userProfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', uIds);

                const profileMap = new Map((userProfiles || []).map(p => [p.id, p]));

                const totalLevels = listData.length;
                const levelIndex = new Map();
                listData.forEach(([lvl], index) => {
                    if (lvl) levelIndex.set(lvl.id.toString(), { lvl, rank: index + 1 });
                });

                approvedSubs.forEach(sub => {
                    const profile = profileMap.get(sub.user_id);
                    if (!profile || !profile.username) return;

                    const match = levelIndex.get(sub.level_id.toString());
                    if (!match) return;

                    const { lvl, rank } = match;
                    const key = profile.username.trim().toLowerCase();

                    if (!playerMap.has(key)) {
                        playerMap.set(key, {
                            user: profile.username,
                            total: 0,
                            verified: [],
                            completed: [],
                            progressed: [],
                            pfp_url: profile.pfp_url || null,
                            governorate: profile.governorate || null,
                            bio: profile.bio || null,
                            youtube: profile.youtube || null,
                            twitch: profile.twitch || null,
                            twitter: profile.twitter || null,
                            instagram: profile.instagram || null,
                            tiktok: profile.tiktok || null,
                            discord_tag: profile.discord_tag || null
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

            // Sort leaderboard by total score
            this.leaderboard = Array.from(playerMap.values()).sort((a, b) => b.total - a.total);
        }
    },
};
