import * as THREE from 'three';
import { RNG } from '../utils/rng.js';
import { createFoliageMaterial } from './foliageMaterial.js';
import { createCypressGeometry, createOliveGeometry, createShrubGeometry, createGrassTuftGeometry, createCypressClumpGeometry, createGnarledOliveGeometry, createFlowerGeometry } from './treeGeometry.js';
import { bakeImpostor, createImpostorMaterial, impostorGeometry } from './impostor.js';
import { patchWind } from './wind.js';
import { smoothstep } from '../utils/math.js';

const tmp = new THREE.Object3D();
const col = new THREE.Color();

function place(field, world, count, rng, rule, extra = []) {
  const out = [...extra];
  let tries = 0;
  const maxR = rule.radius;
  while (out.length < count && tries < count * 40) {
    tries++;
    const a = rng.float(0, Math.PI * 2);
    const r = maxR * Math.pow(rng.next(), rule.falloff ?? 1.4) + (rule.minR ?? 0);
    const x = rule.cx + Math.cos(a) * r, z = rule.cz + Math.sin(a) * r;
    const h = field.heightAt(x, z);
    if (h < world.waterLevel + 1.5) continue;
    if (h > rule.maxH) continue;
    const nrm = field.normalAt(x, z, 2.5);
    if (nrm.y < rule.minNy) continue;
    if (field.acropolisEllipse(x, z) < 1.12) continue;
    if (rule.clearings && rule.clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    if (Math.hypot(x - world.mesa.x, z - world.mesa.z) < world.mesa.r + 4 && field.channelDist(x, z) < 14) continue;
    const dens = smoothstep(rule.densLo, rule.densHi, field.noise.fbm2(x * rule.densFreq + rule.densSeed, z * rule.densFreq, 3) + 0.5);
    if (rng.next() > dens * (1 - smoothstep(rule.maxH * 0.7, rule.maxH, h))) continue;
    out.push([x, h - 0.3, z]);
  }
  return out;
}

function build(geo, mat, points, rng, scaleRange, tint) {
  const m = new THREE.InstancedMesh(geo, mat, points.length);
  points.forEach(([x, y, z, s], i) => {
    const sc = s ?? rng.float(...scaleRange);
    tmp.position.set(x, y, z);
    tmp.rotation.set(rng.float(-0.04, 0.04), rng.float(0, Math.PI * 2), rng.float(-0.04, 0.04));
    tmp.scale.set(sc * rng.float(0.85, 1.15), sc, sc * rng.float(0.85, 1.15));
    tmp.updateMatrix();
    m.setMatrixAt(i, tmp.matrix);
    col.setRGB(...tint.map((t) => t * rng.float(0.8, 1.2)));
    m.setColorAt(i, col);
  });
  m.castShadow = true;
  m.receiveShadow = true;
  m.frustumCulled = false;
  return m;
}

// Distance-based LOD over one set of instance transforms: each frame the camera has moved
// enough, instances are re-bucketed into the mesh for their level (high, mid, impostor).
function lodSet(points, levels, rng, scaleRange, tint) {
  const N = points.length;
  const mats = new Float32Array(N * 16), cols = new Float32Array(N * 3), pos = new Float32Array(N * 3);
  points.forEach(([x, y, z, s], i) => {
    const sc = s ?? rng.float(...scaleRange);
    tmp.position.set(x, y, z);
    tmp.rotation.set(rng.float(-0.04, 0.04), rng.float(0, Math.PI * 2), rng.float(-0.04, 0.04));
    tmp.scale.set(sc * rng.float(0.85, 1.15), sc, sc * rng.float(0.85, 1.15));
    tmp.updateMatrix();
    tmp.matrix.toArray(mats, i * 16);
    col.setRGB(...tint.map((t) => t * rng.float(0.8, 1.2)));
    col.toArray(cols, i * 3);
    pos.set([x, y, z], i * 3);
  });
  const meshes = levels.map((l) => {
    const m = new THREE.InstancedMesh(l.geo, l.mat, Math.max(1, N));
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, N) * 3), 3);
    m.castShadow = l.shadow !== false;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.count = 0;
    return m;
  });
  const last = new THREE.Vector3(1e9, 0, 0);
  function update(cam, force = false) {
    if (!force && cam.distanceToSquared(last) < 16) return;
    last.copy(cam);
    const counts = levels.map(() => 0);
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(pos[i * 3] - cam.x, pos[i * 3 + 1] - cam.y, pos[i * 3 + 2] - cam.z);
      let L = 0;
      while (L < levels.length - 1 && d > levels[L].dist) L++;
      const m = meshes[L], k = counts[L]++;
      m.instanceMatrix.array.set(mats.subarray(i * 16, i * 16 + 16), k * 16);
      m.instanceColor.array.set(cols.subarray(i * 3, i * 3 + 3), k * 3);
    }
    meshes.forEach((m, L) => {
      m.count = counts[L];
      m.instanceMatrix.needsUpdate = true;
      m.instanceColor.needsUpdate = true;
    });
  }
  return { meshes, update, counts: () => meshes.map((m) => m.count) };
}

function avenue(field, from, to, spacing, offset) {
  const pts = [];
  const dx = to.x - from.x, dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  const nx = -dz / len, nz = dx / len;
  for (let d = 0; d <= len; d += spacing) {
    for (const s of [-1, 1]) {
      const x = from.x + (dx / len) * d + nx * offset * s, z = from.z + (dz / len) * d + nz * offset * s;
      pts.push([x, field.heightAt(x, z) - 0.3, z, 1.05]);
    }
  }
  return pts;
}

