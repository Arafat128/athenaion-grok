import * as THREE from 'three';
import { prep, merge } from './geometry.js';

const tmp = new THREE.Object3D();

export function createBannerPoles(placements, { mats, bannerMat, height = 11, bannerW = 2.2, bannerH = 5.2 }) {
  const group = new THREE.Group();
  const poleGeo = merge([
    new THREE.CylinderGeometry(0.09, 0.13, height, 10).translate(0, height / 2, 0),
    new THREE.CylinderGeometry(0.35, 0.45, 0.5, 12).translate(0, 0.25, 0),
  ]);
  const goldGeo = merge([
    new THREE.CylinderGeometry(0.05, 0.05, bannerW + 0.6, 8).rotateZ(Math.PI / 2).translate(0, height - 0.6, 0),
    new THREE.SphereGeometry(0.2, 16, 10).translate(0, height + 0.15, 0),
    new THREE.ConeGeometry(0.12, 0.6, 8).translate(0, height + 0.6, 0),
    new THREE.SphereGeometry(0.1, 10, 8).translate(-(bannerW + 0.6) / 2, height - 0.6, 0),
    new THREE.SphereGeometry(0.1, 10, 8).translate((bannerW + 0.6) / 2, height - 0.6, 0),
  ]);
  const bannerGeo = new THREE.PlaneGeometry(bannerW, bannerH, 12, 24).translate(0, height - 0.65 - bannerH / 2, 0.12);
  const poles = new THREE.InstancedMesh(poleGeo, mats.bronze || mats.gold, placements.length);
  const golds = new THREE.InstancedMesh(goldGeo, mats.gold, placements.length);
  const banners = new THREE.InstancedMesh(bannerGeo, bannerMat, placements.length);
  placements.forEach((p, i) => {
    tmp.position.set(p.x, p.y, p.z);
    tmp.rotation.set(0, p.rot ?? 0, 0);
    tmp.scale.setScalar(p.scale ?? 1);
    tmp.updateMatrix();
    poles.setMatrixAt(i, tmp.matrix);
    golds.setMatrixAt(i, tmp.matrix);
    banners.setMatrixAt(i, tmp.matrix);
  });
  for (const m of [poles, golds, banners]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

export function createHangingBanners(placements, { bannerMat, width = 2.4, height = 7 }) {
  const geo = new THREE.PlaneGeometry(width, height, 10, 24).translate(0, -height / 2, 0);
  const m = new THREE.InstancedMesh(geo, bannerMat, placements.length);
  placements.forEach((p, i) => {
    tmp.position.set(p.x, p.y, p.z);
    tmp.rotation.set(0, p.rot ?? 0, 0);
    tmp.scale.setScalar(1);
    tmp.updateMatrix();
    m.setMatrixAt(i, tmp.matrix);
  });
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export { prep };
