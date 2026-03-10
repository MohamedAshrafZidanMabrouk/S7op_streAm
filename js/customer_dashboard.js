/**
 * customer_dashboard.js — Amazino Customer Dashboard
 * Fully dynamic: orders fetched from API, filtered by userId.
 * No static/demo order data.
 */

AUTH.guardRoute(['buyer', 'customer', 'user']);

const ORDERS_API_URL = 'https://69a0ea5f2e82ee536f9fcd23.mockapi.io/data';
const USERS_API_URL  = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/users_table';
const EMAILJS_SERVICE  = 'service_elxefnw';
const EMAILJS_TEMPLATE = 'template_1o90chi';

let CU              = null;
let orders          = [];
let pendingData     = null;
let selectedPayType = 'paypal';
let saveCard        = true;
let _verifyOTP      = '';
let _forgotOTP      = '';

const PAGE_TITLES = {
  dashboard:'Dashboard', profile:'Personal Data', payment:'Payment Account',
  orders:'My Orders', address:'Manage Address', password:'Password Manager', notifications:'Notifications',
};

function getOrderTotal(o) {
  if (o?.totals?.total != null) return +o.totals.total;
  if (typeof o?.total === 'number') return o.total;
  if (Array.isArray(o?.items)) return o.items.reduce((s,i)=>s+((i.price||0)*(i.quantity||1)),0);
  return 0;
}

function normaliseOrder(o) {
  const id = o.orderId || o.id || '';
  const total = getOrderTotal(o);
  const createdAt = o.createdAt || (o.orderDate ? o.orderDate+'T00:00:00Z' : new Date().toISOString());
  const items = Array.isArray(o.items) ? o.items : [];
  return { ...o, id, orderId: id, total, createdAt, items };
}

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentUser();
  loadOrders();
  updateCartCount();
  setupCodeBoxes();
  loadSavedAddresses();
  loadNotifications();
  loadSavedMethods();
  const d = document.getElementById('dashDate');
  if (d) d.textContent = new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  window.addEventListener('scroll', () => {
    document.getElementById('topbar')?.classList.toggle('scrolled', window.scrollY > 0);
  }, { passive:true });
  go('dashboard');
});

function loadCurrentUser() {
  if (typeof AUTH !== 'undefined') CU = AUTH.getCurrentUser();
  if (!CU) CU = JSON.parse(localStorage.getItem('ecommerce_current_user') || 'null');
  if (!CU) { window.location.replace('signin.html'); return; }
  if (!CU.name && (CU.firstName || CU.lastName)) CU.name = ((CU.firstName||'')+' '+(CU.lastName||'')).trim();
  if (!CU.name) CU.name = 'User';
  if (!CU.payments)      CU.payments      = [];
  if (!CU.addresses)     CU.addresses     = [];
  if (!CU.notifications) CU.notifications = [];
  saveUser();
  renderUserUI();
  fillPersonalDataForm();
}

function saveUser() {
  if (!CU) return;
  if (typeof AUTH !== 'undefined' && AUTH.getSession()) AUTH.updateUser(CU);
  else localStorage.setItem('ecommerce_current_user', JSON.stringify(CU));
}

