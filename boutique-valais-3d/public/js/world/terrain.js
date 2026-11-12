// Relief du monde 3D : le Cervin et le massif qui l'entoure.
//
// Repères : +x = est, +z = sud (donc −z = nord), y = altitude.
// 1 unité ≈ 121 m ; le sommet du Cervin (4 478 m) est à y = 14,4.
//
// Le Cervin est construit comme une vraie pyramide à quatre faces (nord, est, sud, ouest) :
// les arêtes du Hörnli, de Zmutt, du Lion et de Furggen naissent là où deux faces se rencontrent.

import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from '../../vendor/three/three.min.js';
import { fbm, hash, noise, ridged, smoothstep } from './noise.js';

export const SUMMIT_Y = 14.4;
export const GLACIER_Y = 2.2;
export const CLOUD_Y = 1.25;

export const altitudeMeters = (y) => 4478 - (SUMMIT_Y - y) * 121;

const rad = (deg) => (deg * Math.PI) / 180;

// ---- Le Cervin -----------------------------------------------------------------------

// Direction vers laquelle regarde chaque face (angle depuis l'est, vers le sud) et raideur.
const FACES = [
  { angle: -98, slope: 1.5 },  // face nord, la plus raide
  { angle: -6, slope: 1.02 },  // face est, grande pente de neige
  { angle: 84, slope: 1.3 },   // face sud
  { angle: 176, slope: 1.22 }, // face ouest
].map((f) => ({ x: Math.cos(rad(f.angle)), z: Math.sin(rad(f.angle)), slope: f.slope }));

// Épaules et ressauts sur les arêtes : [face A, face B, distance au sommet, largeur, hauteur].
const SHOULDERS = [
  [0, 1, 2.6, 0.9, 0.8],   // l'Épaule, arête du Hörnli
  [0, 1, 7.4, 1.2, 0.7],   // secteur de la cabane du Hörnli
  [2, 3, 2.2, 1.3, 1.3],   // Pic Tyndall, arête du Lion
  [2, 3, 6.8, 1.0, 0.9],   // Tête du Lion
  [1, 2, 2.3, 0.8, 0.85],  // épaule de Furggen
  [3, 0, 3.4, 0.45, 0.5],  // dents de Zmutt
  [3, 0, 4.4, 0.4, 0.45],
  [3, 0, 5.4, 0.45, 0.4],
];

const SUMMIT_HALF_LENGTH = 0.36; // l'arête sommitale court d'est en ouest sur ~80 m

function matterhorn(x, z) {
  // Distance à l'arête sommitale (un segment est-ouest) plutôt qu'à un point.
  const sx = Math.max(-SUMMIT_HALF_LENGTH, Math.min(SUMMIT_HALF_LENGTH, x));
  const px = x - sx;
  const pz = z;

  let first = -Infinity;
  let second = -Infinity;
  let firstIndex = 0;
  let secondIndex = 0;
  for (let i = 0; i < 4; i++) {
    const u = (px * FACES[i].x + pz * FACES[i].z) * FACES[i].slope;
    if (u > first) {
      second = first; secondIndex = firstIndex;
      first = u; firstIndex = i;
    } else if (u > second) {
      second = u; secondIndex = i;
    }
  }
  const u = Math.max(0, first);
  const ridgeGap = first - second; // 0 sur une arête, grand au milieu d'une face

  // Tête sommitale très raide, pentes plus douces vers le bas.
  let height = SUMMIT_Y - (1.04 * u + 2.1 * (1 - Math.exp(-u / 1.3)));

  // Faces creusées, arêtes saillantes.
  const mid = smoothstep(0.6, 3.5, u) * (1 - smoothstep(7.5, 11, u));
  height -= 0.75 * smoothstep(0, 3.2, ridgeGap) * mid;
  height += 0.3 * Math.exp(-((ridgeGap / 0.55) ** 2)) * mid;

  // Épaules sur les arêtes.
  const distance = Math.hypot(px, pz);
  for (const [a, b, at, width, bump] of SHOULDERS) {
    const onRidge = (firstIndex === a && secondIndex === b) || (firstIndex === b && secondIndex === a);
    if (!onRidge) continue;
    height += bump * Math.exp(-(((distance - at) / width) ** 2)) * Math.exp(-((ridgeGap / 1.3) ** 2));
  }
  return { height, u, ridgeGap };
}

