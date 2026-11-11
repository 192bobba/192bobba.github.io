// Stockage dans des fichiers JSON (dossier data/).
// Pour une vraie version, ce module est le seul à remplacer par une base de données.

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './paths.js';

const FILES = {
  categories: path.join(DATA_DIR, 'categories.json'),
  demoProducts: path.join(DATA_DIR, 'products.demo.json'),
  products: path.join(DATA_DIR, 'products.json'),
  orders: path.join(DATA_DIR, 'orders.json'),
};

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw new Error(`Impossible de lire ${path.basename(file)} : ${err.message}`);
  }
}

// Écriture « atomique » : on écrit un fichier temporaire puis on le renomme,
// pour ne jamais laisser un fichier à moitié écrit.
function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

// Au premier lancement, on copie les produits de démonstration.
export function init() {
  if (!fs.existsSync(FILES.products)) {
    fs.copyFileSync(FILES.demoProducts, FILES.products);
    console.log('→ Produits de démonstration installés (data/products.json).');
  }
}

export const categories = {
  list: () => readJson(FILES.categories, []),
};

export const products = {
  list: () => readJson(FILES.products, []),
  get: (id) => products.list().find((p) => p.id === id) || null,
  create(product) {
    const all = products.list();
    all.unshift(product);
    writeJson(FILES.products, all);
    return product;
  },
  update(id, changes) {
    const all = products.list();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) return null;
    all[index] = { ...all[index], ...changes, id };
    writeJson(FILES.products, all);
    return all[index];
  },
  remove(id) {
    const all = products.list();
    const remaining = all.filter((p) => p.id !== id);
    if (remaining.length === all.length) return false;
    writeJson(FILES.products, remaining);
    return true;
  },
};

export const orders = {
  list: () => readJson(FILES.orders, []),
  create(order) {
    const all = orders.list();
    all.push(order);
    writeJson(FILES.orders, all);
    return order;
  },
};
