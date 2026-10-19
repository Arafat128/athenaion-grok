import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD, ATMOS, QUALITY, SUN_DIR } from './config.js';
import { VIEWS } from './views.js';
import { createMaterials } from './materials.js';
import { installHeightFog } from './modules/atmosphere/fog.js';
import { createSky } from './modules/atmosphere/sky.js';
import { createLights } from './modules/atmosphere/lights.js';
import { createComposer } from './modules/atmosphere/post.js';
import { createHeightfield } from './modules/terrain/heightfield.js';
import { createTerrain } from './modules/terrain/terrainMesh.js';
import { createAcropolis } from './modules/architecture/acropolis.js';
import { createVegetation } from './modules/vegetation/scatter.js';
import { createLake } from './modules/water/lake.js';
import { createStream } from './modules/water/stream.js';
import { waterfallFrame, cascadeFrame, createWaterfall, createFoam } from './modules/water/waterfall.js';
import { createSoftUniforms } from './modules/atmosphere/softParticles.js';
import { createBirds } from './modules/atmosphere/birds.js';
import { createDust } from './modules/atmosphere/dust.js';
import { createMist } from './modules/water/mist.js';
import { createBannerMaterial } from './modules/materials/banner.js';

const params = new URLSearchParams(location.search);
const qualityName = QUALITY[params.get('quality')] ? params.get('quality') : 'high';
const quality = QUALITY[qualityName];
const renderMode = params.has('render');
const fixedTime = params.has('time') ? parseFloat(params.get('time')) : null;
const status = document.getElementById('status');
const log = (m) => { if (status) status.textContent = m; console.log(`[athenaion] ${m}`); };

installHeightFog({ sunDir: SUN_DIR, fogSun: ATMOS.fogSun, fogFalloff: ATMOS.fogFalloff, fogBase: ATMOS.fogBase });

const width = parseInt(params.get('w') || innerWidth, 10);
const height = parseInt(params.get('h') || innerHeight, 10);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: renderMode });
renderer.setPixelRatio(renderMode ? 1 : Math.min(devicePixelRatio, quality.pixelRatio));
renderer.setSize(width, height, !renderMode);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = parseFloat(params.get('exposure') || ATMOS.exposure);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(ATMOS.fogColor, ATMOS.fogDensity);
const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 30000);
const timeUniform = { value: 0 };

const sky = createSky({ sunDir: SUN_DIR, sunColor: ATMOS.sunColor, zenith: ATMOS.zenith, horizon: ATMOS.horizon, fogColor: ATMOS.fogColor, cloudSteps: parseInt(params.get('clouds') ?? quality.clouds, 10) });
scene.add(sky.mesh);
scene.environment = sky.bakeEnvironment(renderer);
scene.environmentIntensity = 0.7;

const t0 = performance.now();
log('terrain');
const field = createHeightfield(WORLD, { erosion: quality.erosion });
const terrain = createTerrain(field, { extent: WORLD.extent, segments: quality.terrainSegments, world: WORLD, sunDir: SUN_DIR, sunColor: ATMOS.sunColor, timeUniform });
scene.add(terrain);

const lights = createLights({ sunDir: SUN_DIR, sunColor: ATMOS.sunColor, sunIntensity: ATMOS.sunIntensity, quality, focus: new THREE.Vector3(20, WORLD.acropolis.top, 10), hemiSky: ATMOS.hemiSky, hemiGround: ATMOS.hemiGround, hemiIntensity: ATMOS.hemi });
scene.add(lights.group);

log('architecture + statue');
const mats = createMaterials(WORLD);
const bannerMat = createBannerMaterial(timeUniform);
const soft = createSoftUniforms();
const acropolis = createAcropolis(field, WORLD, { mats, bannerMat, quality, timeUniform, soft, clearings: Object.values(VIEWS).filter((v) => !v.abs).map((v) => ({ x: v.pos[0], z: v.pos[2], r: 40 })) });
scene.add(acropolis);