// ---- Sommets voisins -----------------------------------------------------------------

// [x, z, altitude en m, rayon, graine] — disposés comme autour de Zermatt.
const NEIGHBOURS = [
  [-23, 4, 4174, 13, 1],    // Dent d'Hérens
  [-17, -40, 4357, 15, 2],  // Dent Blanche
  [5, -38, 4063, 11, 3],    // Ober Gabelhorn
  [-3, -62, 4221, 13, 4],   // Zinalrothorn
  [-4, -100, 4506, 18, 5],  // Weisshorn
  [27, 13, 3883, 8, 6],     // Petit Cervin
  [38, 15, 4164, 14, 7],    // Breithorn
  [54, 17, 4527, 15, 8],    // Liskamm
  [68, 8, 4634, 20, 9],     // Mont Rose
  [64, -62, 4545, 18, 10],  // Dom
  [-48, 22, 3900, 16, 11],
  [-52, -18, 4000, 16, 12],
  [-8, 46, 3700, 15, 13],
  [22, 50, 3800, 16, 14],
  [-40, -70, 4100, 18, 15],
  [92, -30, 4200, 20, 16],
];

function neighbour(x, z, [cx, cz, meters, radius, seed]) {
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d > radius * 1.6) return -100;
  const top = SUMMIT_Y - (4478 - meters) / 121;
  // Pyramide irrégulière : trois à quatre pans orientés selon la graine.
  let u = -Infinity;
  const faces = 3 + (seed % 2);
  for (let i = 0; i < faces; i++) {
    const angle = (i / faces) * Math.PI * 2 + seed * 1.7;
    const slope = 0.85 + hash(seed, i) * 0.55;
    u = Math.max(u, (dx * Math.cos(angle) + dz * Math.sin(angle)) * slope);
  }
  u = Math.max(0, u);
  const drop = 0.7 * u + 1.6 * (1 - Math.exp(-u / 1.8));
  return top - drop * (10 / radius) * 1.15;
}

// ---- Vallées ----------------------------------------------------------------------------

// Distance d'un point à un segment, et position le long du segment (0 → 1).
function segment(x, z, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz)));
  return { distance: Math.hypot(x - (ax + abx * t), z - (az + abz * t)), t };
}

// La vallée de Zermatt (vers le nord-nord-est), celle de Zmutt, et le Valtournenche (sud).
const VALLEYS = [
  { from: [10, -16], to: [30, -110], width: 13, depth: 8 },
  { from: [-10, -12], to: [9, -22], width: 7, depth: 4.2 },
  { from: [-4, 20], to: [-14, 110], width: 11, depth: 6.5 },
  { from: [16, 24], to: [60, 60], width: 9, depth: 4.5 },
];

function valleys(x, z) {
  let carve = 0;
  for (const v of VALLEYS) {
    const s = segment(x, z, v.from[0], v.from[1], v.to[0], v.to[1]);
    const width = v.width * (0.55 + s.t * 0.9);
    carve = Math.max(carve, (1 - smoothstep(0, width, s.distance)) * v.depth * smoothstep(0, 0.16, s.t + 0.05));
  }
  return carve;
}

// Maximum adouci (évite les cassures nettes entre deux reliefs).
function smoothMax(a, b, k) {
  const h = Math.max(0, Math.min(1, 0.5 + (a - b) / (2 * k)));
  return b + (a - b) * h + k * h * (1 - h);
}

// ---- Altitude en tout point ----------------------------------------------------------

