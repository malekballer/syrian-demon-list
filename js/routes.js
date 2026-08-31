import Home from './pages/Home.js';
import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Rules from './pages/Rules.js';
import ReviewView from './pages/ReviewView.js';

export default [
    { path: '/', component: Home },
    { path: '/list', component: List },
    { path: '/:level', component: List }, // Keeps individual level URLs working like /1, /some-level-id
    { path: '/leaderboard/:user?', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/rules', component: Rules },
    { path: '/review', component: ReviewView },
];