/**
 * ═══════════════════════════════════════════════════════════════
 *  seller_dashboard.js
 *  Amazino Seller Dashboard — Full Auth Integration
 *
 *  Requires: auth.js  (loaded BEFORE this file in the HTML)
 *
 *  Data isolation:
 *    user_data_<sellerId>    → seller profile & settings
 *    ecommerce_products      → all products (filtered by sellerId)
 *    ecommerce_orders        → all orders   (filtered by sellerId)
 *    seller_data_<sellerId>  → extra per-seller local data
 * ═══════════════════════════════════════════════════════════════
 */

/* ── Route Guard — must run BEFORE DOMContentLoaded ────────── */
AUTH.guardRoute(['seller']);

/* ── State ─────────────────────────────────────────────────── */
const K = {
  PRODUCTS: 'ecommerce_products',
  ORDERS:   'ecommerce_orders',
  USERS:    'ecommerce_users',
};

/* ── EmailJS config ──────────────────────────────────────── */
const EMAILJS_SERVICE  = 'service_elxefnw';
const EMAILJS_TEMPLATE = 'template_1o90chi';
const SELLER_API = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/users_table';

let CS             = null;   // current seller object
let products       = [];
let orders         = [];
let chartInstances = {};

/* OTP / password change state */
let pwOtpGenerated = '';
let pwOtpSent      = false;
let pwPendingNew   = '';

/* Profile OTP state */
let _sellerProfileOTP  = '';
let _sellerPendingData = null;

/* Forgot password OTP state */
let _sellerForgotOTP   = '';

/* ── Page section titles ────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:       'Dashboard',
  analytics:       'Analytics',
  products:        'My Products',
  orders:          'Orders',
  profile:         'My Profile',
  'personal-data': 'Personal Data',
  password:        'Password & Security',
};

/* ── Demo seed data ─────────────────────────────────────────── */
const DEMO_SELLER = {
  id: 'seller_demo_1', name: 'Sarah Johnson', email: 'sarah@mystorehub.com',
  phone: '+1 555 234 5678', business: 'TechStyle Hub',
  address: '45 Commerce Drive, San Francisco, CA 94103', country: 'USA',
  role: 'seller', joined: '2024-01-15', profileImage: null,
};

const DEMO_PRODUCTS = [
  { id:'p1', sellerId:'seller_demo_1', name:'Wireless Noise-Cancelling Headphones', category:'Electronics',  price:129.99, stock:42, description:'Premium audio experience with 30hr battery life.', image:null, createdAt:'2024-11-01T10:00:00Z', sales:187 },
  { id:'p2', sellerId:'seller_demo_1', name:'Minimalist Leather Wallet',             category:'Clothing',    price:39.99,  stock:3,  description:'Slim genuine leather wallet, 6-card capacity.',  image:null, createdAt:'2024-11-05T09:00:00Z', sales:95  },
  { id:'p3', sellerId:'seller_demo_1', name:'Ceramic Pour-Over Coffee Set',          category:'Home',        price:54.99,  stock:0,  description:'Handcrafted ceramic dripper with carafe.',       image:null, createdAt:'2024-11-10T11:00:00Z', sales:62  },
  { id:'p4', sellerId:'seller_demo_1', name:'Running Performance Tee',               category:'Sports',      price:29.99,  stock:88, description:'Moisture-wicking fabric for workouts.',          image:null, createdAt:'2024-11-15T08:00:00Z', sales:134 },
  { id:'p5', sellerId:'seller_demo_1', name:'Anatomy & Physiology Textbook',         category:'Books',       price:74.99,  stock:17, description:'Comprehensive medical textbook, 9th edition.',   image:null, createdAt:'2024-11-20T14:00:00Z', sales:48  },
  { id:'p6', sellerId:'seller_demo_1', name:'Vitamin C Serum 30ml',                  category:'Beauty',      price:22.99,  stock:5,  description:'Brightening anti-oxidant serum.',                image:null, createdAt:'2024-12-01T10:00:00Z', sales:211 },
];

const STATUS_LIST = ['pending','processing','shipped','delivered','cancelled'];
const NAMES = ['Maram Ahmed','James Carter','Yuki Tanaka','Fatima Al-Rashid','Liam O\'Brien','Amara Nwosu','Diego Reyes','Priya Sharma'];

function generateDemoOrders(sellerId, sellerProducts) {
  const base = []; let counter = 1;
  sellerProducts.forEach(p => {
    const count = Math.min(Math.floor((p.sales || 0) / 20), 6);
    for (let i = 0; i < count; i++) {
      const qty    = Math.floor(Math.random() * 3) + 1;
      const daysAgo= Math.floor(Math.random() * 60);
      const status = STATUS_LIST[Math.floor(Math.random() * STATUS_LIST.length)];
      base.push({
        id:        'ORD' + String(counter++).padStart(5,'0'),
        sellerId,
        customer:  NAMES[Math.floor(Math.random() * NAMES.length)],
        items:     [{ name: p.name, quantity: qty, price: p.price }],
        total:     +(p.price * qty).toFixed(2),
        status,
        createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        productId: p.id,
      });
    }
  });
  return base.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadSeller();
  loadData();
  setupScrollHandler();
  setupPwOtpBoxes();
  const d = document.getElementById('dashDate');
  if (d) d.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  go('dashboard');
});

/* ── Load seller from AUTH (or legacy fallback) ─────────────── */
function loadSeller() {
  // Primary: use AUTH session
  if (typeof AUTH !== 'undefined') {
    CS = AUTH.getCurrentUser();
  }

  // Legacy fallback: read seller_current
  if (!CS) {
    CS = JSON.parse(localStorage.getItem('seller_current') || 'null');
  }

  // Last resort: use demo data
  if (!CS) {
    CS = { ...DEMO_SELLER };
    // Create a proper session-like entry in localStorage for demo
    localStorage.setItem('seller_current', JSON.stringify(CS));
  }

  // Normalise: ensure the name field exists
  if (!CS.name && (CS.firstName || CS.lastName)) {
    CS.name = ((CS.firstName || '') + ' ' + (CS.lastName || '')).trim();
  }
  if (!CS.name) CS.name = 'Seller';

  renderSellerUI();
  fillPersonalData();
}

