/**
 * footer.js — Amazino Shared Footer (matches home page exactly)
 * Injects the full footer HTML into #footer-container
 */
(function() {
  'use strict';

  function injectFooter() {
    var container = document.getElementById('footer-container');
    if (!container) return;

    container.innerHTML = [
      '<section class="section-bg text-white text-center py-5">',
      '  <div class="container-fluid">',
      '    <div class="row text-start justify-content-center p-5 gx-4">',

      '      <div class="col-12 col-md-12 col-lg-4 mb-2 mb-lg-0">',
      '        <div class="d-flex align-items-center mb-3">',
      '          <img src="assets/logo1.png" alt="Amazino" width="39" height="39" class="d-inline-block align-text-top mx-2 rounded-2" onerror="this.src=\'logo1.png\';this.onerror=null;">',
      '          <h2 class="fw-bold mb-0">Amazino</h2>',
      '        </div>',
      '        <p>Amazino helps you turn your home into a dream oasis through expert selection, design, and implementation of furniture, decor, and smart solutions.</p>',
      '        <a href="#" class="text-decoration-none"><i class="bi bi-facebook text-white fs-4 mx-2"></i></a>',
      '        <a href="#" class="text-decoration-none"><i class="bi bi-twitter text-white fs-4 mx-2"></i></a>',
      '        <a href="#" class="text-decoration-none"><i class="bi bi-pinterest text-white fs-4 mx-2"></i></a>',
      '        <a href="#" class="text-decoration-none"><i class="bi bi-instagram text-white fs-4 mx-2"></i></a>',
      '        <a href="#" class="text-decoration-none"><i class="bi bi-youtube text-white fs-4 mx-2"></i></a>',
      '      </div>',

      '      <div class="col-6 col-lg-2 mb-2 mb-lg-0">',
      '        <h4 class="fw-bold">Company</h4>',
      '        <ul class="list-unstyled">',
      '          <li class="mt-2"><a href="about.html" class="text-white text-decoration-none">About Us</a></li>',
      '          <li class="mt-2"><a href="blog.html" class="text-white text-decoration-none">Blog</a></li>',
      '          <li class="mt-2"><a href="contact.html" class="text-white text-decoration-none">Contact Us</a></li>',
      '          <li class="mt-2"><a href="#" class="text-white text-decoration-none">Careers</a></li>',
      '        </ul>',
      '      </div>',

      '      <div class="col-6 col-lg-2 mb-2 mb-lg-0">',
      '        <h4 class="fw-bold">Customer Service</h4>',
      '        <ul class="list-unstyled">',
      '          <li class="mt-2"><a href="customer-dashboard.html" class="text-white text-decoration-none">My Account</a></li>',
      '          <li class="mt-2"><a href="Track_Order.html" class="text-white text-decoration-none">Track Order</a></li>',
      '          <li class="mt-2"><a href="#" class="text-white text-decoration-none">Returns</a></li>',
      '          <li class="mt-2"><a href="#" class="text-white text-decoration-none">FAQs</a></li>',
      '        </ul>',
      '      </div>',

      '      <div class="col-6 col-lg-2 mb-2 mb-lg-0">',
      '        <h4 class="fw-bold">Information</h4>',
      '        <ul class="list-unstyled">',
      '          <li class="mt-2"><a href="#" class="text-white text-decoration-none">Privacy Policy</a></li>',
      '          <li class="mt-2"><a href="#" class="text-white text-decoration-none">Terms &amp; Conditions</a></li>',
      '          <li class="mt-2"><a href="#" class="text-white text-decoration-none">Refund Policy</a></li>',
      '        </ul>',
      '      </div>',

      '      <div class="col-6 col-lg-2 mb-2 mb-lg-0">',
      '        <h4 class="fw-bold">Contact Us</h4>',
      '        <p><i class="bi bi-telephone mx-2"></i> +1 234 567 890</p>',
      '        <p><i class="bi bi-envelope mx-2"></i><a href="mailto:info@amazino.com" class="text-white text-decoration-none">info@amazino.com</a></p>',
      '        <p><i class="bi bi-geo-alt mx-2"></i>123 Main Street, Anytown, USA</p>',
      '      </div>',

      '    </div>',
      '  </div>',
      '</section>',
      '<footer style="background:#F5F5F5;" class="text-center py-4">',
      '  <p style="font-weight:bold;font-size:14px;color:rgb(124,29,124);margin:0;">&#169; 2026 Amazino. All rights reserved.</p>',
      '</footer>'
    ].join('\n');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooter);
  } else {
    injectFooter();
  }
})();