// Scène 3D de l'accueil : le Cervin sous un ciel de nuit, les 13 étoiles du drapeau
// valaisan en orbite autour du sommet, et la neige qui tombe.
// Tout est généré par le code (aucun modèle 3D à télécharger).

import {
  CanvasTexture,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  Shape,
  SRGBColorSpace,
  Vector3,
} from '../../vendor/three/three.min.js';
import { createRenderer, startLoop, disposeScene, trackPointer, easeOutCubic, easeOutBack } from './loop.js';

const RED = '#D9242B';
const SKY_TOP = '#05080F';
const SKY_HORIZON = '#1B2433';

// ---- Bruit (relief naturel) -------------------------------------------------

function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function noise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, octaves = 4) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, y * frequency);
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return sum;
}

// Bruit « en crêtes », pour des arêtes montagneuses.
function ridged(x, y) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < 4; i++) {
    const n = 1 - Math.abs(noise(x * frequency, y * frequency) * 2 - 1);
    sum += amplitude * n * n;
    frequency *= 2.1;
    amplitude *= 0.5;
  }
  return sum;
}

// ---- Relief ---------------------------------------------------------------------

// Le Cervin : une pyramide à quatre faces, un peu asymétrique, aux flancs concaves.
function matterhorn(x, z) {
  const angle = 0.55;
  let u = x * Math.cos(angle) - z * Math.sin(angle);
  let v = x * Math.sin(angle) + z * Math.cos(angle);
  u /= u > 0 ? 1.2 : 0.9;
  v /= v > 0 ? 1.0 : 1.12;
  const distance = Math.abs(u) + Math.abs(v) * 0.92;
  const t = Math.max(0, 1 - distance / 9.6);
  return 14.5 * Math.pow(t, 1.6);
}

// Direction de la caméra (vue depuis Zermatt) : le relief est abaissé de ce côté
// pour dégager une vallée enneigée devant le Cervin.
const VIEW_DIR = { x: Math.sin(0.62), z: Math.cos(0.62) };

function heightAt(x, z) {
  const r = Math.hypot(x, z) || 1;
  const facing = (x * VIEW_DIR.x + z * VIEW_DIR.z) / r; // 1 = côté caméra
  let massif = Math.pow(ridged(x * 0.07 + 3.1, z * 0.07 - 1.7), 1.5) * 8 - 0.6;
  massif *= 1 - MathUtils.smoothstep(r, 22, 46);
  massif *= 1 - 0.85 * MathUtils.smoothstep(facing, -0.1, 0.6) * MathUtils.smoothstep(r, 8, 16);
  const valley = (fbm(x * 0.12, z * 0.12) - 0.5) * 1.2; // ondulations douces de la vallée
  const peak = matterhorn(x, z);
  const rock = (fbm(x * 0.8, z * 0.8) - 0.45) * (0.08 + peak * 0.06);
  return Math.max(massif, peak, valley) + rock;
}

const SNOW = new Color('#DDE4EE');
const SNOW_SHADE = new Color('#A9B5C7');
const ROCK = new Color('#4A5263');
const ROCK_DARK = new Color('#272C37');

function buildTerrain() {
  const geometry = new PlaneGeometry(96, 96, 150, 150).toNonIndexed();
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setY(i, heightAt(position.getX(i), position.getZ(i)));
  }

  // Une couleur par facette : neige sur les replats, roche sur les pentes raides.
  const colors = new Float32Array(position.count * 3);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const cb = new Vector3();
  const ab = new Vector3();
  const color = new Color();
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    cb.subVectors(c, b);
    ab.subVectors(a, b);
    const ny = cb.cross(ab).normalize().y;
    const cx = (a.x + b.x + c.x) / 3;
    const cz = (a.z + b.z + c.z) / 3;
    const height = (a.y + b.y + c.y) / 3;
    const n = noise(cx * 0.55, cz * 0.55);

    // Sur le Cervin, la neige s'accroche aux vires : des bandes blanches en travers des faces.
    const ledges = height > 3 ? noise(cx * 0.35 + 7, height * 1.4) : 0;
    const threshold = 0.72 + (n - 0.5) * 0.24 - ledges * 0.42;
    if (ny > threshold) {
      color.copy(SNOW_SHADE).lerp(SNOW, Math.min(1, 0.45 + height / 14 + n * 0.3));
    } else {
      color.copy(ROCK_DARK).lerp(ROCK, n);
    }
    for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

// ---- Étoiles du drapeau -----------------------------------------------------------

function starGeometry() {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 1 : 0.42;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  geometry.center();
  return geometry;
}

function buildStars() {
  const group = new Group();
  const geometry = starGeometry();
  const red = new MeshStandardMaterial({ color: RED, emissive: '#4A0508', roughness: 0.4, metalness: 0.15 });
  const white = new MeshStandardMaterial({ color: '#F7F7F7', emissive: '#2A2E36', roughness: 0.35, metalness: 0.1 });
  const stars = [];
  for (let i = 0; i < 13; i++) {
    const star = new Mesh(geometry, i % 2 === 0 ? red : white);
    star.userData.angle = (i / 13) * Math.PI * 2;
    group.add(star);
    stars.push(star);
  }
  group.position.set(0, 9.4, 0);
  group.rotation.set(0.16, 0, -0.1);
  return { group, stars };
}

