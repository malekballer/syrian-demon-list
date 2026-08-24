import { store } from "../main.js";
import { supabase } from "../supabase.js";

const GOVERNORATES = [
    "Damascus", "Rif Dimashq", "Aleppo", "Homs", "Hama", 
    "Latakia", "Tartus", "Idlib", "Daraa", "As-Suwayda", 
    "Quneitra", "Deir ez-Zor", "Raqqa", "Al-Hasakah"
];

export default {
    template: `
        <div v-if="store.showProfileModal" class="modal-overlay" @click.self="close">
            <div class="modal-card" :class="{ dark: store.dark }">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <h2 style="margin: 0; font-size: 1.35rem; font-weight: 800;">Edit Profile</h2>
                    <button @click="close" style="background: none; border: none; color: inherit; font-size: 1.2rem; cursor: pointer; opacity: 0.7;">✕</button>
                </div>

                <div v-if="saved" style="text-align: center; padding: 1.5rem 0;">
                    <p style="font-size: 1.1rem; font-weight: 700; color: #00FF80; margin-bottom: 0.5rem;">Profile Updated!</p>
                    <button @click="close" class="syrian-cta" style="margin-top: 1rem; padding: 0.5rem 1.2rem; border-radius: 8px;">Close</button>
                </div>

                <form v-else @submit.prevent="saveProfile" style="display: flex; flex-direction: column; gap: 1rem;">
                    <!-- Avatar Preview -->
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img 
                            :src="store.profile?.pfp_url || store.user?.user_metadata?.avatar_url || 'https://assets.aredl.net/avatars/default.png'" 
                            alt="Avatar" 
                            style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid #007A3D;"
                        />
                        <div>
                            <span class="type-label-lg" style="font-weight: 800; display: block;">{{ store.user?.user_metadata?.full_name || 'Player' }}</span>
                            <span class="type-label-sm" style="opacity: 0.6; font-size: 0.75rem;">Discord: {{ store.user?.user_metadata?.preferred_username || 'N/A' }}</span>
                        </div>
                    </div>

                    <!-- Display Name -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Leaderboard Display Name *</label>
                        <input type="text" v-model="form.username" required class="modal-input" placeholder="Your Geometry Dash Name" />
                    </div>

                    <!-- Governorate Select -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Governorate (Flag / Location)</label>
                        <select v-model="form.governorate" class="modal-input">
                            <option value="" disabled>Select Governorate...</option>
                            <option v-for="gov in governorates" :key="gov" :value="gov" class="dark-option">
                                {{ gov }}
                            </option>
                        </select>
                    </div>

                    <!-- Bio -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">Bio / Quote</label>
                        <textarea v-model="form.bio" class="modal-input" rows="2" placeholder="Top 1 Demon Slayer..."></textarea>
                    </div>

                    <!-- YouTube Link -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8;">YouTube Channel</label>
                        <input type="url" v-model="form.youtube" class="modal-input" placeholder="https://youtube.com/@yourchannel" />
                    </div>

                    <p v-if="errorMsg" style="color: #ce1126; font-size: 0.85rem; margin: 0; font-weight: 600;">{{ errorMsg }}</p>

                    <button type="submit" :disabled="saving" class="syrian-cta" style="padding: 0.75rem; border-radius: 8px; font-size: 1rem; margin-top: 0.5rem;">
                        {{ saving ? 'Saving...' : 'Save Profile' }}
                    </button>
                </form>
            </div>
        </div>
    `,
    data: () => ({
        store,
        governorates: GOVERNORATES,
        saving: false,
        saved: false,
        errorMsg: '',
        form: {
            username: '',
            governorate: '',
            bio: '',
            youtube: ''
        }
    }),
    watch: {
        'store.showProfileModal'(val) {
            if (val) this.initForm();
        }
    },
    mounted() {
        this.initForm();
    },
    methods: {
        initForm() {
            this.saved = false;
            this.errorMsg = '';
            if (this.store.profile) {
                this.form.username = this.store.profile.username || '';
                this.form.governorate = this.store.profile.governorate || 'Damascus';
                this.form.bio = this.store.profile.bio || '';
                this.form.youtube = this.store.profile.youtube || '';
            }
        },
        close() {
            this.store.showProfileModal = false;
        },
        async saveProfile() {
            this.saving = true;
            this.errorMsg = '';

            const { error } = await supabase
                .from('profiles')
                .update({
                    username: this.form.username.trim(),
                    governorate: this.form.governorate,
                    bio: this.form.bio.trim(),
                    youtube: this.form.youtube.trim()
                })
                .eq('id', this.store.user.id);

            this.saving = false;

            if (error) {
                this.errorMsg = error.message;
            } else {
                await this.store.checkAuth();
                this.saved = true;
            }
        }
    }
};
