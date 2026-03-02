/**
 * navbar.js — Amazino Shared Navbar (Self-contained)
 * Injects a full navbar into #navbar-container dynamically.
 * Reads auth session to show user info / sign-in button.
 * Requires: auth.js loaded before this file.
 */

(function () {
  'use strict';

  const ROLE_DASH = {
    seller: 'seller-dashboard.html',
    admin:  'admin-dashboard.html',
    buyer:  'customer-dashboard.html',
    customer: 'customer-dashboard.html',
    user:   'customer-dashboard.html',
  };

  function getDash(role) {
    return ROLE_DASH[(role || '').toLowerCase()] || 'customer-dashboard.html';
  }

  function getInitials(name) {
    return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function getCartCount() {
    try {
      let userId = null;
      if (typeof AUTH !== 'undefined') {
        const s = AUTH.getSession();
        if (s) userId = s.userId;
      }
      const cartKey = userId ? 'shoppingCart_' + userId : 'shoppingCart';
      let cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      if (!cart.length && userId) cart = JSON.parse(localStorage.getItem('shoppingCart') || '[]');
      return cart.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
    } catch(e) { return 0; }
  }

  function getActiveSession() {
    if (typeof AUTH !== 'undefined') {
      const sess = AUTH.getSession();
      if (sess) {
        const user = AUTH.getCurrentUser();
        if (user) return { user: user, role: sess.role };
      }
    }
    try {
      const cu = JSON.parse(localStorage.getItem('ecommerce_current_user'));
      if (cu) return { user: cu, role: cu.role || 'customer' };
    } catch(e) {}
    try {
      const sc = JSON.parse(localStorage.getItem('seller_current'));
      if (sc) return { user: sc, role: 'seller' };
    } catch(e) {}
    return null;
  }

  function buildAuthHTML() {
    const session = getActiveSession();
    if (!session) {
      return '<a href="signin.html" class="sp-navbar__btn-signin"><i class="bi bi-person"></i> Sign In</a>';
    }

    const user = session.user;
    const role = session.role;
    const name = user.name || ((user.firstName || '') + ' ' + (user.lastName || '')).trim() || 'User';
    const firstName = name.split(' ')[0] || 'User';
    const initials = getInitials(name);
    const dashUrl = getDash(role);
    const avatarHtml = user.profileImage
      ? '<img src="' + user.profileImage + '" alt="' + firstName + '" class="nav-user-avatar-img">'
      : '<div class="nav-user-avatar-initials">' + initials + '</div>';

    return [
      '<div class="nav-user-pill-wrap" id="navPillWrap">',
      '  <div class="nav-user-pill" id="navUserPill" title="Account options">',
      '    <div class="nav-user-avatar">' + avatarHtml + '</div>',
      '    <div class="nav-user-info">',
      '      <span class="nav-user-name">' + firstName + '</span>',
      '      <span class="nav-user-role">' + role + '</span>',
      '    </div>',
      '    <i class="bi bi-chevron-down nav-user-arrow" id="navCaret"></i>',
      '  </div>',
      '  <div class="nav-user-dropdown" id="navDropdown">',
      '    <a href="' + dashUrl + '" class="nav-dd-item"><i class="bi bi-speedometer2"></i> Dashboard</a>',
      '    <a href="' + dashUrl + '" class="nav-dd-item"><i class="bi bi-person-circle"></i> My Profile</a>',
      '    <a href="' + dashUrl + '" class="nav-dd-item"><i class="bi bi-bag"></i> My Orders</a>',
      '    <div class="nav-dd-sep"></div>',
      '    <button class="nav-dd-item nav-dd-logout" id="navLogoutBtn"><i class="bi bi-box-arrow-right"></i> Log Out</button>',
      '  </div>',
      '</div>'
    ].join('\n');
  }

  function getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function activeIf(page) {
    return getCurrentPage() === page ? 'sp-navbar__link--active' : '';
  }

  function buildNavbarHTML() {
    const cartCount = getCartCount();
    const cartBadge = cartCount > 0
      ? '<span id="cartBadge" style="position:absolute;top:-6px;right:-8px;background:#7c1d7c;color:#fff;border-radius:50%;font-size:0.65rem;font-weight:700;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;padding:0 3px;line-height:18px;text-align:center;">' + cartCount + '</span>'
      : '<span id="cartBadge" style="position:absolute;top:-6px;right:-8px;background:#7c1d7c;color:#fff;border-radius:50%;font-size:0.65rem;font-weight:700;min-width:18px;height:18px;display:none;align-items:center;justify-content:center;padding:0 3px;line-height:18px;text-align:center;">0</span>';

    return [
      '<nav class="sp-navbar sp-navbar--solid" id="mainNavbar">',
      '  <div class="sp-navbar__container">',
      '    <a class="sp-navbar__brand" href="index.html">',
      '      <div class="sp-navbar__logo-wrap"><img src="assets/logo1.png" alt="Amazino" width="32" height="32" onerror="this.src=&#x27;logo1.png&#x27;;this.onerror=null;"></div>',
      '      <span class="sp-navbar__brand-name">Amazino</span>',
      '    </a>',
      '    <button class="sp-navbar__toggle" id="navToggle" aria-label="Menu">',
      '      <span class="sp-navbar__toggle-bar"></span>',
      '      <span class="sp-navbar__toggle-bar"></span>',
      '      <span class="sp-navbar__toggle-bar"></span>',
      '    </button>',
      '    <div class="sp-navbar__menu" id="navMenu">',
      '      <ul class="sp-navbar__links">',
      '        <li><a class="sp-navbar__link ' + activeIf('index.html') + '" href="index.html">Home</a></li>',
      '        <li><a class="sp-navbar__link ' + activeIf('Shop.html') + '" href="Shop.html">Shop</a></li>',
      '        <li><a class="sp-navbar__link ' + activeIf('products.html') + '" href="products.html">Products</a></li>',
      '        <li><a class="sp-navbar__link ' + activeIf('about.html') + '" href="about.html">About Us</a></li>',
      '        <li><a class="sp-navbar__link ' + activeIf('contact.html') + '" href="contact.html">Contact Us</a></li>',
      '      </ul>',
      '      <div class="sp-navbar__actions">',
      '        <a href="Shopping_Cart.html" class="sp-navbar__icon-link sp-navbar__cart-link" aria-label="Cart" style="position:relative">',
      '          <i class="bi bi-cart"></i>' + cartBadge,
      '        </a>',
      '        <div id="navbarAuthArea">' + buildAuthHTML() + '</div>',
      '      </div>',
      '    </div>',
      '    <div class="sp-navbar__overlay" id="navOverlay"></div>',
      '  </div>',
      '</nav>'
    ].join('\n');
  }

  function bindEvents() {
    var navbar    = document.getElementById('mainNavbar');
    var toggle    = document.getElementById('navToggle');
    var menu      = document.getElementById('navMenu');
    var overlay   = document.getElementById('navOverlay');
    var pill      = document.getElementById('navUserPill');
    var dropdown  = document.getElementById('navDropdown');
    var caret     = document.getElementById('navCaret');
    var logoutBtn = document.getElementById('navLogoutBtn');

    // Scroll effect
    if (navbar) {
      window.addEventListener('scroll', function() {
        navbar.classList.toggle('navbar-scrolled', window.scrollY > 80);
      }, { passive: true });
    }

    // Mobile toggle
    function closeNav() {
      if (menu)    menu.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      if (toggle)  toggle.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (toggle && menu) {
      toggle.addEventListener('click', function() {
        var open = menu.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active', open);
        toggle.classList.toggle('active', open);
        document.body.style.overflow = open ? 'hidden' : '';
      });
    }
    if (overlay) overlay.addEventListener('click', closeNav);
    if (menu) {
      menu.querySelectorAll('.sp-navbar__link').forEach(function(link) {
        link.addEventListener('click', closeNav);
      });
    }

    // User dropdown toggle
    if (pill && dropdown) {
      pill.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.toggle('open');
        if (caret) caret.style.transform = isOpen ? 'rotate(180deg)' : '';
      });
      document.addEventListener('click', function() {
        dropdown.classList.remove('open');
        if (caret) caret.style.transform = '';
      });
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (typeof AUTH !== 'undefined') {
          AUTH.logout('index.html');
        } else {
          ['auth_session','ecommerce_current_user','seller_current','isLoggedIn']
            .forEach(function(k) { localStorage.removeItem(k); });
          window.location.href = 'index.html';
        }
      });
    }
  }

  function setActiveNavLink() {
    var links = document.querySelectorAll('.sp-navbar__link');
    var page  = getCurrentPage();
    links.forEach(function(link) {
      var href = link.getAttribute('href') || '';
      var linkPage = href.split('/').pop() || 'index.html';
      link.classList.toggle('sp-navbar__link--active', linkPage === page);
    });
  }

  function injectNavbar() {
    var container = document.getElementById('navbar-container');
    if (!container) return;
    container.innerHTML = buildNavbarHTML();
    bindEvents();
    setActiveNavLink();
  }

  // Re-render auth area (cross-tab sync)
  window.addEventListener('storage', function(e) {
    if (['auth_session','ecommerce_current_user','seller_current'].includes(e.key)) {
      var area = document.getElementById('navbarAuthArea');
      if (area) {
        area.innerHTML = buildAuthHTML();
        // Re-bind logout for newly created button
        var lb = document.getElementById('navLogoutBtn');
        if (lb) lb.addEventListener('click', function() {
          if (typeof AUTH !== 'undefined') AUTH.logout('index.html');
          else window.location.href = 'index.html';
        });
        // Re-bind dropdown
        var pill = document.getElementById('navUserPill');
        var dd   = document.getElementById('navDropdown');
        var car  = document.getElementById('navCaret');
        if (pill && dd) {
          pill.addEventListener('click', function(e) {
            e.stopPropagation();
            var open = dd.classList.toggle('open');
            if (car) car.style.transform = open ? 'rotate(180deg)' : '';
          });
        }
      }
    }
  });

  // Expose global helpers for legacy code
  window.amazinoLogout = function() {
    if (typeof AUTH !== 'undefined') { AUTH.logout('index.html'); return; }
    ['auth_session','ecommerce_current_user','seller_current','isLoggedIn']
      .forEach(function(k) { localStorage.removeItem(k); });
    window.location.href = 'index.html';
  };

  window.amazinoAuthGuard = function(requiredRole) {
    if (typeof AUTH !== 'undefined') {
      return AUTH.guardRoute(requiredRole ? [requiredRole] : []);
    }
    var CU = null;
    try { CU = JSON.parse(localStorage.getItem('ecommerce_current_user')); } catch(e) {}
    if (!CU) try { CU = JSON.parse(localStorage.getItem('seller_current')); } catch(e) {}
    if (!CU) { window.location.replace('signin.html'); return null; }
    return CU;
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNavbar);
  } else {
    injectNavbar();
  }

})();