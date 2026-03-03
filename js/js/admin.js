/**
 * admin.js — Amazino Admin Dashboard
 * Full platform management: users, products, orders, analytics.
 * Fetches all data live from API endpoints.
 */

AUTH.guardRoute(['admin']);

/* ═══════════════ CONSTANTS ═══════════════ */
const USERS_API    = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/users_table';
const PRODUCTS_API = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/products';
const ORDERS_API   = 'https://69a0ea5f2e82ee536f9fcd23.mockapi.io/data';

const STATUS_LIST = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const PAGE_TITLES = {
  dashboard: 'Dashboard', users: 'User Management',
  products: 'Products', orders: 'Orders',
  analytics: 'Analytics', profile: 'My Profile',
};

/* ═══════════════ STATE ═══════════════ */
let CA         = null;   // Current Admin
let allUsers   = [];
let allProducts = [];
let allOrders  = [];
let chartInstances = {};

// Pending delete/role-change state
let _pendingDeleteType = '';
let _pendingDeleteId   = '';
let _pendingRoleUserId = '';

/* ═══════════════ HELPERS ═══════════════ */
const setEl  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const fmtMoney = (n) => '$' + (+n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

function getOrderTotal(o) {
  if (o?.totals?.total != null) return +o.totals.total;
  if (typeof o?.total === 'number') return o.total;
  if (Array.isArray(o?.items)) return o.items.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 1)), 0);
  return 0;
}

