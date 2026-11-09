// Création d'une commande simulée : on revérifie tout (prix, variantes, âge)
// sans faire confiance au formulaire.
// Module partagé : utilisé par le serveur et par la démo en ligne.

import { AppError } from './errors.js';
import { ageFromBirthDate } from './age.js';

export const PAYMENT_METHODS = {
  carte: 'Carte de crédit',
  twint: 'TWINT',
  facture: 'Facture',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const toCents = (chf) => Math.round(Number(chf) * 100);
const text = (value, max = 120) => String(value ?? '').trim().slice(0, max);

function pickOption(options, chosen, label, productName) {
  if (!options?.length) return '';
  const value = text(chosen, 30);
  if (!options.includes(value)) {
    throw new AppError(400, `Choisissez une ${label} valide pour « ${productName} ».`);
  }
  return value;
}

function nextOrderNumber(previousOrders) {
  const last = previousOrders.reduce((max, order) => {
    const n = Number(String(order.number).replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 1000);
  return `VS-${last + 1}`;
}

// settings : { minimumAge, currency, shipping: { cost, freeFrom } }
export function buildOrder(input, { products, categories, settings, previousOrders }) {
  const errors = {};
  const raw = input?.customer ?? {};

  const customer = {
    firstName: text(raw.firstName, 60),
    lastName: text(raw.lastName, 60),
    email: text(raw.email),
    phone: text(raw.phone, 30),
    address: text(raw.address),
    zip: text(raw.zip, 10),
    city: text(raw.city, 60),
  };
  if (!customer.firstName) errors.firstName = 'Indiquez votre prénom.';
  if (!customer.lastName) errors.lastName = 'Indiquez votre nom.';
  if (!EMAIL_PATTERN.test(customer.email)) errors.email = 'Indiquez une adresse e-mail valide.';
  if (!customer.address) errors.address = 'Indiquez votre adresse.';
  if (!/^\d{4}$/.test(customer.zip)) errors.zip = 'Le NPA comporte 4 chiffres.';
  if (!customer.city) errors.city = 'Indiquez votre localité.';

  const items = Array.isArray(input?.items) ? input.items : [];
  if (!items.length) throw new AppError(400, 'Votre panier est vide.');
  if (items.length > 50) throw new AppError(400, 'Trop d’articles différents dans le panier.');

  const restrictedCategories = new Set(categories.filter((c) => c.restricted).map((c) => c.id));

  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item?.productId);
    if (!product) {
      throw new AppError(409, "Un article de votre panier n'est plus disponible. Retournez au panier pour le mettre à jour.");
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new AppError(400, `Quantité invalide pour « ${product.name} ».`);
    }
    const unitCents = toCents(product.price);
    return {
      productId: product.id,
      name: product.name,
      size: pickOption(product.sizes, item.size, 'taille', product.name),
      color: pickOption(product.colors, item.color, 'couleur', product.name),
      qty,
      unitCents,
      lineCents: unitCents * qty,
      restricted: restrictedCategories.has(product.category),
    };
  });

  const containsRestricted = lines.some((line) => line.restricted);
  let birthDate = null;
  if (containsRestricted) {
    birthDate = text(raw.birthDate, 10);
    const age = ageFromBirthDate(birthDate);
    if (age === null) {
      errors.birthDate = 'Indiquez votre date de naissance.';
    } else if (age < settings.minimumAge) {
      errors.birthDate = `Vous devez avoir au moins ${settings.minimumAge} ans pour commander de l'alcool ou du schnoupf.`;
    }
  }

  const payment = Object.hasOwn(PAYMENT_METHODS, input?.payment) ? input.payment : null;
  if (!payment) errors.payment = 'Choisissez un moyen de paiement.';

  if (Object.keys(errors).length) {
    throw new AppError(422, 'Merci de corriger les champs indiqués.', errors);
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineCents, 0);
  const shippingCents = subtotalCents >= toCents(settings.shipping.freeFrom) ? 0 : toCents(settings.shipping.cost);

  return {
    number: nextOrderNumber(previousOrders),
    createdAt: new Date().toISOString(),
    simulated: true,
    customer: { ...customer, birthDate },
    items: lines,
    containsRestricted,
    payment,
    paymentLabel: PAYMENT_METHODS[payment],
    currency: settings.currency,
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}
