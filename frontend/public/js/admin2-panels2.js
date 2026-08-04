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
  var matched = sets.filter(function(s){ return s.acceptedBy && !s.startedAt; });
  var started = sets.filter(function(s){ return s.acceptedBy && s.startedAt; });
  var open    = sets.filter(function(s){ return !s.acceptedBy; });
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
  var rows = all.map(function(r,i){
    var thumb = r.proofUrl ? "<a href=\""+r.proofUrl+"\" target=\"_blank\"><img src=\""+r.proofUrl+"\" style=\"width:48px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer;\" /></a>" : "—";
    var actions = "—";
    if (!r._type && r.status === "pending") {
      var prize = Math.floor(Number(r.amount||0) * 2 * 0.95);
      actions = "<div style='display:flex;gap:6px;flex-wrap:wrap;'>"
        + "<button class='btn btn-secondary' style='padding:4px 10px;font-size:11px;color:#4ade80;border-color:#4ade80;' onclick=\"adminDeclareWinner('"+r.id+"','"+r.submitterUid+"','"+r.submitterName+"',"+prize+")\"><i class='ph-fill ph-trophy'></i> "+r.submitterName+"</button>"
        + "<button class='btn btn-secondary' style='padding:4px 10px;font-size:11px;color:#60a5fa;border-color:#60a5fa;' onclick=\"adminDeclareWinner('"+r.id+"','"+r.opponentUid+"','"+r.opponentName+"',"+prize+")\"><i class='ph-fill ph-trophy'></i> "+r.opponentName+"</button>"
        + "<button class='btn btn-secondary' style='padding:4px 10px;font-size:11px;color:var(--danger);border-color:var(--danger);' onclick=\"adminCancelResult('"+r.id+"','"+r.submitterUid+"','"+r.opponentUid+"',"+Number(r.amount||0)+")\"><i class='ph ph-x-circle'></i> Cancel</button>"
        + "</div>";
    }
    return "<tr>"
      + "<td>"+(i+1)+"</td>"
      + "<td style=\"font-family:monospace;font-size:12px;color:var(--accent);\">"+(r.gameId||"—")+"</td>"
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
  }).join("");
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
PANELS["new-deposit-requests"] = function() {
  const reqs = getLiveDeposits().filter(function(d){ return d.type === "Deposit Request" && d.status === "pending"; });
  return `<div class="a2-panel-head"><h2><i class="ph ph-bell-ringing"></i> New Deposit Requests</h2><span class="badge badge-yellow">${reqs.length} Pending</span></div>
<div class="a2-table-wrap"><table class="a2-table"><thead><tr><th>#</th><th>User</th><th>Phone</th><th>Email</th><th>Amount</th><th>Method</th><th>Txn ID / UTR</th><th>Requested At</th><th>Action</th></tr></thead><tbody>
${reqs.length ? reqs.map(function(d,i){ return `<tr>
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
  const qrPreview = s.qrImage
    ? '<div style="text-align:center;margin-bottom:16px;"><img src="' + s.qrImage + '" alt="Current QR" style="width:160px;height:160px;border-radius:8px;object-fit:contain;border:2px solid var(--accent);" /></div>'
    : '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">No QR image set yet.</p>';
  return `<div class="a2-panel-head"><h2><i class="ph ph-sliders"></i> Settings</h2></div>
<div class="a2-form-card"><div class="form">
  <div class="field"><label>Bonus Contact Phone</label><input id="set-bonus-phone" type="text" value="${s.bonusPhone||'+91 99999 99999'}" placeholder="+91 XXXXX XXXXX" /></div>
  <div class="field"><label>Admin Username</label><input id="set-admin-user" type="text" value="${s.adminUser||'admin'}" placeholder="admin username" /></div>
  <div class="field"><label>Admin Password</label><input id="set-admin-pass" type="text" value="${s.adminPass||'winzo-admin-2026'}" placeholder="New password" /></div>
  <div class="field"><label>UPI ID</label><input id="set-upi-id" type="text" value="${s.upiId||'winzoindia@upi'}" placeholder="yourname@upi" /></div>
  <div class="field"><label>UPI Display Name</label><input id="set-upi-name" type="text" value="${s.upiName||'WinzoIndia'}" placeholder="Display name" /></div>
  <button class="btn btn-primary" onclick="adminSaveSettings()"><i class="ph-fill ph-floppy-disk"></i> Save Settings</button>
</div></div>
<div class="a2-form-card" style="margin-top:24px;"><div class="form">
  <h3 style="margin:0 0 16px;font-size:1rem;"><i class="ph-fill ph-qr-code"></i> QR Code</h3>
  ${qrPreview}
  <div class="field"><label>Upload New QR Image</label><input type="file" id="set-qr-file" accept="image/*" style="width:100%;" /></div>
  <button class="btn btn-primary" onclick="adminSaveQR()"><i class="ph-fill ph-floppy-disk"></i> Save QR Image</button>
</div></div>`;
};
