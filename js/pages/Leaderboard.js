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
                        <div style="position: relative; display: flex; align-items: flex-start; gap: 1.25rem; margin-bottom: 1.5rem; padding: 1.25rem; background: rgba(128,128,128,0.06); border: 1px solid rgba(128,128,128,0.15); border-radius: 14px;">
                            
                            <!-- Top Right Social Icons -->
                            <div style="position: absolute; top: 1rem; right: 1.25rem; display: flex; items-center; gap: 0.65rem;">
                                <a v-if="entry.youtube" :href="entry.youtube" target="_blank" title="YouTube" style="color: #ffffff; opacity: 0.85; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                </a>
                                <a v-if="entry.twitch" :href="entry.twitch" target="_blank" title="Twitch" style="color: #ffffff; opacity: 0.85; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                                    </svg>
                                </a>
                                <a v-if="entry.twitter" :href="entry.twitter" target="_blank" title="Twitter / X" style="color: #ffffff; opacity: 0.85; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </a>
                                <a v-if="entry.instagram" :href="entry.instagram" target="_blank" title="Instagram" style="color: #ffffff; opacity: 0.85; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg>
                                </a>
                                <a v-if="entry.tiktok" :href="entry.tiktok" target="_blank" title="TikTok" style="color: #ffffff; opacity: 0.85; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.67 2.58-4.87 1.46-1.2 3.41-1.8 5.29-1.63.13.02.26.04.38.07V13.8c-.36-.07-.73-.1-.1-.1-1.07.02-2.12.43-2.88 1.18-.84.83-1.24 2.03-1.09 3.2.14 1.13.84 2.12 1.86 2.64 1.02.52 2.27.5 3.26-.04.99-.54 1.63-1.57 1.69-2.7.01-3.61.01-7.21.01-10.82z"/>
                                    </svg>
                                </a>
                            </div>

                            <img 
                                :src="entry.pfp_url || fallbackPfp" 
                                @error="handleImgError"
                                alt="" 
                                style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 3px solid #007A3D; flex-shrink: 0;"
                            />
                            
                            <div style="display: flex; flex-direction: column; gap: 0.35rem; width: 100%; padding-right: 3rem;">
                                <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem;">
                                    <h1 class="type-label-lg" style="margin: 0; font-size: 1.8rem; font-weight: 800; color: inherit;">#{{ selected + 1 }} {{ entry.user }}</h1>
                                    <span class="type-label-lg" style="font-size: 1.1rem; font-weight: 800; color: #00FF80;">{{ localize(entry.total) }} pts</span>
                                </div>

                                <p class="type-label-sm" style="margin: 0.1rem 0 0.4rem 0; font-size: 0.95rem; opacity: 0.75; line-height: 1.4;" :style="{ fontStyle: entry.bio ? 'italic' : 'normal' }">
                                    {{ entry.bio ? '"' + entry.bio + '"' : 'No bio provided.' }}
                                </p>
                                
                                <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.85rem; opacity: 0.9; flex-wrap: wrap;">
                                    <span v-if="entry.governorate" class="type-label-sm" style="background: rgba(0, 122, 61, 0.2); border: 1px solid #007A3D; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; color: inherit;">
                                        📍 {{ entry.governorate }}
                                    </span>
                                    <span v-if="entry.discord_tag" class="type-label-sm" style="background: rgba(88, 101, 242, 0.15); border: 1px solid rgba(88, 101, 242, 0.3); padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; color: inherit;">
                                        💬 {{ entry.discord_tag }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Completion Breakdown Tables -->
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length }})</h2>
                        <table class="table" v-if="entry.verified.length > 0">
                            <tr v-for="s in entry.verified" :key="s.level">
                                <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="s.link">{{ s.level }}</a></td>
                                <td class="score"><p class="type-label-lg">+{{ localize(s.score) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table" v-if="entry.completed.length > 0">
                            <tr v-for="s in entry.completed" :key="s.level">
                                <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="s.link">{{ s.level }}</a></td>
                                <td class="score"><p class="type-label-lg">+{{ localize(s.score) }}</p></td>
                            </tr>
                        </table>

                        <h2 v-if="entry.progressed.length > 0">Progressed ({{ entry.progressed.length }})</h2>
                        <table class="table" v-if="entry.progressed.length > 0">
                            <tr v-for="s in entry.progressed" :key="s.level">
                                <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                <td class="level"><a class="type-label-lg" target="_blank" :href="s.link">{{ s.percent }}% {{ s.level }}</a></td>
                                <td class="score"><p class="type-label-lg">+{{ localize(s.score) }}</p></td>
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

            this.leaderboard = Array.from(playerMap.values()).sort((a, b) => b.total - a.total);
        }
    },
};
