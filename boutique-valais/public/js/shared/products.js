// Validation des produits envoyés depuis l'espace admin.
// Module partagé : utilisé par le serveur et par la démo en ligne.

import { AppError } from './errors.js';

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

// Image acceptée : chemin du site (img/…, uploads/…), adresse https://,
// ou (démo en ligne uniquement) photo enregistrée dans le navigateur (data:image/…).
const IMAGE_PATH = /^(\/?[\w\-./]+|https:\/\/\S+)$/;
const IMAGE_DATA = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export function validateProduct(input, categories, { allowImageData = false } = {}) {
  const errors = {};

  const name = text(input.name, 80);
  if (!name) errors.name = 'Le nom est obligatoire.';

  const category = text(input.category, 40);
  if (!categories.some((c) => c.id === category)) errors.category = 'Choisissez une catégorie.';

  const price = Number(String(input.price ?? '').replace(',', '.').trim());
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Indiquez un prix supérieur à 0.';
  else if (price > 10000) errors.price = 'Le prix semble trop élevé (max. CHF 10 000).';

  const rawImage = String(input.image ?? '').trim();
  const isImageData = allowImageData && IMAGE_DATA.test(rawImage);
  const image = isImageData ? rawImage : rawImage.slice(0, 300);
  if (image && !isImageData && !IMAGE_PATH.test(image)) {
    errors.image = "L'image doit être un chemin du site (img/...) ou une adresse https://";
  }

  if (Object.keys(errors).length) {
    throw new AppError(422, 'Certains champs sont à corriger.', errors);
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
