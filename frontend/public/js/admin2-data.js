// ============================================================
// WinzoIndia Admin v2 — Data Layer (Supabase-first)
// Reads live from Supabase; falls back to localStorage.
// ============================================================

async function sbFetch(table, order, columns) {
  if (!window.WINZO_SB) return null;
  try {
    let q = window.WINZO_SB.from(table).select(columns || "*");
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch(e) { console.warn("Supabase fetch failed [" + table + "]:", e.message); return null; }
}

// Lean column list for user list views (excludes heavy KYC image data)
var USER_LIST_COLS = "uid,full_name,phone,email,kyc_type,kyc_verified,kyc_rejected,kyc_url,kyc_key,kyc_back_url,kyc_back_key,pan_url,pan_key,aadhaar_number,pan_number,chips,created_at";

// ── Map Supabase rows → app shape ─────────────────────────────
function mapUser(r) {
  return { uid:r.uid, fullName:r.full_name, phone:r.phone, email:r.email,
    kycType:r.kyc_type, kycUrl:r.kyc_url||null, kycKey:r.kyc_key||null,
    kycBackUrl:r.kyc_back_url||null, kycBackKey:r.kyc_back_key||null,
    aadhaarNumber:r.aadhaar_number||null, panNumber:r.pan_number||null,
    panUrl:r.pan_url||null, panKey:r.pan_key||null,
    kycVerified:r.kyc_verified, kycRejected:r.kyc_rejected||false,
    chips:r.chips||0, wallet:r.chips||0, createdAt:r.created_at };
}
function mapSet(r) {
  return { id:r.id, gameId:r.game_id, uid:r.uid, byName:r.by_name, value:r.value,
    gameType:r.game_type, acceptedBy:r.accepted_by, acceptedByName:r.accepted_by_name,
    acceptedAt:r.accepted_at, roomCode:r.room_code,
    startedAt:r.started_at||null, startedBy:r.started_by||null,
    status:r.status||null, cancelledBy:r.cancelled_by||null, cancelledAt:r.cancelled_at||null,
    at:r.at };
}
function mapDeposit(r) {
  return { id:r.id, uid:r.uid, user:r.user_name, userPhone:r.user_phone,
    userEmail:r.user_email, amount:r.amount, type:"Deposit",
    method:r.method, txnId:r.txn_id, status:r.status, time:r.created_at };
}
function mapWithdraw(r) {
  return { id:r.id, uid:r.uid, user:r.user_name, userPhone:r.user_phone,
    userEmail:r.user_email, amount:r.amount, method:r.method,
    upiId:r.upi_id, status:r.status, time:r.created_at };
}
function mapReport(r) {
  return { id:r.id, reporterUid:r.reporter_uid, reporterName:r.reporter_name,
    opponent:r.opponent, details:r.details, proofUrl:r.proof_url,
    status:r.status, at:r.created_at };
}
function mapResult(r) {
  return { id:r.id, challengeId:r.challenge_id, gameId:r.game_id,
    submitterUid:r.submitter_uid, submitterName:r.submitter_name, submitterPhone:r.submitter_phone,
    opponentUid:r.opponent_uid, opponentName:r.opponent_name, opponentPhone:r.opponent_phone,
    gameType:r.game_type, amount:r.amount, roomCode:r.room_code,
    result:r.result, proofUrl:r.proof_url, screenshotAt:r.screenshot_at||r.created_at, status:r.status, at:r.created_at };
}

// ── Live readers (Supabase-first, localStorage fallback) ──────
var _usersMemCache = null;
var _resultsMemCache = null;

function _safeLocalSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { if (window.wzReportError) wzReportError("localStorage quota exceeded (" + key + "): " + e.message); }
}
async function getLiveUsersAsync() {
  const data = await sbFetch("users", "created_at", USER_LIST_COLS);
  if (data) { const mapped = data.map(mapUser); _usersMemCache = mapped; return mapped; }
  if (_usersMemCache) return _usersMemCache;
  try { return JSON.parse(localStorage.getItem("winzo_users") || "[]"); } catch(e) { return []; }
}
async function getLiveUserFullAsync(uid) {
  if (!window.WINZO_SB) return null;
  try {
    const { data, error } = await window.WINZO_SB.from("users").select("*").eq("uid", uid).maybeSingle();
    if (error) throw error;
    return mapUser(data);
  } catch(e) { return _usersMemCache ? _usersMemCache.find(function(u){ return u.uid === uid; }) || null : null; }
}
var SET_COLS     = "id,game_id,uid,by_name,value,game_type,accepted_by,accepted_by_name,accepted_at,room_code,started_at,started_by,at,status,cancelled_by,cancelled_at";
var DEPOSIT_COLS = "id,uid,user_name,user_phone,user_email,amount,method,txn_id,status,created_at";
var WITHDRAW_COLS= "id,uid,user_name,user_phone,user_email,amount,method,upi_id,status,created_at";
var REPORT_COLS  = "id,reporter_uid,reporter_name,opponent,details,proof_url,status,created_at";
var RESULT_COLS  = "id,challenge_id,game_id,submitter_uid,submitter_name,submitter_phone,opponent_uid,opponent_name,opponent_phone,game_type,amount,room_code,result,proof_url,screenshot_at,status,created_at";