/* ── Save seller back to localStorage (keeps AUTH in sync) ──── */
function saveSeller() {
  // Update via AUTH if available (preferred)
  if (typeof AUTH !== 'undefined' && AUTH.getSession()) {
    AUTH.updateUser(CS);
  } else {
    // Legacy fallback
    localStorage.setItem('seller_current', JSON.stringify(CS));
  }
}

/* ── Load products & orders for THIS seller ─────────────────── */
function loadData() {
  const sellerId = CS.id;

  // Products
  let allProducts = JSON.parse(localStorage.getItem(K.PRODUCTS) || '[]');
  products = allProducts.filter(p => p.sellerId === sellerId);

  if (!products.length) {
    // Seed demo products tagged with this seller's actual ID
    products = DEMO_PRODUCTS.map(p => ({ ...p, sellerId }));
    const others = allProducts.filter(p => p.sellerId !== sellerId);
    localStorage.setItem(K.PRODUCTS, JSON.stringify([...others, ...products]));
  }

  // Orders
  let allOrders = JSON.parse(localStorage.getItem(K.ORDERS) || '[]');
  orders = allOrders.filter(o => o.sellerId === sellerId);

  if (!orders.length) {
    orders = generateDemoOrders(sellerId, products);
    const others = allOrders.filter(o => o.sellerId !== sellerId);
    localStorage.setItem(K.ORDERS, JSON.stringify([...others, ...orders]));
  }

  refreshDashboard();
}

