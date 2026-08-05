// ==========================================================
// WinzoIndia - Supabase Configuration
// Keys are loaded from env.js (gitignored).
// ==========================================================
(function initSupabase() {
  var env = window.WINZO_ENV || {};
  var url  = env.SUPABASE_URL;
  var anon = env.SUPABASE_ANON;

  if (!url || !anon || url.startsWith("YOUR_")) {
    console.warn("[WinzoIndia] Supabase env not configured. Copy env.example.js → env.js and fill in keys.");
    return;
  }
  if (!window.supabase) {
    console.warn("[WinzoIndia] Supabase SDK not loaded.");
    return;
  }
  window.WINZO_SB = window.supabase.createClient(url, anon);
  console.info("[WinzoIndia] Supabase initialised.");

  // Restore persisted session so auth.updateUser() works across page navigations
  try {
    const stored = localStorage.getItem("winzo_sb_session");
    if (stored) {
      const s = JSON.parse(stored);
      window.WINZO_SB.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token })
        .then(({ data }) => {
          if (data?.session) localStorage.setItem("winzo_sb_session", JSON.stringify(data.session));
        })
        .catch(() => localStorage.removeItem("winzo_sb_session"));
    }
  } catch(e) {}
})();
