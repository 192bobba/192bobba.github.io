// Animations d'interface : apparition au défilement, effet 3D au survol des produits,
// en-tête qui réagit au défilement. Tout est désactivé si l'utilisateur préfère
// réduire les animations (réglage du système).

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const REVEAL_SELECTOR = '.reveal, .product-card, .category-card, .section-head, .brand-story-text, .page-head';

// Les éléments apparaissent en glissant doucement quand ils entrent dans l'écran.
export function revealOnScroll(root) {
  if (reducedMotion() || !('IntersectionObserver' in window)) return () => {};
  const elements = [...root.querySelectorAll(REVEAL_SELECTOR)];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

  elements.forEach((el) => {
    const siblings = el.parentElement ? [...el.parentElement.children] : [el];
    const index = siblings.indexOf(el);
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', `${(index % 4) * 80}ms`);
    observer.observe(el);
  });
  return () => observer.disconnect();
}

// Inclinaison 3D des photos produit qui suit la souris (ordinateur uniquement).
export function tiltOnHover(root) {
  if (reducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  let current = null;

  const onMove = (event) => {
    const media = event.target.closest?.('.product-card-media, .product-media');
    if (media !== current) reset();
    if (!media) return;
    current = media;
    const rect = media.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const strength = media.classList.contains('product-media') ? 5 : 8;
    media.classList.add('is-tilting');
    media.style.setProperty('--ry', `${(x * strength).toFixed(2)}deg`);
    media.style.setProperty('--rx', `${(-y * strength).toFixed(2)}deg`);
    media.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`);
    media.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  function reset() {
    if (!current) return;
    current.classList.remove('is-tilting');
    current.style.removeProperty('--rx');
    current.style.removeProperty('--ry');
    current = null;
  }

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerleave', reset);
  return () => {
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', reset);
  };
}

// L'en-tête prend une ombre légère dès qu'on fait défiler la page.
export function watchHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

// Petit rebond de l'icône panier quand on ajoute un article.
export function bump(element) {
  if (!element || reducedMotion()) return;
  element.classList.remove('bump');
  void element.offsetWidth; // relance l'animation
  element.classList.add('bump');
}
