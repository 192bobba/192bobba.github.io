// Télécommande du monde 3D : les pages disent ce qu'elles veulent (« vol », « calme »)
// sans connaître three.js. Le monde lui-même n'est chargé qu'une fois, en arrière-plan.

let world = null;
let status = 'idle'; // idle → loading → ready | unavailable
let wanted = { mode: 'calm', progress: 0, paused: false };
const waiting = new Set();

function apply() {
  if (!world) return;
  if (wanted.mode === 'journey') world.setJourney(wanted.progress);
  else world.setCalm({ nudge: wanted.nudge });
  wanted.nudge = false;
  world.setPaused(wanted.paused);
}

export const worldControl = {
  // Charge et démarre le monde. Renvoie 'ready', ou 'unavailable' si la 3D n'est pas possible.
  async start(container, options) {
    if (status !== 'idle') return status;
    status = 'loading';
    try {
      const { createWorld } = await import('./world/world.js');
      world = createWorld(container, { ...options, initial: { mode: wanted.mode, progress: wanted.progress } });
    } catch (error) {
      console.warn('Monde 3D indisponible :', error);
    }
    status = world ? 'ready' : 'unavailable';
    if (world) {
      apply();
      container.classList.add('is-ready');
    }
    waiting.forEach((resolve) => resolve(status));
    waiting.clear();
    return status;
  },

  // Promesse résolue quand le monde est prêt (ou définitivement indisponible).
  whenSettled() {
    if (status === 'ready' || status === 'unavailable') return Promise.resolve(status);
    return new Promise((resolve) => waiting.add(resolve));
  },

  // Vol autour du Cervin : progress de 0 (nuit) à 1 (matin).
  journey(progress) {
    wanted.mode = 'journey';
    wanted.progress = progress;
    apply();
  },

  // Ronde lente de nuit, pour l'arrière-plan des autres pages.
  calm() {
    wanted.mode = 'calm';
    wanted.nudge = true; // chaque changement de page déplace légèrement le point de vue
    apply();
  },

  pause(value) {
    wanted.paused = value;
    apply();
  },

  // Tests et vidéos : dessine une image, « dt » secondes après la précédente.
  step(dt) { world?.step(dt); },

  // Altitude de la caméra et heure du lever du jour, pour l'affichage.
  info: () => (world ? world.info() : null),

  get ready() { return status === 'ready'; },
};