function getInitials(name) {
  return (name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function roleChip(role) {
  const r = (role || 'buyer').toLowerCase();
  if (r === 'admin')  return `<span class="chip chip-red"><i class="fas fa-shield-alt"></i>${cap(r)}</span>`;
  if (r === 'seller') return `<span class="chip chip-purple"><i class="fas fa-store"></i>${cap(r)}</span>`;
  return `<span class="chip chip-blue"><i class="fas fa-user"></i>${cap(r)}</span>`;
}

function statusChip(status) {
  const s = (status || 'pending').toLowerCase();
  const map = {
    pending:    'chip-gold',
    processing: 'chip-blue',
    shipped:    'chip-purple',
    delivered:  'chip-green',
    cancelled:  'chip-red',
  };
  return `<span class="chip ${map[s] || 'chip-gray'}">${cap(s)}</span>`;
}

/* ═══════════════ TOAST ═══════════════ */
function toast(msg, isErr = false, isSuc = false) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : isSuc ? ' suc' : '');
  t.innerHTML = `<i class="fas fa-${isErr ? 'exclamation-circle' : isSuc ? 'check-circle' : 'info-circle'}"></i>${msg}`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ═══════════════ MODALS ═══════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openLogoutModal() { openModal('logoutModal'); }
function confirmLogout()   { AUTH.logout('signin.html'); }

/* ═══════════════ NAVIGATION ═══════════════ */
function go(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  setEl('pageTitleBar', PAGE_TITLES[name] || name);
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const match = [...document.querySelectorAll('.ni')].find(n => (n.getAttribute('onclick') || '').includes(`'${name}'`));
  if (match) match.classList.add('active');
  if (window.innerWidth < 900) closeSB();
  window.scrollTo(0, 0);
  if (name === 'dashboard') refreshDashboard();
  if (name === 'analytics') renderAnalytics();
  if (name === 'users')     renderUsersTable();
  if (name === 'products')  renderProductsTable();
  if (name === 'orders')    renderOrdersTable();
  if (name === 'profile')   fillProfile();
}

function toggleSB() { document.getElementById('sb').classList.toggle('open'); document.getElementById('ov').classList.toggle('open'); }
function closeSB()  { document.getElementById('sb').classList.remove('open'); document.getElementById('ov').classList.remove('open'); }

/* ═══════════════ INIT ═══════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadAdmin();
  const d = document.getElementById('dashDate');
  if (d) d.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  window.addEventListener('scroll', () => {
    document.getElementById('topbar')?.classList.toggle('scrolled', window.scrollY > 0);
  }, { passive: true });

  go('dashboard');
  loadAllData();
});

function loadAdmin() {
  if (typeof AUTH !== 'undefined') CA = AUTH.getCurrentUser();
  if (!CA) { AUTH.logout('signin.html'); return; }
  if (!CA.name && (CA.firstName || CA.lastName))
    CA.name = ((CA.firstName || '') + ' ' + (CA.lastName || '')).trim();
  if (!CA.name) CA.name = 'Admin';
  renderAdminUI();
}

function renderAdminUI() {
  if (!CA) return;
  const initials = getInitials(CA.name);
  setEl('tbName', CA.name);
  setEl('sbName', CA.name);
  setEl('welcomeName', CA.name.split(' ')[0] || 'Admin');
  setEl('profileName', CA.name);
  setEl('profileEmail', CA.email || '--');
  setEl('logoutName', CA.name);

  ['tbAvatar', 'sbAvatar', 'logoutAv', 'profileAv'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    if (CA.profileImage)
      el.innerHTML = `<img src="${CA.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    else
      el.textContent = initials;
  });
}

/* ═══════════════ DATA LOAD ═══════════════ */
async function loadAllData() {
  try {
    setEl('dStat1', '…'); setEl('dStat2', '…'); setEl('dStat3', '…'); setEl('dStat4', '…');
    const [users, products, orders] = await Promise.all([
      fetch(USERS_API).then(r => r.ok ? r.json() : []),
      fetch(PRODUCTS_API).then(r => r.ok ? r.json() : []),
      fetch(ORDERS_API).then(r => r.ok ? r.json() : []),
    ]);
    allUsers    = users;
    allProducts = products.map(p => ({ ...p, price: parseFloat(p.price) || 0, stock: p.stock || 0, sales: p.sales || 0 }));
    allOrders   = orders.map(o => ({
      ...o,
      id: o.orderId || o.id || '',
      customer: o.customer?.firstName
        ? `${o.customer.firstName} ${o.customer.lastName || ''}`.trim()
        : (typeof o.customer === 'string' ? o.customer : 'Customer'),
      total: getOrderTotal(o),
      createdAt: o.createdAt || new Date().toISOString(),
    }));
    refreshDashboard();
    toast('Platform data loaded successfully', false, true);
  } catch (err) {
    console.error('[Admin] loadAllData failed:', err);
    toast('Failed to load data. Check network.', true);
  }
}

async function refreshAll() {
  toast('Refreshing data…');
  await loadAllData();
  const active = document.querySelector('.section.active');
  if (active) {
    const name = active.id.replace('section-', '');
    if (name !== 'dashboard') go(name);
  }
}

/* ═══════════════ DASHBOARD ═══════════════ */
function refreshDashboard() {
  const totalUsers    = allUsers.length;
  const totalRevenue  = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const totalProducts = allProducts.length;
  const totalOrders   = allOrders.length;

  setEl('dStat1', totalUsers.toString());
  setEl('dStat2', fmtMoney(totalRevenue));
  setEl('dStat3', totalProducts.toString());
  setEl('dStat4', totalOrders.toString());

  renderRevenueMiniChart();
  renderRoleChart();
  renderDashTopSellers();
  renderDashRecentOrders();
}

function renderRevenueMiniChart() {
  const ctx = document.getElementById('revenueChart'); if (!ctx) return;
  if (chartInstances.revenue) chartInstances.revenue.destroy();
  const days = 7, labels = [], data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    data.push(allOrders.filter(o => {
      const od = new Date(o.createdAt);
      return od.toDateString() === d.toDateString() && o.status !== 'cancelled';
    }).reduce((s, o) => s + o.total, 0));
  }
  chartInstances.revenue = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Revenue', data, borderColor: '#7c1d7c', backgroundColor: 'rgba(124,29,124,.1)', borderWidth: 2.5, pointBackgroundColor: '#7c1d7c', pointRadius: 4, fill: true, tension: .4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#7a6a7a' } }, y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 }, color: '#7a6a7a', callback: v => '$' + v } } } }
  });
}

