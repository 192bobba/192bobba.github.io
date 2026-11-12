// Atmosphère du monde 3D : voûte céleste, étoiles du ciel, mer de nuages et neige.

import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
} from '../../vendor/three/three.min.js';
import { hash } from './noise.js';
import { CLOUD_Y } from './terrain.js';

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

// ---- Voûte céleste : dégradé, lueur de l'aube, Voie lactée ---------------------------

export function createSky(uniforms) {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uNoise: uniforms.uNoise,
      uZenith: uniforms.uZenith,
      uHorizon: uniforms.uHorizon,
      uSunDir: uniforms.uSunDir,
      uGlowColor: uniforms.uGlowColor,
      uGlow: uniforms.uGlow,
      uStars: uniforms.uStars,
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uNoise;
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uSunDir;
      uniform vec3 uGlowColor;
      uniform float uGlow;
      uniform float uStars;
      varying vec3 vDir;

      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 color = mix(uHorizon, uZenith, pow(smoothstep(-0.08, 0.85, h), 0.6));

        // Bande chaude à l'horizon, du côté du soleil levant.
        vec2 dirFlat = normalize(d.xz + 1e-5);
        vec2 sunFlat = normalize(uSunDir.xz);
        float toward = max(dot(dirFlat, sunFlat), 0.0);
        float band = exp(-max(h, 0.0) * 7.5) * pow(toward, 2.5);
        color += uGlowColor * band * uGlow;
        // Halo plus large, très doux.
        color += uGlowColor * 0.25 * pow(toward, 6.0) * exp(-max(h, 0.0) * 2.2) * uGlow;

        // Voie lactée : une traînée laiteuse qui traverse le ciel.
        vec3 axis = normalize(vec3(0.35, 0.5, -0.8));
        float lane = 1.0 - abs(dot(d, axis));
        float milky = pow(smoothstep(0.72, 1.0, lane), 2.0);
        float dust = texture2D(uNoise, d.xz * 1.6 + d.y * 0.7).r * texture2D(uNoise, d.zy * 3.1).g;
        color += vec3(0.42, 0.5, 0.72) * milky * dust * 0.55 * uStars * smoothstep(0.02, 0.35, h);

        gl_FragColor = vec4(color, 1.0);
        ${OUTPUT}
        // Tramage : un grain infime qui évite les « marches » dans les dégradés sombres.
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor.rgb += (grain - 0.5) / 160.0;
      }
    `,
  });
  const mesh = new Mesh(new SphereGeometry(500, 48, 24), material);
  mesh.renderOrder = -100;
  mesh.frustumCulled = false;
  return mesh;
}

// ---- Étoiles du ciel ------------------------------------------------------------------

export function createSkyStars(uniforms, count = 2600) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Répartition régulière sur la demi-sphère supérieure (un peu sous l'horizon aussi).
    const y = -0.08 + hash(i, 1) * 1.08;
    const angle = hash(i, 2) * Math.PI * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    positions.set([Math.cos(angle) * radius * 460, y * 460, Math.sin(angle) * radius * 460], i * 3);
    const big = hash(i, 3);
    seeds.set([hash(i, 4), big * big * big, hash(i, 5)], i * 3); // phase, taille, teinte
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 3));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: uniforms.uTime, uStars: uniforms.uStars, uPixelRatio: uniforms.uPixelRatio },
    vertexShader: /* glsl */ `
      attribute vec3 aSeed;
      uniform float uTime;
      uniform float uStars;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float twinkle = 0.72 + 0.28 * sin(uTime * (0.8 + aSeed.x * 2.4) + aSeed.x * 60.0);
        float horizon = smoothstep(-0.02, 0.2, normalize(position).y);
        // Les petites étoiles s'effacent les premières quand le jour vient.
        float survive = smoothstep(1.0 - uStars - 0.25, 1.0 - uStars + 0.05, aSeed.y + 0.08);
        vAlpha = twinkle * horizon * survive * (0.35 + aSeed.y * 0.9);
        vTint = aSeed.z;
        gl_PointSize = (1.2 + aSeed.y * 3.4) * uPixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vTint;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.05, d);
        vec3 color = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.93, 0.82), vTint);
        gl_FragColor = vec4(color * disc * vAlpha, 1.0);
        ${OUTPUT}
      }
    `,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -90;
  return points;
}

// ---- Mer de nuages -------------------------------------------------------------------

export function createClouds(uniforms, layers = 3) {
  const geometry = new PlaneGeometry(900, 900, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const meshes = [];
  for (let i = 0; i < layers; i++) {
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      uniforms: {
        uNoise: uniforms.uNoise,
        uTime: uniforms.uTime,
        uCloudDark: uniforms.uCloudDark,
        uCloudLight: uniforms.uCloudLight,
        uGlowColor: uniforms.uGlowColor,
        uGlow: uniforms.uGlow,
        uSunDir: uniforms.uSunDir,
        uFogColor: uniforms.uFogColor,
        uLayer: { value: i },
        uCover: { value: 0.4 + i * 0.045 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uNoise;
        uniform float uTime;
        uniform vec3 uCloudDark;
        uniform vec3 uCloudLight;
        uniform vec3 uGlowColor;
        uniform float uGlow;
        uniform vec3 uSunDir;
        uniform vec3 uFogColor;
        uniform float uLayer;
        uniform float uCover;
        varying vec3 vWorld;

        void main() {
          vec2 uv = vWorld.xz * 0.0085;
          vec2 drift = uTime * vec2(0.0035, 0.0012);
          float a = texture2D(uNoise, uv + drift + uLayer * 0.31).r;
          float b = texture2D(uNoise, uv * 2.9 - drift * 1.7 + uLayer * 0.17).g;
          float c = texture2D(uNoise, uv * 7.0 + drift * 2.3).r;
          float density = a * 0.6 + b * 0.3 + c * 0.1;
          float alpha = smoothstep(uCover - 0.1, uCover + 0.2, density);

          vec3 toCamera = cameraPosition - vWorld;
          float dist = length(toCamera.xz);
          alpha *= 1.0 - smoothstep(170.0, 420.0, dist);
          // Quand la caméra frôle la couche, celle-ci se dissout au lieu de couper l'image.
          alpha *= smoothstep(0.15, 2.2, abs(toCamera.y));

          vec3 color = mix(uCloudDark, uCloudLight, smoothstep(0.3, 0.75, density));
          // Reflet de l'aube sur les crêtes des nuages, du côté du soleil.
          vec2 away = normalize(-toCamera.xz + 1e-5);
          float toward = max(dot(away, normalize(uSunDir.xz)), 0.0);
          color += uGlowColor * pow(toward, 3.0) * 0.5 * uGlow * density;
          color = mix(color, uFogColor, smoothstep(90.0, 380.0, dist) * 0.85);

          gl_FragColor = vec4(color, alpha * (0.62 + uLayer * 0.1));
          ${OUTPUT}
        }
      `,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.y = CLOUD_Y + i * 0.42;
    mesh.renderOrder = 10 + i;
    mesh.frustumCulled = false;
    meshes.push(mesh);
  }
  return meshes;
}

