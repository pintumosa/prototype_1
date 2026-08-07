// ============================================================
// WinzoIndia Admin v2 — Panel Renderers (Part 1)
// All user/set/report data read LIVE from localStorage
// ============================================================

function fmtTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── XSS sanitizer for user-supplied data in innerHTML ────────
function esc(str) {
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

const PANELS = {};

// ── Overview ─────────────────────────────────────────────────
PANELS.overview = function() {
  const users = getLiveUsers();
  const deposits = getLiveDeposits();
  const withdrawals = getLiveWithdrawals();
  const sets = getLiveSets();
  const reports = getLiveReports();
  const totalDep = deposits.filter(function(d){return d.status==="success";}).reduce(function(a,d){return a+Number(d.amount||0);},0);
  const totalWd  = withdrawals.filter(function(w){return w.status==="approved";}).reduce(function(a,w){return a+Number(w.amount||0);},0);
  const pendingReports = reports.filter(function(r){return r.status==="pending";}).length;

  return `
<div class="a2-overview-grid">
  <div class="a2-stat-card"><div class="a2-stat-icon"><i class="ph-fill ph-users"></i></div><div><div class="a2-stat-val">${users.length}</div><div class="a2-stat-lbl">Total Users</div></div></div>
  <div class="a2-stat-card"><div class="a2-stat-icon green"><i class="ph-fill ph-currency-inr"></i></div><div><div class="a2-stat-val" style="color:var(--success)">${rupee(totalDep)}</div><div class="a2-stat-lbl">Total Deposits</div></div></div>
  <div class="a2-stat-card"><div class="a2-stat-icon red"><i class="ph-fill ph-arrow-up-right"></i></div><div><div class="a2-stat-val" style="color:var(--danger)">${rupee(totalWd)}</div><div class="a2-stat-lbl">Total Withdrawals</div></div></div>
  <div class="a2-stat-card"><div class="a2-stat-icon blue"><i class="ph-fill ph-sword"></i></div><div><div class="a2-stat-val" style="color:#007AFF">${sets.length}</div><div class="a2-stat-lbl">Open Challenges</div></div></div>
  <div class="a2-stat-card"><div class="a2-stat-icon"><i class="ph-fill ph-trophy"></i></div><div><div class="a2-stat-val">${getLiveTournaments().length}</div><div class="a2-stat-lbl">Tournaments</div></div></div>
  <div class="a2-stat-card"><div class="a2-stat-icon red"><i class="ph-fill ph-warning-octagon"></i></div><div><div class="a2-stat-val" style="color:var(--danger)">${pendingReports}</div><div class="a2-stat-lbl">Pending Reports</div></div></div>
</div>
<div class="a2-panel-head"><h2><i class="ph ph-users"></i> Registered Users</h2></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>User ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Chips</th><th>KYC</th><th>Joined</th></tr></thead><tbody>
${users.length ? users.map(function(u,i){return `<tr><td>${i+1}</td><td style="font-family:monospace;font-size:11px;color:var(--text-muted)">${esc(u.uid||"—")}</td><td><strong>${esc(u.fullName||u.name||"—")}</strong></td><td>${esc(u.phone||"—")}</td><td>${esc(u.email||"—")}</td><td style="color:var(--accent);font-weight:700">${Number(u.chips||u.wallet||0).toLocaleString("en-IN")}</td><td>${statusBadge(u.kycVerified?"verified":"pending")}</td><td>${esc((u.createdAt||u.joined||"—").slice(0,10))}</td></tr>`;}).join("") : emptyRow(8,"No users registered yet.")}
</tbody></table></div>`;
};

// ── Setup: Deposit Transaction Report ────────────────────────
PANELS["deposit-report"] = function() {
  const deposits = getLiveDeposits();
  return `<div class="a2-panel-head"><h2><i class="ph ph-receipt"></i> Deposit Transaction Report</h2></div>
<div class="a2-search">
  <input type="text" placeholder="Search user, phone or email..." oninput="filterTable(this,'dep-report-tbody',2,3,4)" />
</div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Txn ID</th><th>User</th><th>Phone</th><th>Email</th><th>Amount</th><th>Type</th><th>Method</th><th>Status</th><th>Time</th></tr></thead>
<tbody id="dep-report-tbody">
${deposits.length ? deposits.map(function(d,i){
  const isAdd = (d.type||"").toLowerCase().includes("add") || (d.method||"").toLowerCase().includes("admin") && !(d.type||"").toLowerCase().includes("subtract");
  const isSub = (d.type||"").toLowerCase().includes("subtract");
  const amtColor = isSub ? "var(--danger)" : "var(--success)";
  const amtPrefix = isSub ? "−" : "+";
  return `<tr>
    <td>${i+1}</td>
    <td style="font-family:var(--font-head);font-size:11px;color:var(--text-muted)">${(d.id||"—").toUpperCase()}</td>
    <td><strong>${d.user||d.userName||"—"}</strong></td>
    <td>${d.userPhone||"—"}</td>
    <td>${d.userEmail||"—"}</td>
    <td style="color:${amtColor};font-weight:700">${amtPrefix}${rupee(d.amount)}</td>
    <td>${d.type||"Deposit"}</td>
    <td>${d.method||"UPI"}</td>
    <td>${statusBadge(d.status||"pending")}</td>
    <td style="font-size:11px;color:var(--text-muted);">${fmtTime(d.time||d.createdAt)}</td>
  </tr>`;}).join("") : emptyRow(10,"No transaction records yet.")}
</tbody></table></div>`;
};

// ── Setup: All Tournaments ────────────────────────────────────
PANELS["all-tournaments"] = function() {
  const tournaments = getLiveTournaments();
  return `<div class="a2-panel-head"><h2><i class="ph ph-trophy"></i> All Tournaments</h2></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Name</th><th>Game</th><th>Entry</th><th>Prize Pool</th><th>Players</th><th>Status</th><th>Start</th></tr></thead><tbody>
${tournaments.map(function(t,i){return `<tr><td>${i+1}</td><td><strong>${t.name}</strong></td><td>${t.game}</td><td>${rupee(t.entry)}</td><td style="color:var(--accent);font-weight:700">${rupee(t.prize)}</td><td>${t.players}</td><td>${statusBadge(t.status)}</td><td>${t.start}</td></tr>`;}).join("")}
</tbody></table></div>`;
};

// ── Setup: Running Tournaments ────────────────────────────────
PANELS["running-tournaments"] = function() {
  const running = getLiveTournaments().filter(function(t){return t.status==="running";});
  return `<div class="a2-panel-head"><h2><i class="ph ph-play-circle"></i> Running Tournaments</h2><span class="badge badge-blue">${running.length} Live</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Name</th><th>Game</th><th>Entry</th><th>Prize Pool</th><th>Players</th><th>Start</th><th>Action</th></tr></thead><tbody>
${running.length ? running.map(function(t,i){return `<tr><td>${i+1}</td><td><strong>${t.name}</strong></td><td>${t.game}</td><td>${rupee(t.entry)}</td><td style="color:var(--accent);font-weight:700">${rupee(t.prize)}</td><td>${t.players}</td><td>${t.start}</td><td><button class="btn btn-secondary" style="padding:6px 12px;font-size:11px;"><i class="ph ph-stop-circle"></i> Stop</button></td></tr>`;}).join("") : emptyRow(8,"No running tournaments.")}
</tbody></table></div>`;
};

// ── Setup: Challenges ─────────────────────────────────────────
PANELS["challenges-setup"] = function() { return PANELS["all-challenges"](); };

// ── Setup: Blacklisted Names ──────────────────────────────────
PANELS["blacklisted"] = function() {
  const list = getLiveBlacklist();
  return `<div class="a2-panel-head"><h2><i class="ph ph-prohibit"></i> Blacklisted Names</h2>
  <button class="btn btn-primary" style="padding:8px 16px;font-size:12px;" onclick="showAddBlacklist()"><i class="ph ph-plus"></i> Add Name</button>
</div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Name</th><th>Reason</th><th>Added</th><th>Action</th></tr></thead>
<tbody id="blacklist-tbody">
${list.length ? list.map(function(b,i){return `<tr id="bl-${b.id}"><td>${i+1}</td><td><strong>${b.name}</strong></td><td>${b.reason||"—"}</td><td>${(b.added||b.createdAt||"—").slice(0,10)}</td><td><button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="removeBlacklist('${b.id}')"><i class="ph ph-trash"></i> Remove</button></td></tr>`;}).join("") : emptyRow(5,"No blacklisted names.")}
</tbody></table></div>`;
};

// ── Game Management ───────────────────────────────────────────
function getLiveGames() {
  try { return JSON.parse(localStorage.getItem("winzo_games") || "null") || STATIC.games.slice(); }
  catch { return STATIC.games.slice(); }
}
async function getLiveGamesAsync() {
  const data = await sbFetch("games", "created_at");
  if (data && data.length) {
    const mapped = data.map(function(r){ return { id:r.id, name:r.name, type:r.type, entry:r.entry, prize:r.prize, players:r.players, status:r.status, created:(r.created_at||"").slice(0,10) }; });
    localStorage.setItem("winzo_games", JSON.stringify(mapped));
    return mapped;
  }
  return getLiveGames();
}
function saveLiveGames(arr) {
  localStorage.setItem("winzo_games", JSON.stringify(arr));
  if (!window.WINZO_SB) return;
  window.WINZO_SB.from("games").upsert(arr.map(function(g){
    return { id:g.id, name:g.name, type:g.type||"regular", entry:g.entry||0, prize:g.prize||0, players:g.players||2, status:g.status||"active" };
  })).then(function(){});
}

PANELS["view-all-games"] = function() {
  const games = getLiveGames();
  return `<div class="a2-panel-head"><h2><i class="ph ph-list-bullets"></i> All Games</h2></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Entry Fee</th><th>Prize</th><th>Max Players</th><th>Status</th><th>Action</th></tr></thead><tbody>
${games.map(function(g,i){return `<tr><td>${i+1}</td><td><strong>${g.name}</strong></td><td><span class="badge ${g.type==="tournament"?"badge-blue":"badge-yellow"}">${g.type}</span></td><td>${rupee(g.entry)}</td><td style="color:var(--accent);font-weight:700">${rupee(g.prize)}</td><td>${g.players}</td><td>${statusBadge(g.status)}</td><td><button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;color:var(--danger);border-color:var(--danger);" onclick="adminDeleteGame('${g.id}')"><i class="ph ph-trash"></i></button></td></tr>`;}).join("")}
</tbody></table></div>`;
};

PANELS["add-game"] = function() {
  return `<div class="a2-panel-head"><h2><i class="ph ph-plus-circle"></i> Add New Game</h2></div>
<div class="a2-form-card"><div class="form">
  <div class="a2-form-grid">
    <div class="field"><label>Game Name</label><input id="ng-name" type="text" placeholder="e.g. Full Game" /></div>
    <div class="field"><label>Game Type</label><select id="ng-type"><option>regular</option><option>tournament</option></select></div>
    <div class="field"><label>Entry Fee (₹)</label><input id="ng-entry" type="number" placeholder="50" /></div>
    <div class="field"><label>Prize Amount (₹)</label><input id="ng-prize" type="number" placeholder="90" /></div>
    <div class="field"><label>Max Players</label><input id="ng-players" type="number" placeholder="2" /></div>
    <div class="field"><label>Status</label><select id="ng-status"><option>active</option><option>inactive</option></select></div>
  </div>
  <button class="btn btn-primary" onclick="adminAddGame()"><i class="ph-fill ph-plus-circle"></i> Add Game</button>
</div></div>`;
};

PANELS["view-tournament-games"] = function() {
  const tg = getLiveGames().filter(function(g){return g.type==="tournament";});
  return `<div class="a2-panel-head"><h2><i class="ph ph-list-star"></i> Tournament Games</h2></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Name</th><th>Entry Fee</th><th>Prize Pool</th><th>Max Players</th><th>Status</th></tr></thead><tbody>
${tg.map(function(g,i){return `<tr><td>${i+1}</td><td><strong>${g.name}</strong></td><td>${rupee(g.entry)}</td><td style="color:var(--accent);font-weight:700">${rupee(g.prize)}</td><td>${g.players}</td><td>${statusBadge(g.status)}</td></tr>`;}).join("")}
</tbody></table></div>`;
};

PANELS["add-tournament-game"] = function() {
  return `<div class="a2-panel-head"><h2><i class="ph ph-plus-square"></i> Add Tournament Game</h2></div>
<div class="a2-form-card"><div class="form">
  <div class="a2-form-grid">
    <div class="field"><label>Tournament Name</label><input type="text" placeholder="e.g. Ludo Grand Prix" /></div>
    <div class="field"><label>Base Game</label><select><option>Ludo Classic</option><option>Snake & Ladder</option><option>Ludo Blitz</option></select></div>
    <div class="field"><label>Entry Fee (₹)</label><input type="number" placeholder="100" /></div>
    <div class="field"><label>Prize Pool (₹)</label><input type="number" placeholder="5000" /></div>
    <div class="field"><label>Max Players</label><input type="number" placeholder="64" /></div>
    <div class="field"><label>Start Date & Time</label><input type="datetime-local" /></div>
  </div>
  <button class="btn btn-primary" onclick="showToast('Tournament created! (Firebase needed for persistence)','success')"><i class="ph-fill ph-trophy"></i> Create Tournament</button>
</div></div>`;
};

// ── User Management ───────────────────────────────────────────
PANELS["view-all-users"] = function() {
  const users = getLiveUsers();
  return `<div class="a2-panel-head"><h2><i class="ph ph-user-list"></i> All Users</h2></div>
<div class="a2-search">
  <input type="text" placeholder="Search name, phone or email..." oninput="filterTable(this,'all-users-tbody',1,2,3,4)" />
</div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>User ID</th><th>Name</th><th>Phone</th><th>Email</th><th>KYC</th><th>Chips</th><th>Add / Subtract Chips</th><th>Joined</th><th>Action</th></tr></thead>
<tbody id="all-users-tbody">
${users.length ? users.map(function(u,i){return `<tr><td>${i+1}</td><td style="font-family:monospace;font-size:11px;color:var(--text-muted)">${esc(u.uid||"—")}</td><td><strong>${esc(u.fullName||u.name||"—")}</strong></td><td>${esc(u.phone||"—")}</td><td>${esc(u.email||"—")}</td><td id="kyc-badge-${esc(u.uid)}">${statusBadge(u.kycVerified?"verified":"pending")}</td><td style="color:var(--accent);font-weight:700" id="chips-${esc(u.uid)}">${Number(u.chips||u.wallet||0).toLocaleString("en-IN")}</td>
<td style="white-space:nowrap;display:flex;gap:6px;align-items:center;">
  <input type="number" min="1" placeholder="Amount" id="chipamt-${esc(u.uid)}" style="width:90px;padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:#0F0F16;color:#fff;font-size:13px;" />
  <button class="btn btn-primary" style="padding:5px 10px;font-size:12px;" onclick="adminChipOp('${esc(u.uid)}',1)"><i class="ph ph-plus"></i> Add</button>
  <button class="btn btn-secondary" style="padding:5px 10px;font-size:12px;" onclick="adminChipOp('${esc(u.uid)}',-1)"><i class="ph ph-minus"></i> Sub</button>
</td>
<td>${esc((u.createdAt||"—").slice(0,10))}</td>
<td style="display:flex;gap:6px;flex-wrap:wrap;">
  ${u.kycVerified
    ? `<button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="adminToggleKyc('${esc(u.uid)}',false)"><i class="ph ph-x-circle"></i> Revoke KYC</button>`
    : `<button class="btn btn-primary" style="padding:5px 10px;font-size:11px;" onclick="adminToggleKyc('${esc(u.uid)}',true)"><i class="ph ph-check-circle"></i> Approve KYC</button>`}
  <button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;color:var(--danger);border-color:var(--danger);" onclick="adminDeleteUser('${esc(u.uid)}')"><i class="ph ph-trash"></i></button>
  <button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;color:var(--accent);border-color:var(--accent);" onclick="adminResetUserPassword('${esc(u.uid)}','${esc(u.email||'')}','${esc(u.fullName||u.name||'')}')"><i class="ph ph-key"></i> Reset Pass</button>
  <button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;color:#a78bfa;border-color:#a78bfa;" onclick="adminViewUserProfile('${esc(u.uid)}')"><i class="ph ph-user-circle"></i> Profile</button>
  ${u.blocked ? `<button class="btn btn-primary" style="padding:5px 10px;font-size:11px;background:#16a34a;border-color:#16a34a;" onclick="adminBlockUser('${esc(u.uid)}',false)"><i class="ph ph-lock-open"></i> Unblock</button>` : `<button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;color:#f97316;border-color:#f97316;" onclick="adminBlockUser('${esc(u.uid)}',true)"><i class="ph ph-lock"></i> Block</button>`}
</td></tr>`;}).join("") : emptyRow(10,"No users registered yet.")}
</tbody></table></div>`;
};

PANELS["add-user"] = function() {
  return `<div class="a2-panel-head"><h2><i class="ph ph-user-plus"></i> Add New User</h2></div>
<div class="a2-form-card"><div class="form">
  <div class="a2-form-grid">
    <div class="field"><label>Full Name</label><input id="nu-name" type="text" placeholder="Full name" /></div>
    <div class="field"><label>Phone</label><input id="nu-phone" type="tel" placeholder="10-digit mobile" /></div>
    <div class="field"><label>Email</label><input id="nu-email" type="email" placeholder="user@example.com" /></div>
    <div class="field"><label>Password</label><input id="nu-pass" type="password" placeholder="Min 8 chars" /></div>
    <div class="field"><label>KYC Type</label><select id="nu-kyc"><option>aadhaar</option><option>pan</option><option>dl</option><option>passport</option></select></div>
    <div class="field"><label>Initial Chips</label><input id="nu-chips" type="number" placeholder="0" /></div>
  </div>
  <button class="btn btn-primary" onclick="adminAddUser()"><i class="ph-fill ph-user-plus"></i> Create User</button>
</div></div>`;
};

PANELS["review-kyc"] = function() {
  const all = getLiveUsers();
  const pending  = all.filter(function(u){ return !u.kycVerified && !u.kycRejected; });
  const approved = all.filter(function(u){ return u.kycVerified; });
  const rejected = all.filter(function(u){ return !u.kycVerified && u.kycRejected; });

  function kycRow(u, i) {
    var viewBtn = u.kycKey
      ? `<button class="btn btn-primary" style="padding:5px 12px;font-size:12px;" onclick="adminViewKyc('${u.kycKey}')"><i class="ph ph-eye"></i> Aadhaar F</button>`
      : u.kycUrl
        ? `<button class="btn btn-primary" style="padding:5px 12px;font-size:12px;" onclick="adminShowDocModal('${u.kycUrl}')"><i class="ph ph-eye"></i> Aadhaar F</button>`
        : `<span style="color:var(--text-muted);font-size:12px;">Not uploaded</span>`;
    var backBtn = u.kycBackKey
      ? `<button class="btn btn-secondary" style="padding:5px 12px;font-size:12px;" onclick="adminViewKyc('${u.kycBackKey}')"><i class="ph ph-identification-card-reverse"></i> Aadhaar B</button>`
      : u.kycBackUrl
        ? `<button class="btn btn-secondary" style="padding:5px 12px;font-size:12px;" onclick="adminShowDocModal('${u.kycBackUrl}')"><i class="ph ph-identification-card-reverse"></i> Aadhaar B</button>`
        : ``;
    var panBtn = u.panKey
      ? `<button class="btn btn-secondary" style="padding:5px 12px;font-size:12px;" onclick="adminViewKyc('${u.panKey}')"><i class="ph ph-identification-badge"></i> PAN</button>`
      : u.panUrl
        ? `<button class="btn btn-secondary" style="padding:5px 12px;font-size:12px;" onclick="adminShowDocModal('${u.panUrl}')"><i class="ph ph-identification-badge"></i> PAN</button>`
        : ``;
    var statusBadgeHtml = u.kycVerified
      ? `<span class="badge badge-green">Approved</span>`
      : u.kycRejected
        ? `<span class="badge badge-red">Rejected</span>`
        : `<span class="badge badge-yellow">Pending</span>`;
    var actions = u.kycVerified
      ? `<button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="adminToggleKyc('${u.uid}',false)"><i class="ph ph-x-circle"></i> Revoke</button>`
      : `<button class="btn btn-primary" style="padding:5px 10px;font-size:11px;" onclick="adminApproveKyc('${u.uid}')"><i class="ph ph-check-circle"></i> Approve</button>
         <button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="adminRejectKyc('${u.uid}')"><i class="ph ph-x-circle"></i> Reject</button>`;
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${u.fullName||u.name||"—"}</strong><br><span style="color:var(--text-muted);font-size:11px;">${u.email||""}</span></td>
      <td>${u.phone||"—"}</td>
      <td>
        <div style="font-size:11px;color:var(--text-muted);">Aadhaar</div>
        <div style="font-family:monospace;font-size:12px;font-weight:600;">${u.aadhaarNumber||"—"}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">PAN</div>
        <div style="font-family:monospace;font-size:12px;font-weight:600;">${u.panNumber||"—"}</div>
      </td>
      <td id="kyc-badge-${u.uid}">${statusBadgeHtml}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">${viewBtn}${backBtn}${panBtn}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">${actions}</td>
    </tr>`;
  }

  var rows = [
    ...pending.map(kycRow),
    ...rejected.map(kycRow),
    ...approved.map(kycRow)
  ];

  return `<div class="a2-panel-head">
    <h2><i class="ph ph-identification-card"></i> Review KYC Users</h2>
    <div style="display:flex;gap:8px;">
      <span class="badge badge-yellow">${pending.length} Pending</span>
      <span class="badge badge-red">${rejected.length} Rejected</span>
      <span class="badge badge-green">${approved.length} Approved</span>
    </div>
  </div>
  <div class="a2-table-wrap"><table class="a2-table">
    <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Aadhaar / PAN</th><th>Status</th><th>Documents</th><th>Actions</th></tr></thead>
    <tbody>${rows.length ? rows.join("") : emptyRow(7,"No users registered yet.")}</tbody>
  </table></div>`;
};

PANELS["fraud-users"] = function() {
  const users = getLiveUsers().filter(function(u){return u.fraud;});
  return `<div class="a2-panel-head"><h2><i class="ph ph-warning-octagon"></i> Fraud Users</h2><span class="badge badge-red">${users.length} Flagged</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Chips</th><th>Action</th></tr></thead><tbody>
${users.length ? users.map(function(u,i){return `<tr><td>${i+1}</td><td><strong style="color:var(--danger)">${u.fullName||u.name||"—"}</strong></td><td>${u.phone||"—"}</td><td>${u.email||"—"}</td><td>${Number(u.chips||0).toLocaleString("en-IN")}</td>
<td><button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="showToast('User banned','error')"><i class="ph ph-prohibit"></i> Ban</button></td></tr>`;}).join("") : emptyRow(6,"No fraud users flagged.")}
</tbody></table></div>`;
};

PANELS["wallet-mismatch"] = function() {
  const users = getLiveUsers().filter(function(u){return u.walletMismatch;});
  return `<div class="a2-panel-head"><h2><i class="ph ph-scales"></i> Wallet Mismatch Users</h2><span class="badge badge-red">${users.length} Mismatch</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Chips</th><th>Wallet</th><th>Diff</th><th>Action</th></tr></thead><tbody>
${users.length ? users.map(function(u,i){var diff=Math.abs(Number(u.chips||0)-Number(u.wallet||0));return `<tr><td>${i+1}</td><td><strong>${u.fullName||u.name||"—"}</strong></td><td>${u.phone||"—"}</td><td style="color:var(--accent)">${Number(u.chips||0).toLocaleString("en-IN")}</td><td style="color:var(--success)">${rupee(u.wallet)}</td><td style="color:var(--danger);font-weight:700">${rupee(diff)}</td>
<td><button class="btn btn-primary" style="padding:5px 10px;font-size:11px;" onclick="showToast('Wallet synced','success')"><i class="ph ph-arrows-clockwise"></i> Sync</button></td></tr>`;}).join("") : emptyRow(7,"No wallet mismatches found.")}
</tbody></table></div>`;
};

PANELS["user-profile"] = function() {
  const uid = window._adminProfileUid;
  if (!uid) return `<div class="a2-panel-head"><h2>User Profile</h2></div><p style="padding:24px;color:var(--text-muted);">No user selected.</p>`;

  const u = getLiveUsers().find(function(x){ return x.uid === uid; });
  if (!u) return `<div class="a2-panel-head"><h2>User Profile</h2></div><p style="padding:24px;color:var(--text-muted);">User not found.</p>`;

  const allSets    = getLiveSets();
  const allResults = getLiveResults();
  const deposits   = getLiveDeposits().filter(function(d){ return d.uid === uid; });
  const withdrawals= getLiveWithdrawals().filter(function(w){ return w.uid === uid; });

  // Games: sets where user is creator or opponent
  const userSets = allSets.filter(function(s){ return s.uid === uid || s.acceptedBy === uid; });
  // Results: submitter or opponent
  const userResults = allResults.filter(function(r){ return r.submitterUid === uid || r.opponentUid === uid; });

  const totalDeposited  = deposits.filter(function(d){ return d.status==="success"||d.status==="approved"; }).reduce(function(a,d){ return a+Number(d.amount||0); }, 0);
  const totalWithdrawn  = withdrawals.filter(function(w){ return w.status==="approved"; }).reduce(function(a,w){ return a+Number(w.amount||0); }, 0);
  const gamesWon  = userResults.filter(function(r){ return (r.submitterUid===uid&&r.result==="won")||(r.opponentUid===uid&&r.result==="lost"); }).length;
  const gamesLost = userResults.filter(function(r){ return (r.submitterUid===uid&&r.result==="lost")||(r.opponentUid===uid&&r.result==="won"); }).length;

  const gameRows = userResults.length ? userResults.slice().reverse().map(function(r,i){
    const isSubmitter = r.submitterUid === uid;
    const opponent = isSubmitter ? (r.opponentName||"—") : (r.submitterName||"—");
    const myResult = isSubmitter ? r.result : (r.result==="won"?"lost":r.result==="lost"?"won":r.result);
    const resultBadge = myResult==="won"
      ? `<span class="badge badge-green">Won</span>`
      : myResult==="lost"
        ? `<span class="badge badge-red">Lost</span>`
        : `<span class="badge badge-yellow">${myResult||"—"}</span>`;
    return `<tr>
      <td>${i+1}</td>
      <td style="font-size:12px;">${r.gameType||"—"}</td>
      <td>${opponent}</td>
      <td style="color:var(--accent);font-weight:700">${rupee(r.amount)}</td>
      <td>${resultBadge}</td>
      <td>${statusBadge(r.status||"pending")}</td>
      <td style="font-size:11px;color:var(--text-muted);">${fmtTime(r.at)}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:16px;">No game history yet.</td></tr>`;

  return `<div class="a2-panel-head">
    <h2><i class="ph ph-user-circle"></i> User Profile — ${esc(u.fullName||u.name||"—")}</h2>
    <button class="btn btn-secondary" style="padding:5px 14px;font-size:12px;" onclick="window.loadPanel('manage-users','Manage Users')"><i class="ph ph-arrow-left"></i> Back</button>
  </div>

  <!-- Info Cards -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
    <div class="a2-stat-card"><div class="a2-stat-icon"><i class="ph-fill ph-identification-badge"></i></div><div><div class="a2-stat-val" style="font-size:12px;font-family:monospace;">${esc(u.uid||"—")}</div><div class="a2-stat-lbl">User ID</div></div></div>
    <div class="a2-stat-card"><div class="a2-stat-icon green"><i class="ph-fill ph-coins"></i></div><div><div class="a2-stat-val" style="color:var(--accent)">${Number(u.chips||0).toLocaleString("en-IN")}</div><div class="a2-stat-lbl">Wallet Chips</div></div></div>
    <div class="a2-stat-card"><div class="a2-stat-icon"><i class="ph-fill ph-piggy-bank"></i></div><div><div class="a2-stat-val" style="color:var(--success)">${rupee(totalDeposited)}</div><div class="a2-stat-lbl">Total Deposited</div></div></div>
    <div class="a2-stat-card"><div class="a2-stat-icon red"><i class="ph-fill ph-arrow-up-right"></i></div><div><div class="a2-stat-val" style="color:var(--danger)">${rupee(totalWithdrawn)}</div><div class="a2-stat-lbl">Total Withdrawn</div></div></div>
    <div class="a2-stat-card"><div class="a2-stat-icon green"><i class="ph-fill ph-trophy"></i></div><div><div class="a2-stat-val" style="color:var(--success)">${gamesWon}</div><div class="a2-stat-lbl">Games Won</div></div></div>
    <div class="a2-stat-card"><div class="a2-stat-icon red"><i class="ph-fill ph-x-circle"></i></div><div><div class="a2-stat-val" style="color:var(--danger)">${gamesLost}</div><div class="a2-stat-lbl">Games Lost</div></div></div>
    <div class="a2-stat-card"><div class="a2-stat-icon blue"><i class="ph-fill ph-sword"></i></div><div><div class="a2-stat-val" style="color:#007AFF">${userSets.length}</div><div class="a2-stat-lbl">Total Challenges</div></div></div>
    <div class="a2-stat-card"><div class="a2-stat-icon"><i class="ph-fill ph-identification-card"></i></div><div><div class="a2-stat-val" style="font-size:13px;">${statusBadge(u.kycVerified?"verified":u.kycRejected?"rejected":"pending")}</div><div class="a2-stat-lbl">KYC Status</div></div></div>
  </div>

  <!-- Basic Info -->
  <div class="a2-panel-head" style="margin-bottom:12px;"><h3 style="font-size:14px;"><i class="ph ph-info"></i> Basic Info</h3></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:20px;">
    <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Phone</div><div style="font-weight:600;margin-top:4px;">${esc(u.phone||"—")}</div></div>
    <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Email</div><div style="font-weight:600;margin-top:4px;">${esc(u.email||"—")}</div></div>
    <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Aadhaar No.</div><div style="font-family:monospace;font-weight:600;margin-top:4px;">${esc(u.aadhaarNumber||"—")}</div></div>
    <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">PAN No.</div><div style="font-family:monospace;font-weight:600;margin-top:4px;">${esc(u.panNumber||"—")}</div></div>
    <div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;"><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Joined</div><div style="font-weight:600;margin-top:4px;">${fmtTime(u.createdAt)}</div></div>
  </div>

  <!-- Game History -->
  <div class="a2-panel-head" style="margin-bottom:12px;"><h3 style="font-size:14px;"><i class="ph ph-game-controller"></i> Game History</h3></div>
  <div class="a2-table-wrap"><table class="a2-table">
    <thead><tr><th>#</th><th>Game</th><th>Opponent</th><th>Amount</th><th>Result</th><th>Status</th><th>Time</th></tr></thead>
    <tbody>${gameRows}</tbody>
  </table></div>`;
};
