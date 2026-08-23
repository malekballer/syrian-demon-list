import routes from './routes.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    currentPath: window.location.hash.slice(1) || '/',
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
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

    // Dynamically update tab title based on active page or level
    if (to.params.level) {
        document.title = `${to.params.level} - Syrian Demon List`;
    } else if (to.path === '/leaderboard') {
        document.title = 'Leaderboard - Syrian Demon List';
    } else if (to.path === '/roulette') {
        document.title = 'Roulette - Syrian Demon List';
    } else if (to.path === '/rules') {
        document.title = 'Submission Rules - Syrian Demon List';
    } else {
        document.title = 'Syrian Demon List';
    }
});

app.use(router);
app.mount('#app');
