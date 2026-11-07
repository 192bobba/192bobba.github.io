// Outils d'affichage partagés par toutes les pages.

import { state, isRestricted } from './state.js';

// ---- Gabarits HTML sécurisés -------------------------------------------
// html`...` échappe automatiquement les valeurs insérées (protection contre
// l'injection de code). raw() permet d'insérer du HTML de confiance.

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export const raw = (value) => new SafeHtml(String(value));

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderValue(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += renderValue(value) + strings[i + 1]; });
  return new SafeHtml(out);
}

// ---- Formats --------------------------------------------------------------

function formatAmount(cents) {
  const [francs, centimes] = (Math.round(cents) / 100).toFixed(2).split('.');
  return `CHF ${francs.replace(/\B(?=(\d{3})+(?!\d))/g, '’')}.${centimes}`;
}

export const formatCents = (cents) => formatAmount(cents);
export const formatPrice = (chf) => formatAmount(Math.round(Number(chf) * 100));

export function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-CH', { dateStyle: 'medium', timeStyle: 'short' });
}

export const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function setTitle(page) {
  const shop = state.config?.shopName || 'Boutique';
  document.title = page ? `${page} · ${shop}` : `${shop} · Vêtements et merch du Valais`;
}

// ---- Petits composants ---------------------------------------------------

export const PLACEHOLDER_IMAGE = '/img/placeholder.svg';
export const imageOf = (product) => product.image || PLACEHOLDER_IMAGE;

export const LOGO_IMAGE = '/img/logo.jpg';

const COLOR_CODES = {
  rouge: '#D9242B',
  blanc: '#FFFFFF',
  noir: '#1D1B19',
  gris: '#9A958F',
  'gris chine': '#B9B5AF',
  bleu: '#1F4FA3',
  marine: '#1D2A48',
  vert: '#2F7D4F',
  beige: '#D9C9A8',
  naturel: '#EFE6D2',
  jaune: '#F2C230',
  orange: '#EE7A22',
  rose: '#F2A7B8',
};

const normalize = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// « Blanc / Rouge » → pastille moitié blanche, moitié rouge.
export function swatch(colorName) {
  const codes = normalize(colorName).split('/').map((part) => COLOR_CODES[part.trim()]).filter(Boolean);
  if (!codes.length) return '';
  const background = codes.length > 1 ? `linear-gradient(90deg, ${codes[0]} 50%, ${codes[1]} 50%)` : codes[0];
  return html`<span class="swatch" style="background:${background}" aria-hidden="true"></span>`;
}

export const ageBadge = () => html`<span class="badge badge-age" title="Réservé aux 18 ans et plus">18+</span>`;

export const productCard = (product) => html`
  <a class="product-card" href="#/produit/${product.id}">
    <div class="product-card-media">
      <img src="${imageOf(product)}" alt="" loading="lazy" width="400" height="400">
      ${isRestricted(product) ? ageBadge() : ''}
    </div>
    <div class="product-card-body">
      <h3 class="product-card-title">${product.name}</h3>
      <p class="product-card-price">${formatPrice(product.price)}</p>
      ${product.colors?.length > 1 ? html`<div class="swatches">${product.colors.map(swatch)}</div>` : ''}
    </div>
  </a>`;

export const categoryCard = (category, count) => html`
  <a class="category-card" href="#/boutique/${category.id}">
    <img src="${category.image || PLACEHOLDER_IMAGE}" alt="" loading="lazy" width="400" height="400">
    <span class="category-card-body">
      <span class="category-card-name">${category.name} ${category.restricted ? ageBadge() : ''}</span>
      <span class="category-card-meta">${plural(count, 'article')}</span>
    </span>
  </a>`;

export function steps(current) {
  const labels = ['Panier', 'Coordonnées', 'Confirmation'];
  return html`
    <ol class="steps" aria-label="Étapes de la commande">
      ${labels.map((label, i) => {
        const n = i + 1;
        const cls = n < current ? 'is-done' : n === current ? 'is-current' : '';
        return html`<li class="${cls}" ${n === current ? raw('aria-current="step"') : ''}>${n}. ${label}</li>`;
      })}
    </ol>`;
}

export const emptyState = ({ title, text, actionHref, actionLabel }) => html`
  <div class="empty-state">
    <h1>${title}</h1>
    ${text ? html`<p class="muted">${text}</p>` : ''}
    ${actionHref ? html`<a class="btn btn-primary" href="${actionHref}">${actionLabel}</a>` : ''}
  </div>`;

// ---- Notifications -----------------------------------------------------

let toastTimer;
export function toast(message, { actionHref, actionLabel } = {}) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html`<span>${message}</span>${actionHref ? html`<a href="${actionHref}">${actionLabel}</a>` : ''}`;
  root.replaceChildren(el);
  requestAnimationFrame(() => el.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-visible');
    setTimeout(() => el.remove(), 250);
  }, 3800);
}

// ---- Erreurs de formulaire -------------------------------------------------

// Affiche les messages d'erreur sous chaque champ ({ email: 'message', ... }).
export function showFieldErrors(form, errors = {}) {
  form.querySelectorAll('[data-field]').forEach((wrapper) => {
    const name = wrapper.dataset.field;
    const message = errors[name];
    const errorEl = wrapper.querySelector('.field-error');
    wrapper.querySelectorAll('input, select, textarea').forEach((input) => {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    });
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.hidden = !message;
    }
  });
  const first = Object.keys(errors).map((name) => form.querySelector(`[name="${name}"]`)).find(Boolean);
  first?.focus();
}

// Efface le message d'erreur d'un champ dès que l'utilisateur le corrige.
export function clearErrorsOnInput(form) {
  const clear = (event) => {
    const wrapper = event.target.closest('[data-field]');
    if (!wrapper) return;
    wrapper.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
    const errorEl = wrapper.querySelector('.field-error');
    if (errorEl) errorEl.hidden = true;
  };
  form.addEventListener('input', clear);
  form.addEventListener('change', clear);
}

export function showFormError(el, message) {
  el.textContent = message || '';
  el.hidden = !message;
}
