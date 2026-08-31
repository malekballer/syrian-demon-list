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
                    <!-- User Header Preview -->
                    <div style="display: flex; align-items: center; gap: 1rem; background: rgba(0,0,0,0.15); padding: 0.75rem; border-radius: 10px;">
                        <img 
                            :src="form.pfp_url || store.profile?.pfp_url || store.user?.user_metadata?.avatar_url || 'https://assets.aredl.net/avatars/default.png'" 
                            alt="Avatar" 
                            style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid #b9a779; flex-shrink: 0;"
                        />
                        <div>
                            <span class="type-label-lg" style="font-weight: 800; display: block; font-size: 1.1rem;">{{ form.username || 'Player' }}</span>
                            <span class="type-label-sm" style="opacity: 0.6; font-size: 0.8rem;">Discord: {{ discordTag }}</span>
                        </div>
                    </div>

                    <!-- Display Name -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8; font-weight: 700;">Leaderboard Display Name *</label>
                        <input type="text" v-model="form.username" required style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.95rem; box-sizing: border-box;" placeholder="Your Geometry Dash Name" />
                    </div>

                    <!-- Custom Avatar Link -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8; font-weight: 700;">Profile Picture URL</label>
                        <input type="url" v-model="form.pfp_url" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.95rem; box-sizing: border-box;" placeholder="https://i.imgur.com/your-image.png" />
                    </div>

                    <!-- Governorate Select -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8; font-weight: 700;">Governorate</label>
                        <select v-model="form.governorate" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.95rem; box-sizing: border-box;">
                            <option value="" disabled style="background: #002623; color: #edebe0;">Select Governorate...</option>
                            <option v-for="gov in governorates" :key="gov" :value="gov" style="background: #002623; color: #edebe0;">
                                {{ gov }}
                            </option>
                        </select>
                    </div>

                    <!-- Bio -->
                    <div>
                        <label class="type-label-sm" style="display: block; margin-bottom: 0.35rem; opacity: 0.8; font-weight: 700;">Bio / Quote</label>
                        <textarea v-model="form.bio" rows="2" style="width: 100%; padding: 0.7rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.95rem; box-sizing: border-box; resize: vertical;" placeholder="Top 1 Demon Slayer..."></textarea>
                    </div>

                    <!-- Visual Preferences Section -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.85rem; margin-top: 0.25rem;">
                        <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                            <span class="type-label-sm" style="opacity: 0.9; font-weight: 700;">Disable Background Mosaic Pattern</span>
                            <input 
                                type="checkbox" 
                                v-model="form.disable_bg_pattern" 
                                style="width: 20px; height: 20px; accent-color: #b9a779; cursor: pointer;"
                            />
                        </label>
                    </div>

                    <!-- Socials Section -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.85rem; display: flex; flex-direction: column; gap: 0.65rem;">
                        <span class="type-label-sm" style="font-weight: 800; opacity: 0.9;">Social Links</span>

                        <input type="url" v-model="form.spreadsheet" style="width: 100%; padding: 0.65rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem; box-sizing: border-box;" placeholder="Spreadsheet URL" />
                        <input type="url" v-model="form.youtube" style="width: 100%; padding: 0.65rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem; box-sizing: border-box;" placeholder="YouTube Channel URL" />
                        <input type="url" v-model="form.twitch" style="width: 100%; padding: 0.65rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem; box-sizing: border-box;" placeholder="Twitch URL" />
                        <input type="url" v-model="form.twitter" style="width: 100%; padding: 0.65rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem; box-sizing: border-box;" placeholder="Twitter / X URL" />
                        <input type="url" v-model="form.instagram" style="width: 100%; padding: 0.65rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem; box-sizing: border-box;" placeholder="Instagram URL" />
                        <input type="url" v-model="form.tiktok" style="width: 100%; padding: 0.65rem 0.9rem; background: rgba(0,20,18,0.9); border: 1px solid rgba(185,167,121,0.35); border-radius: 10px; color: #edebe0; font-family: 'Lexend Deca', sans-serif; font-size: 0.9rem; box-sizing: border-box;" placeholder="TikTok URL" />
                    </div>

                    <p v-if="errorMsg" style="color: #ce1126; font-size: 0.85rem; margin: 0; font-weight: 600;">{{ errorMsg }}</p>

                    <button type="submit" :disabled="saving" class="syrian-cta" style="padding: 0.75rem; border-radius: 10px; font-size: 1rem; margin-top: 0.5rem; width: 100%;">
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
            pfp_url: '',
            governorate: '',
            bio: '',
            spreadsheet: '',
            youtube: '',
            twitch: '',
            twitter: '',
            instagram: '',
            tiktok: '',
            disable_bg_pattern: false
        }
    }),
    computed: {
        discordTag() {
            const meta = this.store.user?.user_metadata;
            if (!meta) return 'N/A';
            return meta.preferred_username || meta.user_name || meta.custom_claims?.preferred_username || meta.full_name || 'Connected';
        }
    },
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
                this.form.pfp_url = this.store.profile.pfp_url || '';
                this.form.governorate = this.store.profile.governorate || 'Damascus';
                this.form.bio = this.store.profile.bio || '';
                this.form.spreadsheet = this.store.profile.spreadsheet || '';
                this.form.youtube = this.store.profile.youtube || '';
                this.form.twitch = this.store.profile.twitch || '';
                this.form.twitter = this.store.profile.twitter || '';
                this.form.instagram = this.store.profile.instagram || '';
                this.form.tiktok = this.store.profile.tiktok || '';
                this.form.disable_bg_pattern = this.store.profile.disable_bg_pattern || false;
            }
        },
        close() {
            this.store.showProfileModal = false;
        },
        async saveProfile() {
            this.saving = true;
            this.errorMsg = '';

            const tagToSave = (this.discordTag !== 'N/A' && this.discordTag !== 'Connected')
                ? this.discordTag
                : (this.store.profile?.discord_tag || null);

            const pfpToSave = this.form.pfp_url.trim() || 
                this.store.user?.user_metadata?.avatar_url || 
                this.store.user?.user_metadata?.picture || 
                null;

            const { error } = await supabase
                .from('profiles')
                .update({
                    username: this.form.username.trim(),
                    discord_tag: tagToSave,
                    pfp_url: pfpToSave,
                    governorate: this.form.governorate,
                    bio: this.form.bio.trim(),
                    spreadsheet: this.form.spreadsheet.trim(),
                    youtube: this.form.youtube.trim(),
                    twitch: this.form.twitch.trim(),
                    twitter: this.form.twitter.trim(),
                    instagram: this.form.instagram.trim(),
                    tiktok: this.form.tiktok.trim(),
                    disable_bg_pattern: this.form.disable_bg_pattern
                })
                .eq('id', this.store.user.id);

            this.saving = false;

            if (error) {
                this.errorMsg = error.message;
            } else {
                // Apply background pattern toggle globally/instantly on body
                if (this.form.disable_bg_pattern) {
                    document.body.classList.add('no-bg-pattern');
                } else {
                    document.body.classList.remove('no-bg-pattern');
                }
                
                await this.store.checkAuth();
                this.saved = true;
            }
        }
    }
};