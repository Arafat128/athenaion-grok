import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD, ATMOS, QUALITY, SUN_DIR } from './config.js';
import { createMaterials } from './materials.js';
import { createSky } from './modules/atmosphere/sky.js';
import { createAthena } from './modules/statues/athena.js';

const params = new URLSearchParams(location.search);
const quality = QUALITY[params.get('quality')] || QUALITY.high;
const w = parseInt(params.get('w') || innerWidth, 10), h = parseInt(params.get('h') || innerHeight, 10);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(w, h);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = ATMOS.exposure;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const sky = createSky({ sunDir: SUN_DIR, sunColor: ATMOS.sunColor, zenith: ATMOS.zenith, horizon: ATMOS.horizon, fogColor: ATMOS.fogColor });
scene.add(sky.mesh);
scene.environment = sky.bakeEnvironment(renderer);
scene.environmentIntensity = 0.7;
const sun = new THREE.DirectionalLight(ATMOS.sunColor, ATMOS.sunIntensity);
sun.position.copy(SUN_DIR).multiplyScalar(100);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 35, bottom: -5, near: 1, far: 300 });
sun.shadow.bias = -0.0003;
scene.add(sun, new THREE.HemisphereLight(0x8ca6d9, 0x4d402b, 0.55));
const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);
const t0 = performance.now();
const athena = createAthena({ height: 22, cell: quality.statueCell, mats: createMaterials(WORLD) });
athena.rotation.y = parseFloat(params.get('rot') || '0');
scene.add(athena);
console.log(`statue ${(performance.now() - t0).toFixed(0)}ms`);
const ph = athena.userData.pedestalHeight;
const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50000);
const controls = new OrbitControls(camera, renderer.domElement);
const VIEWS = {
  full: { pos: [14, ph + 6, 38], target: [0, ph + 11, 0], fov: 45 },
  face: { pos: [1.5, ph + 20.4, 6.5], target: [0, ph + 20.2, 0], fov: 32 },
  helmet: { pos: [-4, ph + 22, 4.5], target: [0, ph + 20.6, 0], fov: 38 },
  owl: { pos: [-4, ph + 1.8, 9], target: [-2.6, ph + 1, 3.3], fov: 38 },
  pedestal: { pos: [6, 2.5, 22], target: [0, ph * 0.6, 0], fov: 45 },
  chest: { pos: [1.5, ph + 16.5, 7], target: [0, ph + 16.4, 0.5], fov: 40 },
};
function setView(n) {
  const v = VIEWS[n] || VIEWS.full;
  camera.position.set(...v.pos);
  controls.target.set(...v.target);
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  controls.update();
}
setView(params.get('view') || 'full');
window.__athenaion = {
  setView,
  render() { sky.mesh.position.copy(camera.position); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
  ready: true,
};
renderer.setAnimationLoop(() => { controls.update(); sky.mesh.position.copy(camera.position); renderer.render(scene, camera); });
