// Communication avec le serveur (fichier server.js).

const TOKEN_KEY = 'boutique-valais:admin-token';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function readToken() {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function writeToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* stockage indisponible : la session ne sera pas mémorisée */ }
}

async function request(method, url, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = readToken();
  if (token && url.startsWith('/api/admin/')) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Impossible de joindre le serveur. Vérifiez que le site est bien lancé (npm start).', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && url.startsWith('/api/admin/') && !url.endsWith('/login')) writeToken(null);
    throw new ApiError(data.error || `Erreur ${response.status}`, response.status, data.details);
  }
  return data;
}

export const api = {
  config: () => request('GET', '/api/config'),
  categories: () => request('GET', '/api/categories'),
  products: () => request('GET', '/api/products'),
  product: (id) => request('GET', `/api/products/${encodeURIComponent(id)}`),
  createOrder: (order) => request('POST', '/api/orders', order),

  admin: {
    isLoggedIn: () => Boolean(readToken()),
    async login(password) {
      const { token } = await request('POST', '/api/admin/login', { password });
      writeToken(token);
    },
    async logout() {
      await request('POST', '/api/admin/logout').catch(() => {});
      writeToken(null);
    },
    orders: () => request('GET', '/api/admin/orders'),
    saveProduct: (id, product) => (id
      ? request('PUT', `/api/admin/products/${encodeURIComponent(id)}`, product)
      : request('POST', '/api/admin/products', product)),
    deleteProduct: (id) => request('DELETE', `/api/admin/products/${encodeURIComponent(id)}`),
    uploadImage: (dataUrl) => request('POST', '/api/admin/upload', { dataUrl }),
  },
};