export function heightAt(x, z) {
  const r = Math.hypot(x, z);

  // Glaciers et plateaux autour du Cervin.
  let ground = GLACIER_Y - smoothstep(9, 24, r) * 1.5 + (fbm(x * 0.05 + 4.2, z * 0.05 - 1.3, 4) - 0.5) * 3.4;
  // Relief alpin générique, de plus en plus marqué en s'éloignant.
  ground += Math.pow(ridged(x * 0.035 + 7.1, z * 0.035 + 2.9, 5), 1.4) * 7.5 * smoothstep(13, 34, r);
  for (const peak of NEIGHBOURS) ground = smoothMax(ground, neighbour(x, z, peak), 1.2);
  ground -= valleys(x, z);
  // Au loin, tout s'abaisse sous la mer de nuages.
  ground -= smoothstep(120, 185, r) * 9;

  const m = matterhorn(x, z);
  let height = smoothMax(m.height, ground, 0.7);

  // Détails rocheux : bancs de roche (vires) et aspérités, plus marqués sur les grandes parois.
  const wall = smoothstep(GLACIER_Y + 0.6, GLACIER_Y + 3, height);
  const rough = (fbm(x * 0.55 + 11, z * 0.55 - 6, 4) - 0.5) * (0.35 + 0.75 * wall);
  const summitGuard = smoothstep(0.25, 1.6, m.u); // on garde la pointe intacte
  height += rough * (r < 14 ? summitGuard : 1);
  const ledges = Math.round(height * 1.9) / 1.9;
  height += (ledges - height) * 0.26 * wall * (r < 14 ? summitGuard : 0.7);
  height += (noise(x * 2.3, z * 2.3) - 0.5) * 0.14;
  return height;
}

// Tracé de l'arête du Hörnli (pour les frontales des alpinistes) : pour chaque distance au
// sommet, on cherche le point le plus haut dans le secteur nord-est.
export function hornliRidge(steps = 48) {
  const points = [];
  for (let i = 0; i < steps; i++) {
    const distance = 0.9 + (i / (steps - 1)) * 7.2;
    let best = null;
    for (let deg = -80; deg <= -25; deg += 1) {
      const x = Math.cos(rad(deg)) * distance;
      const z = Math.sin(rad(deg)) * distance;
      const y = heightAt(x, z);
      if (!best || y > best.y) best = { x, y, z };
    }
    points.push(best);
  }
  return points; // du haut (près du sommet) vers le bas (cabane)
}

// ---- Maillage -------------------------------------------------------------------------

