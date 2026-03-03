// ============================================================
//  Amazino — Home Page Logic
//  - All products loaded from live API
//  - Cart persists across pages via localStorage
//  - Cart badge updates on every page
//  - Deals of the Day from live API (products with discount)
// ============================================================

const PRODUCTS_API = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/products';

// ── Helpers ────────────────────────────────────────────────

function getUserId() {
  try {
    if (typeof AUTH !== 'undefined') {
      const sess = AUTH.getSession();
      return sess ? sess.userId : null;
    }
  } catch (e) {}
  return null;
}

function getCart(userId) {
  if (userId) {
    try {
      const scoped = JSON.parse(localStorage.getItem('shoppingCart_' + userId) || 'null');
      if (scoped && scoped.length) return scoped;
    } catch (e) {}
  }
  try { return JSON.parse(localStorage.getItem('shoppingCart') || '[]'); } catch (e) { return []; }
}

function saveCart(cart, userId) {
  const str = JSON.stringify(cart);
  if (userId) localStorage.setItem('shoppingCart_' + userId, str);
  localStorage.setItem('shoppingCart', str);
}

function updateCartBadge() {
  const userId = getUserId();
  const cart = getCart(userId);
  const total = cart.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? 'inline-flex' : 'none';
  }
}

function addProductToCart(product) {
  const userId = getUserId();
  const color = (Array.isArray(product.colors) && product.colors.length > 0)
    ? product.colors[0] : 'default';
  const cart = getCart(userId);
  const existing = cart.find(function(i) { return String(i.id) === String(product.id) && i.color === color; });
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({
      id:       String(product.id),
      name:     product.name,
      price:    parseFloat(product.price) || 0,
      oldPrice: product.oldPrice ? parseFloat(product.oldPrice) : null,
      image:    (product.image || '').trim(),
      color:    color,
      quantity: 1,
      sellerId: product.sellerId || null,
    });
  }
  saveCart(cart, userId);
  updateCartBadge();
}

// ── Countdown Timer ────────────────────────────────────────

(function() {
  var daysEl    = document.getElementById('countDays');
  var hoursEl   = document.getElementById('countHours');
  var minutesEl = document.getElementById('countMinutes');
  var secondsEl = document.getElementById('countSeconds');
  if (!daysEl) return;

  var TIMER_KEY = 'amazino_flash_end';
  var endTime   = parseInt(localStorage.getItem(TIMER_KEY) || '0');
  if (!endTime || endTime < Date.now()) {
    endTime = Date.now() + (4 * 86400 + 12 * 3600 + 22 * 60 + 10) * 1000;
    localStorage.setItem(TIMER_KEY, String(endTime));
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function tick() {
    var diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    daysEl.textContent    = pad(Math.floor(diff / 86400));
    hoursEl.textContent   = pad(Math.floor((diff % 86400) / 3600));
    minutesEl.textContent = pad(Math.floor((diff % 3600) / 60));
    secondsEl.textContent = pad(diff % 60);
    if (diff === 0) clearInterval(timer);
  }
  tick();
  var timer = setInterval(tick, 1000);
})();

// ── Init ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  updateCartBadge();
  loadHomeData();
});

async function loadHomeData() {
  try {
    const res = await fetch(PRODUCTS_API);
    if (!res.ok) throw new Error('API error');
    const allProducts = await res.json();
    renderFeaturedSlider(allProducts);
    renderDeals(allProducts);
    updateCartBadge();
  } catch (err) {
    console.error('[Home] Failed to load products:', err);
    const slider = document.getElementById('productSlider');
    if (slider) slider.innerHTML = '<p class="text-muted py-4 px-2">Could not load products. Please try again later.</p>';
    const deals = document.getElementById('dealsContainer');
    if (deals) deals.innerHTML = '<p class="text-muted py-4 text-center">Could not load deals.</p>';
  }
}

// ── Featured Products Slider ───────────────────────────────