// ---- Ciel, neige -------------------------------------------------------------------

function gradientTexture(stops, width = 2, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function softDotTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function buildSkyStars(count, seed) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = hash(i, seed) * Math.PI * 2;
    const phi = 0.08 + hash(seed, i) * 1.25;
    positions[i * 3] = Math.cos(theta) * Math.cos(phi) * 120;
    positions[i * 3 + 1] = Math.sin(phi) * 120 - 10;
    positions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * 120;
  }
  const points = new Points(undefined, new PointsMaterial({
    color: '#FFFFFF',
    size: 1.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.8,
    fog: false,
    depthWrite: false,
  }));
  points.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return points;
}

function buildSnow(count, texture) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (hash(i, 11) - 0.5) * 70;
    positions[i * 3 + 1] = hash(i, 12) * 26;
    positions[i * 3 + 2] = (hash(i, 13) - 0.5) * 70;
    speeds[i] = 0.6 + hash(i, 14) * 1.1;
  }
  const points = new Points(undefined, new PointsMaterial({
    color: '#FFFFFF',
    map: texture,
    size: 0.22,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  }));
  points.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  points.userData.speeds = speeds;
  return points;
}

// ---- Scène ---------------------------------------------------------------------------

export function createHeroScene(container) {
  const renderer = createRenderer(container);
  if (!renderer) return null;

  const scene = new Scene();
  scene.background = gradientTexture([[0, SKY_TOP], [0.55, '#0E1522'], [1, SKY_HORIZON]]);
  scene.fog = new Fog(SKY_HORIZON, 34, 82);

  const camera = new PerspectiveCamera(32, 1, 0.5, 400);
  const target = new Vector3(0, 5.6, 0);

  scene.add(new HemisphereLight('#9AAED0', '#10151F', 0.9));
  const moon = new DirectionalLight('#DCE6FF', 2.4);
  moon.position.set(-22, 30, 18);
  scene.add(moon);
  const alpenglow = new DirectionalLight('#FF7A5C', 0.55); // lueur rosée sur les arêtes, clin d'œil à l'Alpenglühen
  alpenglow.position.set(18, 16, -28);
  scene.add(alpenglow);

  scene.add(buildTerrain());

  const { group: starRing, stars } = buildStars();
  scene.add(starRing);

  const skyA = buildSkyStars(260, 1);
  const skyB = buildSkyStars(220, 2);
  scene.add(skyA, skyB);

  const glowTexture = softDotTexture();
  const snow = buildSnow(window.innerWidth < 700 ? 450 : 800, glowTexture);
  scene.add(snow);

  const pointer = trackPointer();
  let baseDistance = 40;

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (camera.aspect > 1.15) {
      // Grand écran : le Cervin à droite, le texte à gauche.
      camera.setViewOffset(width, height, -width * 0.2, -height * 0.02, width, height);
      baseDistance = 42;
    } else {
      // Mobile : le Cervin en haut, le texte en bas.
      camera.setViewOffset(width, height, 0, height * 0.2, width, height);
      baseDistance = camera.aspect < 0.8 ? 50 : 46;
    }
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(() => {
    resize();
    loop?.redraw();
  });
  resize();

  const render = (time, dt) => {
    pointer.update(dt || 0.016);

    // Arrivée de la caméra, puis lent balancement + réaction à la souris / au défilement.
    const intro = easeOutCubic(time / 3.2);
    const scroll = Math.min(window.scrollY, 800) / 800;
    const azimuth = 0.62 + Math.sin(time * 0.06) * 0.25 + pointer.smoothX * 0.16 + (1 - intro) * 0.5;
    const elevation = 0.15 + (1 - intro) * 0.22 - pointer.smoothY * 0.04 + scroll * 0.12;
    const distance = baseDistance + (1 - intro) * 22 - scroll * 4;
    camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    camera.lookAt(target);

    // Les 13 étoiles tournent autour du sommet en flottant.
    starRing.rotation.y = time * 0.14;
    stars.forEach((star, i) => {
      const appear = easeOutBack((time - 0.8 - i * 0.09) / 0.9);
      const angle = star.userData.angle;
      star.position.set(Math.cos(angle) * 8, Math.sin(time * 1.1 + i) * 0.35, Math.sin(angle) * 8);
      star.rotation.set(0, time * 0.9 + i, 0);
      star.scale.setScalar(0.55 * Math.max(0.0001, appear));
    });

    // Scintillement du ciel.
    skyA.material.opacity = 0.55 + Math.sin(time * 1.7) * 0.25;
    skyB.material.opacity = 0.55 + Math.sin(time * 1.3 + 2) * 0.25;

    // Neige.
    if (dt) {
      const position = snow.geometry.attributes.position;
      const speeds = snow.userData.speeds;
      for (let i = 0; i < position.count; i++) {
        let y = position.getY(i) - speeds[i] * dt;
        if (y < -1) y += 26;
        position.setY(i, y);
        position.setX(i, position.getX(i) + Math.sin(time * 0.7 + i) * dt * 0.35);
      }
      position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  };

  const loop = startLoop(container, render);
  resizeObserver.observe(container);

  return () => {
    loop.stop();
    resizeObserver.disconnect();
    pointer.dispose();
    glowTexture.dispose();
    disposeScene(scene, renderer);
  };
}
