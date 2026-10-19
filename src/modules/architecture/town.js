import * as THREE from 'three';
import { RNG } from '../utils/rng.js';

const tmp = new THREE.Object3D();
const col = new THREE.Color();

export function createTown(field, world, { count = 500, wallMat, roofMat, podiumMat = wallMat, clearings = [] }) {
  const rng = new RNG(world.seed + 5);
  const homes = [];
  let tries = 0;
  while (homes.length < count && tries++ < count * 80) {
    const a = rng.float(0, Math.PI * 2);
    const e = 1.25 + Math.pow(rng.next(), 1.15) * 2.1;
    const x = world.acropolis.x + Math.cos(a) * world.acropolis.rx * e;
    const z = world.acropolis.z + Math.sin(a) * world.acropolis.rz * e;
    const h = field.heightAt(x, z);
    if (h < world.waterLevel + 2.5) continue;
    const ny = field.normalAt(x, z, 4).y;
    if (ny < 0.8) continue;
    if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    if (field.noise.fbm2(x * 0.012, z * 0.012, 2) < -0.05) continue;
    const r = rng.next();
    const type = r < 0.3 ? 'court' : r < 0.55 ? 'L' : 'block';
    const w = type === 'court' ? rng.float(9, 13) : rng.float(4, 8), d = type === 'court' ? rng.float(9, 12) : rng.float(3.8, 6.5);
    const ht = rng.next() < 0.3 ? rng.float(5.6, 7.2) : rng.float(2.8, 4.4);
    if (homes.some((o) => Math.abs(o.x - x) < (o.w + w) * 0.58 && Math.abs(o.z - z) < (o.d + d) * 0.58)) continue;
    const rot = Math.atan2(world.acropolis.x - x, world.acropolis.z - z) + rng.float(-0.2, 0.2);
    let lo = h, hi = h;
    for (const [u, v] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      const hx = field.heightAt(x + Math.cos(rot) * u * w + Math.sin(rot) * v * d, z - Math.sin(rot) * u * w + Math.cos(rot) * v * d);
      lo = Math.min(lo, hx); hi = Math.max(hi, hx);
    }
    homes.push({ x, z, y: hi, lo, w, d, ht, rot, type });
  }
  const parts = [], podia = [];
  for (const o of homes) {
    const wings = o.type === 'court'
      ? [[0, -0.5 + 0.17, 1, 0.34], [0, 0.5 - 0.12, 1, 0.24], [-0.5 + 0.13, 0, 0.26, 1], [0.5 - 0.13, 0, 0.26, 1]]
      : o.type === 'L' ? [[0, -0.2, 1, 0.6], [0.32, 0.25, 0.36, 0.9]] : [[0, 0, 1, 1]];
    wings.forEach(([u, v, sw, sd], k) => {
      const cx = o.x + Math.cos(o.rot) * u * o.w + Math.sin(o.rot) * v * o.d;
      const cz = o.z - Math.sin(o.rot) * u * o.w + Math.cos(o.rot) * v * o.d;
      parts.push({ x: cx, z: cz, y: o.y, w: o.w * sw, d: o.d * sd, ht: o.ht * (k === 0 ? 1 : 0.8), rot: o.rot });
    });
    if (o.y - o.lo > 1.2) podia.push(o);
  }
  homes.length = 0;
  homes.push(...parts);
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
  const pod = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), podiumMat, Math.max(1, podia.length));
  podia.forEach((o, i) => {
    tmp.position.set(o.x, o.lo - 1, o.z);
    tmp.rotation.set(0, o.rot, 0);
    tmp.scale.set(o.w * 1.08, o.y - o.lo + 1.05, o.d * 1.08);
    tmp.updateMatrix();
    pod.setMatrixAt(i, tmp.matrix);
  });
  pod.count = podia.length;
  for (const m of [walls, roofs, pod]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const g = new THREE.Group();
  g.add(walls, roofs, pod);
  g.userData.count = homes.length;
  return g;
}
