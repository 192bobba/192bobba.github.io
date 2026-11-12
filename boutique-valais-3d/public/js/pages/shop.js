// Liste des produits avec filtre par catégorie (#/boutique ou #/boutique/sweats).

import { api } from '../api.js';
import { state, categoryById, isVisible, visibleCategories } from '../state.js';
import { isAdult, askAge } from '../age-gate.js';
import { html, productCard, emptyState, plural, setTitle } from '../ui.js';

const restrictedNotice = (category) => html`
  <div class="notice notice-warning">
    <p><strong>${category.name} : réservé aux ${state.config.minimumAge} ans et plus.</strong></p>
    <p>Vous avez indiqué avoir moins de ${state.config.minimumAge} ans. Ces articles sont donc masqués.</p>
    <button type="button" class="btn btn-sm btn-outline" data-age-retry>J'ai ${state.config.minimumAge} ans ou plus</button>
  </div>`;

export async function renderShop(view, [categoryId]) {
  const category = categoryId ? categoryById(categoryId) : null;
  if (categoryId && !category) {
    setTitle('Catégorie introuvable');
    view.innerHTML = html`<div class="container">${emptyState({
      title: 'Catégorie introuvable',
      actionHref: '#/boutique',
      actionLabel: 'Voir toute la boutique',
    })}</div>`;
    return;
  }

  const products = await api.products();
  const blocked = category?.restricted && !isAdult();
  const list = blocked ? [] : products.filter((p) => isVisible(p) && (!category || p.category === category.id));

  setTitle(category ? category.name : 'Boutique');

  const chip = (href, label, active) => html`
    <a class="chip ${active ? 'is-active' : ''}" href="${href}" ${active ? html`aria-current="page"` : ''}>${label}</a>`;

  view.innerHTML = html`
    <div class="container section">
      <div class="page-head">
        <h1>${category ? category.name : 'Toute la boutique'}</h1>
        <p class="muted">${category?.description || 'Vêtements et merchandising aux couleurs du Valais.'}</p>
      </div>

      <nav class="chips" aria-label="Filtrer par catégorie">
        ${chip('#/boutique', 'Tout', !category)}
        ${visibleCategories().map((c) => chip(`#/boutique/${c.id}`, c.name, c.id === category?.id))}
      </nav>

      ${blocked ? restrictedNotice(category) : html`
        <p class="result-count">${plural(list.length, 'article')}</p>
        ${list.length
          ? html`<div class="product-grid">${list.map(productCard)}</div>`
          : html`<p>Aucun article dans cette catégorie pour le moment.</p>`}`}
    </div>`;

  view.querySelector('[data-age-retry]')?.addEventListener('click', () => {
    askAge({ minimumAge: state.config.minimumAge });
  });
}
