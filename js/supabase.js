const SUPABASE_URL = 'https://bgqxqffdumhowetcotsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncXhxZmZkdW1ob3dldGNvdHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODA0MzgsImV4cCI6MjEwMzE1NjQzOH0.tMe0gF4_QqtP-qmdgM9o0OALu3t_a9hhEtw5-VFTWZ8';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth Helper Functions
export async function loginWithDiscord() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: window.location.origin + window.location.pathname,
            // Requests permissions to verify server membership and read roles
            scopes: 'identify email guilds.members.read'
        }
    });
    if (error) console.error('Discord login error:', error.message);
    return data;
}

export async function logoutUser() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error.message);
}

export async function getAuthenticatedUser() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return null;

    // Check if profile exists; use maybeSingle() so it doesn't throw errors when empty
    let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (!profile) {
        const meta = user.user_metadata || {};
        const username = meta.full_name || meta.name || meta.preferred_username || meta.user_name || `Player_${user.id.slice(0, 5)}`;
        const pfpUrl = meta.avatar_url || meta.picture || null;
        const discordTag = meta.preferred_username || meta.user_name || null;

        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([
                { 
                    id: user.id, 
                    username: username, 
                    pfp_url: pfpUrl,
                    discord_tag: discordTag,
                    governorate: 'Damascus'
                }
            ])
            .select()
            .maybeSingle();

        if (!insertError) {
            profile = newProfile;
        } else {
            console.error('Error creating profile row:', insertError.message);
        }
    }

    return { user, profile };
}