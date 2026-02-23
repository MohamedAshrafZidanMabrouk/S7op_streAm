// ========== STATE ==========
const K = { S: 'seller_current', P: 'ecommerce_products', O: 'ecommerce_orders', US: 'ecommerce_users' };
let CS = null, products = [], orders = [], chartInstances = {};
const PAGE_TITLES = {
    dashboard:'Dashboard', analytics:'Analytics', products:'My Products',
    orders:'Orders', profile:'My Profile', 'personal-data':'Personal Data',
    password:'Password & Security', settings:'Settings'
};

// ========== DEMO DATA ==========
const DEMO_SELLER = {
    id: 'seller1', name: 'Sarah Johnson', email: 'sarah@mystorehub.com',
    phone: '+1 555 234 5678', business: 'TechStyle Hub',
    address: '45 Commerce Drive, San Francisco, CA 94103', country: 'USA',
    role: 'seller', joined: '2024-01-15', profileImage: null
};

const DEMO_PRODUCTS = [
    { id:'p1', sellerId:'seller1', name:'Wireless Noise-Cancelling Headphones', category:'Electronics', price:129.99, stock:42, description:'Premium audio experience with 30hr battery life.', image:null, createdAt:'2024-11-01T10:00:00Z', sales:187 },
    { id:'p2', sellerId:'seller1', name:'Minimalist Leather Wallet', category:'Clothing', price:39.99, stock:3, description:'Slim genuine leather wallet, 6-card capacity.', image:null, createdAt:'2024-11-05T09:00:00Z', sales:95 },
    { id:'p3', sellerId:'seller1', name:'Ceramic Pour-Over Coffee Set', category:'Home', price:54.99, stock:0, description:'Handcrafted ceramic dripper with carafe and filters.', image:null, createdAt:'2024-11-10T11:00:00Z', sales:62 },
    { id:'p4', sellerId:'seller1', name:'Running Performance Tee', category:'Sports', price:29.99, stock:88, description:'Moisture-wicking fabric for high-intensity workouts.', image:null, createdAt:'2024-11-15T08:00:00Z', sales:134 },
    { id:'p5', sellerId:'seller1', name:'Anatomy & Physiology Textbook', category:'Books', price:74.99, stock:17, description:'Comprehensive medical textbook, 9th edition.', image:null, createdAt:'2024-11-20T14:00:00Z', sales:48 },
    { id:'p6', sellerId:'seller1', name:'Vitamin C Serum 30ml', category:'Beauty', price:22.99, stock:5, description:'Brightening anti-oxidant serum with hyaluronic acid.', image:null, createdAt:'2024-12-01T10:00:00Z', sales:211 },
];

const STATUS_LIST = ['pending','processing','shipped','delivered','cancelled'];
const NAMES = ['Maram Ahmed','James Carter','Yuki Tanaka','Fatima Al-Rashid','Liam O\'Brien','Amara Nwosu','Diego Reyes','Priya Sharma'];

function generateOrders() {
    const base = [];
    let counter = 1;
    DEMO_PRODUCTS.forEach(p => {
        const count = Math.min(Math.floor(p.sales / 20), 6);
        for (let i = 0; i < count; i++) {
            const qty = Math.floor(Math.random() * 3) + 1;
            const daysAgo = Math.floor(Math.random() * 60);
            const status = STATUS_LIST[Math.floor(Math.random() * STATUS_LIST.length)];
            base.push({
                id: 'ORD' + String(counter++).padStart(5, '0'),
                sellerId: 'seller1',
                customer: NAMES[Math.floor(Math.random() * NAMES.length)],
                items: [{ name: p.name, quantity: qty, price: p.price }],
                total: +(p.price * qty).toFixed(2),
                status,
                createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
                productId: p.id
            });
        }
    });
    return base.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    loadSeller();
    loadData();
    setupScrollHandler();
    document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    go('dashboard');
});

function loadSeller() {
    CS = JSON.parse(localStorage.getItem(K.S));
    if (!CS) {
        CS = DEMO_SELLER;
        localStorage.setItem(K.S, JSON.stringify(CS));
    }
    renderSellerUI();
    fillPersonalData();
}

