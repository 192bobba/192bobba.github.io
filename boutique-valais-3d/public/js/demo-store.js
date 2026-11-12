// Version de démonstration en ligne (GitHub Pages), sans serveur.
//
// Les catégories, réglages et produits de départ sont lus dans le dossier data/ du projet.
// Les modifications faites dans l'admin, les photos et les commandes de test sont
// enregistrées dans le navigateur (IndexedDB) : elles restent sur l'appareil utilisé
// (votre iPad par exemple) et ne sont visibles par personne d'autre.
//
// Les règles (prix, âge, validation des produits) sont exactement celles du serveur :
// elles viennent des mêmes fichiers, dans js/shared/.

import { AppError } from './shared/errors.js';
import { buildOrder } from './shared/orders.js';
import { slugify, uniqueId, validateProduct } from './shared/products.js';

// Mot de passe de l'admin en ligne. Il est lisible dans le code de la page :
// il évite seulement les modifications par erreur (chacun ne modifie que son propre navigateur).
const DEMO_PASSWORD = 'valais1815';
const DATA_URL = '../data/';

// ---- Petit stockage clé → valeur dans le navigateur ---------------------------------

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('boutique-valais-3d-demo', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('donnees');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function createKeyValueStore() {
  let databasePromise = null;
  const memory = new Map(); // secours si IndexedDB est indisponible (navigation privée…)

  const run = async (mode, action) => {
    try {
      databasePromise ??= openDatabase();
      const database = await databasePromise;
      return await new Promise((resolve, reject) => {
        const request = action(database.transaction('donnees', mode).objectStore('donnees'));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      if (error?.name === 'QuotaExceededError') {
        throw new AppError(507, "La mémoire de ce navigateur est pleine : supprimez quelques produits ou photos.");
      }
      return undefined;
    }
  };

  return {
    async get(key) {
      const value = await run('readonly', (store) => store.get(key));
      return value === undefined ? memory.get(key) : value;
    },
    async set(key, value) {
      memory.set(key, value);
      await run('readwrite', (store) => store.put(value, key));
    },
    async clear() {
      memory.clear();
      await run('readwrite', (store) => store.clear());
    },
  };
}

async function fetchJson(file) {
  const response = await fetch(DATA_URL + file, { cache: 'no-cache' });
  if (!response.ok) throw new AppError(response.status, `Impossible de charger ${file}.`);
  return response.json();
}

// ---- Opérations (mêmes noms que le serveur, voir api.js) ----------------------------

export function createDemoStore() {
  const storage = createKeyValueStore();
  let base = null;
  const loadBase = async () => {
    base ??= Promise.all([fetchJson('settings.json'), fetchJson('categories.json'), fetchJson('products.demo.json')])
      .then(([settings, categories, products]) => ({ settings, categories, products }));
    return base;
  };

  const products = async () => (await storage.get('produits')) || (await loadBase()).products;
  const orders = async () => (await storage.get('commandes')) || [];

  const findProduct = async (id) => {
    const product = (await products()).find((p) => p.id === id);
    if (!product) throw new AppError(404, 'Produit introuvable.');
    return product;
  };

  const requireLogin = () => {
    try {
      if (sessionStorage.getItem('boutique-valais-3d:admin-token') === 'demo') return;
    } catch { /* ignoré */ }
    throw new AppError(401, 'Session admin expirée. Merci de vous reconnecter.');
  };

  return {
    config: async () => (await loadBase()).settings,
    categories: async () => (await loadBase()).categories,
    products,
    product: findProduct,

    async createOrder(input) {
      const { settings, categories } = await loadBase();
      const previousOrders = await orders();
      const order = buildOrder(input, { products: await products(), categories, settings, previousOrders });
      await storage.set('commandes', [...previousOrders, order]);
      return order;
    },

    async login(password) {
      if (password !== DEMO_PASSWORD) throw new AppError(401, 'Mot de passe incorrect.');
      return { token: 'demo' };
    },
    logout: async () => ({ ok: true }),

    async orders() {
      requireLogin();
      return (await orders()).slice().reverse();
    },

    async saveProduct(id, input) {
      requireLogin();
      const { categories } = await loadBase();
      const data = validateProduct(input, categories, { allowImageData: true });
      const list = [...await products()];
      let saved;
      if (id) {
        const index = list.findIndex((p) => p.id === id);
        if (index === -1) throw new AppError(404, 'Produit introuvable.');
        saved = { ...list[index], ...data, id };
        list[index] = saved;
      } else {
        saved = { id: uniqueId(slugify(data.name), new Set(list.map((p) => p.id))), ...data };
        list.unshift(saved);
      }
      await storage.set('produits', list);
      return saved;
    },

    async deleteProduct(id) {
      requireLogin();
      const list = await products();
      const remaining = list.filter((p) => p.id !== id);
      if (remaining.length === list.length) throw new AppError(404, 'Produit introuvable.');
      await storage.set('produits', remaining);
      return { ok: true };
    },

    // La photo (déjà réduite par la page admin) est gardée telle quelle dans le produit.
    async uploadImage(dataUrl) {
      requireLogin();
      if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(String(dataUrl))) {
        throw new AppError(400, 'Format accepté : JPG, PNG, WEBP ou GIF.');
      }
      return { url: dataUrl };
    },

    // Remet la démo dans son état d'origine (sur cet appareil uniquement).
    async resetDemo() {
      requireLogin();
      await storage.clear();
      return { ok: true };
    },
  };
}