// ---- Neige ------------------------------------------------------------------------------

// Les flocons vivent dans une boîte qui suit la caméra : il neige toujours autour de soi,
// et tout le mouvement est calculé par la carte graphique.
export function createSnow(uniforms, count = 5000) {
  const seeds = new Float32Array(count * 4);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds.set([hash(i, 11), hash(i, 12), hash(i, 13), hash(i, 14)], i * 4);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: uniforms.uTime,
      uSnow: uniforms.uSnow,
      uPixelRatio: uniforms.uPixelRatio,
      uSkyLight: uniforms.uSkyLight,
      uHeight: { value: 800 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform float uSnow;
      uniform float uPixelRatio;
      uniform float uHeight;
      varying float vAlpha;
      const vec3 BOX = vec3(46.0, 30.0, 46.0);
      void main() {
        float speed = 0.9 + aSeed.w * 1.3;
        vec3 p = aSeed.xyz * BOX;
        p.y -= uTime * speed;
        p.x += sin(uTime * 0.5 + aSeed.w * 30.0) * 0.6 + uTime * 0.35;
        p.z += cos(uTime * 0.37 + aSeed.x * 30.0) * 0.6;
        // Boucle dans la boîte centrée sur la caméra.
        p = mod(p - cameraPosition + BOX * 0.5, BOX) - BOX * 0.5 + cameraPosition;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = (0.05 + aSeed.w * 0.07) * uHeight / max(-mv.z, 0.1);
        gl_PointSize = clamp(size, 0.0, 9.0 * uPixelRatio);
        float near = smoothstep(0.4, 2.5, -mv.z);
        float far = 1.0 - smoothstep(14.0, 23.0, -mv.z);
        // « uSnow » règle la densité : on masque une partie des flocons.
        vAlpha = near * far * step(fract(aSeed.w * 43.7 + aSeed.x * 17.3), uSnow) * 0.85;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSkyLight;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.1, d);
        vec3 color = vec3(0.75, 0.8, 0.9) + uSkyLight * 0.8;
        gl_FragColor = vec4(color, disc * vAlpha);
        ${OUTPUT}
      }
    `,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 30;
  return points;
}
