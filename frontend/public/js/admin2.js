// ============================================================
// WinzoIndia Admin v2 — Main Controller
// ============================================================

// ── Live panel auto-refresh ───────────────────────────────────
var _liveRefreshTimer = null;
var _elapsedTimer = null;

function startLiveRefresh(key, label) {
  stopLiveRefresh();
  _liveRefreshTimer = setInterval(function() {
    if (document.hidden) return; // skip when tab not visible
    if (document.getElementById("topbar-title").textContent === (label || key)) {
      getLiveSetsAsync().then(function() {
        if (document.getElementById("topbar-title").textContent === (label || key)) {
          document.getElementById("main-content").innerHTML = PANELS[key]();
          startElapsedTick();
          var el = document.getElementById("rc-last-refresh");
          if (el) el.textContent = "Updated " + new Date().toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
        }
      });
    } else { stopLiveRefresh(); }
  }, 15000);
  startElapsedTick();
}

function startElapsedTick() {
  if (_elapsedTimer) clearInterval(_elapsedTimer);
  _elapsedTimer = setInterval(function() {
    document.querySelectorAll("[id^='elapsed-']").forEach(function(el) {
      var id = el.id.replace("elapsed-","");
      var sets = getLiveSets();
      var s = sets.find(function(x){ return x.id === id; });
      if (s && s.startedAt) {
        var sec = Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000);
        el.textContent = Math.floor(sec/60) + "m " + (sec%60) + "s";
      }
    });
  }, 1000);
}

function stopLiveRefresh() {
  if (_liveRefreshTimer) { clearInterval(_liveRefreshTimer); _liveRefreshTimer = null; }
  if (_elapsedTimer) { clearInterval(_elapsedTimer); _elapsedTimer = null; }
}

// ── Define globals first so unlock() can call them ───────────
window.loadPanel = function (key, label) {
  var titleEl = document.getElementById("topbar-title");
  titleEl.textContent = label || key;
  titleEl.dataset.panelKey = key;
  var content = document.getElementById("main-content");
  if (PANELS[key]) {
    content.innerHTML = PANELS[key]();
  } else {
    content.innerHTML = '<div style="color:var(--text-muted);padding:40px;text-align:center;">Panel not found: ' + key + '</div>';
  }
  // Start live refresh only for running-challenges panel
  if (key === "running-challenges") {
    startLiveRefresh(key, label || key);
  } else {
    stopLiveRefresh();
  }
};

window.showToast = function (msg, type) {
  if (window.WinzoAuth && window.WinzoAuth.toast) {
    window.WinzoAuth.toast(msg, type || "info");
  } else { alert(msg); }
};

window.filterTable = function (input, tbodyId) {
  var cols = Array.prototype.slice.call(arguments, 2);
  var q = input.value.toLowerCase();
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  Array.prototype.forEach.call(tbody.querySelectorAll("tr"), function (row) {
    var cells = row.querySelectorAll("td");
    var match = cols.some(function (ci) { return cells[ci] && cells[ci].textContent.toLowerCase().includes(q); });
    row.style.display = match ? "" : "none";
  });
};

