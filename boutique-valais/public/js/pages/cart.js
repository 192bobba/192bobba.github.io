// Page panier : quantités, suppression, récapitulatif.

import { api } from '../api.js';
import { cart } from '../cart.js';
import { state, isRestricted } from '../state.js';
import { resolveCart, computeTotals, variantLabel } from '../pricing.js';
import { html, emptyState, imageOf, formatCents, setTitle, steps } from '../ui.js';

export function summaryRows(totals) {
  return html`
    <div class="summary-row"><span>Sous-total</span><span>${formatCents(totals.subtotal)}</span></div>
    <div class="summary-row">
      <span>Livraison</span>
      <span>${totals.shipping ? formatCents(totals.shipping) : 'Offerte'}</span>
    </div>`;
}

const cartLine = (line) => {
  const key = cart.keyOf(line);
  const href = `#/produit/${line.product.id}`;
  return html`
    <li class="cart-line">
      <a class="cart-line-media" href="${href}" tabindex="-1" aria-hidden="true">
        <img src="${imageOf(line.product)}" alt="" width="84" height="84">
      </a>
      <div>
        <a class="cart-line-name" href="${href}">${line.product.name}</a>
        ${variantLabel(line) ? html`<p class="cart-line-variant">${variantLabel(line)}</p>` : ''}
        <p class="cart-line-unit">${formatCents(line.unitCents)} / pièce</p>
        <div class="cart-line-actions">
          <div class="qty qty-sm">
            <button type="button" data-action="dec" data-key="${key}" aria-label="Diminuer la quantité">−</button>
            <output aria-label="Quantité">${line.qty}</output>
            <button type="button" data-action="inc" data-key="${key}" aria-label="Augmenter la quantité">+</button>
          </div>
          <button type="button" class="link-button" data-action="remove" data-key="${key}">Retirer</button>
        </div>
      </div>
      <p class="cart-line-total">${formatCents(line.lineCents)}</p>
    </li>`;
};

export async function renderCart(view) {
  const products = await api.products();
  setTitle('Panier');
  let notice = '';

  const draw = () => {
    const { lines, invalid } = resolveCart(cart.items(), products);
    if (invalid.length) {
      cart.remove(invalid.map(cart.keyOf));
      notice = "Certains articles ne sont plus disponibles et ont été retirés de votre panier.";
    }

    if (!lines.length) {
      view.innerHTML = html`<div class="container">
        ${notice ? html`<div class="notice notice-warning section">${notice}</div>` : ''}
        ${emptyState({
          title: 'Votre panier est vide',
          text: 'Découvrez nos t-shirts, sweats et casquettes aux couleurs du Valais.',
          actionHref: '#/boutique',
          actionLabel: 'Voir la boutique',
        })}</div>`;
      return;
    }

    const totals = computeTotals(lines, state.config);
    const progress = Math.min(100, Math.round((totals.subtotal / totals.freeFrom) * 100));
    const hasRestricted = lines.some((line) => isRestricted(line.product));

    view.innerHTML = html`
      <div class="container section">
        ${steps(1)}
        <h1>Mon panier</h1>
        ${notice ? html`<div class="notice notice-warning">${notice}</div>` : ''}
        <div class="cart-layout">
          <ul class="cart-lines">${lines.map(cartLine)}</ul>

          <aside class="card summary" aria-label="Récapitulatif">
            <h2>Récapitulatif</h2>
            ${summaryRows(totals)}
            ${totals.remainingForFreeShipping > 0 ? html`
              <div class="shipping-progress">
                Plus que <strong>${formatCents(totals.remainingForFreeShipping)}</strong> pour la livraison offerte.
                <div class="shipping-bar"><span style="width:${progress}%"></span></div>
              </div>` : ''}
            <div class="summary-row summary-total"><span>Total</span><span>${formatCents(totals.total)}</span></div>
            ${hasRestricted ? html`
              <p class="summary-note">Votre panier contient des articles ${state.config.minimumAge}+ :
                votre date de naissance sera demandée.</p>` : ''}
            <a class="btn btn-primary btn-lg btn-block" href="#/commande">Passer commande</a>
            <p class="summary-note"><a href="#/boutique">Continuer mes achats</a></p>
          </aside>
        </div>
      </div>`;
  };

  view.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, key } = button.dataset;
    const item = cart.items().find((i) => cart.keyOf(i) === key);
    if (!item) return;
    if (action === 'remove' || (action === 'dec' && item.qty === 1)) cart.remove(key);
    else cart.setQty(key, item.qty + (action === 'inc' ? 1 : -1));
    draw();
    // Garde le focus sur le même bouton après le nouvel affichage (navigation au clavier).
    view.querySelector(`[data-action="${action}"][data-key="${CSS.escape(key)}"]`)?.focus();
  });

  draw();
}
