// Données partagées chargées au démarrage (réglages + catégories).

import { isAdult } from './age-gate.js';

export const state = {
  config: null,
  categories: [],
};

export const categoryById = (id) => state.categories.find((c) => c.id === id);

export const isRestricted = (product) => Boolean(categoryById(product.category)?.restricted);

// Les produits 18+ sont masqués si le visiteur a indiqué avoir moins de 18 ans.
export const isVisible = (product) => isAdult() || !isRestricted(product);

export const visibleCategories = () => state.categories.filter((c) => isAdult() || !c.restricted);
