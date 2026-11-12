// Les symboles du Valais dans le monde 3D : les 13 étoiles (dispersées dans la nuit,
// puis réunies en constellation comme sur le drapeau, puis en couronne autour du sommet),
// le drapeau planté au sommet, les frontales des alpinistes et les lumières du village.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  Quaternion,
  ShaderMaterial,
  Shape,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from '../../vendor/three/three.min.js';
import { hash, lerp, smoothstep } from './noise.js';
import { heightAt, hornliRidge } from './terrain.js';

const RED = '#E0262E';
const WHITE = '#F4F6FA';

const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

function glowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

// ---- Les 13 étoiles -------------------------------------------------------------------

// Contour d'une étoile à cinq branches ; « part » = 'left' ou 'right' pour n'en garder qu'une moitié.
function starShape(part) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? 1 : 0.42;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  let outline = points;
  if (part === 'left') outline = points.slice(0, 6);
  if (part === 'right') outline = [...points.slice(5), points[0]];
  const shape = new Shape();
  outline.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

function starGeometry(part) {
  const geometry = new ExtrudeGeometry(starShape(part), {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  geometry.translate(0, 0, -0.1);
  return geometry;
}

function starMaterial(color) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal);
        float facing = abs(dot(n, vView));
        // Les étoiles brillent d'elles-mêmes ; les biseaux accrochent un reflet.
        vec3 color = uColor * (0.75 + 0.6 * facing) + vec3(1.0) * pow(1.0 - facing, 3.0) * 0.35;
        gl_FragColor = vec4(color, 1.0);
        ${OUTPUT}
      }
    `,
  });
}

// Disposition des étoiles sur le drapeau valaisan : [x, y, taille, couleur].
// Rouges sur la moitié blanche (à gauche), blanches sur la moitié rouge (à droite),
// et la grande étoile centrale mi-rouge, mi-blanche.
const FLAG_LAYOUT = [
  [-0.79, 0.79, 1, 'red'], [-0.78, 0.32, 1, 'red'], [-0.76, -0.17, 1, 'red'],
  [-0.43, 0.58, 1, 'red'], [-0.42, 0.07, 1, 'red'], [-0.44, -0.43, 1, 'red'],
  [0, 0.42, 2.4, 'split'],
  [0.43, 0.58, 1, 'white'], [0.42, 0.07, 1, 'white'], [0.44, -0.43, 1, 'white'],
  [0.79, 0.79, 1, 'white'], [0.78, 0.32, 1, 'white'], [0.76, -0.17, 1, 'white'],
];

// Ordre du trait qui relie les étoiles en constellation.
const CONSTELLATION_PATH = [0, 1, 2, 5, 4, 3, 6, 7, 8, 9, 12, 11, 10];

function createStars(summit) {
  const group = new Group();
  const glow = glowTexture();
  const geometries = { full: starGeometry(), left: starGeometry('left'), right: starGeometry('right') };
  const materials = { red: starMaterial(RED), white: starMaterial(WHITE) };

  const stars = FLAG_LAYOUT.map(([x, y, size, color], i) => {
    const holder = new Group();
    if (color === 'split') {
      holder.add(new Mesh(geometries.left, materials.red), new Mesh(geometries.right, materials.white));
    } else {
      holder.add(new Mesh(geometries.full, materials[color]));
    }
    const halo = new Sprite(new SpriteMaterial({
      map: glow,
      color: color === 'white' ? '#BFD0FF' : '#FF5A4A',
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.55,
    }));
    halo.scale.setScalar(5.2);
    holder.add(halo);
    group.add(holder);
    return { holder, halo, x, y, size, seed: hash(i, 77), index: i };
  });

  // Trait de constellation.
  const linePositions = new Float32Array(CONSTELLATION_PATH.length * 3);
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute('position', new BufferAttribute(linePositions, 3));
  const line = new Line(lineGeometry, new LineBasicMaterial({
    color: '#A9BCEB',
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  }));
  line.frustumCulled = false;
  group.add(line);

  const center = new Vector3(summit.x, summit.y + 6.6, summit.z);
  const right = new Vector3();
  const up = new Vector3();
  const back = new Vector3();
  const flagPos = new Vector3();
  const farPos = new Vector3();
  const crownPos = new Vector3();
  const spin = new Quaternion();
  const yAxis = new Vector3(0, 1, 0);

  // mode : 0 = dispersées dans le ciel, 1 = constellation du drapeau, 2 = couronne du sommet.
  function update({ mode, camera, time, spread }) {
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    back.setFromMatrixColumn(camera.matrixWorld, 2).negate(); // direction du regard
    const toConstellation = smoothstep(0, 1, mode);
    const toCrown = smoothstep(1, 2, mode);
    const size = 5.4 * spread;

    for (const star of stars) {
      // Position dans la constellation (toujours face à la caméra).
      flagPos.copy(center).addScaledVector(right, star.x * size).addScaledVector(up, (star.y - 0.2) * size);
      // Position « dispersée » : plus loin, plus haut, éparpillée.
      const jx = (star.seed - 0.5) * 1.6;
      const jy = (hash(star.index, 5) - 0.5) * 1.2;
      farPos.copy(center)
        .addScaledVector(right, (star.x * 2.3 + jx) * size)
        .addScaledVector(up, (star.y * 1.5 + jy + 0.9) * size)
        .addScaledVector(back, 26 + star.seed * 30);
      // Position en couronne autour du sommet.
      const angle = (star.index / 13) * Math.PI * 2 + time * 0.16;
      crownPos.set(
        summit.x + Math.cos(angle) * 5.8,
        summit.y - 2.1 + Math.sin(time * 0.9 + star.index) * 0.22,
        summit.z + Math.sin(angle) * 5.8,
      );

      const local = Math.min(1, Math.max(0, toConstellation * 1.25 - star.seed * 0.25));
      star.holder.position.lerpVectors(farPos, flagPos, local * local * (3 - 2 * local));
      if (toCrown > 0) star.holder.position.lerp(crownPos, toCrown);

      // Face à la caméra en constellation, en rotation lente dans la couronne.
      spin.setFromAxisAngle(yAxis, time * 0.7 + star.index);
      star.holder.quaternion.copy(camera.quaternion).slerp(spin, toCrown);

      const twinkle = 1 + Math.sin(time * 1.6 + star.seed * 20) * 0.06;
      const scale = lerp(lerp(0.55, 0.62, toConstellation) * star.size, 0.27, toCrown) * twinkle * Math.max(0.6, spread);
      star.holder.scale.setScalar(scale);
      star.halo.material.opacity = lerp(0.6, 0.38, toCrown) * (0.85 + 0.15 * Math.sin(time * 2.1 + star.seed * 40));
    }

    // Le trait n'apparaît que lorsque la constellation est formée.
    const lineOpacity = Math.max(0, 1 - Math.abs(mode - 1) * 2.2) * 0.42;
    line.material.opacity = lineOpacity;
    line.visible = lineOpacity > 0.01;
    if (line.visible) {
      CONSTELLATION_PATH.forEach((index, i) => stars[index].holder.position.toArray(linePositions, i * 3));
      lineGeometry.attributes.position.needsUpdate = true;
    }
  }

  return { group, update, textures: [glow] };
}

// ---- Drapeau du sommet --------------------------------------------------------------

function createFlag(summit, uniforms, logoUrl) {
  const group = new Group();
  const texture = new TextureLoader().load(logoUrl);
  texture.colorSpace = SRGBColorSpace;

  const size = 0.62;
  const cloth = new PlaneGeometry(size, size, 20, 12);
  cloth.translate(size / 2, 0, 0);
  const flag = new Mesh(cloth, new ShaderMaterial({
    side: DoubleSide,
    uniforms: {
      uMap: { value: texture },
      uTime: uniforms.uTime,
      uSkyLight: uniforms.uSkyLight,
      uSunColor: uniforms.uSunColor,
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vUv = uv;
        vec3 p = position;
        float along = uv.x;
        float wave = sin(p.x * 9.0 - uTime * 6.5 + p.y * 2.5) * 0.085 + sin(p.x * 17.0 - uTime * 9.0) * 0.025;
        p.z += wave * along;
        p.y -= along * along * 0.05;
        vShade = cos(p.x * 9.0 - uTime * 6.5 + p.y * 2.5) * along;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSkyLight;
      uniform vec3 uSunColor;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vec3 tex = texture2D(uMap, vUv).rgb;
        vec3 light = vec3(0.2) + uSkyLight * 2.6 + uSunColor * 0.4;
        vec3 color = tex * light * (0.86 + vShade * 0.22);
        gl_FragColor = vec4(color, 1.0);
        ${OUTPUT}
      }
    `,
  }));
  flag.position.set(0.02, 0.6, 0);
  group.add(flag);

  const pole = new Mesh(new CylinderGeometry(0.012, 0.016, 1.05, 8), new MeshBasicMaterial({ color: '#C9D1DC' }));
  pole.position.y = 0.42;
  group.add(pole);

  group.position.set(summit.x, summit.y - 0.08, summit.z);
  group.rotation.y = -0.7;
  return { group, textures: [texture] };
}

