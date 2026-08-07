// ============================================================
// WinzoIndia — Environment Config EXAMPLE
// Copy this to env.js and fill in real values.
// env.js is gitignored — never commit real keys.
// ============================================================
window.WINZO_ENV = {
  SUPABASE_URL:  "YOUR_SUPABASE_URL",
  SUPABASE_ANON: "YOUR_SUPABASE_ANON_KEY",
  BACKEND_URL:   "http://localhost:8001",

  // Storage provider: "supabase" | "storj"
  STORAGE_PROVIDER: "supabase",

  // Storj credentials (fill when switching to storj)
  STORJ_ENDPOINT:   "YOUR_STORJ_ENDPOINT",   // e.g. https://gateway.storjshare.io
  STORJ_BUCKET:     "YOUR_STORJ_BUCKET",
  STORJ_UPLOAD_URL: "YOUR_STORJ_UPLOAD_PROXY_URL", // your backend presigned-url endpoint
};
