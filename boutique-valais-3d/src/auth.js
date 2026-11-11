// Protection basique de l'admin : un mot de passe unique → un jeton de session
// gardé en mémoire (il disparaît quand on arrête le serveur).
// À remplacer par de vrais comptes utilisateurs dans une version de production.

import crypto from 'node:crypto';
import config from './config.js';
import { HttpError } from './http.js';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 heures
const sessions = new Map(); // jeton → date d'expiration

const hash = (value) => crypto.createHash('sha256').update(String(value)).digest();

export function login(password) {
  if (!crypto.timingSafeEqual(hash(password), hash(config.adminPassword))) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_DURATION_MS);
  return token;
}

function tokenFrom(req) {
  const match = /^Bearer ([a-f0-9]+)$/.exec(req.headers.authorization || '');
  return match ? match[1] : null;
}

export function logout(req) {
  const token = tokenFrom(req);
  if (token) sessions.delete(token);
}

export function requireAdmin(req) {
  const token = tokenFrom(req);
  const expiresAt = token && sessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    throw new HttpError(401, 'Session admin expirée. Merci de vous reconnecter.');
  }
}
