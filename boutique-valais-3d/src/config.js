// Réglages du prototype. Modifiez les valeurs puis relancez le serveur.
//
// Le nom de la boutique, l'âge minimum et les frais de port se règlent dans
// data/settings.json (fichier partagé avec la version de démonstration en ligne).

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './paths.js';

const settings = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'settings.json'), 'utf8'));

const config = {
  // Nom, âge minimum (alcool et schnoupf), devise, frais de port : voir data/settings.json
  ...settings,

  // Adresse locale : http://localhost:3000
  port: Number(process.env.PORT) || 3000,

  // Mot de passe de l'espace admin (protection basique, prototype uniquement).
  adminPassword: process.env.ADMIN_PASSWORD || 'valais1815',

  // Taille maximale d'une image envoyée depuis l'admin (3 Mo).
  maxUploadBytes: 3 * 1024 * 1024,
};

export default config;
