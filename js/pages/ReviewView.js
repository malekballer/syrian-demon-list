import { store } from "../main.js";
import { supabase } from "../supabase.js";

export default {
    template: `
        <main class="surface" :class="{ dark: store.dark }" style="min-height: 85vh; padding: 2.5rem 1.5rem;">
            <div style="max-width: 900px; margin: 0 auto;">
                <!-- Header Bar -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(128,128,128,0.2); padding-bottom: 1.25rem;">
                    <div>
                        <h1 style="font-size: 2rem; font-weight: 800; margin: 0;">Editor Review Queue</h1>
                        <p style="opacity: 0.75; font-size: 0.95rem; margin-top: 0.35rem;">Approve or reject pending record submissions.</p>
                    </div>
                    <button @click="fetchPending" class="syrian-cta" style="padding: 0.55rem 1.25rem; border-radius: 8px; font-size: 0.9rem;">Refresh Queue</button>
                </div>

                <!-- Access Denied Guard -->
                <div v-if="!store.profile?.is_editor" style="text-align: center; padding: 4rem 1.5rem; background: rgba(206,17,38,0.1); border: 1px solid rgba(206,17,38,0.3); border-radius: 14px;">
                    <h3 style="color: #ce1126; font-size: 1.35rem; font-weight: 800; margin-bottom: 0.5rem;">Access Restricted</h3>
                    <p style="opacity: 0.85; font-size: 0.95rem;">You need Editor permissions to view and process submissions.</p>
                </div>

                <!-- Loading State -->
                <div v-else-if="loading" style="text-align: center; padding: 4rem 1rem; opacity: 0.7; font-size: 1.1rem; font-weight: 700;">
                    Loading pending queue...
                </div>

                <!-- Empty State -->
                <div v-else-if="submissions.length === 0" style="text-align: center; padding: 4rem 1.5rem; background: rgba(128,128,128,0.06); border: 1px solid rgba(128,128,128,0.15); border-radius: 14px;">
                    <p style="font-size: 1.25rem; font-weight: 800; color: #00FF80; margin-bottom: 0.35rem;">Queue Clear!</p>
                    <p style="opacity: 0.7; font-size: 0.9rem;">No pending record submissions waiting for review.</p>
                </div>

                <!-- Pending Submissions Cards -->
                <div v-else style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div 
                        v-for="sub in submissions" 
                        :key="sub.id" 
                        style="background: rgba(128,128,128,0.08); border: 1px solid rgba(128,128,128,0.18); border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 4px 16px rgba(0,0,0,0.15);"
                    >
                        <!-- Card Top Row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(128,128,128,0.12); padding-bottom: 0.85rem;">
                            <div>
                                <span style="font-size: 1.4rem; font-weight: 800; color: #00FF80;">{{ sub.level_name }}</span>
                                <span style="font-size: 1.1rem; font-weight: 700; opacity: 0.9; margin-left: 0.6rem;">({{ sub.percent }}%)</span>
                            </div>
                            <span style="font-size: 0.75rem; opacity: 0.5; font-family: monospace;">ID: {{ sub.id.slice(0, 8) }}</span>
                        </div>

                        <!-- Player Info Header -->
                        <div style="display: flex; align-items: center; gap: 1rem; background: rgba(128,128,128,0.08); padding: 0.85rem 1.1rem; border-radius: 10px;">
                            <img 
                                :src="sub.profiles?.pfp_url || 'https://assets.aredl.net/avatars/default.png'" 
                                alt="Avatar" 
                                style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 2px solid #007A3D; flex-shrink: 0;"
                            />
                            <div>
                                <span style="font-weight: 800; font-size: 1.05rem; display: block;">
                                    {{ sub.profiles?.username || 'Player' }}
                                </span>
                                <span style="font-size: 0.8rem; opacity: 0.6;">
                                    Governorate: {{ sub.profiles?.governorate || 'Unspecified' }}
                                </span>
                            </div>
                        </div>

                        <!-- Submission Details -->
                        <div style="font-size: 0.9rem; opacity: 0.85; line-height: 1.4;">
                            <strong>Details:</strong> {{ sub.notes || 'None provided' }}
                        </div>

                        <!-- Video Proof Links -->
                        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                            <a :href="sub.video_link" target="_blank" style="color: #c0a25c; font-weight: 800; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(192, 162, 92, 0.12); padding: 0.45rem 0.9rem; border-radius: 8px; border: 1px solid rgba(192, 162, 92, 0.3);">
                                ▶ Watch Completion Video
                            </a>
                        </div>

                        <!-- Action Buttons -->
                        <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                            <button 
                                @click="approve(sub.id)" 
                                :disabled="sub.processing"
                                style="flex: 1; background: #007A3D; color: #ffffff; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.95rem;"
                                :style="{ opacity: sub.processing ? 0.5 : 1 }"
                            >
                                {{ sub.processing ? 'Approving...' : 'Approve Record' }}
                            </button>
                            <button 
                                @click="reject(sub.id)" 
                                :disabled="sub.processing"
                                style="flex: 1; background: #ce1126; color: #ffffff; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 0.95rem;"
                                :style="{ opacity: sub.processing ? 0.5 : 1 }"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        store,
        submissions: [],
        loading: true
    }),
    async mounted() {
        await this.fetchPending();
    },
    methods: {
        async fetchPending() {
            this.loading = true;

            // Fetch submissions and fall back to plain query if relational join fails
            const { data, error } = await supabase
                .from('submissions')
                .select('*, profiles(username, pfp_url, governorate)')
                .or('status.eq.pending,status.is.null')
                .order('created_at', { ascending: true });

            if (error) {
                // Fallback fetch if relationship error occurs
                const { data: fallbackData } = await supabase
                    .from('submissions')
                    .select('*')
                    .or('status.eq.pending,status.is.null')
                    .order('created_at', { ascending: true });

                this.submissions = (fallbackData || []).map(s => ({ ...s, processing: false }));
            } else {
                this.submissions = (data || []).map(s => ({ ...s, processing: false }));
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

            if (error) {
                alert("Approval Error: " + error.message);
                if (item) item.processing = false;
            } else {
                this.submissions = this.submissions.filter(s => s.id !== id);
            }
        },
        async reject(id) {
            const reason = prompt("Enter rejection reason (optional):");
            if (reason === null) return;

            const item = this.submissions.find(s => s.id === id);
            if (item) item.processing = true;

            const { error } = await supabase
                .from('submissions')
                .update({ status: 'rejected', reject_reason: reason })
                .eq('id', id);

            if (error) {
                alert("Rejection Error: " + error.message);
                if (item) item.processing = false;
            } else {
                this.submissions = this.submissions.filter(s => s.id !== id);
            }
        }
    }
};
