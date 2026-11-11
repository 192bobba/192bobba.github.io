// Drapeau 3D qui flotte au vent, avec le logo de la marque.
// Le vent forcit quand on passe la souris (ou le doigt) dessus.

import {
  AmbientLight,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
} from '../../vendor/three/three.min.js';
import { createRenderer, startLoop, disposeScene } from './loop.js';

const FLAG_SIZE = 4;

export function createFlagScene(container, { image }) {
  const renderer = createRenderer(container, { alpha: true });
  if (!renderer) return null;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0.6, 0.9, 11.5);
  camera.lookAt(0.6, 0.5, 0);

  scene.add(new AmbientLight('#FFFFFF', 1.4));
  const sun = new DirectionalLight('#FFFFFF', 2.2);
  sun.position.set(4, 5, 8);
  scene.add(sun);
  const fill = new DirectionalLight('#DDE4F0', 0.8);
  fill.position.set(-6, -2, 4);
  scene.add(fill);

  const rig = new Group();
  rig.rotation.y = -0.38;
  rig.position.x = -0.6;
  scene.add(rig);

  // Le tissu : une grille dont on déforme les points à chaque image.
  const cloth = new PlaneGeometry(FLAG_SIZE, FLAG_SIZE, 40, 40);
  cloth.translate(FLAG_SIZE / 2, 0, 0); // bord gauche contre le mât
  const restX = Float32Array.from({ length: cloth.attributes.position.count }, (_, i) => cloth.attributes.position.getX(i));
  const restY = Float32Array.from({ length: cloth.attributes.position.count }, (_, i) => cloth.attributes.position.getY(i));

  let disposed = false;
  const texture = new TextureLoader().load(image, () => { if (!disposed) loop.redraw(); });
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const flag = new Mesh(cloth, new MeshStandardMaterial({ map: texture, side: DoubleSide, roughness: 0.9, metalness: 0 }));
  flag.position.set(0.04, 1.15, 0);
  rig.add(flag);

  const metal = new MeshStandardMaterial({ color: '#B8BFC9', roughness: 0.3, metalness: 0.6 }); // mât clair, visible sur fond sombre
  const pole = new Mesh(new CylinderGeometry(0.06, 0.07, 8, 16), metal);
  pole.position.set(0, -0.8, 0);
  rig.add(pole);
  const knob = new Mesh(new SphereGeometry(0.13, 16, 12), metal);
  knob.position.set(0, 3.3, 0);
  rig.add(knob);

  // Vent : plus fort au survol.
  let wind = 1;
  let windTarget = 1;
  const stronger = () => { windTarget = 1.9; };
  const calmer = () => { windTarget = 1; };
  container.addEventListener('pointerenter', stronger);
  container.addEventListener('pointerleave', calmer);
  container.addEventListener('pointerdown', stronger);
  container.addEventListener('pointerup', calmer);

  const position = cloth.attributes.position;
  const render = (time, dt) => {
    wind += (windTarget - wind) * (1 - Math.exp(-(dt || 0.016) * 2));
    for (let i = 0; i < position.count; i++) {
      const x = restX[i];
      const y = restY[i];
      const u = x / FLAG_SIZE; // 0 au mât, 1 au bout du drapeau
      const wave = Math.sin(x * 1.7 - time * 3.4 * Math.sqrt(wind) + y * 0.35) * 0.26
        + Math.sin(x * 3.1 - time * 5.2 + y * 1.3) * 0.07;
      position.setZ(i, wave * Math.pow(u, 1.15) * wind);
      position.setX(i, x - Math.pow(u, 2) * 0.12 * wind);
      position.setY(i, y - u * u * 0.18 / wind + Math.sin(time * 2 + x) * 0.03 * u);
    }
    position.needsUpdate = true;
    cloth.computeVertexNormals();
    rig.rotation.y = -0.38 + Math.sin(time * 0.4) * 0.06;
    renderer.render(scene, camera);
  };

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(() => {
    resize();
    loop?.redraw();
  });

  const loop = startLoop(container, render, { staticTime: 1.2 });
  resizeObserver.observe(container);

  return () => {
    disposed = true;
    loop.stop();
    resizeObserver.disconnect();
    container.removeEventListener('pointerenter', stronger);
    container.removeEventListener('pointerleave', calmer);
    container.removeEventListener('pointerdown', stronger);
    container.removeEventListener('pointerup', calmer);
    disposeScene(scene, renderer);
  };
}
