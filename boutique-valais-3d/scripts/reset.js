// Remet la boutique dans son état de démonstration :
// supprime les produits modifiés et les commandes de test.
// Commande : npm run reset

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../src/paths.js';

for (const file of ['products.json', 'orders.json']) {
  const fullPath = path.join(DATA_DIR, file);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`Supprimé : data/${file}`);
  }
}
console.log('✅ Données réinitialisées. Les produits de démo reviendront au prochain « npm start ».');
