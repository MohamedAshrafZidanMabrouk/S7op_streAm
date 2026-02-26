// ========== Navbar Scroll Effect ==========
let navbar = null;

// ========== Mobile Nav Toggle ==========
let navToggle = null;
let navMenu = null;
let navOverlay = null;

function initNavbar() {
  navbar = document.getElementById("mainNavbar");
  navToggle = document.getElementById("navToggle");
  navMenu = document.getElementById("navMenu");
  navOverlay = document.getElementById("navOverlay");

  if (navbar && !navbar.dataset.scrollBound) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 80) {
        navbar.classList.add("navbar-scrolled");
      } else {
        navbar.classList.remove("navbar-scrolled");
      }
    });

    navbar.dataset.scrollBound = "true";
  }

  if (navToggle && navMenu && navOverlay && !navToggle.dataset.toggleBound) {
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

    navMenu.querySelectorAll(".sp-navbar__link").forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    navToggle.dataset.toggleBound = "true";
  }
}

function closeNav() {
  navToggle?.classList.remove("active");
  navMenu?.classList.remove("open");
  navOverlay?.classList.remove("active");
  document.body.style.overflow = "";
}

// Load the navbar from the external file
document.addEventListener("DOMContentLoaded", function () {
  fetch("shared/navbar.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("navbar-container").innerHTML = data;
      initNavbar();
      setActiveNavLink();
    })
    .catch(error => console.error("Error loading navbar:", error));
});


function setActiveNavLink() {
  const links = document.querySelectorAll(".sp-navbar__link");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const activeClass = "sp-navbar__link--active";

  links.forEach(link => {
    const href = link.getAttribute("href") || "";
    const linkPage = new URL(href, window.location.origin).pathname.split("/").pop() || "index.html";

    if (linkPage === currentPage ||
      (currentPage === "" && linkPage === "index.html")) {
      link.classList.add(activeClass);
    } else {
      link.classList.remove(activeClass);
    }
  });
}
