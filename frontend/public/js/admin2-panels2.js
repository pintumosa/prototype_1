// ============================================================
// WinzoIndia Admin v2 — Panel Renderers (Part 2)
// Challenge (sets) + Reports + Transaction Management
// All data read LIVE from localStorage
// ============================================================

// ── Challenge Management (uses winzo_sets_global) ─────────────
PANELS["challenges-24h"] = function() {
  const sets = getLiveSets();
  return `<div class="a2-panel-head"><h2><i class="ph ph-clock-countdown"></i> Last 24h Challenges</h2><span class="badge badge-blue">${sets.length} Total</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Player</th><th>Game</th><th>Value</th><th>Status</th><th>Accepted By</th><th>Time</th></tr></thead><tbody>
${sets.length ? sets.slice().reverse().map(function(s,i){return `<tr><td>${i+1}</td><td><strong>${s.byName||"—"}</strong></td><td>${s.gameType||"—"}</td><td style="color:var(--accent);font-weight:700">₹${Number(s.value||0).toLocaleString("en-IN")}</td><td>${statusBadge(s.acceptedBy?"matched":"open")}</td><td>${s.acceptedByName||"—"}</td><td>${s.createdAt||"—"}</td></tr>`;}).join("") : emptyRow(7,"No challenges in last 24h.")}
</tbody></table></div>`;
};

