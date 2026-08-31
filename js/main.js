import routes from './routes.js';
import { supabase, getAuthenticatedUser, loginWithDiscord, logoutUser } from './supabase.js';
import SubmissionModal from './components/SubmissionModal.js';
import ProfileModal from './components/ProfileModal.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    currentPath: window.location.hash.slice(1) || '/',
    user: null,
    profile: null,
    showSubmissionModal: false,
    showProfileModal: false,

    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },

    async checkAuth() {
        const authData = await getAuthenticatedUser();
        if (authData && authData.user) {
            this.user = authData.user;
            
            // If user is logged in via Supabase but doesn't have a profile row yet, auto-create it instantly!
            if (!authData.profile) {
                const meta = authData.user.user_metadata || {};
                const defaultUsername = meta.preferred_username || meta.user_name || meta.full_name || `Player_${authData.user.id.slice(0, 5)}`;
                const defaultAvatar = meta.avatar_url || meta.picture || 'https://assets.aredl.net/avatars/default.png';
                const defaultTag = meta.preferred_username || meta.user_name || null;

                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: authData.user.id,
                        username: defaultUsername,
                        pfp_url: defaultAvatar,
                        discord_tag: defaultTag,
                        governorate: 'Damascus'
                    })
                    .select()
                    .single();

                if (!insertError && newProfile) {
                    this.profile = newProfile;
                } else {
                    this.profile = null;
                }
            } else {
                this.profile = authData.profile;
            }

            // Apply background pattern state from profile preference
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

// Register global modal components
app.component('submission-modal', SubmissionModal);
app.component('profile-modal', ProfileModal);

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

// Route Guard: Block non-editors from manually accessing /review
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
});

app.use(router);
app.mount('#app');