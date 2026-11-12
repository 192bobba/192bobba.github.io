// Page d'accueil : un vol autour du Cervin, de la nuit au lever du jour, piloté par le
// défilement. Cinq chapitres, puis la collection en carrousel 3D, les catégories et l'emblème.

import { api } from '../api.js';
import { state, isVisible, visibleCategories } from '../state.js';
import { worldControl } from '../world-control.js';
import { html, raw, categoryCard, formatPrice, imageOf, setTitle, LOGO_IMAGE } from '../ui.js';

const STAR_ICON = raw('<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="M0,-10L2.245,-3.09L9.511,-3.09L3.633,1.18L5.878,8.09L0,3.82L-5.878,8.09L-3.633,1.18L-9.511,-3.09L-2.245,-3.09Z"/></svg>');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const spaced = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ---- Gabarits -----------------------------------------------------------------------

const chapter = (index, content) => html`
  <section class="chapter" data-chapter="${index}">
    <div class="chapter-pin">
      <div class="container"><div class="chapter-content">${content}</div></div>
    </div>
  </section>`;

function marquee(items) {
  const group = (hidden) => html`
    <span class="marquee-group" ${hidden ? raw('aria-hidden="true"') : ''}>
      ${items.map((item) => html`<span class="marquee-item">${item}</span>${STAR_ICON}`)}
    </span>`;
  return html`<div class="marquee"><div class="marquee-track">${group(false)}${group(true)}</div></div>`;
}

const ringCard = (product, index) => html`
  <a class="ring-card" href="#/produit/${product.id}" data-ring-card="${index}" draggable="false">
    <span class="ring-card-media"><img src="${imageOf(product)}" alt="" width="400" height="400" draggable="false"></span>
    <span class="ring-card-body">
      <span class="ring-card-title">${product.name}</span>
      <span class="ring-card-price">${formatPrice(product.price)}</span>
    </span>
  </a>`;

// ---- Carrousel 3D de la collection ----------------------------------------------------

function startRing(stage) {
  const track = stage.querySelector('[data-ring-track]');
  const cards = [...stage.querySelectorAll('[data-ring-card]')];
  const count = cards.length;
  if (!count) return () => {};
  const step = 360 / count;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let angle = 0;        // rotation affichée (degrés)
  let velocity = 0;     // élan après un glisser
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let frame = 0;
  let visible = false;
  let hovering = false;
  let last = performance.now();

  function layout() {
    const width = cards[0].offsetWidth || 220;
    const radius = Math.max(width * 0.9, (width / 2) / Math.tan(Math.PI / count) + width * 0.16);
    stage.style.setProperty('--ring-radius', `${Math.round(radius)}px`);
    cards.forEach((card, i) => card.style.setProperty('--ring-angle', `${(i * step).toFixed(2)}deg`));
  }

  function draw() {
    track.style.setProperty('--ring-rotation', `${angle.toFixed(2)}deg`);
    cards.forEach((card, i) => {
      // 1 quand la carte est de face, 0 de profil, négatif de dos.
      const facing = Math.cos(((i * step + angle) * Math.PI) / 180);
      card.style.opacity = String(clamp(0.12 + facing * 1.1, 0, 1).toFixed(3));
      card.style.pointerEvents = facing > 0.55 ? 'auto' : 'none';
      card.classList.toggle('is-front', facing > 0.92);
    });
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) {
      angle += velocity * dt;
      velocity *= Math.exp(-dt * 3.2);
      // Rotation lente tant que personne n'y touche.
      if (!hovering && !reduced && Math.abs(velocity) < 6) angle -= dt * 7;
    }
    draw();
    schedule();
  }

  function schedule() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    last = performance.now();
    schedule();
  });
  observer.observe(stage);

  const onDown = (event) => {
    dragging = true;
    moved = 0;
    lastX = event.clientX;
    velocity = 0;
  };
  const onMove = (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    moved += Math.abs(dx);
    angle += dx * 0.28;
    velocity = dx * 0.28 * 55;
    if (moved > 8) stage.classList.add('is-dragging');
  };
  const onUp = () => {
    dragging = false;
    // On laisse le clic se produire avant de retirer la marque « glisser ».
    setTimeout(() => stage.classList.remove('is-dragging'), 0);
  };
  const onClick = (event) => {
    if (moved > 8) event.preventDefault(); // c'était un glisser, pas un clic
  };
  const turn = (direction) => { velocity = direction * step * 3.4; };
  const onKey = (event) => {
    if (event.key === 'ArrowLeft') turn(1);
    if (event.key === 'ArrowRight') turn(-1);
  };
  const onFocus = (event) => {
    const index = cards.indexOf(event.target.closest('[data-ring-card]'));
    if (index === -1) return;
    // Amène la carte qui reçoit le focus clavier face à l'utilisateur.
    const target = -index * step;
    angle += ((((target - angle) % 360) + 540) % 360) - 180;
    velocity = 0;
  };
  const enter = () => { hovering = true; };
  const leave = () => { hovering = false; };

  stage.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  stage.addEventListener('click', onClick, true);
  stage.addEventListener('keydown', onKey);
  stage.addEventListener('focusin', onFocus);
  stage.addEventListener('pointerenter', enter);
  stage.addEventListener('pointerleave', leave);
  stage.querySelector('[data-ring-prev]')?.addEventListener('click', () => turn(1));
  stage.querySelector('[data-ring-next]')?.addEventListener('click', () => turn(-1));
  window.addEventListener('resize', layout);

  layout();
  draw();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('resize', layout);
  };
}