function loadData() {
    let storedP = JSON.parse(localStorage.getItem(K.P)) || [];
    products = storedP.filter(p => p.sellerId === CS.id);
    if (!products.length) {
        products = DEMO_PRODUCTS;
        const all = JSON.parse(localStorage.getItem(K.P)) || [];
        localStorage.setItem(K.P, JSON.stringify([...all, ...products]));
    }
    let storedO = JSON.parse(localStorage.getItem(K.O)) || [];
    orders = storedO.filter(o => o.sellerId === CS.id);
    if (!orders.length) {
        orders = generateOrders();
        const all = JSON.parse(localStorage.getItem(K.O)) || [];
        localStorage.setItem(K.O, JSON.stringify([...all, ...orders]));
    }
    refreshDashboard();
}

function renderSellerUI() {
    if (!CS) return;
    const name = CS.name || 'Seller';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    document.getElementById('tbName').textContent = name;
    document.getElementById('sbName').textContent = name;
    document.getElementById('welcomeName').textContent = name.split(' ')[0] || 'Seller';
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = CS.email || '--';
    document.getElementById('profileStore').textContent = CS.business || 'My Store';
    [['tbAvatar'], ['sbAvatar'], ['logoutAv'], ['profileAv', 'profileAvImg', 'profileAvIco']].forEach(([id, imgId, icoId]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (CS.profileImage) {
            if (imgId) {
                const img = document.getElementById(imgId);
                if (img) { img.src = CS.profileImage; img.style.display = 'block'; }
                const ico = document.getElementById(icoId);
                if (ico) ico.style.display = 'none';
            }
            el.innerHTML = `<img src="${CS.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:${id==='tbAvatar'||id==='sbAvatar'?'50%':'0'};">`;
        } else {
            if (imgId) { const img = document.getElementById(imgId); if(img){img.style.display='none';} }
            el.textContent = initials;
        }
    });
    document.getElementById('logoutName').textContent = name;
}

function fillPersonalData() {
    if (!CS) return;
    setEl('viewName', CS.name || '--');
    setEl('viewEmail', CS.email || '--');
    setEl('viewPhone', CS.phone || '--');
    setEl('viewBusiness', CS.business || '--');
    setEl('viewAddress', CS.address || '--');
    setEl('viewCountry', CS.country || '--');
    setEl('viewJoined', CS.joined ? fmtDate(CS.joined) : '--');
    setVal('editName', CS.name || '');
    setVal('editEmail', CS.email || '');
    setVal('editPhone', CS.phone || '');
    setVal('editBusiness', CS.business || '');
    setVal('editAddress', CS.address || '');
    setVal('editCountry', CS.country || '');
}

function setupScrollHandler() {
    window.addEventListener('scroll', () => {
        document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 0);
    }, { passive: true });
}

// ========== NAVIGATION ==========
function go(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById('section-' + name);
    if (sec) sec.classList.add('active');
    document.getElementById('pageTitleBar').textContent = PAGE_TITLES[name] || name;
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
    const match = [...document.querySelectorAll('.ni')].find(n => (n.getAttribute('onclick')||'').includes(`'${name}'`));
    if (match) match.classList.add('active');
    if (window.innerWidth < 768) closeSB();
    window.scrollTo(0,0);

    // Lazy render
    if (name === 'dashboard') refreshDashboard();
    if (name === 'analytics') renderAnalytics();
    if (name === 'products') renderProductsTable();
    if (name === 'orders') renderOrders();
}

function toggleSB() { document.getElementById('sb').classList.toggle('open'); document.getElementById('ov').classList.toggle('open'); }
function closeSB() { document.getElementById('sb').classList.remove('open'); document.getElementById('ov').classList.remove('open'); }

