// Fiche produit : choix de la couleur, de la taille, de la quantité.

import { api } from '../api.js';
import { cart } from '../cart.js';
import { state, categoryById, isRestricted, isVisible } from '../state.js';
import { isAdult, askAge } from '../age-gate.js';
import { html, raw, emptyState, imageOf, formatPrice, productCard, swatch, setTitle, toast, showFormError } from '../ui.js';

export async function renderProduct(view, [id]) {
  let product;
  try {
    product = await api.product(id);
  } catch (error) {
    if (error.status !== 404) throw error;
    setTitle('Produit introuvable');
    view.innerHTML = html`<div class="container">${emptyState({
      title: 'Produit introuvable',
      text: "Ce produit n'existe plus ou a été retiré de la boutique.",
      actionHref: '#/boutique',
      actionLabel: 'Voir la boutique',
    })}</div>`;
    return;
  }

  const category = categoryById(product.category);
  const restricted = isRestricted(product);
  const minimumAge = state.config.minimumAge;
  setTitle(product.name);

  const breadcrumb = html`
    <nav class="breadcrumb" aria-label="Fil d'Ariane">
      <a href="#/boutique">Boutique</a><span aria-hidden="true">›</span>
      ${category ? html`<a href="#/boutique/${category.id}">${category.name}</a>` : ''}
    </nav>`;

  if (restricted && !isAdult()) {
    view.innerHTML = html`
      <div class="container section narrow">
        ${breadcrumb}
        <div class="notice notice-warning">
          <p><strong>Ce produit est réservé aux personnes de ${minimumAge} ans et plus.</strong></p>
          <button type="button" class="btn btn-sm btn-outline" data-age-retry>J'ai ${minimumAge} ans ou plus</button>
        </div>
      </div>`;
    view.querySelector('[data-age-retry]').addEventListener('click', () => askAge({ minimumAge }));
    return;
  }

  const { sizes = [], colors = [] } = product;
  const related = (await api.products())
    .filter((p) => p.category === product.category && p.id !== product.id && isVisible(p))
    .slice(0, 4);

  view.innerHTML = html`
    <div class="container section">
      ${breadcrumb}
      <div class="product-detail">
        <div class="product-media">
          <img src="${imageOf(product)}" alt="${product.name}" width="800" height="800">
        </div>

        <div class="product-info">
          <h1>${product.name}</h1>
          <p class="product-price">${formatPrice(product.price)}</p>

          ${restricted ? html`
            <div class="notice notice-warning">
              Vente réservée aux ${minimumAge} ans et plus. Votre date de naissance sera demandée à la commande.
            </div>` : ''}

          <form class="buy-form" novalidate>
            ${colors.length ? html`
              <fieldset class="option-group">
                <legend>Couleur : <span class="option-current" data-current-color>${colors[0]}</span></legend>
                <div class="option-list">
                  ${colors.map((color, i) => html`
                    <label class="option">
                      <input type="radio" name="color" value="${color}" ${i === 0 ? raw('checked') : ''}>
                      <span>${swatch(color)}${color}</span>
                    </label>`)}
                </div>
              </fieldset>` : ''}

            ${sizes.length ? html`
              <fieldset class="option-group">
                <legend>Taille</legend>
                <div class="option-list">
                  ${sizes.map((size) => html`
                    <label class="option">
                      <input type="radio" name="size" value="${size}" ${sizes.length === 1 ? raw('checked') : ''}>
                      <span>${size}</span>
                    </label>`)}
                </div>
              </fieldset>` : ''}

            <div class="qty-row">
              <label for="quantite">Quantité</label>
              <div class="qty">
                <button type="button" data-step="-1" aria-label="Diminuer la quantité">−</button>
                <input id="quantite" name="qty" type="number" inputmode="numeric" min="1" max="99" value="1">
                <button type="button" data-step="1" aria-label="Augmenter la quantité">+</button>
              </div>
            </div>

            <p class="form-error" role="alert" hidden></p>
            <button class="btn btn-primary btn-lg btn-block" type="submit">Ajouter au panier</button>
          </form>

          ${product.description ? html`
            <div class="product-description">
              <h2>Description</h2>
              <p>${product.description}</p>
            </div>` : ''}
        </div>
      </div>

      ${related.length ? html`
        <section class="section related" aria-labelledby="titre-similaires">
          <h2 id="titre-similaires">Vous aimerez aussi</h2>
          <div class="product-grid">${related.map(productCard)}</div>
        </section>` : ''}
    </div>`;

  const form = view.querySelector('.buy-form');
  const qtyInput = form.querySelector('[name="qty"]');
  const errorEl = form.querySelector('.form-error');

  form.addEventListener('change', (event) => {
    if (event.target.name === 'color') form.querySelector('[data-current-color]').textContent = event.target.value;
    if (event.target.name === 'size') showFormError(errorEl, '');
  });

  form.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = (parseInt(qtyInput.value, 10) || 1) + Number(button.dataset.step);
      qtyInput.value = Math.max(1, Math.min(99, next));
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const size = data.get('size') || '';
    if (sizes.length && !size) {
      showFormError(errorEl, 'Choisissez une taille.');
      form.querySelector('[name="size"]').focus();
      return;
    }
    const qty = Math.max(1, Math.min(99, parseInt(data.get('qty'), 10) || 1));
    qtyInput.value = qty;
    cart.add({ productId: product.id, size, color: data.get('color') || '', qty });
    showFormError(errorEl, '');
    toast(`${qty} × ${product.name} ajouté au panier`, { actionHref: '#/panier', actionLabel: 'Voir le panier' });
  });
}