PANELS["running-challenges"] = function() {
  var sets = getLiveSets();
  var users = getLiveUsers();
  var matched = sets.filter(function(s){ return s.acceptedBy && !s.startedAt && s.status !== "completed" && s.status !== "ended" && s.status !== "cancelled"; });
  var started = sets.filter(function(s){ return s.acceptedBy && s.startedAt && s.status !== "completed" && s.status !== "ended" && s.status !== "cancelled"; });
  var open    = sets.filter(function(s){ return !s.acceptedBy && s.status !== "completed" && s.status !== "ended" && s.status !== "cancelled"; });
  function phoneOf(uid) {
    var u = users.find(function(x){ return x.uid === uid; });
    return u ? (u.phone||"—") : "—";
  }
  function fmt(ts) { return ts ? new Date(ts).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—"; }

  // Live elapsed timer
  function elapsed(ts) {
    if (!ts) return "—";
    var sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    var m = Math.floor(sec/60), s = sec%60;
    return m + "m " + s + "s";
  }

  function startedRows(arr) {
    return arr.map(function(s,i){
      var startedByName = s.startedByName || "—";
      return "<tr>"
        + "<td>"+(i+1)+"</td>"
        + "<td><strong>"+(s.byName||"—")+"</strong><br/><span style='font-size:11px;color:var(--text-muted);'>"+phoneOf(s.uid)+"</span></td>"
        + "<td><strong>"+(s.acceptedByName||"—")+"</strong><br/><span style='font-size:11px;color:var(--text-muted);'>"+phoneOf(s.acceptedBy)+"</span></td>"
        + "<td>"+(s.gameType||"—")+"</td>"
        + "<td style='color:var(--accent);font-weight:700'>₹"+Number(s.value||0).toLocaleString("en-IN")+"</td>"
        + "<td style='font-family:monospace;font-size:13px;color:var(--accent);letter-spacing:1px;'>"+(s.roomCode||"—")+"</td>"
        + "<td style='font-size:11px;color:#4ade80;'>"+fmt(s.startedAt)+"</td>"
        + "<td style='font-size:11px;color:#4ade80;font-weight:700;' id='elapsed-"+s.id+"'>"+elapsed(s.startedAt)+"</td>"
        + "<td style='font-size:11px;'>"+(startedByName)+"</td>"
        + "<td><button class='btn btn-secondary' style='padding:5px 10px;font-size:11px;' onclick=\"adminDeleteSet('"+s.id+"')\"><i class='ph ph-x-circle'></i> Cancel</button></td>"
        + "</tr>";
    }).join("");
  }
  function matchedRows(arr) {
    return arr.map(function(s,i){
      return "<tr>"
        + "<td>"+(i+1)+"</td>"
        + "<td><strong>"+(s.byName||"—")+"</strong><br/><span style='font-size:11px;color:var(--text-muted);'>"+phoneOf(s.uid)+"</span></td>"
        + "<td><strong>"+(s.acceptedByName||"—")+"</strong><br/><span style='font-size:11px;color:var(--text-muted);'>"+phoneOf(s.acceptedBy)+"</span></td>"
        + "<td>"+(s.gameType||"—")+"</td>"
        + "<td style='color:var(--accent);font-weight:700'>₹"+Number(s.value||0).toLocaleString("en-IN")+"</td>"
        + "<td style='font-family:monospace;font-size:13px;'>"+(s.roomCode||"—")+"</td>"
        + "<td style='font-size:11px;'>"+fmt(s.acceptedAt)+"</td>"
        + "<td><button class='btn btn-secondary' style='padding:5px 10px;font-size:11px;' onclick=\"adminDeleteSet('"+s.id+"')\"><i class='ph ph-x-circle'></i> Cancel</button></td>"
        + "</tr>";
    }).join("");
  }
  function openRows(arr) {
    return arr.map(function(s,i){
      return "<tr>"
        + "<td>"+(i+1)+"</td>"
        + "<td><strong>"+(s.byName||"—")+"</strong><br/><span style='font-size:11px;color:var(--text-muted);'>"+phoneOf(s.uid)+"</span></td>"
        + "<td>—</td><td>"+(s.gameType||"—")+"</td>"
        + "<td style='color:var(--accent);font-weight:700'>₹"+Number(s.value||0).toLocaleString("en-IN")+"</td>"
        + "<td>—</td><td style='font-size:11px;'>"+fmt(s.at)+"</td>"
        + "<td><button class='btn btn-secondary' style='padding:5px 10px;font-size:11px;' onclick=\"adminDeleteSet('"+s.id+"')\"><i class='ph ph-x-circle'></i> Cancel</button></td>"
        + "</tr>";
    }).join("");
  }

  var html = "<div class='a2-panel-head'><h2><i class='ph ph-spinner-gap'></i> Running Challenges</h2>"
    + "<div style='display:flex;gap:8px;align-items:center;flex-wrap:wrap;'>"
    + "<span class='badge badge-green'>"+started.length+" Live</span> "
    + "<span class='badge badge-blue'>"+matched.length+" Matched</span> "
    + "<span class='badge badge-yellow'>"+open.length+" Open</span>"
    + "<span style='font-size:11px;color:var(--text-muted);margin-left:8px;' id='rc-last-refresh'>Auto-refreshing...</span>"
    + "</div></div>";

  if (started.length) {
    html += "<div style='margin-bottom:8px;font-weight:700;color:#4ade80;display:flex;align-items:center;gap:8px;'><i class='ph-fill ph-play-circle'></i> Games In Progress ("+started.length+") <span style='width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block;animation:dot-pulse 1.5s infinite;'></span></div>"
      + "<div class='a2-table-wrap' style='margin-bottom:24px;'><table class='a2-table'><thead><tr><th>#</th><th>Setter</th><th>Acceptor</th><th>Game</th><th>Amount</th><th>Room Code</th><th>Started At</th><th>Duration</th><th>Started By</th><th>Action</th></tr></thead><tbody>"
      + startedRows(started) + "</tbody></table></div>";
  }
  if (matched.length) {
    html += "<div style='margin-bottom:8px;font-weight:700;color:#60a5fa;'><i class='ph-fill ph-handshake'></i> Matched — Not Yet Started ("+matched.length+")</div>"
      + "<div class='a2-table-wrap' style='margin-bottom:24px;'><table class='a2-table'><thead><tr><th>#</th><th>Setter</th><th>Acceptor</th><th>Game</th><th>Amount</th><th>Room Code</th><th>Matched At</th><th>Action</th></tr></thead><tbody>"
      + matchedRows(matched) + "</tbody></table></div>";
  }
  if (open.length) {
    html += "<div style='margin-bottom:8px;font-weight:700;color:var(--text-muted);'><i class='ph ph-hourglass'></i> Open — Waiting for Opponent ("+open.length+")</div>"
      + "<div class='a2-table-wrap'><table class='a2-table'><thead><tr><th>#</th><th>Setter</th><th>Acceptor</th><th>Game</th><th>Amount</th><th>Room Code</th><th>Posted At</th><th>Action</th></tr></thead><tbody>"
      + openRows(open) + "</tbody></table></div>";
  }
  if (!started.length && !matched.length && !open.length) {
    html += "<p style='color:var(--text-muted);padding:24px;text-align:center;'>No challenges found.</p>";
  }
  return html;
};

PANELS["search-challenges"] = function() {
  const sets = getLiveSets();
  return `<div class="a2-panel-head"><h2><i class="ph ph-magnifying-glass"></i> Search Challenges</h2></div>
<div class="a2-search">
  <input type="text" placeholder="Search by player name or game..." oninput="filterTable(this,'search-ch-tbody',1,2)" />
</div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Player</th><th>Game</th><th>Value</th><th>Status</th><th>Accepted By</th></tr></thead>
<tbody id="search-ch-tbody">
${sets.length ? sets.slice().reverse().map(function(s,i){return `<tr><td>${i+1}</td><td><strong>${s.byName||"—"}</strong></td><td>${s.gameType||"—"}</td><td style="color:var(--accent);font-weight:700">₹${Number(s.value||0).toLocaleString("en-IN")}</td><td>${statusBadge(s.acceptedBy?"matched":"open")}</td><td>${s.acceptedByName||"—"}</td></tr>`;}).join("") : emptyRow(6,"No challenges found.")}
</tbody></table></div>`;
};

PANELS["search-screenshots"] = function() {
  var results = getLiveResults();
  var reports = getLiveReports();
  var all = results.concat(reports.map(function(r){ return { _type:"report", submitterName:r.reporterName, submitterPhone:"—", opponentName:r.opponent, opponentPhone:"—", gameType:"—", amount:"—", result:"report", proofUrl:r.proofUrl, screenshotAt:r.screenshotAt||null, status:r.status, at:r.at||"—" }; }));
  all.sort(function(a,b){ return (a.gameId||"").localeCompare(b.gameId||""); });
  var rows = ""; var lastGameId = null; var groupSerial = 0; var isFirstInGroup = false;
  all.forEach(function(r){
    var gid = r.gameId||"—";
    if (gid !== lastGameId) {
      if (lastGameId !== null)
        rows += "<tr><td colspan='13' style='padding:0;height:3px;background:rgba(255,0,0,0.5);border:none;'></td></tr><tr><td colspan='13' style='padding:0;height:2px;background:transparent;border:none;'></td></tr>";
      lastGameId = gid; groupSerial++; isFirstInGroup = true;
    } else { isFirstInGroup = false; }
    var imgUrl = r.proofKey || r.proofUrl;
    var storjKey = imgUrl ? (imgUrl.match(/\/storj\/(.+?)(?:\?|$)/)?.[1] || null) : null;
    var thumb = imgUrl
      ? "<button class='btn btn-secondary' style='padding:3px 8px;font-size:11px;' onclick=\""+(storjKey ? "adminViewKyc('"+storjKey+"')" : "adminShowDocModal('"+imgUrl+"')")+"\"><i class='ph ph-image'></i> View</button>"
      : "—";
    var actions = "—";
    if (!r._type && r.status === "pending") {
      var prize = Math.floor(Number(r.amount||0) * 2 * 0.95);
      actions = "<div style='display:flex;gap:6px;flex-wrap:wrap;'>"
        + "<button class='btn btn-secondary' style='padding:4px 10px;font-size:11px;color:#4ade80;border-color:#4ade80;' onclick=\"adminDeclareWinner('"+r.id+"','"+r.submitterUid+"','"+r.submitterName+"',"+prize+")\"><i class='ph-fill ph-trophy'></i> "+r.submitterName+"</button>"
        + "<button class='btn btn-secondary' style='padding:4px 10px;font-size:11px;color:#60a5fa;border-color:#60a5fa;' onclick=\"adminDeclareWinner('"+r.id+"','"+r.opponentUid+"','"+r.opponentName+"',"+prize+")\"><i class='ph-fill ph-trophy'></i> "+r.opponentName+"</button>"
        + "<button class='btn btn-secondary' style='padding:4px 10px;font-size:11px;color:var(--danger);border-color:var(--danger);' onclick=\"adminCancelResult('"+r.id+"','"+r.submitterUid+"','"+r.opponentUid+"',"+Number(r.amount||0)+")\"><i class='ph ph-x-circle'></i> Cancel</button>"
        + "</div>";
    }
    rows += "<tr>"
      + "<td>"+(isFirstInGroup ? groupSerial : "")+"</td>"
      + "<td style=\"font-family:monospace;font-size:12px;color:var(--accent);\">"+gid+"</td>"
      + "<td><strong>"+(r.submitterName||"—")+"</strong></td>"
      + "<td>"+(r.submitterPhone||"—")+"</td>"
      + "<td>"+(r.opponentName||"—")+"</td>"
      + "<td>"+(r.opponentPhone||"—")+"</td>"
      + "<td>"+(r.gameType||"—")+"</td>"
      + "<td>"+(r.amount && r.amount!=="—" ? rupee(r.amount) : "—")+"</td>"
      + "<td>"+statusBadge(r.result||"pending")+"</td>"
      + "<td>"+thumb+"</td>"
      + "<td style=\"font-size:12px;color:var(--accent);font-weight:600;white-space:nowrap;\">"+(r.screenshotAt||r.at||"—")+"</td>"
      + "<td>"+statusBadge(r.status||"pending")+"</td>"
      + "<td>"+actions+"</td>"
      + "</tr>";
  });
  return "<div class=\"a2-panel-head\"><h2><i class=\"ph ph-image-square\"></i> Search Screenshots</h2></div>"
    + "<div class=\"a2-search\"><input type=\"text\" placeholder=\"Search by player or opponent...\" oninput=\"filterTable(this,'ss-tbody',2,4)\" /></div>"
    + "<div class=\"a2-table-wrap\"><table class=\"a2-table\"><thead><tr><th>#</th><th>Game ID</th><th>Player</th><th>Phone</th><th>Opponent</th><th>Opp. Phone</th><th>Game</th><th>Amount</th><th>Result</th><th>Screenshot</th><th>Screenshot Time</th><th>Status</th><th>Action</th></tr></thead>"
    + "<tbody id=\"ss-tbody\">"+(all.length ? rows : emptyRow(13,"No screenshots submitted yet."))+"</tbody></table></div>";
};

PANELS["all-challenges"] = function() {
  const sets = getLiveSets();
  return `<div class="a2-panel-head"><h2><i class="ph ph-stack"></i> All Challenges</h2></div>
<div class="a2-search">
  <input type="text" placeholder="Search player or game..." oninput="filterTable(this,'all-ch-tbody',1,2)" />
</div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Player</th><th>Game</th><th>Value</th><th>Status</th><th>Accepted By</th><th>Action</th></tr></thead>
<tbody id="all-ch-tbody">
${sets.length ? sets.slice().reverse().map(function(s,i){return `<tr><td>${i+1}</td><td><strong>${s.byName||"—"}</strong></td><td>${s.gameType||"—"}</td><td style="color:var(--accent);font-weight:700">₹${Number(s.value||0).toLocaleString("en-IN")}</td><td>${statusBadge(s.acceptedBy?"matched":"open")}</td><td>${s.acceptedByName||"—"}</td>
<td><button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="adminDeleteSet('${s.id}')"><i class="ph ph-trash"></i> Delete</button></td></tr>`;}).join("") : emptyRow(7,"No challenges yet.")}
</tbody></table></div>`;
};

// ── Transaction Management ────────────────────────────────────
PANELS["deposit-detail"] = function() {
  var id = window._depositDetailId;
  var d = getLiveDeposits().find(function(x){ return x.id === id; });
  if (!d) return '<div style="padding:40px;text-align:center;color:var(--text-muted);">Deposit not found.</div>';
  var storjKey = d.proofUrl ? (d.proofUrl.match(/\/storj\/(.+?)(?:\?|$)/)?.[1] || null) : null;
  var screenshotBtn = d.proofUrl
    ? "<button class='btn btn-secondary' style='width:100%;padding:8px;font-size:13px;margin-top:4px;' onclick=\""+(storjKey?"adminViewKyc('"+storjKey+"')":"adminShowDocModal('"+d.proofUrl+"')")+"\"><i class='ph ph-image'></i> View Screenshot</button>"
    : "<div style='color:var(--text-muted);font-size:13px;'>No screenshot uploaded</div>";
  return `<div class="a2-panel-head"><h2><i class="ph ph-arrow-down-left"></i> Deposit Request</h2>
    <button class="btn btn-secondary" style="font-size:12px;padding:5px 12px;" onclick="window.syncAndReload('new-deposit-requests','New Deposit Requests')"><i class="ph ph-arrow-left"></i> All Requests</button>
  </div>
  <div style="max-width:480px;margin:32px auto;background:var(--card);border-radius:12px;padding:28px 32px;display:flex;flex-direction:column;gap:14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:20px;font-weight:700;">${d.user||"—"}</div>
      ${d.uid ? `<button class="btn btn-secondary" style="font-size:12px;padding:5px 12px;" onclick="adminViewUserProfile('${d.uid}')"><i class="ph ph-user"></i> View Profile</button>` : ""}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;font-size:14px;">
      <div><span style="color:var(--text-muted);">Phone</span><br><strong>${d.userPhone||"—"}</strong></div>
      <div><span style="color:var(--text-muted);">Email</span><br><strong>${d.userEmail||"—"}</strong></div>
      <div><span style="color:var(--text-muted);">Amount</span><br><strong style="color:var(--accent);font-size:18px;">${rupee(d.amount)}</strong></div>
      <div><span style="color:var(--text-muted);">Method</span><br><strong>${d.method||"—"}</strong></div>
      <div style="grid-column:1/-1;"><span style="color:var(--text-muted);">Txn ID / UTR</span><br><strong style="font-family:monospace;font-size:15px;">${d.txnId||"—"}</strong></div>
      <div><span style="color:var(--text-muted);">Requested At</span><br><strong>${fmtTime(d.time)}</strong></div>
      <div><span style="color:var(--text-muted);">Status</span><br>${statusBadge(d.status||"pending")}</div>
    </div>
    <div>${screenshotBtn}</div>
    <div style="display:flex;gap:12px;margin-top:4px;">
      <button class="btn btn-primary" style="flex:1;padding:10px;font-size:14px;" onclick="approveDepositRequest('${d.id}')"><i class="ph ph-check"></i> Approve</button>
      <button class="btn btn-secondary" style="flex:1;padding:10px;font-size:14px;color:var(--danger);border-color:var(--danger);" onclick="rejectDepositRequest('${d.id}')"><i class="ph ph-x"></i> Reject</button>
    </div>
  </div>`;
};

PANELS["new-deposit-requests"] = function() {
  const reqs = getLiveDeposits().filter(function(d){ return d.type === "Deposit Request" && d.status === "pending"; }).slice().reverse();
  return `<div class="a2-panel-head"><h2><i class="ph ph-bell-ringing"></i> New Deposit Requests</h2><span class="badge badge-yellow">${reqs.length} Pending</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>User</th><th>Phone</th><th>Email</th><th>Amount</th><th>Method</th><th>Txn ID / UTR</th><th>Requested At</th><th>Action</th></tr></thead><tbody>
${reqs.length ? reqs.map(function(d,i){ return `<tr data-dep-id="${d.id}">
  <td>${i+1}</td>
  <td><strong>${d.user||"—"}</strong></td>
  <td>${d.userPhone||"—"}</td>
  <td>${d.userEmail||"—"}</td>
  <td style="color:var(--accent);font-weight:700">${rupee(d.amount)}</td>
  <td>${d.method||"—"}</td>
  <td style="font-family:monospace;font-size:12px;">${d.txnId||"—"}</td>
  <td style="font-size:11px;color:var(--text-muted);">${fmtTime(d.time)}</td>
  <td style="display:flex;gap:6px;">
    <button class="btn btn-primary" style="padding:5px 12px;font-size:12px;" onclick="approveDepositRequest('${d.id}')"><i class="ph ph-check"></i> Approve</button>
    <button class="btn btn-secondary" style="padding:5px 12px;font-size:12px;color:var(--danger);border-color:var(--danger);" onclick="rejectDepositRequest('${d.id}')"><i class="ph ph-x"></i> Reject</button>
  </td>
</tr>`;}).join("") : emptyRow(9,"No pending deposit requests.")}
</tbody></table></div>`;
};

PANELS["deposits-2h"] = function() {
  const deps = getLiveDeposits().slice(-10).reverse();
  return `<div class="a2-panel-head"><h2><i class="ph ph-clock"></i> Last 2h Deposits</h2><span class="badge badge-green">${deps.length} Recent</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Txn ID</th><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Time</th></tr></thead><tbody>
${deps.length ? deps.map(function(d,i){return `<tr><td>${i+1}</td><td style="font-family:var(--font-head);font-size:11px;color:var(--text-muted)">${(d.id||"—").toUpperCase()}</td><td>${d.user||d.userName||"—"}</td><td style="color:var(--success);font-weight:700">${rupee(d.amount)}</td><td>${d.method||"UPI"}</td><td>${statusBadge(d.status||"pending")}</td><td style="font-size:11px;color:var(--text-muted);">${fmtTime(d.time||d.createdAt)}</td></tr>`;}).join("") : emptyRow(7,"No recent deposits.")}
</tbody></table></div>`;
};

PANELS["recent-withdrawals"] = function() {
  const all = getLiveWithdrawals();
  const pending = all.filter(function(w){return w.status==="pending";});
  return `<div class="a2-panel-head"><h2><i class="ph ph-arrow-up-right"></i> Recent Withdrawal Requests</h2><span class="badge badge-yellow">${pending.length} Pending</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Txn ID</th><th>User</th><th>Phone</th><th>Amount</th><th>Method</th><th>UPI ID</th><th>Requested At</th><th>Status</th><th>Actions</th></tr></thead><tbody>
${all.length ? all.slice().reverse().map(function(w,i){
  const actions = w.status === "pending"
    ? `<td style="display:flex;gap:6px;">
        <button class="btn btn-primary" style="padding:5px 10px;font-size:11px;" onclick="approveWithdrawRequest('${w.id}')"><i class="ph ph-check"></i> Approve</button>
        <button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;color:var(--danger);border-color:var(--danger);" onclick="rejectWithdrawRequest('${w.id}')"><i class="ph ph-x"></i> Reject</button>
       </td>`
    : `<td>${statusBadge(w.status)}</td>`;
  return `<tr><td>${i+1}</td><td style="font-family:var(--font-head);font-size:11px;color:var(--text-muted)">${(w.id||"—").toUpperCase()}</td><td>${w.user||"—"}</td><td>${w.userPhone||"—"}</td><td style="color:var(--danger);font-weight:700">${rupee(w.amount)}</td><td>${w.method||"UPI"}</td><td style="font-size:12px;">${w.upiId||"—"}</td><td style="font-size:11px;color:var(--text-muted);">${fmtTime(w.time)}</td><td>${statusBadge(w.status||"pending")}</td>${actions}</tr>`;
}).join("") : emptyRow(10,"No withdrawal requests yet.")}
</tbody></table></div>`;
};

PANELS["all-deposits"] = function() {
  const deps = getLiveDeposits();
  return `<div class="a2-panel-head"><h2><i class="ph ph-arrow-down-left"></i> All Deposits</h2></div>
<div class="a2-search">
  <input type="text" placeholder="Search user..." oninput="filterTable(this,'all-dep-tbody',2)" />
</div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Txn ID</th><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Time</th></tr></thead>
<tbody id="all-dep-tbody">
${deps.length ? deps.slice().reverse().map(function(d,i){return `<tr><td>${i+1}</td><td style="font-family:var(--font-head);font-size:11px;color:var(--text-muted)">${(d.id||"—").toUpperCase()}</td><td>${d.user||d.userName||"—"}</td><td style="color:var(--success);font-weight:700">${rupee(d.amount)}</td><td>${d.method||"UPI"}</td><td>${statusBadge(d.status||"pending")}</td><td style="font-size:11px;color:var(--text-muted);">${fmtTime(d.time||d.createdAt)}</td></tr>`;}).join("") : emptyRow(7,"No deposits yet.")}
</tbody></table></div>`;
};

PANELS["all-withdrawals"] = function() {
  const wds = getLiveWithdrawals();
  return `<div class="a2-panel-head"><h2><i class="ph ph-list-checks"></i> All Withdraw Requests</h2></div>
<div class="a2-search">
  <input type="text" placeholder="Search user..." oninput="filterTable(this,'all-wd-tbody',2)" />
</div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>Txn ID</th><th>User</th><th>Phone</th><th>Amount</th><th>Method</th><th>UPI ID</th><th>Status</th><th>Time</th></tr></thead>
<tbody id="all-wd-tbody">
${wds.length ? wds.slice().reverse().map(function(w,i){return `<tr>
  <td>${i+1}</td>
  <td style="font-family:var(--font-head);font-size:11px;color:var(--text-muted)">${(w.id||"—").toUpperCase()}</td>
  <td>${w.user||w.userName||"—"}</td>
  <td>${w.userPhone||"—"}</td>
  <td style="color:var(--danger);font-weight:700">${rupee(w.amount)}</td>
  <td>${w.method||"UPI"}</td>
  <td style="font-size:12px;">${w.upiId||"—"}</td>
  <td>${statusBadge(w.status||"pending")}</td>
  <td style="font-size:11px;color:var(--text-muted);">${fmtTime(w.time||w.createdAt)}</td>
</tr>`;}).join("") : emptyRow(9,"No withdrawal requests yet.")}
</tbody></table></div>`;
};

PANELS["manual-deposit"] = function() {
  const users = getLiveUsers();
  return `<div class="a2-panel-head"><h2><i class="ph ph-plus"></i> Manual Deposit by Admin</h2></div>
<div class="a2-tx-card"><h3><i class="ph-fill ph-arrow-down-left"></i> Add Funds to User Wallet</h3>
<div class="form">
  <div class="field"><label>Select User</label>
    <select id="md-user"><option value="">-- Select User --</option>${users.map(function(u){return `<option value="${u.uid}">${u.fullName||u.name} (${u.phone})</option>`;}).join("")}</select>
  </div>
  <div class="field"><label>Amount (₹)</label><input id="md-amount" type="number" placeholder="Enter amount" min="1" /></div>
  <div class="field"><label>Reason / Note</label><input id="md-note" type="text" placeholder="e.g. Bonus, Refund, Correction" /></div>
  <button class="btn btn-primary" onclick="adminManualDeposit()"><i class="ph-fill ph-plus-circle"></i> Add Deposit</button>
</div></div>`;
};

PANELS["manual-withdraw-haoda"] = function() {
  const users = getLiveUsers();
  return `<div class="a2-panel-head"><h2><i class="ph ph-hand-withdraw"></i> Manual Withdraw by Haoda</h2></div>
<div class="a2-tx-card"><h3><i class="ph-fill ph-arrow-up-right"></i> Process Haoda Withdrawal</h3>
<div class="form">
  <div class="field"><label>Select User</label>
    <select><option value="">-- Select User --</option>${users.map(function(u){return `<option value="${u.uid}">${u.fullName||u.name} (${u.phone})</option>`;}).join("")}</select>
  </div>
  <div class="field"><label>Amount (₹)</label><input type="number" placeholder="Enter amount" min="1" /></div>
  <div class="field"><label>Haoda Transaction ID</label><input type="text" placeholder="Haoda Txn ID" /></div>
  <div class="field"><label>Note</label><input type="text" placeholder="Reason" /></div>
  <button class="btn btn-primary" onclick="showToast('Haoda withdrawal processed','success')"><i class="ph-fill ph-hand-withdraw"></i> Process</button>
</div></div>`;
};

PANELS["manual-withdraw-admin"] = function() {
  const users = getLiveUsers();
  return `<div class="a2-panel-head"><h2><i class="ph ph-hand-coins"></i> Manual Withdraw by Admin</h2></div>
<div class="a2-tx-card"><h3><i class="ph-fill ph-hand-coins"></i> Admin Forced Withdrawal</h3>
<div class="form">
  <div class="field"><label>Select User</label>
    <select id="mwa-user"><option value="">-- Select User --</option>${users.map(function(u){return `<option value="${u.uid}">${u.fullName||u.name} (${u.phone})</option>`;}).join("")}</select>
  </div>
  <div class="field"><label>Amount (₹)</label><input id="mwa-amount" type="number" placeholder="Enter amount" min="1" /></div>
  <div class="field"><label>Payment Method</label><select><option>UPI</option><option>Bank Transfer</option><option>Cash</option></select></div>
  <div class="field"><label>UPI ID / Account No.</label><input type="text" placeholder="UPI or bank details" /></div>
  <div class="field"><label>Admin Note</label><input type="text" placeholder="Reason" /></div>
  <button class="btn btn-primary" onclick="adminManualWithdraw()"><i class="ph-fill ph-hand-coins"></i> Process Withdrawal</button>
</div></div>`;
};

// ── Settings ──────────────────────────────────────────────────
PANELS["settings"] = function() {
  const s = window.WinzoSettings ? window.WinzoSettings.get() : {};
  return `<div class="a2-panel-head"><h2><i class="ph ph-sliders"></i> Settings</h2></div>
<div class="a2-form-card"><div class="form">
  <div class="field"><label>Bonus Contact Phone</label><input id="set-bonus-phone" type="text" value="${s.bonusPhone||'+91 99999 99999'}" placeholder="+91 XXXXX XXXXX" /></div>
  <div class="field"><label>Admin Username</label><input id="set-admin-user" type="text" value="${s.adminUser||'admin'}" placeholder="admin username" /></div>
  <div class="field"><label>Admin Password</label><input id="set-admin-pass" type="text" value="${s.adminPass||'winzo-admin-2026'}" placeholder="New password" /></div>
  <div class="field"><label>UPI ID</label><input id="set-upi-id" type="text" value="${s.upiId||'winzoindia@upi'}" placeholder="yourname@upi" /></div>
  <div class="field"><label>UPI Display Name</label><input id="set-upi-name" type="text" value="${s.upiName||'WinzoIndia'}" placeholder="Display name" /></div>
  <div class="field">
    <label>UPI QR Code Image</label>
    ${s.upiQrUrl ? `<img src="${s.upiQrUrl}" alt="Current QR" style="width:140px;height:140px;border-radius:8px;object-fit:contain;background:#111;display:block;margin-bottom:8px;" />` : ''}
    <input id="set-upi-qr-file" type="file" accept="image/*" onchange="adminPreviewQr(this)" style="margin-bottom:6px;" />
    <img id="qr-preview" src="" alt="Preview" style="width:140px;height:140px;border-radius:8px;object-fit:contain;background:#111;display:none;margin-top:6px;" />
    <input type="hidden" id="set-upi-qr-url" value="${s.upiQrUrl||''}" />
  </div>
  <button class="btn btn-primary" onclick="adminSaveSettings()"><i class="ph-fill ph-floppy-disk"></i> Save Settings</button>
</div></div>`;
};

// ── Game Monitor ──────────────────────────────────────────────
PANELS["game-monitor"] = function() {
  var sets = getLiveSets();
  var results = getLiveResults();

  // Build result lookup by challengeId
  var resultMap = {};
  results.forEach(function(r) {
    if (!resultMap[r.challengeId]) resultMap[r.challengeId] = [];
    resultMap[r.challengeId].push(r);
  });

  // Derive status for each game
  function gameStatus(s) {
    if (s.status === "cancelled" || s.cancelledBy) return "cancelled";
    if (s.status === "completed" || s.status === "ended") return "completed";
    if (resultMap[s.id] && resultMap[s.id].length) return "result_pending";
    if (s.startedAt) return "live";
    if (s.acceptedBy) return "matched";
    return "open";
  }

  var statusOrder = { live:0, result_pending:1, matched:2, open:3, completed:4, cancelled:5 };
  sets.sort(function(a,b){ return (statusOrder[gameStatus(a)]||9) - (statusOrder[gameStatus(b)]||9); });

  function statusBadgeG(st) {
    var map = {
      live:           "<span class='badge badge-green'>🟢 Live</span>",
      result_pending: "<span class='badge badge-yellow'>⏳ Result Pending</span>",
      matched:        "<span class='badge badge-blue'>🤝 Matched</span>",
      open:           "<span class='badge' style='background:rgba(255,255,255,0.06);color:var(--text-secondary);border:1px solid var(--border-subtle);'>Open</span>",
      completed:      "<span class='badge badge-green'>✅ Completed</span>",
      cancelled:      "<span class='badge badge-red'>❌ Cancelled</span>"
    };
    return map[st] || st;
  }

  var rows = sets.map(function(s, i) {
    var st = gameStatus(s);
    var res = resultMap[s.id] || [];
    var resultCells = "—";
    if (res.length) {
      resultCells = res.map(function(r) {
        var color = r.result === "won" ? "#4ade80" : r.result === "lost" ? "#f87171" : "#fbbf24";
        var thumb = r.proofUrl
          ? "<button class='btn btn-secondary gm-proof-btn' style='padding:2px 7px;font-size:11px;' data-proof-url='"+encodeURIComponent(r.proofUrl)+"'>📷 View</button>"
          : "<span style='font-size:11px;color:var(--text-muted);'>No screenshot</span>";
        return "<div style='border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:6px 8px;margin-bottom:4px;'>"
          + "<div style='font-size:12px;color:"+color+";font-weight:700;'>"+(r.submitterName||"?")+" — "+r.result.toUpperCase()+"</div>"
          + "<div style='font-size:11px;color:var(--text-muted);'>📞 "+(r.submitterPhone||"—")+"</div>"
          + "<div style='font-size:11px;color:var(--text-muted);'>🕐 Uploaded: "+(r.screenshotAt||r.at||"—")+"</div>"
          + "<div style='margin-top:4px;'>"+thumb+"</div>"
          + "</div>";
      }).join("");
    }
    var cancelInfo = s.cancelledBy ? "<div style='font-size:11px;color:#f87171;'>Cancelled by: "+s.cancelledBy+(s.cancelledAt?" at "+new Date(s.cancelledAt).toLocaleString("en-IN"):"")+"></div>" : "";
    var startInfo = "";
    if (s.setterStartedAt) startInfo += "<div style='font-size:11px;color:#4ade80;'>▶ <b>"+(s.byName||"Setter")+"</b>: "+new Date(s.setterStartedAt).toLocaleString("en-IN")+"</div>";
    if (s.acceptorStartedAt) startInfo += "<div style='font-size:11px;color:#4ade80;'>▶ <b>"+(s.acceptedByName||"Opponent")+"</b>: "+new Date(s.acceptorStartedAt).toLocaleString("en-IN")+"</div>";
    if (!startInfo && s.startedAt) startInfo = "<div style='font-size:11px;color:#4ade80;'>🟢 "+new Date(s.startedAt).toLocaleString("en-IN")+(s.startedBy?" by "+s.startedBy:"")+"</div>";
    if (!startInfo) startInfo = "—";


    return "<tr>"
      + "<td style='font-size:11px;font-family:monospace;color:var(--accent);'>"+(s.gameId||s.id).slice(-8)+"</td>"
      + "<td>"+statusBadgeG(st)+"</td>"
      + "<td><strong>"+(s.byName||"—")+"</strong><div style='font-size:11px;color:var(--text-muted);'>₹"+(s.value||0)+" · "+(s.gameType||"—")+"</div></td>"
      + "<td>"+(s.acceptedByName||"<span style='color:var(--text-muted);font-size:12px;'>Waiting...</span>")+"</td>"
      + "<td style='font-family:monospace;font-size:12px;'>"+(s.roomCode||"—")+"</td>"
      + "<td>"+startInfo+"</td>"
      + "<td>"+resultCells+"</td>"
      + "<td>"+cancelInfo+(s.cancelledBy?"":"—")+"</td>"
      + "<td style='font-size:11px;color:var(--text-muted);'>"+new Date(s.at).toLocaleString("en-IN")+"</td>"
      + "</tr>";
  }).join("");

  var live = sets.filter(function(s){ return gameStatus(s)==="live"; }).length;
  var pending = sets.filter(function(s){ return gameStatus(s)==="result_pending"; }).length;
  var completed = sets.filter(function(s){ return gameStatus(s)==="completed"; }).length;
  var cancelled = sets.filter(function(s){ return gameStatus(s)==="cancelled"; }).length;

  return "<div class='a2-panel-head'>"
    + "<h2><i class='ph ph-monitor-play'></i> Game Monitor</h2>"
    + "<div style='display:flex;gap:8px;flex-wrap:wrap;'>"
    + "<span class='badge badge-green'>🟢 Live: "+live+"</span>"
    + "<span class='badge badge-yellow'>⏳ Pending: "+pending+"</span>"
    + "<span class='badge badge-green'>✅ Done: "+completed+"</span>"
    + "<span class='badge badge-red'>❌ Cancelled: "+cancelled+"</span>"
    + "</div></div>"
    + "<div class='a2-search'><input type='text' placeholder='Search player name...' oninput=\"filterTable(this,'gm-tbody',2,3)\" /></div>"
    + "<div class='a2-table-wrap'><table class='a2-table'><thead><tr>"
    + "<th>Game ID</th><th>Status</th><th>Setter</th><th>Opponent</th><th>Room Code</th><th>Started</th><th>Result Claims</th><th>Cancelled</th><th>Created</th>"
    + "</tr></thead><tbody id='gm-tbody'>"+(sets.length ? rows : emptyRow(9,"No games found."))+"</tbody></table></div>";
};
