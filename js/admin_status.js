/**
 * admin_order_status_patch.js
 * ─────────────────────────────────────────────────────────────
 * ضيف هذا الملف في admin-dashboard.html قبل </body>
 * بعد الـ <script> الأساسي مباشرة:
 *   <script src="js/admin_order_status_patch.js"></script>
 *
 * بيعمل override على renderOrdersTable ويضيف:
 *  - Status dropdown في كل order
 *  - API update عند تغيير الـ status
 *  - Notification تتحفظ في localStorage للـ user
 *  - Popup جميل يأكد إن الـ notification اتبعت
 * ─────────────────────────────────────────────────────────────
 */

/* ── Status metadata ─────────────────────────────────────── */
const PATCH_STATUS_LIST = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const PATCH_STATUS_META = {
  pending:    { icon: 'fa-clock',         color: '#d69e2e', bg: '#fffbeb', label: 'Pending' },
  processing: { icon: 'fa-cog',           color: '#3182ce', bg: '#ebf8ff', label: 'Processing' },
  shipped:    { icon: 'fa-shipping-fast', color: '#805ad5', bg: '#faf5ff', label: 'Shipped' },
  delivered:  { icon: 'fa-check-circle',  color: '#38a169', bg: '#f0fff4', label: 'Delivered' },
  cancelled:  { icon: 'fa-times-circle',  color: '#e53e3e', bg: '#fff5f5', label: 'Cancelled' },
};

const PATCH_STATUS_COLORS = {
  pending:    'badge-warn',
  processing: 'badge-info',
  shipped:    'badge-pri',
  delivered:  'badge-active',
  cancelled:  'badge-err',
};

/* ── Inject dropdown styles once ─────────────────────────── */
(function injectStyles() {
  if (document.getElementById('patch-styles')) return;
  const s = document.createElement('style');
  s.id = 'patch-styles';
  s.textContent = `
    .status-dropdown {
      padding: 5px 10px;
      border: 1.5px solid var(--bd);
      border-radius: 8px;
      font-size: .75rem;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      font-family: inherit;
      background: var(--wh);
      color: var(--tx);
      transition: border-color .2s, box-shadow .2s;
      min-width: 120px;
    }
    .status-dropdown:focus {
      border-color: var(--pri);
      box-shadow: 0 0 0 3px rgba(124,29,124,.1);
    }
    .status-dropdown.status-pending    { border-color: #d69e2e; color: #d69e2e; }
    .status-dropdown.status-processing { border-color: #3182ce; color: #3182ce; }
    .status-dropdown.status-shipped    { border-color: #805ad5; color: #805ad5; }
    .status-dropdown.status-delivered  { border-color: #38a169; color: #38a169; }
    .status-dropdown.status-cancelled  { border-color: #e53e3e; color: #e53e3e; }

    /* Notification sent modal */
    #notifConfirmModal {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,.45);
      backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
      opacity: 0; transition: opacity .25s;
    }
    #notifConfirmModal.show { opacity: 1; }
    #notifConfirmBox {
      background: #fff;
      border-radius: 20px;
      max-width: 400px; width: 100%;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,.2);
      transform: scale(.88) translateY(16px);
      transition: transform .32s cubic-bezier(.34,1.56,.64,1), opacity .25s;
      opacity: 0;
    }
    #notifConfirmModal.show #notifConfirmBox {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    .ncm-stripe { height: 5px; }
    .ncm-body { padding: 1.8rem 1.8rem 1.2rem; text-align: center; }
    .ncm-icon {
      width: 68px; height: 68px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem; font-size: 1.8rem;
    }
    .ncm-title { font-size: 1.15rem; font-weight: 800; color: #1a202c; margin-bottom: .4rem; }
    .ncm-msg { font-size: .88rem; color: #4a5568; line-height: 1.6; }
    .ncm-footer { padding: .5rem 1.5rem 1.5rem; display: flex; justify-content: center; }
    .ncm-btn {
      padding: .7rem 2.2rem; border-radius: 10px;
      color: #fff; border: none; font-weight: 700;
      font-size: .9rem; cursor: pointer;
      transition: opacity .2s, transform .2s;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .ncm-btn:hover { opacity: .88; transform: translateY(-1px); }
  `;
  document.head.appendChild(s);
})();