// ---- Petites lumières : frontales et village ----------------------------------------

function lightPoints(count, uniforms, { color, size }) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = hash(i, 31);
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  const alphas = new Float32Array(count).fill(1);
  geometry.setAttribute('aAlpha', new BufferAttribute(alphas, 1));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: uniforms.uTime,
      uPixelRatio: uniforms.uPixelRatio,
      uHeight: uniforms.uViewHeight,
      uNight: uniforms.uNight,
      uColor: { value: new Color(color) },
      uSize: { value: size },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aAlpha;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uHeight;
      uniform float uNight;
      uniform float uSize;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float flicker = 0.8 + 0.2 * sin(uTime * (2.0 + aSeed * 3.0) + aSeed * 50.0);
        vAlpha = aAlpha * flicker * uNight;
        gl_PointSize = clamp(uSize * (0.7 + aSeed * 0.6) * uHeight / max(-mv.z, 0.1), 3.0 * uPixelRatio, 30.0 * uPixelRatio);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.22, 0.0, d);
        float halo = smoothstep(0.5, 0.0, d) * 0.35;
        gl_FragColor = vec4(uColor * (core + halo) * vAlpha, 1.0);
        ${OUTPUT}
      }
    `,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return points;
}

// Avant l'aube, les cordées montent l'arête du Hörnli à la frontale.
function createHeadlamps(uniforms) {
  const ridge = hornliRidge();
  const count = 22;
  const points = lightPoints(count, uniforms, { color: '#FFDCA8', size: 0.17 });
  const position = points.geometry.attributes.position;
  const alpha = points.geometry.attributes.aAlpha;

  function update(time) {
    for (let i = 0; i < count; i++) {
      // Par cordées de deux, qui se suivent de près.
      const party = Math.floor(i / 2);
      const raw = party / (count / 2) + (i % 2) * 0.014 + time * 0.004 + hash(party, 9) * 0.05;
      const progress = ((raw % 1) + 1) % 1; // toujours entre 0 et 1, même si le temps est négatif
      const at = (1 - progress) * (ridge.length - 1);
      const index = Math.min(ridge.length - 1, Math.max(0, Math.floor(at)));
      const a = ridge[index];
      const b = ridge[Math.min(ridge.length - 1, index + 1)];
      const t = at - index;
      position.setXYZ(i, lerp(a.x, b.x, t), lerp(a.y, b.y, t) + 0.07, lerp(a.z, b.z, t));
      alpha.setX(i, Math.sin(Math.PI * progress) ** 0.6);
    }
    position.needsUpdate = true;
    alpha.needsUpdate = true;
  }
  return { points, update };
}

// Les lumières d'un hameau, au pied de l'arête du Hörnli.
function createVillage(uniforms) {
  const count = 150;
  const points = lightPoints(count, uniforms, { color: '#FFC27A', size: 0.085 });
  const position = points.geometry.attributes.position;
  for (let i = 0; i < count; i++) {
    // Nuage de points allongé le long du fond de vallée.
    const along = (hash(i, 41) - 0.5) * 2;
    const across = (hash(i, 42) - 0.5) * 2 * (1 - Math.abs(along) * 0.6);
    const x = 7.6 + along * 2.3 + across * 1.2;
    const z = -14.2 - along * 1.5 + across * 1.3;
    position.setXYZ(i, x, heightAt(x, z) + 0.06, z);
  }
  position.needsUpdate = true;
  points.renderOrder = 20; // dessiné après la mer de nuages : les lumières percent la brume
  return { points };
}

// ---- Assemblage ---------------------------------------------------------------------

export function createEmblem(uniforms, { logoUrl }) {
  const summit = new Vector3(0, heightAt(0, 0), 0);
  const group = new Group();
  const stars = createStars(summit);
  const flag = createFlag(summit, uniforms, logoUrl);
  const headlamps = createHeadlamps(uniforms);
  const village = createVillage(uniforms);
  group.add(stars.group, flag.group, headlamps.points, village.points);

  return {
    group,
    summit,
    update(params) {
      stars.update(params);
      headlamps.update(params.time);
    },
    dispose() {
      [...stars.textures, ...flag.textures].forEach((texture) => texture.dispose());
    },
  };
}
