import * as THREE from 'three';
import { createStoa } from './stoa.js';
import { createPedestal } from '../statues/pedestal.js';
import { figureGeometry } from '../statues/caryatid.js';
import { box, merge } from './geometry.js';

export function statueOnPlinth({ kind = 'kore', height = 4.2, label, mats, cell, gilt = false }) {
  const g = new THREE.Group();
  const ped = createPedestal({ H: height, mats, label, ph: height * 0.42, pw: height * 0.42 });
  const fig = new THREE.Mesh(figureGeometry(kind, cell), gilt ? mats.gold : mats.statue);
  fig.scale.setScalar(height);
  fig.position.y = ped.userData.height;
  fig.castShadow = fig.receiveShadow = true;
  g.add(ped, fig);
  return g;
}

export function createAgora(G, { mats, cell }) {
  const group = new THREE.Group();
  const pave = new THREE.Mesh(box(G.w, 0.6, G.d, 0, G.y + 0.05, 0), mats.paving);
  pave.receiveShadow = true;
  group.add(pave);
  const stoa = createStoa({ length: G.w * 0.82, depth: 13, mats });
  stoa.position.set(0, G.y + 0.3, -G.d / 2 + 9);
  group.add(stoa);
  const stoa2 = createStoa({ length: G.d * 0.6, depth: 11, colH: 5.4, radius: 0.44, mats });
  stoa2.rotation.y = -Math.PI / 2;
  stoa2.position.set(G.w / 2 - 8, G.y + 0.3, 6);
  group.add(stoa2);
  const altar = new THREE.Mesh(merge([box(7, 0.5, 4.6, 0, G.y + 0.55), box(5.6, 1.6, 3.2, 0, G.y + 1.6), box(6.2, 0.35, 3.8, 0, G.y + 2.55)]), mats.marble);
  altar.castShadow = true;
  altar.position.set(-8, 0, 10);
  group.add(altar);
  const labels = ['ΝΙΚΗ', 'ΗΡΑ', 'ΑΡΤΕΜΙΣ', 'ΕΙΡΗΝΗ', 'ΔΗΜΗΤΗΡ', 'ΜΟΥΣΑ'];
  const spots = [];
  labels.forEach((label, i) => {
    const s = statueOnPlinth({ label, mats, cell, height: 6.2, gilt: i === 0 });
    const x = -G.w * 0.33 + (i % 3) * G.w * 0.22, z = i < 3 ? -G.d / 2 + 22 : G.d / 2 - 14;
    s.position.set(x, G.y + 0.35, z);
    s.rotation.y = i < 3 ? 0 : Math.PI;
    group.add(s);
    spots.push({ x: x + 4, z: z + (i < 3 ? 3 : -3) });
  });
  group.position.set(G.x, 0, G.z);
  group.userData.braziers = [{ x: G.x - 13, y: G.y + 0.35, z: G.z + 10 }, { x: G.x - 3, y: G.y + 0.35, z: G.z + 10 }, ...spots.slice(0, 3).map((s) => ({ x: G.x + s.x, y: G.y + 0.35, z: G.z + s.z }))];
  group.userData.banners = [-1, -0.5, 0, 0.5, 1].map((t) => ({ x: G.x + t * G.w * 0.38, y: G.y + 0.35, z: G.z - G.d / 2 + 17, rot: 0 }));
  group.userData.clearing = { x: G.x, z: G.z, r: Math.hypot(G.w, G.d) / 2 + 10 };
  return group;
}