async function getLiveSetsAsync() {
  const data = await sbFetch("challenges", "at", SET_COLS);
  if (data) { const mapped = data.map(mapSet); _safeLocalSet("winzo_sets_global", mapped); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_sets_global") || "[]"); } catch(e) { return []; }
}
async function getLiveDepositsAsync() {
  const data = await sbFetch("deposits", "created_at", DEPOSIT_COLS);
  if (data) { const mapped = data.map(mapDeposit); _safeLocalSet("winzo_deposits", mapped); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_deposits") || "[]"); } catch(e) { return []; }
}
async function getLiveWithdrawalsAsync() {
  const data = await sbFetch("withdraws", "created_at", WITHDRAW_COLS);
  if (data) { const mapped = data.map(mapWithdraw); _safeLocalSet("winzo_withdraws", mapped); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_withdraws") || "[]"); } catch(e) { return []; }
}
async function getLiveReportsAsync() {
  const data = await sbFetch("reports", "created_at", REPORT_COLS);
  if (data) { const mapped = data.map(mapReport); _safeLocalSet("winzo_reports", mapped); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_reports") || "[]"); } catch(e) { return []; }
}
async function getLiveResultsAsync() {
  const data = await sbFetch("results", "created_at", RESULT_COLS);
  if (data) { const mapped = data.map(mapResult); _resultsMemCache = mapped; return mapped; }
  return _resultsMemCache || [];
}

// Sync wrappers — panels call these, await result, then re-render
function getLiveUsers()      { if (_usersMemCache) return _usersMemCache; try { return JSON.parse(localStorage.getItem("winzo_users") || "[]"); } catch(e) { return []; } }
function getLiveSets()       { try { return JSON.parse(localStorage.getItem("winzo_sets_global") || "[]"); } catch(e) { return []; } }
function getLiveReports()    { try { return JSON.parse(localStorage.getItem("winzo_reports") || "[]"); } catch(e) { return []; } }
function getLiveResults()    { return _resultsMemCache || []; }
function getLiveDeposits()   { try { return JSON.parse(localStorage.getItem("winzo_deposits") || "[]"); } catch(e) { return []; } }
function getLiveWithdrawals(){ try { return JSON.parse(localStorage.getItem("winzo_withdraws") || "[]"); } catch(e) { return []; } }
function getLiveBlacklist()  { try { return JSON.parse(localStorage.getItem("winzo_blacklist") || "[]"); } catch(e) { return []; } }
function saveLiveBlacklist(arr) {
  _safeLocalSet("winzo_blacklist", arr);
  if (!window.WINZO_SB) return;
  // Full replace: delete all then insert
  window.WINZO_SB.from("blacklist").delete().neq("id","__none__").then(function() {
    if (!arr.length) return;
    window.WINZO_SB.from("blacklist").insert(arr.map(function(b){
      return { id:b.id, name:b.name, reason:b.reason||"" };
    })).then(function(){});
  });
}
async function getLiveBlacklistAsync() {
  const data = await sbFetch("blacklist", "created_at");
  if (data) {
    const mapped = data.map(function(r){ return { id:r.id, name:r.name, reason:r.reason, added:r.created_at }; });
    _safeLocalSet("winzo_blacklist", mapped);
    return mapped;
  }
  return getLiveBlacklist();
}
function saveLiveUsers(arr) {
  _usersMemCache = arr; // keep in memory — base64 KYC images blow localStorage quota
  if (!window.WINZO_SB) return;
  // Only push to Supabase if an authenticated admin session exists
  window.WINZO_SB.auth.getSession().then(function({ data: { session } }) {
    if (!session) return;
    arr.forEach(function(u) {
      window.WINZO_SB.from("users").upsert({
        uid:u.uid, full_name:u.fullName||u.name, phone:u.phone, email:u.email,
        kyc_type:u.kycType, kyc_url:u.kycUrl, kyc_verified:u.kycVerified||false,
        chips:u.chips||0
      }).then(function(){});
    });
  });
}

// ── Auto-sync on panel load ───────────────────────────────────
window.syncAndReload = function(panelKey, panelLabel, targetId) {
  window.loadPanel(panelKey, panelLabel);
  if (targetId) window._highlightTarget = targetId;
  function highlightRow() {
    if (!window._highlightTarget) return;
    var row = document.querySelector("[data-dep-id='" + window._highlightTarget + "']");
    if (row) {
      row.style.transition = "background 0.3s";
      row.style.background = "rgba(250,204,21,0.25)";
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      window._highlightTarget = null;
    }
  }
  highlightRow();
  // Then fetch fresh data from Supabase in background and re-render
  const loaders = {
    "view-all-users":        getLiveUsersAsync,
    "review-kyc":            getLiveUsersAsync,
    "fraud-users":           getLiveUsersAsync,
    "wallet-mismatch":       getLiveUsersAsync,
    "add-user":              getLiveUsersAsync,
    "challenges-24h":        getLiveSetsAsync,
    "running-challenges":    getLiveSetsAsync,
    "search-challenges":     getLiveSetsAsync,
    "all-challenges":        getLiveSetsAsync,
    "challenges-setup":      getLiveSetsAsync,
    "game-monitor":          function() { return Promise.all([getLiveSetsAsync(), getLiveResultsAsync()]); },
    "new-deposit-requests":  getLiveDepositsAsync,
    "deposits-2h":           getLiveDepositsAsync,
    "all-deposits":          getLiveDepositsAsync,
    "deposit-report":        getLiveDepositsAsync,
    "recent-withdrawals":    getLiveWithdrawalsAsync,
    "all-withdrawals":       getLiveWithdrawalsAsync,
    "search-screenshots":    function() { return Promise.all([getLiveResultsAsync(), getLiveReportsAsync()]); },
    "blacklisted":           getLiveBlacklistAsync,
    "view-all-games":        getLiveGamesAsync,
    "all-tournaments":       getLiveTournamentsAsync,
    "running-tournaments":   getLiveTournamentsAsync,
    "overview":              function() { return Promise.all([getLiveUsersAsync(), getLiveSetsAsync(), getLiveDepositsAsync(), getLiveWithdrawalsAsync(), getLiveReportsAsync()]); }
  };
  if (loaders[panelKey]) {
    loaders[panelKey]().then(function() {
      var titleEl = document.getElementById("topbar-title");
      if (titleEl && titleEl.dataset.panelKey === panelKey) {
        window.loadPanel(panelKey, panelLabel);
        highlightRow();
      }
    }).catch(function(){});
  }
};

// ── Static seeds (fallback only — Supabase is source of truth) ──
const STATIC = {
  games: [
    { id:"g1", name:"Full Game",      type:"regular", entry:50,  prize:90,   status:"active", players:4, created:"2026-01-01" },
    { id:"g2", name:"1 Goti",         type:"regular", entry:20,  prize:36,   status:"active", players:2, created:"2026-01-01" },
    { id:"g3", name:"2 Goti",         type:"regular", entry:30,  prize:54,   status:"active", players:2, created:"2026-01-01" },
    { id:"g4", name:"3 Goti",         type:"regular", entry:40,  prize:72,   status:"active", players:2, created:"2026-01-01" },
    { id:"g5", name:"Ulta",           type:"regular", entry:50,  prize:90,   status:"active", players:2, created:"2026-01-01" },
    { id:"g6", name:"1 Six",          type:"regular", entry:20,  prize:36,   status:"active", players:2, created:"2026-01-01" },
    { id:"g7", name:"Snake & Ladder", type:"regular", entry:20,  prize:36,   status:"active", players:2, created:"2026-01-01" },
  ],
  tournaments: [
    { id:"t1", name:"Full Game Grand Prix",   game:"Full Game",      entry:100, prize:5000,  players:"48/64", status:"running",   start:"2026-07-04 10:00" },
    { id:"t2", name:"1 Goti Speed Cup",       game:"1 Goti",         entry:50,  prize:2000,  players:"32/64", status:"upcoming",  start:"2026-07-05 18:00" },
    { id:"t3", name:"Snake Ladder Open",      game:"Snake & Ladder", entry:50,  prize:2000,  players:"16/32", status:"upcoming",  start:"2026-07-05 20:00" },
    { id:"t4", name:"Ulta Championship",      game:"Ulta",           entry:100, prize:8000,  players:"64/64", status:"completed", start:"2026-07-03 10:00" },
  ],
};

// ── Tournaments (Supabase-first, localStorage fallback) ───────
function getLiveTournaments() {
  try { return JSON.parse(localStorage.getItem("winzo_tournaments") || "null") || STATIC.tournaments.slice(); }
  catch { return STATIC.tournaments.slice(); }
}
async function getLiveTournamentsAsync() {
  const data = await sbFetch("tournaments", "created_at");
  if (data && data.length) {
    const mapped = data.map(function(r){ return { id:r.id, name:r.name, game:r.game, entry:r.entry, prize:r.prize, players:r.players, status:r.status, start:r.start_time }; });
    _safeLocalSet("winzo_tournaments", mapped);
    return mapped;
  }
  return getLiveTournaments();
}
function saveLiveTournaments(arr) {
  _safeLocalSet("winzo_tournaments", arr);
  if (!window.WINZO_SB) return;
  window.WINZO_SB.from("tournaments").upsert(arr.map(function(t){
    return { id:t.id, name:t.name, game:t.game, entry:t.entry||0, prize:t.prize||0, players:t.players||"0/0", status:t.status||"upcoming", start_time:t.start||null };
  })).then(function(){});
}

// ── Helpers ───────────────────────────────────────────────────
function rupee(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

function statusBadge(s) {
  const map = {
    active:"badge-green", running:"badge-blue", completed:"badge-green",
    pending:"badge-yellow", success:"badge-green", approved:"badge-green",
    failed:"badge-red", rejected:"badge-red", disputed:"badge-red",
    blocked:"badge-red", upcoming:"badge-yellow", inactive:"badge-red",
    verified:"badge-green", "not-submitted":"badge-yellow"
  };
  return `<span class="badge ${map[s]||"badge-yellow"}">${s}</span>`;
}

function emptyRow(cols, msg) {
  return `<tr class="empty-row"><td colspan="${cols}">${msg||"No records found."}</td></tr>`;
}