/* ════════════════════════════════════════════════════════════
   UI RENDER
════════════════════════════════════════════════════════════ */
function renderUserUI() {
  if (!CU) return;
  const name=CU.name||'User';
  const fn=name.split(' ')[0];
  const initials=name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  setEl('tbName',name); setEl('sbName',name);
  setEl('welcomeName',fn||'there'); setEl('profileDisplayName',name);
  ['tbAvatar','sbAvatar'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    if(CU.profileImage) el.innerHTML=`<img src="${CU.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    else el.textContent=initials;
  });
  const paImg=document.getElementById('profileAvatarImg');const paIco=document.getElementById('profileAvatarIco');
  if(CU.profileImage){if(paImg){paImg.src=CU.profileImage;paImg.style.display='block';}if(paIco)paIco.style.display='none';}
  else{if(paImg)paImg.style.display='none';if(paIco)paIco.style.display='';}
}

function fillPersonalDataForm() {
  if (!CU) return;
  const parts=(CU.name||'').split(' ');
  setVal('pd_fname',parts[0]||''); setVal('pd_lname',parts.slice(1).join(' ')||'');
  setVal('pd_email',CU.email||''); setVal('pd_cemail',CU.email||'');
  setVal('pd_phone',CU.phone||''); setVal('pd_gender',CU.gender||'');
  setVal('pd_birthday',CU.birthday||''); setVal('pd_country',CU.country||'');
  setVal('pd_address',CU.address||''); setVal('pd_zip',CU.zip||'');
}

/* ════════════════════════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════════════════════════ */
function go(name) {
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  const sec=document.getElementById('section-'+name); if(sec) sec.classList.add('active');
  setEl('pageTitleBar',PAGE_TITLES[name]||name);
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const match=[...document.querySelectorAll('.nav-item')].find(n=>(n.getAttribute('onclick')||'').includes(`'${name}'`));
  if(match) match.classList.add('active');
  if(window.innerWidth<768) closeSB();
  if(name==='payment')       loadSavedMethods();
  if(name==='address')       loadSavedAddresses();
  if(name==='notifications') loadNotifications();
  window.scrollTo(0,0);
}
function toggleSB(){document.getElementById('sb').classList.toggle('open');document.getElementById('ov').classList.toggle('open');}
function closeSB(){document.getElementById('sb').classList.remove('open');document.getElementById('ov').classList.remove('open');}

/* ════════════════════════════════════════════════════════════
   ORDERS — fetch from real API only, filtered by userId
════════════════════════════════════════════════════════════ */
async function loadOrders() {
  setEl('statOrders','…'); setEl('statPending','…'); setEl('statSpent','…');

  const userId    = CU?.id    ? String(CU.id)    : '';
  const userEmail = (CU?.email||'').toLowerCase();

  try {
    const res = await fetch(ORDERS_API_URL);
    if (!res.ok) throw new Error('HTTP '+res.status);
    const all = await res.json();

    orders = all.filter(o => {
      if (userId && String(o.userId) === userId) return true;
      if (userEmail && (o.customer?.email||'').toLowerCase() === userEmail) return true;
      return false;
    }).map(normaliseOrder).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));

  } catch (err) {
    console.error('[Customer Dashboard] loadOrders failed:', err.message);
    toast('Failed to load orders. Please refresh.', true);
    orders = [];
  }

  setEl('statOrders', orders.length.toString());
  setEl('statPending', orders.filter(o=>o.status==='pending').length.toString());
  setEl('statSpent', '$'+orders.reduce((s,o)=>s+getOrderTotal(o),0).toFixed(2));
  renderOrders(orders,'ordersList');
  renderRecentOrders(orders.slice(0,5));
}

function renderOrders(list, containerId) {
  const el=document.getElementById(containerId); if(!el) return;
  if(!list.length){el.innerHTML='<div class="empty-state"><i class="fas fa-box-open"></i><p>No orders found.<br><a href="index.html">Start shopping</a></p></div>';return;}
  const sm={pending:'status-pending',processing:'status-processing',shipped:'status-shipped',delivered:'status-delivered',cancelled:'status-cancelled'};
  el.innerHTML=list.map(o=>{
    const displayId=(o.orderId||o.id||'').replace(/^#/,'')||'—';
    return `<div class="order-card"><div class="order-top"><div><div class="order-id">${displayId}</div><div class="order-date">${fmtDate(o.createdAt)}</div></div><span class="status-badge ${sm[o.status]||'status-pending'}">${cap(o.status)}</span></div><div class="order-items">${o.items.slice(0,3).map(i=>(i.name||'Item')+' × '+(i.quantity||1)).join(' · ')}${o.items.length>3?' · +'+(o.items.length-3)+' more':''}</div><div class="order-footer"><div class="order-total">$${getOrderTotal(o).toFixed(2)}</div><button class="btn-view" onclick="viewOrder('${o.id||o.orderId}')"><i class="fas fa-eye" style="margin-right:4px;font-size:.7rem;"></i>View</button></div></div>`;
  }).join('');
}

function renderRecentOrders(list) {
  const el=document.getElementById('recentOrdersList'); if(!el||!list.length) return;
  const sm={pending:'status-pending',processing:'status-processing',shipped:'status-shipped',delivered:'status-delivered',cancelled:'status-cancelled'};
  el.innerHTML=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Order ID</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${list.map(o=>{const displayId=(o.orderId||o.id||'').replace(/^#/,'')||'—';return`<tr><td style="font-weight:800;">${displayId}</td><td style="color:var(--mu);">${fmtDate(o.createdAt)}</td><td style="color:var(--mu);">${o.items.length} item(s)</td><td style="font-weight:700;">$${getOrderTotal(o).toFixed(2)}</td><td><span class="status-badge ${sm[o.status]||'status-pending'}">${cap(o.status)}</span></td><td><button class="btn-view" onclick="viewOrder('${o.id||o.orderId}')">View</button></td></tr>`}).join('')}</tbody></table></div>`;
}

function filterOrders(btn, status) {
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderOrders(status==='all'?orders:orders.filter(o=>o.status===status),'ordersList');
}

function viewOrder(id) {
  const o=orders.find(x=>x.id===id||x.orderId===id); if(!o) return;
  const sm={pending:'status-pending',processing:'status-processing',shipped:'status-shipped',delivered:'status-delivered',cancelled:'status-cancelled'};
  const displayId=(o.orderId||o.id||'').replace(/^#/,'')||'—';
  const payLabel=o.paymentMethod==='cod'?'Cash on Delivery':o.paymentMethod==='card'?'Credit Card':'Online Payment';
  document.getElementById('orderModalBody').innerHTML=`<div class="order-info-row"><span class="order-info-label">Order ID</span><span class="order-info-val" style="font-family:monospace;">${displayId}</span></div><div class="order-info-row"><span class="order-info-label">Date Placed</span><span class="order-info-val">${fmtDate(o.createdAt)}</span></div><div class="order-info-row"><span class="order-info-label">Status</span><span class="status-badge ${sm[o.status]||'status-pending'}">${cap(o.status)}</span></div><div class="order-info-row"><span class="order-info-label">Payment</span><span class="order-info-val">${payLabel}</span></div><div class="order-items-title">Items in this order</div>${o.items.map(item=>`<div class="order-item-row"><div class="order-item-dot"></div><span class="order-item-name">${item.name||'Item'}</span><span class="order-item-qty">× ${item.quantity||1}</span></div>`).join('')}<div class="order-total-row"><span>Order Total</span><span style="color:var(--pri);">$${getOrderTotal(o).toFixed(2)}</span></div>`;
  document.getElementById('orderModal').classList.add('open');
}
function closeOrderModal(){document.getElementById('orderModal').classList.remove('open');}

/* ════════════════════════════════════════════════════════════
   VALIDATION HELPERS
════════════════════════════════════════════════════════════ */
function validateField(inputId,errId,testFn){const el=document.getElementById(inputId);const er=document.getElementById(errId);const ok=el?testFn(el.value):false;if(el){el.classList.toggle('err',!ok);el.classList.toggle('ok',ok);}if(er)er.classList.toggle('show',!ok);return ok;}

/* ════════════════════════════════════════════════════════════
   PERSONAL DATA
════════════════════════════════════════════════════════════ */
function submitPersonalData(e) {
  e.preventDefault();
  let ok=true;
  ok=validateField('pd_fname','pd_fname_err',v=>v.trim().length>=2&&!/\d/.test(v.trim()))&&ok;
  ok=validateField('pd_lname','pd_lname_err',v=>v.trim().length>=2&&!/\d/.test(v.trim()))&&ok;
  ok=validateField('pd_email','pd_email_err',v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()))&&ok;
  ok=validateField('pd_phone','pd_phone_err',v=>v.replace(/\D/g,'').length===11)&&ok;
  const bd=document.getElementById('pd_birthday').value;
  if(bd) ok=validateField('pd_birthday','pd_birthday_err',v=>{const d=new Date(v);const age=(new Date()-d)/(365.25*24*60*60*1000);return!isNaN(d)&&age>=1&&age<=100;})&&ok;
  ok=validateField('pd_country','pd_country_err',v=>v!=='')&&ok;
  ok=validateField('pd_address','pd_address_err',v=>v.trim().length>=10)&&ok;
  ok=validateField('pd_zip','pd_zip_err',v=>v.trim().length>=3)&&ok;
  const email=document.getElementById('pd_email').value.trim();
  const cemail=document.getElementById('pd_cemail').value.trim();
  const cemailEl=document.getElementById('pd_cemail');const cemailErr=document.getElementById('pd_cemail_err');
  if(email!==cemail){cemailEl.classList.add('err');if(cemailErr)cemailErr.classList.add('show');ok=false;}
  else{cemailEl.classList.remove('err');cemailEl.classList.add('ok');if(cemailErr)cemailErr.classList.remove('show');}
  if(!ok){toast('Please fix the errors above.',true);return;}
  pendingData={name:document.getElementById('pd_fname').value.trim()+' '+document.getElementById('pd_lname').value.trim(),email,phone:document.getElementById('pd_phone').value.trim(),gender:document.getElementById('pd_gender').value,birthday:document.getElementById('pd_birthday').value,country:document.getElementById('pd_country').value,address:document.getElementById('pd_address').value.trim(),zip:document.getElementById('pd_zip').value.trim(),profileImage:CU.profileImage};
  openModal();
}
function resetPersonalData(){fillPersonalDataForm();toast('Changes discarded.');}

function handleImg(inp){const file=inp.files[0];if(!file)return;if(!file.type.match(/image\/(jpeg|png|webp|gif)/)){toast('Only JPG/PNG/WEBP/GIF.',true);return;}if(file.size>5*1024*1024){toast('Image must be under 5MB.',true);return;}const r=new FileReader();r.onload=e=>{const src=e.target.result;const paImg=document.getElementById('profileAvatarImg');const paIco=document.getElementById('profileAvatarIco');if(paImg){paImg.src=src;paImg.style.display='block';}if(paIco)paIco.style.display='none';const tbA=document.getElementById('tbAvatar');if(tbA)tbA.innerHTML=`<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;const sbA=document.getElementById('sbAvatar');if(sbA)sbA.innerHTML=`<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;CU.profileImage=src;saveUser();toast('Profile photo updated!');inp.value='';};r.onerror=()=>toast('Failed to read image.',true);r.readAsDataURL(file);}

/* ════════════════════════════════════════════════════════════
   PAYMENT
════════════════════════════════════════════════════════════ */
function selectPayMethod(el,type){document.querySelectorAll('.pay-opt').forEach(o=>o.classList.remove('selected'));el.classList.add('selected');selectedPayType=type;document.getElementById('paypalForm').style.display=type==='paypal'?'block':'none';document.getElementById('gpayForm').style.display=type==='gpay'?'block':'none';document.getElementById('cardForm').style.display=type==='card'?'block':'none';}
function formatCardNumber(el){let v=el.value.replace(/\D/g,'').slice(0,16);el.value=v.replace(/(.{4})/g,'$1 ').trim();document.getElementById('cpNumber').textContent=v.padEnd(16,'•').replace(/(.{4})/g,'$1 ').trim();}
function formatExpiry(el){let v=el.value.replace(/\D/g,'');if(v.length>=2)v=v.slice(0,2)+'/'+v.slice(2,4);el.value=v;document.getElementById('cpExpiry').textContent=v||'MM/YY';}
function toggleSaveCard(){saveCard=!saveCard;const el=document.getElementById('saveCardChk');el.classList.toggle('unchecked',!saveCard);el.innerHTML=saveCard?'<i class="fas fa-check"></i>':'';}
function confirmPaymentMethod(){let ok=true;if(selectedPayType==='paypal')ok=validateField('pp_email','pp_email_err',v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()));else if(selectedPayType==='gpay')ok=validateField('gp_phone','gp_phone_err',v=>v.replace(/\D/g,'').length>=8);else if(selectedPayType==='card'){ok=validateField('card_name','card_name_err',v=>v.trim().length>=2)&&ok;ok=validateField('card_number','card_number_err',v=>v.replace(/\s/g,'').length===16)&&ok;ok=validateField('card_expiry','card_expiry_err',v=>/^\d{2}\/\d{2}$/.test(v))&&ok;ok=validateField('card_cvv','card_cvv_err',v=>/^\d{3}$/.test(v))&&ok;if(!ok){showBubble('Something looks wrong 😟',true);return;}showBubble('All set! 😄',false);}if(!ok)return;let payment={type:selectedPayType,id:Date.now()};if(selectedPayType==='paypal')payment.details=document.getElementById('pp_email').value.trim();if(selectedPayType==='gpay')payment.details=document.getElementById('gp_phone').value.trim();if(selectedPayType==='card'){payment.name=document.getElementById('card_name').value.trim();payment.last4=document.getElementById('card_number').value.replace(/\s/g,'').slice(-4);payment.expiry=document.getElementById('card_expiry').value;}if(selectedPayType==='cash')payment.details='No details required';if(saveCard||selectedPayType!=='card'){if(!CU.payments)CU.payments=[];CU.payments.push(payment);saveUser();loadSavedMethods();}toast('Payment method saved!');['pp_email','gp_phone','card_name','card_number','card_expiry','card_cvv'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.classList.remove('err','ok');}});}
function savePaymentDetails(){confirmPaymentMethod();}
function loadSavedMethods(){if(!CU||!CU.payments||!CU.payments.length){document.getElementById('savedMethodsSection').style.display='none';return;}document.getElementById('savedMethodsSection').style.display='block';const list=document.getElementById('savedMethodsList');list.innerHTML='';CU.payments.forEach((p,i)=>{let icon='',mainText='',subText='';if(p.type==='paypal'){icon='<i class="fab fa-paypal" style="color:#003087;"></i>';mainText='PayPal';subText=p.details;}if(p.type==='gpay'){icon='<i class="fab fa-google" style="color:#4285F4;"></i>';mainText='Google Pay';subText=p.details;}if(p.type==='cash'){icon='<i class="fas fa-money-bill-wave" style="color:var(--suc);"></i>';mainText='Cash on Delivery';subText='Pay at door';}if(p.type==='card'){icon='<i class="fas fa-credit-card" style="color:var(--pri);"></i>';mainText=`Card •••• ${p.last4}`;subText=`${p.name} · Expires ${p.expiry}`;}const div=document.createElement('div');div.className='saved-method';div.innerHTML=`<div class="sm-info"><div class="sm-icon">${icon}</div><div><div class="sm-details">${mainText}</div><div class="sm-sub">${subText||''}</div></div></div><button class="btn-secondary danger" onclick="removePayment(${i})" style="font-size:0.75rem;padding:6px 12px;"><i class="fas fa-trash"></i>Remove</button>`;list.appendChild(div);});}
function removePayment(i){if(confirm('Remove this payment method?')){CU.payments.splice(i,1);saveUser();loadSavedMethods();toast('Payment method removed.');}}
function showCvvCartoon(){document.getElementById('cartoonWrap').classList.add('visible');}
function hideCvvCartoon(){const v=document.getElementById('card_cvv').value;setCvvFace(/^\d{3}$/.test(v)?'😌':'😟',!/^\d{3}$/.test(v));setTimeout(()=>document.getElementById('cartoonWrap').classList.remove('visible'),2500);}
function setCvvFace(emoji){document.getElementById('cartoonFace').textContent=emoji;}
function showBubble(msg,isErr=false){const b=document.getElementById('cartoonBubble');b.textContent=msg;b.className='cartoon-bubble show'+(isErr?' err':'');document.getElementById('cartoonWrap').classList.add('visible');setTimeout(()=>{b.className='cartoon-bubble';},3000);}

