import { fetchList } from '../content.js';
import { getThumbnailFromId, getYoutubeIdFromUrl, shuffle } from '../util.js';
import { store } from '../main.js';

import Spinner from '../components/Spinner.js';
import Btn from '../components/Btn.js';

export default {
    components: { Spinner, Btn },
    template: `
        <main v-if="loading" class="loading-container">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-roulette">
            <div class="sidebar">
                <p class="type-label-md" style="color: #aaa">
                    Shameless copy of the Extreme Demon Roulette by <a href="https://matcool.github.io/extreme-demon-roulette/" target="_blank" style="color: #b9a779;">matcool</a>.
                </p>
                <form class="options">
                    <Btn @click.native.prevent="onStart" :style="{ backgroundColor: '#b9a779', color: '#002623' }">{{ levels.length === 0 ? 'Start' : 'Restart'}}</Btn>
                </form>
                <p class="type-label-md" style="color: #aaa">
                    The roulette saves automatically.
                </p>
                <form class="save">
                    <p>Manual Load/Save</p>
                    <div class="btns">
                        <Btn @click.native.prevent="onImport" :style="{ backgroundColor: store.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: 'inherit' }">Import</Btn>
                        <Btn :disabled="!isActive" @click.native.prevent="onExport" :style="{ backgroundColor: store.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: 'inherit' }">Export</Btn>
                    </div>
                </form>
            </div>
            <section class="levels-container">
                <div class="levels">
                    <template v-if="levels.length > 0">
                        <!-- Completed Levels -->
                        <div class="level" v-for="(level, i) in levels.slice(0, progression.length)" :style="{ background: store.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.03)', border: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }">
                            <a :href="level.video" class="video">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="">
                            </a>
                            <div class="meta">
                                <p :style="{ color: '#b9a779' }">#{{ level.rank }}</p>
                                <h2 :style="{ color: 'inherit' }">{{ level.name }}</h2>
                                <p style="color: #b9a779; font-weight: 700">{{ progression[i] }}%</p>
                            </div>
                        </div>
                        <!-- Current Level -->
                        <div class="level" v-if="!hasCompleted" :style="{ background: store.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.03)', border: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }">
                            <a :href="currentLevel.video" target="_blank" class="video">
                                <img :src="getThumbnailFromId(getYoutubeIdFromUrl(currentLevel.video))" alt="">
                            </a>
                            <div class="meta">
                                <p :style="{ color: '#b9a779' }">#{{ currentLevel.rank }}</p>
                                <h2 :style="{ color: 'inherit' }">{{ currentLevel.name }}</h2>
                                <p :style="{ color: 'inherit', opacity: 0.7 }">{{ currentLevel.id }}</p>
                            </div>
                            <form class="actions" v-if="!givenUp" :style="{ background: 'transparent', border: 'none', padding: 0 }">
                                <input type="number" v-model="percentage" :placeholder="placeholder" :min="currentPercentage + 1" max=100 :style="{ background: store.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: store.dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)', color: 'inherit' }">
                                <Btn @click.native.prevent="onDone" :style="{ backgroundColor: '#b9a779', color: '#002623' }">Done</Btn>
                                <Btn @click.native.prevent="onGiveUp" style="background-color: rgba(206, 17, 38, 0.15); color: #ce1126; border: 1px solid #ce1126;">Give Up</Btn>
                            </form>
                        </div>
                        <!-- Results -->
                        <div v-if="givenUp || hasCompleted" class="results" :style="{ background: store.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.03)', border: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }">
                            <h1 :style="{ color: '#b9a779' }">Results</h1>
                            <p :style="{ color: 'inherit' }">Number of levels: {{ progression.length }}</p>
                            <p :style="{ color: 'inherit' }">Highest percent: {{ currentPercentage }}%</p>
                            <Btn v-if="currentPercentage < 99 && !hasCompleted" @click.native.prevent="showRemaining = true" :style="{ backgroundColor: '#b9a779', color: '#002623' }">Show remaining levels</Btn>
                        </div>
                        <!-- Remaining Levels -->
                        <template v-if="givenUp && showRemaining">
                            <div class="level" v-for="(level, i) in levels.slice(progression.length + 1, levels.length - currentPercentage + progression.length)" :style="{ background: store.dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.03)', border: store.dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }">
                                <a :href="level.video" target="_blank" class="video">
                                    <img :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))" alt="">
                                </a>
                                <div class="meta">
                                    <p :style="{ color: '#b9a779' }">#{{ level.rank }}</p>
                                    <h2 :style="{ color: 'inherit' }">{{ level.name }}</h2>
                                    <p style="color: #ce1126; font-weight: 700">{{ currentPercentage + 2 + i }}%</p>
                                </div>
                            </div>
                        </template>
                    </template>
                </div>
            </section>
            <div class="toasts-container">
                <div class="toasts">
                    <div v-for="toast in toasts" class="toast">
                        <p>{{ toast }}</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        loading: false,
        levels: [],
        progression: [],
        percentage: undefined,
        givenUp: false,
        showRemaining: false,
        toasts: [],
        fileInput: undefined,
        store,
    }),
    mounted() {
        document.title = 'SDL Roulette';
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        const roulette = JSON.parse(localStorage.getItem('roulette'));

        if (!roulette) {
            return;
        }

        this.levels = roulette.levels;
        this.progression = roulette.progression;
    },
    computed: {
        currentLevel() {
            return this.levels[this.progression.length];
        },
        currentPercentage() {
            return this.progression[this.progression.length - 1] || 0;
        },
        placeholder() {
            return `At least ${this.currentPercentage + 1}%`;
        },
        hasCompleted() {
            return (
                this.progression[this.progression.length - 1] >= 100 ||
                this.progression.length === this.levels.length
            );
        },
        isActive() {
            return (
                this.progression.length > 0 &&
                !this.givenUp &&
                !this.hasCompleted
            );
        },
    },
    methods: {
        shuffle,
        getThumbnailFromId,
        getYoutubeIdFromUrl,
        async onStart() {
            if (this.isActive) {
                this.showToast('Give up before starting a new roulette.');
                return;
            }

            this.loading = true;

            const fullList = await fetchList();

            if (fullList.filter(([_, err]) => err).length > 0) {
                this.loading = false;
                this.showToast(
                    'List is currently broken. Wait until it\'s fixed to start a roulette.',
                );
                return;
            }

            const list = fullList.map(([lvl, _], i) => ({
                rank: i + 1,
                id: lvl.id,
                name: lvl.name,
                video: lvl.verification,
            }));

            this.levels = shuffle(list).slice(0, 100);
            this.showRemaining = false;
            this.givenUp = false;
            this.progression = [];
            this.percentage = undefined;

            this.loading = false;
        },
        save() {
            localStorage.setItem(
                'roulette',
                JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                }),
            );
        },
        onDone() {
            if (!this.percentage) {
                return;
            }

            if (
                this.percentage <= this.currentPercentage ||
                this.percentage > 100
            ) {
                this.showToast('Invalid percentage.');
                return;
            }

            this.progression.push(this.percentage);
            this.percentage = undefined;

            this.save();
        },
        onGiveUp() {
            this.givenUp = true;
            localStorage.removeItem('roulette');
        },
        onImport() {
            if (
                this.isActive &&
                !window.confirm('This will overwrite the currently running roulette. Continue?')
            ) {
                return;
            }

            this.fileInput.showPicker();
        },
        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;

            const file = this.fileInput.files[0];

            if (file.type !== 'application/json') {
                this.showToast('Invalid file.');
                return;
            }

            try {
                const roulette = JSON.parse(await file.text());

                if (!roulette.levels || !roulette.progression) {
                    this.showToast('Invalid file.');
                    return;
                }

                this.levels = roulette.levels;
                this.progression = roulette.progression;
                this.save();
                this.givenUp = false;
                this.showRemaining = false;
                this.percentage = undefined;
            } catch {
                this.showToast('Invalid file.');
                return;
            }
        },
        onExport() {
            const file = new Blob(
                [JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                })],
                { type: 'application/json' },
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = 'tsl_roulette';
            a.click();
            URL.revokeObjectURL(a.href);
        },
        showToast(msg) {
            this.toasts.push(msg);
            setTimeout(() => {
                this.toasts.shift();
            }, 3000);
        },
    },
};