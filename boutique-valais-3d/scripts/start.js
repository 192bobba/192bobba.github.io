// Lancement tout-en-un : récupère la dernière version du site, puis le démarre.
// C'est ce que font « npm start » et les fichiers lancer-windows.bat / lancer-mac.command.

import { checkForUpdates } from './update.js';

await checkForUpdates();
await import('../server.js');
