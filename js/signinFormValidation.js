/**
 * ═══════════════════════════════════════════════════════════════
 *  signinFormValidation.js
 *  Amazino Sign-In Page Logic
 *
 *  Requires: auth.js (must be loaded BEFORE this file)
 *
 *  Features:
 *   - Form validation
 *   - Login via AUTH.login() → API verification
 *   - Role-based redirect after login
 *   - Remember Me
 *   - Auto-redirect if already logged in
 *   - Forgot Password (OTP via EmailJS)
 *   - Password eye toggle
 * ═══════════════════════════════════════════════════════════════
 */

/* ── Role → dashboard map ──────────────────────────────────── */
const ROLE_REDIRECT = {
  seller:   'seller-dashboard.html',
  admin:    'admin-dashboard.html',
  buyer:    'customer-dashboard.html',
  customer: 'customer-dashboard.html',
  user:     'customer-dashboard.html',
};

function getDashboard(role) {
  return ROLE_REDIRECT[(role || '').toLowerCase()] || 'customer-dashboard.html';
}

/* ── Auto-redirect if already logged in ────────────────────── */
(function checkAlreadyLoggedIn() {
  const sess = (typeof AUTH !== 'undefined') && AUTH.getSession();
  if (sess) {
    // Already logged in → go to home, not directly to dashboard
    window.location.replace('index.html');
  }
})();

/* ── DOM refs ──────────────────────────────────────────────── */
const emailInput    = document.getElementById('validationCustomUsername');
const passwordInput = document.getElementById('password');
const alertMsg      = document.getElementById('alertmsg');
const rememberChk   = document.getElementById('invalidCheck');
const forgetLink    = document.querySelector('.forgetlink');
const submitBtn     = document.querySelector('button[type="submit"]');

/* ── OTP / Forget Password state ───────────────────────────── */
const REMEMBER_KEY = 'amazino_remember_me';
let isOtpSent    = false;
let generatedOTP = '';
let targetEmail  = '';

/* ─────────────────────────────────────────────────────────────
   FORM VALIDATION HELPERS
───────────────────────────────────────────────────────────── */
function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((val || '').trim());
}

emailInput.addEventListener('input', () => {
  if (!isValidEmail(emailInput.value)) {
    emailInput.classList.add('is-invalid');
    emailInput.setCustomValidity('invalid');
  } else {
    emailInput.classList.remove('is-invalid');
    emailInput.setCustomValidity('');
  }
});

passwordInput.addEventListener('input', () => {
  if (!passwordInput.value) {
    passwordInput.setCustomValidity('invalid');
  } else {
    passwordInput.setCustomValidity('');
    alertMsg.classList.add('d-none');
  }
});

/* ─────────────────────────────────────────────────────────────
   REMEMBER ME — pre-fill on load
───────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const remembered = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
  if (remembered && remembered.email) {
    emailInput.value    = remembered.email;
    passwordInput.value = remembered.password || '';
    if (rememberChk) rememberChk.checked = true;
  }
});

/* ─────────────────────────────────────────────────────────────
   FORM SUBMIT — main login flow
───────────────────────────────────────────────────────────── */
document.querySelectorAll('.needs-validation').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertMsg.classList.add('d-none');

    // HTML5 validation
    if (!form.checkValidity() || !isValidEmail(emailInput.value) || !passwordInput.value) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    // Show loading state
    const origHtml  = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in…';
    submitBtn.disabled  = true;

    try {
      // AUTH.login → verifies with API, creates session, inits localStorage
      const user = await AUTH.login(email, password);

      // Remember Me
      if (rememberChk && rememberChk.checked) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      // Redirect to home page — user can go to their dashboard from the navbar
      window.location.href = 'index.html';

    } catch (err) {
      submitBtn.innerHTML = origHtml;
      submitBtn.disabled  = false;

      const msg = err.message || 'Connection error — please try again.';
      alertMsg.textContent = msg.includes('Invalid') ? 'Invalid email or password. Please try again!' : msg;
      alertMsg.classList.remove('d-none');

      passwordInput.value = '';
      passwordInput.setCustomValidity('invalid');
      passwordInput.classList.add('is-invalid');
      emailInput.classList.add('is-invalid');
      form.classList.add('was-validated');
    }
  }, false);
});

/* ─────────────────────────────────────────────────────────────
   PASSWORD EYE TOGGLE
───────────────────────────────────────────────────────────── */
const togglePwBtn = document.getElementById('togglePassword');
if (togglePwBtn) {
  togglePwBtn.addEventListener('click', () => {
    const isPass = passwordInput.type === 'password';
    passwordInput.type = isPass ? 'text' : 'password';
    togglePwBtn.className = isPass
      ? 'pe-3 bi bi-eye-slash position-absolute top-50 end-0 translate-middle-y me-3'
      : 'pe-3 bi bi-eye position-absolute top-50 end-0 translate-middle-y me-3';
  });
}

