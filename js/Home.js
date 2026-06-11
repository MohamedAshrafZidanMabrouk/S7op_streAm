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

// ========== Featured Products Renderer ==========
const storedProducts = JSON.parse(localStorage.getItem("products")) || [];
const slider = document.getElementById("productSlider");
const progressBar = document.getElementById("sliderProgressBar");
const btnLeft = document.getElementById("slideLeft");
const btnRight = document.getElementById("slideRight");

if (slider) {
  const featured = storedProducts.filter((p) => p.featured);

  featured.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card-wrapper";
    card.innerHTML = `
      <div class="product-card">
        <span class="badge-sale">${product.discount}% Off</span>
        <img src="${product.image}" class="product-img" alt="${product.name}">
        <button class="cart-btn" aria-label="Add to cart">
          <i class="bi bi-cart"></i>
        </button>
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="product-category">${product.category}</span>
          <span class="product-rating">
            <span class="star">★</span> ${product.rating}
          </span>
        </div>
        <h6 class="product-name">${product.name}</h6>
        <div class="product-price">
          <span class="price-new">$${product.price}</span>
          <span class="price-old">$${product.oldPrice}</span>
        </div>
      </div>
    `;
    slider.appendChild(card);
  });

  // ---- Scroll progress bar ----
  function updateProgressBar() {
    const scrollLeft = slider.scrollLeft;
    const scrollWidth = slider.scrollWidth - slider.clientWidth;
    if (scrollWidth > 0) {
      const progress = (scrollLeft / scrollWidth) * 100;
      progressBar.style.width = Math.max(15, progress) + "%";
    }
  }

  slider.addEventListener("scroll", updateProgressBar);
  updateProgressBar();

  // ---- Arrow navigation ----
  const scrollAmount = 310;

  if (btnLeft) {
    btnLeft.addEventListener("click", () => {
      slider.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
  }

  if (btnRight) {
    btnRight.addEventListener("click", () => {
      slider.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }
}

// ========== Countdown Timer ==========
(function () {
  const daysEl = document.getElementById("countDays");
  const hoursEl = document.getElementById("countHours");
  const minutesEl = document.getElementById("countMinutes");
  const secondsEl = document.getElementById("countSeconds");

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  // Starting values: 4 days, 12 hours, 22 minutes, 10 seconds
  let totalSeconds = 4 * 86400 + 12 * 3600 + 22 * 60 + 10;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function updateDisplay() {
    if (totalSeconds <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      clearInterval(timer);
      return;
    }

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = pad(days);
    hoursEl.textContent = pad(hours);
    minutesEl.textContent = pad(minutes);
    secondsEl.textContent = pad(seconds);

    totalSeconds--;
  }

  updateDisplay();
  const timer = setInterval(updateDisplay, 1000);
})();