log('water');
const lake = createLake(WORLD, { sunDir: SUN_DIR, sunColor: ATMOS.sunColor, quality, field });
scene.add(lake.mesh);
scene.add(createStream(field, WORLD, timeUniform));
const light = {
  uSunColor: { value: ATMOS.sunColor.clone() },
  uSunDir: { value: SUN_DIR.clone() },
  uSkyColor: { value: ATMOS.hemiSky.clone() },
  uGroundColor: { value: ATMOS.hemiGround.clone() },
};
const mists = [acropolis.userData.flames];
const frames = [waterfallFrame(field, WORLD), cascadeFrame(field, WORLD, { angle: 0.35, y: 74 })];
frames.forEach((frame, i) => {
  scene.add(createWaterfall(frame, { sunDir: SUN_DIR, sunColor: ATMOS.sunColor, timeUniform }));
  scene.add(createFoam(frame, { timeUniform, light, radius: i ? 16 : 48 }));
  const m = createMist(frame, { count: Math.round(quality.mist * (i ? 0.3 : 1)), timeUniform, light, soft, seed: 21 + i, width: frame.width, widthGrow: frame.widthGrow, scale: i ? 0.5 : 1 });
  mists.push(m);
  scene.add(m);
});

const nb = quality.birds;
scene.add(createBirds({ timeUniform, light, flocks: [
  { x: 10, y: 150, z: 10, r: 120, count: Math.round(nb * 0.45), spread: 30, speed: 14, size: 0.9 },
  { x: -330, y: 120, z: 150, r: 90, count: Math.round(nb * 0.35), spread: 40, speed: 12, size: 0.8, cw: true },
  { x: 200, y: 60, z: 60, r: 60, count: Math.round(nb * 0.2), spread: 20, speed: 10, size: 0.6 },
] }));
if (quality.dust) {
  const dust = createDust({ count: quality.dust, timeUniform, light, soft });
  mists.push(dust);
  scene.add(dust);
}

log('vegetation');
const stairs = acropolis.userData.stairs.userData;
const avenues = [{ from: { x: stairs.last.x + 8, z: 2 }, to: { x: stairs.last.x + 260, z: 2 }, spacing: 9, offset: 14 }];
const clearings = [...Object.values(VIEWS).filter((v) => !v.abs).map((v) => ({ x: v.pos[0], z: v.pos[2], r: 55 })), ...acropolis.userData.clearings];
const meadows = Object.values(VIEWS).filter((v) => !v.abs && v.pos[1] < 50).map((v) => ({ x: v.pos[0], z: v.pos[2], r: 260 }));
const vegetation = createVegetation(field, WORLD, quality, { avenues, clearings, meadows, hardClearings: acropolis.userData.clearings, renderer, timeUniform });
scene.add(vegetation);
log(`built in ${(performance.now() - t0).toFixed(0)}ms ${JSON.stringify(vegetation.userData.counts)}`);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 6000;

function setView(name) {
  const v = VIEWS[name] || VIEWS.vista;
  const [x, y, z] = v.pos;
  camera.position.set(x, v.abs ? y : field.heightAt(x, z) + y, z);
  controls.target.set(...v.target);
  camera.fov = v.fov;
  camera.updateProjectionMatrix();
  controls.update();
}
setView(params.get('view') || 'vista');

const { composer, grade } = createComposer(renderer, scene, camera, quality, new THREE.Vector2(width, height).multiplyScalar(renderer.getPixelRatio()), { soft, sunDir: SUN_DIR, sunColor: ATMOS.sunColor });

function resize() {
  if (renderMode) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

function renderFrame(t) {
  timeUniform.value = t;
  sky.uniforms.uTime.value = t;
  lake.update(t);
  vegetation.userData.update(camera.position);
  sky.mesh.position.copy(camera.position);
  const px = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  for (const m of mists) m.userData.setPixel(px * (quality.mistScale ?? 0.5));
  grade.uniforms.uTime.value = t;
  composer.render();
}

window.__athenaion = {
  setView,
  views: Object.keys(VIEWS),
  render(t = fixedTime ?? 12) {
    controls.update();
    renderFrame(t);
    return renderer.domElement.toDataURL('image/png');
  },
  ready: false,
  info: () => renderer.info,
  scene,
  camera,
  renderer,
  composer,
  THREE,
};

if (renderMode) {
  renderFrame(fixedTime ?? 12);
  window.__athenaion.ready = true;
  log('ready');
} else {
  if (params.get('gui') !== '0') import('./gui.js').then((m) => m.createGui({ renderer, scene, setView, views: VIEWS, qualityName, lights, sky }));
  renderer.setAnimationLoop(() => {
    const t = fixedTime ?? performance.now() / 1000;
    controls.update();
    renderFrame(t);
  });
  window.__athenaion.ready = true;
  if (status) setTimeout(() => status.remove(), 1500);
}
