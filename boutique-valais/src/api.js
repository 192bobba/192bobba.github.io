// Routes de l'API JSON utilisée par le site (/api/...).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import config from './config.js';
import * as store from './store.js';
import * as auth from './auth.js';
import { HttpError, readJsonBody, sendJson } from './http.js';
import { slugify, uniqueId, validateProduct } from './products.js';
import { buildOrder } from './orders.js';
import { UPLOADS_DIR } from './paths.js';

const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

function findProductOr404(id) {
  const product = store.products.get(id);
  if (!product) throw new HttpError(404, 'Produit introuvable.');
  return product;
}

// ---- Routes publiques ---------------------------------------------------

function getConfig() {
  const { shopName, minimumAge, currency, shipping } = config;
  return { shopName, minimumAge, currency, shipping };
}

const getCategories = () => store.categories.list();

function getProducts(_req, _params, url) {
  const category = url.searchParams.get('categorie');
  const all = store.products.list();
  return category ? all.filter((p) => p.category === category) : all;
}

const getProduct = (_req, [id]) => findProductOr404(id);

async function createOrder(req) {
  const body = await readJsonBody(req);
  const order = buildOrder(body, {
    products: store.products.list(),
    categories: store.categories.list(),
    config,
    previousOrders: store.orders.list(),
  });
  store.orders.create(order);
  console.log(`🛒 Nouvelle commande simulée ${order.number} (CHF ${(order.totalCents / 100).toFixed(2)})`);
  return order;
}

// ---- Routes admin -------------------------------------------------------

async function adminLogin(req) {
  const { password } = await readJsonBody(req);
  const token = auth.login(password);
  if (!token) throw new HttpError(401, 'Mot de passe incorrect.');
  return { token };
}

function adminLogout(req) {
  auth.logout(req);
  return { ok: true };
}

const adminListOrders = () => store.orders.list().slice().reverse();

async function adminCreateProduct(req) {
  const data = validateProduct(await readJsonBody(req), store.categories.list());
  const existingIds = new Set(store.products.list().map((p) => p.id));
  const product = { id: uniqueId(slugify(data.name), existingIds), ...data };
  return store.products.create(product);
}

async function adminUpdateProduct(req, [id]) {
  findProductOr404(id);
  const data = validateProduct(await readJsonBody(req), store.categories.list());
  return store.products.update(id, data);
}

function adminDeleteProduct(_req, [id]) {
  if (!store.products.remove(id)) throw new HttpError(404, 'Produit introuvable.');
  return { ok: true };
}

async function adminUploadImage(req) {
  // L'image arrive encodée en base64 (≈ +33 % de taille), d'où la marge.
  const { dataUrl } = await readJsonBody(req, Math.ceil(config.maxUploadBytes * 1.4) + 1024);
  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  const extension = match && IMAGE_TYPES[match[1]];
  if (!extension) throw new HttpError(400, 'Format accepté : JPG, PNG, WEBP ou GIF.');

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > config.maxUploadBytes) {
    throw new HttpError(413, `Image trop lourde (max. ${Math.round(config.maxUploadBytes / 1024 / 1024)} Mo).`);
  }

  const fileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer);
  return { url: `/uploads/${fileName}` };
}

// ---- Table de routage ---------------------------------------------------

const admin = (handler) => (req, ...rest) => {
  auth.requireAdmin(req);
  return handler(req, ...rest);
};

const routes = [
  ['GET', /^\/api\/config$/, getConfig],
  ['GET', /^\/api\/categories$/, getCategories],
  ['GET', /^\/api\/products$/, getProducts],
  ['GET', /^\/api\/products\/([\w-]+)$/, getProduct],
  ['POST', /^\/api\/orders$/, createOrder, 201],
  ['POST', /^\/api\/admin\/login$/, adminLogin],
  ['POST', /^\/api\/admin\/logout$/, adminLogout],
  ['GET', /^\/api\/admin\/orders$/, admin(adminListOrders)],
  ['POST', /^\/api\/admin\/products$/, admin(adminCreateProduct), 201],
  ['PUT', /^\/api\/admin\/products\/([\w-]+)$/, admin(adminUpdateProduct)],
  ['DELETE', /^\/api\/admin\/products\/([\w-]+)$/, admin(adminDeleteProduct)],
  ['POST', /^\/api\/admin\/upload$/, admin(adminUploadImage), 201],
];

export async function handleApi(req, res, url) {
  let pathMatched = false;
  for (const [method, pattern, handler, status = 200] of routes) {
    const match = pattern.exec(url.pathname);
    if (!match) continue;
    pathMatched = true;
    if (method !== req.method) continue;
    const result = await handler(req, match.slice(1), url);
    return sendJson(res, status, result);
  }
  throw pathMatched
    ? new HttpError(405, 'Méthode non autorisée.')
    : new HttpError(404, 'Adresse API inconnue.');
}
