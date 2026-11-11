// Page de confirmation après une commande simulée.

import { html, emptyState, formatCents, formatDate, setTitle, steps } from '../ui.js';
import { variantLabel } from '../pricing.js';
import { LAST_ORDER_KEY } from './checkout.js';

function readLastOrder() {
  try { return JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY)); } catch { return null; }
}

export function renderConfirmation(view) {
  const order = readLastOrder();
  setTitle('Commande confirmée');

  if (!order) {
    view.innerHTML = html`<div class="container">${emptyState({
      title: 'Aucune commande récente',
      actionHref: '#/boutique',
      actionLabel: 'Voir la boutique',
    })}</div>`;
    return;
  }

  const { customer } = order;
  view.innerHTML = html`
    <div class="container section narrow">
      ${steps(3)}
      <div class="confirm-hero">
        <div class="confirm-icon" aria-hidden="true">✓</div>
        <h1>Merci ${customer.firstName} !</h1>
        <p>Votre commande <strong>${order.number}</strong> a bien été enregistrée.</p>
      </div>

      <div class="notice">
        Ceci est une <strong>commande de démonstration</strong> : aucun paiement n'a été effectué
        et aucun e-mail n'a été envoyé.
      </div>

      <div class="card">
        <ul class="summary-items">
          ${order.items.map((item) => html`
            <li>
              <span>${item.qty} × ${item.name}
                ${variantLabel(item) ? html`<span class="muted">${variantLabel(item)}</span>` : ''}</span>
              <span>${formatCents(item.lineCents)}</span>
            </li>`)}
        </ul>
        <div class="summary-row"><span>Sous-total</span><span>${formatCents(order.subtotalCents)}</span></div>
        <div class="summary-row"><span>Livraison</span><span>${order.shippingCents ? formatCents(order.shippingCents) : 'Offerte'}</span></div>
        <div class="summary-row summary-total"><span>Total</span><span>${formatCents(order.totalCents)}</span></div>

        <div class="confirm-details">
          <div>
            <h3>Livraison</h3>
            <p>${customer.firstName} ${customer.lastName}<br>${customer.address}<br>${customer.zip} ${customer.city}</p>
          </div>
          <div>
            <h3>Paiement</h3>
            <p>${order.paymentLabel} (simulé)<br><span class="muted">${formatDate(order.createdAt)}</span></p>
          </div>
        </div>
      </div>

      <div class="actions-row">
        <a class="btn btn-primary" href="#/boutique">Continuer mes achats</a>
        <a class="btn btn-ghost" href="#/">Retour à l'accueil</a>
      </div>
    </div>`;
}
