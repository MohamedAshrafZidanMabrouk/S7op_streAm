/**
 * store.js  —  Amazino Centralized Data Store
 * Fully dynamic: products fetched from API, orders POST to API.
 * localStorage is used ONLY for cart and session state.
 */

const STORE = (() => {
  'use strict';

  const PRODUCTS_API = 'https://699c4912110b5b738cc24139.mockapi.io/api/ecomerce/users/products';
  const ORDERS_API   = 'https://69a0ea5f2e82ee536f9fcd23.mockapi.io/data';
  const CART_KEY     = 'shoppingCart';

  const loadLS = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
  const saveLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async function apiFetch(url, options = {}) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
    return res.json();
  }

  /* PRODUCTS */
  function normaliseProduct(p) {
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

  async function fetchProducts() {
    try {
      const raw = await apiFetch(PRODUCTS_API);
      return raw.map(normaliseProduct);
    } catch (err) {
      console.error('[STORE] fetchProducts failed:', err.message);
      return [];
    }
  }

  async function getProductById(id) {
    try {
      const p = await apiFetch(`${PRODUCTS_API}/${id}`);
      return normaliseProduct(p);
    } catch { return null; }
  }

  async function addProduct(data) {
    const body = {
      name: data.name, category: data.category,
      price: parseFloat(data.price), stock: parseInt(data.stock) || 0,
      description: data.description, image: data.image || '',
      colors: data.colors || [], discount: data.discount || null,
      sellerId: data.sellerId ? String(data.sellerId) : null, sales: 0,
    };
    const result = await apiFetch(PRODUCTS_API, { method: 'POST', body: JSON.stringify(body) });
    return normaliseProduct(result);
  }

  async function updateProduct(id, data) {
    const result = await apiFetch(`${PRODUCTS_API}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    return normaliseProduct(result);
  }

  async function deleteProduct(id) {
    try { await apiFetch(`${PRODUCTS_API}/${id}`, { method: 'DELETE' }); return true; }
    catch (err) { console.error('[STORE] deleteProduct failed:', err.message); return false; }
  }

  /* CART (localStorage, per-user) */
  function cartKey(userId) { return userId ? `${CART_KEY}_${userId}` : CART_KEY; }

  function getCart(userId) {
    if (userId) { const s = loadLS(cartKey(userId)); if (s) return s; }
    return loadLS(CART_KEY) || [];
  }

  function saveCart(cart, userId) {
    const key = userId ? cartKey(userId) : CART_KEY;
    saveLS(key, cart);
    saveLS(CART_KEY, cart);
  }

  async function validateCart(userId = null) {
    const cart = getCart(userId);
    if (!cart.length) return { valid: true, removed: [] };
    let products;
    try { products = await fetchProducts(); } catch { return { valid: true, removed: [] }; }
    const productMap = new Map(products.map(p => [String(p.id), p]));
    const removed = [];
    const validCart = cart.filter(item => {
      if (!productMap.has(String(item.id))) { removed.push(item.name || item.id); return false; }
      return true;
    });
    if (removed.length) saveCart(validCart, userId);
    return { valid: removed.length === 0, removed };
  }

  async function addToCart(productId, quantity = 1, color = 'black', userId = null) {
    let product;
    try { product = await getProductById(productId); }
    catch { return { ok: false, msg: 'Could not verify product. Please try again.' }; }
    if (!product) return { ok: false, msg: 'Product not found or has been removed.' };
    const stock = typeof product.stock === 'number' ? product.stock : 999;
    if (stock === 0) return { ok: false, msg: 'Sorry, this product is out of stock.' };
    if (stock < quantity) return { ok: false, msg: `Only ${stock} units available.` };
    const cart = getCart(userId);
    const existing = cart.find(i => String(i.id) === String(productId) && i.color === color);
    if (existing) {
      const newQty = (existing.quantity || 1) + quantity;
      if (stock < newQty) return { ok: false, msg: `Only ${stock} units available.` };
      existing.quantity = newQty;
    } else {
      cart.push({
        id: String(product.id), name: product.name,
        price: parseFloat(product.price) || 0,
        oldPrice: product.oldPrice ? parseFloat(product.oldPrice) : null,
        image: (product.image || '').trim(),
        color, quantity,
        sellerId: product.sellerId || null,
      });
    }
    saveCart(cart, userId);
    return { ok: true, msg: 'Added to cart!' };
  }

  function removeFromCart(index, userId = null) {
    const cart = getCart(userId); cart.splice(index, 1); saveCart(cart, userId);
  }

  function clearCart(userId = null) {
    const key = userId ? cartKey(userId) : CART_KEY;
    localStorage.removeItem(key);
    localStorage.removeItem(CART_KEY);
  }

  function getCartTotal(userId = null) {
    return getCart(userId).reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  }

  /* ORDERS (API) */
  async function fetchOrders() {
    try { return await apiFetch(ORDERS_API); }
    catch (err) { console.error('[STORE] fetchOrders failed:', err.message); return []; }
  }

  async function fetchOrdersByUser(userId) {
    try {
      const all = await fetchOrders();
      return all.filter(o => String(o.userId) === String(userId));
    } catch (err) { console.error('[STORE] fetchOrdersByUser failed:', err.message); return []; }
  }

  async function placeOrder(orderPayload) {
    const result = await apiFetch(ORDERS_API, { method: 'POST', body: JSON.stringify(orderPayload) });
    clearCart(orderPayload.userId || null);
    return result;
  }

  return {
    generateId,
    fetchProducts, getProductById, addProduct, updateProduct, deleteProduct,
    getCart, saveCart, addToCart, removeFromCart, clearCart, getCartTotal, validateCart,
    fetchOrders, fetchOrdersByUser, placeOrder,
    PRODUCTS_API, ORDERS_API,
  };
})();