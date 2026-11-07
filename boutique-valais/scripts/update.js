// Mise à jour automatique du site depuis GitHub.
//
// À chaque lancement, on télécharge la dernière version publiée et on remplace
// les fichiers qui ont changé. Ne sont JAMAIS touchés : vos produits
// (data/products.json), vos commandes (data/orders.json) et vos photos
// (public/uploads/).
//
// La source (dépôt, branche, dossier) se règle dans package.json → "updateSource".
// Commande manuelle : npm run update

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Volontairement, ce fichier n'importe aucun module du site : ainsi, le serveur
// démarré juste après charge bien les versions fraîchement mises à jour.
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_FILE = path.join(ROOT_DIR, '.version');
const PROTECTED = [/^data\/products\.json$/, /^data\/orders\.json$/, /^public\/uploads\//];

function download(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'boutique-valais-mise-a-jour' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        res.resume();
        resolve(download(new URL(res.headers.location, url).href, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`GitHub a répondu ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    request.setTimeout(20000, () => request.destroy(new Error('pas de réponse')));
    request.on('error', reject);
  });
}

// Lecture d'une archive .tar (format utilisé par GitHub).
function parsePax(buffer) {
  const records = {};
  let i = 0;
  while (i < buffer.length) {
    const space = buffer.indexOf(0x20, i);
    const length = parseInt(buffer.subarray(i, space).toString(), 10);
    if (space === -1 || !length) break;
    const record = buffer.subarray(space + 1, i + length - 1).toString('utf8');
    const eq = record.indexOf('=');
    records[record.slice(0, eq)] = record.slice(eq + 1);
    i += length;
  }
  return records;
}

function* readTar(buffer) {
  let offset = 0;
  let longName = null;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const field = (start, length) => {
      const raw = header.subarray(start, start + length);
      const end = raw.indexOf(0);
      return raw.subarray(0, end === -1 ? length : end).toString('utf8');
    };
    const size = parseInt(field(124, 12).trim() || '0', 8);
    const mode = parseInt(field(100, 8).trim() || '0', 8);
    const type = field(156, 1) || '0';
    const prefix = field(345, 155);
    let name = prefix ? `${prefix}/${field(0, 100)}` : field(0, 100);

    const data = buffer.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;

    if (type === 'g') { yield { type, records: parsePax(data) }; continue; }
    if (type === 'x') { longName = parsePax(data).path ?? longName; continue; }
    if (type === 'L') { longName = data.toString('utf8').replace(/\0+$/, ''); continue; }
    if (longName) { name = longName; longName = null; }
    yield { type, name, mode, data };
  }
}

function readSource() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return pkg.updateSource;
}

export async function checkForUpdates() {
  const source = readSource();
  if (!source?.repository || !source?.branch) return;

  // Si le dossier est un clone git (développement), on ne touche à rien : on utilise « git pull ».
  if (fs.existsSync(path.join(ROOT_DIR, '.git')) || fs.existsSync(path.join(ROOT_DIR, '..', '.git'))) {
    console.log('ℹ️  Dossier géré par git : mise à jour automatique désactivée (utilisez « git pull »).');
    return;
  }

  console.log('🔄 Recherche de mises à jour…');
  let archive;
  try {
    const url = `https://codeload.github.com/${source.repository}/tar.gz/refs/heads/${source.branch}`;
    archive = zlib.gunzipSync(await download(url));
  } catch (error) {
    console.log(`   Mise à jour impossible (${error.message}). Pas d'internet ? Lancement de la version actuelle.`);
    return;
  }

  const updated = [];
  let version = null;
  let folderFound = false;

  for (const entry of readTar(archive)) {
    if (entry.type === 'g') {
      version = entry.records.comment || null;
      continue;
    }
    if (entry.type !== '0') continue;

    // Chemin dans l'archive : « <dossier-racine>/<dossier du site>/chemin/fichier »
    const parts = entry.name.split('/');
    if (parts[1] !== source.folder || parts.length < 3) continue;
    folderFound = true;

    const relative = parts.slice(2).join('/');
    if (PROTECTED.some((pattern) => pattern.test(relative))) continue;

    const target = path.join(ROOT_DIR, ...parts.slice(2));
    if (!target.startsWith(ROOT_DIR + path.sep)) continue;

    let current = null;
    try { current = fs.readFileSync(target); } catch { /* nouveau fichier */ }
    if (current && current.equals(entry.data)) continue;

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.data);
    if (entry.mode & 0o111) fs.chmodSync(target, 0o755);
    updated.push(relative);
  }

  if (!folderFound) {
    console.log(`   Le dossier « ${source.folder} » est introuvable sur GitHub : rien n'a été modifié.`);
    return;
  }

  if (version) fs.writeFileSync(VERSION_FILE, `${version}\n`);
  const label = version ? ` (version ${version.slice(0, 7)})` : '';
  if (updated.length) {
    console.log(`✅ Mise à jour installée${label} : ${updated.length} fichier(s) modifié(s).`);
  } else {
    console.log(`✅ Le site est déjà à jour${label}.`);
  }
}

// Lancement direct : npm run update
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkForUpdates();
}
