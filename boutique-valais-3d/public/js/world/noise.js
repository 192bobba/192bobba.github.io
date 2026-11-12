// Bruits procéduraux : relief naturel côté JavaScript, et texture de bruit
// répétable pour les shaders (nuages, roche, neige).

import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, UnsignedByteType } from '../../vendor/three/three.min.js';

export function hash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * (3 - 2 * t);

// Bruit de valeur lissé, entre 0 et 1. « period » le rend répétable (pour les textures).
export function noise(x, y, period = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const wrap = period ? (n) => ((n % period) + period) % period : (n) => n;
  const x0 = wrap(xi);
  const x1 = wrap(xi + 1);
  const y0 = wrap(yi);
  const y1 = wrap(yi + 1);
  const a = hash(x0, y0);
  const b = hash(x1, y0);
  const c = hash(x0, y1);
  const d = hash(x1, y1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x, y, octaves = 5, period = 0) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, y * frequency, period ? period * frequency : 0);
    norm += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return sum / norm;
}

// Bruit « en crêtes » (arêtes vives), entre 0 et 1.
export function ridged(x, y, octaves = 5, period = 0) {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * frequency, y * frequency, period ? period * frequency : 0) * 2 - 1);
    sum += amplitude * n * n;
    norm += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return sum / norm;
}

export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const lerp = (a, b, t) => a + (b - a) * t;

// Texture 256 × 256 répétable : R = nuages doux, G = détail, B = crêtes, A = grain.
export function createNoiseTexture(size = 256) {
  const data = new Uint8Array(size * size * 4);
  const P = 8; // nombre de « cellules » de bruit sur la largeur (périodique)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * P;
      const v = (y / size) * P;
      const i = (y * size + x) * 4;
      data[i] = Math.round(fbm(u, v, 5, P) * 255);
      data[i + 1] = Math.round(fbm(u * 2 + 17.3, v * 2 + 5.1, 4, P * 2) * 255);
      data[i + 2] = Math.round(ridged(u + 3.7, v + 9.2, 4, P) * 255);
      data[i + 3] = Math.round(hash(x * 7 + 3, y * 13 + 1) * 255);
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
