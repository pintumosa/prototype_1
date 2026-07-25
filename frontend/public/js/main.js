// ==========================================================
// WinzoIndia - Shared UI helpers
// ==========================================================

// Load settings from Supabase on every page
document.addEventListener("DOMContentLoaded", () => {
  if (window.WinzoSettings && window.WinzoSettings.load) {
    window.WinzoSettings.load();
  }
});

// Populate the nav profile chip if logged in
document.addEventListener("DOMContentLoaded", () => {
  const s = window.WinzoAuth && window.WinzoAuth.session();
  const chip = document.getElementById("nav-profile");
  const authBtns = document.getElementById("nav-auth");
  if (s && chip) {
    chip.hidden = false;
    const nameEl = chip.querySelector("[data-user-name]");
    if (nameEl) nameEl.textContent = s.fullName.split(" ")[0];
    if (authBtns) authBtns.hidden = true;
  } else if (authBtns) {
    authBtns.hidden = false;
    if (chip) chip.hidden = true;
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.WinzoAuth.logout();
    });
  }
});

function wzFormatINR(v) {
  return "₹" + Number(v || 0).toLocaleString("en-IN");
}
window.wzFormatINR = wzFormatINR;
