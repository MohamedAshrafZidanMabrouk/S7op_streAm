// =============================================
//  AMAZINO — Navbar Auth State Manager
//  Updated: Full integration with auth.js
//
//  HOW TO USE in your navbar HTML:
//    <div id="navbarAuthArea"></div>
//
//  INCLUDE ORDER in every public page:
//    <script src="js/auth.js"></script>
//    <script src="js/Navbarauth.js"></script>
// =============================================

(function () {
  "use strict";

  /* ── Dashboard URLs per role ─────────────────────────────── */
  const ROLE_DASHBOARD = {
    customer : "customer-dashboard.html",
    buyer    : "customer-dashboard.html",
    user     : "customer-dashboard.html",
    seller   : "seller-dashboard.html",
    admin    : "admin-dashboard.html",
  };

  function getDashboardUrl(role) {
    return ROLE_DASHBOARD[(role || "customer").toLowerCase()] || "customer-dashboard.html";
  }

  function getInitials(name) {
    return (name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }

  /* ── Read session — supports BOTH auth.js (new) and legacy ── */
  function getActiveSession() {
    // Priority 1: new auth.js session
    if (typeof AUTH !== "undefined") {
      const sess = AUTH.getSession();
      if (sess) {
        const user = AUTH.getCurrentUser();
        return user ? { user, role: sess.role } : null;
      }
    }

    // Priority 2: legacy ecommerce_current_user
    try {
      const cu = JSON.parse(localStorage.getItem("ecommerce_current_user"));
      if (cu) return { user: cu, role: cu.role || "customer" };
    } catch (e) {}

    // Priority 3: legacy seller_current
    try {
      const sc = JSON.parse(localStorage.getItem("seller_current"));
      if (sc) return { user: sc, role: "seller" };
    } catch (e) {}

    return null;
  }

  /* ── Render navbar auth area ─────────────────────────────── */
  function render() {
    const area = document.getElementById("navbarAuthArea");
    if (!area) return;

    const session = getActiveSession();

    if (!session) {
      /* Not logged in → Sign In button */
      area.innerHTML = `
        <a href="signin.html" class="sp-navbar__btn-signin">
          <i class="bi bi-person"></i> Sign In
        </a>`;
      return;
    }

    /* Logged in → user pill */
    const { user, role } = session;
    const name      = user.name || ((user.firstName || "") + " " + (user.lastName || "")).trim() || "User";
    const firstName = name.split(" ")[0] || "User";
    const initials  = getInitials(name);
    const dashUrl   = getDashboardUrl(role);

    const avatarHtml = user.profileImage
      ? `<img src="${user.profileImage}" alt="${firstName}" class="nav-user-avatar-img">`
      : `<div class="nav-user-avatar-initials">${initials}</div>`;

    area.innerHTML = `
      <div class="nav-user-pill-wrap" id="navPillWrap">
        <div class="nav-user-pill" id="navUserPill" title="Account options">
          <div class="nav-user-avatar">${avatarHtml}</div>
          <div class="nav-user-info">
            <span class="nav-user-name">${firstName}</span>
            <span class="nav-user-role">${role}</span>
          </div>
          <i class="bi bi-chevron-down nav-user-arrow" id="navCaret"></i>
        </div>
        <div class="nav-user-dropdown" id="navDropdown">
          <a href="${dashUrl}" class="nav-dd-item">
            <i class="bi bi-speedometer2"></i> Dashboard
          </a>
          <a href="${dashUrl}" class="nav-dd-item">
            <i class="bi bi-person-circle"></i> My Profile
          </a>
          <a href="${dashUrl}" class="nav-dd-item">
            <i class="bi bi-bag"></i> My Orders
          </a>
          <div class="nav-dd-sep"></div>
          <button class="nav-dd-item nav-dd-logout" id="navLogoutBtn">
            <i class="bi bi-box-arrow-right"></i> Log Out
          </button>
        </div>
      </div>`;

    /* Toggle dropdown */
    const pill     = document.getElementById("navUserPill");
    const dropdown = document.getElementById("navDropdown");
    const caret    = document.getElementById("navCaret");

    pill.addEventListener("click", e => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle("open");
      caret.style.transform = isOpen ? "rotate(180deg)" : "";
    });

    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
      caret.style.transform = "";
    });

    /* Logout */
    document.getElementById("navLogoutBtn").addEventListener("click", e => {
      e.stopPropagation();
      amazinoLogout();
    });
  }

  /* ── Logout ──────────────────────────────────────────────── */
  window.amazinoLogout = function () {
    // Use AUTH.logout if available (cleans everything)
    if (typeof AUTH !== "undefined") {
      AUTH.logout("index.html");
      return;
    }
    // Legacy fallback
    localStorage.removeItem("ecommerce_current_user");
    localStorage.removeItem("seller_current");
    localStorage.removeItem("auth_session");
    localStorage.removeItem("isLoggedIn");
    window.location.href = "index.html";   // ← home, NOT signin
  };

  /* ── Auth guard (for dashboard pages only) ───────────────── */
  window.amazinoAuthGuard = function (requiredRole) {
    // Prefer AUTH.guardRoute if available
    if (typeof AUTH !== "undefined") {
      return AUTH.guardRoute(requiredRole ? [requiredRole] : []);
    }

    // Legacy fallback
    let CU = null;
    try { CU = JSON.parse(localStorage.getItem("ecommerce_current_user")); } catch (e) {}
    if (!CU) try { CU = JSON.parse(localStorage.getItem("seller_current")); } catch (e) {}

    if (!CU) { window.location.replace("signin.html"); return null; }

    if (requiredRole && (CU.role || "customer").toLowerCase() !== requiredRole.toLowerCase()) {
      window.location.replace(getDashboardUrl(CU.role));
      return null;
    }
    return CU;
  };

  /* ── Init ────────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  // Re-render if another tab logs in/out
  window.addEventListener("storage", e => {
    if (["auth_session","ecommerce_current_user","seller_current"].includes(e.key)) {
      render();
    }
  });

})();