// Grille dont les points sont légèrement décalés au hasard : les facettes paraissent
// taillées à la main plutôt qu'alignées. « hole » retire le centre (couvert par un
// maillage plus fin) ; « skirt » ajoute une jupe verticale qui masque les raccords.
function gridGeometry({ size, cells, hole = 0, sink = 0, skirt = 0 }) {
  const n = cells + 1;
  const step = size / cells;
  const half = size / 2;
  const positions = new Float32Array(n * n * 3 + (skirt ? n * 4 * 3 : 0));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const border = i === 0 || j === 0 || i === cells || j === cells;
      const jitter = border ? 0 : 0.34 * step;
      const x = -half + i * step + (hash(i * 3 + 1, j * 7 + cells) - 0.5) * 2 * jitter;
      const z = -half + j * step + (hash(i * 5 + cells, j * 11 + 2) - 0.5) * 2 * jitter;
      let y = heightAt(x, z);
      if (sink && Math.abs(x) < hole + step && Math.abs(z) < hole + step) y -= sink;
      positions.set([x, y, z], (j * n + i) * 3);
    }
  }

  const indices = [];
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      if (hole) {
        const cx = -half + (i + 0.5) * step;
        const cz = -half + (j + 0.5) * step;
        if (Math.abs(cx) < hole - step && Math.abs(cz) < hole - step) continue;
      }
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      // Diagonale alternée d'une case à l'autre.
      if ((i + j) % 2 === 0) indices.push(a, c, b, b, c, d);
      else indices.push(a, c, d, a, d, b);
    }
  }

  if (skirt) {
    // Bord doublé puis abaissé.
    let k = n * n;
    const ring = [];
    for (let i = 0; i < n; i++) ring.push(i);                       // nord
    for (let j = 1; j < n; j++) ring.push(j * n + cells);            // est
    for (let i = cells - 1; i >= 0; i--) ring.push(cells * n + i);   // sud
    for (let j = cells - 1; j > 0; j--) ring.push(j * n);            // ouest
    const first = k;
    for (const index of ring) {
      positions.set([positions[index * 3], positions[index * 3 + 1] - skirt, positions[index * 3 + 2]], k * 3);
      k++;
    }
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const c = first + i;
      const d = first + ((i + 1) % ring.length);
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

// ---- Matière : neige, roche, lumière de l'aube ----------------------------------

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uNoise;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform vec3 uSkyLight;
  uniform vec3 uGroundLight;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uGlowLine;
  uniform float uCloudY;
  varying vec3 vWorld;

  void main() {
    // Normale « à facettes » : chaque triangle a sa propre orientation.
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    vec3 view = normalize(cameraPosition - vWorld);
    if (dot(n, view) < 0.0) n = -n;

    float large = texture2D(uNoise, vWorld.xz * 0.021).r;
    float fine = texture2D(uNoise, vWorld.xz * 0.13 + 0.37).g;

    // Neige sur les replats, roche sur les parois ; plus de neige en altitude.
    float snowLine = 0.74 - 0.14 * smoothstep(3.0, 13.0, vWorld.y) + (large - 0.5) * 0.3;
    float snow = smoothstep(snowLine - 0.035, snowLine + 0.035, n.y + (fine - 0.5) * 0.1);
    // Sous la mer de nuages : pentes sombres (forêts, éboulis), presque sans neige.
    float low = smoothstep(uCloudY + 1.4, uCloudY - 1.2, vWorld.y);
    snow *= 1.0 - low * 0.8;

    // Roche : bancs horizontaux plus clairs ou plus sombres.
    float strata = texture2D(uNoise, vec2(vWorld.y * 0.085 + large * 0.12, large * 0.5)).b;
    vec3 rock = mix(vec3(0.115, 0.125, 0.155), vec3(0.33, 0.33, 0.36), strata * 0.85 + fine * 0.15);
    rock = mix(rock, vec3(0.05, 0.075, 0.08), low * 0.75);
    vec3 snowColor = mix(vec3(0.72, 0.78, 0.88), vec3(0.95, 0.97, 1.0), fine);
    vec3 albedo = mix(rock, snowColor, snow);

    // Le premier rayon de soleil ne touche d'abord que les sommets, puis descend.
    float lit = smoothstep(uGlowLine - 3.2, uGlowLine + 3.0, vWorld.y + (large - 0.5) * 2.4);
    float sun = max(dot(n, uSunDir), 0.0);
    float moon = max(dot(n, uMoonDir), 0.0);
    vec3 ambient = mix(uGroundLight, uSkyLight, n.y * 0.5 + 0.5);
    // Lumière d'appoint du ciel, venue du nord : les facettes restent lisibles même à l'ombre.
    ambient += uSkyLight * 0.55 * max(dot(n, normalize(vec3(-0.35, 0.3, -0.88))), 0.0);
    vec3 color = albedo * (ambient + uMoonColor * moon + uSunColor * sun * lit);

    // La neige accroche la lumière du ciel sur les bords.
    float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    color += snow * rim * uSkyLight * 0.55;
    // Et renvoie un peu de la lueur de l'aube, même à l'ombre.
    color += snow * uSunColor * lit * 0.045;

    // Brume : avec la distance, et dans le fond des vallées.
    float dist = length(vWorld - cameraPosition);
    float fog = 1.0 - exp(-pow(dist * uFogDensity, 1.45));
    float haze = smoothstep(uCloudY + 2.2, uCloudY - 1.5, vWorld.y) * 0.9;
    color = mix(color, uFogColor, clamp(max(fog, haze), 0.0, 1.0));

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// detail : nombre de cases du maillage proche et du maillage lointain.
export function createTerrain(uniforms, detail = { near: 200, far: 110 }) {
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    uniforms: {
      uNoise: uniforms.uNoise,
      uSunDir: uniforms.uSunDir,
      uSunColor: uniforms.uSunColor,
      uMoonDir: uniforms.uMoonDir,
      uMoonColor: uniforms.uMoonColor,
      uSkyLight: uniforms.uSkyLight,
      uGroundLight: uniforms.uGroundLight,
      uFogColor: uniforms.uFogColor,
      uFogDensity: uniforms.uFogDensity,
      uGlowLine: uniforms.uGlowLine,
      uCloudY: { value: CLOUD_Y },
    },
  });

  const group = new Group();
  // Le Cervin et ses abords, finement maillés…
  const near = new Mesh(gridGeometry({ size: 68, cells: detail.near, skirt: 3 }), material);
  // … et le reste du massif, plus grossier (on ne le voit que de loin).
  const far = new Mesh(gridGeometry({ size: 400, cells: detail.far, hole: 34, sink: 0.7 }), material);
  near.frustumCulled = false;
  far.frustumCulled = false;
  group.add(near, far);
  return group;
}
