const SUPABASE_URL = 'https://bgqxqffdumhowetcotsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncXhxZmZkdW1ob3dldGNvdHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODA0MzgsImV4cCI6MjEwMzE1NjQzOH0.tMe0gF4_QqtP-qmdgM9o0OALu3t_a9hhEtw5-VFTWZ8';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth Helper Functions
export async function loginWithDiscord() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
            redirectTo: window.location.origin + window.location.pathname
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

    // Check if user profile exists in public.profiles; if not, create it automatically from Discord metadata
    let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) {
        const username = user.user_metadata?.full_name || user.user_metadata?.name || 'Geometry Dash Player';
        const pfpUrl = user.user_metadata?.avatar_url || null;
        const discordTag = user.user_metadata?.preferred_username || null;

        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([
                { 
                    id: user.id, 
                    username: username, 
                    pfp_url: pfpUrl,
                    discord_tag: discordTag
                }
            ])
            .select()
            .single();

        if (!insertError) {
            profile = newProfile;
        } else {
            console.error('Error creating profile row:', insertError.message);
        }
    }

    return { user, profile };
}
