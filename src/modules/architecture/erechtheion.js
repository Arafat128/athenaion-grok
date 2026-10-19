import * as THREE from 'three';
import { buildTemple } from './temple.js';
import { figureGeometry } from '../statues/caryatid.js';
import { box, merge } from './geometry.js';

const tmp = new THREE.Object3D();

export function createErechtheion({ mats, cell, pedimentFigure }) {
  const group = new THREE.Group();
  const temple = buildTemple({ colsX: 6, colsZ: 4, colH: 6.4, radius: 0.5, spacing: 2.7, steps: 3, stepH: 0.4, stepD: 0.5, cella: true, pronaos: false, mats, pedimentFigure });
  group.add(temple);
  const pz = temple.userData.width / 2 + 2.4;
  const podH = 2.2, cH = 3.4;
  const porch = new THREE.Mesh(merge([
    box(10.5, podH, 6.2, 3.5, podH / 2, pz),
    box(11, 0.3, 6.6, 3.5, podH + 0.15, pz),
    box(10.6, 0.7, 6.0, 3.5, podH + 0.3 + cH * 1.07 + 0.35, pz),
    box(11.2, 0.35, 6.6, 3.5, podH + 0.3 + cH * 1.07 + 0.85, pz),
  ]), mats.marble);
  porch.castShadow = porch.receiveShadow = true;
  group.add(porch);
  const band = new THREE.Mesh(box(10.65, 0.18, 6.05, 3.5, podH + 0.3 + cH * 1.07 + 0.1, pz), mats.gold);
  group.add(band);
  const geo = figureGeometry('caryatid', cell);
  const spots = [[-0.6, 1.9], [2.4, 1.9], [4.6, 1.9], [7.6, 1.9], [-0.6, -0.6], [7.6, -0.6]];
  const cars = new THREE.InstancedMesh(geo, mats.statue, spots.length);
  spots.forEach(([x, z], i) => {
    tmp.position.set(x, podH + 0.3, pz + z);
    tmp.rotation.set(0, 0, 0);
    tmp.rotation.y = (i % 2 ? -1 : 1) * 0.06;
    tmp.scale.setScalar(cH);
    tmp.updateMatrix();
    cars.setMatrixAt(i, tmp.matrix);
  });
  cars.castShadow = cars.receiveShadow = true;
  group.add(cars);
  group.userData = { temple };
  return group;
}
