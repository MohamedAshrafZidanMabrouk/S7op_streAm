/**
 * customer_notifications_patch.js - FINAL FIXED VERSION
 * يضمن إن لما تضغط على Notifications يحصل حاجة واضحة
 */

(function() {
    console.log('%c🛎️ Notification Patch v2 Loaded', 'color:#7c1d7c;font-weight:bold');

    // ── تحديث البادج ─────────────────────────────────────
    function updateNotifBadge() {
        if (!CU || !Array.isArray(CU.notifications)) {
            CU.notifications = [];
        }
        const unread = CU.notifications.filter(n => !n.read).length;

        const navItem = document.querySelector('.nav-item[onclick*="notifications"]');
        if (!navItem) return;

        let wrap = navItem.querySelector('.notif-bell-wrap');
        if (!wrap) {
            wrap = document.createElement('span');
            wrap.className = 'notif-bell-wrap';
            const icon = navItem.querySelector('i.fa-bell');
            if (icon) icon.parentNode.insertBefore(wrap, icon);
            wrap.appendChild(icon);
        }

        let badge = wrap.querySelector('.notif-badge');
        if (unread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notif-badge';
                wrap.appendChild(badge);
            }
            badge.textContent = unread > 9 ? '9+' : unread;
        } else if (badge) {
            badge.remove();
        }
    }

    // ── Toast جميل ───────────────────────────────────────
    function showNotifToast(msg) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position:fixed; top:20px; right:20px; background:#fff; border-radius:16px;
            box-shadow:0 20px 50px rgba(0,0,0,0.2); padding:16px 20px; max-width:340px;
            display:flex; gap:12px; z-index:99999; animation:notifPop 0.4s;
        `;
        toast.innerHTML = `
            <div style="width:42px;height:42px;background:#7c1d7c20;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;font-size:1.3rem;">🛎️</div>
            <div>
                <div style="font-weight:700;color:#1a202c;">Notification</div>
                <div style="font-size:0.9rem;color:#4a5568;margin-top:4px;">${msg}</div>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'all 0.4s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    // ── Mark all as read + تحديث واضح ─────────────────────
    function markAllAsRead() {
        if (!CU || !Array.isArray(CU.notifications)) return;

        let changed = false;
        CU.notifications.forEach(n => {
            if (!n.read) {
                n.read = true;
                changed = true;
            }
        });

        if (changed) {
            saveUser();
            updateNotifBadge();
            console.log('%c✅ All notifications marked as read', 'color:#38a169');
        }
    }

    // ── تعديل loadNotifications ───────────────────────────
    const originalLoad = window.loadNotifications;
    window.loadNotifications = function() {
        if (typeof originalLoad === 'function') originalLoad();

        // إجبار على وجود مصفوفة
        if (!CU.notifications) CU.notifications = [];

        // Mark as read
        markAllAsRead();

        // إظهار رسالة واضحة لو مفيش إشعارات
        const list = document.getElementById('notifList');
        if (list && CU.notifications.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#7c1d7c;">
                    <i class="fas fa-bell" style="font-size:3rem;opacity:0.2;margin-bottom:16px;"></i>
                    <p style="font-weight:600;">No new notifications</p>
                    <p style="font-size:0.85rem;color:#888;">You're all caught up! ✅</p>
                </div>`;
        }
    };

    // ── تعديل go() عشان يشتغل لما تضغط Notifications ───────
    const originalGo = window.go;
    window.go = function(name) {
        if (typeof originalGo === 'function') originalGo(name);

        if (name === 'notifications') {
            setTimeout(() => {
                window.loadNotifications();
                updateNotifBadge();
                showNotifToast('You are now in Notifications');
            }, 100);
        }
    };

    // ── بدء التشغيل ───────────────────────────────────────
    function init() {
        if (typeof CU === 'undefined') {
            setTimeout(init, 1000);
            return;
        }
        updateNotifBadge();
        console.log('%c🛎️ Notifications system is ready!', 'color:#7c1d7c;font-weight:bold');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();