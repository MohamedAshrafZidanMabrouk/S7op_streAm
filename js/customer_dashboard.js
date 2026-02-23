// ===================== STATE =====================
const K = { U:'ecommerce_current_user', O:'ecommerce_orders', C:'ecommerce_cart', US:'ecommerce_users' };
let CU = null, orders = [], pendingData = null, selectedPayType = 'paypal', saveCard = true;
const PAGE_TITLES = {
    dashboard:'Dashboard', profile:'Personal Data', payment:'Payment Account',
    orders:'My Orders', address:'Manage Address', password:'Password Manager',
    notifications:'Notifications', help:'Help Center', settings:'Settings'
};

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    loadOrders();
    updateCartCount();
    setupCodeBoxes();
    loadSavedAddresses();
    loadNotifications();
    loadSavedMethods();

    const now = new Date();
    document.getElementById('dashDate').textContent = now.toLocaleDateString('en-US', {
        weekday:'long', year:'numeric', month:'long', day:'numeric'
    });

    window.addEventListener('scroll', () => {
        document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 0);
    }, { passive: true });

    // Start on dashboard
    go('dashboard');
});

// ===================== USER / AUTH =====================
function loadCurrentUser() {
    // Demo user if not logged in
    CU = JSON.parse(localStorage.getItem(K.U));
    if (!CU) {
        CU = {
            id: 'demo1', name: 'Maram Ahmed', email: 'maramahmed@gmail.com',
            phone: '08061237890', role: 'customer',
            gender: 'female', birthday: '2001-04-14', country: 'EG',
            address: '123 Main Street, Spring Garden', zip: '09021',
            payments: [], notifications: [], addresses: [
                { id: 'a1', name: 'Bessie Cooper', street: '2464 Royal Ln. Mesa, New Jersey 45463' },
                { id: 'a2', name: 'Bessie Cooper', street: '6391 Elgin St. Celina, Delaware 10299' }
            ]
        };
        localStorage.setItem(K.U, JSON.stringify(CU));
        const users = JSON.parse(localStorage.getItem(K.US)) || [];
        if (!users.find(u => u.id === CU.id)) { users.push(CU); localStorage.setItem(K.US, JSON.stringify(users)); }
    }
    if (!CU.payments) CU.payments = [];
    if (!CU.addresses) CU.addresses = [
        { id: 'a1', name: 'Bessie Cooper', street: '2464 Royal Ln. Mesa, New Jersey 45463' },
        { id: 'a2', name: 'Bessie Cooper', street: '6391 Elgin St. Celina, Delaware 10299' }
    ];

    renderUserUI();
    fillPersonalDataForm();
}

