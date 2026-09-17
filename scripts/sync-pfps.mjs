import { readFileSync, existsSync } from "node:fs";

const SUPABASE_URL = "https://bgqxqffdumhowetcotsj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJncXhxZmZkdW1ob3dldGNvdHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODA0MzgsImV4cCI6MjEwMzE1NjQzOH0.tMe0gF4_QqtP-qmdgM9o0OALu3t_a9hhEtw5-VFTWZ8";

async function run() {
  console.log("Fetching profiles from Supabase...");

  // 1. Fetch current profiles
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch profiles:", await res.text());
    return;
  }

  const profiles = await res.json();
  console.log(`Found ${profiles.length} profiles.`);

  // 2. Load avatars from data/editors.json as an additional source
  const editorAvatars = new Map();
  if (existsSync("data/editors.json")) {
    try {
      const editors = JSON.parse(readFileSync("data/editors.json", "utf8"));
      editors.forEach((e) => {
        if (e.name && e.pfp) editorAvatars.set(e.name.toLowerCase(), e.pfp);
      });
    } catch {}
  }

  let updatedCount = 0;

  for (const profile of profiles) {
    const usernameKey = (profile.username || "").toLowerCase();
    const editorPfp = editorAvatars.get(usernameKey);

    if (editorPfp && profile.pfp_url !== editorPfp) {
      console.log(`Updating avatar for ${profile.username}...`);

      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ pfp_url: editorPfp }),
      });

      if (updateRes.ok) {
        updatedCount++;
      }
    }
  }

  console.log(`Finished! Updated ${updatedCount} profile pictures.`);
}

run().catch(console.error);