// ==========================================================
// WinzoIndia - Auth utilities
// Uses Firebase when configured; else localStorage fallback.
// ==========================================================

const WZ_KEYS = {
  USERS: "winzo_users",
  SESSION: "winzo_session"
};

// In-memory caches to avoid repeated localStorage parses
let _sessionCache = undefined;
let _usersCache = null;

function wzGetUsers() {
  if (_usersCache !== null) return _usersCache;
  try { _usersCache = JSON.parse(localStorage.getItem(WZ_KEYS.USERS) || "[]"); }
  catch { _usersCache = []; }
  return _usersCache;
}
function wzSaveUsers(users) {
  _usersCache = users;
  localStorage.setItem(WZ_KEYS.USERS, JSON.stringify(users));
}
function wzSetSession(user) {
  _sessionCache = user;
  localStorage.setItem(WZ_KEYS.SESSION, JSON.stringify(user));
}
function wzGetSession() {
  if (_sessionCache !== undefined) return _sessionCache;
  try { _sessionCache = JSON.parse(localStorage.getItem(WZ_KEYS.SESSION) || "null"); }
  catch { _sessionCache = null; }
  return _sessionCache;
}
function wzClearSession() {
  _sessionCache = null;
  _usersCache = null;
  localStorage.removeItem(WZ_KEYS.SESSION);
}

function wzRequireAuth() {
  const session = wzGetSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

function wzRedirectIfAuthed() {
  if (wzGetSession()) window.location.href = "dashboard.html";
}

function wzToast(msg, type = "info", ms = 3200) {
  let node = document.getElementById("wz-toast");
  if (!node) {
    node = document.createElement("div");
    node.id = "wz-toast";
    node.className = "toast";
    node.setAttribute("data-testid", "wz-toast");
    document.body.appendChild(node);
  }
  node.textContent = msg;
  node.className = `toast ${type} show`;
  clearTimeout(node._t);
  node._t = setTimeout(() => node.classList.remove("show"), ms);
}

async function compressImage(file, maxWidthPx, qualityVal) {
  if (file.type === "application/pdf") return file; // skip PDFs
  return new Promise(function(resolve) {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function(blob) {
        resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
      }, "image/jpeg", qualityVal);
    };
    img.onerror = function() { resolve(file); };
    img.src = url;
  });
}
window.compressImage = compressImage;

// ── Storj upload (shared for KYC + screenshots + reports) ──
// Returns { url, key } on success, or throws.
async function wzUploadToStorj(file, folder, token) {
  const fnUrl = window.WINZO_ENV?.SUPABASE_URL + "/functions/v1/storj-upload";
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder })
  });
  if (!res.ok) throw new Error("Presign failed: " + res.status);
  const { uploadUrl, publicUrl, key } = await res.json();
  await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return { url: publicUrl, key };
}
window.wzUploadToStorj = wzUploadToStorj;

async function wzUploadKycFile(file, uid, token) {
  if (window.WINZO_SB && token) {
    try {
      const { url, key } = await wzUploadToStorj(file, "kyc/" + uid, token);
      return { kycUrl: url, kycKey: key };
    } catch (e) { console.warn("Storj KYC upload failed:", e.message); }
  }
  // Fallback: base64
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { kycUrl: dataUrl, kycKey: null };
}