// ---- Page ---------------------------------------------------------------------------------

export async function renderHome(view) {
  const products = await api.products();
  setTitle();

  const categories = visibleCategories();
  const countByCategory = (id) => products.filter((p) => p.category === id).length;
  const visible = products.filter(isVisible);
  // La collection en vitrine : d'abord les produits mis en avant, complétés au besoin.
  const showcase = [...visible.filter((p) => p.featured), ...visible.filter((p) => !p.featured)].slice(0, 8);

  view.innerHTML = html`
    <div class="journey" data-journey>
      ${chapter(0, html`
        <p class="eyebrow">Valais · Wallis</p>
        <h1 class="hero-title">Les couleurs du Valais, au quotidien.</h1>
        <p class="chapter-text">Vêtements et accessoires nés à l'ombre du Cervin. Faites défiler : le jour se lève.</p>
        <div class="hero-actions">
          <a class="btn btn-light btn-lg" href="#/boutique">Découvrir la collection</a>
          <button type="button" class="hero-link" data-next-chapter>Commencer l'ascension</button>
        </div>`)}

      ${chapter(1, html`
        <p class="eyebrow">Chapitre 1 · La nuit</p>
        <h2 class="chapter-title">Treize étoiles.</h2>
        <p class="chapter-text">Une pour chaque dizain du Valais. Rouges sur le blanc, blanches sur le rouge :
          depuis 1815, elles veillent ensemble sur le canton.</p>`)}

      ${chapter(2, html`
        <p class="eyebrow">Chapitre 2 · Avant l'aube</p>
        <h2 class="chapter-title">L'ascension.</h2>
        <p class="chapter-text">Bien avant le jour, les frontales des cordées dessinent l'arête du Hörnli.</p>
        <p class="altimeter" aria-hidden="true"><span data-altimeter>3 260</span> m</p>`)}

      ${chapter(3, html`
        <p class="eyebrow">Chapitre 3 · Le premier rayon</p>
        <h2 class="chapter-title">Rouge et blanc.</h2>
        <p class="chapter-text">Chaque matin, le Cervin porte nos couleurs : le rouge de l'aube
          sur le blanc des neiges.</p>`)}

      ${chapter(4, html`
        <p class="eyebrow">Chapitre 4 · 4 478 mètres</p>
        <h2 class="chapter-title">Le Valais, tout en haut.</h2>
        <p class="chapter-text">Des pièces dessinées ici, pour le porter fièrement, de la plaine aux sommets.</p>
        <div class="hero-actions">
          <a class="btn btn-light btn-lg" href="#/boutique">Voir toute la boutique</a>
        </div>`)}

      <div class="journey-end" aria-hidden="true"></div>

      <aside class="hud" data-hud aria-hidden="true">
        <ol class="hud-steps">
          ${[0, 1, 2, 3, 4].map((i) => html`<li data-hud-step="${i}"></li>`)}
        </ol>
        <dl class="hud-data">
          <div><dt>Altitude</dt><dd><span data-hud-altitude>3 000</span> m</dd></div>
          <div><dt>Heure</dt><dd data-hud-clock>04:20</dd></div>
        </dl>
        <p class="hud-coords">45°58′35″ N · 7°39′31″ E</p>
      </aside>

      <div class="scroll-hint" data-scroll-hint aria-hidden="true"><span></span></div>
    </div>

    <div class="after-journey">
      <section class="showcase" aria-labelledby="titre-collection">
        <div class="container section-head">
          <div>
            <p class="eyebrow">La collection</p>
            <h2 id="titre-collection">Portez vos couleurs.</h2>
          </div>
          <a class="link-arrow" href="#/boutique">Tout voir</a>
        </div>
        <div class="ring-stage" data-ring tabindex="-1">
          <div class="ring" data-ring-track>
            ${showcase.map(ringCard)}
          </div>
          <button type="button" class="ring-button ring-prev" data-ring-prev aria-label="Produit précédent">‹</button>
          <button type="button" class="ring-button ring-next" data-ring-next aria-label="Produit suivant">›</button>
        </div>
        <p class="ring-hint">Faites glisser pour faire tourner la collection</p>
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
    </div>`;

  // Une fois la page affichée : on relie le défilement au vol, et on lance les animations.
  return () => {
    const cleanups = [];
    let active = true;
    const journey = view.querySelector('[data-journey]');
    const chapters = [...view.querySelectorAll('[data-chapter]')];
    const hud = view.querySelector('[data-hud]');
    const hudSteps = [...view.querySelectorAll('[data-hud-step]')];
    const hudAltitude = view.querySelector('[data-hud-altitude]');
    const hudClock = view.querySelector('[data-hud-clock]');
    const altimeter = view.querySelector('[data-altimeter]');
    const scrollHint = view.querySelector('[data-scroll-hint]');
    const lastIndex = chapters.length - 1;

    // Position dans l'histoire : 0 = premier chapitre … 4 = sommet, 5 = vue d'ensemble finale.
    // Le mouvement ralentit pendant qu'un texte est affiché, et accélère entre deux chapitres.
    function update() {
      const viewport = window.innerHeight;
      let position = 0;
      chapters.forEach((element, i) => {
        const rect = element.getBoundingClientRect();
        const s = -rect.top / viewport; // 0 quand le chapitre arrive en haut de l'écran
        const pinned = rect.height / viewport - 1; // durée pendant laquelle le texte reste fixe
        if (s >= 0 || i === 0) {
          if (s <= pinned) position = i - 0.12 + 0.24 * clamp(s / pinned, 0, 1);
          else if (i < lastIndex) position = i + 0.12 + 0.76 * clamp(s - pinned, 0, 1);
          else position = i + 0.12 + 0.88 * clamp((s - pinned) / 1.05, 0, 1);
        }
        const show = smooth(-0.5, -0.1, s) * (1 - smooth(pinned + 0.08, pinned + 0.5, s));
        element.style.setProperty('--show', show.toFixed(3));
        element.classList.toggle('is-active', show > 0.5);
        if (i === 2) altimeter.textContent = spaced(Math.round(3260 + 1218 * smooth(-0.25, pinned + 0.35, s)));
      });
      position = clamp(position, 0, chapters.length);
      worldControl.journey(position / chapters.length);

      const end = journey.getBoundingClientRect().bottom;
      hud.style.opacity = String(clamp((end - viewport * 0.55) / (viewport * 0.3), 0, 1));
      scrollHint.style.opacity = String(1 - smooth(0.05, 0.4, position));
      hudSteps.forEach((step, i) => step.classList.toggle('is-current', Math.round(clamp(position, 0, lastIndex)) === i));
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (active) update();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    // Affichage de bord : altitude de la caméra et heure du lever du jour.
    const hudTimer = setInterval(() => {
      const info = worldControl.info();
      if (!info) return;
      hudAltitude.textContent = spaced(info.altitude);
      hudClock.textContent = info.clock;
    }, 120);
    cleanups.push(() => clearInterval(hudTimer));

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    view.querySelector('[data-next-chapter]').addEventListener('click', () => {
      const top = chapters[1].getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.2;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    });

    cleanups.push(startRing(view.querySelector('[data-ring]')));

    // Drapeau 3D de la section « Notre emblème ».
    const flagStage = view.querySelector('[data-flag-scene]');
    import('../three/flag-scene.js')
      .then(({ createFlagScene }) => {
        const stop = active ? createFlagScene(flagStage, { image: LOGO_IMAGE }) : null;
        if (!stop) return;
        flagStage.classList.add('is-ready');
        cleanups.push(stop);
        if (!active) stop();
      })
      .catch((error) => console.warn('Drapeau 3D indisponible :', error));

    return () => {
      active = false;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cleanups.forEach((stop) => stop());
      worldControl.calm();
    };
  };
}