/* ── Override renderOrdersTable ──────────────────────────── */
window.renderOrdersTable = function(list) {
  list = list || allOrders;
  const tbody = document.getElementById('ordersTable');
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-shopping-bag"></i><p>No orders found.</p></div></td></tr>';
    return;
  }

  const sorted = [...list].sort((a, b) =>
    new Date(b.createdAt || b.orderDate || 0) - new Date(a.createdAt || a.orderDate || 0)
  );

  tbody.innerHTML = sorted.map(o => {
    const cust = o.customer?.firstName
      ? `${o.customer.firstName} ${o.customer.lastName || ''}`.trim()
      : (typeof o.customer === 'string' ? o.customer : 'Customer');

    const st = (o.status || 'pending').toLowerCase();
    const itemsStr = Array.isArray(o.items)
      ? o.items.map(i => `${i.name || 'Item'} ×${i.quantity || 1}`).join(', ')
      : '—';

    const userId = o.userId || '';
    const displayId = o.orderId || o.id || '';

    const options = PATCH_STATUS_LIST.map(s =>
      `<option value="${s}" ${s === st ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join('');

    return `<tr>
      <td style="font-weight:700;font-size:.82rem">${displayId}</td>
      <td>${cust}</td>
      <td style="font-size:.78rem;color:var(--mu);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${itemsStr}</td>
      <td style="font-weight:700;color:var(--suc)">$${getOrderTotal(o).toFixed(2)}</td>
      <td>
        <select class="status-dropdown status-${st}"
          onchange="patchUpdateOrderStatus('${o.id}', this.value, '${userId}', '${displayId}', this)">
          ${options}
        </select>
      </td>
      <td style="font-size:.8rem;color:var(--mu)">${fmtDate(o.createdAt || o.orderDate)}</td>
    </tr>`;
  }).join('');
};

/* Also update table header to include the Status column properly */
(function fixTableHeader() {
  const thead = document.querySelector('#section-orders table thead tr');
  if (thead) {
    thead.innerHTML = `
      <th>Order ID</th>
      <th>Customer</th>
      <th>Items</th>
      <th>Total</th>
      <th>Update Status</th>
      <th>Date</th>
    `;
  }
})();

/* ── Update order status via API ─────────────────────────── */
window.patchUpdateOrderStatus = async function(orderId, newStatus, userId, displayOrderId, selectEl) {
  const prevStatus = allOrders.find(o => o.id === orderId || o.orderId === orderId)?.status || 'pending';

  // Optimistic: update dropdown color immediately
  if (selectEl) {
    selectEl.className = `status-dropdown status-${newStatus}`;
  }

  try {
    /* 1 ── PATCH the orders API */
    const res = await fetch(`${ORDERS_API}/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('API error ' + res.status);

    /* 2 ── Update local array */
    const idx = allOrders.findIndex(o => o.id === orderId || o.orderId === orderId);
    if (idx >= 0) allOrders[idx].status = newStatus;

    /* 3 ── Push notification to user */
    if (userId && userId !== '' && prevStatus !== newStatus) {
      patchPushNotification(userId, displayOrderId || orderId, newStatus);
    }

    toast(`Order #${displayOrderId} → ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`);

  } catch (err) {
    toast('Failed to update status: ' + err.message, true);
    // Revert dropdown
    if (selectEl) {
      selectEl.value = prevStatus;
      selectEl.className = `status-dropdown status-${prevStatus}`;
    }
    const idx = allOrders.findIndex(o => o.id === orderId || o.orderId === orderId);
    if (idx >= 0) allOrders[idx].status = prevStatus;
  }
};

/* ── Push notification into user's localStorage ─────────── */
function patchPushNotification(userId, orderId, newStatus) {
  const meta = PATCH_STATUS_META[newStatus] || PATCH_STATUS_META.pending;

  const notification = {
    id:        'notif_' + Date.now(),
    text:      `Order <strong>#${orderId}</strong> status updated to <strong>${meta.label}</strong>. ${getStatusMessage(newStatus)}`,
    time:      new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    icon:      meta.icon,
    color:     meta.color,
    read:      false,
    orderId:   String(orderId),
    status:    newStatus,
    createdAt: new Date().toISOString(),
  };

  /* Write to user_data_<userId> */
  try {
    const key = `user_data_${userId}`;
    const userData = JSON.parse(localStorage.getItem(key) || '{}');
    if (!Array.isArray(userData.notifications)) userData.notifications = [];
    userData.notifications.unshift(notification);
    if (userData.notifications.length > 50) userData.notifications = userData.notifications.slice(0, 50);
    localStorage.setItem(key, JSON.stringify(userData));

    /* Also sync ecommerce_current_user if it's the same user */
    try {
      const legacyRaw = localStorage.getItem('ecommerce_current_user');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy && String(legacy.id) === String(userId)) {
          if (!Array.isArray(legacy.notifications)) legacy.notifications = [];
          legacy.notifications.unshift(notification);
          localStorage.setItem('ecommerce_current_user', JSON.stringify(legacy));
        }
      }
    } catch(e) {}

  } catch(e) {
    console.warn('[Admin Patch] Could not write notification:', e);
  }

  /* Show confirmation popup in admin */
  showNotifConfirm(orderId, newStatus, meta);
}

function getStatusMessage(status) {
  const msgs = {
    pending:    'Your order has been received and is pending review.',
    processing: 'Great news! Your order is now being processed.',
    shipped:    'Your order is on its way! It has been shipped.',
    delivered:  'Your order has been delivered. Enjoy your purchase!',
    cancelled:  'Unfortunately, your order has been cancelled.',
  };
  return msgs[status] || '';
}

/* ── Show confirmation popup ─────────────────────────────── */
function showNotifConfirm(orderId, status, meta) {
  /* Remove old modal if exists */
  document.getElementById('notifConfirmModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'notifConfirmModal';
  modal.innerHTML = `
    <div id="notifConfirmBox">
      <div class="ncm-stripe" style="background:linear-gradient(90deg,${meta.color},${meta.color}88);"></div>
      <div class="ncm-body">
        <div class="ncm-icon" style="background:${meta.bg};color:${meta.color};">
          <i class="fas ${meta.icon}"></i>
        </div>
        <div class="ncm-title">Notification Sent! 🔔</div>
        <div class="ncm-msg">
          Order <strong>#${orderId}</strong> has been updated to
          <strong style="color:${meta.color};">${meta.label}</strong>.<br>
          The customer will see this notification in their dashboard next time they open it.
        </div>
      </div>
      <div class="ncm-footer">
        <button class="ncm-btn" style="background:${meta.color};"
          onclick="document.getElementById('notifConfirmModal').remove()">
          <i class="fas fa-check"></i> Got it
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  /* Animate in */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    modal.classList.add('show');
  }));

  /* Close on backdrop click */
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.remove();
  });

  /* Auto close after 4s */
  setTimeout(() => {
    if (document.getElementById('notifConfirmModal')) modal.remove();
  }, 4000);
}