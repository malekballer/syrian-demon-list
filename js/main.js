import routes from './routes.js';
import { supabase, getAuthenticatedUser, loginWithDiscord, logoutUser } from './supabase.js';
import { DISCORD_SERVER_ID, DISCORD_INVITE_URL, DISCORD_GOV_ROLES } from './config.js';
import SubmissionModal from './components/SubmissionModal.js';
import ProfileModal from './components/ProfileModal.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) ?? true,
    currentPath: window.location.hash.slice(1) || '/',
    user: null,
    profile: null,
    showSubmissionModal: false,
    showProfileModal: false,
    showMobileNav: false,

    toggleMobileNav() {
        this.showMobileNav = !this.showMobileNav;
    },
    closeMobileNav() {
        this.showMobileNav = false;
    },

    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },

    async checkAuth() {
        const authData = await getAuthenticatedUser();
        if (authData && authData.user) {
            const user = authData.user;
            const meta = user.user_metadata || {};
            
            // Latest Discord avatar & username
            const latestAvatar = meta.avatar_url || meta.picture || 'https://assets.aredl.net/avatars/default.png';
            const latestUsername = meta.full_name || meta.preferred_username || meta.user_name || `Player_${user.id.slice(0, 5)}`;
            const latestTag = meta.preferred_username || meta.user_name || null;

            // Get Discord OAuth Provider Token to check guild membership & roles
            const { data: { session } } = await supabase.auth.getSession();
            const providerToken = session?.provider_token;

            let assignedGov = null;

            if (providerToken) {
                try {
                    const memberRes = await fetch(`https://discord.com/api/v10/users/@me/guilds/${DISCORD_SERVER_ID}/member`, {
                        headers: {
                            Authorization: `Bearer ${providerToken}`
                        }
                    });

                    // 1. GATE CHECK: If user is NOT in the server (404 or 403)
                    if (memberRes.status === 404 || memberRes.status === 403) {
                        await logoutUser();
                        this.user = null;
                        this.profile = null;
                        alert("Access Denied: You must be a member of the Syrian Demon List Discord server to log in! Please join the server first.");
                        window.location.href = DISCORD_INVITE_URL;
                        return;
                    }

                    // 2. GOVERNORATE AUTO-ASSIGNMENT FROM ROLES
                    if (memberRes.ok) {
                        const member = await memberRes.json();
                        const userRoles = member.roles || [];

                        // Collect all governorates that match their Discord roles
                        const matchedGovs = [];
                        for (const roleId of userRoles) {
                            if (DISCORD_GOV_ROLES[roleId]) {
                                matchedGovs.push(DISCORD_GOV_ROLES[roleId]);
                            }
                        }

                        // Resolve 2 governorates: If they already selected one in their profile and still have that role, keep it!
                        if (matchedGovs.length > 0) {
                            if (authData.profile && matchedGovs.includes(authData.profile.governorate)) {
                                assignedGov = authData.profile.governorate;
                            } else {
                                assignedGov = matchedGovs[0];
                            }
                        }
                    }
                } catch (err) {
                    console.warn("Discord member verification skipped/cached:", err);
                }
            }

            // 3. AUTO-UPDATE PROFILE & PFP
            const profilePayload = {
                id: user.id,
                username: authData.profile?.username || latestUsername,
                pfp_url: latestAvatar, // Automatically updates Discord avatar!
                discord_tag: latestTag
            };

            if (assignedGov) {
                profilePayload.governorate = assignedGov;
            } else if (!authData.profile?.governorate) {
                profilePayload.governorate = 'Damascus';
            }

            const { data: syncedProfile, error: syncError } = await supabase
                .from('profiles')
                .upsert(profilePayload)
                .select()
                .single();

            if (!syncError && syncedProfile) {
                this.user = user;
                this.profile = syncedProfile;
            } else {
                this.user = user;
                this.profile = authData.profile;
            }

            if (this.profile && this.profile.disable_bg_pattern) {
                document.body.classList.add('no-bg-pattern');
            } else {
                document.body.classList.remove('no-bg-pattern');
            }
        } else {
            this.user = null;
            this.profile = null;
            document.body.classList.remove('no-bg-pattern');
        }
    },

    async login() {
        await loginWithDiscord();
    },

    async logout() {
        await logoutUser();
        this.user = null;
        this.profile = null;
    }
});

// Check user auth state immediately
store.checkAuth();

// Listen for login/logout auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        await store.checkAuth();
    } else {
        store.user = null;
        store.profile = null;
    }
});

const app = Vue.createApp({
    data: () => ({ store }),
});

app.component('submission-modal', SubmissionModal);
app.component('profile-modal', ProfileModal);

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    if (to.path === '/review') {
        if (store.profile && store.profile.is_editor === true) {
            next();
        } else {
            next('/');
        }
    } else {
        next();
    }
});

router.afterEach((to) => {
    store.currentPath = to.path;
    store.showMobileNav = false;
});

app.use(router);
app.mount('#app');