/* ════════════════════════════════════════════════════════════
   UI RENDER
════════════════════════════════════════════════════════════ */
function renderSellerUI() {
  if (!CS) return;
  const name     = CS.name || 'Seller';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  setEl('tbName', name);
  setEl('sbName', name);
  setEl('welcomeName', name.split(' ')[0] || 'Seller');
  setEl('profileName', name);
  setEl('profileEmail', CS.email || '--');
  setEl('profileStore', CS.business || 'My Store');
  const roleEl = document.getElementById('tbRole');
  if (roleEl) roleEl.textContent = 'Seller';

  // Avatars
  const avatarIds = [
    { id:'tbAvatar', img:null, ico:null },
    { id:'sbAvatar', img:null, ico:null },
    { id:'logoutAv', img:null, ico:null },
    { id:'profileAv', img:'profileAvImg', ico:'profileAvIco' },
  ];
  avatarIds.forEach(({ id, img, ico }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (CS.profileImage) {
      el.innerHTML = `<img src="${CS.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      if (img) { const i = document.getElementById(img); if(i){i.src=CS.profileImage;i.style.display='block';} }
      if (ico) { const ic = document.getElementById(ico); if(ic) ic.style.display='none'; }
    } else {
      el.textContent = initials;
      if (img) { const i = document.getElementById(img); if(i) i.style.display='none'; }
      if (ico) { const ic = document.getElementById(ico); if(ic) ic.style.display=''; }
    }
  });

  setEl('logoutName', name);
}

function fillPersonalData() {
  if (!CS) return;
  setEl('viewName',     CS.name     || '--');
  setEl('viewEmail',    CS.email    || '--');
  setEl('viewPhone',    CS.phone    || '--');
  setEl('viewBusiness', CS.business || '--');
  setEl('viewAddress',  CS.address  || '--');
  setEl('viewCountry',  CS.country  || '--');
  setEl('viewJoined',   CS.joined   ? fmtDate(CS.joined) : '--');
  setVal('editName',     CS.name     || '');
  setVal('editEmail',    CS.email    || '');
  setVal('editPhone',    CS.phone    || '');
  setVal('editBusiness', CS.business || '');
  setVal('editAddress',  CS.address  || '');
  setVal('editCountry',  CS.country  || '');
}

function setupScrollHandler() {
  window.addEventListener('scroll', () => {
    const tb = document.getElementById('topbar');
    if (tb) tb.classList.toggle('scrolled', window.scrollY > 0);
  }, { passive: true });
}

/* ════════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════════ */
function go(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  setEl('pageTitleBar', PAGE_TITLES[name] || name);

  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const match = [...document.querySelectorAll('.ni')].find(n =>
    (n.getAttribute('onclick') || '').includes(`'${name}'`)
  );
  if (match) match.classList.add('active');
  if (window.innerWidth < 768) closeSB();
  window.scrollTo(0, 0);

  if (name === 'dashboard')    refreshDashboard();
  if (name === 'analytics')    renderAnalytics();
  if (name === 'products')     renderProductsTable();
  if (name === 'orders')       renderOrders();
}

function toggleSB() { document.getElementById('sb').classList.toggle('open'); document.getElementById('ov').classList.toggle('open'); }
function closeSB()  { document.getElementById('sb').classList.remove('open'); document.getElementById('ov').classList.remove('open'); }

/* ════════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════════ */
function refreshDashboard() {
  const totalRev = orders.filter(o => o.status !== 'cancelled').reduce((s,o) => s + o.total, 0);
  const pending  = orders.filter(o => o.status === 'pending').length;
  setEl('dStat1', products.length.toString());
  setEl('dStat2', '$' + totalRev.toFixed(0));
  setEl('dStat3', orders.length.toString());
  setEl('dStat4', pending.toString());
  if (pending > 2) { const el = document.getElementById('dStat4'); if(el) el.style.color='var(--err)'; }

  renderMiniChart();
  renderStatusChart();
  renderDashTopProducts();
  renderDashRecentOrders();
}

function renderMiniChart() {
  const ctx = document.getElementById('revenueChart'); if (!ctx) return;
  if (chartInstances.revenue) chartInstances.revenue.destroy();
  const days = 7; const labels = []; const data = [];
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('en-US',{weekday:'short'}));
    data.push(orders.filter(o=>{const od=new Date(o.createdAt);return od.toDateString()===d.toDateString()&&o.status!=='cancelled';}).reduce((s,o)=>s+o.total,0));
  }
  chartInstances.revenue = new Chart(ctx, {
    type:'line',
    data:{labels,datasets:[{label:'Revenue',data,borderColor:'#7c1d7c',backgroundColor:'rgba(124,29,124,.1)',borderWidth:2.5,pointBackgroundColor:'#7c1d7c',pointRadius:4,pointHoverRadius:6,fill:true,tension:.4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11},color:'#7a6a7a'}},y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:11},color:'#7a6a7a',callback:v=>'$'+v}}}}
  });
}

function renderStatusChart() {
  const ctx = document.getElementById('statusChart'); if (!ctx) return;
  if (chartInstances.status) chartInstances.status.destroy();
  const counts = {}; STATUS_LIST.forEach(s=>counts[s]=orders.filter(o=>o.status===s).length);
  chartInstances.status = new Chart(ctx,{
    type:'doughnut',
    data:{labels:STATUS_LIST.map(cap),datasets:[{data:STATUS_LIST.map(s=>counts[s]),backgroundColor:['#fbbf24','#60a5fa','#a78bfa','#34d399','#f87171'],borderWidth:2,borderColor:'#fff',hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:10,boxWidth:12}}}}
  });
}

function renderDashTopProducts() {
  const sorted = [...products].sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,4);
  const maxSales = sorted[0]?.sales || 1;
  const el = document.getElementById('dashTopProducts');
  if (!el) return;
  if (!sorted.length) { el.innerHTML='<div class="empty-state" style="padding:16px;"><i class="fas fa-box"></i><p>No products yet.</p></div>'; return; }
  const ranks=['gold','silver','bronze'];
  el.innerHTML=sorted.map((p,i)=>`<div class="top-product-row"><div class="tpr-rank ${ranks[i]||''}">${i+1}</div><div class="tpr-info"><div class="tpr-name">${p.name}</div><div class="tpr-cat">${p.category}</div></div><div class="tpr-bar-wrap"><div class="tpr-bar" style="width:${Math.round((p.sales||0)/maxSales*100)}%;"></div></div><div class="tpr-val">${p.sales||0}</div></div>`).join('');
}

function renderDashRecentOrders() {
  const recent = orders.slice(0,5);
  const el = document.getElementById('dashRecentOrders');
  if (!el) return;
  if (!recent.length) { el.innerHTML='<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders yet.</p></div>'; return; }
  el.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${recent.map(o=>`<tr><td style="font-weight:800;">#${o.id}</td><td>${o.customer}</td><td style="color:var(--mu);">${fmtDate(o.createdAt)}</td><td style="font-weight:700;">$${o.total.toFixed(2)}</td><td><span class="badge badge-${o.status}">${cap(o.status)}</span></td><td><button class="btn-icon" onclick="openOrderDetail('${o.id}')"><i class="fas fa-eye"></i></button></td></tr>`).join('')}</tbody></table></div>`;
}

/* ════════════════════════════════════════════════════════════
   ANALYTICS
════════════════════════════════════════════════════════════ */
function renderAnalytics() {
  const range  = parseInt(document.getElementById('analyticsRange')?.value || 30);
  const cutoff = new Date(Date.now() - range * 86400000);
  const rangeOrders = orders.filter(o=>new Date(o.createdAt)>=cutoff && o.status!=='cancelled');
  const totalRev  = rangeOrders.reduce((s,o)=>s+o.total,0);
  const totalUnits= rangeOrders.reduce((s,o)=>s+o.items.reduce((ss,i)=>ss+i.quantity,0),0);
  const avg = rangeOrders.length ? totalRev/rangeOrders.length : 0;
  setEl('anRevenue', '$'+totalRev.toFixed(0));
  setEl('anOrders',  rangeOrders.length.toString());
  setEl('anUnits',   totalUnits.toString());
  setEl('anAvg',     '$'+avg.toFixed(2));
  renderRevenueTrend(range,rangeOrders);
  renderOrdersPerDay(range,rangeOrders);
  renderCategoryChart(rangeOrders);
  renderTopProductsList();
  renderPerformanceTable();
}

function renderRevenueTrend(range,rangeOrders) {
  const ctx = document.getElementById('revenueTrendChart'); if (!ctx) return;
  if (chartInstances.revTrend) chartInstances.revTrend.destroy();
  const pts=Math.min(range,30); const step=Math.ceil(range/pts); const labels=[]; const data=[];
  for (let i=pts-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i*step);labels.push(d.toLocaleDateString('en-US',range<=7?{weekday:'short'}:{month:'short',day:'numeric'}));data.push(+rangeOrders.filter(o=>Math.abs(new Date(o.createdAt)-d)<step*86400000/2).reduce((s,o)=>s+o.total,0).toFixed(2));}
  chartInstances.revTrend=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Revenue ($)',data,borderColor:'#7c1d7c',backgroundColor:'rgba(124,29,124,.08)',borderWidth:2.5,pointBackgroundColor:'#7c1d7c',pointRadius:3,pointHoverRadius:6,fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10},color:'#7a6a7a',maxTicksLimit:8}},y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:10},color:'#7a6a7a',callback:v=>'$'+v}}}}});
}

function renderOrdersPerDay(range,rangeOrders) {
  const ctx=document.getElementById('ordersChart');if(!ctx)return;
  if(chartInstances.ordersDay)chartInstances.ordersDay.destroy();
  const pts=Math.min(range,14);const labels=[];const data=[];
  for(let i=pts-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);labels.push(d.toLocaleDateString('en-US',{month:'short',day:'numeric'}));data.push(rangeOrders.filter(o=>new Date(o.createdAt).toDateString()===d.toDateString()).length);}
  chartInstances.ordersDay=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Orders',data,backgroundColor:'rgba(124,29,124,.75)',borderRadius:6,borderSkipped:false,hoverBackgroundColor:'#7c1d7c'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10},color:'#7a6a7a',maxTicksLimit:7}},y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:10},color:'#7a6a7a',precision:0}}}}});
}

function renderCategoryChart(rangeOrders) {
  const ctx=document.getElementById('categoryChart');if(!ctx)return;
  if(chartInstances.category)chartInstances.category.destroy();
  const cats={};rangeOrders.forEach(o=>{const p=products.find(pr=>pr.id===o.productId);const cat=p?.category||'Other';cats[cat]=(cats[cat]||0)+o.total;});
  const entries=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const colors=['#7c1d7c','#905690','#c084c0','#e8b4e8','#60a5fa','#34d399','#fbbf24'];
  chartInstances.category=new Chart(ctx,{type:'doughnut',data:{labels:entries.map(e=>e[0]),datasets:[{data:entries.map(e=>+e[1].toFixed(2)),backgroundColor:colors.slice(0,entries.length),borderWidth:2,borderColor:'#fff',hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:8,boxWidth:12}}}}});
}

