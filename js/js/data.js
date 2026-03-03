/**
 * data.js — Amazino Product Loader
 *
 * Fetches the live product catalog from MockAPI on every page load.
 * Dispatches 'productsReady' event so pages can render.
 * Does NOT cache in localStorage — store.js always fetches fresh from API.
 */

(function initProducts() {
  'use strict';

  const PRODUCTS_API = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/products';

  function normalise(p) {
    let colors = [];
    if (Array.isArray(p.colors)) colors = p.colors.map(c => String(c).toLowerCase().trim()).filter(Boolean);
    else if (typeof p.colors === 'string' && p.colors.trim()) colors = [p.colors.toLowerCase().trim()];
    colors = [...new Set(colors)];
    return {
      id:          String(p.id),
      name:        p.name        || '',
      price:       parseFloat(p.price)   || 0,
      oldPrice:    p.oldPrice    ? parseFloat(p.oldPrice) : null,
      rating:      parseFloat(p.rating)  || 0,
      category:    p.category    || 'General',
      colors,
      discount:    p.discount    || null,
      image:       (p.image      || '').trim(),
      description: p.description || (p.name + ' — ' + (p.category || 'Product') + '.'),
      stock:       typeof p.stock === 'number' ? p.stock : 999,
      sellerId:    p.sellerId    ? String(p.sellerId) : null,
      sales:       p.sales       || 0,
      createdAt:   p.createdAt   || new Date().toISOString(),
    };
  }

  async function fetchAndReady() {
    try {
      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.json();
      const products = raw.map(normalise);
      window.__productsCache = products;
      window.dispatchEvent(new CustomEvent('productsReady', { detail: { products } }));
      console.log('[data.js] Loaded ' + products.length + ' products from API.');
    } catch (err) {
      console.warn('[data.js] Product API fetch failed:', err.message);
      window.__productsCache = [];
      window.dispatchEvent(new CustomEvent('productsReady', { detail: { products: [] } }));
    }
  }

  fetchAndReady();
})();