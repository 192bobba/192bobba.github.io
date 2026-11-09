// Accès aux données du site.
//
// Deux modes, choisis automatiquement au chargement :
//  - « serveur » : le site tourne sur votre ordinateur (npm start) → on dialogue avec server.js ;
//  - « démo »    : le site est hébergé sans serveur (GitHub Pages) → tout se passe dans le navigateur
//                   (voir demo-store.js) et les modifications restent sur l'appareil utilisé.

import { AppError } from './shared/errors.js';

export { AppError as ApiError };

const TOKEN_KEY = 'boutique-valais:admin-token';

function readToken() {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function writeToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* stockage indisponible : la session ne sera pas mémorisée */ }
}

// ---- Détection du mode -----------------------------------------------------------

// Pas de serveur (réponse « page introuvable » ou non JSON) → mode démo.
// Serveur injoignable (erreur réseau) → mode serveur : le site local a été arrêté.
async function detectMode() {
  try {
    const response = await fetch('api/config', { cache: 'no-store' });
    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    return response.ok && isJson ? 'server' : 'demo';
  } catch {
    return 'server';
  }
}

const modeReady = detectMode();
let demoStore = null;
const demo = async () => {
  demoStore ??= (await import('./demo-store.js')).createDemoStore();
  return demoStore;
};

// ---- Mode serveur ------------------------------------------------------------------

async function request(method, url, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = readToken();
  if (token && url.startsWith('api/admin/')) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    window.dispatchEvent(new CustomEvent('server-offline'));
    throw new AppError(0, 'Le site ne répond plus : il a été arrêté (fenêtre noire fermée ?). Relancez-le, puis réessayez.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && url.startsWith('api/admin/') && !url.endsWith('/login')) writeToken(null);
    throw new AppError(response.status, data.error || `Erreur ${response.status}`, data.details);
  }
  return data;
}

const server = {
  config: () => request('GET', 'api/config'),
  categories: () => request('GET', 'api/categories'),
  products: () => request('GET', 'api/products'),
  product: (id) => request('GET', `api/products/${encodeURIComponent(id)}`),
  createOrder: (order) => request('POST', 'api/orders', order),
  login: (password) => request('POST', 'api/admin/login', { password }),
  logout: () => request('POST', 'api/admin/logout'),
  orders: () => request('GET', 'api/admin/orders'),
  saveProduct: (id, product) => (id
    ? request('PUT', `api/admin/products/${encodeURIComponent(id)}`, product)
    : request('POST', 'api/admin/products', product)),
  deleteProduct: (id) => request('DELETE', `api/admin/products/${encodeURIComponent(id)}`),
  uploadImage: (dataUrl) => request('POST', 'api/admin/upload', { dataUrl }),
};

// Appelle la bonne version (serveur ou démo) d'une opération.
async function call(name, ...args) {
  const backend = (await modeReady) === 'demo' ? await demo() : server;
  if (typeof backend[name] !== 'function') throw new AppError(400, 'Action indisponible dans ce mode.');
  return backend[name](...args);
}

// ---- Interface utilisée par les pages ----------------------------------------------

export const api = {
  isDemo: async () => (await modeReady) === 'demo',

  // Vérifie si le serveur répond, sans déclencher d'alerte.
  async ping() {
    if (await api.isDemo()) return true;
    try {
      const response = await fetch('api/config', { cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  },

  config: () => call('config'),
  categories: () => call('categories'),
  products: () => call('products'),
  product: (id) => call('product', id),
  createOrder: (order) => call('createOrder', order),

  admin: {
    isLoggedIn: () => Boolean(readToken()),
    async login(password) {
      const { token } = await call('login', password);
      writeToken(token);
    },
    async logout() {
      await call('logout').catch(() => {});
      writeToken(null);
    },
    orders: () => call('orders'),
    saveProduct: (id, product) => call('saveProduct', id, product),
    deleteProduct: (id) => call('deleteProduct', id),
    uploadImage: (dataUrl) => call('uploadImage', dataUrl),
    resetDemo: () => call('resetDemo'),
  },
};