function renderTopProductsList() {
  const sorted=[...products].sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,5);
  const maxSales=sorted[0]?.sales||1;
  const el=document.getElementById('topProductsList');if(!el)return;
  if(!sorted.length){el.innerHTML='<div class="empty-state" style="padding:16px;"><i class="fas fa-box"></i><p>No products yet.</p></div>';return;}
  const ranks=['gold','silver','bronze'];
  el.innerHTML=sorted.map((p,i)=>`<div class="top-product-row"><div class="tpr-rank ${ranks[i]||''}">${i+1}</div><div class="tpr-info"><div class="tpr-name">${p.name}</div><div class="tpr-cat">${p.category} · $${p.price}</div></div><div class="tpr-bar-wrap" style="width:80px;"><div class="tpr-bar" style="width:${Math.round((p.sales||0)/maxSales*100)}%;"></div></div><div class="tpr-val">${p.sales||0} sold</div></div>`).join('');
}

function renderPerformanceTable() {
  const tbody=document.getElementById('performanceTable');if(!tbody)return;
  if(!products.length){tbody.innerHTML='<tr><td colspan="6"><div class="empty-state" style="padding:24px;"><i class="fas fa-database"></i><p>No data yet.</p></div></td></tr>';return;}
  tbody.innerHTML=products.map(p=>{const revenue=(p.sales||0)*p.price;const stockBadge=p.stock===0?'badge-out':p.stock<=5?'badge-low':'badge-active';const stockLabel=p.stock===0?'Out of Stock':p.stock<=5?'Low Stock':'In Stock';return`<tr><td style="font-weight:600;">${p.name}</td><td><span class="badge badge-active" style="background:var(--pri-lt);color:var(--pri);">${p.category}</span></td><td style="font-weight:700;">${p.sales||0}</td><td style="font-weight:700;color:var(--suc);">$${revenue.toFixed(2)}</td><td>${p.stock}</td><td><span class="badge ${stockBadge}">${stockLabel}</span></td></tr>`;}).join('');
}

/* ════════════════════════════════════════════════════════════
   PRODUCTS
════════════════════════════════════════════════════════════ */
function renderProductsTable(list) {
  list = list || products;
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;
  if (!list.length) { tbody.innerHTML='<tr><td colspan="7"><div class="empty-state" style="padding:36px;"><i class="fas fa-box-open"></i><p>No products found.</p></div></td></tr>'; return; }
  tbody.innerHTML = list.map(p => {
    const stockBadge = p.stock===0?'badge-out':p.stock<=5?'badge-low':'';
    const stockLabel = p.stock===0?'Out of Stock':p.stock<=5?'Low Stock':p.stock;
    return `<tr><td><div class="prod-img">${p.image?`<img src="${p.image}" alt="">`:'<i class="fas fa-image"></i>'}</div></td><td><div class="prod-name">${p.name}</div><div class="prod-desc">${p.description}</div></td><td><span class="badge" style="background:var(--pri-lt);color:var(--pri);">${p.category}</span></td><td style="font-weight:700;">$${parseFloat(p.price).toFixed(2)}</td><td><span class="badge ${stockBadge||''}">${stockLabel}</span></td><td><span class="badge ${p.stock>0?'badge-active':'badge-inactive'}">${p.stock>0?'Active':'Inactive'}</span></td><td><div class="action-row"><button class="btn-icon" onclick="openProductModal('${p.id}')"><i class="fas fa-edit"></i></button><button class="btn-icon del" onclick="confirmDelete('${p.id}')"><i class="fas fa-trash"></i></button></div></td></tr>`;
  }).join('');
}

function filterProducts() {
  const q    = (document.getElementById('searchProducts').value || '').toLowerCase();
  const cat  = document.getElementById('filterCategory').value;
  const stk  = document.getElementById('filterStock').value;
  renderProductsTable(products.filter(p => {
    const matchQ   = !q   || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchCat = !cat || p.category === cat;
    const matchStk = !stk || (stk==='in'&&p.stock>5)||(stk==='low'&&p.stock>0&&p.stock<=5)||(stk==='out'&&p.stock===0);
    return matchQ && matchCat && matchStk;
  }));
}

function openProductModal(id) {
  const modal = document.getElementById('productModalBg');
  if (id) {
    const p = products.find(x => x.id === id); if (!p) return;
    setEl('productModalTitle','Edit Product'); setVal('editProductId',id);
    setVal('pName',p.name); setVal('pCategory',p.category); setVal('pPrice',p.price); setVal('pStock',p.stock); setVal('pDesc',p.description);
    if (p.image) { setVal('productImgData',p.image); const img=document.getElementById('imgPreview'); if(img)img.src=p.image; document.getElementById('imgPreviewWrap').style.display='block'; document.getElementById('imgPlaceholder').style.display='none'; document.getElementById('imgUploadArea').classList.add('has-img'); }
    else { clearProductImg(); }
  } else {
    setEl('productModalTitle','Add New Product'); setVal('editProductId','');
    ['pName','pCategory','pPrice','pStock','pDesc'].forEach(id=>setVal(id,''));
    clearProductImg();
    ['pNameErr','pCatErr','pPriceErr','pStockErr','pDescErr'].forEach(hideErr);
    document.querySelectorAll('#productModalBg .form-input,#productModalBg .form-select').forEach(el=>el.classList.remove('err','ok'));
  }
  modal.classList.add('open');
}

function closeProductModal() { document.getElementById('productModalBg').classList.remove('open'); }

function handleProductImg(inp) {
  const file=inp.files[0]; if(!file) return;
  if(file.size>5*1024*1024){toast('Image must be under 5MB',true);return;}
  const r=new FileReader();
  r.onload=e=>{setVal('productImgData',e.target.result);document.getElementById('imgPreview').src=e.target.result;document.getElementById('imgPlaceholder').style.display='none';document.getElementById('imgPreviewWrap').style.display='block';document.getElementById('imgUploadArea').classList.add('has-img');};
  r.readAsDataURL(file);
}