function renderRoleChart() {
  const ctx = document.getElementById('roleChart'); if (!ctx) return;
  if (chartInstances.role) chartInstances.role.destroy();
  const roles = {};
  allUsers.forEach(u => { const r = (u.role || 'buyer').toLowerCase(); roles[r] = (roles[r] || 0) + 1; });
  const labels = Object.keys(roles).map(cap);
  const data   = Object.values(roles);
  chartInstances.role = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: ['#7c1d7c', '#1a5f9e', '#1e7a5e', '#c03b2b', '#b86b00'], borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } } } }
  });
}

function renderDashTopSellers() {
  const sellerMap = {};
  allOrders.forEach(o => {
    if (o.status === 'cancelled') return;
    const sid = o.sellerId || (Array.isArray(o.items) && o.items[0]?.sellerId);
    if (!sid) return;
    sellerMap[sid] = (sellerMap[sid] || 0) + o.total;
  });
  const sellers = Object.entries(sellerMap).map(([id, rev]) => {
    const user = allUsers.find(u => String(u.id) === String(id));
    const name = user ? (user.name || user.firstName || 'Seller') : 'Seller #' + id;
    return { id, name, rev };
  }).sort((a, b) => b.rev - a.rev).slice(0, 5);

  const el = document.getElementById('dashTopSellers');
  if (!el) return;
  if (!sellers.length) { el.innerHTML = '<div class="empty-state" style="padding:16px;"><i class="fas fa-store"></i><p>No seller data yet.</p></div>'; return; }
  const maxRev = sellers[0].rev || 1;
  const ranks = ['gold', 'silver', 'bronze'];
  el.innerHTML = sellers.map((s, i) => `
    <div class="top-product-row">
      <div class="tpr-rank ${ranks[i] || ''}">${i + 1}</div>
      <div class="tpr-info"><div class="tpr-name">${s.name}</div><div class="tpr-cat">Seller</div></div>
      <div class="tpr-bar-wrap"><div class="tpr-bar" style="width:${Math.round(s.rev / maxRev * 100)}%;"></div></div>
      <div class="tpr-val">${fmtMoney(s.rev)}</div>
    </div>`).join('');
}

