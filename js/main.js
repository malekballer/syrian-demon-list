import routes from './routes.js';
import { supabase, getAuthenticatedUser, loginWithDiscord, logoutUser } from './supabase.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    currentPath: window.location.hash.slice(1) || '/',
    user: null,
    profile: null,
    showSubmissionModal: false,

    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },

    async checkAuth() {
        const authData = await getAuthenticatedUser();
        if (authData) {
            this.user = authData.user;
            this.profile = authData.profile;
        } else {
            this.user = null;
            this.profile = null;
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

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

router.afterEach((to) => {
    store.currentPath = to.path;
});

app.use(router);
app.mount('#app');
