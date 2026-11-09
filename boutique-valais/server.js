// Serveur du site : http://localhost:3000
// Lancement conseillé : npm start (met d'abord le site à jour, voir scripts/start.js).
// Lancement sans mise à jour : npm run serve

import http from 'node:http';
import { spawn } from 'node:child_process';
import config from './src/config.js';
import * as store from './src/store.js';
import { handleApi } from './src/api.js';
import { HttpError, sendJson, serveStatic } from './src/http.js';

store.init();

// Titre de la fenêtre noire (Windows) : rappel de ne pas la fermer.
process.title = `${config.shopName} : laissez cette fenêtre ouverte`;

// Une erreur imprévue ne doit pas arrêter tout le site : on la note et on continue.
process.on('uncaughtException', (error) => {
  console.error("\n⚠️  Erreur inattendue (le site continue de fonctionner) :", error);
});
process.on('unhandledRejection', (error) => {
  console.error("\n⚠️  Erreur inattendue (le site continue de fonctionner) :", error);
});

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
    console.error(`\n❌ Le site est déjà ouvert dans une autre fenêtre (port ${config.port} occupé).`);
    console.error("   Fermez l'autre fenêtre noire, puis relancez : vous aurez la dernière version.");
    console.error('   (Ou changez le port dans src/config.js, par ex. 3001.)\n');
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
  console.log('   ⚠️  LAISSEZ CETTE FENÊTRE OUVERTE pendant que vous utilisez le site.');
  console.log('       La fermer arrête le site (le navigateur affichera « le site ne répond plus »).');
  console.log('       Vous pouvez la réduire dans la barre des tâches.');
  console.log('');
  console.log('   Pour arrêter le site : fermez cette fenêtre, ou appuyez sur Ctrl + C.');
  console.log('');
  if (process.argv.includes('--open')) openBrowser(url);
});