/* ════════════════════════════════════════════════════════════
   ADDRESS
════════════════════════════════════════════════════════════ */
function loadSavedAddresses(){if(!CU){return;}const el=document.getElementById('savedAddressesList');el.innerHTML='';(CU.addresses||[]).forEach((a,i)=>{const div=document.createElement('div');div.className='address-card';div.innerHTML=`<div><div class="addr-name">${a.name}</div><div class="addr-text">${a.street}</div></div><div class="addr-actions"><button class="btn-edit" onclick="editAddress(${i})">Edit</button><button class="btn-del" onclick="deleteAddress(${i})">Delete</button></div>`;el.appendChild(div);});}
function submitAddress(e){e.preventDefault();let ok=true;ok=validateField('addr_fname','addr_fname_err',v=>v.trim().length>=2&&!/\d/.test(v.trim()))&&ok;ok=validateField('addr_lname','addr_lname_err',v=>v.trim().length>=2&&!/\d/.test(v.trim()))&&ok;ok=validateField('addr_country','addr_country_err',v=>v!=='')&&ok;ok=validateField('addr_street','addr_street_err',v=>v.trim().length>=10)&&ok;ok=validateField('addr_city','addr_city_err',v=>v.trim().length>=2)&&ok;ok=validateField('addr_zip','addr_zip_err',v=>v.trim().length>=3)&&ok;if(!ok){toast('Please fix the errors above.',true);return;}const addr={id:Date.now().toString(),name:document.getElementById('addr_fname').value.trim()+' '+document.getElementById('addr_lname').value.trim(),company:document.getElementById('addr_company').value.trim(),street:document.getElementById('addr_street').value.trim(),city:document.getElementById('addr_city').value.trim(),state:document.getElementById('addr_state').value.trim(),country:document.getElementById('addr_country').value,zip:document.getElementById('addr_zip').value.trim()};if(!CU.addresses)CU.addresses=[];CU.addresses.push(addr);saveUser();loadSavedAddresses();resetAddressForm();toast('Address added successfully!');}
function resetAddressForm(){['addr_fname','addr_lname','addr_company','addr_street','addr_city','addr_state','addr_zip'].forEach(id=>setVal(id,''));setVal('addr_country','');document.querySelectorAll('#addressForm .form-input,#addressForm .form-select').forEach(el=>el.classList.remove('err','ok'));document.querySelectorAll('#addressForm .err-msg').forEach(el=>el.classList.remove('show'));}
function editAddress(i){const a=CU.addresses[i];const parts=a.name.split(' ');setVal('addr_fname',parts[0]||'');setVal('addr_lname',parts.slice(1).join(' ')||'');setVal('addr_company',a.company||'');setVal('addr_street',a.street||'');setVal('addr_city',a.city||'');setVal('addr_state',a.state||'');setVal('addr_country',a.country||'');setVal('addr_zip',a.zip||'');CU.addresses.splice(i,1);saveUser();loadSavedAddresses();document.getElementById('addressForm').scrollIntoView({behavior:'smooth',block:'start'});toast('Edit the address below and save.');}
function deleteAddress(i){if(confirm('Delete this address?')){CU.addresses.splice(i,1);saveUser();loadSavedAddresses();toast('Address removed.');}}