// ========== DASHBOARD ==========
function refreshDashboard() {
    const totalRev = orders.filter(o => o.status !== 'cancelled').reduce((s,o) => s + o.total, 0);
    const pending = orders.filter(o => o.status === 'pending').length;
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
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    if (chartInstances.revenue) chartInstances.revenue.destroy();
    const days = 7; const labels = []; const data = [];
    for (let i = days-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US',{weekday:'short'}));
        const dayOrders = orders.filter(o => {
            const od = new Date(o.createdAt); return od.toDateString() === d.toDateString() && o.status !== 'cancelled';
        });
        data.push(dayOrders.reduce((s,o) => s + o.total, 0));
    }
    chartInstances.revenue = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label:'Revenue', data, borderColor:'#7c1d7c', backgroundColor:'rgba(124,29,124,.1)', borderWidth:2.5, pointBackgroundColor:'#7c1d7c', pointRadius:4, pointHoverRadius:6, fill:true, tension:.4 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales: { x:{ grid:{ display:false }, ticks:{ font:{ size:11 }, color:'#7a6a7a' } }, y:{ grid:{ color:'rgba(0,0,0,.04)' }, ticks:{ font:{ size:11 }, color:'#7a6a7a', callback: v => '$'+v } } } }
    });
}

function renderStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    if (chartInstances.status) chartInstances.status.destroy();
    const counts = {};
    STATUS_LIST.forEach(s => counts[s] = orders.filter(o => o.status === s).length);
    chartInstances.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: STATUS_LIST.map(cap),
            datasets: [{ data: STATUS_LIST.map(s => counts[s]), backgroundColor:['#fbbf24','#60a5fa','#a78bfa','#34d399','#f87171'], borderWidth:2, borderColor:'#fff', hoverOffset:8 }]
        },
        options: { responsive:true, maintainAspectRatio:false, cutout:'68%', plugins:{ legend:{ position:'bottom', labels:{ font:{ size:11 }, padding:10, boxWidth:12 } } } }
    });
}

function renderDashTopProducts() {
    const sorted = [...products].sort((a,b) => (b.sales||0) - (a.sales||0)).slice(0,4);
    const maxSales = sorted[0]?.sales || 1;
    const el = document.getElementById('dashTopProducts');
    if (!sorted.length) { el.innerHTML = '<div class="empty-state" style="padding:16px;"><i class="fas fa-box"></i><p>No products yet.</p></div>'; return; }
    const ranks = ['gold','silver','bronze'];
    el.innerHTML = sorted.map((p,i) => `
        <div class="top-product-row">
            <div class="tpr-rank ${ranks[i]||''}">${i+1}</div>
            <div class="tpr-info">
                <div class="tpr-name">${p.name}</div>
                <div class="tpr-cat">${p.category}</div>
            </div>
            <div class="tpr-bar-wrap"><div class="tpr-bar" style="width:${Math.round((p.sales||0)/maxSales*100)}%;"></div></div>
            <div class="tpr-val">${p.sales||0}</div>
        </div>
    `).join('');
}

