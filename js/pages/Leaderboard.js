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
                        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; padding: 1.35rem; background: rgba(128,128,128,0.06); border: 1px solid rgba(128,128,128,0.15); border-radius: 14px;">
                            
                            <!-- Top Bar: Avatar, Name, Points & Social Icons -->
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                                <div style="display: flex; align-items: center; gap: 1.25rem; flex: 1; min-width: 240px;">
                                    <img 
                                        :src="entry.pfp_url || fallbackPfp" 
                                        @error="handleImgError"
                                        alt="" 
                                        style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 3px solid #007A3D; flex-shrink: 0;"
                                    />
                                    <div>
                                        <h1 class="type-label-lg" style="margin: 0; font-size: 1.85rem; font-weight: 800; color: inherit; line-height: 1.2;">
                                            #{{ selected + 1 }} {{ entry.user }}
                                        </h1>
                                        <span class="type-label-lg" style="font-size: 1.15rem; font-weight: 800; color: #00FF80; display: inline-block; margin-top: 0.25rem;">
                                            {{ localize(entry.total) }} pts
                                        </span>
                                    </div>
                                </div>

                                <!-- Social Links Group -->
                                <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.45rem 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
                                    <a v-if="entry.spreadsheet" :href="entry.spreadsheet" target="_blank" title="Spreadsheet" style="color: #ffffff; opacity: 0.85; display: flex; align-items: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="3" y1="9" x2="21" y2="9"></line>
                                            <line x1="3" y1="15" x2="21" y2="15"></line>
                                            <line x1="9" y1="3" x2="9" y2="21"></line>
                                            <line x1="15" y1="3" x2="15" y2="21"></line>
                                        </svg>
                                    </a>
                                    <a v-if="entry.youtube" :href="entry.youtube" target="_blank" title="YouTube" style="color: #ffffff; opacity: 0.85; display: flex; align-items: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                        </svg>
                                    </a>
                                    <a v-if="entry.twitch" :href="entry.twitch" target="_blank" title="Twitch" style="color: #ffffff; opacity: 0.85; display: flex; align-items: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                                        </svg>
                                    </a>
                                    <a v-if="entry.twitter" :href="entry.twitter" target="_blank" title="Twitter / X" style="color: #ffffff; opacity: 0.85; display: flex; align-items: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                    </a>
                                    <a v-if="entry.instagram" :href="entry.instagram" target="_blank" title="Instagram" style="color: #ffffff; opacity: 0.85; display: flex; align-items: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                        </svg>
                                    </a>
                                    <a v-if="entry.tiktok" :href="entry.tiktok" target="_blank" title="TikTok" style="color: #ffffff; opacity: 0.85; display: flex; align-items: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.67 2.58-4.87 1.46-1.2 3.41-1.8 5.29-1.63.13.02.26.04.38.07V13.8c-.36-.07-.73-.1-.1-.1-1.07.02-2.12.43-2.88 1.18-.84.83-1.24 2.03-1.09 3.2.14 1.13.84 2.12 1.86 2.64 1.02.52 2.27.5 3.26-.04.99-.54 1.63-1.57 1.69-2.7.01-3.61.01-7.21.01-10.82z"/>
                                        </svg>
                                    </a>
                                </div>
                            </div>

                            <!-- Bio Section -->
                            <p class="type-label-sm" style="margin: 0; font-size: 0.98rem; opacity: 0.8; line-height: 1.45;" :style="{ fontStyle: entry.bio ? 'italic' : 'normal' }">
                                {{ entry.bio ? '"' + entry.bio + '"' : 'No bio provided.' }}
                            </p>
                            
                            <!-- Badges (Governorate + Discord Tag) -->
                            <div style="display: flex; gap: 0.65rem; align-items: center; opacity: 0.95; flex-wrap: wrap;">
                                <span v-if="entry.governorate" class="type-label-lg" style="display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(0, 122, 61, 0.2); border: 1px solid #007A3D; padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.95rem; font-weight: 700; color: inherit;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF80" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    {{ entry.governorate }}
                                </span>
                                
                                <span v-if="entry.discord_tag" class="type-label-lg" style="display: inline-flex; align-items: center; gap: 0.45rem; background: rgba(88, 101, 242, 0.18); border: 1px solid rgba(88, 101, 242, 0.4); padding: 0.35rem 0.75rem; border-radius: 8px; font-size: 0.95rem; font-weight: 700; color: inherit;">
                                    <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="#5865F2">
                                        <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.14zM42.45 65.69c-6.32 0-11.52-5.8-11.52-12.91s5.07-12.9 11.52-12.9c6.5 0 11.64 5.86 11.52 12.9 0 7.11-5.07 12.91-11.52 12.91zm42.24 0c-6.32 0-11.52-5.8-11.52-12.91s5.07-12.9 11.52-12.9c6.5 0 11.64 5.86 11.52 12.9 0 7.11-5.07 12.91-11.52 12.91z"/>
                                    </svg>
                                    {{ entry.discord_tag }}
                                </span>
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

            const totalLevels = listData.length || 100;

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

            // 1. Process static records from base JSON
            baseBoard.forEach(p => {
                const key = p.user.trim().toLowerCase();
                const meta = profileDetails.get(key) || {};

                let recalculatedTotal = 0;

                const verified = (p.verified || []).map(v => {
                    const newScore = score(v.rank, 100, 100, totalLevels);
                    recalculatedTotal += newScore;
                    return { ...v, score: newScore };
                });

                const completed = (p.completed || []).map(c => {
                    const newScore = score(c.rank, 100, 100, totalLevels);
                    recalculatedTotal += newScore;
                    return { ...c, score: newScore };
                });

                const progressed = (p.progressed || []).map(pr => {
                    const newScore = score(pr.rank, pr.percent, 0, totalLevels);
                    recalculatedTotal += newScore;
                    return { ...pr, score: newScore };
                });

                playerMap.set(key, {
                    user: p.user,
                    total: recalculatedTotal,
                    verified,
                    completed,
                    progressed,
                    pfp_url: meta.pfp_url || null,
                    governorate: meta.governorate || null,
                    bio: meta.bio || null,
                    spreadsheet: meta.spreadsheet || null,
                    youtube: meta.youtube || null,
                    twitch: meta.twitch || null,
                    twitter: meta.twitter || null,
                    instagram: meta.instagram || null,
                    tiktok: meta.tiktok || null,
                    discord_tag: meta.discord_tag || null
                });
            });

            // 2. Fetch and merge approved live submissions from Supabase
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

                // Build Level Index Map supporting String ID, Numeric ID, Level Name, & Rank
                const levelIndex = new Map();
                listData.forEach((item, index) => {
                    const lvl = Array.isArray(item) ? item[0] : item;
                    if (lvl) {
                        const rank = index + 1;
                        if (lvl.id !== undefined && lvl.id !== null) {
                            levelIndex.set(lvl.id.toString(), { lvl, rank });
                            levelIndex.set(lvl.id, { lvl, rank });
                        }
                        if (lvl.name) {
                            levelIndex.set(lvl.name.trim().toLowerCase(), { lvl, rank });
                        }
                        levelIndex.set(rank.toString(), { lvl, rank });
                    }
                });

                approvedSubs.forEach(sub => {
                    const profile = profileMap.get(sub.user_id);
                    if (!profile || !profile.username) return;

                    const match = levelIndex.get(sub.level_id?.toString()) 
                             || levelIndex.get(sub.level_id)
                             || (sub.level_name ? levelIndex.get(sub.level_name.trim().toLowerCase()) : null);

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
                            spreadsheet: profile.spreadsheet || null,
                            youtube: profile.youtube || null,
                            twitch: profile.twitch || null,
                            twitter: profile.twitter || null,
                            instagram: profile.instagram || null,
                            tiktok: profile.tiktok || null,
                            discord_tag: profile.discord_tag || null
                        });
                    }

                    const player = playerMap.get(key);
                    const earnedScore = score(rank, sub.percent, 0, totalLevels);

                    const recordObj = {
                        rank,
                        level: lvl.name,
                        score: earnedScore,
                        link: sub.video_link,
                        percent: sub.percent
                    };

                    if (sub.percent >= 100) {
                        const exists = player.completed.some(c => c.level === lvl.name);
                        if (!exists) {
                            player.completed.push(recordObj);
                            player.total += earnedScore;
                        }
                    } else {
                        const existingIndex = player.progressed.findIndex(p => p.level === lvl.name);
                        if (existingIndex !== -1) {
                            if (sub.percent > player.progressed[existingIndex].percent) {
                                player.total -= player.progressed[existingIndex].score;
                                player.progressed[existingIndex] = recordObj;
                                player.total += earnedScore;
                            }
                        } else {
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