function renderUserUI() {
    if (!CU) return;
    const name = CU.name || 'User';
    const fn = name.split(' ')[0];
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    document.getElementById('tbName').textContent = name;
    document.getElementById('sbName').textContent = name;
    document.getElementById('welcomeName').textContent = fn || 'there';
    document.getElementById('profileDisplayName').textContent = name;

    [['tbAvatar', 'tbAvatarImg'], ['sbAvatar', null]].forEach(([id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (CU.profileImage) {
            el.innerHTML = `<img src="${CU.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            el.textContent = initials;
        }
    });

    // Profile page avatar
    const paImg = document.getElementById('profileAvatarImg');
    const paIco = document.getElementById('profileAvatarIco');
    if (CU.profileImage) {
        paImg.src = CU.profileImage; paImg.style.display = 'block'; paIco.style.display = 'none';
    } else {
        paImg.style.display = 'none'; paIco.style.display = '';
    }
}

function fillPersonalDataForm() {
    if (!CU) return;
    const parts = (CU.name || '').split(' ');
    setVal('pd_fname', parts[0] || '');
    setVal('pd_lname', parts.slice(1).join(' ') || '');
    setVal('pd_email', CU.email || '');
    setVal('pd_cemail', CU.email || '');
    setVal('pd_phone', CU.phone || '');
    setVal('pd_gender', CU.gender || '');
    setVal('pd_birthday', CU.birthday || '');
    setVal('pd_country', CU.country || '');
    setVal('pd_address', CU.address || '');
    setVal('pd_zip', CU.zip || '');
}

function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

function logout() {
    // Populate logout modal with current user info
    const initials = (CU?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const logoutAvatar = document.getElementById('logoutAvatar');
    if (CU?.profileImage) {
        logoutAvatar.innerHTML = `<img src="${CU.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    } else {
        logoutAvatar.textContent = initials;
    }
    document.getElementById('logoutName').textContent = CU?.name || 'User';
    document.getElementById('logoutModal').classList.add('open');
}
function closeLogoutModal() {
    document.getElementById('logoutModal').classList.remove('open');
}
function doLogout() {
    const btn = document.querySelector('.btn-logout-confirm');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp; Logging out...';
    btn.disabled = true;
    setTimeout(() => {
        localStorage.removeItem(K.U);
        location.href = 'index.html';
    }, 900);
}

function handleImg(inp) {
    const file = inp.files[0]; if (!file) return;
    if (!file.type.match(/image\/(jpeg|png|webp|gif)/)) {
        toast('Only JPG, PNG, WEBP or GIF images are allowed.', true); return;
    }
    if (file.size > 5 * 1024 * 1024) {
        toast('Image must be smaller than 5MB.', true); return;
    }
    const r = new FileReader();
    r.onload = e => {
        const src = e.target.result;
        // Update all avatar instances
        const paImg = document.getElementById('profileAvatarImg');
        const paIco = document.getElementById('profileAvatarIco');
        if (paImg) { paImg.src = src; paImg.style.display = 'block'; }
        if (paIco) paIco.style.display = 'none';
        // Update topbar avatar
        const tbA = document.getElementById('tbAvatar');
        if (tbA) tbA.innerHTML = `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        // Update sidebar avatar
        const sbA = document.getElementById('sbAvatar');
        if (sbA) sbA.innerHTML = `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        // Save immediately to user
        CU.profileImage = src;
        saveUser();
        toast('Profile photo updated!');
        inp.value = ''; // reset so same file can be re-uploaded
    };
    r.onerror = () => toast('Failed to read image. Please try again.', true);
    r.readAsDataURL(file);
}

// ===================== NAVIGATION =====================
function go(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = document.getElementById('section-' + name);
    if (sec) sec.classList.add('active');
    document.getElementById('pageTitleBar').textContent = PAGE_TITLES[name] || name;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const match = [...document.querySelectorAll('.nav-item')].find(n =>
        (n.getAttribute('onclick') || '').includes(`'${name}'`)
    );
    if (match) match.classList.add('active');
    if (window.innerWidth < 768) closeSB();
    if (name === 'payment') loadSavedMethods();
    if (name === 'address') loadSavedAddresses();
    if (name === 'notifications') loadNotifications();
    window.scrollTo(0, 0);
}

function toggleSB() {
    document.getElementById('sb').classList.toggle('open');
    document.getElementById('ov').classList.toggle('open');
}
function closeSB() {
    document.getElementById('sb').classList.remove('open');
    document.getElementById('ov').classList.remove('open');
}

// ===================== VALIDATION HELPERS =====================
function validateField(inputId, errId, testFn) {
    const el = document.getElementById(inputId);
    const er = document.getElementById(errId);
    const ok = el ? testFn(el.value) : false;
    if (el) { el.classList.toggle('err', !ok); el.classList.toggle('ok', ok); }
    if (er) er.classList.toggle('show', !ok);
    return ok;
}

function validateNameField(el, errId) {
    const ok = el.value.trim().length >= 2 && !/\d/.test(el.value.trim());
    el.classList.toggle('err', !ok); el.classList.toggle('ok', ok);
    const er = document.getElementById(errId);
    if (er) er.classList.toggle('show', !ok);
    return ok;
}

function validateEmailField(el, errId) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
    el.classList.toggle('err', !ok); el.classList.toggle('ok', ok);
    const er = document.getElementById(errId);
    if (er) er.classList.toggle('show', !ok);
    return ok;
}

function validatePhoneField(el, errId) {
    const ok = el.value.replace(/\D/g, '').length === 11;
    el.classList.toggle('err', !ok); el.classList.toggle('ok', ok);
    const er = document.getElementById(errId);
    if (er) er.classList.toggle('show', !ok);
    return ok;
}

function validateBirthdayField(el, errId) {
    const d = new Date(el.value);
    const age = (new Date() - d) / (365.25 * 24 * 60 * 60 * 1000);
    const ok = !isNaN(d) && age >= 1 && age <= 100;
    el.classList.toggle('err', !ok); el.classList.toggle('ok', ok);
    const er = document.getElementById(errId);
    if (er) er.classList.toggle('show', !ok);
    return ok;
}

// ===================== PERSONAL DATA =====================
function submitPersonalData(e) {
    e.preventDefault();
    let ok = true;
    ok = validateField('pd_fname', 'pd_fname_err', v => v.trim().length >= 2 && !/\d/.test(v.trim())) && ok;
    ok = validateField('pd_lname', 'pd_lname_err', v => v.trim().length >= 2 && !/\d/.test(v.trim())) && ok;
    ok = validateField('pd_email', 'pd_email_err', v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) && ok;
    ok = validateField('pd_phone', 'pd_phone_err', v => v.replace(/\D/g, '').length === 11) && ok;

    const bd = document.getElementById('pd_birthday').value;
    if (bd) ok = validateField('pd_birthday', 'pd_birthday_err', v => {
        const d = new Date(v); const age = (new Date() - d) / (365.25*24*60*60*1000);
        return !isNaN(d) && age >= 1 && age <= 100;
    }) && ok;

    ok = validateField('pd_country', 'pd_country_err', v => v !== '') && ok;
    ok = validateField('pd_address', 'pd_address_err', v => v.trim().length >= 10) && ok;
    ok = validateField('pd_zip', 'pd_zip_err', v => v.trim().length >= 3) && ok;

    const email = document.getElementById('pd_email').value.trim();
    const cemail = document.getElementById('pd_cemail').value.trim();
    const cemailEl = document.getElementById('pd_cemail');
    const cemailErr = document.getElementById('pd_cemail_err');
    if (email !== cemail) {
        cemailEl.classList.add('err'); if (cemailErr) cemailErr.classList.add('show'); ok = false;
    } else {
        cemailEl.classList.remove('err'); cemailEl.classList.add('ok'); if (cemailErr) cemailErr.classList.remove('show');
    }

    if (!ok) { toast('Please fix the errors above.', true); return; }

    const users = JSON.parse(localStorage.getItem(K.US)) || [];
    if (users.some(u => u.email === email && u.id !== CU.id)) {
        validateField('pd_email', 'pd_email_err', () => false);
        toast('Email is already in use by another account.', true); return;
    }

    pendingData = {
        name: document.getElementById('pd_fname').value.trim() + ' ' + document.getElementById('pd_lname').value.trim(),
        email,
        phone: document.getElementById('pd_phone').value.trim(),
        gender: document.getElementById('pd_gender').value,
        birthday: document.getElementById('pd_birthday').value,
        country: document.getElementById('pd_country').value,
        address: document.getElementById('pd_address').value.trim(),
        zip: document.getElementById('pd_zip').value.trim(),
        profileImage: CU.profileImage
    };
    openModal();
}

function resetPersonalData() { fillPersonalDataForm(); toast('Changes discarded.'); }

// ===================== PAYMENT =====================
function selectPayMethod(el, type) {
    document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedPayType = type;
    document.getElementById('paypalForm').style.display = type === 'paypal' ? 'block' : 'none';
    document.getElementById('gpayForm').style.display = type === 'gpay' ? 'block' : 'none';
    document.getElementById('cardForm').style.display = type === 'card' ? 'block' : 'none';
}

function formatCardNumber(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 16);
    el.value = v.replace(/(.{4})/g, '$1 ').trim();
    document.getElementById('cpNumber').textContent = v.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(el) {
    let v = el.value.replace(/\D/g, '');
    if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
    el.value = v;
    document.getElementById('cpExpiry').textContent = v || 'MM/YY';
}

function toggleSaveCard() {
    saveCard = !saveCard;
    const el = document.getElementById('saveCardChk');
    el.classList.toggle('unchecked', !saveCard);
    el.innerHTML = saveCard ? '<i class="fas fa-check"></i>' : '';
}

function confirmPaymentMethod() {
    let ok = true;
    if (selectedPayType === 'paypal') {
        ok = validateField('pp_email', 'pp_email_err', v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()));
    } else if (selectedPayType === 'gpay') {
        ok = validateField('gp_phone', 'gp_phone_err', v => v.replace(/\D/g, '').length >= 8);
    } else if (selectedPayType === 'card') {
        ok = validateField('card_name', 'card_name_err', v => v.trim().length >= 2) && ok;
        ok = validateField('card_number', 'card_number_err', v => v.replace(/\s/g, '').length === 16) && ok;
        ok = validateField('card_expiry', 'card_expiry_err', v => /^\d{2}\/\d{2}$/.test(v)) && ok;
        ok = validateField('card_cvv', 'card_cvv_err', v => /^\d{3}$/.test(v)) && ok;
        if (!ok) { showBubble('Something looks wrong 😟', true); return; }
        showBubble('All set! 😄', false);
    } else if (selectedPayType === 'cash') {
        // cash ok
    }

    if (!ok) return;

    let payment = { type: selectedPayType, id: Date.now() };
    if (selectedPayType === 'paypal') payment.details = document.getElementById('pp_email').value.trim();
    if (selectedPayType === 'gpay') payment.details = document.getElementById('gp_phone').value.trim();
    if (selectedPayType === 'card') {
        payment.name = document.getElementById('card_name').value.trim();
        payment.last4 = document.getElementById('card_number').value.replace(/\s/g, '').slice(-4);
        payment.expiry = document.getElementById('card_expiry').value;
    }
    if (selectedPayType === 'cash') payment.details = 'No details required';

    if (saveCard || selectedPayType !== 'card') {
        if (!CU.payments) CU.payments = [];
        CU.payments.push(payment);
        saveUser();
        loadSavedMethods();
    }

    toast('Payment method saved!');
    ['pp_email','gp_phone','card_name','card_number','card_expiry','card_cvv'].forEach(id => {
        const el = document.getElementById(id); if (el) { el.value = ''; el.classList.remove('err','ok'); }
    });
}

function savePaymentDetails(type) { confirmPaymentMethod(); }

function loadSavedMethods() {
    if (!CU || !CU.payments || !CU.payments.length) {
        document.getElementById('savedMethodsSection').style.display = 'none'; return;
    }
    document.getElementById('savedMethodsSection').style.display = 'block';
    const list = document.getElementById('savedMethodsList');
    list.innerHTML = '';
    CU.payments.forEach((p, i) => {
        let icon = '', mainText = '', subText = '';
        if (p.type === 'paypal') { icon = '<i class="fab fa-paypal" style="color:#003087;"></i>'; mainText = 'PayPal'; subText = p.details; }
        if (p.type === 'gpay') { icon = '<i class="fab fa-google" style="color:#4285F4;"></i>'; mainText = 'Google Pay'; subText = p.details; }
        if (p.type === 'cash') { icon = '<i class="fas fa-money-bill-wave" style="color:var(--suc);"></i>'; mainText = 'Cash on Delivery'; subText = 'Pay at door'; }
        if (p.type === 'card') { icon = '<i class="fas fa-credit-card" style="color:var(--pri);"></i>'; mainText = `Card •••• ${p.last4}`; subText = `${p.name} · Expires ${p.expiry}`; }
        const div = document.createElement('div');
        div.className = 'saved-method';
        div.innerHTML = `<div class="sm-info"><div class="sm-icon">${icon}</div><div><div class="sm-details">${mainText}</div><div class="sm-sub">${subText || ''}</div></div></div><button class="btn-secondary danger" onclick="removePayment(${i})" style="font-size:0.75rem;padding:6px 12px;"><i class="fas fa-trash"></i>Remove</button>`;
        list.appendChild(div);
    });
}

function removePayment(i) {
    if (confirm('Remove this payment method?')) {
        CU.payments.splice(i, 1);
        saveUser(); loadSavedMethods();
        toast('Payment method removed.');
    }
}

// CVV Cartoon
function showCvvCartoon() { document.getElementById('cartoonWrap').classList.add('visible'); setCvvFace('👀'); }
function hideCvvCartoon() {
    const v = document.getElementById('card_cvv').value;
    setCvvFace(/^\d{3}$/.test(v) ? '😌' : '😟', !/^\d{3}$/.test(v));
    setTimeout(() => document.getElementById('cartoonWrap').classList.remove('visible'), 2500);
}
function setCvvFace(emoji, err = false) { document.getElementById('cartoonFace').textContent = emoji; }
function showBubble(msg, isErr = false) {
    const b = document.getElementById('cartoonBubble');
    b.textContent = msg; b.className = 'cartoon-bubble show' + (isErr ? ' err' : '');
    document.getElementById('cartoonWrap').classList.add('visible');
    setTimeout(() => { b.className = 'cartoon-bubble'; }, 3000);
}

// ===================== ORDERS =====================
function loadOrders() {
    const all = JSON.parse(localStorage.getItem(K.O)) || [];
    orders = CU ? all.filter(o => o.userId === CU.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];

    // Demo orders if empty
    if (!orders.length) {
        orders = [
            { id: 'ord_demo1', userId: CU?.id, status: 'delivered', total: 240, createdAt: new Date(Date.now()-7*86400000).toISOString(), items: [{name:'Sofa Set',quantity:1},{name:'Coffee Table',quantity:2}] },
            { id: 'ord_demo2', userId: CU?.id, status: 'shipped', total: 89.99, createdAt: new Date(Date.now()-2*86400000).toISOString(), items: [{name:'Cushions',quantity:4}] },
            { id: 'ord_demo3', userId: CU?.id, status: 'pending', total: 450, createdAt: new Date().toISOString(), items: [{name:'Dining Table',quantity:1},{name:'Chairs',quantity:6},{name:'Table Cloth',quantity:2}] }
        ];
    }

    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statPending').textContent = orders.filter(o => o.status === 'pending').length;
    document.getElementById('statSpent').textContent = '$' + orders.reduce((s, o) => s + o.total, 0).toFixed(2);
    renderOrders(orders, 'ordersList');
    renderRecentOrders(orders.slice(0, 5));
}

function renderOrders(list, containerId) {
    const el = document.getElementById(containerId);
    if (!list.length) {
        el.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><p>No orders found.<br><a href="#">Start shopping</a></p></div>`;
        return;
    }
    const sm = { pending:'status-pending', processing:'status-processing', shipped:'status-shipped', delivered:'status-delivered' };
    el.innerHTML = list.map(o => `
        <div class="order-card">
            <div class="order-top">
                <div>
                    <div class="order-id">#${o.id.slice(-8).toUpperCase()}</div>
                    <div class="order-date"><i class="fas fa-calendar-alt" style="font-size:.62rem;opacity:.6;margin-right:4px;"></i>${fmtDate(o.createdAt)}</div>
                </div>
                <span class="status-badge ${sm[o.status] || 'status-pending'}">${cap(o.status)}</span>
            </div>
            <div class="order-items">${o.items.slice(0, 3).map(i => i.name + ' × ' + i.quantity).join(' · ')}${o.items.length > 3 ? ' · +' + (o.items.length - 3) + ' more' : ''}</div>
            <div class="order-footer">
                <div class="order-total">$${o.total.toFixed(2)}</div>
                <button class="btn-view" onclick="viewOrder('${o.id}')"><i class="fas fa-eye" style="margin-right:4px;font-size:.7rem;"></i>View</button>
            </div>
        </div>
    `).join('');
}

function renderRecentOrders(list) {
    const el = document.getElementById('recentOrdersList');
    if (!list.length) return;
    const sm = { pending:'status-pending', processing:'status-processing', shipped:'status-shipped', delivered:'status-delivered' };
    el.innerHTML = `
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Order ID</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
                <tbody>${list.map(o => `
                    <tr>
                        <td style="font-weight:800;color:var(--tx);">#${o.id.slice(-8).toUpperCase()}</td>
                        <td style="color:var(--mu);">${fmtDate(o.createdAt)}</td>
                        <td style="color:var(--mu);">${o.items.length} item(s)</td>
                        <td style="font-weight:700;">$${o.total.toFixed(2)}</td>
                        <td><span class="status-badge ${sm[o.status] || 'status-pending'}">${cap(o.status)}</span></td>
                        <td><button class="btn-view" onclick="viewOrder('${o.id}')">View</button></td>
                    </tr>
                `).join('')}</tbody>
            </table>
        </div>
    `;
}

function filterOrders(btn, status) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderOrders(status === 'all' ? orders : orders.filter(o => o.status === status), 'ordersList');
}

function viewOrder(id) {
    const o = orders.find(x => x.id === id);
    if (!o) return;
    const sm = { pending:'status-pending', processing:'status-processing', shipped:'status-shipped', delivered:'status-delivered' };
    const body = document.getElementById('orderModalBody');
    body.innerHTML = `
        <div class="order-info-row">
            <span class="order-info-label">Order ID</span>
            <span class="order-info-val" style="font-family:monospace;">#${o.id.slice(-8).toUpperCase()}</span>
        </div>
        <div class="order-info-row">
            <span class="order-info-label">Date Placed</span>
            <span class="order-info-val">${fmtDate(o.createdAt)}</span>
        </div>
        <div class="order-info-row">
            <span class="order-info-label">Status</span>
            <span class="status-badge ${sm[o.status] || 'status-pending'}">${cap(o.status)}</span>
        </div>
        <div class="order-info-row">
            <span class="order-info-label">Payment</span>
            <span class="order-info-val">Credit Card</span>
        </div>
        <div class="order-items-title">Items in this order</div>
        ${o.items.map(item => `
            <div class="order-item-row">
                <div class="order-item-dot"></div>
                <span class="order-item-name">${item.name}</span>
                <span class="order-item-qty">× ${item.quantity}</span>
            </div>
        `).join('')}
        <div class="order-total-row">
            <span>Order Total</span>
            <span style="color:var(--pri);">$${o.total.toFixed(2)}</span>
        </div>
    `;
    document.getElementById('orderModal').classList.add('open');
}
function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('open');
}

// ===================== ADDRESS =====================
function loadSavedAddresses() {
    if (!CU || !CU.addresses) { if (CU) CU.addresses = []; return; }
    const el = document.getElementById('savedAddressesList');
    el.innerHTML = '';
    CU.addresses.forEach((a, i) => {
        const div = document.createElement('div');
        div.className = 'address-card';
        div.innerHTML = `
            <div>
                <div class="addr-name">${a.name}</div>
                <div class="addr-text">${a.street}</div>
            </div>
            <div class="addr-actions">
                <button class="btn-edit" onclick="editAddress(${i})">Edit</button>
                <button class="btn-del" onclick="deleteAddress(${i})">Delete</button>
            </div>
        `;
        el.appendChild(div);
    });
}

function submitAddress(e) {
    e.preventDefault();
    let ok = true;
    ok = validateField('addr_fname', 'addr_fname_err', v => v.trim().length >= 2 && !/\d/.test(v.trim())) && ok;
    ok = validateField('addr_lname', 'addr_lname_err', v => v.trim().length >= 2 && !/\d/.test(v.trim())) && ok;
    ok = validateField('addr_country', 'addr_country_err', v => v !== '') && ok;
    ok = validateField('addr_street', 'addr_street_err', v => v.trim().length >= 10) && ok;
    ok = validateField('addr_city', 'addr_city_err', v => v.trim().length >= 2) && ok;
    ok = validateField('addr_zip', 'addr_zip_err', v => v.trim().length >= 3) && ok;
    if (!ok) { toast('Please fix the errors above.', true); return; }

    const addr = {
        id: Date.now().toString(),
        name: document.getElementById('addr_fname').value.trim() + ' ' + document.getElementById('addr_lname').value.trim(),
        company: document.getElementById('addr_company').value.trim(),
        street: document.getElementById('addr_street').value.trim(),
        city: document.getElementById('addr_city').value.trim(),
        state: document.getElementById('addr_state').value.trim(),
        country: document.getElementById('addr_country').value,
        zip: document.getElementById('addr_zip').value.trim()
    };
    if (!CU.addresses) CU.addresses = [];
    CU.addresses.push(addr);
    saveUser(); loadSavedAddresses(); resetAddressForm();
    toast('Address added successfully!');
}

function resetAddressForm() {
    ['addr_fname','addr_lname','addr_company','addr_street','addr_city','addr_state','addr_zip'].forEach(id => setVal(id, ''));
    setVal('addr_country', '');
    document.querySelectorAll('#addressForm .form-input, #addressForm .form-select').forEach(el => el.classList.remove('err','ok'));
    document.querySelectorAll('#addressForm .err-msg').forEach(el => el.classList.remove('show'));
}

function editAddress(i) {
    const a = CU.addresses[i];
    const parts = a.name.split(' ');
    setVal('addr_fname', parts[0] || '');
    setVal('addr_lname', parts.slice(1).join(' ') || '');
    setVal('addr_company', a.company || '');
    setVal('addr_street', a.street || '');
    setVal('addr_city', a.city || '');
    setVal('addr_state', a.state || '');
    setVal('addr_country', a.country || '');
    setVal('addr_zip', a.zip || '');
    CU.addresses.splice(i, 1);
    saveUser(); loadSavedAddresses();
    document.getElementById('addressForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Edit the address below and save.');
}

function deleteAddress(i) {
    if (confirm('Delete this address?')) {
        CU.addresses.splice(i, 1);
        saveUser(); loadSavedAddresses();
        toast('Address removed.');
    }
}

// ===================== PASSWORD =====================
function togglePasswordView(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const isPass = el.type === 'password';
    el.type = isPass ? 'text' : 'password';
    btn.querySelector('i').className = isPass ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function checkPasswordStrength(el) {
    const v = el.value;
    const bar = document.getElementById('strengthBar');
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const pct = (score / 4) * 100;
    const colors = ['#e74c3c','#e67e22','#f1c40f','#2ecc71'];
    bar.style.width = pct + '%';
    bar.style.background = colors[score - 1] || '#e74c3c';
}

function submitPassword(e) {
    e.preventDefault();
    // Hide success banner on new attempt
    document.getElementById('pwSuccessBanner').classList.remove('show');
    let ok = true;
    ok = validateField('pw_current', 'pw_current_err', v => v.trim().length >= 1) && ok;
    ok = validateField('pw_new', 'pw_new_err', v => v.length >= 8) && ok;

    const newPw = document.getElementById('pw_new').value;
    const confPw = document.getElementById('pw_confirm').value;
    const confEl = document.getElementById('pw_confirm');
    const confErr = document.getElementById('pw_confirm_err');
    if (newPw !== confPw) {
        confEl.classList.add('err'); if (confErr) confErr.classList.add('show'); ok = false;
    } else {
        confEl.classList.remove('err'); if (newPw) confEl.classList.add('ok'); if (confErr) confErr.classList.remove('show');
    }

    if (!ok) { toast('Please fix the errors above.', true); return; }

    // Simulate save with brief loading state
    const btn = e.submitter || document.querySelector('#passwordForm .btn-primary');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...'; btn.disabled = true; }

    setTimeout(() => {
        if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
        // Clear all fields
        ['pw_current','pw_new','pw_confirm'].forEach(id => {
            setVal(id, '');
            const el = document.getElementById(id);
            if (el) { el.classList.remove('err','ok'); el.type = 'password'; }
        });
        // Reset all eye icons
        document.querySelectorAll('#passwordForm .toggle-pw i').forEach(i => i.className = 'fas fa-eye-slash');
        document.getElementById('strengthBar').style.width = '0';
        // Show in-page success banner
        const banner = document.getElementById('pwSuccessBanner');
        banner.classList.add('show');
        banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Auto-hide banner after 6 seconds
        setTimeout(() => banner.classList.remove('show'), 6000);
        toast('Password updated successfully!');
    }, 800);
}

// ===================== NOTIFICATIONS =====================
function loadNotifications() {
    const el = document.getElementById('notifList');
    el.innerHTML = '';
    const notifs = CU?.notifications?.length ? CU.notifications : [
        { icon: 'fa-truck', text: 'Your order #ORD_DEMO2 has been shipped and is on its way.', time: '2 hours ago' },
        { icon: 'fa-check-circle', text: 'Payment completed successfully for your recent order. Total: $89.99', time: '1 day ago' },
        { icon: 'fa-tag', text: 'Special offer: 25% OFF on all home décor items this weekend!', time: '3 days ago' },
        { icon: 'fa-star', text: 'Rate your recent purchase — your feedback helps others!', time: '1 week ago' }
    ];
    notifs.forEach((n, i) => {
        if (i === 0) {
            const lbl = document.createElement('div');
            lbl.className = 'notif-section-label'; lbl.textContent = 'Recent';
            el.appendChild(lbl);
        }
        if (i === 2) {
            const lbl = document.createElement('div');
            lbl.className = 'notif-section-label'; lbl.textContent = 'Earlier';
            el.appendChild(lbl);
        }
        const div = document.createElement('div');
        div.className = 'notif-item';
        div.innerHTML = `<div class="notif-icon"><i class="fas ${n.icon}"></i></div><div><div class="notif-text">${n.text}</div><div class="notif-time">${n.time || ''}</div></div>`;
        el.appendChild(div);
    });
}

// ===================== MODAL =====================
function openModal() { document.getElementById('verifyModal').classList.add('open'); document.getElementById('code1').focus(); }
function closeModal() {
    document.getElementById('verifyModal').classList.remove('open');
    ['code1','code2','code3','code4'].forEach(id => { const e = document.getElementById(id); e.value = ''; e.classList.remove('err'); });
}
function doVerify() {
    const code = ['code1','code2','code3','code4'].map(id => document.getElementById(id).value).join('');
    if (code !== '1234') {
        ['code1','code2','code3','code4'].forEach(id => { const e = document.getElementById(id); e.classList.add('err'); e.value = ''; });
        document.getElementById('code1').focus(); toast('Invalid code. Try again.', true); return;
    }
    Object.assign(CU, pendingData);
    saveUser(); renderUserUI(); fillPersonalDataForm(); closeModal();
    toast('Profile updated successfully!'); pendingData = null;
}

function setupCodeBoxes() {
    const ids = ['code1','code2','code3','code4'];
    ids.forEach((id, i) => {
        const el = document.getElementById(id);
        el.addEventListener('input', () => {
            el.classList.remove('err');
            if (el.value && i < ids.length - 1) document.getElementById(ids[i + 1]).focus();
            if (el.value && i === ids.length - 1) doVerify();
        });
        el.addEventListener('keydown', ev => {
            if (ev.key === 'Backspace' && !el.value && i > 0) document.getElementById(ids[i - 1]).focus();
        });
        el.addEventListener('paste', (ev) => {
            const pasted = ev.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
            if (pasted.length > 0) {
                ev.preventDefault();
                pasted.split('').forEach((c, ci) => { const t = document.getElementById(ids[ci]); if (t) t.value = c; });
                const last = document.getElementById(ids[Math.min(pasted.length - 1, 3)]);
                if (last) last.focus();
            }
        });
    });
}

// ===================== UTILITIES =====================
function updateCartCount() {
    const c = JSON.parse(localStorage.getItem(K.C)) || [];
    document.getElementById('cartCount').textContent = c.filter(i => !i.userId || i.userId === CU?.id).length;
}

function toast(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'toast-item';
    t.style.cssText = isErr ? 'background:#c0392b;' : '';
    t.innerHTML = `<i class="fas ${isErr ? 'fa-exclamation-circle' : 'fa-check-circle'}" style="color:${isErr?'#ffb3b3':'#d480d4'};"></i> ${msg}`;
    document.getElementById('toastWrap').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; t.style.transition = 'all 0.4s'; }, 2800);
    setTimeout(() => t.remove(), 3300);
}

function saveUser() {
    let users = JSON.parse(localStorage.getItem(K.US)) || [];
    users = users.map(u => u.id === CU.id ? CU : u);
    if (!users.find(u => u.id === CU.id)) users.push(CU);
    localStorage.setItem(K.US, JSON.stringify(users));
    localStorage.setItem(K.U, JSON.stringify(CU));
}

function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