window.adminViewUserKycDocs = function(uid) {
  var u = getLiveUsers().find(function(x){ return x.uid === uid; });
  if (!u) return;
  function docBtn(key, url, label, icon) {
    if (key) return `<button class="btn btn-primary" style="padding:6px 14px;font-size:12px;" onclick="adminViewKyc('${key}')"><i class="ph ${icon}"></i> ${label}</button>`;
    if (url) return `<button class="btn btn-primary" style="padding:6px 14px;font-size:12px;" onclick="adminShowDocModal('${url}')"><i class="ph ${icon}"></i> ${label}</button>`;
    return `<span style="font-size:12px;color:var(--text-muted);">No ${label}</span>`;
  }
  var existing = document.getElementById("kyc-info-modal");
  if (existing) existing.remove();
  var modal = document.createElement("div");
  modal.id = "kyc-info-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);";
  modal.innerHTML = `<div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:24px;max-width:480px;width:100%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <span style="font-family:var(--font-head);font-size:13px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;"><i class="ph ph-identification-card"></i> KYC Details — ${u.fullName||u.name||uid}</span>
      <button onclick="document.getElementById('kyc-info-modal').remove()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--text-secondary);font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Aadhaar No.</div>
        <div style="font-family:monospace;font-weight:600;margin-top:4px;">${u.aadhaarNumber||"—"}</div>
      </div>
      <div style="background:rgba(255,255,255,0.04);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">PAN No.</div>
        <div style="font-family:monospace;font-weight:600;margin-top:4px;">${u.panNumber||"—"}</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${docBtn(u.kycKey, u.kycUrl, "Aadhaar Front", "ph-identification-card")}
      ${docBtn(u.kycBackKey, u.kycBackUrl, "Aadhaar Back", "ph-identification-card-reverse")}
      ${docBtn(u.panKey, u.panUrl, "PAN Card", "ph-identification-badge")}
    </div>
  </div>`;
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window.adminViewKyc = function (key) {
  // key is now the Storj public URL directly
  window.adminShowDocModal(key);
};

window.adminShowDocModal = function(url) {
  var existing = document.getElementById("kyc-doc-modal");
  if (existing) existing.remove();
  var isImg = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.startsWith("data:image") || /link\.storjshare\.io/i.test(url);
  var content = isImg
    ? `<img src="${url}" style="max-width:100%;max-height:75vh;border-radius:8px;display:block;margin:0 auto;" />`
    : `<iframe src="${url}" style="width:100%;height:75vh;border:none;border-radius:8px;"></iframe>`;
  var modal = document.createElement("div");
  modal.id = "kyc-doc-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);";
  modal.innerHTML = `<div style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:20px;max-width:860px;width:100%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <span style="font-family:var(--font-head);font-size:13px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;">KYC Document</span>
      <button onclick="document.getElementById('kyc-doc-modal').remove()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--text-secondary);font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;">✕</button>
    </div>
    ${content}
  </div>`;
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};

window.approveWithdrawRequest = function(id) {
  var wds = getLiveWithdrawals();
  var w = wds.find(function(x){ return x.id === id; });
  if (!w) return;
  w.status = "approved";
  // Deduct chips from user
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.fullName === w.user || x.phone === w.userPhone || x.email === w.userEmail; });
  if (u) {
    u.chips = Math.max(0, (Number(u.chips) || 0) - Number(w.amount));
    u.wallet = u.chips;
    saveLiveUsers(users);
    if (window.WINZO_SB) window.WINZO_SB.from("users").update({ chips: u.chips }).eq("uid", u.uid).then(function(){});
  }
  try { localStorage.setItem("winzo_withdraws", JSON.stringify(wds)); } catch(e) {}
  if (window.WINZO_SB) window.WINZO_SB.from("withdraws").update({ status: "approved" }).eq("id", id).then(function(){});
  showToast("Withdrawal approved & ₹" + w.amount + " deducted from " + w.user, "success");
  window.syncAndReload("recent-withdrawals", "Recent Withdrawal Requests");
};

window.rejectWithdrawRequest = function(id) {
  var wds = getLiveWithdrawals();
  var w = wds.find(function(x){ return x.id === id; });
  if (!w) return;
  w.status = "rejected";
  try { localStorage.setItem("winzo_withdraws", JSON.stringify(wds)); } catch(e) {}
  if (window.WINZO_SB) window.WINZO_SB.from("withdraws").update({ status: "rejected" }).eq("id", id).then(function(){});
  showToast("Withdrawal rejected.", "error");
  window.syncAndReload("recent-withdrawals", "Recent Withdrawal Requests");
};

window.approveDepositRequest = function(id) {
  var deps = getLiveDeposits();
  var d = deps.find(function(x){ return x.id === id; });
  if (!d) return;
  d.status = "success";
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.fullName === d.user || x.phone === d.userPhone || x.email === d.userEmail; });
  if (u) { u.chips = (Number(u.chips) || 0) + Number(d.amount); u.wallet = u.chips; saveLiveUsers(users); }
  try { localStorage.setItem("winzo_deposits", JSON.stringify(deps)); } catch(e) {}
  if (window.WINZO_SB) {
    window.WINZO_SB.from("deposits").update({ status:"success" }).eq("id", id).then(function(){});
  }
  showToast("Approved & " + d.amount + " chips credited to " + d.user, "success");
  window.syncAndReload("new-deposit-requests", "New Deposit Requests");
};

window.rejectDepositRequest = function(id) {
  var deps = getLiveDeposits();
  var d = deps.find(function(x){ return x.id === id; });
  if (!d) return;
  d.status = "rejected";
  try { localStorage.setItem("winzo_deposits", JSON.stringify(deps)); } catch(e) {}
  if (window.WINZO_SB) {
    window.WINZO_SB.from("deposits").update({ status:"rejected" }).eq("id", id).then(function(){});
  }
  showToast("Request rejected.", "error");
  window.syncAndReload("new-deposit-requests", "New Deposit Requests");
};

window.adminDeleteUser = function (uid) {
  if (!confirm("Delete this user permanently?")) return;
  saveLiveUsers(getLiveUsers().filter(function(u){ return u.uid !== uid; }));
  showToast("User deleted", "success");
  window.syncAndReload("view-all-users", "View All Users");
};

window.adminViewUserProfile = function (uid) {
  window._adminProfileUid = uid;
  // Show immediately from cache, then refresh with full data (including KYC URLs)
  var cached = getLiveUsers().find(function(x){ return x.uid === uid; });
  window.loadPanel("user-profile", "User Profile — " + (cached ? (cached.fullName||cached.name||uid) : uid));
  getLiveUserFullAsync(uid).then(function(full) {
    if (!full) return;
    // Merge full data into cache
    if (_usersMemCache) {
      var idx = _usersMemCache.findIndex(function(x){ return x.uid === uid; });
      if (idx !== -1) _usersMemCache[idx] = full; else _usersMemCache.push(full);
    }
    var titleEl = document.getElementById("topbar-title");
    if (titleEl && titleEl.dataset.panelKey === "user-profile") {
      window.loadPanel("user-profile", "User Profile — " + (full.fullName||full.name||uid));
    }
  });
};