function renderFeaturedSlider(allProducts) {
  const slider      = document.getElementById('productSlider');
  const progressBar = document.getElementById('sliderProgressBar');
  const btnLeft     = document.getElementById('slideLeft');
  const btnRight    = document.getElementById('slideRight');
  if (!slider) return;

  let featured = allProducts.filter(function(p) { return p.featured === true || p.featured === 'true'; });
  if (featured.length < 4) {
    featured = allProducts.slice().sort(function(a, b) {
      return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
    }).slice(0, 8);
  }

  if (!featured.length) {
    slider.innerHTML = '<p class="text-muted py-4 px-2">No products available.</p>';
    return;
  }

  slider.innerHTML = '';

  featured.forEach(function(product) {
    const stock = typeof product.stock === 'number' ? product.stock : 999;
    const card  = document.createElement('div');
    card.className = 'product-card-wrapper';
    card.style.cursor = 'pointer';
    card.addEventListener('click', function() {
      window.location.href = 'product-details.html?id=' + product.id;
    });

    card.innerHTML =
      '<div class="product-card">' +
        (product.discount ? '<span class="badge-sale">' + product.discount + '% Off</span>' : '') +
        '<img src="' + (product.image || 'Frame.png') + '" class="product-img" alt="' + product.name + '" onerror="this.src=\'Frame.png\'">' +
        '<button class="cart-btn" aria-label="Add to cart" title="' + (stock === 0 ? 'Out of Stock' : 'Add to Cart') + '"' +
          (stock === 0 ? ' disabled style="opacity:0.5;cursor:not-allowed"' : '') + '>' +
          '<i class="bi bi-cart"></i>' +
        '</button>' +
      '</div>' +
      '<div class="product-info">' +
        '<div class="product-meta">' +
          '<span class="product-category">' + (product.category || '') + '</span>' +
          '<span class="product-rating"><span class="star">★</span> ' + (product.rating || '') + '</span>' +
        '</div>' +
        '<h6 class="product-name">' + product.name + '</h6>' +
        '<div class="product-price">' +
          '<span class="price-new">$' + parseFloat(product.price).toFixed(2) + '</span>' +
          (product.oldPrice ? '<span class="price-old">$' + parseFloat(product.oldPrice).toFixed(2) + '</span>' : '') +
        '</div>' +
        (stock === 0 ? '<div class="text-danger small mt-1">Out of Stock</div>' : '<div class="text-muted small mt-1">' + stock + ' in stock</div>') +
      '</div>';

    const cartBtn = card.querySelector('.cart-btn');
    if (cartBtn && stock > 0) {
      cartBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        addProductToCart(product);
        cartBtn.innerHTML = '<i class="bi bi-check"></i>';
        cartBtn.style.background = '#28a745';
        setTimeout(function() {
          cartBtn.innerHTML = '<i class="bi bi-cart"></i>';
          cartBtn.style.background = '';
        }, 1500);
      });
    }

    slider.appendChild(card);
  });

  function updateProgressBar() {
    const scrollWidth = slider.scrollWidth - slider.clientWidth;
    if (progressBar && scrollWidth > 0) {
      progressBar.style.width = Math.max(15, (slider.scrollLeft / scrollWidth) * 100) + '%';
    }
  }
  slider.addEventListener('scroll', updateProgressBar);
  updateProgressBar();

  const scrollAmount = 310;
  if (btnLeft)  btnLeft.addEventListener('click',  function() { slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); });
  if (btnRight) btnRight.addEventListener('click', function() { slider.scrollBy({ left:  scrollAmount, behavior: 'smooth' }); });
}

// ── Deals of the Day ───────────────────────────────────────

function renderDeals(allProducts) {
  const container = document.getElementById('dealsContainer');
  if (!container) return;

  let deals = allProducts
    .filter(function(p) { return p.discount && parseFloat(p.discount) > 0; })
    .sort(function(a, b) { return parseFloat(b.discount) - parseFloat(a.discount); })
    .slice(0, 2);

  if (!deals.length) {
    deals = allProducts.slice()
      .sort(function(a, b) { return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0); })
      .slice(0, 2);
  }

  if (!deals.length) {
    container.innerHTML = '<p class="text-muted text-center py-3">No deals available right now.</p>';
    return;
  }

  container.innerHTML = deals.map(function(p) {
    const price    = parseFloat(p.price) || 0;
    const oldPrice = p.oldPrice
      ? parseFloat(p.oldPrice)
      : (p.discount ? Math.round(price / (1 - parseFloat(p.discount) / 100)) : null);
    const rating   = parseFloat(p.rating) || 0;
    const stock    = typeof p.stock === 'number' ? p.stock : 999;

    return '<div class="col-12 col-lg-6">' +
      '<div class="deal-card p-4 h-100 d-flex flex-column flex-sm-row align-items-center gap-4">' +
        '<div class="deal-img-wrapper position-relative text-center">' +
          (p.discount ? '<span class="badge position-absolute top-0 start-0 m-0 py-2 px-3 rounded-pill">' + p.discount + '% Off</span>' : '') +
          '<img src="' + (p.image || 'Frame.png') + '" alt="' + p.name + '" class="img-fluid" style="max-height:250px;object-fit:contain;" onerror="this.src=\'Frame.png\'">' +
        '</div>' +
        '<div class="deal-content w-100">' +
          '<small class="text-muted text-uppercase d-block mb-1">' + (p.category || 'Product') + '</small>' +
          '<h4 class="fw-bold mb-2">' + p.name + '</h4>' +
          '<div class="d-flex align-items-center gap-3 mb-2">' +
            '<span class="fw-bold fs-5">$' + price.toFixed(2) + '</span>' +
            (oldPrice ? '<span class="text-decoration-line-through text-muted">$' + oldPrice.toFixed(2) + '</span>' : '') +
          '</div>' +
          (rating > 0 ? '<div class="mb-3"><i class="bi bi-star-fill text-warning fs-6"></i><span class="fw-bold ms-1" style="font-size:0.9rem;">' + rating.toFixed(1) + '</span></div>' : '') +
          '<p class="text-muted small mb-4">' + (p.description || p.name + ' — a premium product from our collection.') + '</p>' +
          (stock === 0
            ? '<span class="btn btn-deal rounded-pill text-white px-4 py-2 opacity-50" style="cursor:not-allowed">Out of Stock</span>'
            : '<a href="product-details.html?id=' + p.id + '" class="btn btn-deal rounded-pill text-white px-4 py-2">View Details <i class="bi bi-arrow-right ms-1"></i></a>') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── Init ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  updateCartBadge();
  loadHomeData();
});