async function wzSignup(payload) {
  // payload: { fullName, phone, email, password, kycType, kycFile }

  // ── Duplicate check (Supabase-first, localStorage fallback) ──
  if (window.WINZO_SB) {
    const { data: existing } = await window.WINZO_SB.from("users")
      .select("uid").or(`email.eq.${payload.email},phone.eq.${payload.phone}`).limit(1);
    if (existing && existing.length) throw new Error("An account with this email or phone already exists.");
  } else {
    const users = wzGetUsers();
    if (users.find(u => u.email === payload.email || u.phone === payload.phone))
      throw new Error("An account with this email or phone already exists.");
  }

  let uid = "u_" + Date.now();
  let sbToken = null;

  // ── Supabase Auth FIRST so we have real uid + token for KYC upload ──
  if (window.WINZO_SB) {
    try {
      const { data, error } = await window.WINZO_SB.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: { data: { fullName: payload.fullName, phone: payload.phone } }
      });
      if (error) throw new Error(error.message);
      if (data?.user?.id) uid = data.user.id;
      sbToken = data?.session?.access_token || null;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  const kycResult = payload.kycFile
    ? await wzUploadKycFile(await compressImage(payload.kycFile, 1600, 0.82), uid, sbToken)
    : { kycUrl: null, kycKey: null };
  const kycBackResult = payload.kycBackFile
    ? await wzUploadKycFile(await compressImage(payload.kycBackFile, 1600, 0.82), uid, sbToken)
    : { kycUrl: null, kycKey: null };
  const panResult = payload.panFile
    ? await wzUploadKycFile(await compressImage(payload.panFile, 1600, 0.82), uid, sbToken)
    : { kycUrl: null, kycKey: null };

  const user = {
    uid,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email,
    kycType: payload.kycType,
    aadhaarNumber: payload.aadhaarNumber || null,
    panNumber: payload.panNumber || null,
    kycUrl: kycResult.kycUrl,
    kycKey: kycResult.kycKey,
    kycBackUrl: kycBackResult.kycUrl,
    kycBackKey: kycBackResult.kycKey,
    panUrl: panResult.kycUrl,
    panKey: panResult.kycKey,
    kycVerified: false,
    chips: 0,
    wallet: 0,
    createdAt: new Date().toISOString()
  };

  // ── Supabase DB ──
  if (window.WINZO_SB) {
    try {
      await window.WINZO_SB.from("users").insert({
        uid, full_name: payload.fullName, phone: payload.phone,
        email: payload.email, kyc_type: payload.kycType,
        aadhaar_number: payload.aadhaarNumber || null,
        pan_number: payload.panNumber || null,
        kyc_url: kycResult.kycUrl, kyc_key: kycResult.kycKey,
        kyc_back_url: kycBackResult.kycUrl,
        kyc_back_key: kycBackResult.kycKey,
        pan_url: panResult.kycUrl, pan_key: panResult.kycKey,
        kyc_verified: false,
        chips: 0, created_at: new Date().toISOString()
      });
    } catch(e) { console.warn("Supabase DB insert failed:", e.message); }
  }

  const users = wzGetUsers();
  users.push(user);
  wzSaveUsers(users);
  wzSetSession({ ...user, password: undefined });
  return user;
}