window.adminChipOp = function (uid, direction) {
  var amt = Number(document.getElementById("chipamt-" + uid)?.value);
  if (!amt || amt < 1) return showToast("Enter a valid amount.", "error");
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.uid === uid; });
  if (!u) return;
  u.chips = Math.max(0, (Number(u.chips ?? u.wallet) || 0) + (direction * amt));
  u.wallet = u.chips;
  saveLiveUsers(users);
  if (window.WINZO_SB) window.WINZO_SB.from("users").update({ chips: u.chips }).eq("uid", uid).then(function(){});
  // Log to transaction history
  var txns = getLiveDeposits();
  txns.unshift({
    id: "txn_" + Date.now(),
    user: u.fullName || u.name,
    userPhone: u.phone || "—",
    userEmail: u.email || "—",
    amount: amt,
    type: direction > 0 ? "Admin Add" : "Admin Subtract",
    method: "Admin Panel",
    status: "success",
    time: new Date().toLocaleString("en-IN")
  });
  try { localStorage.setItem("winzo_deposits", JSON.stringify(txns)); } catch(e) {}
  var el = document.getElementById("chips-" + uid);
  if (el) el.textContent = u.chips.toLocaleString("en-IN");
  showToast((direction > 0 ? "Added " : "Subtracted ") + amt + " chips " + (direction > 0 ? "to " : "from ") + (u.fullName || u.name) + ". Balance: " + u.chips, "success");
};

// ── Declare winner (admin manually credits chips to winner) ──
window.adminDeclareWinner = async function(resultId, winnerUid, winnerName, prize) {
  if (!confirm("Declare " + winnerName + " as winner and credit ₹" + prize + " chips?")) return;
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.uid === winnerUid; });
  if (!u) return showToast("User not found.", "error");
  u.chips = Number(u.chips || 0) + prize;
  u.wallet = u.chips;
  saveLiveUsers(users);
  if (window.WINZO_SB) window.WINZO_SB.from("users").update({ chips: u.chips }).eq("uid", winnerUid).then(function(){});

  // Mark result as approved
  var results = JSON.parse(localStorage.getItem("winzo_results") || "[]");
  results = results.map(function(r){ return r.id === resultId ? Object.assign({}, r, { status: "approved" }) : r; });
  try { localStorage.setItem("winzo_results", JSON.stringify(results)); } catch(e) {}
  if (window.WINZO_SB) {
    try { await window.WINZO_SB.from("results").update({ status: "approved" }).eq("id", resultId); } catch(e) {}
  }

  showToast("Winner declared! ₹" + prize + " chips credited to " + winnerName + ".", "success");
  window.syncAndReload("search-screenshots", "Search Screenshots");
};

// ── Cancel result and refund both players ────────────────────
window.adminCancelResult = async function(resultId, uid1, uid2, entryAmount) {
  if (!confirm("Cancel this game and refund ₹" + entryAmount + " chips to both players?")) return;
  var users = getLiveUsers();
  [uid1, uid2].forEach(function(uid) {
    var u = users.find(function(x){ return x.uid === uid; });
    if (u) {
      u.chips = Number(u.chips || 0) + entryAmount;
      u.wallet = u.chips;
      if (window.WINZO_SB) window.WINZO_SB.from("users").update({ chips: u.chips }).eq("uid", uid).then(function(){});
    }
  });
  saveLiveUsers(users);

  // Mark result as rejected
  var results = JSON.parse(localStorage.getItem("winzo_results") || "[]");
  results = results.map(function(r){ return r.id === resultId ? Object.assign({}, r, { status: "rejected" }) : r; });
  try { localStorage.setItem("winzo_results", JSON.stringify(results)); } catch(e) {}
  if (window.WINZO_SB) {
    try { await window.WINZO_SB.from("results").update({ status: "rejected" }).eq("id", resultId); } catch(e) {}
  }

  showToast("Game cancelled. Chips refunded to both players.", "success");
  window.syncAndReload("search-screenshots", "Search Screenshots");
};

window.adminDeleteSet = async function (id) {
  if (!confirm("Cancel this challenge and refund chips to both players?")) return;
  var sets = getLiveSets();
  var s = sets.find(function(x){ return x.id === id; });

  // Refund chips to setter
  if (s) {
    var users = getLiveUsers();
    var refundUids = [s.uid];
    if (s.acceptedBy) refundUids.push(s.acceptedBy);
    refundUids.forEach(function(uid) {
      var u = users.find(function(x){ return x.uid === uid; });
      if (u) {
        u.chips = Number(u.chips || 0) + Number(s.value || 0);
        u.wallet = u.chips;
        if (window.WINZO_SB) window.WINZO_SB.from("users").update({ chips: u.chips }).eq("uid", uid).then(function(){});
      }
    });
    saveLiveUsers(users);
  }

  // Delete from localStorage
  try { localStorage.setItem("winzo_sets_global", JSON.stringify(sets.filter(function(x){ return x.id !== id; }))); } catch(e) {}

  // Delete from Supabase
  if (window.WINZO_SB) {
    try { await window.WINZO_SB.from("challenges").delete().eq("id", id); } catch(e) {}
  }

  showToast("Challenge cancelled & chips refunded.", "success");
  window.syncAndReload("running-challenges", "Running Challenges");
};