function removeProductImg(e) { e.stopPropagation(); clearProductImg(); }

function clearProductImg() {
  setVal('productImgData','');
  document.getElementById('imgPlaceholder').style.display='flex';
  document.getElementById('imgPreviewWrap').style.display='none';
  document.getElementById('imgUploadArea').classList.remove('has-img');
  document.getElementById('productImgInput').value='';
}

function saveProduct() {
  let ok = true;
  const name  = document.getElementById('pName').value.trim();
  const cat   = document.getElementById('pCategory').value;
  const price = parseFloat(document.getElementById('pPrice').value);
  const stock = parseInt(document.getElementById('pStock').value);
  const desc  = document.getElementById('pDesc').value.trim();
  const img   = document.getElementById('productImgData').value;
  const editId= document.getElementById('editProductId').value;

  ok = validateField2('pName','pNameErr',name.length>=2) && ok;
  ok = validateField2('pCategory','pCatErr',cat!=='') && ok;
  ok = validateField2('pPrice','pPriceErr',!isNaN(price)&&price>=0) && ok;
  ok = validateField2('pStock','pStockErr',!isNaN(stock)&&stock>=0) && ok;
  ok = validateField2('pDesc','pDescErr',desc.length>=5) && ok;
  if (!ok) { toast('Please fill all required fields.', true); return; }

  if (editId) {
    const idx = products.findIndex(p => p.id === editId);
    if (idx >= 0) { products[idx] = { ...products[idx], name, category:cat, price, stock, description:desc, image:img||products[idx].image }; toast('Product updated!'); }
  } else {
    products.unshift({ id:'p'+Date.now(), sellerId:CS.id, name, category:cat, price, stock, description:desc, image:img||null, createdAt:new Date().toISOString(), sales:0 });
    toast('Product added!');
  }
  saveProducts();
  renderProductsTable();
  refreshDashboard();
  closeProductModal();
}

function confirmDelete(id) {
  setEl('confirmSub', `Delete "${products.find(p=>p.id===id)?.name}"? This cannot be undone.`);
  document.getElementById('confirmDeleteBtn').onclick = () => { deleteProduct(id); closeConfirmModal(); };
  document.getElementById('confirmModalBg').classList.add('open');
}
function closeConfirmModal() { document.getElementById('confirmModalBg').classList.remove('open'); }

function deleteProduct(id) {
  products = products.filter(p => p.id !== id);
  saveProducts();
  renderProductsTable();
  refreshDashboard();
  toast('Product deleted.');
}

/** Persist products: only update THIS seller's slice, keep others intact */
function saveProducts() {
  const all    = JSON.parse(localStorage.getItem(K.PRODUCTS) || '[]');
  const others = all.filter(p => p.sellerId !== CS.id);
  localStorage.setItem(K.PRODUCTS, JSON.stringify([...others, ...products]));
}

/* ════════════════════════════════════════════════════════════
   ORDERS
════════════════════════════════════════════════════════════ */
function renderOrders(list) {
  list = list || orders;
  const el = document.getElementById('ordersContainer');
  if (!el) return;
  if (!list.length) { el.innerHTML='<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders found.</p></div>'; return; }
  el.innerHTML = list.map(o => `
    <div class="order-card">
      <div class="order-head">
        <div><div class="order-id">#${o.id}</div><div class="order-date">${fmtDate(o.createdAt)}</div></div>
        <span class="badge badge-${o.status}">${cap(o.status)}</span>
      </div>
      <div class="order-customer"><i class="fas fa-user" style="font-size:.75rem;color:var(--mu2);"></i>${o.customer}</div>
      <div class="order-items-txt">${o.items.map(i=>i.name+' × '+i.quantity).join(' · ')}</div>
      <div class="order-foot">
        <div class="order-total">$${o.total.toFixed(2)}</div>
        <div class="order-actions">
          <select class="status-select" onchange="updateOrderStatus('${o.id}',this.value)">
            ${STATUS_LIST.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${cap(s)}</option>`).join('')}
          </select>
          <button class="btn-icon" onclick="openOrderDetail('${o.id}')"><i class="fas fa-eye"></i></button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterOrders() {
  const status = document.getElementById('filterOrderStatus').value;
  const q      = (document.getElementById('searchOrders').value || '').toLowerCase();
  renderOrders(orders.filter(o => {
    const matchStatus = !status || o.status === status;
    const matchQ      = !q      || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q);
    return matchStatus && matchQ;
  }));
}

function updateOrderStatus(id, status) {
  const idx = orders.findIndex(o => o.id === id);
  if (idx >= 0) {
    orders[idx].status = status;
    saveOrders();
    refreshDashboard();
    toast(`Order updated to "${cap(status)}"`);
  }
}

/** Persist orders: only update THIS seller's slice */
function saveOrders() {
  const all    = JSON.parse(localStorage.getItem(K.ORDERS) || '[]');
  const others = all.filter(o => o.sellerId !== CS.id);
  localStorage.setItem(K.ORDERS, JSON.stringify([...others, ...orders]));
}

function openOrderDetail(id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  const body = document.getElementById('orderModalBody');
  body.innerHTML = `
    <div class="order-modal-info">
      <div class="odr-info-row"><span class="odr-label">Order ID</span><span class="odr-val" style="font-family:monospace;">#${o.id}</span></div>
      <div class="odr-info-row"><span class="odr-label">Customer</span><span class="odr-val">${o.customer}</span></div>
      <div class="odr-info-row"><span class="odr-label">Date</span><span class="odr-val">${fmtDate(o.createdAt)}</span></div>
      <div class="odr-info-row"><span class="odr-label">Status</span><span class="badge badge-${o.status}">${cap(o.status)}</span></div>
    </div>
    <div class="odr-items-title">Items</div>
    ${o.items.map(i=>`<div class="odr-item-row"><div class="odr-item-dot"></div><span class="odr-item-name">${i.name}</span><span class="odr-item-qty">× ${i.quantity}</span></div>`).join('')}
    <div class="odr-total-row"><span>Total</span><span style="color:var(--pri);">$${o.total.toFixed(2)}</span></div>
  `;
  document.getElementById('orderModalBg').classList.add('open');
}
function closeOrderModal() { document.getElementById('orderModalBg').classList.remove('open'); }