export function createVegetation(field, world, quality, { avenues = [], clearings = [], meadows = [], hardClearings = [], renderer, timeUniform } = {}) {
  const rng = new RNG(world.seed + 77);
  const group = new THREE.Group();
  const T = timeUniform || { value: 0 };
  const cypWind = { height: 14, sway: 0.32, flutter: 0.05, power: 2.0 };
  const oliWind = { height: 5, sway: 0.08, flutter: 0.06, power: 1.5 };
  const cypMat = createFoliageMaterial({ timeUniform: T, wind: cypWind });
  const oliMat = createFoliageMaterial({ timeUniform: T, wind: oliWind, sheen: 0.35 });
  const shrubMat = createFoliageMaterial({ timeUniform: T, wind: { height: 1.5, sway: 0.03, flutter: 0.03, power: 1.0 } });
  const extras = avenues.flatMap((a) => avenue(field, a.from, a.to, a.spacing, a.offset));
  const base = { cx: 0, cz: 0, radius: 3200, falloff: 1.7, minNy: 0.8, densFreq: 0.004, densSeed: 0, clearings };
  const cyp = place(field, world, quality.cypress, rng, { ...base, maxH: 520, densLo: 0.35, densHi: 0.7, densSeed: 11 }, extras);
  const oli = place(field, world, quality.olive, rng, { ...base, radius: 2200, maxH: 220, minNy: 0.88, densLo: 0.3, densHi: 0.6, densSeed: 37 });
  const shr = place(field, world, quality.shrubs, rng, { ...base, radius: 1800, maxH: 600, minNy: 0.6, densLo: 0.2, densHi: 0.6, densSeed: 53 });

  const lod = quality.treeLod ?? [350, 1100];
  const cypHi = createCypressClumpGeometry(5, quality.terrainSegments > 500 ? 1.2 : 0.8);
  const oliHi = createGnarledOliveGeometry(9);
  const cypLevels = [{ geo: cypHi, mat: cypMat, dist: lod[0] }, { geo: createCypressGeometry(5, 0.7), mat: cypMat, dist: lod[1] }];
  const oliLevels = [{ geo: oliHi, mat: oliMat, dist: lod[0] * 0.8 }, { geo: createOliveGeometry(9), mat: oliMat, dist: lod[1] * 0.8 }];
  if (renderer) {
    const cb = bakeImpostor(renderer, cypHi, { size: 128, darken: 0.8 });
    cypLevels.push({ geo: impostorGeometry(cb), mat: createImpostorMaterial(cb, { timeUniform: T, sway: 1 }), dist: Infinity, shadow: false });
    const ob = bakeImpostor(renderer, oliHi, { size: 192, darken: 0.85 });
    oliLevels.push({ geo: impostorGeometry(ob), mat: createImpostorMaterial(ob, { timeUniform: T }), dist: Infinity, shadow: false });
  } else {
    cypLevels[1].dist = Infinity;
    oliLevels[1].dist = Infinity;
  }
  const sets = [lodSet(cyp, cypLevels, rng, [0.7, 1.35], [1, 1, 1]), lodSet(oli, oliLevels, rng, [0.8, 1.3], [1.1, 1.1, 1.05])];
  for (const st of sets) group.add(...st.meshes);
  group.add(build(createShrubGeometry(13), shrubMat, shr, rng, [0.8, 2.2], [1, 1, 1]));

  const grassPts = [];
  const per = Math.round((quality.shrubs * 6) / Math.max(1, meadows.length));
  for (const m of meadows) {
    grassPts.push(...place(field, world, per, rng, { ...base, clearings: hardClearings, cx: m.x, cz: m.z, radius: m.r, falloff: 1.2, maxH: 400, minNy: 0.75, densLo: 0.15, densHi: 0.55, densSeed: 91, densFreq: 0.02 }));
  }
  const windy = (mat, w) => { mat.onBeforeCompile = (sh) => patchWind(sh, T, w); mat.customProgramCacheKey = () => JSON.stringify(w); return mat; };
  const grassMat = windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }), { height: 1, sway: 0.14, flutter: 0.04, power: 1.6 });
  const grass = build(createGrassTuftGeometry(), grassMat, grassPts.map(([x, y, z]) => [x, y + 0.25, z]), rng, [0.5, 1.1], [1, 1, 1]);
  grass.castShadow = false;
  group.add(grass);

  // Wildflowers: poppies, chamomile, yellow broom, wild lavender in drifts across the meadows.
  const flowerMat = windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), { height: 0.6, sway: 0.08, flutter: 0.03, power: 1.4 });
  const kinds = [[0.75, 0.06, 0.04], [0.85, 0.82, 0.72], [0.85, 0.62, 0.06], [0.38, 0.22, 0.6]];
  let flowers = 0;
  kinds.forEach((petal, k) => {
    const pts = [];
    for (const m of meadows) {
      pts.push(...place(field, world, Math.round((quality.flowers ?? 6000) / kinds.length / Math.max(1, meadows.length)), rng, { ...base, clearings: hardClearings, cx: m.x, cz: m.z, radius: m.r, falloff: 1.1, maxH: 300, minNy: 0.8, densLo: 0.45, densHi: 0.75, densSeed: 140 + k * 17, densFreq: 0.03 }));
    }
    const fm = build(createFlowerGeometry(23 + k, petal, 5 + k), flowerMat, pts.map(([x, y, z]) => [x, y + 0.28, z]), rng, [0.8, 1.4], [1, 1, 1]);
    fm.castShadow = false;
    group.add(fm);
    flowers += pts.length;
  });

  group.userData.update = (camPos, force) => sets.forEach((st) => st.update(camPos, force));
  group.userData.lodCounts = () => sets.map((st) => st.counts());
  group.userData.counts = { cypress: cyp.length, olive: oli.length, shrubs: shr.length, grass: grassPts.length, flowers };
  return group;
}
