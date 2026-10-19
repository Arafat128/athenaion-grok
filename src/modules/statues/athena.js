import * as THREE from 'three';
import { bakeSdfDetailed } from './bakeSdf.js';
import { marbleSdf, goldSdf, ATHENA_BOUNDS, ATHENA_DETAIL, SPEAR } from './athenaSdf.js';
import { merge } from '../architecture/geometry.js';
import { createPedestal } from './pedestal.js';

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
  const marble = new THREE.Mesh(toGeometry(bakeSdfDetailed(marbleSdf, ATHENA_BOUNDS, cell, ATHENA_DETAIL), H), mats.statue || mats.marble);
  const gold = new THREE.Mesh(toGeometry(bakeSdfDetailed(goldSdf, ATHENA_BOUNDS, cell, [ATHENA_DETAIL[0], ATHENA_DETAIL[4]]), H), mats.gold);
  const spear = new THREE.Mesh(spearGeometry(H), mats.gold);
  for (const m of [marble, gold, spear]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  const figure = new THREE.Group();
  figure.add(marble, gold, spear);

  const pedestal = createPedestal({ H, mats });
  const ph = pedestal.userData.height;
  figure.position.y = ph;
  group.add(pedestal, figure);
  group.userData = { height: H + ph, pedestalHeight: ph };
  return group;
}
