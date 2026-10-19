import * as THREE from 'three';
import { RNG } from '../utils/rng.js';
import { createFoliageMaterial } from './foliageMaterial.js';
import { createCypressGeometry, createOliveGeometry, createShrubGeometry, createGrassTuftGeometry } from './treeGeometry.js';
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

export function createVegetation(field, world, quality, { avenues = [], clearings = [], meadows = [] } = {}) {
  const rng = new RNG(world.seed + 77);
  const group = new THREE.Group();
  const foliage = createFoliageMaterial();
  const extras = avenues.flatMap((a) => avenue(field, a.from, a.to, a.spacing, a.offset));
  const base = { cx: 0, cz: 0, radius: 3200, falloff: 1.7, minNy: 0.8, densFreq: 0.004, densSeed: 0, clearings };
  const cyp = place(field, world, quality.cypress, rng, { ...base, maxH: 520, densLo: 0.35, densHi: 0.7, densSeed: 11 }, extras);
  const oli = place(field, world, quality.olive, rng, { ...base, radius: 2200, maxH: 220, minNy: 0.88, densLo: 0.3, densHi: 0.6, densSeed: 37 });
  const shr = place(field, world, quality.shrubs, rng, { ...base, radius: 1800, maxH: 600, minNy: 0.6, densLo: 0.2, densHi: 0.6, densSeed: 53 });
  group.add(build(createCypressGeometry(5, quality.terrainSegments > 500 ? 1.3 : 1), foliage, cyp, rng, [0.7, 1.35], [1, 1, 1]));
  group.add(build(createOliveGeometry(9), foliage, oli, rng, [0.8, 1.3], [1.1, 1.1, 1.05]));
  group.add(build(createShrubGeometry(13), foliage, shr, rng, [0.8, 2.2], [1, 1, 1]));
  const grassPts = [];
  const per = Math.round((quality.shrubs * 6) / Math.max(1, meadows.length));
  for (const m of meadows) {
    grassPts.push(...place(field, world, per, rng, { ...base, clearings: [], cx: m.x, cz: m.z, radius: m.r, falloff: 1.2, maxH: 400, minNy: 0.75, densLo: 0.15, densHi: 0.55, densSeed: 91, densFreq: 0.02 }));
  }
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  const grass = build(createGrassTuftGeometry(), grassMat, grassPts.map(([x, y, z]) => [x, y + 0.25, z]), rng, [0.5, 1.1], [1, 1, 1]);
  grass.castShadow = false;
  group.add(grass);
  group.userData.counts = { cypress: cyp.length, olive: oli.length, shrubs: shr.length, grass: grassPts.length };
  return group;
}