/* ════════════════════════════════════════════════════════════
   PASSWORD CHANGE
════════════════════════════════════════════════════════════ */
function togglePasswordView(id,btn){const el=document.getElementById(id);if(!el)return;const isPass=el.type==='password';el.type=isPass?'text':'password';btn.querySelector('i').className=isPass?'fas fa-eye':'fas fa-eye-slash';}
function checkPasswordStrength(el){const v=el.value;const bar=document.getElementById('strengthBar');let score=0;if(v.length>=8)score++;if(/[A-Z]/.test(v))score++;if(/[0-9]/.test(v))score++;if(/[^A-Za-z0-9]/.test(v))score++;bar.style.width=(score/4*100)+'%';bar.style.background=['#e74c3c','#e67e22','#f1c40f','#2ecc71'][score-1]||'#e74c3c';}

async function submitPassword(e) {
  e.preventDefault();
  document.getElementById('pwSuccessBanner').classList.remove('show');
  let ok=true;
  ok=validateField('pw_current','pw_current_err',v=>v.trim().length>=1)&&ok;
  ok=validateField('pw_new','pw_new_err',v=>v.length>=8)&&ok;
  const newPw=document.getElementById('pw_new').value;const confPw=document.getElementById('pw_confirm').value;
  const confEl=document.getElementById('pw_confirm');const confErr=document.getElementById('pw_confirm_err');
  if(newPw!==confPw){confEl.classList.add('err');if(confErr)confErr.classList.add('show');ok=false;}
  else{confEl.classList.remove('err');if(newPw)confEl.classList.add('ok');if(confErr)confErr.classList.remove('show');}
  if(!ok){toast('Please fix the errors above.',true);return;}
  const oldPassword=document.getElementById('pw_current').value;
  const btn=e.submitter||document.querySelector('#passwordForm .btn-primary');const origHtml=btn?btn.innerHTML:'';
  if(btn){btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Verifying…';btn.disabled=true;}
  try {
    await AUTH.changePassword(oldPassword,newPw);
    ['pw_current','pw_new','pw_confirm'].forEach(id=>{setVal(id,'');const el=document.getElementById(id);if(el){el.classList.remove('err','ok');el.type='password';}});
    document.querySelectorAll('#passwordForm .toggle-pw i').forEach(i=>i.className='fas fa-eye-slash');
    document.getElementById('strengthBar').style.width='0';
    if(btn){btn.innerHTML=origHtml;btn.disabled=false;}
    const banner=document.getElementById('pwSuccessBanner');banner.classList.add('show');banner.scrollIntoView({behavior:'smooth',block:'nearest'});setTimeout(()=>banner.classList.remove('show'),6000);
    toast('Password updated successfully!');
  } catch(err) {
    if(btn){btn.innerHTML=origHtml;btn.disabled=false;}
    if(err.message&&err.message.includes('incorrect')){document.getElementById('pw_current').classList.add('err');document.getElementById('pw_current_err').classList.add('show');toast('Current password is incorrect.',true);}
    else toast(err.message||'Failed to update password.',true);
  }
}

/* ════════════════════════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════════════════════════ */
// استبدل الدالة القديمة بالنسخة المعدلة دي
function loadNotifications() {
  // ... الكود القديم بتاعك ...

  // بعد ما تخلّص الـ render
  requestAnimationFrame(() => {
    const items = document.querySelectorAll('.notif-item');
    items.forEach(item => {
      if (item.classList.contains('unread')) {
        if (!item.querySelector('.unread-dot')) {
          const dot = document.createElement('div');
          dot.className = 'unread-dot';
          item.appendChild(dot);
        }
      }
    });
  });
}

/* ════════════════════════════════════════════════════════════
   VERIFY MODAL (personal data OTP)
════════════════════════════════════════════════════════════ */
function openModal(){_verifyOTP=Math.floor(1000+Math.random()*9000).toString();const modal=document.getElementById('verifyModal');modal.classList.add('open');const hint=document.querySelector('.code-hint');if(hint)hint.innerHTML='<i class="fas fa-spinner fa-spin"></i> Sending code to your email…';const verifyBtn=modal.querySelector('.btn-primary');if(verifyBtn)verifyBtn.disabled=true;emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{to_email:CU.email,code:_verifyOTP,name:CU.name||'User'}).then(()=>{if(hint)hint.innerHTML=`Code sent to <strong style="color:var(--pri);">${CU.email}</strong>`;if(verifyBtn)verifyBtn.disabled=false;document.getElementById('code1').focus();},()=>{_verifyOTP='1234';if(hint)hint.innerHTML=`Couldn't send email. Use demo code <strong>1234</strong>`;if(verifyBtn)verifyBtn.disabled=false;document.getElementById('code1').focus();toast('Email service unavailable. Using demo code 1234.',true);});}
function closeModal(){document.getElementById('verifyModal').classList.remove('open');['code1','code2','code3','code4'].forEach(id=>{const e=document.getElementById(id);e.value='';e.classList.remove('err');});}
function doVerify(){const code=['code1','code2','code3','code4'].map(id=>document.getElementById(id).value).join('');if(code!==_verifyOTP){['code1','code2','code3','code4'].forEach(id=>{const e=document.getElementById(id);e.classList.add('err');e.value='';});document.getElementById('code1').focus();toast('Invalid code. Try again.',true);return;}Object.assign(CU,pendingData);saveUser();renderUserUI();fillPersonalDataForm();closeModal();pendingData=null;_verifyOTP='';if(CU.id){const payload={name:CU.name,email:CU.email,phone:CU.phone,gender:CU.gender,birthday:CU.birthday,country:CU.country,address:CU.address,zip:CU.zip};fetch(`${USERS_API_URL}/${CU.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.ok?toast('Profile updated successfully!'):toast('Profile saved locally. API sync failed.',true)).catch(()=>toast('Profile saved locally. No internet connection.',true));}else{toast('Profile updated successfully!');}}

function setupCodeBoxes(){function wireBoxes(ids,onComplete){ids.forEach((id,i)=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('input',()=>{el.classList.remove('err');if(el.value&&i<ids.length-1)document.getElementById(ids[i+1]).focus();if(el.value&&i===ids.length-1)onComplete();});el.addEventListener('keydown',ev=>{if(ev.key==='Backspace'&&!el.value&&i>0)document.getElementById(ids[i-1]).focus();});el.addEventListener('paste',ev=>{const pasted=ev.clipboardData.getData('text').replace(/\D/g,'').slice(0,4);if(pasted.length>0){ev.preventDefault();pasted.split('').forEach((c,ci)=>{const t=document.getElementById(ids[ci]);if(t)t.value=c;});const last=document.getElementById(ids[Math.min(pasted.length-1,3)]);if(last)last.focus();}});});}wireBoxes(['code1','code2','code3','code4'],doVerify);wireBoxes(['fpCode1','fpCode2','fpCode3','fpCode4'],verifyForgotOtp);}

/* ════════════════════════════════════════════════════════════
   FORGOT PASSWORD
════════════════════════════════════════════════════════════ */
function openForgotPasswordFlow(e){if(e)e.preventDefault();const emailEl=document.getElementById('forgotPwEmail');const emailConfirmEl=document.getElementById('forgotPwEmailConfirm');if(emailEl)emailEl.textContent=CU?.email||'';if(emailConfirmEl)emailConfirmEl.textContent=CU?.email||'';_showForgotStep(1);document.getElementById('forgotPwModal').classList.add('open');}
function closeForgotPwModal(){document.getElementById('forgotPwModal').classList.remove('open');_forgotOTP='';['fpCode1','fpCode2','fpCode3','fpCode4'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.classList.remove('err');}});['fp_new_pw','fp_confirm_pw'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.classList.remove('err','ok');}});const bar=document.getElementById('fpStrengthBar');if(bar)bar.style.width='0';}
function _showForgotStep(n){[1,2,3].forEach(i=>{const el=document.getElementById('forgotStep'+i);if(el)el.style.display=(i===n)?'block':'none';});}
async function sendForgotOtp(isResend=false){if(!CU?.email){toast('No email on account.',true);return;}const btn=document.getElementById('forgotSendBtn');const origHtml=btn?btn.innerHTML:'';if(btn){btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Sending…';btn.disabled=true;}_forgotOTP=Math.floor(1000+Math.random()*9000).toString();try{await emailjs.send(EMAILJS_SERVICE,EMAILJS_TEMPLATE,{to_email:CU.email,code:_forgotOTP,name:CU.name||'User'});_showForgotStep(2);document.getElementById('fpCode1').focus();if(isResend)toast('New code sent!');}catch(err){_forgotOTP='1234';_showForgotStep(2);document.getElementById('fpCode1').focus();toast("Email service unavailable. Use demo code 1234.",true);}finally{if(btn){btn.innerHTML=origHtml;btn.disabled=false;}}}
function verifyForgotOtp(){const code=['fpCode1','fpCode2','fpCode3','fpCode4'].map(id=>{const e=document.getElementById(id);return e?e.value:'';}).join('');if(code!==_forgotOTP){['fpCode1','fpCode2','fpCode3','fpCode4'].forEach(id=>{const e=document.getElementById(id);if(e){e.classList.add('err');e.value='';}});document.getElementById('fpCode1').focus();toast('Invalid code. Try again.',true);return;}_showForgotStep(3);document.getElementById('fp_new_pw').focus();}
function checkFpStrength(el){const v=el.value;const bar=document.getElementById('fpStrengthBar');let score=0;if(v.length>=8)score++;if(/[A-Z]/.test(v))score++;if(/[0-9]/.test(v))score++;if(/[^A-Za-z0-9]/.test(v))score++;bar.style.width=(score/4*100)+'%';bar.style.background=['#e74c3c','#e67e22','#f1c40f','#2ecc71'][score-1]||'#e74c3c';}
async function doForgotPasswordReset(){const newPw=document.getElementById('fp_new_pw').value;const confPw=document.getElementById('fp_confirm_pw').value;let ok=true;const pwEl=document.getElementById('fp_new_pw');const pwErr=document.getElementById('fp_new_pw_err');if(newPw.length<8){pwEl.classList.add('err');if(pwErr)pwErr.classList.add('show');ok=false;}else{pwEl.classList.remove('err');pwEl.classList.add('ok');if(pwErr)pwErr.classList.remove('show');}const confEl=document.getElementById('fp_confirm_pw');const confErr=document.getElementById('fp_confirm_pw_err');if(newPw!==confPw||!confPw){confEl.classList.add('err');if(confErr)confErr.classList.add('show');ok=false;}else{confEl.classList.remove('err');confEl.classList.add('ok');if(confErr)confErr.classList.remove('show');}if(!ok){toast('Please fix the errors.',true);return;}const resetBtn=document.querySelector('#forgotStep3 .btn-primary');const origHtml=resetBtn?resetBtn.innerHTML:'';if(resetBtn){resetBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Updating…';resetBtn.disabled=true;}try{const res=await fetch(`${USERS_API_URL}/${CU.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:newPw})});if(!res.ok)throw new Error('API error');closeForgotPwModal();['pw_current','pw_new','pw_confirm'].forEach(id=>{const el=document.getElementById(id);if(el){el.value='';el.classList.remove('err','ok');}});document.getElementById('strengthBar').style.width='0';const banner=document.getElementById('pwSuccessBanner');if(banner){banner.classList.add('show');setTimeout(()=>banner.classList.remove('show'),6000);}toast('Password reset successfully!');_forgotOTP='';}catch(err){toast('Failed to update password. Please try again.',true);if(resetBtn){resetBtn.innerHTML=origHtml;resetBtn.disabled=false;}}}

