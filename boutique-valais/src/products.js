// Validation des produits envoyés depuis l'espace admin.

import { HttpError } from './http.js';

const text = (value, max) => String(value ?? '').trim().slice(0, max);

// Accepte un tableau ou un texte séparé par des virgules : "S, M, L" → ["S", "M", "L"].
export function parseOptionList(value) {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const seen = new Set();
  const result = [];
  for (const entry of raw) {
    const option = text(entry, 30);
    const key = option.toLowerCase();
    if (option && !seen.has(key)) {
      seen.add(key);
      result.push(option);
    }
  }
  return result.slice(0, 20);
}

export function slugify(value) {
  const slug = String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'produit';
}

export function uniqueId(base, existingIds) {
  let id = base;
  let n = 2;
  while (existingIds.has(id)) id = `${base}-${n++}`;
  return id;
}

export function validateProduct(input, categories) {
  const errors = {};

  const name = text(input.name, 80);
  if (!name) errors.name = 'Le nom est obligatoire.';

  const category = text(input.category, 40);
  if (!categories.some((c) => c.id === category)) errors.category = 'Choisissez une catégorie.';

  const price = Number(String(input.price ?? '').replace(',', '.').trim());
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Indiquez un prix supérieur à 0.';
  else if (price > 10000) errors.price = 'Le prix semble trop élevé (max. CHF 10 000).';

  const image = text(input.image, 300);
  if (image && !/^(\/[\w\-./]+|https:\/\/\S+)$/.test(image)) {
    errors.image = "L'image doit être un chemin local (/img/...) ou une adresse https://";
  }

  if (Object.keys(errors).length) {
    throw new HttpError(422, 'Certains champs sont à corriger.', errors);
  }

  return {
    name,
    category,
    price: Math.round(price * 100) / 100,
    description: text(input.description, 2000),
    image,
    sizes: parseOptionList(input.sizes),
    colors: parseOptionList(input.colors),
    featured: Boolean(input.featured),
  };
}