/* ════════════════════════════════════════════════════════════
   PROFILE / PERSONAL DATA
════════════════════════════════════════════════════════════ */
function handleAvatar(inp) {
  const file=inp.files[0]; if(!file) return;
  if(file.size>5*1024*1024){toast('Image must be under 5MB',true);return;}
  const r=new FileReader();
  r.onload=e=>{ CS.profileImage=e.target.result; saveSeller(); renderSellerUI(); toast('Profile photo updated!'); inp.value=''; };
  r.readAsDataURL(file);
}

function toggleEdit(editing) {
  document.getElementById('pdView').style.display = editing ? 'none' : 'block';
  document.getElementById('pdEdit').style.display = editing ? 'block' : 'none';
  if (editing) { fillPersonalData(); }
}

function savePersonalData(e) {
  e.preventDefault();
  const name  = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  let ok = true;
  ok = validateField2('editName','editNameErr', name.length >= 2) && ok;
  ok = validateField2('editEmail','editEmailErr', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) && ok;
  if (!ok) return;

  // Store pending data — open OTP modal to verify before saving
  _sellerPendingData = {
    name,
    email,
    phone:    document.getElementById('editPhone').value.trim(),
    business: document.getElementById('editBusiness').value.trim(),
    address:  document.getElementById('editAddress').value.trim(),
    country:  document.getElementById('editCountry').value,
  };
  openSellerProfileOtpModal();
}

/* ════════════════════════════════════════════════════════════
   PASSWORD CHANGE  (verifies via API before updating)
════════════════════════════════════════════════════════════ */
function togglePw(id, btn) {
  const el=document.getElementById(id); const isPass=el.type==='password';
  el.type=isPass?'text':'password';
  btn.querySelector('i').className=isPass?'fas fa-eye':'fas fa-eye-slash';
}

function checkStrength(el) {
  const v=el.value; let score=0;
  if(v.length>=8)score++; if(/[A-Z]/.test(v))score++; if(/[0-9]/.test(v))score++; if(/[^A-Za-z0-9]/.test(v))score++;
  const bar=document.getElementById('strengthBar');
  bar.style.width=(score/4*100)+'%';
  bar.style.background=['#e74c3c','#e67e22','#f1c40f','#2ecc71'][score-1]||'#e74c3c';
}

async function submitPassword(e) {
  e.preventDefault();
  const banner = document.getElementById('pwBanner');
  if (banner) banner.style.display = 'none';

  const currentInput = document.getElementById('pwCurrent');
  const newInput     = document.getElementById('pwNew');
  const confInput    = document.getElementById('pwConfirm');
  if (!currentInput || !newInput || !confInput) return;

  let ok = true;
  ok = validateField2('pwCurrent','pwCurrentErr', currentInput.value.trim().length >= 1) && ok;
  ok = validateField2('pwNew','pwNewErr', newInput.value.length >= 8) && ok;

  const newP  = newInput.value;
  const confP = confInput.value;
  if (newP !== confP) {
    confInput.classList.add('err');
    document.getElementById('pwConfirmErr').classList.add('show');
    ok = false;
  } else {
    confInput.classList.remove('err');
    if (newP) confInput.classList.add('ok');
    document.getElementById('pwConfirmErr').classList.remove('show');
  }
  if (!ok) { toast('Please fix the errors.', true); return; }

  const oldPassword = currentInput.value;
  const newPassword = newP;

  // Show loading
  const btn = e.submitter || document.querySelector('#pwForm .btn-pri');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying…'; btn.disabled = true; }

  try {
    // AUTH.changePassword verifies oldPassword against API first, then patches
    await AUTH.changePassword(oldPassword, newPassword);

    // Success — clear fields
    ['pwCurrent','pwNew','pwConfirm'].forEach(id => {
      setVal(id,''); const el=document.getElementById(id);
      if(el){el.classList.remove('err','ok');el.type='password';}
    });
    document.querySelectorAll('#pwForm .fa-eye').forEach(i=>i.className='fas fa-eye-slash');
    document.getElementById('strengthBar').style.width='0';
    if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }

    if (banner) { banner.style.display='flex'; banner.scrollIntoView({behavior:'smooth',block:'nearest'}); setTimeout(()=>banner.style.display='none',6000); }
    toast('Password updated successfully!');

  } catch (err) {
    if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }

    if (err.message && err.message.includes('incorrect')) {
      currentInput.classList.add('err');
      document.getElementById('pwCurrentErr').classList.add('show');
      toast('Current password is incorrect.', true);
    } else {
      toast(err.message || 'Failed to update password.', true);
    }
  }
}

/* OTP boxes (legacy OTP modal — kept for compatibility) */
function openPwOtpModal() {
  ['sCode1','sCode2','sCode3','sCode4'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.classList.remove('err');}});
  document.getElementById('sellerPwOtpModal').classList.add('open');
  setTimeout(()=>{const el=document.getElementById('sCode1');if(el)el.focus();},100);
}
function closePwOtpModal() {
  const m=document.getElementById('sellerPwOtpModal');
  if(m)m.classList.remove('open');
  pwOtpGenerated=''; pwOtpSent=false; pwPendingNew='';
}
function doSellerPwVerify() {
  const code=['sCode1','sCode2','sCode3','sCode4'].map(id=>document.getElementById(id)?.value||'').join('');
  if(code!==pwOtpGenerated){
    ['sCode1','sCode2','sCode3','sCode4'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.add('err');e.value='';}});
    document.getElementById('sCode1')?.focus();
    toast('Invalid code.',true); return;
  }
  closePwOtpModal(); toast('Password updated!');
}
function setupPwOtpBoxes() {
  function wireBoxes(ids, onComplete) {
    ids.forEach((id, i) => {
      const el = document.getElementById(id); if (!el) return;
      el.addEventListener('input', () => {
        el.value = el.value.replace(/\D/g, '');
        el.classList.remove('err');
        if (el.value && i < ids.length - 1) document.getElementById(ids[i+1]).focus();
        if (el.value && i === ids.length - 1) onComplete();
      });
      el.addEventListener('keydown', ev => {
        if (ev.key === 'Backspace' && !el.value && i > 0) document.getElementById(ids[i-1]).focus();
      });
      el.addEventListener('paste', ev => {
        const pasted = ev.clipboardData.getData('text').replace(/\D/g,'').slice(0,4);
        if (pasted.length > 0) {
          ev.preventDefault();
          pasted.split('').forEach((c, ci) => { const t = document.getElementById(ids[ci]); if(t) t.value = c; });
          const last = document.getElementById(ids[Math.min(pasted.length-1, 3)]);
          if (last) last.focus();
          if (pasted.length === 4) setTimeout(onComplete, 50);
        }
      });
    });
  }
  // Legacy password OTP boxes
  wireBoxes(['sCode1','sCode2','sCode3','sCode4'], doSellerPwVerify);
  // Profile verify OTP boxes
  wireBoxes(['spCode1','spCode2','spCode3','spCode4'], doSellerProfileVerify);
  // Forgot password OTP boxes
  wireBoxes(['sfCode1','sfCode2','sfCode3','sfCode4'], verifySellerForgotOtp);
}