/* ─────────────────────────────────────────────────────────────
   FORGOT PASSWORD — OTP FLOW (EmailJS)
───────────────────────────────────────────────────────────── */
const otpModalEl  = document.getElementById('otpModal');
const verifyBtn   = document.getElementById('verifyBtn');
const otpInput    = document.getElementById('otpInput');
const otpError    = document.getElementById('otpError');
const otpSuccess  = document.getElementById('otpSuccess');
const emailNotExist = document.getElementById('emailNotExist');
const modalBodyP  = document.querySelector('.modal-body p');

let bsOtpModal = null;
if (otpModalEl && typeof bootstrap !== 'undefined') {
  bsOtpModal = new bootstrap.Modal(otpModalEl);
}

if (forgetLink) {
  forgetLink.addEventListener('click', e => {
    e.preventDefault();
    // Reset modal state
    isOtpSent    = false;
    generatedOTP = '';
    targetEmail  = '';
    if (modalBodyP) modalBodyP.textContent = 'Enter your email';
    otpInput.type        = 'email';
    otpInput.placeholder = 'Enter email address';
    otpInput.value       = '';
    if (verifyBtn) { verifyBtn.textContent = 'Apply'; verifyBtn.disabled = false; }
    [otpError, otpSuccess, emailNotExist].forEach(el => { if (el) el.classList.add('d-none'); });
    otpInput.classList.remove('is-invalid');
    if (bsOtpModal) bsOtpModal.show();
  });
}

if (verifyBtn) {
  verifyBtn.addEventListener('click', async () => {
    [otpError, otpSuccess, emailNotExist].forEach(el => { if (el) el.classList.add('d-none'); });
    otpInput.classList.remove('is-invalid');

    if (!isOtpSent) {
      /* ── Step 1: verify email exists in API, then send OTP ── */
      const entered = otpInput.value.trim();
      if (!isValidEmail(entered)) { otpInput.classList.add('is-invalid'); return; }

      verifyBtn.disabled    = true;
      verifyBtn.textContent = 'Checking…';

      try {
        const res   = await fetch(API_URL);
        const users = await res.json();
        const user  = users.find(u => (u.email || '').toLowerCase() === entered.toLowerCase());

        if (!user) {
          verifyBtn.disabled    = false;
          verifyBtn.textContent = 'Apply';
          if (emailNotExist) emailNotExist.classList.remove('d-none');
          return;
        }

        generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
        targetEmail  = user.email;

        verifyBtn.textContent = 'Sending…';

        emailjs.send('service_elxefnw', 'template_1o90chi', {
          to_email: user.email,
          code:     generatedOTP,
          name:     user.firstName || user.name || 'User',
        }).then(
          () => {
            verifyBtn.disabled = false;
            if (otpSuccess) { otpSuccess.textContent = 'Code sent to your email!'; otpSuccess.classList.remove('d-none'); }
            _switchToOtpEntry();
          },
          () => {
            verifyBtn.disabled    = false;
            verifyBtn.textContent = 'Apply';
            if (otpError) { otpError.textContent = 'Failed to send email. Please try again.'; otpError.classList.remove('d-none'); }
          }
        );

      } catch (err) {
        verifyBtn.disabled    = false;
        verifyBtn.textContent = 'Apply';
        if (otpError) { otpError.textContent = 'Connection error — please try again.'; otpError.classList.remove('d-none'); }
      }

    } else {
      /* ── Step 2: verify entered code ── */
      const entered = otpInput.value.trim();
      if (entered === generatedOTP) {
        localStorage.setItem('emailForReset', targetEmail);
        if (bsOtpModal) bsOtpModal.hide();
        window.location.href = 'forgetPassword.html';
      } else {
        if (otpError) { otpError.textContent = 'Invalid code. Please try again.'; otpError.classList.remove('d-none'); }
      }
    }
  });
}

function _switchToOtpEntry() {
  isOtpSent             = true;
  otpInput.value        = '';
  otpInput.type         = 'text';
  otpInput.placeholder  = 'Enter 4-digit code';
  otpInput.maxLength    = 4;
  if (modalBodyP) modalBodyP.textContent = 'Enter the verification code';
  if (verifyBtn) { verifyBtn.textContent = 'Verify Code'; verifyBtn.disabled = false; }
}