async function wzLogin(identifier, password) {
  // ── Supabase Auth ──
  if (window.WINZO_SB) {
    try {
      const { data, error } = await window.WINZO_SB.auth.signInWithPassword({
        email: identifier.includes("@") ? identifier : undefined,
        phone: !identifier.includes("@") ? identifier : undefined,
        password
      });
      if (error) throw new Error(error.message);
      // Persist Supabase session so auth.updateUser() works across pages
      if (data?.session) {
        localStorage.setItem("winzo_sb_session", JSON.stringify(data.session));
      }
      // Sync fresh user data from Supabase DB (query by uid so RLS passes)
      const { data: dbUser } = await window.WINZO_SB.from("users").select("*").eq("uid", data.user.id).single();
      const merged = dbUser ? {
        uid: dbUser.uid, fullName: dbUser.full_name, phone: dbUser.phone,
        email: dbUser.email, kycType: dbUser.kyc_type,
        kycUrl: dbUser.kyc_url, kycKey: dbUser.kyc_key || null,
        kycBackUrl: dbUser.kyc_back_url || null, kycBackKey: dbUser.kyc_back_key || null,
        aadhaarNumber: dbUser.aadhaar_number || null, panNumber: dbUser.pan_number || null,
        panUrl: dbUser.pan_url || null, panKey: dbUser.pan_key || null,
        kycVerified: dbUser.kyc_verified, kycRejected: dbUser.kyc_rejected || false,
        chips: dbUser.chips || 0, wallet: dbUser.chips || 0, createdAt: dbUser.created_at
      } : {
        uid: data.user.id, fullName: data.user.user_metadata?.fullName || identifier,
        phone: data.user.user_metadata?.phone || "", email: data.user.email || identifier,
        kycVerified: false, chips: 0, wallet: 0, createdAt: data.user.created_at
      };
      const users = wzGetUsers();
      const idx = users.findIndex(u => u.uid === merged.uid || u.email === merged.email);
      if (idx >= 0) users[idx] = merged; else users.push(merged);
      wzSaveUsers(users);
      wzSetSession({ ...merged, password: undefined });
      return merged;
    } catch (e) {
      // Fall through to localStorage
      console.warn("Supabase login failed, trying local:", e.message);
    }
  }

  // ── localStorage fallback ──
  const users = wzGetUsers();
  const user = users.find(
    u => (u.email === identifier || u.phone === identifier) && u.password === password
  );
  if (!user) throw new Error("Invalid credentials. Please try again.");
  wzSetSession({ ...user, password: undefined });
  return user;
}

function wzLogout() {
  if (window.WINZO_SB) {
    window.WINZO_SB.auth.signOut().catch(() => {});
  }
  localStorage.removeItem("winzo_sb_session");
  wzClearSession();
  window.location.href = "index.html";
}

async function wzResetPassword(email) {
  if (window.WINZO_SB) {
    const { error } = await window.WINZO_SB.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login.html"
    });
    if (error) throw new Error(error.message);
    return;
  }
  throw new Error("Password reset requires Supabase. Please contact support.");
}

// Expose to window
window.WinzoAuth = {
  signup: wzSignup,
  login: wzLogin,
  logout: wzLogout,
  resetPassword: wzResetPassword,
  session: wzGetSession,
  requireAuth: wzRequireAuth,
  redirectIfAuthed: wzRedirectIfAuthed,
  toast: wzToast,
  getUsers: wzGetUsers,
  saveUsers: wzSaveUsers,
  setSession: wzSetSession
};

// ---- Global settings (bonus phone, admin passcode) ----
const WZ_SETTINGS_KEY = "winzo_settings";
function wzGetSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(WZ_SETTINGS_KEY) || "{}");
    return {
      bonusPhone: s.bonusPhone || "+91 95186-85134",
      adminUser:  s.adminUser  || "admin",
      adminPass:  s.adminPass  || "winzo-admin-2026",
      upiId:      s.upiId      || "winzoindia@upi",
      upiName:    s.upiName    || "WinzoIndia"
    };
  } catch { return { bonusPhone: "+91 95186-85134", adminUser: "admin", adminPass: "winzo-admin-2026", upiId: "winzoindia@upi", upiName: "WinzoIndia" }; }
}
async function wzLoadSettingsFromSupabase() {
  if (!window.WINZO_SB) return;
  try {
    const { data } = await window.WINZO_SB.from("settings").select("key,value");
    if (!data || !data.length) return;
    const s = {};
    data.forEach(function(r){ s[r.key] = r.value; });
    localStorage.setItem(WZ_SETTINGS_KEY, JSON.stringify(s));
  } catch(e) { console.warn("Settings load failed:", e.message); }
}
function wzSaveSettings(patch) {
  const cur = wzGetSettings();
  const merged = { ...cur, ...patch };
  localStorage.setItem(WZ_SETTINGS_KEY, JSON.stringify(merged));
  if (!window.WINZO_SB) return;
  Object.entries(patch).forEach(function([key, value]) {
    window.WINZO_SB.from("settings").upsert({ key, value }).then(function(){});
  });
}
window.WinzoSettings = { get: wzGetSettings, save: wzSaveSettings, load: wzLoadSettingsFromSupabase };

