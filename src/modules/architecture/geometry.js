import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function prep(geo, cavity = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('cavity')) {
    g.setAttribute('cavity', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(cavity), 1));
  }
  return g;
}

export function merge(list) {
  return mergeGeometries(list.map((g) => prep(g)), false);
}

export function box(w, h, d, x = 0, y = 0, z = 0, cavity = 0) {
  return prep(new THREE.BoxGeometry(w, h, d).translate(x, y, z), cavity);
}
