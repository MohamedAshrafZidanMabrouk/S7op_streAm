/**
 * passwordEyeToggle.js — Amazino
 * Works on signin.html (1 field) and signup.html (1 field).
 * Wrapped in DOMContentLoaded and null-safe.
 */
document.addEventListener('DOMContentLoaded', function () {

  // ── Helper: wire one icon to one input ──────────────────
  function bindToggle(iconId, fieldId) {
    var icon  = document.getElementById(iconId);
    var field = document.getElementById(fieldId);
    if (!icon || !field) return;   // element doesn't exist on this page — skip

    icon.addEventListener('click', function () {
      var isHidden = field.type === 'password';
      field.type = isHidden ? 'text' : 'password';
      // toggle Bootstrap Icons classes
      this.classList.toggle('bi-eye',       !isHidden);
      this.classList.toggle('bi-eye-slash',  isHidden);
    });
  }

  bindToggle('togglePassword',   'password');    // signin & signup
  bindToggle('toggleRePassword', 'rePassword');  // signup only — safely ignored on signin

});