function renderDashRecentOrders() {
    const recent = orders.slice(0,5);
    const el = document.getElementById('dashRecentOrders');
    if (!recent.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders yet.</p></div>'; return; }
    el.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>Order ID</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
        ${recent.map(o => `<tr>
            <td style="font-weight:800;color:var(--tx);">#${o.id}</td>
            <td>${o.customer}</td>
            <td style="color:var(--mu);">${fmtDate(o.createdAt)}</td>
            <td style="font-weight:700;">$${o.total.toFixed(2)}</td>
            <td><span class="badge badge-${o.status}">${cap(o.status)}</span></td>
            <td><button class="btn-icon" onclick="openOrderDetail('${o.id}')"><i class="fas fa-eye"></i></button></td>
        </tr>`).join('')}
    </tbody></table></div>`;
}

// ========== ANALYTICS ==========
function renderAnalytics() {
    const range = parseInt(document.getElementById('analyticsRange')?.value || 30);
    const cutoff = new Date(Date.now() - range * 86400000);
    const rangeOrders = orders.filter(o => new Date(o.createdAt) >= cutoff && o.status !== 'cancelled');
    const totalRev = rangeOrders.reduce((s,o) => s + o.total, 0);
    const totalUnits = rangeOrders.reduce((s,o) => s + o.items.reduce((ss,i) => ss + i.quantity, 0), 0);
    const avg = rangeOrders.length ? totalRev / rangeOrders.length : 0;

    setEl('anRevenue', '$' + totalRev.toFixed(0));
    setEl('anOrders', rangeOrders.length.toString());
    setEl('anUnits', totalUnits.toString());
    setEl('anAvg', '$' + avg.toFixed(2));

    renderRevenueTrend(range, rangeOrders);
    renderOrdersPerDay(range, rangeOrders);
    renderCategoryChart(rangeOrders);
    renderTopProductsList();
    renderPerformanceTable();
}

function renderRevenueTrend(range, rangeOrders) {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    if (chartInstances.revTrend) chartInstances.revTrend.destroy();
    const pts = Math.min(range, 30);
    const step = Math.ceil(range / pts);
    const labels = [], data = [];
    for (let i = pts-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i * step);
        labels.push(d.toLocaleDateString('en-US', range <= 7 ? {weekday:'short'} : {month:'short',day:'numeric'}));
        const dayRevenue = rangeOrders.filter(o => {
            const od = new Date(o.createdAt); return Math.abs(od - d) < step * 86400000 / 2;
        }).reduce((s,o) => s + o.total, 0);
        data.push(+dayRevenue.toFixed(2));
    }
    chartInstances.revTrend = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label:'Revenue ($)', data, borderColor:'#7c1d7c', backgroundColor:'rgba(124,29,124,.08)', borderWidth:2.5, pointBackgroundColor:'#7c1d7c', pointRadius:3, pointHoverRadius:6, fill:true, tension:.4 }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales: { x:{ grid:{ display:false }, ticks:{ font:{size:10}, color:'#7a6a7a', maxTicksLimit:8 } }, y:{ grid:{ color:'rgba(0,0,0,.04)' }, ticks:{ font:{size:10}, color:'#7a6a7a', callback: v => '$'+v } } } }
    });
}

function renderOrdersPerDay(range, rangeOrders) {
    const ctx = document.getElementById('ordersChart');
    if (!ctx) return;
    if (chartInstances.ordersDay) chartInstances.ordersDay.destroy();
    const pts = Math.min(range, 14);
    const labels = [], data = [];
    for (let i = pts-1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', {month:'short',day:'numeric'}));
        data.push(rangeOrders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).length);
    }
    chartInstances.ordersDay = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label:'Orders', data, backgroundColor:'rgba(124,29,124,.75)', borderRadius:6, borderSkipped:false, hoverBackgroundColor:'#7c1d7c' }] },
        options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales: { x:{ grid:{ display:false }, ticks:{ font:{size:10}, color:'#7a6a7a', maxTicksLimit:7 } }, y:{ grid:{ color:'rgba(0,0,0,.04)' }, ticks:{ font:{size:10}, color:'#7a6a7a', precision:0 } } } }
    });
}

function renderCategoryChart(rangeOrders) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    if (chartInstances.category) chartInstances.category.destroy();
    const cats = {};
    rangeOrders.forEach(o => {
        const p = products.find(pr => pr.id === o.productId);
        const cat = p?.category || 'Other';
        cats[cat] = (cats[cat] || 0) + o.total;
    });
    const entries = Object.entries(cats).sort((a,b)=>b[1]-a[1]);
    const colors = ['#7c1d7c','#905690','#c084c0','#e8b4e8','#60a5fa','#34d399','#fbbf24'];
    chartInstances.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: entries.map(e=>e[0]),
            datasets: [{ data: entries.map(e=>+e[1].toFixed(2)), backgroundColor: colors.slice(0,entries.length), borderWidth:2, borderColor:'#fff', hoverOffset:8 }]
        },
        options: { responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{ position:'bottom', labels:{ font:{size:11}, padding:8, boxWidth:12 } } } }
    });
}

function renderTopProductsList() {
    const sorted = [...products].sort((a,b) => (b.sales||0) - (a.sales||0)).slice(0,5);
    const maxSales = sorted[0]?.sales || 1;
    const el = document.getElementById('topProductsList');
    if (!sorted.length) { el.innerHTML = '<div class="empty-state" style="padding:16px;"><i class="fas fa-box"></i><p>No products yet.</p></div>'; return; }
    const ranks = ['gold','silver','bronze'];
    el.innerHTML = sorted.map((p,i) => `
        <div class="top-product-row">
            <div class="tpr-rank ${ranks[i]||''}">${i+1}</div>
            <div class="tpr-info">
                <div class="tpr-name">${p.name}</div>
                <div class="tpr-cat">${p.category} · $${p.price}</div>
            </div>
            <div class="tpr-bar-wrap" style="width:80px;"><div class="tpr-bar" style="width:${Math.round((p.sales||0)/maxSales*100)}%;"></div></div>
            <div class="tpr-val">${p.sales||0} sold</div>
        </div>
    `).join('');
}

function renderPerformanceTable() {
    const tbody = document.getElementById('performanceTable');
    if (!products.length) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="padding:24px;"><i class="fas fa-database"></i><p>No data yet.</p></div></td></tr>'; return; }
    tbody.innerHTML = products.map(p => {
        const revenue = (p.sales||0) * p.price;
        const stockBadge = p.stock === 0 ? 'badge-out" style="background:var(--err-lt);color:var(--err);"' : p.stock <= 5 ? 'badge-low' : 'badge-active';
        const stockLabel = p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : 'In Stock';
        return `<tr>
            <td style="font-weight:600;color:var(--tx);">${p.name}</td>
            <td><span class="badge badge-active" style="background:var(--pri-lt);color:var(--pri);">${p.category}</span></td>
            <td style="font-weight:700;">${p.sales||0}</td>
            <td style="font-weight:700;color:var(--suc);">$${revenue.toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><span class="badge ${stockBadge}">${stockLabel}</span></td>
        </tr>`;
    }).join('');
}

// ========== PRODUCTS ==========
function renderProductsTable(list) {
    list = list || products;
    const tbody = document.getElementById('productsTableBody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="padding:36px;"><i class="fas fa-box-open"></i><p>No products found.</p></div></td></tr>'; return;
    }
    tbody.innerHTML = list.map(p => {
        const stockBadge = p.stock === 0 ? 'badge-out' : p.stock <= 5 ? 'badge-low' : '';
        const stockLabel = p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : p.stock;
        const statusBadge = p.stock > 0 ? 'badge-active' : 'badge-inactive';
        return `<tr>
            <td>
                <div class="prod-img">
                    ${p.image ? `<img src="${p.image}" alt="">` : `<i class="fas fa-image"></i>`}
                </div>
            </td>
            <td>
                <div class="prod-name">${p.name}</div>
                <div class="prod-desc">${p.description}</div>
            </td>
            <td><span class="badge" style="background:var(--pri-lt);color:var(--pri);">${p.category}</span></td>
            <td style="font-weight:700;">$${parseFloat(p.price).toFixed(2)}</td>
            <td><span class="badge ${stockBadge || ''}">${stockLabel}</span></td>
            <td><span class="badge ${statusBadge}">${p.stock > 0 ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-row">
                    <button class="btn-icon" title="Edit" onclick="openProductModal('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon del" title="Delete" onclick="confirmDelete('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function filterProducts() {
    const q = (document.getElementById('searchProducts').value || '').toLowerCase();
    const cat = document.getElementById('filterCategory').value;
    const stock = document.getElementById('filterStock').value;
    let list = products.filter(p => {
        const matchQ = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        const matchCat = !cat || p.category === cat;
        const matchStock = !stock || (stock === 'in' && p.stock > 5) || (stock === 'low' && p.stock > 0 && p.stock <= 5) || (stock === 'out' && p.stock === 0);
        return matchQ && matchCat && matchStock;
    });
    renderProductsTable(list);
}

function openProductModal(id) {
    const modal = document.getElementById('productModalBg');
    if (id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        document.getElementById('editProductId').value = id;
        setVal('pName', p.name); setVal('pCategory', p.category);
        setVal('pPrice', p.price); setVal('pStock', p.stock);
        setVal('pDesc', p.description);
        if (p.image) {
            document.getElementById('productImgData').value = p.image;
            document.getElementById('imgPreview').src = p.image;
            document.getElementById('imgPreviewWrap').style.display = 'block';
            document.getElementById('imgPlaceholder').style.display = 'none';
            document.getElementById('imgUploadArea').classList.add('has-img');
        } else { clearProductImg(); }
    } else {
        document.getElementById('productModalTitle').textContent = 'Add New Product';
        document.getElementById('editProductId').value = '';
        ['pName','pCategory','pPrice','pStock','pDesc'].forEach(id => setVal(id,''));
        clearProductImg();
        ['pNameErr','pCatErr','pPriceErr','pStockErr','pDescErr'].forEach(id => hideErr(id));
        document.querySelectorAll('#productModalBg .form-input, #productModalBg .form-select').forEach(el => el.classList.remove('err','ok'));
    }
    modal.classList.add('open');
}

function closeProductModal() { document.getElementById('productModalBg').classList.remove('open'); }

function handleProductImg(inp) {
    const file = inp.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { toast('Image must be under 5MB', true); return; }
    const r = new FileReader();
    r.onload = e => {
        document.getElementById('productImgData').value = e.target.result;
        document.getElementById('imgPreview').src = e.target.result;
        document.getElementById('imgPlaceholder').style.display = 'none';
        document.getElementById('imgPreviewWrap').style.display = 'block';
        document.getElementById('imgUploadArea').classList.add('has-img');
    };
    r.readAsDataURL(file);
}

function removeProductImg(e) {
    e.stopPropagation();
    clearProductImg();
}

function clearProductImg() {
    setVal('productImgData','');
    document.getElementById('imgPlaceholder').style.display = 'flex';
    document.getElementById('imgPreviewWrap').style.display = 'none';
    document.getElementById('imgUploadArea').classList.remove('has-img');
    document.getElementById('productImgInput').value = '';
}

function saveProduct() {
    let ok = true;
    const name = document.getElementById('pName').value.trim();
    const cat = document.getElementById('pCategory').value;
    const price = parseFloat(document.getElementById('pPrice').value);
    const stock = parseInt(document.getElementById('pStock').value);
    const desc = document.getElementById('pDesc').value.trim();
    const img = document.getElementById('productImgData').value;
    const editId = document.getElementById('editProductId').value;

    ok = validateField2('pName','pNameErr', name.length >= 2) && ok;
    ok = validateField2('pCategory','pCatErr', cat !== '') && ok;
    ok = validateField2('pPrice','pPriceErr', !isNaN(price) && price >= 0) && ok;
    ok = validateField2('pStock','pStockErr', !isNaN(stock) && stock >= 0) && ok;
    ok = validateField2('pDesc','pDescErr', desc.length >= 5) && ok;
    if (!ok) { toast('Please fill all required fields.', true); return; }

    if (editId) {
        const idx = products.findIndex(p => p.id === editId);
        if (idx >= 0) {
            products[idx] = { ...products[idx], name, category:cat, price, stock, description:desc, image:img||products[idx].image };
            toast('Product updated!');
        }
    } else {
        const newP = { id:'p'+Date.now(), sellerId:CS.id, name, category:cat, price, stock, description:desc, image:img||null, createdAt:new Date().toISOString(), sales:0 };
        products.unshift(newP);
        toast('Product added!');
    }
    saveProducts();
    renderProductsTable();
    refreshDashboard();
    closeProductModal();
}

function confirmDelete(id) {
    document.getElementById('confirmSub').textContent = `Are you sure you want to delete "${products.find(p=>p.id===id)?.name}"? This cannot be undone.`;
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

function saveProducts() {
    const all = JSON.parse(localStorage.getItem(K.P)) || [];
    const others = all.filter(p => p.sellerId !== CS.id);
    localStorage.setItem(K.P, JSON.stringify([...others, ...products]));
}

// ========== ORDERS ==========
function renderOrders(list) {
    list = list || orders;
    const el = document.getElementById('ordersContainer');
    if (!list.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders found.</p></div>'; return; }
    el.innerHTML = list.map(o => `
        <div class="order-card">
            <div class="order-head">
                <div>
                    <div class="order-id">#${o.id}</div>
                    <div class="order-date"><i class="fas fa-calendar-alt" style="font-size:.6rem;margin-right:3px;"></i>${fmtDate(o.createdAt)}</div>
                </div>
                <span class="badge badge-${o.status}">${cap(o.status)}</span>
            </div>
            <div class="order-customer"><i class="fas fa-user" style="font-size:.75rem;color:var(--mu2);"></i>${o.customer}</div>
            <div class="order-items-txt">${o.items.map(i=>i.name+' × '+i.quantity).join(' · ')}</div>
            <div class="order-foot">
                <div class="order-total">$${o.total.toFixed(2)}</div>
                <div class="order-actions">
                    <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
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
    const q = (document.getElementById('searchOrders').value || '').toLowerCase();
    let list = orders.filter(o => {
        const matchStatus = !status || o.status === status;
        const matchQ = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q);
        return matchStatus && matchQ;
    });
    renderOrders(list);
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

function saveOrders() {
    const all = JSON.parse(localStorage.getItem(K.O)) || [];
    const others = all.filter(o => o.sellerId !== CS.id);
    localStorage.setItem(K.O, JSON.stringify([...others, ...orders]));
}

function openOrderDetail(id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
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

// ========== PROFILE ==========
function handleAvatar(inp) {
    const file = inp.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { toast('Image must be under 5MB', true); return; }
    const r = new FileReader();
    r.onload = e => {
        CS.profileImage = e.target.result;
        saveSeller();
        renderSellerUI();
        toast('Profile photo updated!');
        inp.value = '';
    };
    r.readAsDataURL(file);
}

function toggleEdit(editing) {
    const view = document.getElementById('pdView');
    const edit = document.getElementById('pdEdit');
    if (!view || !edit) return;

    if (editing) {
        view.style.display = 'none';
        edit.style.display = 'block';
        // Pre-fill edit form from view
        const get = (id) => document.getElementById(id);
        get('editName').value    = (get('pdViewName2')  ?.textContent || '').replace('--','');
        get('editEmail').value   = (get('pdViewEmail2') ?.textContent || '').replace('--','');
        const phone = get('pdViewPhone')?.textContent;
        get('editPhone').value   = (phone === 'Not provided' || phone === '--') ? '' : phone;
        const biz = get('pdViewBusiness')?.textContent;
        get('editBusiness').value = (biz === 'Not provided') ? '' : biz;
        const country = get('pdViewCountry')?.textContent;
        get('editCountry').value = (country === 'Not provided') ? '' : country;
        const addr = get('pdViewAddress')?.textContent;
        get('editAddress').value = (addr === 'Not provided') ? '' : addr;
    } else {
        edit.style.display = 'none';
        view.style.display = 'block';
    }
}

function savePersonalData(e) {
    e.preventDefault();
    const name = document.getElementById('editName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    let ok = true;
    ok = validateField2('editName','editNameErr', name.length >= 2) && ok;
    ok = validateField2('editEmail','editEmailErr', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) && ok;
    if (!ok) return;
    CS.name = name; CS.email = email;
    CS.phone = document.getElementById('editPhone').value.trim();
    CS.business = document.getElementById('editBusiness').value.trim();
    CS.address = document.getElementById('editAddress').value.trim();
    CS.country = document.getElementById('editCountry').value;
    saveSeller();
    fillPersonalData();
    renderSellerUI();
    toggleEdit(false);
    toast('Profile updated!');
}

function saveSeller() {
    localStorage.setItem(K.S, JSON.stringify(CS));
    const users = JSON.parse(localStorage.getItem(K.US)) || [];
    const updated = users.map(u => u.id === CS.id ? { ...u, ...CS } : u);
    if (!updated.find(u => u.id === CS.id)) updated.push(CS);
    localStorage.setItem(K.US, JSON.stringify(updated));
}

// ========== PASSWORD ==========
function togglePw(id, btn) {
    const el = document.getElementById(id);
    const isPass = el.type === 'password';
    el.type = isPass ? 'text' : 'password';
    btn.querySelector('i').className = isPass ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function checkStrength(el) {
    const v = el.value; let score = 0;
    if (v.length >= 8) score++; if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++; if (/[^A-Za-z0-9]/.test(v)) score++;
    const bar = document.getElementById('strengthBar');
    bar.style.width = (score/4*100)+'%';
    bar.style.background = ['#e74c3c','#e67e22','#f1c40f','#2ecc71'][score-1] || '#e74c3c';
}

function submitPassword(e) {
    e.preventDefault();
    const banner = document.getElementById('pwBanner');
    banner.style.display = 'none';
    let ok = true;
    ok = validateField2('pwCurrent','pwCurrentErr', document.getElementById('pwCurrent').value.trim().length >= 1) && ok;
    ok = validateField2('pwNew','pwNewErr', document.getElementById('pwNew').value.length >= 8) && ok;
    const newP = document.getElementById('pwNew').value;
    const confP = document.getElementById('pwConfirm').value;
    const confEl = document.getElementById('pwConfirm');
    const confErr = document.getElementById('pwConfirmErr');
    if (newP !== confP) { confEl.classList.add('err'); confErr.classList.add('show'); ok = false; }
    else { confEl.classList.remove('err'); if(newP) confEl.classList.add('ok'); confErr.classList.remove('show'); }
    if (!ok) { toast('Please fix the errors.', true); return; }
    const btn = e.submitter;
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...'; btn.disabled = true; }
    setTimeout(() => {
        if (btn) { btn.innerHTML = '<i class="fas fa-key"></i>Update Password'; btn.disabled = false; }
        ['pwCurrent','pwNew','pwConfirm'].forEach(id => { setVal(id,''); const el=document.getElementById(id); if(el){el.classList.remove('err','ok');el.type='password';} });
        document.querySelectorAll('#pwForm .fa-eye').forEach(i=>i.className='fas fa-eye-slash');
        document.getElementById('strengthBar').style.width='0';
        banner.style.display='flex'; banner.scrollIntoView({behavior:'smooth',block:'nearest'});
        setTimeout(()=>banner.style.display='none',6000);
        toast('Password updated!');
    }, 800);
}

// ========== LOGOUT ==========
function openLogoutModal() {
    const initials = (CS?.name||'S').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    const av = document.getElementById('logoutAv');
    if (CS?.profileImage) {
        av.innerHTML = `<img src="${CS.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else { av.textContent = initials; }
    document.getElementById('logoutName').textContent = CS?.name || 'Seller';
    document.getElementById('logoutModalBg').classList.add('open');
}
function closeLogoutModal() { document.getElementById('logoutModalBg').classList.remove('open'); }
function doLogout() {
    const btn = document.getElementById('logoutGoBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out…'; btn.disabled = true;
    setTimeout(() => { localStorage.removeItem(K.S); location.href = 'index.html'; }, 900);
}

// ========== UTILS ==========
function validateField2(inputId, errId, condition) {
    const el = document.getElementById(inputId);
    const er = document.getElementById(errId);
    if (el) { el.classList.toggle('err', !condition); el.classList.toggle('ok', condition); }
    if (er) er.classList.toggle('show', !condition);
    return condition;
}
function hideErr(id) { const e = document.getElementById(id); if(e) e.classList.remove('show'); }
function setEl(id, val) { const e = document.getElementById(id); if(e) e.textContent = val; }
function setVal(id, val) { const e = document.getElementById(id); if(e) e.value = val; }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
function cap(s) { return s ? s.charAt(0).toUpperCase()+s.slice(1) : ''; }

function toast(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'toast-item ' + (isErr ? 'error' : 'success');
    t.innerHTML = `<i class="fas ${isErr?'fa-exclamation-circle':'fa-check-circle'}"></i>${msg}`;
    document.getElementById('toastWrap').appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='all .4s'; },2800);
    setTimeout(()=>t.remove(),3300);
}
