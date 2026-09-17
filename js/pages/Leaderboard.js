import { fetchLeaderboard, fetchList, fetchEditors } from '../content.js';
import { localize } from '../util.js';
import { score } from '../score.js';
import { supabase } from '../supabase.js';
import { store } from '../main.js';

import Spinner from '../components/Spinner.js';
import SyriaMap from '../components/SyriaMap.js';

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

const FALLBACK_PFP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23b9a779"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23002623" font-size="40" font-family="sans-serif">?</text></svg>`;

const SYRIAN_GOVERNORATES = [
    "Aleppo", "Damascus", "Daraa", "Deir ez-Zor", "Hama", 
    "Al-Hasakah", "Homs", "Idlib", "Latakia", "Quneitra", 
    "Raqqa", "Rif Dimashq", "As-Suwayda", "Tartus"
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
        sortBy: 'score',
        sortOrder: 'desc',
        showFilterMenu: false,
        store,
        governorates: SYRIAN_GOVERNORATES,
        editors: [],
        roleIconMap,
        mobileTab: 'board', // 'board' | 'profile'
        isMobile: window.innerWidth <= 1024,
        touchStartX: null,
        touchStartY: null
    }),
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main 
            v-else 
            class="page-leaderboard-container"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
        >
            <div class="page-leaderboard leaderboard-container">
                
                <div class="error-container" v-if="err.length > 0">
                    <p class="error">
                        Leaderboard may be incomplete: {{ err.join(', ') }}
                    </p>
                </div>

                <div class="board-and-profile-grid">
                    
                    <!-- 1. LEFT SIDE: RANKINGS (Stationary Map & Search at top, Players scroll underneath) -->
                    <div class="board-container" :class="{ 'mobile-tab-active': !isMobile || mobileTab === 'board' }">
                        
                        <!-- A. STATIONARY TOP (Map + Search Bar) -->
                        <div class="board-fixed-header">
                            <div class="top-map-section">
                                <SyriaMap 
                                    :selectedGov="activeGovFilter" 
                                    :activeGovernorates="activeGovernorates"
                                    @select="handleGovSelect"
                                ></SyriaMap>
                            </div>

                            <div class="search-container" style="display: flex; gap: 0.5rem; align-items: center; width: 100%; box-sizing: border-box;">
                                <div style="position: relative; flex: 1; display: flex; align-items: center;">
                                    <input 
                                        type="text" 
                                        class="search-bar type-body" 
                                        v-model="query" 
                                        placeholder="Search players or discord tag..." 
                                        style="width: 100%; padding-right: 2rem; box-sizing: border-box;"
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
                                    <span v-if="activeGovFilter" style="background: #002623; color: #b9a779; padding: 0.1rem 0.35rem; border-radius: 10px; font-size: 0.7rem; font-weight: bold; margin-left: 0.3rem;">1</span>
                                </button>
                            </div>

                            <!-- DROPDOWN FILTER & SORT MENU -->
                            <div v-if="showFilterMenu" style="margin: 0.5rem 0 0 0; padding: 0.75rem; background: rgba(0,0,0,0.35); border-radius: 8px; border: 1px solid rgba(185, 167, 121, 0.2); max-height: 380px; overflow-y: auto; width: 100%; box-sizing: border-box;">
                                <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; padding-bottom: 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                                        <span class="type-body" style="opacity: 0.7; color: inherit; font-size: 0.85rem;">Sort By:</span>
                                        <select v-model="sortBy" class="type-body" style="background: #181818; color: inherit; border: 1px solid rgba(185, 167, 121, 0.3); padding: 0.25rem 0.4rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; height: 32px;">
                                            <option value="score">Points / Score</option>
                                            <option value="completions">Completions Count</option>
                                        </select>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                                        <span class="type-body" style="opacity: 0.7; color: inherit; font-size: 0.85rem;">Order:</span>
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
                                    <div class="type-body" style="opacity: 0.7; font-weight: bold; margin-bottom: 0.35rem; text-transform: uppercase; color: inherit; font-size: 0.8rem;">Governorate Filter</div>
                                    <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
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

                                <div v-if="activeGovFilter" style="margin-top: 0.5rem; text-align: right;">
                                    <button @click="handleGovSelect(null)" class="type-body" style="background: none; border: none; color: #ce1126; cursor: pointer; text-decoration: underline; font-weight: bold; font-size: 0.8rem;">
                                        Reset Governorate Filter
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- B. SCROLLABLE PLAYERS SLIDER (Scrollbar starts strictly below the search bar) -->
                        <div class="board-scroll-wrap">
                            <div v-if="filteredLeaderboard.length === 0 && filteredUnranked.length === 0" class="no-players-alert type-body" style="padding: 1.5rem; text-align: center; opacity: 0.7;">
                                No registered players found matching current filters.
                            </div>
                            <table v-else-if="filteredLeaderboard.length > 0" class="players-list">
                                <tr v-for="(ientry, i) in filteredLeaderboard" :key="ientry.user">
                                    <td class="rank">
                                        <p class="type-label-lg">#{{ sortOrder === 'desc' ? i + 1 : filteredLeaderboard.length - i }}</p>
                                    </td>
                                    <td class="player" :class="{ 'active': selected == i }">
                                        <button @click="selectUser(i)">
                                            <div class="player-info" style="display: flex; align-items: center; gap: 0.75rem; height: auto; min-width: 0;">
                                                <img
                                                    :src="ientry.pfp_url || fallbackPfp"
                                                    @error="handleImgError"
                                                    class="player-pfp"
                                                    alt=""
                                                    style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;"
                                                />
                                                <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 2px; height: auto; min-width: 0; overflow: visible;">
                                                    <div style="display: flex; align-items: center; gap: 6px;">
                                                        <span class="type-label-lg player-name">{{ ientry.user }}</span>
                                                        <div v-if="getEditorInfo(ientry)" class="staff-badge-wrap staff-badge-container" @click.stop>
                                                            <div style="display: flex; align-items: center; gap: 4px;">
                                                                <img
                                                                    v-for="(iconSrc, idx) in getEditorRoleIcons(ientry)"
                                                                    :key="idx"
                                                                    :src="iconSrc"
                                                                    alt="Staff"
                                                                    class="staff-icon-only-sm"
                                                                />
                                                            </div>
                                                            <div class="staff-tooltip">
                                                                {{ getEditorInfo(ientry).tag || getEditorRoleTitle(ientry) }}
                                                            </div>
                                                        </div>
                                                    </div>
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

                            <!-- UNRANKED SECTION (100% Full Width) -->
                            <div v-if="filteredUnranked.length > 0" class="unranked-section">
                                <h3 class="type-label-lg" style="color: #b9a779; opacity: 0.8; margin: 1.5rem 0 0.75rem 0; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Unranked Players ({{ filteredUnranked.length }})
                                </h3>
                                <table class="players-list">
                                    <tr v-for="(ientry, i) in filteredUnranked" :key="ientry.user">
                                        <td class="rank">
                                            <p class="type-label-lg" style="opacity: 0.4;">-</p>
                                        </td>
                                        <td class="player" :class="{ 'active': selected == (filteredLeaderboard.length + i) }">
                                            <button @click="selectUser(filteredLeaderboard.length + i)">
                                                <div class="player-info" style="display: flex; align-items: center; gap: 0.75rem; height: auto; min-width: 0;">
                                                    <img 
                                                        :src="ientry.pfp_url || fallbackPfp" 
                                                        @error="handleImgError"
                                                        class="player-pfp" 
                                                        alt=""
                                                        style="opacity: 0.8; width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;"
                                                    />
                                                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 3px; min-width: 0; overflow: visible;">
                                                        <div style="display: flex; align-items: center; gap: 6px;">
                                                            <span class="type-label-lg player-name">{{ ientry.user }}</span>
                                                            <div v-if="getEditorInfo(ientry)" class="staff-badge-wrap staff-badge-container" @click.stop>
                                                                <div style="display: flex; align-items: center; gap: 4px;">
                                                                    <img 
                                                                        v-for="(iconSrc, idx) in getEditorRoleIcons(ientry)" 
                                                                        :key="idx" 
                                                                        :src="iconSrc" 
                                                                        alt="Staff" 
                                                                        class="staff-icon-only-sm"
                                                                    />
                                                                </div>
                                                                <div class="staff-tooltip">
                                                                    {{ getEditorInfo(ientry).tag || getEditorRoleTitle(ientry) }}
                                                                </div>
                                                            </div>
                                                        </div>
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

                    </div>

                    <!-- 2. RIGHT SIDE: PROFILE (Profile Card Stationary at top, Completions is the Slider) -->
                    <div class="player-container" :class="{ 'mobile-tab-active': !isMobile || mobileTab === 'profile' }">
                        <div class="player" v-if="entry">
                            
                            <!-- A. FIXED STATIONARY PROFILE CARD -->
                            <div class="player-profile-card" style="position: relative; display: flex; flex-direction: column; gap: 1.15rem; padding: 1.4rem; background: rgba(0, 26, 23, 0.95); border: 1px solid rgba(185, 167, 121, 0.25); border-radius: 16px; backdrop-filter: blur(12px); box-sizing: border-box; width: 100%;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; gap: 1.25rem; flex: 1; min-width: 240px;">
                                        <img 
                                            :src="entry.pfp_url || fallbackPfp" 
                                            @error="handleImgError"
                                            alt="" 
                                            style="width: 78px; height: 78px; border-radius: 50%; object-fit: cover; border: 2.5px solid #b9a779; box-shadow: 0 4px 14px rgba(0,0,0,0.4); flex-shrink: 0;"
                                        />
                                        <div style="display: flex; flex-direction: column; gap: 0.45rem; min-width: 0;">
                                            <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                                                <h1 class="type-label-lg" style="margin: 0; font-size: 1.85rem; font-weight: 800; color: #ffffff; line-height: 1.2;">
                                                    <span v-if="entry.total > 0" style="color: #b9a779; margin-right: 0.35rem;">#{{ getOriginalRank(entry) }}</span>{{ entry.user }}
                                                </h1>
                                                
                                                <div v-if="getEditorInfo(entry)" class="staff-badge-wrap staff-badge-container">
                                                    <div style="display: flex; align-items: center; gap: 5px;">
                                                        <img 
                                                            v-for="(iconSrc, idx) in getEditorRoleIcons(entry)" 
                                                            :key="idx" 
                                                            :src="iconSrc" 
                                                            alt="Staff" 
                                                            class="staff-icon-only"
                                                        />
                                                    </div>
                                                    <div class="staff-tooltip">
                                                        {{ getEditorInfo(entry).tag || getEditorRoleTitle(entry) }}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.15rem;">
                                                <div style="display: inline-flex; align-items: center; gap: 7px; background: rgba(0, 30, 26, 0.85); border: 1.5px solid rgba(185, 167, 121, 0.45); padding: 0.35rem 0.85rem; border-radius: 9px;">
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                        <circle cx="12" cy="10" r="3"></circle>
                                                    </svg>
                                                    <span style="font-size: 0.9rem; font-weight: 800; color: #edebe0; letter-spacing: 0.2px;">{{ entry.governorate || 'Syria' }}</span>
                                                </div>

                                                <div v-if="entry.discord_tag" style="display: inline-flex; align-items: center; gap: 7px; background: rgba(18, 24, 48, 0.85); border: 1.5px solid rgba(88, 101, 242, 0.45); padding: 0.35rem 0.85rem; border-radius: 9px;">
                                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#5865F2" style="flex-shrink: 0;">
                                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                                                    </svg>
                                                    <span style="font-size: 0.9rem; font-weight: 800; color: #edebe0; letter-spacing: 0.2px;">{{ entry.discord_tag }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div v-if="entry.spreadsheet || entry.youtube || entry.twitch || entry.twitter || entry.tiktok" style="display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.3); padding: 0.45rem 0.8rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
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
                                        <a v-if="entry.tiktok" :href="entry.tiktok" target="_blank" title="TikTok" style="color: #ffffff; opacity: 0.85; display: flex; align-items: center; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.85">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.67 2.58-4.87 1.46-1.2 3.41-1.8 5.29-1.63.13.02.26.04.38.07V13.8c-.36-.07-.73-.1-.1-.1-1.07.02-2.12.43-2.88 1.18-.84.83-1.24 2.03-1.09 3.2.14 1.13.84 2.12 1.86 2.64 1.02.52 2.27.5 3.26-.04.99-.54 1.63-1.57 1.69-2.7.01-3.61.01-7.21.01-10.82z"/>
                                            </svg>
                                        </a>
                                    </div>
                                </div>

                                <!-- 3 Stat Boxes (Never truncate with ellipsis) -->
                                <!-- 3 Stat Boxes: Generous height and line-height: 1.4 eliminates any clipping of 'g' or 'y' -->
                                <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; width: 100%; margin-top: 0.25rem;">
                                    <div style="background: rgba(0, 20, 18, 0.85); border: 1px solid rgba(185, 167, 121, 0.25); padding: 0.65rem 0.2rem 0.55rem 0.2rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; min-width: 0; box-sizing: border-box; text-align: center;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; font-weight: 700; color: rgba(237, 235, 224, 0.65); text-transform: uppercase; letter-spacing: 0.4px; line-height: 1.2; margin-bottom: 3px; display: block;">Points</span>
                                        <span class="type-label-lg" style="font-size: clamp(0.72rem, 2.7vw, 1.05rem); font-weight: 800; color: #b9a779; line-height: 1.4; margin: 0; padding-bottom: 2px; letter-spacing: -0.3px; white-space: nowrap; display: block;">{{ entry.total > 0 ? localize(entry.total) : '0.000' }}</span>
                                    </div>
                                    <div style="background: rgba(0, 20, 18, 0.85); border: 1px solid rgba(185, 167, 121, 0.25); padding: 0.65rem 0.2rem 0.55rem 0.2rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; min-width: 0; box-sizing: border-box; text-align: center;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; font-weight: 700; color: rgba(237, 235, 224, 0.65); text-transform: uppercase; letter-spacing: 0.4px; line-height: 1.2; margin-bottom: 3px; display: block;">Hardest</span>
                                        <span class="type-label-lg" style="font-size: clamp(0.72rem, 2.5vw, 0.95rem); font-weight: 800; color: #edebe0; line-height: 1.45; margin: 0; padding-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">{{ getHardestLevelName(entry) }}</span>
                                    </div>
                                    <div style="background: rgba(0, 20, 18, 0.85); border: 1px solid rgba(185, 167, 121, 0.25); padding: 0.65rem 0.2rem 0.55rem 0.2rem; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; min-width: 0; box-sizing: border-box; text-align: center;">
                                        <!-- Shortened label 'COMPLETED' fits all mobile screens without cutting off -->
                                        <span class="type-label-sm" style="font-size: 0.65rem; font-weight: 700; color: rgba(237, 235, 224, 0.65); text-transform: uppercase; letter-spacing: 0.4px; line-height: 1.2; margin-bottom: 3px; display: block;">Completed</span>
                                        <span class="type-label-lg" style="font-size: clamp(0.72rem, 2.7vw, 1.05rem); font-weight: 800; color: #edebe0; line-height: 1.4; margin: 0; padding-bottom: 2px; white-space: nowrap; display: block;">{{ getCompletionsCount(entry) }}</span>
                                    </div>
                                </div>

                                <div style="background: rgba(0, 20, 18, 0.85); border: 1px solid rgba(185, 167, 121, 0.2); padding: 0.85rem 1.1rem; border-radius: 12px;">
                                    <p class="type-body" style="margin: 0; font-size: 0.95rem; opacity: 0.85; line-height: 1.5;" :style="{ fontStyle: entry.bio ? 'italic' : 'normal' }">
                                        {{ entry.bio ? '"' + entry.bio + '"' : 'No bio provided.' }}
                                    </p>
                                </div>
                            </div>

                            <!-- B. SCROLLABLE COMPLETIONS SLIDER -->
                            <div class="completions-scroll-wrap">
                                
                                <!-- Empty state for unranked or 0 records -->
                                <div v-if="(!entry.verified || entry.verified.length === 0) && (!entry.completed || entry.completed.length === 0) && (!entry.progressed || entry.progressed.length === 0)" style="padding: 2.5rem 1rem; text-align: center; opacity: 0.6;" class="type-body">
                                    This user hasn't submitted any verified records yet.
                                </div>

                                <!-- VERIFIED: Strictly hidden when 0 -->
                                <div v-if="entry.verified && entry.verified.length > 0" style="margin-bottom: 1.25rem;">
                                    <div class="section-header" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.55rem;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        <h3 class="section-title" style="margin: 0; font-family: 'Lexend Deca', sans-serif; font-size: 1.15rem; font-weight: 800; color: #edebe0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.45;">Verified</h3>
                                    </div>
                                    <table class="completed-list">
                                        <tr v-for="s in entry.verified" :key="s.level">
                                            <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                            <td class="level">
                                                <button :style="getThumbnailStyle(s.levelId)" @click="goToLevel(s.levelId)">
                                                    <span class="type-label-lg level-name" style="flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">{{ s.level }}</span>
                                                    <div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
                                                        <span class="type-label-lg" style="color: #b9a779 !important; font-weight: 800; font-size: 0.85rem; white-space: nowrap; margin: 0;">+{{ localize(s.score) }}</span>
                                                        <a v-if="s.link" :href="s.link" @click.stop target="_blank" rel="noopener noreferrer" title="Watch Video" style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; color: #b9a779; text-decoration: none; flex-shrink: 0; transition: opacity 0.2s;" onmouseenter="this.style.opacity=0.75" onmouseleave="this.style.opacity=1">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                                        </a>
                                                        <span v-else style="width: 22px; flex-shrink: 0;"></span>
                                                    </div>
                                                </button>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- COMPLETED: Strictly hidden when 0 -->
                                <div v-if="entry.completed && entry.completed.length > 0" style="margin-bottom: 1.25rem;">
                                    <div class="section-header" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.55rem;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                        <h3 class="section-title" style="margin: 0; font-family: 'Lexend Deca', sans-serif; font-size: 1.15rem; font-weight: 800; color: #edebe0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.45;">Completed</h3>
                                    </div>
                                    <table class="completed-list">
                                        <tr v-for="s in entry.completed" :key="s.level">
                                            <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                            <td class="level">
                                                <button :style="getThumbnailStyle(s.levelId)" @click="goToLevel(s.levelId)">
                                                    <span class="type-label-lg level-name" style="flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">{{ s.level }}</span>
                                                    <div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
                                                        <span class="type-label-lg" style="color: #b9a779 !important; font-weight: 800; font-size: 0.85rem; white-space: nowrap; margin: 0;">+{{ localize(s.score) }}</span>
                                                        <a v-if="s.link" :href="s.link" @click.stop target="_blank" rel="noopener noreferrer" title="Watch Video" style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; color: #b9a779; text-decoration: none; flex-shrink: 0; transition: opacity 0.2s;" onmouseenter="this.style.opacity=0.75" onmouseleave="this.style.opacity=1">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                                        </a>
                                                        <span v-else style="width: 22px; flex-shrink: 0;"></span>
                                                    </div>
                                                </button>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <!-- PROGRESSED: Strictly hidden when 0 -->
                                <div v-if="entry.progressed && entry.progressed.length > 0">
                                    <div class="section-header" style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.55rem;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                        </svg>
                                        <h3 class="section-title" style="margin: 0; font-family: 'Lexend Deca', sans-serif; font-size: 1.15rem; font-weight: 800; color: #edebe0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.45;">Progressed</h3>
                                    </div>
                                    <table class="completed-list">
                                        <tr v-for="s in entry.progressed" :key="s.level">
                                            <td class="rank"><p class="type-label-lg">#{{ s.rank }}</p></td>
                                            <td class="level">
                                                <button :style="getThumbnailStyle(s.levelId)" @click="goToLevel(s.levelId)">
                                                    <span class="type-label-lg level-name" style="flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left;">{{ s.percent }}% {{ s.level }}</span>
                                                    <div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
                                                        <span class="type-label-lg" style="color: #b9a779 !important; font-weight: 800; font-size: 0.85rem; white-space: nowrap; margin: 0;">+{{ localize(s.score) }}</span>
                                                        <a v-if="s.link" :href="s.link" @click.stop target="_blank" rel="noopener noreferrer" title="Watch Video" style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; color: #b9a779; text-decoration: none; flex-shrink: 0; transition: opacity 0.2s;" onmouseenter="this.style.opacity=0.75" onmouseleave="this.style.opacity=1">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                                                        </a>
                                                        <span v-else style="width: 22px; flex-shrink: 0;"></span>
                                                    </div>
                                                </button>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                <!-- 3. FLOATING MOBILE DOCK (Rankings & Profile) -->
                <div v-if="isMobile && !store.showMobileNav" style="position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: space-around; width: 88%; max-width: 320px; background: rgba(0, 24, 21, 0.96); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1.5px solid rgba(185, 167, 121, 0.4); border-radius: 9999px; padding: 6px 10px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.85); z-index: 9999; box-sizing: border-box;">
                    <button 
                        @click="setMobileTab('board')" 
                        :style="{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                            background: mobileTab === 'board' ? '#b9a779' : 'transparent',
                            color: mobileTab === 'board' ? '#002623' : '#edebe0',
                            border: 'none', borderRadius: '9999px', padding: '6px 0', cursor: 'pointer', fontFamily: 'Lexend Deca, sans-serif', fontSize: '0.72rem', fontWeight: '800'
                        }"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" :stroke="mobileTab === 'board' ? '#002623' : '#edebe0'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        <span>Rankings</span>
                    </button>

                    <button 
                        @click="setMobileTab('profile')" 
                        :style="{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                            background: mobileTab === 'profile' ? '#b9a779' : 'transparent',
                            color: mobileTab === 'profile' ? '#002623' : '#edebe0',
                            border: 'none', borderRadius: '9999px', padding: '6px 0', cursor: 'pointer', fontFamily: 'Lexend Deca, sans-serif', fontSize: '0.72rem', fontWeight: '800'
                        }"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" :stroke="mobileTab === 'profile' ? '#002623' : '#edebe0'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>Profile</span>
                    </button>
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
    beforeUnmount() {
        if (this.checkMobile) {
            window.removeEventListener('resize', this.checkMobile);
        }
    },
    async mounted() {
        const q = this.$route.query;
        if (q.q) this.query = q.q;
        if (q.gov) this.activeGovFilter = q.gov;
        if (q.sort) this.sortBy = q.sort;
        if (q.order) this.sortOrder = q.order;

        this.checkMobile = () => {
            this.isMobile = window.innerWidth <= 1024;
        };
        this.checkMobile();
        window.addEventListener('resize', this.checkMobile);

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
            // Auto-switch directly to Profile view on mobile when clicking a player
            if (this.isMobile) {
                this.mobileTab = 'profile';
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
        getEditorInfo(entry) {
            if (!entry || !this.editors) return null;
            const userName = (entry.user || '').toLowerCase().trim();
            return this.editors.find(e => e.name && e.name.toLowerCase().trim() === userName);
        },
        getEditorRoleIcons(entry) {
            const info = this.getEditorInfo(entry);
            if (!info) return [];
            const roles = info.roles || (info.role ? [info.role] : ['helper']);
            return roles.map(r => {
                const iconName = roleIconMap[r] || 'user-shield';
                return `assets/${iconName}.svg`;
            });
        },
        getEditorRoleTitle(entry) {
            const info = this.getEditorInfo(entry);
            if (!info) return 'Staff';
            return info.tag || (info.role ? info.role.toUpperCase() : 'Staff');
        },
        getHardestLevelName(entry) {
            if (!entry) return 'None';
            const allCompletions = [...(entry.verified || []), ...(entry.completed || [])];
            if (allCompletions.length === 0) return 'None';
            allCompletions.sort((a, b) => a.rank - b.rank);
            return allCompletions[0].level;
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
            if (this.isMobile) {
                this.mobileTab = 'board';
            }
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
            if (this.isMobile) {
                this.mobileTab = 'profile';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },
        setMobileTab(tab) {
            this.mobileTab = tab;
            this.$nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        },
        // --- MOBILE TOUCH SWIPE GESTURES (Rankings ⇄ Profile) ---
        handleTouchStart(e) {
            if (!this.isMobile || !e.touches || !e.touches[0]) return;
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        },
        handleTouchEnd(e) {
            if (!this.isMobile || this.touchStartX === null || !e.changedTouches || !e.changedTouches[0]) return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const diffX = this.touchStartX - touchEndX;
            const diffY = Math.abs(this.touchStartY - touchEndY);

            if (Math.abs(diffX) > 50 && Math.abs(diffX) > diffY * 1.4) {
                if (diffX > 0) {
                    // Swiped right-to-left -> go to Profile
                    if (this.mobileTab === 'board') this.setMobileTab('profile');
                } else {
                    // Swiped left-to-right -> go to Rankings
                    if (this.mobileTab === 'profile') this.setMobileTab('board');
                }
            }
            this.touchStartX = null;
            this.touchStartY = null;
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
            const editorsData = await fetchEditors();
            this.editors = editorsData || [];
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