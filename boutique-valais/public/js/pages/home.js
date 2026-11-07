// Page d'accueil : bannière, catégories, coups de cœur.

import { api } from '../api.js';
import { state, isVisible, visibleCategories } from '../state.js';
import { html, star, starsRow, categoryCard, productCard, formatPrice, setTitle } from '../ui.js';

export async function renderHome(view) {
  const products = await api.products();
  setTitle();

  const categories = visibleCategories();
  const countByCategory = (id) => products.filter((p) => p.category === id).length;
  const featured = products.filter((p) => p.featured && isVisible(p)).slice(0, 8);

  view.innerHTML = html`
    <section class="hero">
      <div class="container hero-inner">
        <div>
          <p class="hero-kicker">Rouge, blanc et 13 étoiles</p>
          <h1 class="hero-title">Portez fièrement les couleurs du Valais</h1>
          <p class="hero-text">T-shirts, sweats, casquettes et spécialités du canton, livrés partout en Suisse.</p>
          <a class="btn btn-light btn-lg" href="#/boutique">Découvrir la boutique</a>
        </div>
        <img class="hero-badge" src="/img/logo.svg" alt="" width="210" height="256">
      </div>
      <div class="hero-stars" aria-hidden="true">${starsRow(13)}</div>
    </section>

    <section class="section container" aria-labelledby="titre-categories">
      <h2 id="titre-categories">Nos catégories</h2>
      <div class="category-grid">
        ${categories.map((c) => categoryCard(c, countByCategory(c.id)))}
      </div>
    </section>

    ${featured.length ? html`
      <section class="section container" aria-labelledby="titre-coups-de-coeur">
        <div class="section-head">
          <h2 id="titre-coups-de-coeur">Coups de cœur</h2>
          <a class="link-arrow" href="#/boutique">Tout voir</a>
        </div>
        <div class="product-grid">${featured.map(productCard)}</div>
      </section>` : ''}

    <section class="container" aria-label="Nos engagements">
      <ul class="usp">
        <li>${star()}<span><strong>Livraison offerte</strong> dès ${formatPrice(state.config.shipping.freeFrom)}</span></li>
        <li>${star()}<span><strong>Expédition</strong> partout en Suisse</span></li>
        <li>${star()}<span><strong>Designs</strong> 100 % valaisans</span></li>
      </ul>
    </section>`;
}
