import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchAredlData } from "../aredl.js";
import { fetchEditors, fetchList } from "../content.js";
import { supabase } from "../supabase.js";

import Spinner from "../components/Spinner.js";

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

const FALLBACK_PFP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23b9a779"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23002623" font-size="40" font-family="sans-serif">?</text></svg>`;

export default {
    components: { Spinner },
    data: () => ({
        list: [],
        editors: [],
        activityList: [],
        approvedDbRecords: [],
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
        store,
        FALLBACK_PFP,
        mobileTab: 'list', // 'list', 'level', or 'meta'
        isMobile: window.innerWidth <= 1200,
        touchStartX: null,
        touchStartY: null
    }),
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main 
            v-else 
            class="page-list" 
            :style="{ paddingBottom: isMobile ? '5.5rem' : '1rem' }"
            @touchstart="handleTouchStart"
            @touchend="handleTouchEnd"
        >
            
            <!-- 1. LEFT COLUMN: LEVEL LIST -->
            <div class="list-container" :class="{ 'mobile-tab-active': !isMobile || mobileTab === 'list' }">
                
                <!-- A. FIXED TOP SEARCH & FILTER (Outside of the slider) -->
                <div class="list-search-wrap">
                    <div class="search-container" style="display: flex; gap: 0.5rem; align-items: center;">
                        <div style="position: relative; flex: 1; display: flex; align-items: center;">
                            <input 
                                type="text" 
                                class="search-bar type-label-lg" 
                                v-model="query" 
                                placeholder="Search levels or creators..." 
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
                            class="type-label-lg"
                            :style="{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.6rem',
                                borderRadius: '8px',
                                border: store.dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)',
                                background: store.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                color: 'inherit',
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
                            <span v-if="selectedTags.length" style="background: #b9a779; color: #002623; padding: 0.1rem 0.35rem; border-radius: 10px; font-size: 0.7rem; font-weight: bold; margin-left: 0.3rem;">{{ selectedTags.length }}</span>
                        </button>
                    </div>

                    <div v-if="showFilterMenu" :style="{
                        margin: '0.5rem 0',
                        padding: '0.75rem',
                        background: store.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.04)',
                        borderRadius: '8px',
                        border: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                        maxHeight: '320px',
                        overflowY: 'auto'
                    }">
                        <div :style="{
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.75rem',
                            paddingBottom: '0.6rem',
                            borderBottom: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                        }">
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span class="type-label-sm" style="opacity: 0.7; color: inherit;">Sort By:</span>
                                <select v-model="sortBy" class="type-label-sm" :style="{
                                    background: store.dark ? '#181818' : '#ffffff',
                                    color: 'inherit',
                                    border: store.dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)',
                                    padding: '0.25rem 0.4rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }">
                                    <option value="list">List Rank</option>
                                    <option value="aredl">AREDL Rank</option>
                                </select>
                            </div>
                            
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span class="type-label-sm" style="opacity: 0.7; color: inherit;">Order:</span>
                                <button 
                                    @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'" 
                                    class="type-label-sm"
                                    :style="{
                                        background: store.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        color: 'inherit',
                                        border: store.dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }"
                                >
                                    {{ sortOrder === 'asc' ? '▲ Ascending' : '▼ Descending' }}
                                </button>
                            </div>
                        </div>

                        <div v-for="(tags, category) in tagCategories" :key="category" style="margin-bottom: 0.6rem;">
                            <div class="type-label-sm" style="opacity: 0.7; font-weight: bold; margin-bottom: 0.25rem; text-transform: uppercase; color: inherit;">{{ category }}</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.3rem;">
                                <button 
                                    v-for="tag in tags" 
                                    :key="tag"
                                    @click="toggleTag(tag)"
                                    class="type-label-sm"
                                    :style="{
                                        padding: '0.2rem 0.45rem',
                                        borderRadius: '4px',
                                        border: selectedTags.includes(tag) ? '1px solid #b9a779' : (store.dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)'),
                                        background: selectedTags.includes(tag) ? '#b9a779' : (store.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                                        color: selectedTags.includes(tag) ? '#002623' : 'inherit',
                                        fontWeight: selectedTags.includes(tag) ? '700' : 'normal',
                                        cursor: 'pointer'
                                    }"
                                >
                                    {{ tag }}
                                </button>
                            </div>
                        </div>
                        <div v-if="selectedTags.length > 0" style="margin-top: 0.5rem; text-align: right;">
                            <button @click="selectedTags = []" class="type-label-sm" style="background: none; border: none; color: #ce1126; cursor: pointer; text-decoration: underline; font-weight: bold;">
                                Reset Tags
                            </button>
                        </div>
                    </div>
                </div>

                <!-- B. SCROLLABLE LEVELS CONTAINER (Scrollbar starts BELOW search bar) -->
                <div class="list-scroll-wrap">
                    <table class="list" v-if="list && list.length">
                        <tr v-for="({ level, err, originalIndex, displayRank }) in filteredList" :key="originalIndex">
                            <td class="rank">
                                <p v-if="displayRank !== null" class="type-label-lg">#{{ displayRank }}</p>
                                <p v-else class="type-label-lg">Legacy</p>
                            </td>
                            <td class="level" :class="{ 'active': selected == originalIndex, 'error': !level }">
                                <button 
                                    @click="selectLevel(originalIndex)"
                                    :style="{
                                        backgroundImage: getThumbnailStyle(level)
                                    }"
                                >
                                    <span class="type-label-lg level-name">{{ level ? level.name : 'Error (' + err + '.json)' }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- 2. CENTER COLUMN: LEVEL DETAIL VIEW -->
            <div class="level-container" :class="{ 'mobile-tab-active': !isMobile || mobileTab === 'level' }" style="width: 100%;">
                <div class="level" v-if="level">
                    <div class="hero-level-card">
                        <div class="hero-bg" :style="{ backgroundImage: getThumbnailStyle(level) }"></div>
                        <div class="hero-overlay"></div>
                        
                        <div class="hero-content">
                            <!-- Title & Rank -->
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                                <h1 class="hero-title type-label-lg" style="margin: 0; font-size: 2.2rem; font-weight: 800; text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8); color: #ffffff; line-height: 1.1; font-family: 'Lexend Deca', sans-serif !important;">
                                    {{ level.name }}
                                </h1>
                                <span class="type-label-lg" style="font-size: 1.5rem; font-weight: 900; color: #b9a779; background: rgba(0,38,35,0.9); padding: 0.4rem 1.1rem; border-radius: 12px; border: 1px solid rgba(185,167,121,0.4); flex-shrink: 0; box-shadow: 0 4px 14px rgba(0,0,0,0.5);">
                                    #{{ selected + 1 }}
                                </span>
                            </div>

                            <!-- Tags -->
                            <div v-if="currentAredlTags.length > 0" style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                                <button 
                                    v-for="tag in currentAredlTags" 
                                    :key="tag" 
                                    @click="selectSingleTag(tag)"
                                    class="type-label-lg" 
                                    :style="{
                                        background: selectedTags.includes(tag) ? '#b9a779' : 'rgba(5, 25, 23, 0.75)',
                                        border: '1px solid rgba(185, 167, 121, 0.3)',
                                        color: selectedTags.includes(tag) ? '#002623' : '#edebe0',
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(8px)'
                                    }"
                                >
                                    {{ tag }}
                                </button>
                            </div>

                            <!-- Creators, Verifier, Publisher -->
                            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                                <div style="display: flex; align-items: flex-start; gap: 12px; background: rgba(5, 25, 23, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(185, 167, 121, 0.2); padding: 9px 14px; border-radius: 10px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 3px; flex-shrink: 0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; color: rgba(237, 235, 224, 0.6); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 3px;">Creators</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 700; color: #edebe0; line-height: 1.4; word-break: break-word;">{{ formatCreators(level.creators) }}</span>
                                    </div>
                                </div>

                                <div style="display: flex; align-items: center; gap: 12px; background: rgba(5, 25, 23, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(185, 167, 121, 0.2); padding: 8px 14px; border-radius: 10px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; color: rgba(237, 235, 224, 0.6); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 2px;">Verifier</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 700; color: #edebe0; word-break: break-word;">{{ level.verifier || 'Unknown' }}</span>
                                    </div>
                                </div>

                                <div style="display: flex; align-items: center; gap: 12px; background: rgba(5, 25, 23, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(185, 167, 121, 0.2); padding: 8px 14px; border-radius: 10px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; color: rgba(237, 235, 224, 0.6); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 2px;">Publisher</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 700; color: #edebe0; word-break: break-word;">{{ level.publisher || level.author || (Array.isArray(level.creators) ? level.creators[0] : level.creators) || 'Unknown' }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Stat Pills (3 Columns: Points, Level ID, AREDL Rank) -->
                            <div class="hero-stats-row">
                                <div class="stat-pill">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(185, 167, 121, 0.25); color: #b9a779; flex-shrink: 0;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.62rem; font-weight: 700; color: rgba(237, 235, 224, 0.6); margin-bottom: 2px;">POINTS</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 800; color: #ffffff;">{{ score(selected + 1, 100, level ? level.percentToQualify : 100, (list && list.length) || 1) }}</span>
                                    </div>
                                </div>

                                <div class="stat-pill copy-id-pill" @click="copyId(level.id)" style="cursor: pointer;" title="Click to copy ID">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.25); color: #ef4444; flex-shrink: 0;">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; justify-content: center; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.62rem; font-weight: 700; color: rgba(237, 235, 224, 0.6); margin-bottom: 2px; display: block; line-height: 1.2;">LEVEL ID</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 800; color: #ffffff; white-space: nowrap; overflow: visible; display: block; line-height: 1.4;">{{ copied ? 'Copied!' : level.id }}</span>
                                    </div>
                                </div>

                                <a 
                                    :href="'https://aredl.net/list/' + level.id"
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    class="stat-pill aredl-pill-link" 
                                    title="View this level on AREDL"
                                    style="text-decoration: none; cursor: pointer;"
                                >
                                    <img 
                                        src="https://avatars.githubusercontent.com/u/136633743?s=200&v=4" 
                                        alt="AREDL Icon" 
                                        style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;"
                                    />
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <div style="display: flex; align-items: center; justify-content: space-between;">
                                            <span class="type-label-sm" style="font-size: 0.62rem; font-weight: 700; color: rgba(237, 235, 224, 0.6); margin-bottom: 2px;">AREDL RANK</span>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85;">
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                <polyline points="15 3 21 3 21 9"></polyline>
                                                <line x1="10" y1="14" x2="21" y2="3"></line>
                                            </svg>
                                        </div>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 800; color: #ffffff;">{{ aredlRanks[level.id] ? '#' + aredlRanks[level.id] : 'N/A' }}</span>
                                    </div>
                                </a>
                            </div>

                            <!-- Showcase Video Embed -->
                            <div style="width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid rgba(185, 167, 121, 0.25); position: relative; aspect-ratio: 16 / 9; background: #000;">
                                <iframe 
                                    class="video" 
                                    id="videoframe" 
                                    :src="video" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                    allowfullscreen="true"
                                    webkitallowfullscreen="true"
                                    mozallowfullscreen="true"
                                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block;"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Modern Section Header for Records -->
                    <div class="section-header" style="margin-top: 1.5rem; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.6rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="8" r="7"></circle>
                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                        </svg>
                        <h3 class="section-title" style="margin: 0; font-family: 'Lexend Deca', sans-serif; font-size: 1.25rem; font-weight: 800; color: #edebe0; text-transform: uppercase; letter-spacing: 0.5px;">Records</h3>
                    </div>
                    <p style="margin: 0 0 1rem 0; font-size: 0.9rem; opacity: 0.8; line-height: 1.4;" v-if="selected + 1 <= 75"><strong>{{ level ? level.percentToQualify : 100 }}%</strong> or better to qualify</p>
                    <p style="margin: 0 0 1rem 0; font-size: 0.9rem; opacity: 0.8; line-height: 1.4;" v-else-if="selected + 1 <= 150"><strong>100%</strong> or better to qualify</p>
                    <p style="margin: 0 0 1rem 0; font-size: 0.9rem; opacity: 0.8; line-height: 1.4;" v-else>This level does not accept new records.</p>
                    
                    <!-- Records List -->
                    <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: 1rem;">
                        <div 
                            v-for="record in combinedRecords" 
                            :key="record.link"
                            :style="{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.8rem 1rem',
                                background: store.dark ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)' : 'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 100%)',
                                border: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: '12px',
                                gap: '0.75rem'
                            }"
                        >
                            <div :style="{
                                minWidth: '58px',
                                padding: '0.35rem 0.5rem',
                                background: 'rgba(185, 167, 121, 0.2)',
                                border: '1px solid rgba(185, 167, 121, 0.35)',
                                borderRadius: '8px',
                                textAlign: 'center',
                                flexShrink: 0
                            }">
                                <span class="type-label-lg" style="font-weight: 800; font-size: 0.95rem; color: #b9a779;">{{ record.percent }}%</span>
                            </div>

                            <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0;">
                                <img 
                                    :src="record.pfp || FALLBACK_PFP" 
                                    alt="pfp" 
                                    @error="$event.target.src = FALLBACK_PFP"
                                    :style="{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: store.dark ? '2px solid rgba(255,255,255,0.15)' : '2px solid rgba(0,0,0,0.15)',
                                        flexShrink: 0
                                    }"
                                />
                                <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                                    <router-link :to="'/leaderboard/' + encodeURIComponent(record.user)" class="type-label-lg link" style="font-weight: 800; font-size: 0.95rem; text-decoration: none; color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        {{ record.user }}
                                    </router-link>
                                    <span v-if="record.mobile" class="type-label-sm" style="font-size: 0.7rem; opacity: 0.7; font-weight: 600;">Mobile Player</span>
                                </div>
                            </div>

                            <a 
                                :href="record.link" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Watch Completion Video"
                                style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; color: #b9a779; flex-shrink: 0; text-decoration: none;"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            </a>
                        </div>

                        <div v-if="combinedRecords.length === 0" style="padding: 1.2rem; text-align: center; opacity: 0.5; font-size: 0.9rem;" class="type-label-lg">
                            No records submitted yet.
                        </div>
                    </div>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>

            <!-- 3. RIGHT COLUMN: EDITORS + CHANGELOG -->
            <div class="meta-container" :class="{ 'mobile-tab-active': !isMobile || mobileTab === 'meta' }">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    
                    <!-- List Editors Section -->
                    <div class="editors-section" v-if="groupedEditors.length > 0">
                        <div class="section-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <h3 class="section-title">List Editors</h3>
                        </div>

                        <div v-for="group in groupedEditors" :key="group.title" class="editor-group">
                            <span class="editor-group-label">{{ group.title }}</span>
                            <div class="editors-grid">
                                <router-link 
                                    v-for="editor in group.editors" 
                                    :key="editor.name"
                                    :to="'/leaderboard/' + encodeURIComponent(editor.name)"
                                    class="editor-card"
                                >
                                    <div class="editor-avatar-wrap" :class="getPrimaryRole(editor)">
                                        <img 
                                            :src="editor.pfp || FALLBACK_PFP" 
                                            alt="pfp" 
                                            @error="$event.target.src = FALLBACK_PFP"
                                            class="avatar editor-avatar"
                                        />
                                    </div>
                                    <div class="editor-info">
                                        <div class="editor-name-row">
                                            <span class="editor-name">{{ editor.name }}</span>
                                            <div class="editor-icons">
                                                <template v-if="editor.roles">
                                                    <img 
                                                        v-for="r in editor.roles" 
                                                        :key="r"
                                                        :src="'/syrian-demon-list/assets/' + roleIconMap[r] + '.svg'" 
                                                        :alt="r" 
                                                        class="role-badge-icon"
                                                    >
                                                </template>
                                                <template v-else-if="editor.role">
                                                    <img 
                                                        :src="'/syrian-demon-list/assets/' + roleIconMap[editor.role] + '.svg'" 
                                                        :alt="editor.role" 
                                                        class="role-badge-icon"
                                                    >
                                                </template>
                                            </div>
                                        </div>
                                        <span class="editor-tag">{{ editor.tag || editor.role }}</span>
                                    </div>
                                </router-link>
                            </div>
                        </div>
                    </div>

                    <!-- Changelog Section -->
                    <div class="changelog-section">
                        <div class="section-header">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <h3 class="section-title">Changelog</h3>
                        </div>

                        <div class="changelog-timeline-container">
                            <div v-for="day in groupedActivity" :key="day.date" class="changelog-day-group">
                                <div class="changelog-date-badge">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <span>{{ day.date }}</span>
                                </div>

                                <div class="changelog-items">
                                    <div 
                                        v-for="(item, idx) in day.items" 
                                        :key="item.id || idx" 
                                        class="changelog-item"
                                        :class="'type-' + item.type"
                                    >
                                        <div class="cl-dot"></div>
                                        <div class="cl-body">
                                            <div class="cl-header-line">
                                                <span class="cl-badge" :class="'badge-' + item.type">{{ item.badgeText }}</span>
                                                <span v-if="item.time" class="cl-time">{{ item.time }}</span>
                                            </div>

                                            <div class="cl-message">
                                                <!-- PLACED -->
                                                <template v-if="item.type === 'placed'">
                                                    <router-link 
                                                        :to="'/' + (item.levelId || item.levelName)" 
                                                        @click="selectLevelById(item.levelId || item.levelName)" 
                                                        class="cl-level-link"
                                                    >
                                                        {{ item.levelName }}
                                                    </router-link>
                                                    <template v-if="item.position">
                                                        was placed at <span class="cl-rank">#{{ item.position }}</span>
                                                    </template>
                                                    <template v-else>
                                                        was placed on the list
                                                    </template>
                                                    <span v-if="item.easier || item.harder">, </span>
                                                    <template v-if="item.easier">
                                                        above <router-link :to="'/' + (item.easierId || item.easier)" @click="selectLevelById(item.easierId || item.easier)" class="cl-level-sublink">{{ item.easier }}</router-link>
                                                    </template>
                                                    <template v-if="item.easier && item.harder"> and </template>
                                                    <template v-if="item.harder">
                                                        below <router-link :to="'/' + (item.harderId || item.harder)" @click="selectLevelById(item.harderId || item.harder)" class="cl-level-sublink">{{ item.harder }}</router-link>
                                                    </template>
                                                </template>

                                                <!-- RAISED -->
                                                <template v-else-if="item.type === 'raised'">
                                                    <router-link 
                                                        :to="'/' + (item.levelId || item.levelName)" 
                                                        @click="selectLevelById(item.levelId || item.levelName)" 
                                                        class="cl-level-link"
                                                    >
                                                        {{ item.levelName }}
                                                    </router-link>
                                                    was raised <span v-if="item.oldPosition">from <span class="cl-rank">#{{ item.oldPosition }}</span> </span>to <span class="cl-rank">#{{ item.position }}</span><span v-if="item.easier || item.harder">, </span>
                                                    <template v-if="item.easier">
                                                        above <router-link :to="'/' + (item.easierId || item.easier)" @click="selectLevelById(item.easierId || item.easier)" class="cl-level-sublink">{{ item.easier }}</router-link>
                                                    </template>
                                                    <template v-if="item.easier && item.harder"> and </template>
                                                    <template v-if="item.harder">
                                                        below <router-link :to="'/' + (item.harderId || item.harder)" @click="selectLevelById(item.harderId || item.harder)" class="cl-level-sublink">{{ item.harder }}</router-link>
                                                    </template>
                                                </template>

                                                <!-- LOWERED -->
                                                <template v-else-if="item.type === 'lowered'">
                                                    <router-link 
                                                        :to="'/' + (item.levelId || item.levelName)" 
                                                        @click="selectLevelById(item.levelId || item.levelName)" 
                                                        class="cl-level-link"
                                                    >
                                                        {{ item.levelName }}
                                                    </router-link>
                                                    was lowered <span v-if="item.oldPosition">from <span class="cl-rank">#{{ item.oldPosition }}</span> </span>to <span class="cl-rank">#{{ item.position }}</span><span v-if="item.easier || item.harder">, </span>
                                                    <template v-if="item.easier">
                                                        above <router-link :to="'/' + (item.easierId || item.easier)" @click="selectLevelById(item.easierId || item.easier)" class="cl-level-sublink">{{ item.easier }}</router-link>
                                                    </template>
                                                    <template v-if="item.easier && item.harder"> and </template>
                                                    <template v-if="item.harder">
                                                        below <router-link :to="'/' + (item.harderId || item.harder)" @click="selectLevelById(item.harderId || item.harder)" class="cl-level-sublink">{{ item.harder }}</router-link>
                                                    </template>
                                                </template>

                                                <!-- REMOVED -->
                                                <template v-else-if="item.type === 'removed'">
                                                    <span class="cl-level-link">{{ item.levelName }}</span> has been removed from the list
                                                </template>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div v-if="groupedActivity.length === 0" class="changelog-empty">
                                No list ranking changes recorded yet.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. FLOATING BOTTOM DOCK (Locked to 54px max height) -->
            <div v-if="isMobile && !store.showMobileNav" style="position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: space-around; width: 92%; max-width: 380px; height: auto !important; max-height: 54px !important; background: rgba(0, 24, 21, 0.96); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1.5px solid rgba(185, 167, 121, 0.4); border-radius: 9999px; padding: 6px 10px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.85); z-index: 9999; box-sizing: border-box;">
                <button 
                    @click="setMobileTab('list')" 
                    :style="{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        background: mobileTab === 'list' ? '#b9a779' : 'transparent',
                        color: mobileTab === 'list' ? '#002623' : '#edebe0',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '6px 0',
                        cursor: 'pointer',
                        fontFamily: 'Lexend Deca, sans-serif',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        transition: 'all 0.2s'
                    }"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" :stroke="mobileTab === 'list' ? '#002623' : '#edebe0'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    <span>List</span>
                </button>

                <button 
                    @click="setMobileTab('level')" 
                    :style="{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        background: mobileTab === 'level' ? '#b9a779' : 'transparent',
                        color: mobileTab === 'level' ? '#002623' : '#edebe0',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '6px 0',
                        cursor: 'pointer',
                        fontFamily: 'Lexend Deca, sans-serif',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        transition: 'all 0.2s'
                    }"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" :stroke="mobileTab === 'level' ? '#002623' : '#edebe0'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <span>Level</span>
                </button>

                <button 
                    @click="setMobileTab('meta')" 
                    :style="{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        background: mobileTab === 'meta' ? '#b9a779' : 'transparent',
                        color: mobileTab === 'meta' ? '#002623' : '#edebe0',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '6px 0',
                        cursor: 'pointer',
                        fontFamily: 'Lexend Deca, sans-serif',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        transition: 'all 0.2s'
                    }"
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" :stroke="mobileTab === 'meta' ? '#002623' : '#edebe0'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span>Updates</span>
                </button>
            </div>
        </main>
    `,
    computed: {
        level() {
            return this.list?.[this.selected]?.[0] || null;
        },
        selectedLevelId() {
            return this.level?.id || null;
        },
        currentAredlTags() {
            if (!this.selectedLevelId) return [];
            return this.aredlTagsMap?.[this.selectedLevelId] || [];
        },
        combinedRecords() {
            if (!this.level) return [];
            const jsonRecords = this.level.records || [];
            
            const map = new Map();
            
            jsonRecords.forEach(r => {
                if (!r || !r.user) return;
                const key = `${r.user.trim().toLowerCase()}-${r.percent}`;
                map.set(key, {
                    user: r.user,
                    pfp: r.pfp || FALLBACK_PFP,
                    percent: r.percent,
                    link: r.link,
                    mobile: r.mobile || false
                });
            });

            this.approvedDbRecords.forEach(r => {
                if (!r || !r.user) return;
                const key = `${r.user.trim().toLowerCase()}-${r.percent}`;
                map.set(key, r);
            });

            return Array.from(map.values()).sort((a, b) => b.percent - a.percent);
        },
        video() {
            if (!this.level) return '';
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }
            return embed(this.level.verification);
        },
        filteredList() {
            if (!Array.isArray(this.list)) return [];
            
            let mappedList = this.list.map(([level, err], i) => ({
                level,
                err,
                originalIndex: i
            }));

            if (this.selectedTags.length > 0) {
                mappedList = mappedList.filter(({ level }) => {
                    if (!level?.id) return false;
                    const levelTags = this.aredlTagsMap?.[level.id] || [];
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
        },
        groupedEditors() {
            if (!Array.isArray(this.editors) || !this.editors.length) return [];

            const isLeaderOrDev = (e) => {
                const roles = e.roles || (e.role ? [e.role] : []);
                return roles.some(r => ['owner', 'admin', 'dev'].includes(r.toLowerCase()));
            };

            const leaders = [];
            const staff = [];

            this.editors.forEach(e => {
                if (isLeaderOrDev(e)) {
                    leaders.push(e);
                } else {
                    staff.push(e);
                }
            });

            const groups = [];
            if (leaders.length > 0) {
                groups.push({ title: 'Leaders & Developers', editors: leaders });
            }
            if (staff.length > 0) {
                groups.push({ title: 'List Helpers & Staff', editors: staff });
            }

            return groups;
        },
        groupedActivity() {
            if (!Array.isArray(this.activityList) || !this.activityList.length) return [];

            const groups = {};

            this.activityList.forEach((act, index) => {
                const parsed = this.parseListChangelog(act);
                if (!parsed) return;

                parsed.id = act.id || `act-${index}`;

                let dateKey = 'Recent';
                let timeStr = '';

                if (act.date) {
                    const d = new Date(act.date);
                    if (!isNaN(d.getTime())) {
                        dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                }

                parsed.time = timeStr;

                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(parsed);
            });

            return Object.entries(groups).map(([date, items]) => ({ date, items }));
        },
    },
    watch: {
        level: {
            immediate: true,
            async handler(newLvl) {
                if (newLvl && newLvl.name) {
                    const rank = this.selected + 1;
                    document.title = `#${rank} - ${newLvl.name}`;
                    await this.fetchApprovedRecordsForLevel(newLvl.id || newLvl.name);
                } else {
                    document.title = 'Syrian Demon List';
                    this.approvedDbRecords = [];
                }
            }
        },
        query() { this.updateQueryParams(); },
        selectedTags: { deep: true, handler() { this.updateQueryParams(); } },
        sortBy() { this.updateQueryParams(); },
        sortOrder() { this.updateQueryParams(); }
    },
    async mounted() {
        this.checkMobile = () => {
            this.isMobile = window.innerWidth <= 1200;
        };
        this.checkMobile();
        window.addEventListener('resize', this.checkMobile);

        const q = this.$route.query;
        if (q.q) this.query = q.q;
        if (q.tags) this.selectedTags = q.tags.split(',').filter(Boolean);
        if (q.sort) this.sortBy = q.sort;
        if (q.order) this.sortOrder = q.order;

        try {
            const [listData, editorsData, aredlData] = await Promise.all([
                fetchList().catch(() => []),
                fetchEditors().catch(() => []),
                fetchAredlData().catch(() => ({ ranks: {}, tagsMap: {} }))
            ]);

            this.list = Array.isArray(listData) ? listData : [];
            this.editors = Array.isArray(editorsData) ? editorsData : [];
            this.aredlRanks = aredlData?.ranks || {};
            this.aredlTagsMap = aredlData?.tagsMap || {};
        } catch (e) {
            console.error("Initialization error:", e);
            this.list = [];
            this.editors = [];
        }

        let jsonActivity = [];
        try {
            const actRes = await fetch('./data/activity.json');
            if (actRes.ok) {
                jsonActivity = await actRes.json();
            }
        } catch (e) {}

        let dbActivity = [];
        try {
            const { data } = await supabase
                .from('activity')
                .select('*')
                .order('date', { ascending: false })
                .limit(100);
            if (data) dbActivity = data;
        } catch (e) {}

        const merged = [
            ...(Array.isArray(dbActivity) ? dbActivity : []),
            ...(Array.isArray(jsonActivity) ? jsonActivity : [])
        ]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 100);

        this.activityList = merged;

        const param = this.$route.params.level;

        if (param && this.list && this.list.length > 0) {
            const foundIndex = this.list.findIndex(([lvl]) => 
                lvl && (lvl.id?.toString() === param || lvl.name?.toLowerCase() === param.toLowerCase())
            );
            if (foundIndex !== -1) {
                this.selected = foundIndex;
            } else {
                this.selected = 0;
                if (this.list[0]?.[0]) {
                    this.$router.replace({ path: '/' + this.list[0][0].id, query: this.$route.query });
                }
            }
            if (this.isMobile) {
                this.mobileTab = 'level';
            }
        } else if (this.list && this.list.length > 0) {
            this.selected = 0;
            if (this.list[0]?.[0]) {
                this.$router.replace({ path: '/' + this.list[0][0].id, query: this.$router.query });
            }
        }

        this.loading = false;
    },
    beforeUnmount() {
        if (this.checkMobile) {
            window.removeEventListener('resize', this.checkMobile);
        }
    },
    methods: {
        embed,
        score,
        formatCreators(creators) {
            if (!creators) return 'Unknown';
            if (Array.isArray(creators)) return creators.join(', ');
            return creators;
        },
        getThumbnailStyle(level) {
            if (!level) return 'none';
            const id = typeof level === 'object' ? level.id : level;
            if (!id) return 'none';
            return `url('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${id}.webp')`;
        },
        formatDate(dateStr) {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        },
        findLevelObject(nameOrId) {
            if (!nameOrId || !Array.isArray(this.list)) return null;
            const needle = nameOrId.toString().trim().toLowerCase();
            const found = this.list.find(([lvl]) => {
                if (!lvl) return false;
                return lvl.name?.toLowerCase() === needle || 
                       lvl.id?.toString() === needle;
            });
            return found ? found[0] : null;
        },
        getLevelRankAndNeighbors(levelObj) {
            if (!levelObj || !Array.isArray(this.list)) return { position: null, easier: null, harder: null };
            const idx = this.list.findIndex(([l]) => l && (l.id === levelObj.id || l.name === levelObj.name));
            if (idx === -1) return { position: null, easier: null, harder: null };
            
            const position = idx + 1;
            const harderObj = idx > 0 ? this.list[idx - 1]?.[0] : null;
            const easierObj = idx < this.list.length - 1 ? this.list[idx + 1]?.[0] : null;
            
            return {
                position,
                harder: harderObj?.name || null,
                harderId: harderObj?.id || null,
                easier: easierObj?.name || null,
                easierId: easierObj?.id || null
            };
        },
        parseListChangelog(act) {
            if (act.type && act.levelName) {
                return {
                    type: act.type,
                    badgeText: act.type.toUpperCase(),
                    levelName: act.levelName,
                    levelId: act.levelId,
                    position: act.position,
                    oldPosition: act.oldPosition || null,
                    easier: act.easier || null,
                    easierId: act.easierId || null,
                    harder: act.harder || null,
                    harderId: act.harderId || null
                };
            }

            let msg = (act.message || '').trim();
            if (!msg) return null;

            if (msg.includes('completed') || msg.includes('details were updated') || /^[a-zA-Z0-9_]+\s+details/i.test(msg)) {
                return null;
            }

            msg = msg.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim();

            let type = null;
            let badgeText = 'PLACED';

            if (/\[?RAISED\]?|has been raised|was raised/i.test(msg)) {
                type = 'raised';
                badgeText = 'RAISED';
            } else if (/\[?LOWERED\]?|\[?DEMOTED\]?|has been lowered|was lowered|has been demoted|was demoted/i.test(msg)) {
                type = 'lowered';
                badgeText = 'LOWERED';
            } else if (/\[?REMOVED\]?|has been removed|was removed/i.test(msg)) {
                type = 'removed';
                badgeText = 'REMOVED';
            } else if (/\[?PLACED\]?|has been placed|was placed|placed\s+|added\s+/i.test(msg)) {
                type = 'placed';
                badgeText = 'PLACED';
            } else {
                return null;
            }

            msg = msg.replace(/^\[(PLACED|RAISED|LOWERED|DEMOTED|REMOVED|MOVED)\]\s*/i, '').trim();

            let levelName = '';
            let rawTail = '';

            const splitMatch = msg.match(/^(.*?)\s+(?:has been|was|placed|added)\s+(placed|raised|lowered|demoted|removed|moved|to|at)?(.*)$/i);
            if (splitMatch) {
                levelName = splitMatch[1].replace(/^(added|placed)\s+/i, '').trim();
                rawTail = splitMatch[3] || '';
            } else {
                return null;
            }

            rawTail = rawTail.replace(/\s*\([^)]*First Victor:[^)]*\)/i, '').trim();

            const levelObj = this.findLevelObject(levelName);
            const levelId = levelObj?.id || null;
            const defaultPos = this.getLevelRankAndNeighbors(levelObj);

            let position = defaultPos.position;
            let oldPosition = null;
            let easier = defaultPos.easier;
            let easierId = defaultPos.easierId;
            let harder = defaultPos.harder;
            let harderId = defaultPos.harderId;

            const fromToMatch = rawTail.match(/from\s+#?(\d+)\s+to\s+#?(\d+)/i);
            if (fromToMatch) {
                oldPosition = fromToMatch[1];
                position = fromToMatch[2];
            } else {
                const atMatch = rawTail.match(/(?:at|to)\s+#?(\d+)/i);
                if (atMatch) {
                    position = atMatch[1];
                }
            }

            const aboveMatch = rawTail.match(/above\s+([A-Za-z0-9_\- ()\.]+?)(?:\s+and\s+below|\s*$)/i);
            if (aboveMatch) {
                easier = aboveMatch[1].trim();
                const obj = this.findLevelObject(easier);
                easierId = obj?.id || null;
                if (obj?.name) easier = obj.name;
            }

            const belowMatch = rawTail.match(/below\s+([A-Za-z0-9_\- ()\.]+?)(?:\s*$)/i);
            if (belowMatch) {
                harder = belowMatch[1].trim();
                const obj = this.findLevelObject(harder);
                harderId = obj?.id || null;
                if (obj?.name) harder = obj.name;
            }

            return {
                type,
                badgeText,
                levelName: levelObj?.name || levelName,
                levelId,
                position,
                oldPosition,
                easier,
                easierId,
                harder,
                harderId
            };
        },
        selectLevelById(levelIdOrName) {
            if (!levelIdOrName || !Array.isArray(this.list)) return;
            const target = levelIdOrName.toString().trim().toLowerCase();
            const idx = this.list.findIndex(([lvl]) => 
                lvl && (lvl.id?.toString() === target || lvl.name?.toLowerCase() === target)
            );
            if (idx !== -1) {
                this.selectLevel(idx);
            }
        },
        async fetchApprovedRecordsForLevel(levelId) {
            if (!levelId) return;
            
            const { data: dbProfiles } = await supabase
                .from('profiles')
                .select('*');

            const profileMap = new Map();
            if (dbProfiles) {
                dbProfiles.forEach(p => {
                    if (p.username) {
                        const profileImageUrl = p.pfp_url || p.pfp || p.avatar_url || FALLBACK_PFP;
                        profileMap.set(p.id, { username: p.username, pfp: profileImageUrl });
                        profileMap.set(p.username.trim().toLowerCase(), { username: p.username, pfp: profileImageUrl });
                    }
                });
            }

            const { data, error } = await supabase
                .from('submissions')
                .select('percent, video_link, notes, user_id')
                .eq('level_id', levelId.toString())
                .eq('status', 'approved');

            let dbRecords = [];
            if (!error && data && data.length > 0) {
                dbRecords = data.map(sub => {
                    const prof = profileMap.get(sub.user_id) || {};
                    const username = prof.username || 'Player';
                    return {
                        user: username,
                        pfp: prof.pfp || FALLBACK_PFP,
                        percent: sub.percent,
                        link: sub.video_link,
                        mobile: sub.notes?.toLowerCase().includes('mobile') || false
                    };
                });
            }

            const jsonRecs = (this.level?.records || []).map(r => {
                const prof = profileMap.get(r.user?.trim().toLowerCase()) || {};
                return {
                    user: r.user,
                    pfp: prof.pfp || r.pfp || FALLBACK_PFP,
                    percent: r.percent,
                    link: r.link,
                    mobile: r.mobile || false
                };
            });

            this.approvedDbRecords = [...jsonRecs, ...dbRecords];
        },
        updateQueryParams() {
            const query = { ...this.$route.query };

            if (this.query.trim()) query.q = this.query.trim();
            else delete query.q;

            if (this.selectedTags.length > 0) query.tags = this.selectedTags.join(',');
            else delete query.tags;

            if (this.sortBy !== 'list') query.sort = this.sortBy;
            else delete query.sort;

            if (this.sortOrder !== 'asc') query.order = this.sortOrder;
            else delete query.order;

            this.$router.replace({ query }).catch(() => {});
        },
        toggleTag(tag) {
            if (this.selectedTags.includes(tag)) {
                this.selectedTags = this.selectedTags.filter(t => t !== tag);
            } else {
                this.selectedTags.push(tag);
            }
        },
        selectSingleTag(tag) {
            this.selectedTags = [tag];
        },
        selectLevel(index) {
            this.selected = index;
            const currentLevel = this.list?.[index]?.[0];
            if (currentLevel) {
                this.$router.push({ path: '/' + currentLevel.id, query: this.$route.query });
            }
            if (this.isMobile) {
                this.mobileTab = 'level';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },
        copyId(id) {
            navigator.clipboard.writeText(id.toString());
            this.copied = true;
            setTimeout(() => {
                this.copied = false;
            }, 1500);
        },
        getPrimaryRole(editor) {
            const roles = editor.roles || (editor.role ? [editor.role] : []);
            if (roles.includes('owner')) return 'role-owner';
            if (roles.includes('dev')) return 'role-dev';
            if (roles.includes('admin')) return 'role-admin';
            return 'role-helper';
        },
        setMobileTab(tab) {
            this.mobileTab = tab;
            this.$nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        },
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
                    if (this.mobileTab === 'list') this.setMobileTab('level');
                    else if (this.mobileTab === 'level') this.setMobileTab('meta');
                } else {
                    if (this.mobileTab === 'meta') this.setMobileTab('level');
                    else if (this.mobileTab === 'level') this.setMobileTab('list');
                }
            }
            this.touchStartX = null;
            this.touchStartY = null;
        },
    },
};