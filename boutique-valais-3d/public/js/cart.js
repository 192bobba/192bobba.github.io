// Panier conservé dans le navigateur (localStorage).
// Chaque ligne : { productId, size, color, qty }.

const KEY = 'boutique-valais-3d:panier';
const listeners = new Set();

const keyOf = (item) => [item.productId, item.size, item.color].join('|');

function read() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(items)) return [];
    return items.filter((i) => i && typeof i.productId === 'string' && Number.isInteger(i.qty) && i.qty > 0);
  } catch {
    return [];
  }
}

function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* stockage plein ou bloqué */ }
  listeners.forEach((fn) => fn());
}

export const cart = {
  keyOf,
  items: read,
  count: () => read().reduce((total, item) => total + item.qty, 0),

  add({ productId, size = '', color = '', qty = 1 }) {
    const items = read();
    const key = keyOf({ productId, size, color });
    const existing = items.find((item) => keyOf(item) === key);
    if (existing) existing.qty = Math.min(99, existing.qty + qty);
    else items.push({ productId, size, color, qty: Math.min(99, qty) });
    write(items);
  },

  setQty(key, qty) {
    const items = read();
    const item = items.find((i) => keyOf(i) === key);
    if (!item) return;
    item.qty = Math.max(1, Math.min(99, qty));
    write(items);
  },

  remove(keys) {
    const toRemove = new Set([].concat(keys));
    write(read().filter((item) => !toRemove.has(keyOf(item))));
  },

  clear: () => write([]),

  onChange: (fn) => listeners.add(fn),
};

// Synchronise le panier entre plusieurs onglets ouverts.
window.addEventListener('storage', (event) => {
  if (event.key === KEY) listeners.forEach((fn) => fn());
});
