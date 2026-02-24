// ========== Navbar Scroll Effect ==========
const navbar = document.getElementById("mainNavbar");

if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 80) {
      navbar.classList.add("navbar-scrolled");
    } else {
      navbar.classList.remove("navbar-scrolled");
    }
  });
}

// ========== Mobile Nav Toggle ==========
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");
const navOverlay = document.getElementById("navOverlay");

function closeNav() {
  navToggle?.classList.remove("active");
  navMenu?.classList.remove("open");
  navOverlay?.classList.remove("active");
  document.body.style.overflow = "";
}

if (navToggle && navMenu && navOverlay) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.contains("open");
    if (isOpen) {
      closeNav();
    } else {
      navToggle.classList.add("active");
      navMenu.classList.add("open");
      navOverlay.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  });

  navOverlay.addEventListener("click", closeNav);

  // Close nav when a link is clicked (mobile)
  navMenu.querySelectorAll(".sp-navbar__link").forEach((link) => {
    link.addEventListener("click", closeNav);
  });
}
