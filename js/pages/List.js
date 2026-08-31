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
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
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
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: store.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.04)',
                    borderRadius: '8px',
                    border: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    maxHeight: '380px',
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

                <table class="list" v-if="list">
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

            <!-- Center Column: Hero Level Card Detail View -->
            <div class="level-container">
                <div class="level" v-if="level">
                    <!-- Hero Level Card Component -->
                    <div class="hero-level-card" style="position: relative; width: 100%; border-radius: 16px; overflow: hidden; border: 1px solid rgba(185, 167, 121, 0.25); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5); background: #001f1c; color: #ffffff; display: flex; flex-direction: column; padding: 24px; box-sizing: border-box;">
                        <div class="hero-bg" :style="{ backgroundImage: getThumbnailStyle(level) }" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-size: cover; background-position: center; filter: brightness(0.4) contrast(1.1); z-index: 1;"></div>
                        <div class="hero-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(0,38,35,0.4) 0%, rgba(0,26,24,0.92) 100%); z-index: 2;"></div>
                        
                        <div class="hero-content" style="position: relative; z-index: 3; display: flex; flex-direction: column; gap: 12px;">
                            <!-- Top Bar: Title & Larger Rank badge together -->
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.1rem;">
                                <h1 class="hero-title type-label-lg" style="margin: 0; font-size: 2.2rem; font-weight: 800; text-shadow: 0 4px 12px rgba(0, 0, 0, 0.8); color: #ffffff; line-height: 1.1;">
                                    {{ level.name }}
                                </h1>
                                <span class="type-label-lg" style="font-size: 1.5rem; font-weight: 900; color: #b9a779; background: rgba(0,38,35,0.9); padding: 0.4rem 1.1rem; border-radius: 12px; border: 1px solid rgba(185,167,121,0.4); flex-shrink: 0; box-shadow: 0 4px 14px rgba(0,0,0,0.5);">
                                    #{{ selected + 1 }}
                                </span>
                            </div>

                            <!-- Tags directly below the title -->
                            <div v-if="currentAredlTags.length > 0" style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.1rem;">
                                <button 
                                    v-for="tag in currentAredlTags" 
                                    :key="tag" 
                                    @click="selectSingleTag(tag)"
                                    class="type-label-lg" 
                                    :title="'Click to view all ' + tag + ' levels'"
                                    :style="{
                                        background: selectedTags.includes(tag) ? '#b9a779' : 'rgba(5, 25, 23, 0.75)',
                                        border: '1px solid rgba(185, 167, 121, 0.3)',
                                        color: selectedTags.includes(tag) ? '#002623' : '#edebe0',
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(8px)',
                                        transition: 'all 0.2s ease'
                                    }"
                                >
                                    {{ tag }}
                                </button>
                            </div>

                            <!-- Left-stacked Glass Pills for Creators, Verifier, Publisher -->
                            <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
                                <!-- Creators -->
                                <div style="display: flex; align-items: flex-start; gap: 12px; background: rgba(5, 25, 23, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(185, 167, 121, 0.2); padding: 9px 14px; border-radius: 10px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 3px; flex-shrink: 0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; color: rgba(237, 235, 224, 0.6); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 3px;">Creators</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 700; color: #edebe0; line-height: 1.4; word-break: break-word; overflow-wrap: break-word;">{{ formatCreators(level.creators) }}</span>
                                    </div>
                                </div>

                                <!-- Verifier -->
                                <div style="display: flex; align-items: center; gap: 12px; background: rgba(5, 25, 23, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(185, 167, 121, 0.2); padding: 8px 14px; border-radius: 10px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; color: rgba(237, 235, 224, 0.6); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 2px;">Verifier</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 700; color: #edebe0; word-break: break-word; overflow-wrap: break-word;">{{ level.verifier || 'Unknown' }}</span>
                                    </div>
                                </div>

                                <!-- Publisher -->
                                <div style="display: flex; align-items: center; gap: 12px; background: rgba(5, 25, 23, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(185, 167, 121, 0.2); padding: 8px 14px; border-radius: 10px;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; color: rgba(237, 235, 224, 0.6); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 2px;">Publisher</span>
                                        <span class="type-label-lg" style="font-size: 0.95rem; font-weight: 700; color: #edebe0; word-break: break-word; overflow-wrap: break-word;">{{ level.publisher || level.verifier || 'Unknown' }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Floating Stat Pills Row (Points, ID, AREDL Rank) -->
                            <div class="hero-stats-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                                <!-- Points -->
                                <div class="stat-pill" style="display: flex; align-items: center; gap: 12px; background: rgba(0, 20, 18, 0.85); backdrop-filter: blur(16px); padding: 9px 14px; border-radius: 12px; border: 1px solid rgba(185, 167, 121, 0.2);">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(185, 167, 121, 0.25); color: #b9a779; flex-shrink: 0;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; font-weight: 700; color: rgba(237, 235, 224, 0.6); margin-bottom: 3px;">POINTS</span>
                                        <span class="type-label-lg" style="font-size: 1.05rem; font-weight: 800; color: #ffffff; word-break: break-word; overflow-wrap: break-word;">{{ score(selected + 1, 100, level.percentToQualify, list.length) }}</span>
                                    </div>
                                </div>

                                <!-- Level ID -->
                                <div class="stat-pill" @click="copyId(level.id)" style="display: flex; align-items: center; gap: 12px; background: rgba(0, 20, 18, 0.85); backdrop-filter: blur(16px); padding: 9px 14px; border-radius: 12px; border: 1px solid rgba(185, 167, 121, 0.2); cursor: pointer;" title="Click to copy ID">
                                    <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.25); color: #ef4444; flex-shrink: 0;">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    </div>
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; font-weight: 700; color: rgba(237, 235, 224, 0.6); margin-bottom: 3px;">LEVEL ID</span>
                                        <span class="type-label-lg" style="font-size: 1.05rem; font-weight: 800; color: #ffffff; word-break: break-word; overflow-wrap: break-word;">{{ copied ? 'Copied!' : level.id }}</span>
                                    </div>
                                </div>

                                <!-- AREDL Rank -->
                                <div class="stat-pill" style="display: flex; align-items: center; gap: 12px; background: rgba(0, 20, 18, 0.85); backdrop-filter: blur(16px); padding: 9px 14px; border-radius: 12px; border: 1px solid rgba(185, 167, 121, 0.2);">
                                    <img 
                                        src="https://avatars.githubusercontent.com/u/136633743?s=200&v=4" 
                                        alt="AREDL Icon" 
                                        style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;"
                                    />
                                    <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
                                        <span class="type-label-sm" style="font-size: 0.65rem; font-weight: 700; color: rgba(237, 235, 224, 0.6); margin-bottom: 3px;">AREDL RANK</span>
                                        <span class="type-label-lg" style="font-size: 1.05rem; font-weight: 800; color: #ffffff; word-break: break-word; overflow-wrap: break-word;">{{ aredlRanks[level.id] ? '#' + aredlRanks[level.id] : 'N/A' }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Video Showcase Embed with Responsive Aspect Ratio -->
                            <div style="width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid rgba(185, 167, 121, 0.25); position: relative; aspect-ratio: 16 / 9; background: #000;">
                                <iframe class="video" id="videoframe" :src="video" frameborder="0" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block;"></iframe>
                            </div>
                        </div>
                    </div>
                    
                    <h2>Records</h2>
                    <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected + 1 <= 150"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    
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
                                gap: '1rem'
                            }"
                        >
                            <!-- Left: Percent badge -->
                            <div :style="{
                                minWidth: '65px',
                                padding: '0.35rem 0.6rem',
                                background: 'rgba(185, 167, 121, 0.2)',
                                border: '1px solid rgba(185, 167, 121, 0.35)',
                                borderRadius: '8px',
                                textAlign: 'center',
                                flexShrink: 0
                            }">
                                <span class="type-label-lg" style="font-weight: 800; font-size: 0.95rem; color: #b9a779;">{{ record.percent }}%</span>
                            </div>

                            <!-- Middle: User Info with PFP and No Truncation -->
                            <div style="display: flex; align-items: center; gap: 0.85rem; flex: 1; min-width: 0;">
                                <img 
                                    :src="record.pfp || FALLBACK_PFP" 
                                    alt="pfp" 
                                    @error="$event.target.src = FALLBACK_PFP"
                                    :style="{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: store.dark ? '2px solid rgba(255,255,255,0.15)' : '2px solid rgba(0,0,0,0.15)',
                                        flexShrink: 0
                                    }"
                                />
                                <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
                                    <router-link :to="'/leaderboard/' + encodeURIComponent(record.user)" class="type-label-lg link" style="font-weight: 800; font-size: 1rem; text-decoration: none; color: inherit; word-break: break-word; overflow-wrap: break-word;">
                                        {{ record.user }}
                                    </router-link>
                                    <span v-if="record.mobile" class="type-label-sm" style="font-size: 0.7rem; opacity: 0.7; font-weight: 600;">Mobile Player</span>
                                </div>
                            </div>

                            <!-- Right: YouTube Video Link Icon (Wheat Color, No Background Circle) -->
                            <a 
                                :href="record.link" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Watch Completion Video"
                                :style="{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '38px',
                                    height: '38px',
                                    color: '#b9a779',
                                    flexShrink: 0,
                                    transition: 'all 0.2s ease',
                                    textDecoration: 'none'
                                }"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
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

            <!-- Right Column Meta: Editors + Activity Board -->
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    
                    <!-- 1. List Editors Section -->
                    <template v-if="editors">
                        <h3 style="margin-bottom: 0.85rem; color: inherit;">List Editors</h3>
                        <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 1.5rem;">
                            <div 
                                v-for="editor in editors" 
                                :key="editor.name"
                                @mouseenter="hoveredEditor = editor.name"
                                @mouseleave="hoveredEditor = null"
                                :style="{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.85rem',
                                    padding: '0.8rem 1rem',
                                    background: hoveredEditor === editor.name 
                                        ? (store.dark ? 'linear-gradient(135deg, rgba(185, 167, 121, 0.25) 0%, rgba(255, 255, 255, 0.05) 100%)' : 'linear-gradient(135deg, rgba(185, 167, 121, 0.15) 0%, rgba(0, 0, 0, 0.03) 100%)')
                                        : (store.dark ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)' : 'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 100%)'),
                                    border: hoveredEditor === editor.name 
                                        ? '1px solid #b9a779' 
                                        : (store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'),
                                    borderRadius: '12px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transform: hoveredEditor === editor.name ? 'translateY(-3px) scale(1.02)' : 'translateY(0) scale(1)',
                                    boxShadow: hoveredEditor === editor.name ? '0 8px 20px rgba(185, 167, 121, 0.25)' : 'none',
                                    transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                    cursor: 'default'
                                }"
                            >
                                <div 
                                    :style="{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: hoveredEditor === editor.name ? '5px' : '3px',
                                        background: hoveredEditor === editor.name ? '#c0a25c' : '#b9a779',
                                        boxShadow: hoveredEditor === editor.name ? '0 0 12px #c0a25c' : 'none',
                                        transition: 'all 0.25s ease'
                                    }"
                                ></div>

                                <img 
                                    :src="editor.pfp || FALLBACK_PFP" 
                                    alt="pfp" 
                                    @error="$event.target.src = FALLBACK_PFP"
                                    :style="{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: hoveredEditor === editor.name ? '2px solid #c0a25c' : (store.dark ? '2px solid rgba(255,255,255,0.15)' : '2px solid rgba(0,0,0,0.15)'),
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                                        transition: 'all 0.25s ease'
                                    }"
                                />
                                
                                <div style="display: flex; flex-direction: column; flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                                        <template v-if="editor.roles">
                                            <img 
                                                v-for="r in editor.roles" 
                                                :key="r"
                                                :src="'/syrian-demon-list/assets/' + roleIconMap[r] + '.svg'" 
                                                :alt="r" 
                                                :style="{
                                                    width: '16px', 
                                                    height: '16px', 
                                                    filter: store.dark ? 'invert(1)' : 'none'
                                                }"
                                            >
                                        </template>
                                        <template v-else>
                                            <img 
                                                :src="'/syrian-demon-list/assets/' + roleIconMap[editor.role] + '.svg'" 
                                                :alt="editor.role" 
                                                :style="{
                                                    width: '16px', 
                                                    height: '16px', 
                                                    filter: store.dark ? 'invert(1)' : 'none'
                                                }"
                                            >
                                        </template>

                                        <router-link :to="'/leaderboard/' + encodeURIComponent(editor.name)" class="type-label-lg link" style="font-weight: 800; font-size: 1rem; text-decoration: none; color: inherit;">
                                            {{ editor.name }}
                                        </router-link>
                                    </div>
                                    
                                    <span class="type-label-sm" style="font-size: 0.72rem; opacity: 0.8; margin-top: 0.15rem; font-weight: 600; color: inherit;">
                                        {{ editor.tag || editor.role }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- 2. Recent Activity Board Component -->
                    <h3 style="margin-bottom: 0.85rem; font-size: 1.25rem; font-weight: 800; color: inherit;">
                        Recent Activity
                    </h3>

                    <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                        <div 
                            v-for="(act, idx) in activityList" 
                            :key="act.id || idx"
                            :style="{
                                padding: '0.95rem 1.1rem',
                                background: store.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                border: store.dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                                borderRadius: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem'
                            }"
                        >
                            <p class="type-label-lg" style="font-weight: 700; font-size: 0.98rem; line-height: 1.35; margin: 0; color: inherit;">
                                {{ act.message }}
                            </p>
                            <span class="type-label-sm" style="font-size: 0.78rem; opacity: 0.65; font-weight: 500; color: inherit;">
                                {{ formatDate(act.date) }} • by {{ act.author }}
                            </span>
                        </div>

                        <div v-if="activityList.length === 0" style="padding: 1.2rem; text-align: center; opacity: 0.5; font-size: 0.9rem; color: inherit;" class="type-label-lg">
                            No recent updates.
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `,
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
        hoveredEditor: null,
        copied: false,
        errors: [],
        roleIconMap,
        store,
        FALLBACK_PFP
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
        combinedRecords() {
            if (!this.level) return [];
            const jsonRecords = this.level.records || [];
            
            const map = new Map();
            
            jsonRecords.forEach(r => {
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
                const key = `${r.user.trim().toLowerCase()}-${r.percent}`;
                map.set(key, r);
            });

            return Array.from(map.values()).sort((a, b) => b.percent - a.percent);
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
        const q = this.$route.query;
        if (q.q) this.query = q.q;
        if (q.tags) this.selectedTags = q.tags.split(',').filter(Boolean);
        if (q.sort) this.sortBy = q.sort;
        if (q.order) this.sortOrder = q.order;

        const [listData, editorsData, aredlData] = await Promise.all([
            fetchList(),
            fetchEditors(),
            fetchAredlData()
        ]);

        this.list = listData;
        this.editors = editorsData;
        this.aredlRanks = aredlData.ranks;
        this.aredlTagsMap = aredlData.tagsMap;

        let jsonActivity = [];
        try {
            const actRes = await fetch('./data/activity.json');
            if (actRes.ok) {
                jsonActivity = await actRes.json();
            }
        } catch (e) {
            console.warn('GitHub activity.json load skipped.');
        }

        let dbActivity = [];
        try {
            const { data } = await supabase
                .from('activity')
                .select('*')
                .order('date', { ascending: false })
                .limit(10);
            if (data) dbActivity = data;
        } catch (e) {
            console.warn('Supabase activity query failed.');
        }

        this.activityList = [...dbActivity, ...jsonActivity]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

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
                    this.$router.replace({ path: '/' + this.list[0][0].id, query: this.$route.query });
                }
            }
        } else {
            this.selected = 0;
            if (this.list[0]?.[0]) {
                this.$router.replace({ path: '/' + this.list[0][0].id, query: this.$router.query });
            }
        }

        this.loading = false;
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
            const currentLevel = this.list[index]?.[0];
            if (currentLevel) {
                this.$router.push({ path: '/' + currentLevel.id, query: this.$route.query });
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