import { fetchList, fetchLeaderboard } from '../content.js';
import { localize } from '../util.js';
import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        loading: true,
        list: [],
        topLevel: null,
        firstVictor: 'Loading...',
        totalRecords: 0,
        totalPlayers: 0,
        recentActivity: [
            { text: 'orqng3 completed Azurite (Sillow) (100%)', sub: 'Aug 29 • by baller' },
            { text: 'Azurite (royen) was placed on the list (First Victor: orqng3)', sub: 'Aug 28 • by malekballer' },
            { text: 'FIREPOWER was placed on the list (First Victor: orqng3)', sub: 'Aug 28 • by malekballer' },
            { text: 'CONVOLVER was placed on the list (First Victor: orqng3)', sub: 'Aug 28 • by malekballer' }
        ]
    }),
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <div v-else class="home-page-wrapper" style="min-height: calc(100vh - 90px); display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
            
            <!-- MAIN CONTENT CONTAINER -->
            <div style="max-width: 1400px; width: 100%; margin: 0 auto; padding: 2.5rem 1.5rem; display: flex; flex-direction: column; gap: 2rem; box-sizing: border-box;">
                
                <!-- HERO SECTION -->
                <div style="position: relative; background: linear-gradient(135deg, rgba(0,38,35,0.95) 0%, rgba(0,20,18,0.9) 100%); border: 1px solid rgba(185,167,121,0.3); border-radius: 20px; padding: 3rem 3rem; display: flex; justify-content: space-between; align-items: center; gap: 2rem; box-shadow: 0 16px 40px rgba(0,0,0,0.6); overflow: hidden;">
                    <div style="position: absolute; top: 0; right: 0; bottom: 0; width: 50%; opacity: 0.12; background: url('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/1.webp') center/cover; pointer-events: none;"></div>
                    
                    <div style="position: relative; z-index: 2; max-width: 700px; display: flex; flex-direction: column; gap: 1rem;">
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem;">
                            <span style="background: #b9a779; color: #002623; padding: 5px 12px; border-radius: 6px; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; font-family: 'Lexend Deca', sans-serif;">Official Syrian Community List</span>
                            <h1 style="font-family: 'Hayyakum Allah', 'Lexend Deca', sans-serif; font-size: 3.5rem; font-weight: normal; margin: 0; line-height: 1.15; color: #edebe0;">
                                The Home of <span style="color: #b9a779;">Syrian Demons</span>
                            </h1>
                        </div>
                        <p style="font-family: 'Lexend Deca', sans-serif; font-size: 1.1rem; opacity: 0.85; line-height: 1.6; margin: 0; color: #edebe0;">
                            Explore verified Extreme Demons across Syrian governorates, track player rankings, compete on the leaderboards, and submit your records.
                        </p>

                        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
                            <router-link to="/list" class="syrian-cta" style="padding: 0.8rem 2rem; border-radius: 10px; text-decoration: none; font-size: 1rem; font-family: 'Lexend Deca', sans-serif;">
                                View Demon List
                            </router-link>
                            <router-link to="/leaderboard" style="padding: 0.8rem 2rem; border-radius: 10px; text-decoration: none; background: rgba(255,255,255,0.08); border: 1px solid rgba(185,167,121,0.3); color: #edebe0; font-weight: 800; font-family: 'Lexend Deca', sans-serif; transition: background 0.2s;" onmouseenter="this.style.background='rgba(185,167,121,0.15)'" onmouseleave="this.style.background='rgba(255,255,255,0.08)'">
                                Leaderboard
                            </router-link>
                        </div>
                    </div>

                    <!-- Standalone Logo -->
                    <div style="position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
                        <img src="./list_icon.png" alt="Syrian List Logo" style="width: 200px; height: 200px; object-fit: contain; filter: drop-shadow(0 12px 24px rgba(0,0,0,0.6));" />
                    </div>
                </div>

                <!-- STATS GRID & FEATURED LEVEL -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                    
                    <!-- Quick Stats Box -->
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

                    <!-- Featured #1 Level Highlight -->
                    <div v-if="topLevel" style="position: relative; border-radius: 18px; overflow: hidden; border: 1px solid rgba(185,167,121,0.3); display: flex; flex-direction: column; justify-content: flex-end; padding: 2.2rem; min-height: 260px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                        <div :style="getThumbnailStyle(topLevel.id)" style="position: absolute; inset: 0; background-size: cover; background-position: center; filter: brightness(0.45) contrast(1.1); z-index: 1;"></div>
                        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,38,35,0.1) 0%, rgba(0,26,24,0.95) 100%); z-index: 2;"></div>
                        
                        <div style="position: relative; z-index: 3; display: flex; flex-direction: column; gap: 0.5rem;">
                            <span style="font-family: 'Lexend Deca', sans-serif; color: #b9a779; font-weight: 800; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">Current #1 Demon</span>
                            <h2 style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 2.2rem; font-weight: 900; color: #ffffff;">{{ topLevel.name }}</h2>
                            <span style="font-family: 'Lexend Deca', sans-serif; opacity: 0.85; font-size: 0.95rem; color: #edebe0;">By {{ topLevel.author }} &bull; First Victor: <strong style="color: #b9a779;">{{ firstVictor }}</strong></span>
                            <router-link :to="'/' + topLevel.id" class="syrian-cta" style="margin-top: 0.75rem; display: inline-flex; align-items: center; justify-content: center; padding: 0.6rem 1.2rem; border-radius: 8px; text-decoration: none; width: fit-content; font-size: 0.85rem; font-family: 'Lexend Deca', sans-serif;">
                                View Level Details
                            </router-link>
                        </div>
                    </div>

                </div>

                <!-- RECENT ACTIVITY SECTION -->
                <div style="background: rgba(0,20,18,0.85); border: 1px solid rgba(185,167,121,0.25); border-radius: 18px; padding: 2rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                    <h3 style="font-family: 'Lexend Deca', sans-serif; margin: 0 0 1.25rem 0; font-size: 1.25rem; font-weight: 800; color: #b9a779;">Recent Activity</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <div v-for="(act, idx) in recentActivity" :key="idx" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 1rem 1.25rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.25rem;">
                            <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.95rem; font-weight: 700; color: #edebe0;">{{ act.text }}</span>
                            <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.8rem; opacity: 0.6; color: #edebe0;">{{ act.sub }}</span>
                        </div>
                    </div>
                </div>

                <!-- OTHER WEBSITES / PARTNERS SECTION -->
                <div style="background: rgba(0,20,18,0.85); border: 1px solid rgba(185,167,121,0.25); border-radius: 18px; padding: 2.2rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 1.5rem;">
                    <div>
                        <h3 style="font-family: 'Lexend Deca', sans-serif; margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 800; color: #b9a779;">Other Websites / Partners</h3>
                        <p style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 0.9rem; opacity: 0.75; color: #edebe0;">
                            Powered by <strong style="color: #b9a779;">The Shitty List (TSL)</strong> framework architecture and integrated with <strong style="color: #b9a779;">AREDL</strong> standards for thumbnails, rankings, and tags!
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                        <!-- TSL Partner Card -->
                        <a href="https://tsl.pages.dev" target="_blank" style="text-decoration: none; background: rgba(0,0,0,0.35); border: 1px solid rgba(185,167,121,0.2); border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; transition: transform 0.2s, border-color 0.2s;" onmouseenter="this.style.transform='translateY(-3px)'; this.style.borderColor='rgba(185,167,121,0.5]'" onmouseleave="this.style.transform='translateY(0)'; this.style.borderColor='rgba(185,167,121,0.2)'">
                            <div style="width: 56px; height: 56px; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(185,167,121,0.3); overflow: hidden;">
                                <img src="https://aredl.net/assets/partners/TSL.webp" alt="TSL Logo" style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                            <div>
                                <span style="display: block; font-family: 'Lexend Deca', sans-serif; font-weight: 800; font-size: 1rem; color: #edebe0;">The Shitty List</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; opacity: 0.6; color: #edebe0;">Base Architecture</span>
                            </div>
                        </a>

                        <!-- AREDL Partner Card -->
                        <a href="https://aredl.net" target="_blank" style="text-decoration: none; background: rgba(0,0,0,0.35); border: 1px solid rgba(185,167,121,0.2); border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem; transition: transform 0.2s, border-color 0.2s;" onmouseenter="this.style.transform='translateY(-3px)'; this.style.borderColor='rgba(185,167,121,0.5]'" onmouseleave="this.style.transform='translateY(0)'; this.style.borderColor='rgba(185,167,121,0.2)'">
                            <div style="height: 56px; display: flex; align-items: center; justify-content: center;">
                                <img src="https://aredl.net/assets/logo.webp" alt="AREDL Logo" style="max-height: 50px; width: auto; object-fit: contain;" />
                            </div>
                            <div>
                                <span style="display: block; font-family: 'Lexend Deca', sans-serif; font-weight: 800; font-size: 1rem; color: #edebe0;">AREDL Network</span>
                                <span style="font-family: 'Lexend Deca', sans-serif; font-size: 0.75rem; opacity: 0.6; color: #edebe0;">Thumbnails & Tags</span>
                            </div>
                        </a>
                    </div>
                </div>

            </div>

            <!-- OFFICIAL FOOTER -->
            <footer style="background: rgba(0,15,13,0.95); border-top: 1px solid rgba(185,167,121,0.2); padding: 2.5rem 2rem; text-align: center; margin-top: 3rem; display: flex; flex-direction: column; gap: 1rem; align-items: center; width: 100vw; position: relative; margin-left: calc(-50vw + 50%); box-sizing: border-box;">
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem;">
                    <router-link to="/rules" style="color: #edebe0; opacity: 0.8; text-decoration: none; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.8">Submission Guidelines</router-link>
                    <span style="opacity: 0.3;">|</span>
                    <router-link to="/rules" style="color: #edebe0; opacity: 0.8; text-decoration: none; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.8">Terms of Service</router-link>
                    <span style="opacity: 0.3;">|</span>
                    <router-link to="/rules" style="color: #edebe0; opacity: 0.8; text-decoration: none; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.8">Privacy Policy</router-link>
                </div>
                
                <div style="display: flex; gap: 1rem; align-items: center; margin: 0.5rem 0;">
                    <a href="https://discord.gg/pPT7QK2cyv" target="_blank" style="color: #edebe0; opacity: 0.8; transition: opacity 0.2s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0.8" title="Discord">
                        <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.91-72.14zM42.45 65.69c-6.32 0-11.52-5.8-11.52-12.91s5.07-12.9 11.52-12.9c6.5 0 11.64 5.86 11.52 12.9 0 7.11-5.07 12.91-11.52 12.91zm42.24 0c-6.32 0-11.52-5.8-11.52-12.91s5.07-12.9 11.52-12.9c6.5 0 11.64 5.86 11.52 12.9 0 7.11-5.07 12.91-11.52 12.91z"/></svg>
                    </a>
                </div>

                <p style="font-family: 'Lexend Deca', sans-serif; margin: 0; font-size: 0.85rem; opacity: 0.6; line-height: 1.5; color: #edebe0;">
                    &copy; 2026 Syrian Demon List. All rights reserved.<br>
                    This site is in no way affiliated with RobTop Games AB.
                </p>
            </footer>

        </div>
    `,
    async mounted() {
        const rawList = await fetchList();
        this.list = rawList.map(item => Array.isArray(item) ? item[0] : item);
        if (this.list.length > 0) {
            this.topLevel = this.list[0];
            if (this.topLevel.records && this.topLevel.records.length > 0) {
                const victor = this.topLevel.records.find(r => r.percent === 100) || this.topLevel.records[0];
                this.firstVictor = victor.user || victor.name || 'Unknown';
            } else {
                this.firstVictor = this.topLevel.verifier || 'None';
            }
        }

        try {
            const [board] = await fetchLeaderboard();
            this.totalPlayers = board.length;
            let count = 0;
            board.forEach(p => {
                count += (p.verified?.length || 0) + (p.completed?.length || 0);
            });
            this.totalRecords = count;
        } catch (e) {
            this.totalPlayers = 0;
            this.totalRecords = 0;
        }

        this.loading = false;
    },
    methods: {
        localize,
        getThumbnailStyle(id) {
            if (!id) return { backgroundImage: 'none' };
            return {
                backgroundImage: `url('https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${id}.webp')`
            };
        }
    }
};
