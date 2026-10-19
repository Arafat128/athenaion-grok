import * as THREE from 'three';
import { bakeSdf } from './bakeSdf.js';
import { marbleSdf, goldSdf, ATHENA_BOUNDS, SPEAR } from './athenaSdf.js';
import { box, merge, prep } from '../architecture/geometry.js';

function toGeometry({ positions, normals, cavity, indices }, scale) {
  const g = new THREE.BufferGeometry();
  const p = positions.slice();
  for (let i = 0; i < p.length; i++) p[i] *= scale;
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('cavity', new THREE.BufferAttribute(cavity, 1));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeBoundingSphere();
  return g;
}

function spearGeometry(H) {
  const shaft = new THREE.CylinderGeometry(0.0085 * H, 0.0095 * H, 1.3 * H, 12).translate(0, 0.65 * H, 0);
  const blade = new THREE.CylinderGeometry(0, 0.03 * H, 0.15 * H, 4, 1).scale(1, 1, 0.25).translate(0, 1.375 * H, 0);
  const collar = new THREE.CylinderGeometry(0.014 * H, 0.014 * H, 0.02 * H, 12).translate(0, 1.3 * H, 0);
  return merge([shaft, blade, collar]).translate(SPEAR.x * H, 0, SPEAR.z * H);
}

export function createAthena({ height = 22, cell = 0.004, mats }) {
  const group = new THREE.Group();
  const H = height;
  const marble = new THREE.Mesh(toGeometry(bakeSdf(marbleSdf, ATHENA_BOUNDS, cell), H), mats.statue || mats.marble);
  const gold = new THREE.Mesh(toGeometry(bakeSdf(goldSdf, ATHENA_BOUNDS, cell), H), mats.gold);
  const spear = new THREE.Mesh(spearGeometry(H), mats.gold);
  for (const m of [marble, gold, spear]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const figure = new THREE.Group();
  figure.add(marble, gold, spear);

  const ph = H * 0.26;
  const pw = H * 0.42;
  const ped = merge([
    box(pw * 1.3, ph * 0.12, pw * 1.3, 0, ph * 0.06),
    box(pw * 1.15, ph * 0.1, pw * 1.15, 0, ph * 0.17),
    box(pw, ph * 0.6, pw, 0, ph * 0.52),
    box(pw * 1.08, ph * 0.08, pw * 1.08, 0, ph * 0.86),
    box(pw * 1.14, ph * 0.1, pw * 1.14, 0, ph * 0.95),
  ]);
  const pedestal = new THREE.Mesh(ped, mats.marble);
  pedestal.castShadow = pedestal.receiveShadow = true;
  const band = new THREE.Mesh(prep(new THREE.BoxGeometry(pw * 1.012, ph * 0.05, pw * 1.012).translate(0, ph * 0.76, 0)), mats.gold);
  figure.position.y = ph;
  group.add(pedestal, band, figure);
  group.userData = { height: H + ph, pedestalHeight: ph };
  return group;
}
