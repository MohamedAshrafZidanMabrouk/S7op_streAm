/**
 * products.js — Amazino Products Page
 * Fetches products from API via data.js productsReady event.
 * Fully dynamic, no hardcoded data.
 */

(function () {
  'use strict';

  const PRODUCTS_API = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/products';
  let allProducts = [];
  let filteredProducts = [];

  /* ── Cart helpers ──────────────────────────────────────── */
  function getCurrentUserId() {
    try {
      if (typeof AUTH !== 'undefined') {
        const sess = AUTH.getSession();
        return sess ? sess.userId : null;
      }
      const s = JSON.parse(localStorage.getItem('auth_session') || 'null');
      return s ? s.userId : null;
    } catch { return null; }
  }

  function updateCartBadge() {
    const userId = getCurrentUserId();
    const cartKey = userId ? `shoppingCart_${userId}` : 'shoppingCart';
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch {}
    if (!cart.length) { try { cart = JSON.parse(localStorage.getItem('shoppingCart') || '[]'); } catch {} }
    const badge = document.getElementById('cartCount') || document.querySelector('.cart-count');
    if (badge) badge.textContent = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  }

  /* ── Rendering ─────────────────────────────────────────── */
  function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
          <p class="text-muted">No products found.</p>
        </div>`;
      return;
    }

    grid.innerHTML = products.map(p => {
      const stars = renderStars(p.rating);
      const discountBadge = p.discount
        ? `<span class="badge bg-danger position-absolute top-0 start-0 m-2">${p.discount}</span>` : '';
      const oldPriceHtml = p.oldPrice
        ? `<span class="text-muted text-decoration-line-through ms-1" style="font-size:.85rem;">$${p.oldPrice.toFixed(2)}</span>` : '';
      const imgSrc = p.image || 'https://via.placeholder.com/300x200?text=No+Image';

      return `
        <div class="col">
          <div class="card-product h-100" onclick="window.location.href='product-details.html?id=${p.id}'" style="cursor:pointer;position:relative;">
            ${discountBadge}
            <div style="background:#f8f8f8;border-radius:12px 12px 0 0;overflow:hidden;height:200px;display:flex;align-items:center;justify-content:center;">
              <img src="${imgSrc}" alt="${p.name}" style="max-height:190px;max-width:100%;object-fit:contain;"
                onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
            </div>
            <div class="p-3">
              <div class="text-muted" style="font-size:.75rem;margin-bottom:4px;">${p.category}</div>
              <div class="fw-600 mb-1" style="font-size:.95rem;line-height:1.3;min-height:2.5em;">${p.name}</div>
              <div class="mb-1">${stars}</div>
              <div class="d-flex align-items-center gap-1 mt-2">
                <span class="fw-bold" style="color:rgb(124,29,124);font-size:1.05rem;">$${p.price.toFixed(2)}</span>
                ${oldPriceHtml}
              </div>
              <button class="btn w-100 mt-2 add-cart-btn"
                style="background:rgb(124,29,124);color:white;border-radius:50px;font-size:.85rem;"
                onclick="event.stopPropagation();handleAddToCart('${p.id}',this)">
                <i class="fas fa-cart-plus me-1"></i> Add to Cart
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function renderStars(rating) {
    const r = Math.round(rating * 2) / 2;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (r >= i) html += '<i class="fas fa-star" style="color:#f59e0b;font-size:.75rem;"></i>';
      else if (r >= i - 0.5) html += '<i class="fas fa-star-half-alt" style="color:#f59e0b;font-size:.75rem;"></i>';
      else html += '<i class="far fa-star" style="color:#d1d5db;font-size:.75rem;"></i>';
    }
    return html;
  }

  /* ── Add to cart ─────────────────────────────────────────── */
  window.handleAddToCart = function(productId, btn) {
    // Find product from already-loaded allProducts array (no API call needed)
    const product = allProducts.find(p => String(p.id) === String(productId));
    if (!product) { showToast('Product not found.', true); return; }

    const stock = typeof product.stock === 'number' ? product.stock : 999;
    if (stock === 0) { showToast('This product is out of stock.', true); return; }

    const userId  = getCurrentUserId();
    const cartKey = userId ? `shoppingCart_${userId}` : 'shoppingCart';
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem(cartKey) || '[]'); } catch {}
    // Also try the generic key as fallback seed
    if (!cart.length) { try { cart = JSON.parse(localStorage.getItem('shoppingCart') || '[]'); } catch {} }

    const color    = (Array.isArray(product.colors) && product.colors.length > 0) ? product.colors[0] : 'default';
    const existing = cart.find(i => String(i.id) === String(productId) && i.color === color);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      cart.push({
        id:       String(product.id),
        name:     product.name,
        price:    parseFloat(product.price) || 0,
        oldPrice: product.oldPrice ? parseFloat(product.oldPrice) : null,
        image:    (product.image || '').trim(),
        color,
        quantity: 1,
        sellerId: product.sellerId || null,
      });
    }

    // Save to both scoped key and generic key so all pages see the same cart
    if (userId) localStorage.setItem(cartKey, JSON.stringify(cart));
    localStorage.setItem('shoppingCart', JSON.stringify(cart));

    // Update button
    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-check me-1"></i> Added!';
    btn.style.background = '#28a745';
    updateCartBadge();
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.style.background = 'rgb(124,29,124)';
      btn.disabled = false;
    }, 1500);
  };

  /* ── Filter / Search ──────────────────────────────────────── */
  function applyFilters() {
    const searchEl = document.getElementById('searchInput') || document.getElementById('productSearch');
    const catEl    = document.getElementById('categoryFilter');
    const sortEl   = document.getElementById('sortFilter');
    const priceEl  = document.getElementById('price-range');

    const q      = (searchEl?.value || '').toLowerCase().trim();
    const cat    = catEl?.value || '';
    const sort   = sortEl?.value || '';
    const maxPr  = priceEl ? parseFloat(priceEl.value) : Infinity;

    let result = allProducts.filter(p => {
      const matchQ    = !q   || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      const matchCat  = !cat || p.category === cat;
      const matchPrice = p.price <= maxPr;
      return matchQ && matchCat && matchPrice;
    });

    if (sort === 'price-asc')  result.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
    if (sort === 'rating')     result.sort((a, b) => b.rating - a.rating);
    if (sort === 'newest')     result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    filteredProducts = result;
    renderProducts(filteredProducts);
    updateResultCount(filteredProducts.length);
  }

  function updateResultCount(count) {
    const el = document.getElementById('resultCount');
    if (el) el.textContent = `${count} product${count !== 1 ? 's' : ''} found`;
    const showingEl = document.getElementById('showing-results');
    if (showingEl) showingEl.textContent = `Showing ${count} product${count !== 1 ? 's' : ''}`;
  }

  function populateCategoryFilter(products) {
    const catEl = document.getElementById('categoryFilter');
    if (!catEl) return;
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    catEl.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  /* ── Init ──────────────────────────────────────────────────── */
  function showLoading() {
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border" style="color:rgb(124,29,124);" role="status"></div>
        <p class="mt-2 text-muted">Loading products…</p>
      </div>`;
  }

  function showError(msg) {
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>
        <p class="text-danger">${msg}</p>
        <button class="btn btn-sm mt-2" style="background:rgb(124,29,124);color:white;border-radius:50px;"
          onclick="location.reload()">Try Again</button>
      </div>`;
  }

  function showToast(msg, isErr = false) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 18px;
      border-radius:10px;color:white;font-size:.9rem;display:flex;align-items:center;gap:8px;
      background:${isErr ? '#dc3545' : 'rgb(124,29,124)'};box-shadow:0 4px 16px rgba(0,0,0,.2);`;
    t.innerHTML = `<i class="fas fa-${isErr ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2500);
    setTimeout(() => t.remove(), 3000);
  }

  async function init() {
    showLoading();
    updateCartBadge();

    try {
      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.json();

      allProducts = raw.map(p => {
        let colors = [];
        if (Array.isArray(p.colors)) colors = p.colors.map(c => String(c).toLowerCase().trim()).filter(Boolean);
        else if (typeof p.colors === 'string' && p.colors.trim()) colors = [p.colors.toLowerCase().trim()];
        return {
          id: String(p.id), name: p.name || '', price: parseFloat(p.price) || 0,
          oldPrice: p.oldPrice ? parseFloat(p.oldPrice) : null,
          rating: parseFloat(p.rating) || 0, category: p.category || 'General',
          colors: [...new Set(colors)], discount: p.discount || null,
          image: (p.image || '').trim(),
          description: p.description || p.name + ' — ' + (p.category || 'Product') + '.',
          stock: typeof p.stock === 'number' ? p.stock : 999,
          sellerId: p.sellerId ? String(p.sellerId) : null,
          sales: p.sales || 0, createdAt: p.createdAt || new Date().toISOString(),
        };
      });

      filteredProducts = allProducts;
      populateCategoryFilter(allProducts);
      renderProducts(allProducts);
      updateResultCount(allProducts.length);

      // Set price range max dynamically
      const priceEl = document.getElementById('price-range');
      const priceMax = document.getElementById('price-max');
      if (priceEl) {
        const highestPrice = Math.max(...allProducts.map(p => p.price), 100);
        const sliderMax = Math.ceil(highestPrice / 50) * 50;
        priceEl.max = sliderMax;
        priceEl.value = sliderMax;
        if (priceMax) priceMax.textContent = '$' + sliderMax;
        priceEl.addEventListener('input', function() {
          if (priceMax) priceMax.textContent = '$' + this.value;
          applyFilters();
        });
      }

      // Wire up filters
      ['searchInput','productSearch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', applyFilters);
      });
      ['categoryFilter','sortFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
      });
    } catch (err) {
      console.error('[products.js] Failed to load products:', err);
      showError('Failed to load products. Please check your connection and try again.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();