function renderDashRecentOrders() {
  const recent = [...allOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const el = document.getElementById('dashRecentOrders');
  if (!el) return;
  if (!recent.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders yet.</p></div>'; return; }
  el.innerHTML = `<div class="table-wrap"><table class="data-table" style="min-width:400px;">
    <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
    <tbody>${recent.map(o => `<tr>
      <td style="font-family:monospace;font-size:.78rem;">#${String(o.id).slice(-6).toUpperCase()}</td>
      <td>${o.customer || 'Unknown'}</td>
      <td style="font-weight:700;">${fmtMoney(o.total)}</td>
      <td>${statusChip(o.status)}</td>
      <td style="color:var(--mu);font-size:.78rem;">${fmtDate(o.createdAt)}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

/* ═══════════════ USERS TABLE ═══════════════ */
function renderUsersTable(data) {
  const users = data || allUsers;
  setEl('userCount', `${users.length} user${users.length !== 1 ? 's' : ''}`);
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state" style="padding:28px;"><i class="fas fa-users"></i><p>No users found.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const name = u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || 'Unknown';
    const initials = getInitials(name);
    const av = u.profileImage
      ? `<img src="${u.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : initials;
    return `<tr>
      <td>
        <div class="user-cell">
          <div class="user-av">${av}</div>
          <div><div class="user-name">${name}</div><div class="user-email">${u.email || '—'}</div></div>
        </div>
      </td>
      <td>${roleChip(u.role)}</td>
      <td style="color:var(--mu);font-size:.82rem;">${u.phone || '—'}</td>
      <td style="color:var(--mu);font-size:.78rem;">${u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
      <td>
        <div class="td-actions">
          <button class="btn-info" style="padding:6px 10px;font-size:.72rem;" onclick="viewUser('${u.id}')"><i class="fas fa-eye"></i>View</button>
          <button class="btn-warn" style="padding:6px 10px;font-size:.72rem;" onclick="openRoleModal('${u.id}','${u.role || 'buyer'}','${name}')"><i class="fas fa-user-tag"></i>Role</button>
          <button class="btn-danger" style="padding:6px 10px;font-size:.72rem;" onclick="openDeleteModal('user','${u.id}','${name}')"><i class="fas fa-trash"></i>Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterUsers() {
  const q    = (document.getElementById('searchUsers')?.value || '').toLowerCase();
  const role = (document.getElementById('filterRole')?.value || '').toLowerCase();
  const filtered = allUsers.filter(u => {
    const name  = (u.name || (u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase();
    const email = (u.email || '').toLowerCase();
    const uRole = (u.role || 'buyer').toLowerCase();
    const matchQ    = !q || name.includes(q) || email.includes(q);
    const matchRole = !role || uRole === role || (role === 'buyer' && (uRole === 'buyer' || uRole === 'customer' || uRole === 'user'));
    return matchQ && matchRole;
  });
  renderUsersTable(filtered);
}

function viewUser(userId) {
  const u = allUsers.find(u => String(u.id) === String(userId));
  if (!u) return;
  const name = u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || 'Unknown';
  const userOrders = allOrders.filter(o => String(o.userId) === String(u.id) || (o.customer?.email && o.customer.email === u.email));
  const totalSpent = userOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  document.getElementById('userModalTitle').textContent = name;
  document.getElementById('userModalBody').innerHTML = `
    <div class="info-grid" style="margin-bottom:16px;">
      <div><div class="info-lbl">Name</div><div class="info-val">${name}</div></div>
      <div><div class="info-lbl">Email</div><div class="info-val">${u.email || '—'}</div></div>
      <div><div class="info-lbl">Phone</div><div class="info-val">${u.phone || '—'}</div></div>
      <div><div class="info-lbl">Role</div><div class="info-val">${roleChip(u.role)}</div></div>
      <div><div class="info-lbl">Country</div><div class="info-val">${u.country || '—'}</div></div>
      <div><div class="info-lbl">Joined</div><div class="info-val">${u.createdAt ? fmtDate(u.createdAt) : '—'}</div></div>
      <div><div class="info-lbl">Total Orders</div><div class="info-val">${userOrders.length}</div></div>
      <div><div class="info-lbl">Total Spent</div><div class="info-val" style="font-weight:700;color:var(--suc);">${fmtMoney(totalSpent)}</div></div>
    </div>`;
  openModal('userModal');
}

function openRoleModal(userId, currentRole, userName) {
  _pendingRoleUserId = userId;
  setEl('roleUserName', userName);
  const sel = document.getElementById('newRoleSelect');
  if (sel) sel.value = currentRole;
  openModal('roleModal');
}

async function confirmRoleChange() {
  const newRole = document.getElementById('newRoleSelect')?.value;
  if (!newRole || !_pendingRoleUserId) return;
  closeModal('roleModal');
  try {
    const res = await fetch(`${USERS_API}/${_pendingRoleUserId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) throw new Error('API error');
    const idx = allUsers.findIndex(u => String(u.id) === String(_pendingRoleUserId));
    if (idx !== -1) allUsers[idx].role = newRole;
    renderUsersTable();
    toast(`Role updated to ${cap(newRole)} successfully.`, false, true);
  } catch (err) {
    toast('Failed to update role. Try again.', true);
  }
}

/* ═══════════════ DELETE (generic) ═══════════════ */
function openDeleteModal(type, id, label) {
  _pendingDeleteType = type;
  _pendingDeleteId   = id;
  const msgs = {
    user:    `Delete user "${label}"? This cannot be undone.`,
    product: `Delete product "${label}"? This cannot be undone.`,
  };
  setEl('deleteMsg', msgs[type] || 'Are you sure?');
  openModal('deleteModal');
}

async function confirmDelete() {
  const type = _pendingDeleteType;
  const id   = _pendingDeleteId;
  closeModal('deleteModal');
  if (!type || !id) return;
  const url = type === 'user' ? `${USERS_API}/${id}` : `${PRODUCTS_API}/${id}`;
  try {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    if (type === 'user')    { allUsers    = allUsers.filter(u => String(u.id) !== String(id)); renderUsersTable(); }
    if (type === 'product') { allProducts = allProducts.filter(p => String(p.id) !== String(id)); renderProductsTable(); }
    refreshDashboard();
    toast('Deleted successfully.', false, true);
  } catch (err) {
    toast('Delete failed. Try again.', true);
  }
}

/* ═══════════════ PRODUCTS TABLE ═══════════════ */
function renderProductsTable(data) {
  const prods = data || allProducts;
  setEl('productCount', `${prods.length} product${prods.length !== 1 ? 's' : ''}`);
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;
  if (!prods.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="padding:28px;"><i class="fas fa-box-open"></i><p>No products found.</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = prods.map(p => {
    const seller = allUsers.find(u => String(u.id) === String(p.sellerId));
    const sellerName = seller ? (seller.name || seller.firstName || 'Seller') : '—';
    const img = p.image || p.imageUrl || p.img || '';
    const stockChip = p.stock === 0
      ? '<span class="chip chip-red">Out of Stock</span>'
      : p.stock <= 5
      ? '<span class="chip chip-gold">Low Stock</span>'
      : '<span class="chip chip-green">In Stock</span>';
    return `<tr>
      <td>
        <div class="prod-cell">
          ${img ? `<img class="prod-thumb" src="${img}" alt="" onerror="this.style.display='none'">` : `<div class="prod-thumb" style="display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="color:var(--mu2);"></i></div>`}
          <div><div style="font-weight:600;font-size:.82rem;color:var(--tx);">${p.name || '—'}</div><div style="font-size:.7rem;color:var(--mu);">ID: ${p.id}</div></div>
        </div>
      </td>
      <td><span class="chip chip-gray">${p.category || '—'}</span></td>
      <td style="font-weight:700;">${fmtMoney(p.price)}</td>
      <td>${stockChip} <span style="font-size:.78rem;color:var(--mu);margin-left:4px;">(${p.stock})</span></td>
      <td style="font-size:.82rem;color:var(--mu);">${sellerName}</td>
      <td>
        <div class="td-actions">
          <button class="btn-danger" style="padding:6px 10px;font-size:.72rem;" onclick="openDeleteModal('product','${p.id}','${(p.name || '').replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i>Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterProducts() {
  const q   = (document.getElementById('searchProducts')?.value || '').toLowerCase();
  const cat = (document.getElementById('filterCategory')?.value || '').toLowerCase();
  const filtered = allProducts.filter(p => {
    const name = (p.name || '').toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    return (!q || name.includes(q)) && (!cat || pCat.includes(cat));
  });
  renderProductsTable(filtered);
}

/* ═══════════════ ORDERS TABLE ═══════════════ */
function renderOrdersTable(data) {
  const orders = data || allOrders;
  const tbody  = document.getElementById('ordersTableBody');
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="padding:28px;"><i class="fas fa-shopping-bag"></i><p>No orders found.</p></div></td></tr>';
    return;
  }
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  tbody.innerHTML = sorted.map(o => {
    const items = Array.isArray(o.items) ? o.items.length : '—';
    return `<tr>
      <td style="font-family:monospace;font-size:.78rem;font-weight:600;">#${String(o.id).slice(-8).toUpperCase()}</td>
      <td style="font-size:.82rem;">${o.customer || 'Unknown'}</td>
      <td style="text-align:center;">${items}</td>
      <td style="font-weight:700;">${fmtMoney(o.total)}</td>
      <td>${statusChip(o.status)}</td>
      <td style="color:var(--mu);font-size:.78rem;">${fmtDate(o.createdAt)}</td>
      <td>
        <button class="btn-warn" style="padding:6px 10px;font-size:.72rem;" onclick="openOrderStatusModal('${o.id}','${o.status || 'pending'}')"><i class="fas fa-edit"></i>Status</button>
      </td>
    </tr>`;
  }).join('');
}

function filterOrders() {
  const q      = (document.getElementById('searchOrders')?.value || '').toLowerCase();
  const status = (document.getElementById('filterOrderStatus')?.value || '').toLowerCase();
  const filtered = allOrders.filter(o => {
    const idStr   = String(o.id).toLowerCase();
    const cust    = (o.customer || '').toLowerCase();
    const oStatus = (o.status || '').toLowerCase();
    return (!q || idStr.includes(q) || cust.includes(q)) && (!status || oStatus === status);
  });
  renderOrdersTable(filtered);
}

let _pendingOrderId = '';
function openOrderStatusModal(orderId, currentStatus) {
  _pendingOrderId = orderId;
  setEl('orderStatusId', '#' + String(orderId).slice(-8).toUpperCase());
  const sel = document.getElementById('orderStatusSelect');
  if (sel) sel.value = currentStatus;
  openModal('orderStatusModal');
}

async function confirmOrderStatus() {
  const newStatus = document.getElementById('orderStatusSelect')?.value;
  if (!newStatus || !_pendingOrderId) return;
  closeModal('orderStatusModal');
  try {
    const res = await fetch(`${ORDERS_API}/${_pendingOrderId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('API error');
    const idx = allOrders.findIndex(o => String(o.id) === String(_pendingOrderId));
    if (idx !== -1) allOrders[idx].status = newStatus;
    renderOrdersTable();
    refreshDashboard();
    toast(`Order status updated to ${cap(newStatus)}.`, false, true);
  } catch (err) {
    toast('Failed to update order status.', true);
  }
}

/* ═══════════════ ANALYTICS ═══════════════ */
function renderAnalytics() {
  const totalRevenue  = allOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const totalOrders   = allOrders.length;
  const totalUsers    = allUsers.length;
  const totalProducts = allProducts.length;

  setEl('aStat1', fmtMoney(totalRevenue));
  setEl('aStat2', totalOrders.toString());
  setEl('aStat3', totalUsers.toString());
  setEl('aStat4', totalProducts.toString());

  renderAnalyticsRevenueChart();
  renderAnalyticsStatusChart();
  renderTopSellersAnalytics();
  renderTopProductsAnalytics();
}

function renderAnalyticsRevenueChart() {
  const ctx = document.getElementById('analyticsRevenueChart'); if (!ctx) return;
  if (chartInstances.analyticsRevenue) chartInstances.analyticsRevenue.destroy();
  const days = 14, labels = [], data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    data.push(allOrders.filter(o => {
      const od = new Date(o.createdAt);
      return od.toDateString() === d.toDateString() && o.status !== 'cancelled';
    }).reduce((s, o) => s + o.total, 0));
  }
  chartInstances.analyticsRevenue = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Revenue', data, backgroundColor: 'rgba(124,29,124,.7)', borderColor: '#7c1d7c', borderWidth: 1.5, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#7a6a7a', maxRotation: 45 } }, y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 }, color: '#7a6a7a', callback: v => '$' + v } } } }
  });
}

function renderAnalyticsStatusChart() {
  const ctx = document.getElementById('analyticsStatusChart'); if (!ctx) return;
  if (chartInstances.analyticsStatus) chartInstances.analyticsStatus.destroy();
  const counts = {};
  STATUS_LIST.forEach(s => counts[s] = allOrders.filter(o => (o.status || '').toLowerCase() === s).length);
  chartInstances.analyticsStatus = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: STATUS_LIST.map(cap), datasets: [{ data: STATUS_LIST.map(s => counts[s]), backgroundColor: ['#fbbf24', '#60a5fa', '#a78bfa', '#34d399', '#f87171'], borderWidth: 2, borderColor: '#fff', hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } } } }
  });
}

function renderTopSellersAnalytics() {
  const sellerMap = {};
  allOrders.forEach(o => {
    if (o.status === 'cancelled') return;
    const sid = String(o.sellerId || (Array.isArray(o.items) && o.items[0]?.sellerId) || '');
    if (!sid) return;
    sellerMap[sid] = (sellerMap[sid] || 0) + o.total;
  });
  const sellers = Object.entries(sellerMap).map(([id, rev]) => {
    const user = allUsers.find(u => String(u.id) === String(id));
    return { name: user ? (user.name || user.firstName || 'Seller') : 'Seller #' + id, rev };
  }).sort((a, b) => b.rev - a.rev).slice(0, 5);

  const el = document.getElementById('topSellersAnalytics');
  if (!el) return;
  if (!sellers.length) { el.innerHTML = '<div class="empty-state" style="padding:16px;"><i class="fas fa-store"></i><p>No seller data.</p></div>'; return; }
  const maxRev = sellers[0].rev || 1;
  const ranks = ['gold', 'silver', 'bronze'];
  el.innerHTML = sellers.map((s, i) => `
    <div class="top-product-row">
      <div class="tpr-rank ${ranks[i] || ''}">${i + 1}</div>
      <div class="tpr-info"><div class="tpr-name">${s.name}</div></div>
      <div class="tpr-bar-wrap"><div class="tpr-bar" style="width:${Math.round(s.rev / maxRev * 100)}%;"></div></div>
      <div class="tpr-val">${fmtMoney(s.rev)}</div>
    </div>`).join('');
}

function renderTopProductsAnalytics() {
  const sorted = [...allProducts].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);
  const el = document.getElementById('topProductsAnalytics');
  if (!el) return;
  if (!sorted.length) { el.innerHTML = '<div class="empty-state" style="padding:16px;"><i class="fas fa-box"></i><p>No product data.</p></div>'; return; }
  const maxSales = sorted[0]?.sales || 1;
  const ranks = ['gold', 'silver', 'bronze'];
  el.innerHTML = sorted.map((p, i) => `
    <div class="top-product-row">
      <div class="tpr-rank ${ranks[i] || ''}">${i + 1}</div>
      <div class="tpr-info"><div class="tpr-name">${p.name}</div><div class="tpr-cat">${p.category || '—'}</div></div>
      <div class="tpr-bar-wrap"><div class="tpr-bar" style="width:${Math.round((p.sales || 0) / maxSales * 100)}%;"></div></div>
      <div class="tpr-val">${p.sales || 0} sold</div>
    </div>`).join('');
}

/* ═══════════════ PROFILE ═══════════════ */
function fillProfile() {
  if (!CA) return;
  setEl('viewName', CA.name || '—');
  setEl('viewEmail', CA.email || '—');
  setEl('viewPhone', CA.phone || '—');
  setEl('viewCountry', CA.country || '—');
  setEl('viewJoined', CA.createdAt ? fmtDate(CA.createdAt) : '—');
  setVal('editName', CA.name || '');
  setVal('editEmail', CA.email || '');
  setVal('editPhone', CA.phone || '');
  setVal('editCountry', CA.country || '');
}

function switchTab(name) {
  document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById('tab-' + name);
  if (pane) pane.classList.add('active');
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(b => { if ((b.getAttribute('onclick') || '').includes(`'${name}'`)) b.classList.add('active'); });
}

function saveProfile() {
  const name    = document.getElementById('editName')?.value.trim();
  const email   = document.getElementById('editEmail')?.value.trim();
  const phone   = document.getElementById('editPhone')?.value.trim();
  const country = document.getElementById('editCountry')?.value.trim();
  if (!name) { toast('Name cannot be empty.', true); return; }
  CA = { ...CA, name, email, phone, country };
  if (typeof AUTH !== 'undefined' && AUTH.getSession()) AUTH.updateUser(CA);
  renderAdminUI();
  fillProfile();
  switchTab('view');
  toast('Profile updated successfully.', false, true);
}

async function changePassword() {
  const oldPw  = document.getElementById('pwCurrent')?.value;
  const newPw  = document.getElementById('pwNew')?.value;
  const confPw = document.getElementById('pwConfirm')?.value;
  if (!oldPw || !newPw || !confPw) { toast('Please fill all password fields.', true); return; }
  if (newPw.length < 8) { toast('New password must be at least 8 characters.', true); return; }
  if (newPw !== confPw) { toast('Passwords do not match.', true); return; }
  try {
    await AUTH.changePassword(oldPw, newPw);
    ['pwCurrent', 'pwNew', 'pwConfirm'].forEach(id => setVal(id, ''));
    toast('Password changed successfully.', false, true);
    switchTab('view');
  } catch (err) {
    toast(err.message || 'Password change failed.', true);
  }
}