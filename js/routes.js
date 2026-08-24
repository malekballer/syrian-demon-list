import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Rules from './pages/Rules.js';
import ReviewView from './pages/ReviewView.js';

export default [
    { path: '/:level?', component: List },
    { path: '/leaderboard/:user?', component: Leaderboard }, // <-- ADD :user? HERE
    { path: '/roulette', component: Roulette },
    { path: '/rules', component: Rules },
    { path: '/review', component: ReviewView },
];
