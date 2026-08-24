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
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Level</label>
                        <select v-model="form.level_id" required class="modal-input">
                            <option value="" disabled>Select a level...</option>
                            <option v-for="(item, index) in list" :key="item[0]?.id" :value="item[0]?.id">
                                #{{ index + 1 }} - {{ item[0]?.name }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Progress (%)</label>
                        <input type="number" min="1" max="100" v-model.number="form.percent" required class="modal-input" placeholder="100" />
                    </div>

                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Video Proof Link</label>
                        <input type="url" v-model="form.video_link" required class="modal-input" placeholder="https://youtube.com/watch?v=..." />
                    </div>

                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Notes / Comments (Optional)</label>
                        <textarea v-model="form.notes" class="modal-input" rows="3" placeholder="FPS, raw footage links, etc."></textarea>
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
            video_link: '',
            notes: ''
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
            this.form = { level_id: '', percent: 100, video_link: '', notes: '' };
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
                    notes: this.form.notes
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
