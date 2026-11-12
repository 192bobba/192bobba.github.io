// Le monde 3D du site : le Cervin et son massif, de la nuit étoilée au lever du jour.
//
// Un seul monde vit derrière toutes les pages. Deux façons de le piloter :
//   - setJourney(p) : le vol autour du Cervin sur la page d'accueil (p de 0 à 1, lié au défilement) ;
//   - setCalm()     : une lente ronde de nuit, en arrière-plan des autres pages.
// Tout est généré par le code : aucun modèle ni image de montagne à télécharger.

import {
  ACESFilmicToneMapping,
  CatmullRomCurve3,
  Color,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from '../../vendor/three/three.min.js';
import { createNoiseTexture, lerp } from './noise.js';
import { altitudeMeters, CLOUD_Y, createTerrain, heightAt } from './terrain.js';
import { createClouds, createSky, createSkyStars, createSnow } from './atmosphere.js';
import { createEmblem } from './emblem.js';

// ---- Lumière : de la nuit (0) au matin (1) ---------------------------------------------

const PALETTE = [
  {
    at: 0, // nuit
    zenith: '#02040A', horizon: '#0A1322', glowColor: '#2A3A6A', glow: 0,
    sunColor: '#FF3B1F', sun: 0, sunHeight: 0.04, glowLine: 40,
    moon: 0.6, skyLight: '#1B2740', groundLight: '#070A12',
    fog: '#0A1220', fogDensity: 0.0105, stars: 1, night: 1,
    cloudDark: '#0E1628', cloudLight: '#3D4F78', exposure: 1.2,
  },
  {
    at: 0.3, // heure bleue
    zenith: '#040A18', horizon: '#16233F', glowColor: '#7A3550', glow: 0.4,
    sunColor: '#FF3B1F', sun: 0, sunHeight: 0.05, glowLine: 40,
    moon: 0.4, skyLight: '#22335A', groundLight: '#0A0F1C',
    fog: '#111C33', fogDensity: 0.01, stars: 0.72, night: 0.9,
    cloudDark: '#121C34', cloudLight: '#465A88', exposure: 1.2,
  },
  {
    at: 0.55, // premier rayon : seule la pointe s'embrase
    zenith: '#07102A', horizon: '#2A2F55', glowColor: '#E0553A', glow: 0.95,
    sunColor: '#FF3B1F', sun: 3.4, sunHeight: 0.07, glowLine: 12.4,
    moon: 0.2, skyLight: '#2A3C66', groundLight: '#0C1222',
    fog: '#1B2440', fogDensity: 0.0095, stars: 0.36, night: 0.45,
    cloudDark: '#182340', cloudLight: '#5A5F8C', exposure: 1.15,
  },
  {
    at: 0.8, // alpenglow : le rouge descend sur les faces
    zenith: '#0B1838', horizon: '#4A3A66', glowColor: '#FF7A45', glow: 1.25,
    sunColor: '#FF5226', sun: 3.8, sunHeight: 0.13, glowLine: 5.5,
    moon: 0.1, skyLight: '#34487A', groundLight: '#101830',
    fog: '#27305A', fogDensity: 0.0092, stars: 0.14, night: 0.1,
    cloudDark: '#222C4E', cloudLight: '#8A7AA8', exposure: 1.1,
  },
  {
    at: 1, // matin bleu
    zenith: '#0E2046', horizon: '#56507E', glowColor: '#FF9A5A', glow: 1.0,
    sunColor: '#FF8452', sun: 3.0, sunHeight: 0.22, glowLine: 1.5,
    moon: 0, skyLight: '#3C5288', groundLight: '#141C36',
    fog: '#2E3A66', fogDensity: 0.009, stars: 0.05, night: 0,
    cloudDark: '#2A3558', cloudLight: '#9A8FB8', exposure: 1.08,
  },
].map((key) => {
  const colors = {};
  for (const [name, value] of Object.entries(key)) {
    colors[name] = typeof value === 'string' ? new Color(value) : value;
  }
  return colors;
});

const MOON_COLOR = new Color('#8FA6D8');

// ---- Trajectoire du vol (page d'accueil) -----------------------------------------------
// p : avancement (0 → 1) ; pos / target : caméra et point visé ; time : lumière ;
// stars : 0 dispersées, 1 constellation, 2 couronne ; snow : densité de neige.

// Une étape par chapitre de la page d'accueil, puis la vue d'ensemble finale.
const JOURNEY = [
  { p: 0.0, pos: [12.8, 3.9, -33.5], target: [0, 9.9, 0], time: 0.0, stars: 0.0, snow: 1.0 },    // nuit sur la vallée (vue de Zermatt)
  { p: 0.2, pos: [10.5, 6.6, -42], target: [0, 16.6, 0], time: 0.2, stars: 1.0, snow: 0.45 },    // les treize étoiles
  { p: 0.4, pos: [12.6, 6.1, -17.6], target: [1.2, 11.6, -1.2], time: 0.42, stars: 1.8, snow: 0.2 }, // l'ascension
  { p: 0.6, pos: [25.5, 9.8, 2.5], target: [0, 9.8, 0], time: 0.74, stars: 2.0, snow: 0.0 },     // rouge et blanc
  { p: 0.8, pos: [5.2, 15.6, 4.6], target: [0, 14.3, 0], time: 0.9, stars: 2.0, snow: 0.0 },     // au sommet
  { p: 1.0, pos: [17, 11.5, -45], target: [0, 9.2, 0], time: 1.0, stars: 2.0, snow: 0.12 },      // vue d'ensemble au matin
];

const posCurve = new CatmullRomCurve3(JOURNEY.map((k) => new Vector3(...k.pos)), false, 'centripetal');
const targetCurve = new CatmullRomCurve3(JOURNEY.map((k) => new Vector3(...k.target)), false, 'centripetal');

const ease = (t) => t * t * (3 - 2 * t);

function sampleJourney(p, out) {
  const clamped = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
  let i = 0;
  while (i < JOURNEY.length - 2 && clamped > JOURNEY[i + 1].p) i++;
  const a = JOURNEY[i];
  const b = JOURNEY[i + 1];
  const local = (clamped - a.p) / (b.p - a.p);
  const u = (i + ease(local)) / (JOURNEY.length - 1);
  posCurve.getPoint(u, out.pos);
  targetCurve.getPoint(u, out.target);
  out.time = lerp(a.time, b.time, local);
  out.stars = lerp(a.stars, b.stars, ease(local));
  out.snow = lerp(a.snow, b.snow, local);
}

function samplePalette(time, out) {
  const t = Math.min(1, Math.max(0, time));
  let i = 0;
  while (i < PALETTE.length - 2 && t > PALETTE[i + 1].at) i++;
  const a = PALETTE[i];
  const b = PALETTE[i + 1];
  const k = (t - a.at) / (b.at - a.at);
  for (const name of Object.keys(a)) {
    if (a[name] instanceof Color) out[name].lerpColors(a[name], b[name], k);
    else out[name] = lerp(a[name], b[name], k);
  }
}

// ---- Création du monde -------------------------------------------------------------------

// initial : { mode: 'journey' | 'calm', progress } — l'état dans lequel le monde démarre.
export function createWorld(container, { logoUrl, initial = {} }) {
  let renderer;
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    return null; // pas de 3D sur cet appareil : le site reste utilisable, sur fond uni
  }
  renderer.toneMapping = ACESFilmicToneMapping;
  container.append(canvas);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  let pixelRatio = maxPixelRatio;

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.3, 1400);

  // Valeurs partagées par tous les shaders.
  const noiseTexture = createNoiseTexture();
  const uniforms = {
    uNoise: { value: noiseTexture },
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uViewHeight: { value: 800 },
    uSunDir: { value: new Vector3(1, 0.1, 0.28).normalize() },
    uSunColor: { value: new Color() },
    uMoonDir: { value: new Vector3(-0.45, 0.75, -0.5).normalize() },
    uMoonColor: { value: new Color() },
    uSkyLight: { value: new Color() },
    uGroundLight: { value: new Color() },
    uFogColor: { value: new Color() },
    uFogDensity: { value: 0.01 },
    uGlowLine: { value: 40 },
    uZenith: { value: new Color() },
    uHorizon: { value: new Color() },
    uGlowColor: { value: new Color() },
    uGlow: { value: 0 },
    uStars: { value: 1 },
    uNight: { value: 1 },
    uSnow: { value: 1 },
    uCloudDark: { value: new Color() },
    uCloudLight: { value: new Color() },
  };

  const sky = createSky(uniforms);
  const skyStars = createSkyStars(uniforms, mobile ? 1700 : 2600);
  const terrain = createTerrain(uniforms);
  const clouds = createClouds(uniforms, mobile ? 2 : 3);
  const snow = createSnow(uniforms, mobile ? 2600 : 5000);
  const emblem = createEmblem(uniforms, { logoUrl });
  snow.material.uniforms.uHeight = uniforms.uViewHeight;
  scene.add(sky, skyStars, terrain, ...clouds, snow, emblem.group);

  // État visé (selon le défilement ou la page) et état affiché, qui le rejoint en douceur.
  const makeState = () => ({ pos: new Vector3(), target: new Vector3(), time: 0, stars: 0, snow: 1, shiftX: 0, shiftY: 0 });
  const goal = makeState();
  const current = makeState();
  const palette = {};
  for (const [name, value] of Object.entries(PALETTE[0])) palette[name] = value instanceof Color ? new Color() : value;

  let mode = initial.mode === 'journey' ? 'journey' : 'calm';
  let journeyProgress = initial.progress || 0;
  // Entrée en scène : au tout premier affichage, la caméra arrive de plus haut et plus loin.
  let intro = reduced ? 0 : 1;
  let manual = false; // images produites une à une par step() (tests, enregistrement vidéo)
  let calmAngle = 2.2;
  let started = false;
  let paused = false;
  let width = 1;
  let height = 1;
  let aspect = 1;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const offset = new Vector3();

  function computeGoal(time) {
    if (mode === 'journey') {
      sampleJourney(journeyProgress, goal);
    } else {
      // Ronde lente autour du massif, de nuit.
      goal.pos.set(Math.cos(calmAngle) * 47, 11, Math.sin(calmAngle) * 47);
      goal.target.set(0, 8.4, 0);
      goal.time = 0.12 + Math.sin(time * 0.02) * 0.04;
      goal.stars = 2;
      goal.snow = 0.7;
    }
    // Écran étroit : on recule pour garder le Cervin entier, et on le place en haut.
    const distanceScale = aspect < 0.8 ? 1.2 : aspect < 1.15 ? 1.1 : 1;
    if (distanceScale !== 1) {
      offset.subVectors(goal.pos, goal.target).multiplyScalar(distanceScale);
      goal.pos.copy(goal.target).add(offset);
    }
    keepAboveGround(goal.pos);
    const wide = aspect > 1.15;
    goal.shiftX = mode === 'journey' && wide ? 0.16 : 0;
    goal.shiftY = mode === 'journey' && !wide ? 0.13 : 0;
  }

  // La caméra ne passe jamais sous le relief ni dans la mer de nuages.
  function keepAboveGround(position) {
    const floor = Math.max(heightAt(position.x, position.z) + 1.2, CLOUD_Y + 1.7);
    if (position.y < floor) position.y = floor;
  }

  function applyPalette() {
    samplePalette(current.time, palette);
    uniforms.uZenith.value.copy(palette.zenith);
    uniforms.uHorizon.value.copy(palette.horizon);
    uniforms.uGlowColor.value.copy(palette.glowColor);
    uniforms.uGlow.value = palette.glow;
    uniforms.uSunColor.value.copy(palette.sunColor).multiplyScalar(palette.sun);
    uniforms.uSunDir.value.set(1, palette.sunHeight, 0.28).normalize();
    uniforms.uMoonColor.value.copy(MOON_COLOR).multiplyScalar(palette.moon);
    uniforms.uSkyLight.value.copy(palette.skyLight);
    uniforms.uGroundLight.value.copy(palette.groundLight);
    uniforms.uFogColor.value.copy(palette.fog);
    uniforms.uFogDensity.value = palette.fogDensity;
    uniforms.uGlowLine.value = palette.glowLine;
    uniforms.uStars.value = palette.stars;
    uniforms.uNight.value = palette.night;
    uniforms.uCloudDark.value.copy(palette.cloudDark);
    uniforms.uCloudLight.value.copy(palette.cloudLight);
    renderer.toneMappingExposure = palette.exposure;
  }

  function resize() {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || window.innerHeight;
    aspect = width / height;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    uniforms.uPixelRatio.value = pixelRatio;
    uniforms.uViewHeight.value = height * pixelRatio;
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 54 : aspect < 1.15 ? 44 : 38;
  }

  // « ?qualite=fixe » dans l'adresse désactive la qualité adaptative (utile pour les tests).
  const adaptive = !location.search.includes('qualite=fixe');
  let elapsed = 0;
  let last = performance.now();
  let frame = 0;
  let slowFrames = 0;
  let fastFrames = 0;
  let sampleCount = 0;
  let sampleTime = 0;

  function render(now) {
    frame = 0;
    // En arrière-plan des pages, 30 images par seconde suffisent.
    if (mode === 'calm' && started && now - last < 30) {
      schedule();
      return;
    }
    // Après une longue tâche, le navigateur peut fournir une image « datée » d'avant le dernier
    // repère : on n'accepte jamais une durée négative.
    const realDt = Math.min(0.3, Math.max(0, (now - last) / 1000));
    last = now;
    drawFrame(realDt);
    if (!reduced) schedule();
  }

  // Calcule et dessine une image, « realDt » secondes après la précédente.
  function drawFrame(realDt) {
    const now = performance.now();
    const calm = mode === 'calm';
    const dt = Math.min(0.05, realDt);

    if (!reduced) {
      elapsed += dt;
      if (calm) calmAngle += dt * 0.014;
    }
    uniforms.uTime.value = elapsed;

    computeGoal(elapsed);
    const k = !started || reduced ? 1 : 1 - Math.exp(-realDt * (calm ? 1.6 : 4.2));
    current.pos.lerp(goal.pos, k);
    current.target.lerp(goal.target, k);
    current.time = lerp(current.time, goal.time, k);
    current.stars = lerp(current.stars, goal.stars, k);
    current.snow = lerp(current.snow, goal.snow, k);
    current.shiftX = lerp(current.shiftX, goal.shiftX, k);
    current.shiftY = lerp(current.shiftY, goal.shiftY, k);
    keepAboveGround(current.pos);
    started = true;

    // Léger mouvement de tête qui suit la souris.
    const pk = 1 - Math.exp(-realDt * 2.5);
    pointer.sx += (pointer.x - pointer.sx) * pk;
    pointer.sy += (pointer.y - pointer.sy) * pk;

    camera.position.copy(current.pos);
    if (intro > 0) {
      intro = Math.max(0, intro - realDt / 3.2);
      const e = intro * intro * (3 - 2 * intro);
      offset.subVectors(current.pos, current.target);
      camera.position.addScaledVector(offset, e * 0.45);
      camera.position.y += e * 5;
    }
    camera.lookAt(current.target);
    if (!reduced) {
      camera.translateX(pointer.sx * 0.6);
      camera.translateY(-pointer.sy * 0.35);
      camera.lookAt(current.target);
    }
    camera.setViewOffset(width, height, -width * current.shiftX, height * current.shiftY, width, height);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    applyPalette();
    uniforms.uSnow.value = current.snow;
    sky.position.copy(camera.position);
    skyStars.position.copy(camera.position);
    for (const cloud of clouds) cloud.position.set(camera.position.x, cloud.position.y, camera.position.z);
    emblem.update({ mode: current.stars, camera, time: elapsed, spread: Math.min(1, 0.55 + aspect * 0.45) });

    renderer.render(scene, camera);

    // Qualité adaptative : si l'appareil peine, on réduit la finesse de l'image.
    sampleTime += performance.now() - now;
    sampleCount += 1;
    if (!calm && adaptive && !manual) {
      if (dt > 0.026) slowFrames += 1;
      else if (dt < 0.019) fastFrames += 1;
      if (sampleCount >= 45) {
        if (slowFrames > 22 && pixelRatio > 0.7) {
          pixelRatio = Math.max(0.7, pixelRatio * 0.84);
          resize();
        } else if (fastFrames > 42 && sampleTime / sampleCount < 7 && pixelRatio < maxPixelRatio) {
          pixelRatio = Math.min(maxPixelRatio, pixelRatio * 1.08);
          resize();
        }
        slowFrames = 0;
        fastFrames = 0;
        sampleCount = 0;
        sampleTime = 0;
      }
    }
  }

  function schedule() {
    if (!frame && !paused && !manual && !document.hidden) frame = requestAnimationFrame(render);
  }

  function resume() {
    last = performance.now();
    schedule();
  }

  const onPointer = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  const onResize = () => {
    resize();
    resume();
  };
  const onContextLost = (event) => event.preventDefault();

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', resume);
  canvas.addEventListener('webglcontextlost', onContextLost);

  resize();
  drawFrame(0);
  last = performance.now();
  schedule();

  return {
    canvas,
    // Vol de la page d'accueil : p de 0 (nuit, vue large) à 1 (matin, vue d'ensemble).
    setJourney(progress) {
      mode = 'journey';
      journeyProgress = progress;
      if (reduced) resume();
    },
    // Arrière-plan des autres pages. « nudge » décale un peu la ronde : la vue change à chaque page.
    setCalm({ nudge = false } = {}) {
      if (nudge) calmAngle += 0.4;
      mode = 'calm';
      if (reduced) resume();
    },
    // Dessine une seule image, « dt » secondes après la précédente, sans suivre l'horloge
    // (pour les tests et l'enregistrement de vidéos image par image).
    step(dt = 1 / 30) {
      manual = true;
      cancelAnimationFrame(frame);
      frame = 0;
      drawFrame(dt);
    },
    setPaused(value) {
      paused = value;
      if (!paused) resume();
    },
    // Pour l'affichage : altitude de la caméra (m) et heure fictive du lever du jour.
    info() {
      const minutes = Math.round(4 * 60 + 20 + current.time * 185);
      return {
        altitude: Math.round(altitudeMeters(camera.position.y)),
        clock: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
        time: current.time,
      };
    },
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', resume);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse((object) => {
        object.geometry?.dispose();
        for (const material of [].concat(object.material || [])) material.dispose();
      });
      emblem.dispose();
      noiseTexture.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
