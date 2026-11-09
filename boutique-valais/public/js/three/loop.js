// Outils communs aux scènes 3D : boucle d'animation économe et nettoyage.

import { WebGLRenderer } from '/vendor/three/three.min.js';

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Crée le moteur de rendu, ou renvoie null si la 3D n'est pas disponible (vieux navigateur, WebGL désactivé).
export function createRenderer(container, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', ...options });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  container.append(canvas);
  return renderer;
}

// Lance l'animation uniquement quand la scène est visible à l'écran et que l'onglet est actif.
// render(temps écoulé en s, durée de l'image en s). Avec « animations réduites », une seule image est dessinée.
export function startLoop(container, render, { staticTime = 4 } = {}) {
  const reduced = prefersReducedMotion();
  let frame = 0;
  let onScreen = true;
  let elapsed = reduced ? staticTime : 0;
  let last = performance.now();

  const tick = (now) => {
    frame = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    render(elapsed, dt);
    schedule();
  };

  const schedule = () => {
    if (!frame && !reduced && onScreen && !document.hidden) frame = requestAnimationFrame(tick);
  };

  const resume = () => {
    last = performance.now();
    schedule();
  };

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) resume();
  });
  observer.observe(container);
  document.addEventListener('visibilitychange', resume);

  render(elapsed, 0);
  schedule();

  return {
    redraw: () => render(elapsed, 0),
    stop() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', resume);
    },
  };
}

// Libère la mémoire graphique (important quand on quitte la page).
export function disposeScene(scene, renderer) {
  scene.traverse((object) => {
    object.geometry?.dispose();
    for (const material of [].concat(object.material || [])) {
      material.map?.dispose();
      material.dispose();
    }
  });
  scene.background?.dispose?.();
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}

// Suivi du pointeur (souris ou doigt), valeurs lissées entre -1 et 1.
export function trackPointer(target = window) {
  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0 };
  const onMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  target.addEventListener('pointermove', onMove, { passive: true });
  pointer.update = (dt) => {
    const k = 1 - Math.exp(-dt * 3);
    pointer.smoothX += (pointer.x - pointer.smoothX) * k;
    pointer.smoothY += (pointer.y - pointer.smoothY) * k;
  };
  pointer.dispose = () => target.removeEventListener('pointermove', onMove);
  return pointer;
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

export function easeOutBack(t) {
  const x = Math.min(1, Math.max(0, t));
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}
