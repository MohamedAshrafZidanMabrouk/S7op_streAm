
(function () {
  'use strict';

  /* ── Inject CSS once ──────────────────────────────────────── */
  if (!document.getElementById('swal-styles')) {
    const style = document.createElement('style');
    style.id = 'swal-styles';
    style.textContent = `
      :root {
        --swal-main: rgb(124,29,124);
        --swal-main-lt: rgba(124,29,124,.1);
        --swal-main-dk: rgb(94,14,94);
        --swal-r: 20px;
        --swal-t: .22s ease;
      }

      /* Overlay */
      #swal-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(0,0,0,.45);
        backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        opacity: 0; transition: opacity .25s ease;
      }
      #swal-overlay.swal-show { opacity: 1; }

      /* Box */
      #swal-box {
        background: #fff;
        border-radius: var(--swal-r);
        padding: 0;
        max-width: 420px; width: 100%;
        box-shadow: 0 24px 64px rgba(0,0,0,.22);
        transform: scale(.85) translateY(24px);
        transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .25s ease;
        opacity: 0;
        overflow: hidden;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      }
      #swal-overlay.swal-show #swal-box {
        transform: scale(1) translateY(0);
        opacity: 1;
      }

      /* Icon stripe */
      .swal-stripe {
        height: 6px;
        width: 100%;
      }
      .swal-stripe.success { background: linear-gradient(90deg,#38a169,#68d391); }
      .swal-stripe.error   { background: linear-gradient(90deg,#e53e3e,#fc8181); }
      .swal-stripe.warning { background: linear-gradient(90deg,#d69e2e,#f6e05e); }
      .swal-stripe.info    { background: linear-gradient(90deg,#3182ce,#63b3ed); }
      .swal-stripe.confirm { background: linear-gradient(90deg,var(--swal-main),#c050c0); }

      /* Body */
      .swal-body {
        padding: 2rem 2rem 1.5rem;
        text-align: center;
      }

      /* Icon circle */
      .swal-icon-wrap {
        width: 72px; height: 72px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 1.2rem;
        font-size: 2rem;
      }
      .swal-icon-wrap.success { background:#f0fff4; color:#38a169; }
      .swal-icon-wrap.error   { background:#fff5f5; color:#e53e3e; }
      .swal-icon-wrap.warning { background:#fffbeb; color:#d69e2e; }
      .swal-icon-wrap.info    { background:#ebf8ff; color:#3182ce; }
      .swal-icon-wrap.confirm { background:var(--swal-main-lt); color:var(--swal-main); }

      /* Bounce animation for icon */
      @keyframes swalIconBounce {
        0%   { transform: scale(0) rotate(-10deg); }
        60%  { transform: scale(1.2) rotate(4deg); }
        100% { transform: scale(1) rotate(0); }
      }
      #swal-overlay.swal-show .swal-icon-wrap { animation: swalIconBounce .45s cubic-bezier(.34,1.56,.64,1) .1s both; }

      .swal-title {
        font-size: 1.25rem; font-weight: 800;
        color: #1a202c; margin-bottom: .55rem;
        line-height: 1.3;
      }
      .swal-message {
        font-size: .92rem; color: #4a5568;
        line-height: 1.6; margin: 0;
      }
      .swal-message a { color: var(--swal-main); font-weight: 600; }

      /* Footer */
      .swal-footer {
        padding: .5rem 1.5rem 1.5rem;
        display: flex; gap: .75rem; justify-content: center;
      }

      /* Buttons */
      .swal-btn {
        padding: .7rem 1.8rem; border-radius: 10px;
        font-weight: 700; font-size: .92rem; cursor: pointer;
        border: none; transition: transform var(--swal-t), box-shadow var(--swal-t), background var(--swal-t);
        display: inline-flex; align-items: center; gap: .4rem;
        min-width: 100px; justify-content: center;
      }
      .swal-btn:hover  { transform: translateY(-2px); }
      .swal-btn:active { transform: translateY(0); }

      .swal-btn-ok {
        background: var(--swal-main); color: #fff;
        box-shadow: 0 4px 14px rgba(124,29,124,.3);
      }
      .swal-btn-ok:hover { background: var(--swal-main-dk); box-shadow: 0 6px 20px rgba(124,29,124,.4); }

      .swal-btn-ok.success { background: #38a169; box-shadow: 0 4px 14px rgba(56,161,105,.3); }
      .swal-btn-ok.success:hover { background: #276749; }

      .swal-btn-ok.error { background: #e53e3e; box-shadow: 0 4px 14px rgba(229,62,62,.3); }
      .swal-btn-ok.error:hover { background: #c53030; }

      .swal-btn-ok.warning { background: #d69e2e; box-shadow: 0 4px 14px rgba(214,158,46,.3); }
      .swal-btn-ok.warning:hover { background: #b7791f; }

      .swal-btn-ok.info { background: #3182ce; box-shadow: 0 4px 14px rgba(49,130,206,.3); }
      .swal-btn-ok.info:hover { background: #2b6cb0; }

      .swal-btn-cancel {
        background: #f7fafc; color: #4a5568;
        border: 1.5px solid #e2e8f0;
      }
      .swal-btn-cancel:hover { background: #edf2f7; }

      /* Error list inside message */
      .swal-error-list {
        text-align: left; margin: .8rem 0 0;
        padding: 0; list-style: none;
        display: flex; flex-direction: column; gap: 6px;
      }
      .swal-error-list li {
        display: flex; align-items: center; gap: 8px;
        font-size: .84rem; color: #e53e3e;
        background: #fff5f5; border-radius: 8px;
        padding: 6px 10px;
      }
      .swal-error-list li i { font-size: .7rem; flex-shrink: 0; }

      /* Shake on error */
      @keyframes swalShake {
        0%,100% { transform: translateX(0); }
        20%,60%  { transform: translateX(-8px); }
        40%,80%  { transform: translateX(8px); }
      }
      #swal-box.swal-shake { animation: swalShake .4s ease; }

      /* Progress bar for auto-close */
      .swal-progress {
        height: 3px; background: rgba(0,0,0,.08);
        width: 100%; overflow: hidden;
      }
      .swal-progress-bar {
        height: 100%; width: 100%;
        transition: width linear;
      }
      .swal-progress-bar.success { background: #38a169; }
      .swal-progress-bar.error   { background: #e53e3e; }
      .swal-progress-bar.warning { background: #d69e2e; }
      .swal-progress-bar.info    { background: #3182ce; }
      .swal-progress-bar.confirm { background: var(--swal-main); }
    `;
    document.head.appendChild(style);
  }

  /* ── Build DOM once ───────────────────────────────────────── */
  function getOrCreateOverlay() {
    let ov = document.getElementById('swal-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'swal-overlay';
      ov.innerHTML = `<div id="swal-box"></div>`;
      document.body.appendChild(ov);
      // Click outside to close (only for non-confirm)
      ov.addEventListener('click', function (e) {
        if (e.target === ov && window._swalDismissOnBackdrop) {
          window._swalResolve && window._swalResolve(false);
          closeSwal();
        }
      });
    }
    return ov;
  }

  function closeSwal() {
    const ov = document.getElementById('swal-overlay');
    if (!ov) return;
    ov.classList.remove('swal-show');
    setTimeout(() => ov.remove(), 280);
  }

  const ICONS = {
    success: 'fas fa-check-circle',
    error:   'fas fa-times-circle',
    warning: 'fas fa-exclamation-triangle',
    info:    'fas fa-info-circle',
    confirm: 'fas fa-question-circle',
  };

  /**
   * window.Swal.fire({ type, title, message, confirmText, cancelText, errorList, autoClose })
   * Returns a Promise<boolean> (true = confirm, false = cancel/close)
   */
  function fire(opts = {}) {
    return new Promise(resolve => {
      const {
        type          = 'info',
        title         = '',
        message       = '',
        confirmText   = 'OK',
        cancelText    = null,
        errorList     = null,   // array of strings
        autoClose     = 0,      // ms, 0 = no auto-close
      } = opts;

      window._swalResolve = resolve;
      window._swalDismissOnBackdrop = !cancelText;

      const ov  = getOrCreateOverlay();
      const box = ov.querySelector('#swal-box');

      let errorListHTML = '';
      if (errorList && errorList.length) {
        errorListHTML = `<ul class="swal-error-list">${
          errorList.map(e => `<li><i class="fas fa-circle-exclamation"></i>${e}</li>`).join('')
        }</ul>`;
      }

      let progressHTML = '';
      if (autoClose > 0) {
        progressHTML = `
          <div class="swal-progress">
            <div class="swal-progress-bar ${type}" id="swal-progress-bar" style="width:100%"></div>
          </div>`;
      }

      box.innerHTML = `
        <div class="swal-stripe ${type}"></div>
        <div class="swal-body">
          <div class="swal-icon-wrap ${type}">
            <i class="${ICONS[type] || ICONS.info}"></i>
          </div>
          <div class="swal-title">${title}</div>
          ${message ? `<p class="swal-message">${message}${errorListHTML}</p>` : (errorListHTML ? `<div class="swal-message">${errorListHTML}</div>` : '')}
        </div>
        <div class="swal-footer">
          ${cancelText ? `<button class="swal-btn swal-btn-cancel" id="swal-cancel">${cancelText}</button>` : ''}
          <button class="swal-btn swal-btn-ok ${type}" id="swal-confirm">
            <i class="${ICONS[type]}"></i> ${confirmText}
          </button>
        </div>
        ${progressHTML}
      `;

      // Wire buttons
      box.querySelector('#swal-confirm').onclick = () => {
        resolve(true);
        closeSwal();
      };
      const cancelBtn = box.querySelector('#swal-cancel');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          resolve(false);
          closeSwal();
        };
      }

      // ESC key
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          resolve(false);
          closeSwal();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      // Shake on error
      if (type === 'error') {
        requestAnimationFrame(() => {
          box.classList.add('swal-shake');
          setTimeout(() => box.classList.remove('swal-shake'), 450);
        });
      }

      // Show
      document.body.appendChild(ov);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { ov.classList.add('swal-show'); });
      });

      // Auto-close with progress
      if (autoClose > 0) {
        const bar = box.querySelector('#swal-progress-bar');
        if (bar) {
          setTimeout(() => { bar.style.transition = `width ${autoClose}ms linear`; bar.style.width = '0%'; }, 50);
        }
        setTimeout(() => { resolve(true); closeSwal(); }, autoClose);
      }
    });
  }

  /* ── Quick helpers ────────────────────────────────────────── */
  const Swal = {
    fire,
    success: (title, msg, opts={}) => fire({ type:'success', title, message:msg, ...opts }),
    error:   (title, msg, opts={}) => fire({ type:'error',   title, message:msg, ...opts }),
    warning: (title, msg, opts={}) => fire({ type:'warning', title, message:msg, ...opts }),
    info:    (title, msg, opts={}) => fire({ type:'info',    title, message:msg, ...opts }),
    confirm: (title, msg, opts={}) => fire({ type:'confirm', title, message:msg, confirmText:'Yes', cancelText:'Cancel', ...opts }),
  };

  window.Swal = Swal;

  /* ── Override native alert() ──────────────────────────────── */
  window._nativeAlert = window.alert;
  window.alert = function (msg) {
    if (!msg) return;
    const lower = String(msg).toLowerCase();
    let type = 'info', title = 'Notice';
    if (lower.includes('error') || lower.includes('fail') || lower.includes('invalid') ||
        lower.includes('could not') || lower.includes('خطأ') || lower.includes('حدث خطأ')) {
      type = 'error'; title = 'Oops!';
    } else if (lower.includes('success') || lower.includes('saved') || lower.includes('added') ||
               lower.includes('placed') || lower.includes('تم')) {
      type = 'success'; title = 'Done!';
    } else if (lower.includes('warn') || lower.includes('cannot') || lower.includes('empty') ||
               lower.includes('please') || lower.includes('fix') || lower.includes('missing')) {
      type = 'warning'; title = 'Hold on!';
    }
    Swal.fire({ type, title, message: String(msg).replace(/\n/g,'<br>') });
  };

  /* ── Override native confirm() ────────────────────────────── */
  window._nativeConfirm = window.confirm;
  window.confirm = function (msg) {
    // confirm() is synchronous, so we show the modal and return true immediately
    // but also open the real async dialog for UX. For blocking callers, return true.
    Swal.confirm('Are you sure?', String(msg).replace(/\n/g,'<br>'));
    return true;
  };

})();