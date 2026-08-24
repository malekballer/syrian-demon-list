import { store } from "../main.js";
import { fetchList } from "../content.js";
import { supabase } from "../supabase.js";

export default {
    template: `
        <div v-if="store.showSubmissionModal" class="modal-overlay" @click.self="close">
            <div class="modal-card" :class="{ dark: store.dark }">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <h2 style="margin: 0; font-size: 1.35rem; font-weight: 800;">Submit Record</h2>
                    <button @click="close" style="background: none; border: none; color: inherit; font-size: 1.2rem; cursor: pointer; opacity: 0.7;">✕</button>
                </div>

                <div v-if="submitted" style="text-align: center; padding: 1.5rem 0;">
                    <p style="font-size: 1.1rem; font-weight: 700; color: #00FF80; margin-bottom: 0.5rem;">Record Submitted!</p>
                    <p style="opacity: 0.8; font-size: 0.9rem;">Your record is now in the editor review queue.</p>
                    <button @click="close" class="syrian-cta" style="margin-top: 1rem; padding: 0.5rem 1.2rem; border-radius: 8px;">Close</button>
                </div>

                <form v-else @submit.prevent="submitRecord" style="display: flex; flex-direction: column; gap: 1rem;">
                    <!-- Leaderboard Display Name Info -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Leaderboard Display Name</label>
                        <div class="modal-input" style="opacity: 0.85; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.06);">
                            <span style="font-weight: 700;">{{ store.profile?.username || store.user?.user_metadata?.full_name || 'Player' }}</span>
                            <span style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase; font-weight: bold;">(From Profile)</span>
                        </div>
                    </div>

                    <!-- Level Selection -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Which level did you beat or get progress on? *</label>
                        <select v-model="form.level_id" required class="modal-input">
                            <option value="" disabled selected>Select a level...</option>
                            <option v-for="(item, index) in list" :key="item[0]?.id" :value="item[0]?.id" class="dark-option">
                                #{{ index + 1 }} - {{ item[0]?.name }}
                            </option>
                        </select>
                    </div>

                    <!-- Percentage -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">What percentage did you achieve? *</label>
                        <input type="number" min="1" max="100" v-model.number="form.percent" required class="modal-input" placeholder="100" />
                    </div>

                    <!-- Device Selection -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">What device did you play on? *</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <button 
                                type="button" 
                                @click="form.device = 'PC'"
                                :style="{
                                    flex: 1,
                                    padding: '0.55rem',
                                    borderRadius: '8px',
                                    border: form.device === 'PC' ? '2px solid #007A3D' : (store.dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)'),
                                    background: form.device === 'PC' ? 'rgba(0,122,61,0.2)' : 'transparent',
                                    color: 'inherit',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }"
                            >
                                💻 PC
                            </button>
                            <button 
                                type="button" 
                                @click="form.device = 'Mobile'"
                                :style="{
                                    flex: 1,
                                    padding: '0.55rem',
                                    borderRadius: '8px',
                                    border: form.device === 'Mobile' ? '2px solid #007A3D' : (store.dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.15)'),
                                    background: form.device === 'Mobile' ? 'rgba(0,122,61,0.2)' : 'transparent',
                                    color: 'inherit',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }"
                            >
                                📱 Mobile
                            </button>
                        </div>
                    </div>

                    <!-- Completion Link -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Link to Completion (YouTube, Twitch, etc.) *</label>
                        <input type="url" v-model="form.video_link" required class="modal-input" placeholder="https://youtube.com/watch?v=..." />
                    </div>

                    <!-- Raw Footage Link -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Link to Raw Footage (Google Drive - Required for Top 20)</label>
                        <input type="url" v-model="form.raw_link" class="modal-input" placeholder="https://drive.google.com/file/d/..." />
                    </div>

                    <p v-if="errorMsg" style="color: #ce1126; font-size: 0.85rem; margin: 0; font-weight: 600;">{{ errorMsg }}</p>

                    <button type="submit" :disabled="submitting" class="syrian-cta" style="padding: 0.75rem; border-radius: 8px; font-size: 1rem; margin-top: 0.5rem;">
                        {{ submitting ? 'Submitting...' : 'Submit Record' }}
                    </button>
                </form>
            </div>
        </div>
    `,
    data: () => ({
        store,
        list: [],
        submitting: false,
        submitted: false,
        errorMsg: '',
        form: {
            level_id: '',
            percent: 100,
            device: 'PC',
            video_link: '',
            raw_link: ''
        }
    }),
    async mounted() {
        const listData = await fetchList();
        this.list = listData;
    },
    methods: {
        close() {
            this.store.showSubmissionModal = false;
            this.submitted = false;
            this.errorMsg = '';
            this.form = { level_id: '', percent: 100, device: 'PC', video_link: '', raw_link: '' };
        },
        async submitRecord() {
            this.submitting = true;
            this.errorMsg = '';

            const selectedItem = this.list.find(i => i[0]?.id === this.form.level_id);
            const levelName = selectedItem ? selectedItem[0].name : 'Unknown Level';

            const { error } = await supabase.from('submissions').insert([
                {
                    user_id: this.store.user.id,
                    level_id: this.form.level_id.toString(),
                    level_name: levelName,
                    percent: this.form.percent,
                    video_link: this.form.video_link,
                    notes: `Device: ${this.form.device}` + (this.form.raw_link ? ` | Raw: ${this.form.raw_link}` : '')
                }
            ]);

            this.submitting = false;

            if (error) {
                this.errorMsg = error.message;
            } else {
                this.submitted = true;
            }
        }
    }
};
