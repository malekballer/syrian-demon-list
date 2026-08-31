import { fetchLeaderboard, fetchList } from '../content.js';
import { localize } from '../util.js';
import { score } from '../score.js';
import { supabase } from '../supabase.js';
import { store } from '../main.js';

import Spinner from '../components/Spinner.js';
import SyriaMap from '../components/SyriaMap.js';

const FALLBACK_PFP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23b9a779"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23002623" font-size="40" font-family="sans-serif">?</text></svg>`;

const SYRIAN_GOVERNORATES = [
    "Aleppo", "Damascus", "Daraa", "Deir ez-Zor", "Hama", 
    "Al-Hasakah", "Homs", "Idlib", "Lattakia", "Quneitra", 
    "Raqqa", "Rif Dimashq", "Aswada", "Tartous"
];

export default {
    components: {
        Spinner,
        SyriaMap,
    },
    data: () => ({
        leaderboard: [],
        unrankedPlayers: [],
        loading: true,
        selected: 0,
        err: [],
        query: '',
        activeGovFilter: null,
        sortBy: 'score', // 'score' or 'completions'
        sortOrder: 'desc', // 'desc' or 'asc'
        showFilterMenu: false,
        store,
        governorates: SYRIAN_GOVERNORATES
    }),
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard leaderboard-container">
                
                <div class="error-container" v-if="err.length > 0">
                    <p class="error">
                        Leaderboard may be incomplete: {{ err.join(', ') }}
                    </p>
                </div>

                <!-- TOP CENTERED SYRIA MAP -->
                <div class="top-map-section">
                    <SyriaMap 
                        :selectedGov="activeGovFilter" 
                        :activeGovernorates="activeGovernorates"
                        @select="handleGovSelect"
                    ></SyriaMap>
                </div>

                <div class="board-and-profile-grid">
                    <!-- LEFT SIDE: FILTERED PLAYERS LIST -->
                    <div class="board-container">
                        
                        <!-- SEARCH AND FILTER TOOLBAR -->
                        <div class="search-container" style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
                            <div style="position: relative; flex: 1; display: flex; align-items: center;">
                                <input 
                                    type="text" 
                                    class="search-bar type-body" 
                                    v-model="query" 
                                    placeholder="Search players or discord tag..." 
                                    style="width: 100%; padding-right: 2rem;"
                                />
                                <button 
                                    v-if="query.length > 0"
                                    @click="query = ''"
                                    style="position: absolute; right: 0.6rem; background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer; font-size: 1rem; font-weight: bold; padding: 0.2rem; display: flex; align-items: center; justify-content: center;"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            </div>

                            <button 
                                @click="showFilterMenu = !showFilterMenu"
                                class="type-body"
                                :style="{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.6rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(185, 167, 121, 0.25)',
                                    background: showFilterMenu ? '#b9a779' : 'rgba(0,0,0,0.2)',
                                    color: showFilterMenu ? '#002623' : 'inherit',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }"
                                title="Toggle Filters"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                                <span v-if="activeGovFilter" style="background: #002623; color: #b9a779; padding: 0.1rem 0.35rem; borderRadius: 10px; fontSize: 0.7rem; fontWeight: bold; marginLeft: 0.3rem;">1</span>
                            </button>
                        </div>

                        <!-- DROPDOWN FILTER & SORT MENU -->
                        <div v-if="showFilterMenu" style="margin-bottom: 0.85rem; padding: 0.75rem; background: rgba(0,0,0,0.35); borderRadius: 8px; border: 1px solid rgba(185, 167, 121, 0.2); maxHeight: 380px; overflowY: auto;">
                            
                            <div style="display: flex; gap: 0.75rem; alignItems: center; justifyContent: space-between; marginBottom: 0.75rem; paddingBottom: 0.6rem; borderBottom: 1px solid rgba(255,255,255,0.1);">
                                <div style="display: flex; alignItems: center; gap: 0.4rem;">
                                    <span class="type-body" style="opacity: 0.7; color: inherit; fontSize: 0.85rem;">Sort By:</span>
                                    <select v-model="sortBy" class="type-body" style="background: #181818; color: inherit; border: 1px solid rgba(185, 167, 121, 0.3); padding: 0.25rem 0.4rem; borderRadius: 4px; cursor: pointer; fontSize: 0.85rem; height: 32px;">
                                        <option value="score">Points / Score</option>
                                        <option value="completions">Completions Count</option>
                                    </select>
                                </div>
                                
                                <div style="display: flex; alignItems: center; gap: 0.4rem;">
                                    <span class="type-body" style="opacity: 0.7; color: inherit; fontSize: 0.85rem;">Order:</span>
                                    <button 
                                        @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'" 
                                        class="type-body"
                                        style="display: inline-flex !important; flex-direction: row !important; align-items: center !important; justify-content: center !important; gap: 0.3rem !important; background: rgba(255,255,255,0.08) !important; color: inherit !important; border: 1px solid rgba(185, 167, 121, 0.3) !important; padding: 0 0.6rem !important; border-radius: 6px !important; cursor: pointer !important; font-size: 0.82rem !important; height: 32px !important; min-height: 32px !important; width: auto !important; min-width: 0 !important; box-shadow: none !important;"
                                    >
                                        <span>{{ sortOrder === 'desc' ? '▼' : '▲' }}</span>
                                        <span>{{ sortOrder === 'desc' ? 'Descending' : 'Ascending' }}</span>
                                    </button>
                                </div>
                            </div>

                            <div style="margin-bottom: 0.6rem;">
                                <div class="type-body" style="opacity: 0.7; fontWeight: bold; marginBottom: 0.35rem; textTransform: uppercase; color: inherit; fontSize: 0.8rem;">Governorate Filter</div>
                                <div style="display: flex; flexWrap: wrap; gap: 0.35rem;">
                                    <button 
                                        v-for="gov in governorates" 
                                        :key="gov"
                                        :disabled="!isGovActive(gov)"
                                        @click="toggleGovFilter(gov)"
                                        class="type-body"
                                        :style="{
                                            padding: '0.2rem 0.45rem',
                                            borderRadius: '4px',
                                            border: activeGovFilter && activeGovFilter.toLowerCase() === gov.toLowerCase() ? '1px solid #b9a779' : '1px solid rgba(255,255,255,0.15)',
                                            background: activeGovFilter && activeGovFilter.toLowerCase() === gov.toLowerCase() ? '#b9a779' : 'rgba(255,255,255,0.05)',
                                            color: activeGovFilter && activeGovFilter.toLowerCase() === gov.toLowerCase() ? '#002623' : 'inherit',
                                            fontWeight: activeGovFilter && activeGovFilter.toLowerCase() === gov.toLowerCase() ? '700' : 'normal',
                                            fontSize: '0.8rem',
                                            cursor: isGovActive(gov) ? 'pointer' : 'not-allowed',
                                            opacity: isGovActive(gov) ? 1 : 0.3
                                        }"
                                    >
                                        {{ gov }}
                                    </button>
                                </div>
                            </div>

                            <div v-if="activeGovFilter" style="marginTop: 0.5rem; textAlign: right;">
                                <button @click="handleGovSelect(null)" class="type-body" style="background: none; border: none; color: #ce1126; cursor: pointer; textDecoration: underline; fontWeight: bold; fontSize: 0.8rem;">
                                    Reset Governorate Filter
                                </button>
                            </div>
                        </div>

                        <!-- RANKED PLAYERS TABLE -->
                        <div v-if="filteredLeaderboard.length === 0 && filteredUnranked.length === 0" class="no-players-alert type-body" style="padding: 1.5rem; textAlign: center; opacity: 0.7;">
                            No registered players found matching current filters.
                        </div>
                        <table v-else-if="filteredLeaderboard.length > 0" class="players-list">
                            <tr v-for="(ientry, i) in filteredLeaderboard" :key="ientry.user">
                                <td class="rank">
                                    <p class="type-label-lg">#{{ sortOrder === 'desc' ? i + 1 : filteredLeaderboard.length - i }}</p>
                                </td>
                                <td class="player" :class="{ 'active': selected == i }">
                                    <button @click="selectUser(i)">
                                        <div class="player-info">
                                            <img 
                                                :src="ientry.pfp_url || fallbackPfp" 
                                                @error="handleImgError"
                                                class="player-pfp" 
                                                alt=""
                                            />
                                            <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 3px; min-width: 0; overflow: visible;">
                                                <span class="type-label-lg player-name">{{ ientry.user }}</span>
                                                <span v-if="ientry.governorate" class="type-body player-subtext">{{ ientry.governorate }}</span>
                                            </div>
                                        </div>
                                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-end; gap: 3px; flex-shrink: 0; margin-left: 0.5rem; overflow: visible;">
                                            <span class="type-label-lg player-score">{{ localize(ientry.total) }} pts</span>
                                            <span class="type-body player-subtext" style="color: #edebe0;">{{ getCompletionsCount(ientry) }} completed</span>
                                        </div>
                                    </button>
                                </td>
                            </tr>
                        </table>

                        <!-- UNRANKED PLAYERS SECTION -->
                        <div v-if="filteredUnranked.length > 0" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(185, 167, 121, 0.2);">
                            <h3 class="type-label-lg" style="color: #b9a779; opacity: 0.8; margin-bottom: 0.75rem; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                Unranked Players ({{ filteredUnranked.length }})
                            </h3>
                            <table class="players-list">
                                <tr v-for="(ientry, i) in filteredUnranked" :key="ientry.user">
                                    <td class="rank">
                                        <p class="type-label-lg" style="opacity: 0.4;">-</p>
                                    </td>
                                    <td class="player" :class="{ 'active': selected == (filteredLeaderboard.length + i) }">
                                        <button @click="selectUser(filteredLeaderboard.length + i)">
                                            <div class="player-info">
                                                <img 
                                                    :src="ientry.pfp_url || fallbackPfp" 
                                                    @error="handleImgError"
                                                    class="player-pfp" 
                                                    alt=""
                                                    style="opacity: 0.8;"
                                                />
                                                <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 3px; min-width: 0; overflow: visible;">
                                                    <span class="type-label-lg player-name">{{ ientry.user }}</span>
                                                    <span v-if="ientry.governorate" class="type-body player-subtext">{{ ientry.governorate }}</span>
                                                </div>
                                            </div>
                                            <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-end; gap: 3px; flex-shrink: 0; margin-left: 0.5rem; overflow: visible;">
                                                <span class="type-label-lg player-score" style="opacity: 0.5;">0.000 pts</span>
                                                <span class="type-body player-subtext" style="color: #edebe0; opacity: 0.6;">Unranked</span>
                                            </div>
                                        </button>
                                    </td>
                                </tr>
                            </table>
                        </div>

                    </div>

                    <!-- RIGHT SIDE: SELECTED PLAYER PROFILE DETAILS -->
                    <div class="player-container">
                        <div class="player" v-if="entry">
                            
                            <!-- Profile Card Banner -->
                            <div style="display: flex; flexDirection: column; gap: 1rem; marginBottom: 1.5rem; padding: 1.35rem; background: rgba(185,167,121,0.03); border: 1px solid rgba(185,167,121,0.15); borderRadius: 14px;">
                                
                                <div style="display: flex; justifyContent: space-between; alignItems: flex-start; gap: 1rem; flexWrap: wrap;">
                                    <div style="display: flex; alignItems: center; gap: 1.25rem; flex: 1; minWidth: 240px;">
                                        <img 
                                            :src="entry.pfp_url || fallbackPfp" 
                                            @error="handleImgError"
                                            alt="" 
                                            style="width: 76px; height: 76px; borderRadius: 50%; objectFit: cover; border: 3px solid #b9a779; flexShrink: 0;"
                                        />
                                        <div>
                                            <h1 class="type-label-lg" style="margin: 0; fontSize: 1.85rem; fontWeight: 800; color: inherit; lineHeight: 1.2;">
                                                <span v-if="entry.total > 0">#{{ getOriginalRank(entry) }} </span>{{ entry.user }}
                                            </h1>
                                            <span class="type-label-lg" style="fontSize: 1.15rem; fontWeight: 800; color: #b9a779; display: inline-block; marginTop: 0.25rem;">
                                                {{ entry.total > 0 ? localize(entry.total) + ' pts' : 'Unranked' }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Social Links Group -->
                                    <div style="display: flex; alignItems: center; gap: 0.75rem; background: rgba(0,0,0,0.2); padding: 0.45rem 0.75rem; borderRadius: 8px; border: 1px solid rgba(255,255,255,0.08);">
                                        <a v-if="entry.spreadsheet" :href="entry.spreadsheet" target="_blank" title="Spreadsheet" style="color: #ffffff; opacity: 0.85; display: flex; alignItems: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="3" y1="9" x2="21" y2="9"></line>
                                                <line x1="3" y1="15" x2="21" y2="15"></line>
                                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                                <line x1="15" y1="3" x2="15" y2="21"></line>
                                            </svg>
                                        </a>
                                        <a v-if="entry.youtube" :href="entry.youtube" target="_blank" title="YouTube" style="color: #ffffff; opacity: 0.85; display: flex; alignItems: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                            </svg>
                                        </a>
                                        <a v-if="entry.twitch" :href="entry.twitch" target="_blank" title="Twitch" style="color: #ffffff; opacity: 0.85; display: flex; alignItems: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                                            </svg>
                                        </a>
                                        <a v-if="entry.twitter" :href="entry.twitter" target="_blank" title="Twitter / X" style="color: #ffffff; opacity: 0.85; display: flex; alignItems: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                            </svg>
                                        </a>
                                        <a v-if="entry.instagram" :href="entry.instagram" target="_blank" title="Instagram" style="color: #ffffff; opacity: 0.85; display: flex; alignItems: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                            </svg>
                                        </a>
                                        <a v-if="entry.tiktok" :href="entry.tiktok" target="_blank" title="TikTok" style="color: #ffffff; opacity: 0.85; display: flex; alignItems: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.67 2.58-4.87 1.46-1.2 3.41-1.8 5.29-1.63.13.02.26.04.38.07V13.8c-.36-.07-.73-.1-.1-.1-1.07.02-2.12.43-2.88 1.18-.84.83-1.24 2.03-1.09 3.2.14 1.13.84 2.12 1.86 2.64 1.02.52 2.27.5 3.26-.04.99-.54 1.63-1.57 1.69-2.7.01-3.61.01-7.21.01-10.82z"/>
                                            </svg>
                                        </a>
                                    </div>
                                </div>

                                <!-- Bio Section -->
                                <p class="type-body" style="margin: 0; fontSize: 0.95rem; opacity: 0.8; lineHeight: 1.45;" :style="{ fontStyle: entry.bio ? 'italic' : 'normal' }">
                                    {{ entry.bio ? '"' + entry.bio + '"' : 'No bio provided.' }}
                                </p>
                                
                                <!-- Badges -->
                                <div style="display: flex; gap: 0.65rem; alignItems: center; opacity: 0.95; flexWrap: wrap;">
                                    <span v-if="entry.governorate" class="type-body" style="display: inline-flex; alignItems: center; gap: 0.4rem; background: rgba(185, 167, 121, 0.15); border: 1px solid #b9a779; padding: 0.35rem 0.75rem; borderRadius: 8px; fontSize: 0.88rem; fontWeight: 700; color: inherit;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        {{ entry.governorate }}
                                    </span>
                                    
                                    <span v-if="entry.discord_tag" class="type-body" style="display: inline-flex; alignItems: center; gap: 0.45rem; background: rgba(88, 101, 242, 0.18); border: 1px solid rgba(88, 101, 242, 0.4); padding: 0.35rem 0.75rem; borderRadius: 8px; fontSize: 0.88rem; fontWeight: 700; color: inherit;">
                                        <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="#5865F2">
                                            <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.14zM42.45 65.69c-6.32 0-11.52-5.8-11.52-12.91s5.07-12.9 11.52-12.9c6.5 0 11.64 5.86 11.52 12.9 0 7.11-5.07 12.91-11.52 12.91zm42.24 0c-6.32 0-11.52-5.8-11.52-12.91s5.07-12.9 11.52-12.9c6.5 0 11.64 5.86 11.52 12.9 0 7.11-5.07 12.91-11.52 12.91z"/>
                                        </svg>
                                        {{ entry.discord_tag }}
                                    </span>
                                </div>

                            </div>

                            <!-- Empty Profile Prompt for Unranked -->
                            <div v-if="entry.verified.length === 0 && entry.completed.length === 0 && entry.progressed.length === 0" style="padding: 2rem; textAlign: center; opacity: 0.6;" class="type-body">
                                This user hasn't submitted any verified records yet.
                            </div>

                            <!-- Completion Breakdown Tables -->
                            <div v-if="entry.verified.length > 0" style="marginBottom: 1.5rem;">
                                <h2>Verified ({{ entry.verified.length }})</h2>
                                <table class="completed-list">
                                    <tr v-for="s in entry.verified" :key="s.level">
                                        <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                        <td class="level">
                                            <button :style="getThumbnailStyle(s.levelId)" @click="goToLevel(s.levelId)" style="width: 100%; display: flex; alignItems: center; gap: 1rem; paddingRight: 1rem;">
                                                <span class="type-label-lg level-name" style="flex: 1; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap; textAlign: left;">{{ s.level }}</span>
                                                <span class="type-label-lg level-name" style="color: #b9a779 !important; flexShrink: 0;">+{{ localize(s.score) }}</span>
                                                <a v-if="s.link" :href="s.link" @click.stop target="_blank" rel="noopener noreferrer" title="Watch Video" style="display: flex; alignItems: center; justifyContent: center; width: 24px; height: 24px; color: #b9a779; textDecoration: none; flexShrink: 0; transition: opacity 0.2s;" onmouseenter="this.style.opacity=0.75" onmouseleave="this.style.opacity=1">
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                    </svg>
                                                </a>
                                                <span v-else style="width: 24px; flexShrink: 0;"></span>
                                            </button>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div v-if="entry.completed.length > 0" style="marginBottom: 1.5rem;">
                                <h2>Completed ({{ entry.completed.length }})</h2>
                                <table class="completed-list">
                                    <tr v-for="s in entry.completed" :key="s.level">
                                        <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                        <td class="level">
                                            <button :style="getThumbnailStyle(s.levelId)" @click="goToLevel(s.levelId)" style="width: 100%; display: flex; alignItems: center; gap: 1rem; paddingRight: 1rem;">
                                                <span class="type-label-lg level-name" style="flex: 1; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap; textAlign: left;">{{ s.level }}</span>
                                                <span class="type-label-lg level-name" style="color: #b9a779 !important; flexShrink: 0;">+{{ localize(s.score) }}</span>
                                                <a v-if="s.link" :href="s.link" @click.stop target="_blank" rel="noopener noreferrer" title="Watch Video" style="display: flex; alignItems: center; justifyContent: center; width: 24px; height: 24px; color: #b9a779; textDecoration: none; flexShrink: 0; transition: opacity 0.2s;" onmouseenter="this.style.opacity=0.75" onmouseleave="this.style.opacity=1">
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                    </svg>
                                                </a>
                                                <span v-else style="width: 24px; flexShrink: 0;"></span>
                                            </button>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div v-if="entry.progressed.length > 0">
                                <h2>Progressed ({{ entry.progressed.length }})</h2>
                                <table class="completed-list">
                                    <tr v-for="s in entry.progressed" :key="s.level">
                                        <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                        <td class="level">
                                            <button :style="getThumbnailStyle(s.levelId)" @click="goToLevel(s.levelId)" style="width: 100%; display: flex; alignItems: center; gap: 1rem; paddingRight: 1rem;">
                                                <span class="type-label-lg level-name" style="flex: 1; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap; textAlign: left;">{{ s.percent }}% {{ s.level }}</span>
                                                <span class="type-label-lg level-name" style="color: #b9a779 !important; flexShrink: 0;">+{{ localize(s.score) }}</span>
                                                <a v-if="s.link" :href="s.link" @click.stop target="_blank" rel="noopener noreferrer" title="Watch Video" style="display: flex; alignItems: center; justifyContent: center; width: 24px; height: 24px; color: #b9a779; textDecoration: none; flexShrink: 0; transition: opacity 0.2s;" onmouseenter="this.style.opacity=0.75" onmouseleave="this.style.opacity=1">
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                    </svg>
                                                </a>
                                                <span v-else style="width: 24px; flexShrink: 0;"></span>
                                            </button>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    `,
    computed: {
        activeGovernorates() {
            const activeSet = new Set();
            [...this.leaderboard, ...this.unrankedPlayers].forEach(player => {
                if (player.governorate) {
                    activeSet.add(player.governorate.toLowerCase().trim());
                }
            });
            return Array.from(activeSet);
        },
        filteredLeaderboard() {
            return this.filterAndSortList(this.leaderboard);
        },
        filteredUnranked() {
            return this.filterAndSortList(this.unrankedPlayers);
        },
        allFilteredPlayers() {
            return [...this.filteredLeaderboard, ...this.filteredUnranked];
        },
        entry() {
            return this.allFilteredPlayers[this.selected] || null;
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
        },
        query() { this.updateQueryParams(); },
        activeGovFilter() { this.updateQueryParams(); },
        sortBy() { this.updateQueryParams(); },
        sortOrder() { this.updateQueryParams(); }
    },
    async mounted() {
        const q = this.$route.query;
        if (q.q) this.query = q.q;
        if (q.gov) this.activeGovFilter = q.gov;
        if (q.sort) this.sortBy = q.sort;
        if (q.order) this.sortOrder = q.order;

        await this.loadLiveLeaderboard();

        const param = this.$route.params.user;

        if (param && this.allFilteredPlayers.length > 0) {
            const foundIndex = this.allFilteredPlayers.findIndex(
                (entry) => entry.user.toLowerCase() === decodeURIComponent(param).trim().toLowerCase()
            );
            if (foundIndex !== -1) {
                this.selected = foundIndex;
            } else {
                this.selected = 0;
            }
        } else {
            this.selected = 0;
        }

        this.loading = false;
    },
    methods: {
        localize,
        isGovActive(gov) {
            return this.activeGovernorates.includes(gov.toLowerCase().trim());
        },
        getCompletionsCount(player) {
            if (!player) return 0;
            const verifiedCount = player.verified ? player.verified.length : 0;
            const completedCount = player.completed ? player.completed.length : 0;
            return verifiedCount + completedCount;
        },
        getOriginalRank(player) {
            if (!player) return 0;
            const idx = this.leaderboard.findIndex(p => p.user.toLowerCase() === player.user.toLowerCase());
            return idx !== -1 ? idx + 1 : 1;
        },
        handleGovSelect(govTitle) {
            if (govTitle && !this.isGovActive(govTitle)) return;
            this.activeGovFilter = govTitle;
            this.selected = 0;
        },
        toggleGovFilter(gov) {
            if (!this.isGovActive(gov)) return;
            if (this.activeGovFilter && this.activeGovFilter.toLowerCase() === gov.toLowerCase()) {
                this.activeGovFilter = null;
            } else {
                this.activeGovFilter = gov;
            }
            this.selected = 0;
        },
        handleImgError(evt) {
            evt.target.onerror = null;
            evt.target.src = FALLBACK_PFP;
        },
        goToLevel(levelId) {
            if (levelId) {
                this.$router.push(`/${levelId}`);
            }
        },
        getThumbnailStyle(id) {
            if (!id) return { backgroundImage: 'none' };
            return {
                backgroundImage: `linear-gradient(180deg, rgba(0, 38, 35, 0.16) 0%, rgba(0, 26, 24, 0.32) 50%), url('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${id}.webp')`,
                backgroundBlendMode: 'overlay',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            };
        },
        selectUser(index) {
            this.selected = index;
            const currentUser = this.allFilteredPlayers[index]?.user;
            if (currentUser) {
                this.$router.push({
                    path: `/leaderboard/${encodeURIComponent(currentUser)}`,
                    query: this.$route.query
                });
            }
        },
        filterAndSortList(list) {
            let result = [...list];

            if (this.activeGovFilter) {
                const targetGov = this.activeGovFilter.toLowerCase().trim();
                result = result.filter(player => {
                    return player.governorate && player.governorate.toLowerCase().trim() === targetGov;
                });
            }

            if (this.query.trim()) {
                const q = this.query.toLowerCase().trim();
                result = result.filter(player => {
                    const nameMatch = player.user && player.user.toLowerCase().includes(q);
                    const tagMatch = player.discord_tag && player.discord_tag.toLowerCase().includes(q);
                    return nameMatch || tagMatch;
                });
            }

            result.sort((a, b) => {
                let valA = a.total;
                let valB = b.total;

                if (this.sortBy === 'completions') {
                    valA = this.getCompletionsCount(a);
                    valB = this.getCompletionsCount(b);
                }

                if (Math.abs(valB - valA) > 0.0001) {
                    return this.sortOrder === 'desc' ? valB - valA : valA - valB;
                }
                return a.user.localeCompare(b.user);
            });

            return result;
        },
        updateQueryParams() {
            const query = { ...this.$route.query };

            if (this.query.trim()) query.q = this.query.trim();
            else delete query.q;

            if (this.activeGovFilter) query.gov = this.activeGovFilter;
            else delete query.gov;

            if (this.sortBy !== 'score') query.sort = this.sortBy;
            else delete query.sort;

            if (this.sortOrder !== 'desc') query.order = this.sortOrder;
            else delete query.order;

            this.$router.replace({ query }).catch(() => {});
        },
        async loadLiveLeaderboard() {
            const [baseBoard, errs] = await fetchLeaderboard();
            const listData = await fetchList();
            this.err = errs || [];

            const totalLevels = listData.length || 100;

            const levelIdByName = new Map();
            listData.forEach(item => {
                const lvl = Array.isArray(item) ? item[0] : item;
                if (lvl && lvl.name) {
                    levelIdByName.set(lvl.name.trim().toLowerCase(), lvl.id);
                }
            });

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

            // 1. Static base JSON records
            baseBoard.forEach(p => {
                const key = p.user.trim().toLowerCase();
                const meta = profileDetails.get(key) || {};

                let recalculatedTotal = 0;

                const verified = (p.verified || []).map(v => {
                    const newScore = score(v.rank, 100, 100, totalLevels);
                    recalculatedTotal += newScore;
                    return { ...v, score: newScore, levelId: v.levelId || levelIdByName.get(v.level.trim().toLowerCase()) };
                });

                const completed = (p.completed || []).map(c => {
                    const newScore = score(c.rank, 100, 100, totalLevels);
                    recalculatedTotal += newScore;
                    return { ...c, score: newScore, levelId: c.levelId || levelIdByName.get(c.level.trim().toLowerCase()) };
                });

                const progressed = (p.progressed || []).map(pr => {
                    const newScore = score(pr.rank, pr.percent, 0, totalLevels);
                    recalculatedTotal += newScore;
                    return { ...pr, score: newScore, levelId: pr.levelId || levelIdByName.get(pr.level.trim().toLowerCase()) };
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

            // 2. Approved live submissions from Supabase
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
                    const earnedScore = score(rank, sub.percent, lvl.percentToQualify || 0, totalLevels);

                    const recordObj = {
                        rank,
                        level: lvl.name,
                        score: earnedScore,
                        link: sub.video_link,
                        percent: sub.percent,
                        levelId: lvl.id
                    };

                    if (sub.percent >= 100) {
                        const existsIndex = player.completed.findIndex(c => c.level === lvl.name);
                        if (existsIndex !== -1) {
                            player.total -= player.completed[existsIndex].score;
                            player.completed[existsIndex] = recordObj;
                            player.total += earnedScore;
                        } else {
                            const verifiedExists = player.verified.findIndex(v => v.level === lvl.name);
                            if (verifiedExists === -1) {
                                player.completed.push(recordObj);
                                player.total += earnedScore;
                            }
                        }
                    } else {
                        const identicalIndex = player.progressed.findIndex(p => p.level === lvl.name);
                        if (identicalIndex !== -1) {
                            if (sub.percent > player.progressed[identicalIndex].percent) {
                                player.total -= player.progressed[identicalIndex].score;
                                player.progressed[identicalIndex] = recordObj;
                                player.total += earnedScore;
                            }
                        } else {
                            player.progressed.push(recordObj);
                            player.total += earnedScore;
                        }
                    }
                });
            }

            // 3. Process database profiles to split into Ranked vs Unranked
            const rankedList = [];
            const unrankedList = [];

            if (dbProfiles) {
                dbProfiles.forEach(profile => {
                    const key = profile.username?.trim().toLowerCase();
                    if (!key) return;

                    const player = playerMap.get(key) || {
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
                    };

                    player.verified.sort((a, b) => a.rank - b.rank);
                    player.completed.sort((a, b) => a.rank - b.rank);
                    player.progressed.sort((a, b) => a.rank - b.rank);

                    if (player.total > 0 || player.verified.length > 0 || player.completed.length > 0 || player.progressed.length > 0) {
                        if (!rankedList.some(p => p.user.toLowerCase() === key)) {
                            rankedList.push(player);
                        }
                    } else {
                        if (!unrankedList.some(p => p.user.toLowerCase() === key)) {
                            unrankedList.push(player);
                        }
                    }
                });
            }

            // Add any remaining legacy users from playerMap not in Supabase profiles into ranked
            playerMap.forEach((player, key) => {
                if (!rankedList.some(p => p.user.toLowerCase() === key) && !unrankedList.some(p => p.user.toLowerCase() === key)) {
                    if (player.total > 0) {
                        rankedList.push(player);
                    }
                }
            });

            this.leaderboard = rankedList.sort((a, b) => {
                if (Math.abs(b.total - a.total) > 0.0001) {
                    return b.total - a.total;
                }
                return a.user.localeCompare(b.user);
            });

            this.unrankedPlayers = unrankedList.sort((a, b) => a.user.localeCompare(b.user));
        }
    },
};