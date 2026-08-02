// ============================================================
// WinzoIndia Admin v2 — Data Layer (Supabase-first)
// Reads live from Supabase; falls back to localStorage.
// ============================================================

async function sbFetch(table, order) {
  if (!window.WINZO_SB) return null;
  try {
    let q = window.WINZO_SB.from(table).select("*");
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch(e) { console.warn("Supabase fetch failed [" + table + "]:", e.message); return null; }
}

// ── Map Supabase rows → app shape ─────────────────────────────
function mapUser(r) {
  return { uid:r.uid, fullName:r.full_name, phone:r.phone, email:r.email,
    kycType:r.kyc_type, kycUrl:r.kyc_url, kycKey:r.kyc_key||null,
    kycBackUrl:r.kyc_back_url||null, kycBackKey:r.kyc_back_key||null,
    aadhaarNumber:r.aadhaar_number||null, panNumber:r.pan_number||null,
    panUrl:r.pan_url||null, panKey:r.pan_key||null,
    kycVerified:r.kyc_verified, kycRejected:r.kyc_rejected||false,
    chips:r.chips||0, wallet:r.chips||0, createdAt:r.created_at };
}
function mapSet(r) {
  return { id:r.id, gameId:r.game_id, uid:r.uid, byName:r.by_name, value:r.value,
    gameType:r.game_type, acceptedBy:r.accepted_by, acceptedByName:r.accepted_by_name,
    acceptedAt:r.accepted_at, roomCode:r.room_code, startedAt:r.started_at||null,
    startedByName:r.started_by||null, at:r.at };
}
function mapDeposit(r) {
  return { id:r.id, uid:r.uid, user:r.user_name, userPhone:r.user_phone,
    userEmail:r.user_email, amount:r.amount, type:r.type||"Deposit",
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
    result:r.result, proofUrl:r.proof_url, screenshotAt:r.screenshot_at||null, status:r.status, at:r.created_at };
}

// ── Live readers (Supabase-first, localStorage fallback) ──────
async function getLiveUsersAsync() {
  const data = await sbFetch("users", "created_at");
  if (data) { const mapped = data.map(mapUser); localStorage.setItem("winzo_users", JSON.stringify(mapped)); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_users") || "[]"); } catch(e) { return []; }
}
async function getLiveSetsAsync() {
  const data = await sbFetch("challenges", "at");
  if (data) { const mapped = data.map(mapSet); localStorage.setItem("winzo_sets_global", JSON.stringify(mapped)); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_sets_global") || "[]"); } catch(e) { return []; }
}
async function getLiveDepositsAsync() {
  const data = await sbFetch("deposits", "created_at");
  if (data) { const mapped = data.map(mapDeposit); localStorage.setItem("winzo_deposits", JSON.stringify(mapped)); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_deposits") || "[]"); } catch(e) { return []; }
}
async function getLiveWithdrawalsAsync() {
  const data = await sbFetch("withdraws", "created_at");
  if (data) { const mapped = data.map(mapWithdraw); localStorage.setItem("winzo_withdraws", JSON.stringify(mapped)); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_withdraws") || "[]"); } catch(e) { return []; }
}
async function getLiveReportsAsync() {
  const data = await sbFetch("reports", "created_at");
  if (data) { const mapped = data.map(mapReport); localStorage.setItem("winzo_reports", JSON.stringify(mapped)); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_reports") || "[]"); } catch(e) { return []; }
}
async function getLiveResultsAsync() {
  const data = await sbFetch("results", "created_at");
  if (data) { const mapped = data.map(mapResult); localStorage.setItem("winzo_results", JSON.stringify(mapped)); return mapped; }
  try { return JSON.parse(localStorage.getItem("winzo_results") || "[]"); } catch(e) { return []; }
}

// Sync wrappers — panels call these, await result, then re-render
function getLiveUsers()      { try { return JSON.parse(localStorage.getItem("winzo_users") || "[]"); } catch(e) { return []; } }
function getLiveSets()       { try { return JSON.parse(localStorage.getItem("winzo_sets_global") || "[]"); } catch(e) { return []; } }
function getLiveReports()    { try { return JSON.parse(localStorage.getItem("winzo_reports") || "[]"); } catch(e) { return []; } }
function getLiveResults()    { try { return JSON.parse(localStorage.getItem("winzo_results") || "[]"); } catch(e) { return []; } }
function getLiveDeposits()   { try { return JSON.parse(localStorage.getItem("winzo_deposits") || "[]"); } catch(e) { return []; } }
function getLiveWithdrawals(){ try { return JSON.parse(localStorage.getItem("winzo_withdraws") || "[]"); } catch(e) { return []; } }
function getLiveBlacklist()  { try { return JSON.parse(localStorage.getItem("winzo_blacklist") || "[]"); } catch(e) { return []; } }
function saveLiveBlacklist(arr) {
  localStorage.setItem("winzo_blacklist", JSON.stringify(arr));
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
    localStorage.setItem("winzo_blacklist", JSON.stringify(mapped));
    return mapped;
  }
  return getLiveBlacklist();
}
function saveLiveUsers(arr) {
  localStorage.setItem("winzo_users", JSON.stringify(arr));
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
window.syncAndReload = function(panelKey, panelLabel) {
  // Render immediately from localStorage — no wait
  window.loadPanel(panelKey, panelLabel);
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
      // Only re-render if user is still on the same panel
      if (document.getElementById("topbar-title").textContent === (panelLabel || panelKey)) {
        window.loadPanel(panelKey, panelLabel);
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
    localStorage.setItem("winzo_tournaments", JSON.stringify(mapped));
    return mapped;
  }
  return getLiveTournaments();
}
function saveLiveTournaments(arr) {
  localStorage.setItem("winzo_tournaments", JSON.stringify(arr));
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