window.adminToggleKyc = function (uid, approve) {
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.uid === uid; });
  if (!u) return;
  u.kycVerified = approve;
  if (approve) { delete u.kycRejected; } else { u.kycRejected = true; }
  saveLiveUsers(users);
  if (window.WINZO_SB) window.WINZO_SB.from("users").update({ kyc_verified: approve, kyc_rejected: !approve }).eq("uid", uid).then(function(){});
  var session = JSON.parse(localStorage.getItem("winzo_session") || "null");
  if (session && session.uid === uid) {
    session.kycVerified = approve;
    session.kycRejected = !approve;
    localStorage.setItem("winzo_session", JSON.stringify(session));
  }
  var badge = document.getElementById("kyc-badge-" + uid);
  if (badge) badge.innerHTML = approve
    ? '<span class="badge badge-green">verified</span>'
    : '<span class="badge badge-yellow">pending</span>';
  var btn = badge && badge.closest("tr").querySelector("td:last-child button:first-child");
  if (btn) btn.outerHTML = approve
    ? `<button class="btn btn-secondary" style="padding:5px 10px;font-size:11px;" onclick="adminToggleKyc('${uid}',false)"><i class="ph ph-x-circle"></i> Revoke KYC</button>`
    : `<button class="btn btn-primary" style="padding:5px 10px;font-size:11px;" onclick="adminToggleKyc('${uid}',true)"><i class="ph ph-check-circle"></i> Approve KYC</button>`;
  showToast(approve ? "KYC approved ✓" : "KYC revoked", approve ? "success" : "error");
};

window.adminRejectKyc = function (uid) {
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.uid === uid; });
  if (u) {
    u.kycVerified = false;
    u.kycRejected = true;
    u.kycUrl = null;
    u.kycKey = null;
    saveLiveUsers(users);
    var session = JSON.parse(localStorage.getItem("winzo_session") || "null");
    if (session && session.uid === uid) {
      session.kycVerified = false; session.kycRejected = true;
      localStorage.setItem("winzo_session", JSON.stringify(session));
    }
  }
  showToast("KYC rejected — user must re-upload", "error");
  window.loadPanel("review-kyc", "Review KYC Users");
};

window.adminApproveKyc = function (uid) {
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.uid === uid; });
  if (u) {
    u.kycVerified = true;
    saveLiveUsers(users);
    var session = JSON.parse(localStorage.getItem("winzo_session") || "null");
    if (session && session.uid === uid) {
      session.kycVerified = true;
      localStorage.setItem("winzo_session", JSON.stringify(session));
    }
    if (window.WINZO_SB) window.WINZO_SB.from("users").update({ kyc_verified: true }).eq("uid", uid).then(function(){});
  }
  showToast("KYC approved", "success");
  window.loadPanel("review-kyc", "Review KYC Users");
};

window.adminPreviewQr = function(input) {
  var file = input.files[0];
  if (!file) return;
  var preview = document.getElementById("qr-preview");
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
};

window.adminSaveSettings = async function () {
  var bonusPhone = document.getElementById("set-bonus-phone").value.trim();
  var adminUser  = document.getElementById("set-admin-user").value.trim();
  var adminPass  = document.getElementById("set-admin-pass").value.trim();
  var upiId      = document.getElementById("set-upi-id").value.trim();
  var upiName    = document.getElementById("set-upi-name").value.trim();
  var upiQrUrl   = document.getElementById("set-upi-qr-url").value.trim();
  if (!bonusPhone || !adminUser || !adminPass) return showToast("Bonus phone, username and password are required.", "error");
  var fileInput = document.getElementById("set-upi-qr-file");
  if (fileInput && fileInput.files[0]) {
    try {
      showToast("Uploading QR image…", "info");
      var session = await window.WINZO_SB.auth.getSession();
      var token = session?.data?.session?.access_token;
      var { url } = await window.wzUploadToStorj(fileInput.files[0], "settings", token);
      upiQrUrl = url;
    } catch(e) {
      return showToast("QR upload failed: " + e.message, "error");
    }
  }
  if (window.WinzoSettings) window.WinzoSettings.save({ bonusPhone, adminUser, adminPass, upiId, upiName, upiQrUrl });
  showToast("Settings saved!", "success");
};

window.adminManualDeposit = function () {
  var uid = document.getElementById("md-user").value;
  var amt = Number(document.getElementById("md-amount").value);
  if (!uid || !amt || amt < 1) { showToast("Select user and enter valid amount", "error"); return; }
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.uid === uid; });
  if (!u) return;
  u.chips = Number(u.chips || 0) + amt;
  u.wallet = Number(u.wallet || 0) + amt;
  saveLiveUsers(users);
  var deps = getLiveDeposits();
  deps.push({ id: "d_" + Date.now(), user: u.fullName || u.name, amount: amt, method: "Admin", status: "success", time: new Date().toLocaleString("en-IN") });
  try { localStorage.setItem("winzo_deposits", JSON.stringify(deps)); } catch(e) {}
  showToast("₹" + amt.toLocaleString("en-IN") + " added to " + (u.fullName || u.name), "success");
};

