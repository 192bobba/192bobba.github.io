// Page d'accueil : scène 3D du Cervin, bandeau défilant, catégories,
// drapeau 3D de l'emblème, sélection de produits.

import { api } from '../api.js';
import { state, isVisible, visibleCategories } from '../state.js';
import { html, raw, categoryCard, productCard, formatPrice, setTitle, LOGO_IMAGE } from '../ui.js';

const STAR_ICON = raw('<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0,-10L2.245,-3.09L9.511,-3.09L3.633,1.18L5.878,8.09L0,3.82L-5.878,8.09L-3.633,1.18L-9.511,-3.09L-2.245,-3.09Z"/></svg>');

function marquee(items) {
  const group = (hidden) => html`
    <span class="marquee-group" ${hidden ? raw('aria-hidden="true"') : ''}>
      ${items.map((item) => html`<span class="marquee-item">${item}</span>${STAR_ICON}`)}
    </span>`;
  return html`
    <div class="marquee">
      <div class="marquee-track">${group(false)}${group(true)}</div>
    </div>`;
}

export async function renderHome(view) {
  const products = await api.products();
  setTitle();

  const categories = visibleCategories();
  const countByCategory = (id) => products.filter((p) => p.category === id).length;
  const featured = products.filter((p) => p.featured && isVisible(p)).slice(0, 8);

  view.innerHTML = html`
    <section class="hero-3d" data-hero>
      <div class="hero-scene" data-hero-scene aria-hidden="true">
        <img class="hero-fallback" src="${LOGO_IMAGE}" alt="" width="900" height="900">
      </div>
      <div class="container hero-content" data-hero-content>
        <p class="eyebrow">Valais · Wallis</p>
        <h1 class="hero-title">Les couleurs du Valais, au quotidien.</h1>
        <p class="hero-text">T-shirts, sweats, casquettes et spécialités du canton. Livraison partout en Suisse.</p>
        <div class="hero-actions">
          <a class="btn btn-light btn-lg" href="#/boutique">Découvrir la collection</a>
          <button type="button" class="hero-link" data-scroll-to="titre-categories">Voir les catégories</button>
        </div>
      </div>
      <div class="scroll-hint" aria-hidden="true"><span></span></div>
    </section>

    ${marquee([
      `Livraison offerte dès ${formatPrice(state.config.shipping.freeFrom)}`,
      'Expédition partout en Suisse',
      'Designs 100 % valaisans',
      'Treize étoiles, un seul canton',
    ])}

    <section class="section container" aria-labelledby="titre-categories">
      <div class="section-head">
        <h2 id="titre-categories">Catégories</h2>
      </div>
      <div class="category-grid">
        ${categories.map((c) => categoryCard(c, countByCategory(c.id)))}
      </div>
    </section>

    <section class="brand-story" aria-labelledby="titre-embleme">
      <div class="container brand-story-inner">
        <div class="flag-stage" data-flag-scene aria-hidden="true">
          <img class="flag-fallback" src="${LOGO_IMAGE}" alt="" width="900" height="900">
        </div>
        <div class="brand-story-text">
          <p class="eyebrow">Notre emblème</p>
          <h2 id="titre-embleme">Rouge et blanc, treize étoiles et le Cervin.</h2>
          <p>Les treize étoiles du drapeau valaisan représentent les treize dizains du canton.
            Avec le Cervin, elles forment l'emblème que l'on retrouve sur chacune de nos pièces.</p>
          <a class="link-arrow" href="#/boutique">Découvrir la collection</a>
        </div>
      </div>
    </section>

    ${featured.length ? html`
      <section class="section container" aria-labelledby="titre-selection">
        <div class="section-head">
          <h2 id="titre-selection">Sélection</h2>
          <a class="link-arrow" href="#/boutique">Tout voir</a>
        </div>
        <div class="product-grid">${featured.map(productCard)}</div>
      </section>` : ''}`;

  // Une fois la page affichée : scènes 3D, effet de défilement, lien « Voir les catégories ».
  return () => {
    const cleanups = [];
    let active = true;

    const startScene = (selector, loader) => {
      const container = view.querySelector(selector);
      loader()
        .then((stop) => {
          if (!stop) return; // pas de 3D disponible : l'image de secours reste affichée
          if (!active) { stop(); return; }
          container.classList.add('is-ready');
          cleanups.push(stop);
        })
        .catch((error) => console.warn('Animation 3D indisponible :', error));
    };

    startScene('[data-hero-scene]', () => import('../three/hero-scene.js')
      .then(({ createHeroScene }) => createHeroScene(view.querySelector('[data-hero-scene]'))));
    startScene('[data-flag-scene]', () => import('../three/flag-scene.js')
      .then(({ createFlagScene }) => createFlagScene(view.querySelector('[data-flag-scene]'), { image: LOGO_IMAGE })));

    // Le texte de la bannière s'efface doucement quand on descend.
    const content = view.querySelector('[data-hero-content]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;
    const onScroll = () => {
      if (ticking || reduced) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = Math.min(window.scrollY, 700);
        content.style.setProperty('--parallax', `${(y * 0.25).toFixed(1)}px`);
        content.style.opacity = String(Math.max(0, 1 - y / 480));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const scrollLink = view.querySelector('[data-scroll-to]');
    const onScrollLink = (event) => {
      event.preventDefault();
      document.getElementById(scrollLink.dataset.scrollTo)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    };
    scrollLink.addEventListener('click', onScrollLink);

    return () => {
      active = false;
      window.removeEventListener('scroll', onScroll);
      cleanups.forEach((stop) => stop());
    };
  };
}
