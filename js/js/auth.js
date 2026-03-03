/**
 * ═══════════════════════════════════════════════════════════════
 *  auth.js  —  Unified Authentication & Session Management
 *  Amazino E-commerce Platform
 *
 *  INCLUDE IN: signin.html, seller-dashboard.html,
 *              customer-dashboard.html, index.html
 *
 *  STORAGE SCHEMA
 *  ─────────────
 *  auth_session          → { userId, role, email, loginAt }
 *  user_data_<userId>    → full per-user object (no password stored)
 *  ecommerce_products    → shared products array
 *  ecommerce_orders      → shared orders array
 *
 *  PUBLIC API
 *  ──────────
 *  AUTH.login(email, password)       → Promise<user>
 *  AUTH.logout(redirectTo?)          → void
 *  AUTH.getSession()                 → session | null
 *  AUTH.getCurrentUser()             → user | null
 *  AUTH.updateUser(partial)          → void
 *  AUTH.changePassword(old, new)     → Promise<void>
 *  AUTH.guardRoute(allowedRoles[])   → bool
 *  AUTH.initUserData(apiUser)        → user object
 * ═══════════════════════════════════════════════════════════════
 */

const API_URL = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/users_table';

const AUTH = (() => {

  const SESSION_KEY = 'auth_session';
  const userDataKey = id => `user_data_${id}`;

  /* ── localStorage helpers ──────────────────────────────────── */
  const store  = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const load   = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const remove = k => localStorage.removeItem(k);

  /* ══════════════════════════════════════════════════════════
     SESSION
  ══════════════════════════════════════════════════════════ */

  function getSession() {
    return load(SESSION_KEY);
  }

  function setSession(user) {
    store(SESSION_KEY, {
      userId:  user.id,
      role:    (user.role || 'buyer').toLowerCase(),
      email:   user.email,
      loginAt: Date.now(),
    });
    localStorage.setItem('isLoggedIn', 'true');
  }

  function clearSession() {
    remove(SESSION_KEY);
    remove('isLoggedIn');
    remove('seller_current');
    remove('ecommerce_current_user');
  }

  /* ══════════════════════════════════════════════════════════
     PER-USER DATA BLOB  ( user_data_<id> )
  ══════════════════════════════════════════════════════════ */

  /**
   * initUserData — called after every successful login.
   *   • First login  → create fresh blob from API data
   *   • Return visit → merge without losing locally saved extras
   */
  function initUserData(apiUser) {
    const key      = userDataKey(apiUser.id);
    const existing = load(key);
    const role     = (apiUser.role || 'buyer').toLowerCase();

    const base = {
      id:           apiUser.id,
      name:         apiUser.name
                      || ((apiUser.firstName || '') + ' ' + (apiUser.lastName || '')).trim()
                      || 'User',
      email:        apiUser.email,
      role,
      phone:        apiUser.phone        || '',
      address:      apiUser.address      || '',
      country:      apiUser.country      || '',
      gender:       apiUser.gender       || '',
      birthday:     apiUser.birthday     || '',
      zip:          apiUser.zip          || '',
      profileImage: apiUser.profileImage || null,
      joined:       apiUser.createdAt    || new Date().toISOString(),
    };

    if (role === 'seller') {
      base.business  = apiUser.business || apiUser.storeName || '';
      base.sellerBio = apiUser.sellerBio || '';
    } else {
      base.payments      = [];
      base.addresses     = [];
      base.notifications = [];
    }

    if (!existing) {
      store(key, base);
    } else {
      // Returning user — keep all local extras, only refresh identity
      const merged = {
        ...existing,
        id:           base.id,
        email:        base.email,
        role:         base.role,
        name:         existing.name || base.name,
        profileImage: existing.profileImage || base.profileImage,
      };
      store(key, merged);
    }

    const saved = load(key);

    // Keep legacy keys in sync so old dashboard code still works
    if (role === 'seller') {
      localStorage.setItem('seller_current', JSON.stringify(saved));
    } else {
      localStorage.setItem('ecommerce_current_user', JSON.stringify(saved));
    }

    return saved;
  }

  function getCurrentUser() {
    const sess = getSession();
    if (!sess) return null;
    return load(userDataKey(sess.userId));
  }

  /**
   * Merge partial fields into the current user's local blob.
   * Also keeps legacy keys in sync.
   */
  function updateUser(partial) {
    const sess = getSession();
    if (!sess) return;
    const key     = userDataKey(sess.userId);
    const data    = load(key) || {};
    const updated = { ...data, ...partial };
    store(key, updated);

    const role = (sess.role || '').toLowerCase();
    if (role === 'seller') {
      localStorage.setItem('seller_current', JSON.stringify(updated));
    } else {
      localStorage.setItem('ecommerce_current_user', JSON.stringify(updated));
    }
  }

  /* ══════════════════════════════════════════════════════════
     API HELPERS
  ══════════════════════════════════════════════════════════ */

  async function fetchAllUsers() {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Network error — cannot reach API.');
    return res.json();
  }

  async function patchAPIPassword(userId, newPassword) {
    const res = await fetch(`${API_URL}/${userId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) throw new Error('API password update failed.');
    return res.json();
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC METHODS
  ══════════════════════════════════════════════════════════ */

  /**
   * LOGIN
   *  1. Fetch users from API
   *  2. Match email (case-insensitive) + password
   *  3. Create session
   *  4. Init/merge localStorage blob
   *  5. Return merged user object
   */
  async function login(email, password) {
    const users = await fetchAllUsers();
    const apiUser = users.find(u =>
      (u.email || '').toLowerCase().trim() === email.toLowerCase().trim() &&
      u.password === password
    );
    if (!apiUser) throw new Error('Invalid email or password.');

    setSession(apiUser);
    return initUserData(apiUser);
  }

  /**
   * LOGOUT — clears all session data, redirects
   */
  function logout(redirectTo = 'index.html') {
    clearSession();
    window.location.replace(redirectTo);
  }

  /**
   * CHANGE PASSWORD
   *  1. Fetch fresh API record
   *  2. Verify oldPassword == API record password
   *  3. PATCH newPassword to API
   *  (Password is NEVER stored in localStorage)
   */
  async function changePassword(oldPassword, newPassword) {
    const sess = getSession();
    if (!sess) throw new Error('Not logged in.');

    const users   = await fetchAllUsers();
    const apiUser = users.find(u => String(u.id) === String(sess.userId));

    if (!apiUser)                         throw new Error('User not found.');
    if (apiUser.password !== oldPassword) throw new Error('Current password is incorrect.');

    await patchAPIPassword(sess.userId, newPassword);
  }

  /**
   * ROUTE GUARD
   *  Call at the top of each dashboard JS file (before DOMContentLoaded).
   *  allowedRoles: ['seller'] | ['buyer','customer','user']
   *
   *  → No session      : redirect to signin.html
   *  → Wrong role      : redirect to correct dashboard
   */
  function guardRoute(allowedRoles = []) {
    const sess = getSession();

    if (!sess) {
      window.location.replace('signin.html');
      return false;
    }

    const role    = (sess.role || '').toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (allowed.length && !allowed.includes(role)) {
      if (role === 'seller') { window.location.replace('seller-dashboard.html');  return false; }
      if (role === 'admin')  { window.location.replace('admin-dashboard.html');   return false; }
      window.location.replace('customer-dashboard.html');
      return false;
    }
    return true;
  }

  return {
    login,
    logout,
    getSession,
    getCurrentUser,
    updateUser,
    changePassword,
    guardRoute,
    initUserData,
    userDataKey,
  };

})();