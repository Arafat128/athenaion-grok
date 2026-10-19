import * as THREE from 'three';

const tmp = new THREE.Object3D();

export function createPerimeterWall(field, world, mat, { inset = 2.5, segLen = 7, height = 5, thickness = 2.6, skip = () => false } = {}) {
  const A = world.acropolis;
  const pts = [];
  const N = 360;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const cx = Math.cos(a) * A.rx, cz = Math.sin(a) * A.rz;
    const len = Math.hypot(cx, cz);
    let k = 0.6;
    while (k < 1.3 && field.heightAt(A.x + cx * k, A.z + cz * k) > A.top - 1.2) k += 0.004;
    const kk = k - inset / len;
    pts.push(new THREE.Vector2(A.x + cx * kk, A.z + cz * kk));
  }
  const segs = [];
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N];
    acc += p.distanceTo(q);
    if (acc < segLen) continue;
    acc = 0;
    segs.push(p);
  }
  const towers = [];
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const list = [];
  for (let i = 0; i < segs.length; i++) {
    const p = segs[i], q = segs[(i + 1) % segs.length];
    const mx = (p.x + q.x) / 2, mz = (p.y + q.y) / 2;
    if (skip(mx, mz)) continue;
    const len = p.distanceTo(q) + 0.6;
    const ground = Math.min(field.heightAt(mx, mz), field.heightAt(p.x, p.y), field.heightAt(q.x, q.y));
    const top = A.top + height;
    const bottom = Math.min(ground, A.top) - 14;
    list.push({ x: mx, z: mz, len, top, bottom, rot: -Math.atan2(q.y - p.y, q.x - p.x) });
    if (i % 9 === 0) towers.push({ x: mx, z: mz, top: top + 2.5, bottom, rot: -Math.atan2(q.y - p.y, q.x - p.x) });
  }
  const m = new THREE.InstancedMesh(geo, mat, list.length + towers.length);
  list.forEach((s, i) => {
    tmp.position.set(s.x, (s.top + s.bottom) / 2, s.z);
    tmp.rotation.set(0, s.rot, 0);
    tmp.scale.set(s.len, s.top - s.bottom, thickness);
    tmp.updateMatrix();
    m.setMatrixAt(i, tmp.matrix);
  });
  towers.forEach((s, i) => {
    tmp.position.set(s.x, (s.top + s.bottom) / 2, s.z);
    tmp.rotation.set(0, s.rot, 0);
    tmp.scale.set(5.5, s.top - s.bottom, 5.5);
    tmp.updateMatrix();
    m.setMatrixAt(list.length + i, tmp.matrix);
  });
  m.castShadow = true;
  m.receiveShadow = true;
  const merlons = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 1.1, thickness * 0.9), mat, list.length * 3);
  let k = 0;
  for (const s of list) {
    for (let j = 0; j < 3; j++) {
      const off = (j - 1) * (s.len / 3);
      tmp.position.set(s.x + Math.cos(-s.rot) * off, s.top + 0.55, s.z + Math.sin(-s.rot) * off);
      tmp.rotation.set(0, s.rot, 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      merlons.setMatrixAt(k++, tmp.matrix);
    }
  }
  merlons.count = k;
  merlons.castShadow = true;
  const g = new THREE.Group();
  g.add(m, merlons);
  return g;
}

export function createStairway(field, mat, { start, dir, width = 14, rise = 0.24, run = 0.5, maxSteps = 400 }) {
  const steps = [];
  let x = start.x, z = start.z, y = start.y;
  let d = 0;
  while (d < 200 && field.heightAt(x + dir.x * d, z + dir.z * d) > start.y - 5.0) d += 0.5;
  x += dir.x * Math.max(0, d - 6);
  z += dir.z * Math.max(0, d - 6);
  for (let i = 0; i < maxSteps; i++) {
    const ground = field.heightAt(x, z);
    if (i > 12 && ground < start.y - 8 && y < ground + 0.15) break;
    steps.push({ x, z, y, ground });
    x += dir.x * run;
    z += dir.z * run;
    y -= rise;
  }
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, steps.length + 2);
  const rot = Math.atan2(dir.x, dir.z);
  steps.forEach((s, i) => {
    const bottom = Math.min(s.ground, s.y) - 6;
    tmp.position.set(s.x, (s.y + bottom) / 2, s.z);
    tmp.rotation.set(0, rot, 0);
    tmp.scale.set(width, s.y - bottom, run + 0.02);
    tmp.updateMatrix();
    m.setMatrixAt(i, tmp.matrix);
  });
  const last = steps[steps.length - 1];
  const first = steps[0];
  const len = steps.length * run;
  const cx = (first.x + last.x) / 2, cz = (first.z + last.z) / 2;
  for (const s of [-1, 1]) {
    const ox = dir.z * s * (width / 2 + 0.8), oz = -dir.x * s * (width / 2 + 0.8);
    const hTop = first.y + 1.2, hBot = last.y + 1.2;
    const g = new THREE.BoxGeometry(1.6, 1, len);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getZ(i) / len + 0.5;
      const top = THREE.MathUtils.lerp(hTop, hBot, t);
      pos.setY(i, pos.getY(i) > 0 ? top : Math.min(last.ground, hBot) - 8);
    }
    g.computeVertexNormals();
    const rail = new THREE.Mesh(g, mat);
    rail.rotation.y = rot;
    rail.position.set(cx + ox, 0, cz + oz);
    rail.castShadow = rail.receiveShadow = true;
    m.userData[`rail${s}`] = rail;
  }
  m.count = steps.length;
  m.castShadow = true;
  m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m, m.userData['rail-1'], m.userData.rail1);
  g.userData = { steps, last };
  return g;
}
