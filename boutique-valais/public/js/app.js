// Démarrage du site : chargement des réglages, en-tête, routes.

import { api } from './api.js';
import { cart } from './cart.js';
import { state } from './state.js';
import { askAge, hasAnswered, onAgeChange } from './age-gate.js';
import { startRouter, refresh, currentPath } from './router.js';
import { html, emptyState, PLACEHOLDER_IMAGE } from './ui.js';

import { renderHome } from './pages/home.js';
import { renderShop } from './pages/shop.js';
import { renderProduct } from './pages/product.js';
import { renderCart } from './pages/cart.js';
import { renderCheckout } from './pages/checkout.js';
import { renderConfirmation } from './pages/confirmation.js';
import { renderAdmin } from './pages/admin.js';

const routes = [
  [/^\/$/, renderHome],
  [/^\/boutique(?:\/([\w-]+))?$/, renderShop],
  [/^\/produit\/([\w-]+)$/, renderProduct],
  [/^\/panier$/, renderCart],
  [/^\/commande$/, renderCheckout],
  [/^\/confirmation$/, renderConfirmation],
  [/^\/admin(?:\/(.*))?$/, renderAdmin],
];

function renderNotFound(view) {
  view.innerHTML = html`<div class="container">${emptyState({
    title: 'Page introuvable',
    text: "Cette page n'existe pas (ou plus).",
    actionHref: '#/boutique',
    actionLabel: 'Voir la boutique',
  })}</div>`;
}

function renderError(view, error, onRetry = refresh) {
  view.innerHTML = html`<div class="container section narrow">
    <div class="notice notice-warning"><strong>Oups.</strong> ${error.message || 'Une erreur est survenue.'}</div>
    <button class="btn btn-outline" type="button" data-retry>Réessayer</button>
  </div>`;
  view.querySelector('[data-retry]').addEventListener('click', onRetry);
}

function updateHeader(path) {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const section = link.dataset.nav;
    const active = section === 'boutique'
      ? path.startsWith('/boutique') || path.startsWith('/produit')
      : path.startsWith(`/${section}`);
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function updateCartCount() {
  const count = cart.count();
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = count > 99 ? '99+' : String(count);
    el.hidden = count === 0;
  });
  const link = document.querySelector('.cart-link .visually-hidden');
  if (link) link.textContent = count ? `Panier (${count} article${count > 1 ? 's' : ''})` : 'Panier';
}

// Chaque navigation dessine la page dans un nouveau conteneur ; si l'utilisateur
// a déjà changé de page entre-temps, l'ancien rendu est simplement ignoré.
let renderCount = 0;
async function renderRoute() {
  const id = ++renderCount;
  const path = currentPath();
  const main = document.getElementById('contenu');
  const [pattern, page] = routes.find(([regex]) => regex.test(path)) || [null, renderNotFound];
  const params = pattern ? pattern.exec(path).slice(1) : [];
  const view = document.createElement('div');

  main.setAttribute('aria-busy', 'true');
  try {
    await page(view, params);
  } catch (error) {
    console.error(error);
    renderError(view, error);
  }
  if (id !== renderCount) return;

  main.replaceChildren(view);
  main.removeAttribute('aria-busy');
  updateHeader(path);
  window.scrollTo(0, 0);

  // Première visite : on demande l'âge (sauf dans l'espace admin).
  if (!hasAnswered() && !path.startsWith('/admin')) askAge({ minimumAge: state.config.minimumAge });
}

async function start() {
  // Image de secours si une photo produit est introuvable.
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (img.tagName === 'IMG' && !img.dataset.fallback) {
      img.dataset.fallback = '1';
      img.src = PLACEHOLDER_IMAGE;
    }
  }, true);

  cart.onChange(updateCartCount);
  updateCartCount();

  try {
    [state.config, state.categories] = await Promise.all([api.config(), api.categories()]);
  } catch (error) {
    renderError(document.getElementById('contenu'), error, () => location.reload());
    return;
  }

  document.querySelectorAll('[data-shop-name]').forEach((el) => { el.textContent = state.config.shopName; });

  const ask = () => askAge({ minimumAge: state.config.minimumAge });
  document.querySelector('[data-age-settings]').addEventListener('click', ask);
  onAgeChange(refresh);

  startRouter(renderRoute);
}

start();
