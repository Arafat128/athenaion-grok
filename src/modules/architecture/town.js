import * as THREE from 'three';
import { RNG } from '../utils/rng.js';

const tmp = new THREE.Object3D();
const col = new THREE.Color();

export function createTown(field, world, { count = 500, wallMat, roofMat, clearings = [] }) {
  const rng = new RNG(world.seed + 5);
  const homes = [];
  let tries = 0;
  while (homes.length < count && tries++ < count * 60) {
    const a = rng.float(0, Math.PI * 2);
    const e = 1.3 + Math.pow(rng.next(), 1.3) * 1.6;
    const x = world.acropolis.x + Math.cos(a) * world.acropolis.rx * e;
    const z = world.acropolis.z + Math.sin(a) * world.acropolis.rz * e;
    const h = field.heightAt(x, z);
    if (h < world.waterLevel + 2.5) continue;
    if (field.normalAt(x, z, 4).y < 0.93) continue;
    if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    if (field.noise.fbm2(x * 0.012, z * 0.012, 2) < 0.02) continue;
    const w = rng.float(3.5, 7), d = rng.float(3.5, 6), ht = rng.float(2.8, 4.8);
    if (homes.some((o) => Math.abs(o.x - x) < (o.w + w) * 0.6 && Math.abs(o.z - z) < (o.d + d) * 0.6)) continue;
    const toCenter = Math.atan2(world.acropolis.x - x, world.acropolis.z - z);
    homes.push({ x, z, y: h, w, d, ht, rot: toCenter + rng.float(-0.25, 0.25) });
  }
  const houseMat = wallMat.clone();
  const baseCompile = wallMat.onBeforeCompile;
  houseMat.onBeforeCompile = (shader, r) => {
    baseCompile(shader, r);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    vec3 L = vLocal;
    float side = abs(L.x) > 0.49 ? L.z : L.x;
    float wy = smoothstep(0.02, 0.0, abs(L.y - 0.68) - 0.07);
    float wx = smoothstep(0.02, 0.0, abs(fract(side * 2.0 + 0.5) - 0.5) - 0.07);
    float door = step(abs(side - 0.12), 0.07) * step(L.y, 0.42) * step(0.16, L.y) * step(0.49, abs(L.z));
    float hole = max(wx * wy * step(abs(L.y), 0.99), door) * step(abs(vWNormal.y), 0.5);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.03, 0.025), hole);
    float base = 1.0 - smoothstep(0.08, 0.2, L.y);
    diffuseColor.rgb *= 1.0 - 0.35 * base;
  }`);
  };
  houseMat.customProgramCacheKey = () => 'house:' + wallMat.customProgramCacheKey();
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), houseMat, homes.length);
  const roofGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  const roofs = new THREE.InstancedMesh(roofGeo, roofMat, homes.length);
  homes.forEach((o, i) => {
    tmp.position.set(o.x, o.y - 1.5, o.z);
    tmp.rotation.set(0, o.rot, 0);
    tmp.scale.set(o.w, o.ht + 1.5, o.d);
    tmp.updateMatrix();
    walls.setMatrixAt(i, tmp.matrix);
    col.setRGB(1, rng.float(0.88, 0.98), rng.float(0.75, 0.92)).multiplyScalar(rng.float(0.6, 0.95));
    walls.setColorAt(i, col);
    tmp.position.set(o.x, o.y + o.ht, o.z);
    tmp.scale.set(o.w * 1.12, Math.min(o.w, o.d) * 0.28, o.d * 1.12);
    tmp.updateMatrix();
    roofs.setMatrixAt(i, tmp.matrix);
    col.setRGB(1, 1, 1).multiplyScalar(rng.float(0.75, 1.1));
    roofs.setColorAt(i, col);
  });
  for (const m of [walls, roofs]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const g = new THREE.Group();
  g.add(walls, roofs);
  return g;
}
