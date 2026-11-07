// Point d'entrée : lance le site sur http://localhost:3000
// Commande : npm start   (ou : node server.js)

import http from 'node:http';
import { spawn } from 'node:child_process';
import config from './src/config.js';
import * as store from './src/store.js';
import { handleApi } from './src/api.js';
import { HttpError, sendJson, serveStatic } from './src/http.js';

store.init();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message, details: err.details });
    } else {
      console.error(err);
      sendJson(res, 500, { error: 'Erreur interne du serveur.' });
    }
  }
});

function openBrowser(url) {
  const commands = {
    darwin: ['open', [url]],
    win32: ['cmd', ['/c', 'start', '', url]],
  };
  const [command, args] = commands[process.platform] || ['xdg-open', [url]];
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    // Pas grave : il suffit d'ouvrir l'adresse à la main.
  }
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Le port ${config.port} est déjà utilisé.`);
    console.error('   Le site tourne peut-être déjà dans une autre fenêtre : ouvrez http://localhost:' + config.port);
    console.error('   Sinon, changez le port dans le fichier src/config.js (par ex. 3001).\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(config.port, () => {
  const url = `http://localhost:${config.port}`;
  console.log('');
  console.log(`✅ ${config.shopName} est en ligne sur votre ordinateur !`);
  console.log(`   Boutique : ${url}`);
  console.log(`   Admin    : ${url}/#/admin   (mot de passe : voir README.md)`);
  console.log('');
  console.log('   Pour arrêter le site : appuyez sur Ctrl + C dans cette fenêtre.');
  console.log('');
  if (process.argv.includes('--open')) openBrowser(url);
});