// ---- Global sets pool (Supabase + localStorage) ----
const WZ_SETS_KEY = "winzo_sets_global";
async function wzGetSetsAsync() {
  if (window.WINZO_SB) {
    try {
      const { data } = await window.WINZO_SB.from("challenges").select("*").order("at", { ascending: false });
      if (data) {
        const remote = data.map(r => ({ id:r.id, gameId:r.game_id, uid:r.uid, byName:r.by_name, value:r.value, gameType:r.game_type, acceptedBy:r.accepted_by, acceptedByName:r.accepted_by_name, acceptedAt:r.accepted_at, roomCode:r.room_code, startedAt:r.started_at||null, at:r.at }));
        const local = wzGetSets();
        const localMap = new Map(local.map(s => [s.id, s]));
        // For each remote entry, prefer local version if local has newer info (acceptedBy, roomCode set locally but not yet in Supabase)
        const merged = remote.map(r => {
          const loc = localMap.get(r.id);
          if (!loc) return r;
          return {
            ...r,
            acceptedBy: r.acceptedBy || loc.acceptedBy || null,
            acceptedByName: r.acceptedByName || loc.acceptedByName || null,
            acceptedAt: r.acceptedAt || loc.acceptedAt || null,
            roomCode: r.roomCode || loc.roomCode || null,
            startedAt: r.startedAt || loc.startedAt || null,
          };
        });
        // Add local-only entries not yet in Supabase
        const remoteIds = new Set(remote.map(s => s.id));
        local.filter(s => !remoteIds.has(s.id)).forEach(s => merged.push(s));
        localStorage.setItem(WZ_SETS_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch(e) { console.warn("Supabase sets fetch failed:", e.message); }
  }
  try { return JSON.parse(localStorage.getItem(WZ_SETS_KEY) || "[]"); } catch { return []; }
}
function wzGetSets() {
  try { return JSON.parse(localStorage.getItem(WZ_SETS_KEY) || "[]"); } catch { return []; }
}
async function wzSaveSetsAsync(arr) {
  localStorage.setItem(WZ_SETS_KEY, JSON.stringify(arr));
  if (!window.WINZO_SB) return;
  // Only upsert entries that are new or changed (avoid full-table write on every poll)
  try {
    const rows = arr.map(s => ({ id:s.id, game_id:s.gameId||null, uid:s.uid, by_name:s.byName, value:s.value, game_type:s.gameType, accepted_by:s.acceptedBy||null, accepted_by_name:s.acceptedByName||null, accepted_at:s.acceptedAt||null, room_code:s.roomCode||null, at:s.at }));
    await window.WINZO_SB.from("challenges").upsert(rows);
  } catch(e) { console.warn("Supabase sets save failed:", e.message); }
}
function wzSaveSets(arr) {
  localStorage.setItem(WZ_SETS_KEY, JSON.stringify(arr));
  wzSaveSetsAsync(arr);
}
async function wzDeleteSet(id) {
  const arr = (await wzGetSetsAsync()).filter(s => s.id !== id);
  localStorage.setItem(WZ_SETS_KEY, JSON.stringify(arr));
  if (!window.WINZO_SB) return;
  try { await window.WINZO_SB.from("challenges").delete().eq("id", id); } catch(e) { console.warn("Supabase set delete failed:", e.message); }
}
window.WinzoSets = { get: wzGetSets, getAsync: wzGetSetsAsync, save: wzSaveSets, delete: wzDeleteSet,
  saveOne: async function(s) {
    const arr = wzGetSets();
    const idx = arr.findIndex(x => x.id === s.id);
    if (idx >= 0) arr[idx] = s; else arr.push(s);
    localStorage.setItem(WZ_SETS_KEY, JSON.stringify(arr));
    if (!window.WINZO_SB) return;
    try { await window.WINZO_SB.from("challenges").upsert({ id:s.id, game_id:s.gameId||null, uid:s.uid, by_name:s.byName, value:s.value, game_type:s.gameType, accepted_by:s.acceptedBy||null, accepted_by_name:s.acceptedByName||null, accepted_at:s.acceptedAt||null, room_code:s.roomCode||null, at:s.at }); } catch(e) { console.warn("Supabase set saveOne failed:", e.message); }
  }
};

// ---- Deposits (Supabase + localStorage) ----
async function wzSaveDepositAsync(dep) {
  if (!window.WINZO_SB) return;
  try {
    await window.WINZO_SB.from("deposits").upsert({ id:dep.id, uid:dep.uid||null, user_name:dep.user, user_phone:dep.userPhone, user_email:dep.userEmail, amount:dep.amount, method:dep.method, txn_id:dep.txnId||null, status:dep.status });
  } catch(e) { console.warn("Supabase deposit save failed:", e.message); }
}
window.WinzoDeposits = { saveOne: wzSaveDepositAsync };

// ---- Results (Supabase + localStorage) ----
async function wzSaveResultAsync(res) {
  if (!window.WINZO_SB) return;
  try {
    await window.WINZO_SB.from("results").upsert({
      id: res.id,
      challenge_id: res.challengeId,
      game_id: res.gameId || null,
      submitter_uid: res.submitterUid,
      submitter_name: res.submitterName,
      submitter_phone: res.submitterPhone,
      opponent_uid: res.opponentUid,
      opponent_name: res.opponentName,
      opponent_phone: res.opponentPhone,
      game_type: res.gameType,
      amount: res.amount,
      room_code: res.roomCode,
      result: res.result,
      proof_url: res.proofUrl,
      screenshot_at: res.screenshotAt || null,
      status: res.status
    });
  } catch(e) { console.warn("Supabase result save failed:", e.message); }
}
window.WinzoResults = { saveOne: wzSaveResultAsync };

// ---- Reports ----
const WZ_REPORTS_KEY = "winzo_reports";
function wzGetReports() {
  try { return JSON.parse(localStorage.getItem(WZ_REPORTS_KEY) || "[]"); } catch { return []; }
}
function wzSaveReports(arr) { localStorage.setItem(WZ_REPORTS_KEY, JSON.stringify(arr)); }
async function wzSaveReportAsync(rep) {
  if (!window.WINZO_SB) return;
  try {
    await window.WINZO_SB.from("reports").upsert({ id:rep.id, reporter_uid:rep.reporterUid, reporter_name:rep.reporterName, opponent:rep.opponent, details:rep.details, proof_url:rep.proofUrl, status:rep.status });
  } catch(e) { console.warn("Supabase report save failed:", e.message); }
}
window.WinzoReports = { get: wzGetReports, save: wzSaveReports, saveOne: wzSaveReportAsync };

// ---- Withdrawals ----
const WZ_WITHDRAWS_KEY = "winzo_withdraws";
function wzGetWithdraws() {
  try { return JSON.parse(localStorage.getItem(WZ_WITHDRAWS_KEY) || "[]"); } catch { return []; }
}
function wzSaveWithdraws(arr) { localStorage.setItem(WZ_WITHDRAWS_KEY, JSON.stringify(arr)); }
async function wzSaveWithdrawAsync(w) {
  if (!window.WINZO_SB) return;
  try {
    await window.WINZO_SB.from("withdraws").upsert({ id:w.id, uid:w.uid||null, user_name:w.user, user_phone:w.userPhone, user_email:w.userEmail, amount:w.amount, method:w.method, upi_id:w.upiId||null, status:w.status });
  } catch(e) { console.warn("Supabase withdraw save failed:", e.message); }
}
window.WinzoWithdraws = { get: wzGetWithdraws, save: wzSaveWithdraws, saveOne: wzSaveWithdrawAsync };