/* ════════════════════════════════════════════════════════════
   PROFILE VERIFY — OTP via EmailJS
════════════════════════════════════════════════════════════ */
function openSellerProfileOtpModal() {
  _sellerProfileOTP = Math.floor(1000 + Math.random() * 9000).toString();

  // Reset boxes
  ['spCode1','spCode2','spCode3','spCode4'].forEach(id => {
    const el = document.getElementById(id); if(el){ el.value=''; el.classList.remove('err'); }
  });

  const modal   = document.getElementById('sellerProfileOtpModal');
  const hint    = document.getElementById('sellerOtpHint');
  const verBtn  = document.getElementById('sellerProfileVerifyBtn');
  if(hint) hint.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending code…';
  if(verBtn) verBtn.disabled = true;
  modal.classList.add('open');

  emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
    to_email: CS.email,
    code:     _sellerProfileOTP,
    name:     CS.name || 'Seller',
  }).then(() => {
    if(hint) hint.innerHTML = `Code sent to <strong style="color:var(--pri);">${CS.email}</strong>`;
    if(verBtn) verBtn.disabled = false;
    document.getElementById('spCode1')?.focus();
  }, () => {
    _sellerProfileOTP = '1234';
    if(hint) hint.innerHTML = `Couldn't send email. Use demo code <strong>1234</strong>`;
    if(verBtn) verBtn.disabled = false;
    document.getElementById('spCode1')?.focus();
    toast("Email service unavailable. Use demo code 1234.", true);
  });
}

function closeSellerProfileOtpModal() {
  document.getElementById('sellerProfileOtpModal').classList.remove('open');
  _sellerProfileOTP  = '';
  _sellerPendingData = null;
  ['spCode1','spCode2','spCode3','spCode4'].forEach(id => {
    const el = document.getElementById(id); if(el){ el.value=''; el.classList.remove('err'); }
  });
}

function doSellerProfileVerify() {
  const code = ['spCode1','spCode2','spCode3','spCode4']
    .map(id => document.getElementById(id)?.value || '').join('');

  if (code !== _sellerProfileOTP) {
    ['spCode1','spCode2','spCode3','spCode4'].forEach(id => {
      const e = document.getElementById(id); if(e){ e.classList.add('err'); e.value=''; }
    });
    document.getElementById('spCode1')?.focus();
    toast('Invalid code. Try again.', true);
    return;
  }

  // Apply pending changes to local state
  Object.assign(CS, _sellerPendingData);
  saveSeller();
  fillPersonalData();
  renderSellerUI();
  toggleEdit(false);
  closeSellerProfileOtpModal();
  _sellerProfileOTP  = '';
  _sellerPendingData = null;

  // Update API in background
  if (CS.id) {
    fetch(`${SELLER_API}/${CS.id}`, {
      method:  'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        name:     CS.name,
        email:    CS.email,
        phone:    CS.phone,
        business: CS.business,
        address:  CS.address,
        country:  CS.country,
      }),
    })
    .then(r => r.ok ? toast('Profile updated successfully!') : toast('Saved locally. API sync failed.', true))
    .catch(() => toast('Saved locally. No internet connection.', true));
  } else {
    toast('Profile updated successfully!');
  }
}

/* ════════════════════════════════════════════════════════════
   FORGOT PASSWORD — IN-DASHBOARD FLOW
════════════════════════════════════════════════════════════ */
function openSellerForgotFlow(e) {
  if(e) e.preventDefault();
  const emailEl        = document.getElementById('sfEmail');
  const emailConfirmEl = document.getElementById('sfEmailConfirm');
  if(emailEl)        emailEl.textContent        = CS?.email || '';
  if(emailConfirmEl) emailConfirmEl.textContent = CS?.email || '';
  _showSfStep(1);
  document.getElementById('sellerForgotPwModal').classList.add('open');
}

function closeSellerForgotPwModal() {
  document.getElementById('sellerForgotPwModal').classList.remove('open');
  _sellerForgotOTP = '';
  ['sfCode1','sfCode2','sfCode3','sfCode4'].forEach(id => {
    const el = document.getElementById(id); if(el){ el.value=''; el.classList.remove('err'); }
  });
  ['sf_new_pw','sf_confirm_pw'].forEach(id => {
    const el = document.getElementById(id); if(el){ el.value=''; el.classList.remove('err','ok'); el.type='password'; }
  });
  const bar = document.getElementById('sfStrengthBar'); if(bar) bar.style.width='0';
}

function _showSfStep(n) {
  [1,2,3].forEach(i => {
    const el = document.getElementById('sfStep'+i);
    if(el) el.style.display = (i===n) ? 'block' : 'none';
  });
}