/* ════════════════════════════════════════════════════════════
   LOGOUT
════════════════════════════════════════════════════════════ */
function logout(){const initials=(CU?.name||'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);const av=document.getElementById('logoutAvatar');if(CU?.profileImage){av.innerHTML=`<img src="${CU.profileImage}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">"`;}else{av.textContent=initials;}setEl('logoutName',CU?.name||'User');document.getElementById('logoutModal').classList.add('open');}
function closeLogoutModal(){document.getElementById('logoutModal').classList.remove('open');}
function doLogout(){const btn=document.querySelector('.btn-logout-confirm');if(btn){btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>&nbsp; Logging out...';btn.disabled=true;}setTimeout(()=>{if(typeof AUTH!=='undefined'){AUTH.logout('index.html');}else{localStorage.removeItem('ecommerce_current_user');localStorage.removeItem('isLoggedIn');window.location.replace('index.html');}},900);}

/* ════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════ */
function updateCartCount(){const userId=CU?.id;const cartKey=userId?`shoppingCart_${userId}`:'shoppingCart';let c=[];try{c=JSON.parse(localStorage.getItem(cartKey)||'[]');}catch{}if(!c.length){try{c=JSON.parse(localStorage.getItem('shoppingCart')||'[]');}catch{}}const el=document.getElementById('cartCount');if(el)el.textContent=c.reduce((s,i)=>s+(i.quantity||1),0);}
function toast(msg,isErr=false){const t=document.createElement('div');t.className='toast-item';t.style.cssText=isErr?'background:#c0392b;':'';t.innerHTML=`<i class="fas ${isErr?'fa-exclamation-circle':'fa-check-circle'}" style="color:${isErr?'#ffb3b3':'#d480d4'};"></i> ${msg}`;const wrap=document.getElementById('toastWrap');if(wrap)wrap.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transform='translateY(10px)';t.style.transition='all 0.4s';},2800);setTimeout(()=>t.remove(),3300);}
function setEl(id,val){const e=document.getElementById(id);if(e)e.textContent=val;}
function setVal(id,val){const e=document.getElementById(id);if(e)e.value=val;}
function fmtDate(ts){if(!ts)return '—';return new Date(ts).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}