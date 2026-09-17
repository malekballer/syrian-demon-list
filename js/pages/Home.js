import { fetchList, fetchLeaderboard, fetchEditors } from '../content.js';
import { localize } from '../util.js';
import { score } from '../score.js';
import { supabase } from '../supabase.js';
import Spinner from '../components/Spinner.js';

const FALLBACK_PFP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23b9a779"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23002623" font-size="40" font-family="sans-serif">?</text></svg>`;

export default {
    components: {
        Spinner,
    },
    data: () => ({
        loading: true,
        list: [],
        top5Players: [],
        demonRankIndex: 0,
        playerRankIndex: 0,
        demonTimer: null,
        playerTimer: null,
        totalRecords: 0,
        totalPlayers: 0,
        activityList: [],
        fallbackPfp: FALLBACK_PFP
    }),
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <div v-else class="home-page-wrapper" style="width: 100%; min-height: calc(100vh - 90px); display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; margin: 0; padding: 0;">
            
            <!-- MAIN CONTENT CONTAINER -->
            <div style="max-width: 1400px; width: 100%; margin: 0 auto; padding: 2.5rem 1.5rem; display: flex; flex-direction: column; gap: 2rem; box-sizing: border-box;">
                
                <!-- HERO SECTION -->
                <div style="position: relative; background: linear-gradient(135deg, rgba(0,38,35,0.95) 0%, rgba(0,20,18,0.9) 100%); border: 1px solid rgba(185,167,121,0.3); border-radius: 20px; padding: 3rem; display: flex; justify-content: space-between; align-items: center; gap: 2rem; box-shadow: 0 16px 40px rgba(0,0,0,0.6); overflow: hidden;">
                    <div style="position: absolute; top: 0; right: 0; bottom: 0; width: 50%; opacity: 0.12; background: url('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/1.webp') center/cover; pointer-events: none;"></div>
                    
                    <div style="position: relative; z-index: 2; max-width: 720px; display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem;">
                            <span style="background: #b9a779; color: #002623; padding: 5px 12px; border-radius: 6px; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; font-family: 'Lexend Deca', sans-serif;">Official Syrian Community List</span>
                            <h1 style="font-family: 'Hayyakum Allah', 'Lexend Deca', sans-serif; font-size: 3.5rem; font-weight: normal; margin: 0; line-height: 1.15; color: #edebe0;">
                                The Home of <span style="color: #b9a779;">Syrian Demons</span>
                            </h1>
                        </div>
                        <p style="font-family: 'Lexend Deca', sans-serif; font-size: 1.1rem; opacity: 0.85; line-height: 1.6; margin: 0; color: #edebe0;">
                            Explore verified Extreme Demons across Syrian governorates, track player rankings, compete on the national leaderboards, and submit your records.
                        </p>

                        <!-- Unified CTA Action Buttons -->
                        <div style="display: flex; gap: 0.85rem; flex-wrap: wrap; margin-top: 0.5rem; align-items: center;">
                            <router-link to="/list" class="syrian-cta" style="padding: 0.75rem 1.8rem; border-radius: 10px; text-decoration: none; font-size: 0.95rem; font-weight: 800; font-family: 'Lexend Deca', sans-serif; display: inline-flex; align-items: center; justify-content: center; height: 44px; box-sizing: border-box;">
                                View Demon List
                            </router-link>
                            <router-link to="/leaderboard" style="padding: 0.75rem 1.8rem; border-radius: 10px; text-decoration: none; background: rgba(255,255,255,0.08); border: 1px solid rgba(185,167,121,0.3); color: #edebe0; font-weight: 800; font-size: 0.95rem; font-family: 'Lexend Deca', sans-serif; display: inline-flex; align-items: center; justify-content: center; height: 44px; box-sizing: border-box; transition: background 0.2s, border-color 0.2s;" onmouseenter="this.style.background='rgba(185,167,121,0.15)'; this.style.borderColor='#b9a779';" onmouseleave="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(185,167,121,0.3)';">
                                Leaderboard
                            </router-link>
                            <button @click="rollRandomDemon" title="Roll a random demon!" style="padding: 0.75rem 1.8rem; border-radius: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(185,167,121,0.3); color: #edebe0; font-weight: 800; font-size: 0.95rem; font-family: 'Lexend Deca', sans-serif; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; height: 44px; box-sizing: border-box; transition: background 0.2s, border-color 0.2s;" onmouseenter="this.style.background='rgba(185,167,121,0.15)'; this.style.borderColor='#b9a779';" onmouseleave="this.style.background='rgba(255,255,255,0.08)'; this.style.borderColor='rgba(185,167,121,0.3)';">
                                Random Demon
                            </button>
                        </div>
                    </div>

                    <!-- Logo -->
                    <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
                        <img src="./list_icon.png" alt="Syrian List Logo" style="width: 200px; height: 200px; object-fit: contain; filter: drop-shadow(0 12px 24px rgba(0,0,0,0.6));" />
                    </div>
                </div>

                <!-- CARDS ROW: Platform Stats + Demon Carousel + Player Carousel -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                    
                    <!-- 1. Platform Statistics Box -->
                    <div style="background: rgba(0,20,18,0.85); border: 1px solid rgba(185,167,121,0.25); border-radius: 18px; padding: 2.2rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                        <h3 style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 1.25rem; font-weight: 800; color: #b9a779;">Platform Statistics</h3>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div style="background: rgba(0,0,0,0.35); padding: 1.2rem 0.5rem; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
                                <span style="display: block; opacity: 0.6; font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px;">Demons</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 1.8rem; font-weight: 900; color: #b9a779;">{{ list.length }}</span>
                            </div>
                            <div style="background: rgba(0,0,0,0.35); padding: 1.2rem 0.5rem; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
                                <span style="display: block; opacity: 0.6; font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px;">Players</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 1.8rem; font-weight: 900; color: #edebe0;">{{ totalPlayers }}</span>
                            </div>
                            <div style="background: rgba(0,0,0,0.35); padding: 1.2rem 0.5rem; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); text-align: center;">
                                <span style="display: block; opacity: 0.6; font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px;">Records</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 1.8rem; font-weight: 900; color: #b9a779;">{{ totalRecords }}</span>
                            </div>
                        </div>

                        <p style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 0.9rem; opacity: 0.75; line-height: 1.4; color: #edebe0;">
                            Continuously updated and verified by our dedicated list editors.
                        </p>
                    </div>

                    <!-- 2. DEMON SPOTLIGHT (Independent Controls) -->
                    <div 
                        v-if="currentDemon" 
                        @mouseenter="stopDemonAutoPlay" 
                        @mouseleave="startDemonAutoPlay"
                        style="position: relative; border-radius: 18px; overflow: hidden; border: 1px solid rgba(185,167,121,0.3); display: flex; flex-direction: column; justify-content: space-between; padding: 1.75rem 2rem; min-height: 270px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);"
                    >
                        <div :style="getThumbnailStyle(currentDemon.id)" style="position: absolute; inset: 0; background-size: cover; background-position: center; filter: brightness(0.4) contrast(1.1); z-index: 1; transition: background-image 0.35s ease;"></div>
                        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,38,35,0.2) 0%, rgba(0,26,24,0.95) 100%); z-index: 2;"></div>
                        
                        <div style="position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <span style="font-family: 'Lexend Deca', sans-serif; color: #b9a779; font-weight: 800; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px;">Demon Spotlight</span>
                            
                            <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.55); padding: 3px 8px; border-radius: 20px; border: 1px solid rgba(185,167,121,0.25);">
                                <button @click.stop="prevDemon" title="Previous demon" style="background: none; border: none; color: #b9a779; cursor: pointer; font-size: 0.72rem; padding: 0 2px; line-height: 1;">◀</button>
                                <div style="display: flex; gap: 4px; align-items: center;">
                                    <span 
                                        v-for="i in 5" 
                                        :key="i"
                                        @click.stop="setDemon(i - 1)"
                                        :style="{
                                            width: demonRankIndex === (i - 1) ? '14px' : '5px',
                                            height: '5px',
                                            borderRadius: '9999px',
                                            background: demonRankIndex === (i - 1) ? '#b9a779' : 'rgba(255,255,255,0.3)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }"
                                    ></span>
                                </div>
                                <button @click.stop="nextDemon" title="Next demon" style="background: none; border: none; color: #b9a779; cursor: pointer; font-size: 0.72rem; padding: 0 2px; line-height: 1;">▶</button>
                            </div>
                        </div>

                        <div style="position: relative; z-index: 3; display: flex; flex-direction: column; gap: 0.45rem; margin-top: 1rem;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <h2 style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 1.95rem; font-weight: 900; color: #ffffff;">{{ currentDemon.name }}</h2>
                                <span style="background: rgba(0,38,35,0.9); color: #b9a779; border: 1px solid rgba(185,167,121,0.4); font-weight: 900; font-size: 0.85rem; padding: 2px 10px; border-radius: 8px;">#{{ demonRankIndex + 1 }}</span>
                            </div>
                            <span style="font-family: 'Lexend Deca', sans-serif; opacity: 0.85; font-size: 0.9rem; color: #edebe0;">
                                By {{ currentDemon.author || 'Unknown' }} &bull; First Victor: <strong style="color: #b9a779;">{{ currentVictorName }}</strong>
                            </span>
                            <router-link :to="'/' + currentDemon.id" class="syrian-cta" style="margin-top: 0.6rem; display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.3rem; border-radius: 8px; text-decoration: none; width: fit-content; font-size: 0.85rem; font-family: 'Lexend Deca', sans-serif;">
                                View Level Details
                            </router-link>
                        </div>
                    </div>

                    <!-- 3. PLAYER SPOTLIGHT (Independent Controls) -->
                    <div 
                        v-if="currentPlayer" 
                        @mouseenter="stopPlayerAutoPlay" 
                        @mouseleave="startPlayerAutoPlay"
                        style="background: rgba(0,20,18,0.85); border: 1px solid rgba(185,167,121,0.25); border-radius: 18px; padding: 1.75rem 2rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); min-height: 270px;"
                    >
                        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <span style="font-family: 'Lexend Deca', sans-serif; color: #b9a779; font-weight: 800; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 1px;">Player Spotlight</span>

                            <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.55); padding: 3px 8px; border-radius: 20px; border: 1px solid rgba(185,167,121,0.25);">
                                <button @click.stop="prevPlayer" title="Previous player" style="background: none; border: none; color: #b9a779; cursor: pointer; font-size: 0.72rem; padding: 0 2px; line-height: 1;">◀</button>
                                <div style="display: flex; gap: 4px; align-items: center;">
                                    <span 
                                        v-for="i in 5" 
                                        :key="i"
                                        @click.stop="setPlayer(i - 1)"
                                        :style="{
                                            width: playerRankIndex === (i - 1) ? '14px' : '5px',
                                            height: '5px',
                                            borderRadius: '9999px',
                                            background: playerRankIndex === (i - 1) ? '#b9a779' : 'rgba(255,255,255,0.3)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }"
                                    ></span>
                                </div>
                                <button @click.stop="nextPlayer" title="Next player" style="background: none; border: none; color: #b9a779; cursor: pointer; font-size: 0.72rem; padding: 0 2px; line-height: 1;">▶</button>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 1.25rem;">
                            <img 
                                :src="currentPlayer.pfp_url || fallbackPfp" 
                                @error="$event.target.src = fallbackPfp" 
                                alt="pfp" 
                                style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2.5px solid #b9a779; box-shadow: 0 4px 14px rgba(0,0,0,0.5); flex-shrink: 0;" 
                            />
                            <div style="display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <h3 style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 1.45rem; font-weight: 800; color: #ffffff;">{{ currentPlayer.user }}</h3>
                                    <span style="background: #b9a779; color: #002623; font-weight: 900; font-size: 0.7rem; padding: 1px 6px; border-radius: 4px; font-family: 'Lexend Deca', sans-serif;">#{{ playerRankIndex + 1 }}</span>
                                </div>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.85rem; color: #b9a779; font-weight: 700;">{{ currentPlayer.governorate || 'Syria' }} &bull; {{ localize(currentPlayer.total) }} pts</span>
                            </div>
                        </div>

                        <router-link :to="'/leaderboard/' + encodeURIComponent(currentPlayer.user)" class="syrian-cta" style="display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.3rem; border-radius: 8px; text-decoration: none; width: fit-content; font-size: 0.85rem; font-family: 'Lexend Deca', sans-serif;">
                            View Player Profile
                        </router-link>
                    </div>

                </div>

                <!-- REWORKED TIMELINE CHANGELOG SECTION -->
                <div style="background: rgba(0,20,18,0.85); border: 1px solid rgba(185,167,121,0.25); border-radius: 18px; padding: 2rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                    <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.25rem;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b9a779" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <h3 style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 1.25rem; font-weight: 800; color: #edebe0; text-transform: uppercase; letter-spacing: 0.5px;">Changelog</h3>
                    </div>

                    <div class="changelog-timeline-container" style="max-height: 480px; overflow-y: auto; padding-right: 6px;">
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
                                                <router-link :to="'/' + (item.levelId || item.levelName)" class="cl-level-link">
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
                                                    above <router-link :to="'/' + (item.easierId || item.easier)" class="cl-level-sublink">{{ item.easier }}</router-link>
                                                </template>
                                                <template v-if="item.easier && item.harder"> and </template>
                                                <template v-if="item.harder">
                                                    below <router-link :to="'/' + (item.harderId || item.harder)" class="cl-level-sublink">{{ item.harder }}</router-link>
                                                </template>
                                            </template>

                                            <!-- RAISED -->
                                            <template v-else-if="item.type === 'raised'">
                                                <router-link :to="'/' + (item.levelId || item.levelName)" class="cl-level-link">
                                                    {{ item.levelName }}
                                                </router-link>
                                                was raised <span v-if="item.oldPosition">from <span class="cl-rank">#{{ item.oldPosition }}</span> </span>to <span class="cl-rank">#{{ item.position }}</span><span v-if="item.easier || item.harder">, </span>
                                                <template v-if="item.easier">
                                                    above <router-link :to="'/' + (item.easierId || item.easier)" class="cl-level-sublink">{{ item.easier }}</router-link>
                                                </template>
                                                <template v-if="item.easier && item.harder"> and </template>
                                                <template v-if="item.harder">
                                                    below <router-link :to="'/' + (item.harderId || item.harder)" class="cl-level-sublink">{{ item.harder }}</router-link>
                                                </template>
                                            </template>

                                            <!-- LOWERED / DEMOTED -->
                                            <template v-else-if="item.type === 'lowered'">
                                                <router-link :to="'/' + (item.levelId || item.levelName)" class="cl-level-link">
                                                    {{ item.levelName }}
                                                </router-link>
                                                was lowered <span v-if="item.oldPosition">from <span class="cl-rank">#{{ item.oldPosition }}</span> </span>to <span class="cl-rank">#{{ item.position }}</span><span v-if="item.easier || item.harder">, </span>
                                                <template v-if="item.easier">
                                                    above <router-link :to="'/' + (item.easierId || item.easier)" class="cl-level-sublink">{{ item.easier }}</router-link>
                                                </template>
                                                <template v-if="item.easier && item.harder"> and </template>
                                                <template v-if="item.harder">
                                                    below <router-link :to="'/' + (item.harderId || item.harder)" class="cl-level-sublink">{{ item.harder }}</router-link>
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

                <!-- OTHER WEBSITES / PARTNERS SECTION -->
                <div style="background: rgba(0,20,18,0.85); border: 1px solid rgba(185,167,121,0.25); border-radius: 18px; padding: 2.2rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 1.5rem;">
                    <div>
                        <h3 style="font-family: 'Lexend Deca', sans-serif; margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 800; color: #b9a779;">Other Websites / Partners</h3>
                        <p style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 0.9rem; opacity: 0.75; color: #edebe0;">
                            Powered by <strong style="color: #b9a779;">The Shitty List (TSL)</strong> framework, integrated with <strong style="color: #b9a779;">AREDL</strong> standards, and inspired by <strong style="color: #b9a779;">The Arab AREDL</strong> community!
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                        <!-- 1. TSL Partner Card -->
                        <a href="https://tsl.pages.dev" target="_blank" style="text-decoration: none; background: rgba(0,0,0,0.35); border: 1px solid rgba(185,167,121,0.2); border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; transition: transform 0.2s, border-color 0.2s;" onmouseenter="this.style.transform='translateY(-3px)'; this.style.borderColor='rgba(185,167,121,0.5)'" onmouseleave="this.style.transform='translateY(0)'; this.style.borderColor='rgba(185,167,121,0.2)'">
                            <div style="width: 56px; height: 56px; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(185,167,121,0.3); overflow: hidden;">
                                <img src="https://aredl.net/assets/partners/TSL.webp" alt="TSL Logo" style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                            <div>
                                <span style="display: block; font-family: 'Lexend Deca', sans-serif; font-weight: 800; font-size: 1rem; color: #edebe0;">The Shitty List</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; opacity: 0.6; color: #edebe0;">Base Architecture</span>
                            </div>
                        </a>

                        <!-- 2. AREDL Partner Card -->
                        <a href="https://aredl.net" target="_blank" style="text-decoration: none; background: rgba(0,0,0,0.35); border: 1px solid rgba(185,167,121,0.2); border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; transition: transform 0.2s, border-color 0.2s;" onmouseenter="this.style.transform='translateY(-3px)'; this.style.borderColor='rgba(185,167,121,0.5)'" onmouseleave="this.style.transform='translateY(0)'; this.style.borderColor='rgba(185,167,121,0.2)'">
                            <div style="height: 56px; display: flex; align-items: center; justify-content: center;">
                                <img src="https://aredl.net/assets/logo.webp" alt="AREDL Logo" style="max-height: 50px; width: auto; object-fit: contain;" />
                            </div>
                            <div>
                                <span style="display: block; font-family: 'Lexend Deca', sans-serif; font-weight: 800; font-size: 1rem; color: #edebe0;">All Rated Extreme Demons List</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; opacity: 0.6; color: #edebe0;">Thumbnails & Level Data</span>
                            </div>
                        </a>

                        <!-- 3. The Arab AREDL Partner Card -->
                        <a href="https://arab.sparked.network/#/" target="_blank" style="text-decoration: none; background: rgba(0,0,0,0.35); border: 1px solid rgba(185,167,121,0.2); border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; transition: transform 0.2s, border-color 0.2s;" onmouseenter="this.style.transform='translateY(-3px)'; this.style.borderColor='rgba(185,167,121,0.5)'" onmouseleave="this.style.transform='translateY(0)'; this.style.borderColor='rgba(185,167,121,0.2)'">
                            <div style="height: 56px; display: flex; align-items: center; justify-content: center;">
                                <img 
                                    src="https://arab.sparked.network/assets/demon.png" 
                                    @error="$event.target.src='https://arab.sparked.network/assets/demon.png'" 
                                    alt="The Arab AREDL Logo" 
                                    style="max-height: 48px; width: auto; object-fit: contain; filter: brightness(0) invert(1);" 
                                />
                            </div>
                            <div>
                                <span style="display: block; font-family: 'Lexend Deca', sans-serif; font-weight: 800; font-size: 1rem; color: #edebe0;">The Arab AREDL</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; opacity: 0.6; color: #edebe0;">Ideas & Features</span>
                            </div>
                        </a>
                    </div>
                </div>

            </div>

            <!-- REWORKED FULL-WIDTH FOOTER (NO SIDE GAPS) -->
            <footer style="background: rgba(0, 18, 16, 0.95); border-top: 1px solid rgba(185, 167, 121, 0.25); padding: 3.5rem 2rem 2rem 2rem; margin-top: 3.5rem; width: 100vw; position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; box-sizing: border-box; backdrop-filter: blur(12px);">
                <div style="max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 2.5rem;">
                    
                    <!-- Top Multi-Column Grid (NCDL Style) -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2.5rem; align-items: flex-start;">
                        
                        <!-- Col 1: Brand & Bio -->
                        <!-- AFTER: Added matching gold v2.0 badge next to footer title -->
<div style="display: flex; flex-direction: column; gap: 0.85rem; max-width: 340px;">
    <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
        <img src="./list_icon.png" alt="Syrian Demon List Logo" style="width: 32px; height: 32px; object-fit: contain;" />
        <span style="font-family: 'Hayyakum Allah', 'Lexend Deca', sans-serif; font-size: 1.5rem; font-weight: 400; color: #ffffff;">Syrian Demon List</span>
        <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.72rem; color: #002623; background: #b9a779; padding: 2px 7px; border-radius: 6px; font-weight: 800; letter-spacing: 0.4px;">v2.1</span>
    </div>
    <p style="font-family: 'Lexend Deca', sans-serif; font-size: 0.88rem; opacity: 0.75; line-height: 1.6; color: #edebe0; margin: 0;">
        The official Syrian Demon List, ranking the hardest Geometry Dash levels completed by Syrian players.
    </p>
</div>

                        <!-- Col 2: EXPLORE -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; font-weight: 800; color: #b9a779; text-transform: uppercase; letter-spacing: 0.8px;">Explore</span>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-family: 'Lexend Deca', sans-serif; font-size: 0.88rem;">
                                <router-link to="/list" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">The Demonlist</router-link>
                                <router-link to="/leaderboard" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">National Leaderboard</router-link>
                                <router-link to="/roulette" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">Demon Roulette</router-link>
                            </div>
                        </div>

                        <!-- Col 3: SUPPORT & INFO -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; font-weight: 800; color: #b9a779; text-transform: uppercase; letter-spacing: 0.8px;">Support & Info</span>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-family: 'Lexend Deca', sans-serif; font-size: 0.88rem;">
                                <router-link to="/rules" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">Submission Guidelines</router-link>
                                <router-link to="/rules" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">Terms of Service</router-link>
                                <router-link to="/rules" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">Privacy Policy</router-link>
                            </div>
                        </div>

                        <!-- Col 4: COMMUNITY & PARTNERS -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; font-weight: 800; color: #b9a779; text-transform: uppercase; letter-spacing: 0.8px;">Community</span>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-family: 'Lexend Deca', sans-serif; font-size: 0.88rem;">
                                <a href="https://discord.gg/pPT7QK2cyv" target="_blank" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">Discord Server</a>
                                <a href="https://arab.sparked.network/#/" target="_blank" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">The Arab AREDL</a>
                                <a href="https://aredl.net" target="_blank" style="color: #edebe0; opacity: 0.75; text-decoration: none; transition: all 0.2s;" onmouseenter="this.style.color='#b9a779'; this.style.opacity=1;" onmouseleave="this.style.color='#edebe0'; this.style.opacity=0.75;">AREDL Network</a>
                            </div>
                        </div>

                    </div>

                    <!-- Divider -->
                    <div style="width: 100%; height: 1px; background: rgba(185, 167, 121, 0.15);"></div>

                    <!-- Bottom Bar with Socials & Disclaimer -->
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; font-family: 'Lexend Deca', sans-serif; font-size: 0.82rem; opacity: 0.75; color: #edebe0;">
                        <div>
                            &copy; 2026 Syrian Demon List. All rights reserved.
                        </div>

                        <!-- Social Icons Row (Discord, GitHub) -->
                        <div style="display: flex; align-items: center; gap: 1.25rem;">
                            <a href="https://discord.gg/pPT7QK2cyv" target="_blank" title="Discord" style="color: #edebe0; transition: color 0.2s;" onmouseenter="this.style.color='#b9a779'" onmouseleave="this.style.color='#edebe0'">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                                </svg>
                            </a>
                            <a href="https://github.com/malekballer/syrian-demon-list" target="_blank" title="GitHub" style="color: #edebe0; transition: color 0.2s;" onmouseenter="this.style.color='#b9a779'" onmouseleave="this.style.color='#edebe0'">
                                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                                </svg>
                            </a>
                        </div>

                        <div>
                            This site is in no way affiliated with RobTop Games AB.
                        </div>
                    </div>

                </div>
            </footer>

        </div>
    `,
    computed: {
        currentDemon() {
            return this.list[this.demonRankIndex] || null;
        },
        currentVictorName() {
            if (!this.currentDemon) return 'None';
            if (this.currentDemon.records && this.currentDemon.records.length > 0) {
                const victor = this.currentDemon.records.find(r => r.percent === 100) || this.currentDemon.records[0];
                return victor.user || victor.name || 'Unknown';
            }
            return this.currentDemon.verifier || 'None';
        },
        currentPlayer() {
            return this.top5Players[this.playerRankIndex] || null;
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
        }
    },
    async mounted() {
        // 1. Always reset document tab title back to Syrian Demon List
        document.title = 'Syrian Demon List';

        // 2. Hide scrollbar on root and parent view wrapper
        document.documentElement.classList.add('home-no-scrollbar');
        if (this.$el && this.$el.parentElement) {
            this.$el.parentElement.classList.add('hide-home-scroll');
        }

        const rawList = await fetchList();
        this.list = rawList.map(item => Array.isArray(item) ? item[0] : item);

        try {
            const [board] = await fetchLeaderboard();

            // 1. Fetch live approved submissions and profiles from Supabase
            const [{ data: approvedSubs }, { data: allProfiles }] = await Promise.all([
                supabase.from('submissions').select('*').eq('status', 'approved'),
                supabase.from('profiles').select('*')
            ]);

            const profileMap = new Map();
            if (allProfiles) {
                allProfiles.forEach(p => {
                    if (p.id) profileMap.set(p.id, p);
                    if (p.username) profileMap.set(p.username.trim().toLowerCase(), p);
                });
            }

            // 2. Count all unique ranked players (JSON + Supabase submissions)
            const activePlayers = new Set();
            let count = 0;
            const seenRecordKeys = new Set();

            board.forEach(p => {
                const pKey = p.user.trim().toLowerCase();
                const vLen = p.verified?.length || 0;
                const cLen = p.completed?.length || 0;
                if (vLen > 0 || cLen > 0 || p.total > 0) {
                    activePlayers.add(pKey);
                }
                (p.verified || []).forEach(r => {
                    seenRecordKeys.add(`${pKey}-${(r.level || '').toLowerCase()}-${r.percent}`);
                    count++;
                });
                (p.completed || []).forEach(r => {
                    seenRecordKeys.add(`${pKey}-${(r.level || '').toLowerCase()}-${r.percent}`);
                    count++;
                });
            });

            // Add players & records verified live via Supabase (e.g., glitchinggd)
            if (approvedSubs && approvedSubs.length > 0) {
                approvedSubs.forEach(sub => {
                    const prof = profileMap.get(sub.user_id);
                    const username = prof?.username ? prof.username.trim().toLowerCase() : null;
                    if (!username) return;

                    activePlayers.add(username);

                    const key = `${username}-${(sub.level_id || sub.level_name || '').toString().toLowerCase()}-${sub.percent}`;
                    if (!seenRecordKeys.has(key)) {
                        seenRecordKeys.add(key);
                        count++;
                    }
                });
            }

            this.totalPlayers = activePlayers.size;
            this.totalRecords = count;

            const top5 = board.slice(0, 5);
            let editors = [];
            try {
                editors = await fetchEditors();
            } catch (e) {}

            const profiles = allProfiles || [];

            const editorMap = new Map((editors || []).map(e => [e.name?.toLowerCase().trim(), e]));
            const totalLevels = this.list.length || 100;

            this.top5Players = top5.map(rawPlayer => {
                const key = rawPlayer.user.toLowerCase().trim();
                const prof = profileMap.get(key) || {};
                const ed = editorMap.get(key) || {};

                let realScore = 0;
                (rawPlayer.verified || []).forEach(v => realScore += score(v.rank, 100, 100, totalLevels));
                (rawPlayer.completed || []).forEach(c => realScore += score(c.rank, 100, 100, totalLevels));
                (rawPlayer.progressed || []).forEach(p => realScore += score(p.rank, p.percent, 0, totalLevels));

                return {
                    ...rawPlayer,
                    total: realScore > 0 ? realScore : rawPlayer.total,
                    governorate: prof.governorate || 'Damascus',
                    pfp_url: prof.pfp_url || prof.avatar_url || ed.pfp || null
                };
            });
        } catch (e) {
            this.totalPlayers = 0;
            this.totalRecords = 0;
        }

        // Fetch activity feed
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

        const merged = [...(Array.isArray(jsonActivity) ? jsonActivity : []), ...(Array.isArray(dbActivity) ? dbActivity : [])];
        this.activityList = merged.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Start independent timers
        this.startDemonAutoPlay();
        this.startPlayerAutoPlay();

        this.loading = false;
    },
    beforeUnmount() {
        document.documentElement.classList.remove('home-no-scrollbar');
        if (this.$el && this.$el.parentElement) {
            this.$el.parentElement.classList.remove('hide-home-scroll');
        }
        this.stopDemonAutoPlay();
        this.stopPlayerAutoPlay();
    },
    methods: {
        localize,
        getThumbnailStyle(id) {
            if (!id) return { backgroundImage: 'none' };
            return {
                backgroundImage: `url('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${id}.webp')`
            };
        },
        rollRandomDemon() {
            if (!this.list || this.list.length === 0) return;
            const randomIndex = Math.floor(Math.random() * this.list.length);
            const randomLevel = this.list[randomIndex];
            if (randomLevel && randomLevel.id) {
                this.$router.push(`/${randomLevel.id}`);
            }
        },

        // --- INDEPENDENT DEMON CONTROLS ---
        nextDemon() {
            this.demonRankIndex = (this.demonRankIndex + 1) % 5;
            this.startDemonAutoPlay();
        },
        prevDemon() {
            this.demonRankIndex = (this.demonRankIndex - 1 + 5) % 5;
            this.startDemonAutoPlay();
        },
        setDemon(idx) {
            this.demonRankIndex = idx;
            this.startDemonAutoPlay();
        },
        startDemonAutoPlay() {
            this.stopDemonAutoPlay();
            this.demonTimer = setInterval(() => {
                this.demonRankIndex = (this.demonRankIndex + 1) % 5;
            }, 5000);
        },
        stopDemonAutoPlay() {
            if (this.demonTimer) {
                clearInterval(this.demonTimer);
                this.demonTimer = null;
            }
        },

        // --- INDEPENDENT PLAYER CONTROLS ---
        nextPlayer() {
            this.playerRankIndex = (this.playerRankIndex + 1) % 5;
            this.startPlayerAutoPlay();
        },
        prevPlayer() {
            this.playerRankIndex = (this.playerRankIndex - 1 + 5) % 5;
            this.startPlayerAutoPlay();
        },
        setPlayer(idx) {
            this.playerRankIndex = idx;
            this.startPlayerAutoPlay();
        },
        startPlayerAutoPlay() {
            this.stopPlayerAutoPlay();
            this.playerTimer = setInterval(() => {
                this.playerRankIndex = (this.playerRankIndex + 1) % 5;
            }, 5000);
        },
        stopPlayerAutoPlay() {
            if (this.playerTimer) {
                clearInterval(this.playerTimer);
                this.playerTimer = null;
            }
        },

        sanitizeStr(str) {
            return (str || '')
                .toLowerCase()
                .replace(/\s*\(\d+%\)/g, '')
                .replace(/[^a-z0-9]/g, '');
        },
        findLevelObject(nameOrId) {
            if (!nameOrId || !Array.isArray(this.list)) return null;
            const targetRaw = nameOrId.toString().trim().toLowerCase();
            const targetClean = this.sanitizeStr(targetRaw);

            let found = this.list.find(lvl => {
                if (!lvl) return false;
                return lvl.name?.toLowerCase() === targetRaw || lvl.id?.toString() === targetRaw || lvl.path?.toLowerCase() === targetRaw;
            });
            if (found) return found;

            found = this.list.find(lvl => {
                if (!lvl) return false;
                const cleanLvl = this.sanitizeStr(lvl.name);
                const cleanPath = this.sanitizeStr(lvl.path);
                return cleanLvl === targetClean || cleanPath === targetClean || targetClean.startsWith(cleanLvl) || cleanLvl.startsWith(targetClean);
            });
            return found || null;
        },
        getLevelRankAndNeighbors(levelObj) {
            if (!levelObj || !Array.isArray(this.list)) return { position: null, easier: null, harder: null };
            const idx = this.list.findIndex(l => l && (l.id?.toString() === levelObj.id?.toString() || l.name === levelObj.name));
            if (idx === -1) return { position: null, easier: null, harder: null };
            
            const position = idx + 1;
            const harderObj = idx > 0 ? this.list[idx - 1] : null;
            const easierObj = idx < this.list.length - 1 ? this.list[idx + 1] : null;
            
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
        }
    }
};