// Petits utilitaires HTTP (réponses JSON, lecture du corps, fichiers statiques).

import fs from 'node:fs';
import path from 'node:path';
import { PUBLIC_DIR } from './paths.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const SECURITY_HEADERS = { 'X-Content-Type-Options': 'nosniff' };

export function sendJson(res, status, data) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

export function readJsonBody(req, maxBytes = 100 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) tooLarge = true;
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(new HttpError(413, 'Les données envoyées sont trop volumineuses.'));
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Données JSON invalides.'));
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function notFound(res) {
  res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Page introuvable');
}

export function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let relative;
  try {
    relative = decodeURIComponent(pathname);
  } catch {
    return notFound(res);
  }
  if (relative.endsWith('/')) relative += 'index.html';

  // Refuse les fichiers cachés, les caractères nuls et toute sortie du dossier public.
  if (relative.includes('\0') || relative.split('/').some((part) => part.startsWith('.'))) {
    return notFound(res);
  }
  const filePath = path.join(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return notFound(res);

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return notFound(res);
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    // Si la lecture échoue (fichier bloqué par un antivirus, supprimé entre-temps…),
    // on coupe proprement cette réponse sans arrêter le serveur.
    const stream = fs.createReadStream(filePath);
    stream.on('error', (error) => {
      console.error(`Lecture impossible de ${relative} : ${error.code || error.message}`);
      res.destroy();
    });
    stream.pipe(res);
  });
}
