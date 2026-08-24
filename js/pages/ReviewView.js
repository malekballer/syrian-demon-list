import { store } from "../main.js";
import { supabase } from "../supabase.js";

export default {
    template: `
        <div class="page-container" style="padding: 2rem 1rem; max-width: 900px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <div>
                    <h1 style="font-size: 1.8rem; font-weight: 800; margin: 0;">Editor Review Queue</h1>
                    <p style="opacity: 0.7; font-size: 0.9rem; margin-top: 0.25rem;">Approve or reject pending record submissions.</p>
                </div>
                <button @click="fetchPending" class="syrian-cta" style="padding: 0.4rem 0.9rem; border-radius: 6px; font-size: 0.85rem;">Refresh</button>
            </div>

            <!-- Access Denied -->
            <div v-if="!store.profile?.is_editor" style="text-align: center; padding: 4rem 1rem; background: rgba(0,0,0,0.2); border-radius: 12px;">
                <h3 style="color: #ce1126; font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem;">Access Restricted</h3>
                <p style="opacity: 0.8; font-size: 0.95rem;">You need Editor permissions to view this dashboard.</p>
            </div>

            <!-- Pending List -->
            <div v-else-if="loading" style="text-align: center; padding: 3rem; opacity: 0.7;">
                Loading submissions...
            </div>

            <div v-else-if="submissions.length === 0" style="text-align: center; padding: 3rem; background: rgba(0,0,0,0.15); border-radius: 12px;">
                <p style="font-size: 1.05rem; font-weight: 700; color: #00FF80;">Queue Clear!</p>
                <p style="opacity: 0.7; font-size: 0.85rem;">No pending submissions waiting for review.</p>
            </div>

            <div v-else style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div 
                    v-for="sub in submissions" 
                    :key="sub.id" 
                    style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;"
                >
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <span style="font-size: 1.2rem; font-weight: 800; color: #00FF80;">{{ sub.level_name }}</span>
                            <span style="font-size: 0.95rem; font-weight: 700; opacity: 0.9; margin-left: 0.5rem;">({{ sub.percent }}%)</span>
                        </div>
                        <span style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase; font-weight: bold;">ID: {{ sub.id }}</span>
                    </div>

                    <div style="display: flex; gap: 1rem; font-size: 0.85rem; opacity: 0.85; flex-wrap: wrap;">
                        <div><strong>Player ID:</strong> {{ sub.user_id }}</div>
                        <div><strong>Details:</strong> {{ sub.notes }}</div>
                    </div>

                    <!-- Video Links -->
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.25rem;">
                        <a :href="sub.video_link" target="_blank" style="color: #c0a25c; font-weight: 700; font-size: 0.85rem; text-decoration: none;">▶ View Proof Video</a>
                    </div>

                    <!-- Review Actions -->
                    <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem; align-items: center;">
                        <button 
                            @click="approve(sub.id)" 
                            :disabled="sub.processing"
                            style="background: #007A3D; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 700; cursor: pointer;"
                        >
                            Approve
                        </button>
                        <button 
                            @click="reject(sub.id)" 
                            :disabled="sub.processing"
                            style="background: #ce1126; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 700; cursor: pointer;"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    data: () => ({
        store,
        submissions: [],
        loading: true
    }),
    async mounted() {
        if (this.store.profile?.is_editor) {
            await this.fetchPending();
        } else {
            this.loading = false;
        }
    },
    methods: {
        async fetchPending() {
            this.loading = true;
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (!error && data) {
                this.submissions = data.map(s => ({ ...s, processing: false }));
            }
            this.loading = false;
        },
        async approve(id) {
            const item = this.submissions.find(s => s.id === id);
            if (item) item.processing = true;

            const { error } = await supabase
                .from('submissions')
                .update({ status: 'approved' })
                .eq('id', id);

            if (!error) {
                this.submissions = this.submissions.filter(s => s.id !== id);
            }
        },
        async reject(id) {
            const reason = prompt("Enter rejection reason (optional):");
            if (reason === null) return; // Cancelled

            const item = this.submissions.find(s => s.id === id);
            if (item) item.processing = true;

            const { error } = await supabase
                .from('submissions')
                .update({ status: 'rejected', reject_reason: reason })
                .eq('id', id);

            if (!error) {
                this.submissions = this.submissions.filter(s => s.id !== id);
            }
        }
    }
};
