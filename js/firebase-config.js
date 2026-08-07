// ==========================================================
// WinzoIndia - Firebase Configuration
// Values below are placeholders. Replace with your actual
// Firebase project credentials before going live.
// Or dynamically load them from your environment.
// ==========================================================

// TODO: Replace these placeholder values with your Firebase project's config.
// You can find these values at:  https://console.firebase.google.com/  →
//   Project Settings → General → Your apps → Web app → SDK setup and configuration.

window.WINZO_FIREBASE_CONFIG = {
  apiKey:            "YOUR_FIREBASE_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Firebase Web SDK is loaded via <script> tags in each HTML page (see HTML head).
// This helper initializes Firebase safely and exposes shared instances.

(function initFirebase() {
  const cfg = window.WINZO_FIREBASE_CONFIG;
  const isConfigured =
    cfg && cfg.apiKey && !String(cfg.apiKey).startsWith("YOUR_");

  window.WINZO_FIREBASE_READY = false;

  if (!window.firebase || typeof window.firebase.initializeApp !== "function") {
    // Firebase SDK not loaded; app falls back to local (mock) storage.
    console.info("[WinzoIndia] Firebase SDK not loaded. Using local fallback.");
    return;
  }

  if (!isConfigured) {
    console.warn(
      "[WinzoIndia] Firebase config placeholder detected. " +
      "Add real credentials in /public/js/firebase-config.js. " +
      "Falling back to localStorage for demo purposes."
    );
    return;
  }

  try {
    if (!window.firebase.apps || window.firebase.apps.length === 0) {
      window.firebase.initializeApp(cfg);
    }
    window.WINZO_AUTH    = window.firebase.auth ? window.firebase.auth() : null;
    window.WINZO_STORE   = window.firebase.firestore ? window.firebase.firestore() : null;
    window.WINZO_STORAGE = window.firebase.storage ? window.firebase.storage() : null;
    window.WINZO_FIREBASE_READY = true;
    console.info("[WinzoIndia] Firebase initialised.");
  } catch (err) {
    console.error("[WinzoIndia] Firebase init failed:", err);
  }
})();