window.adminManualWithdraw = function () {
  var uid = document.getElementById("mwa-user").value;
  var amt = Number(document.getElementById("mwa-amount").value);
  if (!uid || !amt || amt < 1) { showToast("Select user and enter valid amount", "error"); return; }
  var users = getLiveUsers();
  var u = users.find(function(x){ return x.uid === uid; });
  if (!u) return;
  u.chips = Math.max(0, Number(u.chips || 0) - amt);
  u.wallet = Math.max(0, Number(u.wallet || 0) - amt);
  saveLiveUsers(users);
  var wds = getLiveWithdrawals();
  wds.push({ id: "w_" + Date.now(), user: u.fullName || u.name, amount: amt, method: "Admin", status: "approved", time: new Date().toLocaleString("en-IN") });
  try { localStorage.setItem("winzo_withdraws", JSON.stringify(wds)); } catch(e) {}
  showToast("₹" + amt.toLocaleString("en-IN") + " withdrawn from " + (u.fullName || u.name), "success");
};

// ── Admin Reset User Password ─────────────────────────────────
window.adminResetUserPassword = function (uid, email, name) {
  // Build modal
  var existing = document.getElementById("admin-reset-modal");
  if (existing) existing.remove();

  var modal = document.createElement("div");
  modal.id = "admin-reset-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:16px;";
  modal.innerHTML = `
    <div style="background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:12px;padding:32px;width:100%;max-width:420px;box-shadow:var(--shadow-card);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <h3 style="font-family:var(--font-head);font-size:1rem;color:var(--accent);"><i class="ph-fill ph-key"></i> Reset Password</h3>
        <button onclick="document.getElementById('admin-reset-modal').remove()" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;"><i class="ph ph-x"></i></button>
      </div>
      <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px;">Setting new password for <strong style="color:var(--text-primary);">${name}</strong> (${email})</p>
      <div id="admin-reset-err" style="display:none;background:rgba(255,59,48,0.1);border:1px solid var(--danger);border-radius:6px;padding:10px 14px;color:var(--danger);font-size:13px;margin-bottom:14px;"></div>
      <div id="admin-reset-ok" style="display:none;background:rgba(0,230,118,0.1);border:1px solid var(--success);border-radius:6px;padding:10px 14px;color:var(--success);font-size:13px;margin-bottom:14px;"></div>
      <div class="field" style="margin-bottom:14px;">
        <label style="font-size:13px;color:var(--text-secondary);">New Password</label>
        <input id="admin-reset-pass" type="password" placeholder="Min 8 characters" minlength="8"
          style="width:100%;padding:10px 14px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:6px;color:#fff;font-size:14px;" />
      </div>
      <div class="field" style="margin-bottom:20px;">
        <label style="font-size:13px;color:var(--text-secondary);">Confirm Password</label>
        <input id="admin-reset-confirm" type="password" placeholder="Repeat password"
          style="width:100%;padding:10px 14px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:6px;color:#fff;font-size:14px;" />
      </div>
      <div style="display:flex;gap:10px;">
        <button id="admin-reset-btn" class="btn btn-primary" style="flex:1;" onclick="adminDoResetPassword('${uid}','${email}')">
          <i class="ph-fill ph-key"></i> Set Password
        </button>
        <button class="btn btn-secondary" onclick="document.getElementById('admin-reset-modal').remove()">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("admin-reset-pass").focus();
};

window.adminDoResetPassword = async function (uid, email) {
  var pass    = document.getElementById("admin-reset-pass").value;
  var confirm = document.getElementById("admin-reset-confirm").value;
  var errEl   = document.getElementById("admin-reset-err");
  var okEl    = document.getElementById("admin-reset-ok");
  var btn     = document.getElementById("admin-reset-btn");

  errEl.style.display = "none";
  okEl.style.display  = "none";

  if (pass.length < 8) { errEl.textContent = "Password must be at least 8 characters."; errEl.style.display = "block"; return; }
  if (pass !== confirm) { errEl.textContent = "Passwords do not match."; errEl.style.display = "block"; return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="ph ph-circle-notch" style="animation:spin 1s linear infinite"></i> Updating…';

  try {
    if (window.WINZO_SB) {
      // Use Supabase Admin API via service role — falls back to user update if no service role
      const { error } = await window.WINZO_SB.auth.admin
        ? await window.WINZO_SB.auth.admin.updateUserById(uid, { password: pass })
        : await window.WINZO_SB.rpc("admin_reset_password", { p_uid: uid, p_password: pass });
      if (error) throw new Error(error.message);
    }
    // Always update localStorage copy too
    var users = getLiveUsers();
    var u = users.find(function(x){ return x.uid === uid; });
    if (u) { u.password = pass; saveLiveUsers(users); }

    okEl.textContent = "✓ Password updated successfully.";
    okEl.style.display = "block";
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-fill ph-key"></i> Set Password';
    showToast("Password reset for " + email, "success");
    setTimeout(function(){ document.getElementById("admin-reset-modal")?.remove(); }, 1800);
  } catch (e) {
    errEl.textContent = e.message || "Failed to reset password.";
    errEl.style.display = "block";
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-fill ph-key"></i> Set Password';
  }
};

window.adminAddUser = function () {
  var name  = document.getElementById("nu-name").value.trim();
  var phone = document.getElementById("nu-phone").value.trim();
  var email = document.getElementById("nu-email").value.trim();
  var pass  = document.getElementById("nu-pass").value;
  var kyc   = document.getElementById("nu-kyc").value;
  var chips = Number(document.getElementById("nu-chips").value) || 0;
  if (!name || !phone || !email || !pass) { showToast("Fill all required fields", "error"); return; }
  var users = getLiveUsers();
  if (users.find(function(u){ return u.email === email || u.phone === phone; })) {
    showToast("User with this email/phone already exists", "error"); return;
  }
  users.push({ uid: "u_" + Date.now(), fullName: name, phone: phone, email: email, kycType: kyc, kycVerified: false, chips: chips, wallet: chips, createdAt: new Date().toISOString() });
  saveLiveUsers(users);
  showToast("User \"" + name + "\" created", "success");
  window.syncAndReload("view-all-users", "View All Users");
};

window.adminAddGame = function () {
  var name    = (document.getElementById("ng-name")?.value || "").trim();
  var type    = document.getElementById("ng-type")?.value || "regular";
  var entry   = Number(document.getElementById("ng-entry")?.value || 0);
  var prize   = Number(document.getElementById("ng-prize")?.value || 0);
  var players = Number(document.getElementById("ng-players")?.value || 2);
  var status  = document.getElementById("ng-status")?.value || "active";
  if (!name) return showToast("Game name is required.", "error");
  var games = JSON.parse(localStorage.getItem("winzo_games") || "null") || STATIC.games.slice();
  games.push({ id: "g_" + Date.now(), name, type, entry, prize, players, status, created: new Date().toISOString().slice(0,10) });
  try { localStorage.setItem("winzo_games", JSON.stringify(games)); } catch(e) {}
  showToast("Game \"" + name + "\" added and live on homepage.", "success");
  window.loadPanel("view-all-games", "View All Games");
};

window.adminDeleteGame = function (id) {
  if (!confirm("Remove this game?")) return;
  var games = JSON.parse(localStorage.getItem("winzo_games") || "null") || STATIC.games.slice();
  try { localStorage.setItem("winzo_games", JSON.stringify(games.filter(function(g){ return g.id !== id; }))); } catch(e) {}
  showToast("Game removed.", "success");
  window.loadPanel("view-all-games", "View All Games");
};

window.removeBlacklist = function (id) {
  var list = getLiveBlacklist().filter(function(b){ return b.id !== id; });
  saveLiveBlacklist(list);
  var row = document.getElementById("bl-" + id);
  if (row) row.remove();
  showToast("Name removed from blacklist", "success");
};

window.showAddBlacklist = function () {
  var name = prompt("Enter name to blacklist:");
  if (!name || !name.trim()) return;
  var reason = prompt("Reason:") || "Admin action";
  var list = getLiveBlacklist();
  var id = "b_" + Date.now();
  list.push({ id: id, name: name.trim(), reason: reason, added: new Date().toISOString().slice(0,10) });
  saveLiveBlacklist(list);
  var tbody = document.getElementById("blacklist-tbody");
  if (!tbody) return;
  var tr = document.createElement("tr");
  tr.id = "bl-" + id;
  tr.innerHTML = "<td>—</td><td><strong>" + esc(name.trim()) + "</strong></td><td>" + esc(reason) + "</td><td>" + new Date().toISOString().slice(0,10) + "</td>"
    + "<td><button class='btn btn-secondary' style='padding:5px 10px;font-size:11px;' onclick=\"removeBlacklist('" + esc(id) + "')\"><i class='ph ph-trash'></i> Remove</button></td>";
  tbody.appendChild(tr);
  showToast("\"" + name.trim() + "\" blacklisted", "success");
};

// ── Notification System ──────────────────────────────────────
(function () {
  var _seenIds = JSON.parse(sessionStorage.getItem("winzo_notif_seen") || "[]");
  var _notifs = [];
  var _errorNotifs = [];

  // Global: call this from anywhere to push an error into admin notifications
  window.wzReportError = function(msg) {
    var id = "err_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
    _errorNotifs.push({ id: id, type: "error", msg: String(msg), time: new Date().toISOString() });
    // Keep only last 20 errors
    if (_errorNotifs.length > 20) _errorNotifs.shift();
    var unseen = _notifs.concat(_errorNotifs).filter(function(n){ return !_seenIds.includes(n.id); });
    updateNotifUI(unseen, _notifs.length);
  };

  function markSeen(id) {
    if (!_seenIds.includes(id)) {
      _seenIds.push(id);
      sessionStorage.setItem("winzo_notif_seen", JSON.stringify(_seenIds));
    }
  }

  async function pollNotifications() {
    var deps = [], wds = [];
    try { deps = await getLiveDepositsAsync(); } catch(e) {}
    try { wds = await getLiveWithdrawalsAsync(); } catch(e) {}

    var newNotifs = [];
    deps.filter(function(d){ return d.status === "pending"; }).forEach(function(d) {
      newNotifs.push({ id: "dep_" + d.id, type: "deposit", msg: "New deposit request: ₹" + Number(d.amount).toLocaleString("en-IN") + " from " + (d.user || "User"), panel: "new-deposit-requests", label: "New Deposit Requests", time: d.time });
    });
    wds.filter(function(w){ return w.status === "pending"; }).forEach(function(w) {
      newNotifs.push({ id: "wd_" + w.id, type: "withdraw", msg: "New withdrawal request: ₹" + Number(w.amount).toLocaleString("en-IN") + " from " + (w.user || "User"), panel: "recent-withdrawals", label: "Recent Withdrawal Requests", time: w.time });
    });

    _notifs = newNotifs;
    var allNotifs = _notifs.concat(_errorNotifs);
    var unseen = allNotifs.filter(function(n){ return !_seenIds.includes(n.id); });
    updateNotifUI(unseen, newNotifs.length);
  }

  function updateNotifUI(unseen, totalPending) {
    var badge = document.getElementById("notif-badge");
    var dot = document.getElementById("txn-nav-dot");
    var list = document.getElementById("notif-list");
    if (!badge || !dot || !list) return;

    // Bell badge
    if (unseen.length > 0) {
      badge.textContent = unseen.length;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    // Green dot on Transaction Management
    dot.style.display = totalPending > 0 ? "inline-block" : "none";

    // Notification list
    var allNotifs = _notifs.concat(_errorNotifs);
    if (allNotifs.length === 0) {
      list.innerHTML = '<div class="a2-notif-empty">No pending requests</div>';
    } else {
      list.innerHTML = allNotifs.map(function(n) {
        var isSeen = _seenIds.includes(n.id);
        var iconClass = n.type === "deposit" ? "dep" : n.type === "error" ? "err" : "wd";
        var icon = n.type === "deposit" ? '<i class="ph ph-arrow-down-left"></i>'
                 : n.type === "error"   ? '<i class="ph ph-warning"></i>'
                 :                        '<i class="ph ph-arrow-up-right"></i>';
        var clickAttr = n.type === "error"
          ? 'onclick="handleNotifClick(\'' + n.id + '\',\'\',\'\')"'
          : 'onclick="handleNotifClick(\'' + n.id + '\',\'' + n.panel + '\',\'' + n.label + '\')"';
        return '<div class="a2-notif-item' + (isSeen ? " seen" : "") + '" ' + clickAttr + '>'
          + '<span class="a2-notif-icon ' + iconClass + '">' + icon + '</span>'
          + '<div class="a2-notif-text"><div class="a2-notif-msg">' + n.msg + '</div>'
          + '<div class="a2-notif-time">' + (n.time ? new Date(n.time).toLocaleString("en-IN") : "") + '</div></div>'
          + '</div>';
      }).join("");
    }
  }

  window.handleNotifClick = function(id, panel, label) {
    markSeen(id);
    document.getElementById("notif-dropdown").style.display = "none";
    var allNotifs = _notifs.concat(_errorNotifs);
    var unseen = allNotifs.filter(function(n){ return !_seenIds.includes(n.id); });
    var badge = document.getElementById("notif-badge");
    if (badge) { badge.textContent = unseen.length; badge.style.display = unseen.length > 0 ? "flex" : "none"; }
    var items = document.querySelectorAll(".a2-notif-item");
    items.forEach(function(el) { el.classList.add("seen"); });
    if (panel) window.syncAndReload(panel, label);
  };

  window.toggleNotifDropdown = function() {
    var dd = document.getElementById("notif-dropdown");
    if (!dd) return;
    var isOpen = dd.style.display !== "none";
    dd.style.display = isOpen ? "none" : "block";
    if (!isOpen) {
      var allNotifs = _notifs.concat(_errorNotifs);
      allNotifs.forEach(function(n){ markSeen(n.id); });
      var badge = document.getElementById("notif-badge");
      if (badge) badge.style.display = "none";
      updateNotifUI([], _notifs.length);
    }
  };

  // Close dropdown on outside click
  document.addEventListener("click", function(e) {
    var wrap = document.getElementById("notif-wrap");
    if (wrap && !wrap.contains(e.target)) {
      var dd = document.getElementById("notif-dropdown");
      if (dd) dd.style.display = "none";
    }
  });

  // Poll every 30 seconds after unlock
  window._startNotifPolling = function() {
    pollNotifications();
    setInterval(pollNotifications, 30000);
  };
})();

// ── Boot ─────────────────────────────────────────────────────
(function () {
  var GATE_KEY = "winzo_admin2_unlocked";
  var gateWrap = document.getElementById("gate-wrap");
  var dashWrap = document.getElementById("dash-wrap");

  function unlock() {
    gateWrap.style.display = "none";
    dashWrap.style.display = "flex";
    window.syncAndReload("overview", "Dashboard Overview");
    if (window._startNotifPolling) window._startNotifPolling();
  }

  function showErr(msg) {
    var err = document.getElementById("gate-error");
    err.textContent = msg;
    err.style.display = "block";
  }

  // On every load, verify Supabase session + admin role via JWT — never trust client-side DB column
  (async function checkExistingSession() {
    if (!window.WINZO_SB) return;
    try {
      const { data: { user } } = await window.WINZO_SB.auth.getUser();
      if (user?.app_metadata?.role === 'admin') unlock();
    } catch(e) {}
  })();

  document.getElementById("gate-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var email = document.getElementById("gate-username").value.trim();
    var pass  = document.getElementById("passcode").value;
    var btn   = e.target.querySelector("button[type=submit]");
    document.getElementById("gate-error").style.display = "none";
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-circle-notch" style="animation:spin 1s linear infinite"></i> Verifying…';

    try {
      if (!window.WINZO_SB) throw new Error("Supabase not configured.");

      // 1. Sign in with Supabase Auth
      const { data, error } = await window.WINZO_SB.auth.signInWithPassword({ email, password: pass });
      if (error) throw new Error("Invalid email or password.");

      // 2. Check admin role via JWT app_metadata (set server-side, not spoofable)
      const { data: { user: authedUser } } = await window.WINZO_SB.auth.getUser();
      if (authedUser?.app_metadata?.role !== 'admin') {
        await window.WINZO_SB.auth.signOut();
        throw new Error("Access denied. This account does not have admin privileges.");
      }

      sessionStorage.removeItem(GATE_KEY);
      unlock();
    } catch (err) {
      showErr(err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="ph-fill ph-lock-open"></i> Unlock Dashboard';
    }
  });

  document.querySelectorAll(".a2-nav-parent").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.dataset.group;
      var children = document.getElementById("group-" + group);
      var isOpen = children.classList.contains("open");
      document.querySelectorAll(".a2-nav-children").forEach(function (c) { c.classList.remove("open"); });
      document.querySelectorAll(".a2-nav-parent").forEach(function (b) { b.classList.remove("open"); });
      if (!isOpen) { children.classList.add("open"); btn.classList.add("open"); }
    });
  });

  document.querySelectorAll(".a2-nav-child").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".a2-nav-child").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      window.syncAndReload(btn.dataset.panel, btn.textContent.trim());
      if (window.innerWidth <= 900) document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("menu-toggle").addEventListener("click", function () {
    document.getElementById("sidebar").classList.toggle("open");
  });
})();

// ── Auto-cancel stale challenges (1 hour timeout) ─────────────
(function startAutoCancelJob() {
  var ONE_HOUR = 60 * 60 * 1000;

  async function autoCancelStale() {
    var sets = getLiveSets();
    var now = Date.now();
    var stale = sets.filter(function(s) {
      // Already started games are NOT auto-cancelled
      if (s.startedAt) return false;
      // Use acceptedAt for matched, at for open
      var ref = s.acceptedAt || s.at;
      return ref && (now - new Date(ref).getTime()) >= ONE_HOUR;
    });
    if (!stale.length) return;

    var users = getLiveUsers();
    stale.forEach(function(s) {
      // Refund chips to both players
      var refundUids = [s.uid];
      if (s.acceptedBy) refundUids.push(s.acceptedBy);
      refundUids.forEach(function(uid) {
        var u = users.find(function(x){ return x.uid === uid; });
        if (u) {
          u.chips = Number(u.chips || 0) + Number(s.value || 0);
          u.wallet = u.chips;
          if (window.WINZO_SB) window.WINZO_SB.from("users").update({ chips: u.chips }).eq("uid", uid).then(function(){});
        }
      });
    });
    saveLiveUsers(users);

    // Remove stale from localStorage
    var staleIds = stale.map(function(s){ return s.id; });
    var remaining = sets.filter(function(s){ return !staleIds.includes(s.id); });
    try { localStorage.setItem("winzo_sets_global", JSON.stringify(remaining)); } catch(e) {}

    // Remove from Supabase
    if (window.WINZO_SB) {
      for (var i = 0; i < staleIds.length; i++) {
        try { await window.WINZO_SB.from("challenges").delete().eq("id", staleIds[i]); } catch(e) {}
      }
    }

    console.info("[WinzoIndia] Auto-cancelled " + stale.length + " stale challenge(s) (>1h).");

    // Re-render if on running-challenges panel
    var title = document.getElementById("topbar-title");
    if (title && title.textContent === "Running Challenges") {
      window.loadPanel("running-challenges", "Running Challenges");
    }
  }

  // Run immediately, then every 60 seconds
  autoCancelStale();
  setInterval(autoCancelStale, 60 * 1000);
})();