async function sendSellerForgotOtp(isResend=false) {
  if(!CS?.email){ toast('No email on account.', true); return; }
  const btn = document.getElementById('sfSendBtn');
  const origHtml = btn ? btn.innerHTML : '';
  if(btn){ btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Sending…'; btn.disabled=true; }

  _sellerForgotOTP = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email: CS.email,
      code:     _sellerForgotOTP,
      name:     CS.name || 'Seller',
    });
    _showSfStep(2);
    document.getElementById('sfCode1')?.focus();
    if(isResend) toast('New code sent!');
  } catch(err) {
    _sellerForgotOTP = '1234';
    _showSfStep(2);
    document.getElementById('sfCode1')?.focus();
    toast("Email service unavailable. Use demo code 1234.", true);
  } finally {
    if(btn){ btn.innerHTML=origHtml; btn.disabled=false; }
  }
}

function verifySellerForgotOtp() {
  const code = ['sfCode1','sfCode2','sfCode3','sfCode4']
    .map(id => document.getElementById(id)?.value || '').join('');
  if(code !== _sellerForgotOTP) {
    ['sfCode1','sfCode2','sfCode3','sfCode4'].forEach(id => {
      const e = document.getElementById(id); if(e){ e.classList.add('err'); e.value=''; }
    });
    document.getElementById('sfCode1')?.focus();
    toast('Invalid code. Try again.', true);
    return;
  }
  _showSfStep(3);
  document.getElementById('sf_new_pw')?.focus();
}

function checkSfStrength(el) {
  const v = el.value; const bar = document.getElementById('sfStrengthBar'); let score = 0;
  if(v.length>=8)score++; if(/[A-Z]/.test(v))score++; if(/[0-9]/.test(v))score++; if(/[^A-Za-z0-9]/.test(v))score++;
  if(bar){ bar.style.width=(score/4*100)+'%'; bar.style.background=['#e74c3c','#e67e22','#f1c40f','#2ecc71'][score-1]||'#e74c3c'; }
}

async function doSellerForgotPasswordReset() {
  const newPw  = document.getElementById('sf_new_pw')?.value || '';
  const confPw = document.getElementById('sf_confirm_pw')?.value || '';
  let ok = true;

  const pwEl  = document.getElementById('sf_new_pw');
  const pwErr = document.getElementById('sf_new_pw_err');
  if(newPw.length < 8) {
    if(pwEl)  pwEl.classList.add('err');
    if(pwErr) pwErr.classList.add('show');
    ok = false;
  } else {
    if(pwEl){ pwEl.classList.remove('err'); pwEl.classList.add('ok'); }
    if(pwErr) pwErr.classList.remove('show');
  }

  const confEl  = document.getElementById('sf_confirm_pw');
  const confErr = document.getElementById('sf_confirm_pw_err');
  if(!confPw || newPw !== confPw) {
    if(confEl)  confEl.classList.add('err');
    if(confErr) confErr.classList.add('show');
    ok = false;
  } else {
    if(confEl){ confEl.classList.remove('err'); confEl.classList.add('ok'); }
    if(confErr) confErr.classList.remove('show');
  }
  if(!ok){ toast('Please fix the errors.', true); return; }

  const resetBtn = document.querySelector('#sfStep3 .btn-pri');
  const origHtml = resetBtn ? resetBtn.innerHTML : '';
  if(resetBtn){ resetBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Updating…'; resetBtn.disabled=true; }

  try {
    const res = await fetch(`${SELLER_API}/${CS.id}`, {
      method:  'PUT',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({ password: newPw }),
    });
    if(!res.ok) throw new Error('API error');

    closeSellerForgotPwModal();
    // Clear the password form fields
    ['pwCurrent','pwNew','pwConfirm'].forEach(id => {
      const el = document.getElementById(id);
      if(el){ el.value=''; el.classList.remove('err','ok'); el.type='password'; }
    });
    const bar = document.getElementById('strengthBar'); if(bar) bar.style.width='0';
    const banner = document.getElementById('pwBanner');
    if(banner){ banner.style.display='flex'; setTimeout(()=>banner.style.display='none', 6000); }
    toast('Password reset successfully!');
    _sellerForgotOTP = '';
  } catch(err) {
    toast('Failed to update password. Please try again.', true);
    if(resetBtn){ resetBtn.innerHTML=origHtml; resetBtn.disabled=false; }
  }
}

/* ════════════════════════════════════════════════════════════
   LOGOUT
════════════════════════════════════════════════════════════ */
function openLogoutModal() {
  const initials=(CS?.name||'S').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  const av=document.getElementById('logoutAv');
  if(CS?.profileImage){av.innerHTML=`<img src="${CS.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;}
  else{av.textContent=initials;}
  setEl('logoutName', CS?.name||'Seller');
  document.getElementById('logoutModalBg').classList.add('open');
}
function closeLogoutModal() { document.getElementById('logoutModalBg').classList.remove('open'); }

function doLogout() {
  const btn=document.getElementById('logoutGoBtn');
  if(btn){btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Logging out…';btn.disabled=true;}
  setTimeout(()=>{
    if (typeof AUTH !== 'undefined') {
      AUTH.logout('index.html');
    } else {
      // Legacy fallback
      localStorage.removeItem('seller_current');
      localStorage.removeItem('isLoggedIn');
      window.location.replace('index.html');
    }
  }, 900);
}

/* ════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════ */
function validateField2(inputId, errId, condition) {
  const el=document.getElementById(inputId); const er=document.getElementById(errId);
  if(el){el.classList.toggle('err',!condition);el.classList.toggle('ok',condition);}
  if(er)er.classList.toggle('show',!condition);
  return condition;
}
function hideErr(id)     { const e=document.getElementById(id);if(e)e.classList.remove('show'); }
function setEl(id, val)  { const e=document.getElementById(id);if(e)e.textContent=val; }
function setVal(id, val) { const e=document.getElementById(id);if(e)e.value=val; }
function fmtDate(ts)     { return new Date(ts).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
function cap(s)          { return s?s.charAt(0).toUpperCase()+s.slice(1):''; }

function toast(msg, isErr=false) {
  const t=document.createElement('div');
  t.className='toast-item '+(isErr?'error':'success');
  t.innerHTML=`<i class="fas ${isErr?'fa-exclamation-circle':'fa-check-circle'}"></i>${msg}`;
  document.getElementById('toastWrap').appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(8px)';t.style.transition='all .4s';},2800);
  setTimeout(()=>t.remove(),3300);
}