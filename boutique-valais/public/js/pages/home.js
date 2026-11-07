// Page d'accueil : bannière avec le logo, catégories, sélection.

import { api } from '../api.js';
import { state, isVisible, visibleCategories } from '../state.js';
import { html, categoryCard, productCard, formatPrice, setTitle, LOGO_IMAGE } from '../ui.js';

export async function renderHome(view) {
  const products = await api.products();
  setTitle();

  const categories = visibleCategories();
  const countByCategory = (id) => products.filter((p) => p.category === id).length;
  const featured = products.filter((p) => p.featured && isVisible(p)).slice(0, 8);

  view.innerHTML = html`
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">Valais · Wallis</p>
          <h1 class="hero-title">Les couleurs du Valais, au quotidien.</h1>
          <p class="hero-text">T-shirts, sweats, casquettes et spécialités du canton. Livraison partout en Suisse.</p>
          <a class="btn btn-primary btn-lg" href="#/boutique">Découvrir la collection</a>
        </div>
        <div class="hero-media">
          <img src="${LOGO_IMAGE}" alt="" width="900" height="900">
        </div>
      </div>
    </section>

    <section class="section container" aria-labelledby="titre-categories">
      <div class="section-head">
        <h2 id="titre-categories">Catégories</h2>
      </div>
      <div class="category-grid">
        ${categories.map((c) => categoryCard(c, countByCategory(c.id)))}
      </div>
    </section>

    ${featured.length ? html`
      <section class="section container" aria-labelledby="titre-selection">
        <div class="section-head">
          <h2 id="titre-selection">Sélection</h2>
          <a class="link-arrow" href="#/boutique">Tout voir</a>
        </div>
        <div class="product-grid">${featured.map(productCard)}</div>
      </section>` : ''}

    <section class="container" aria-label="Nos engagements">
      <ul class="usp">
        <li><strong>Livraison offerte</strong>dès ${formatPrice(state.config.shipping.freeFrom)} d'achat</li>
        <li><strong>Expédition</strong>partout en Suisse</li>
        <li><strong>Designs</strong>100 % valaisans</li>
      </ul>
    </section>`;
}
