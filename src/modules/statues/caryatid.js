import * as THREE from 'three';
import { ellipsoid, capsule, cylinderY, boxSdf, smin } from './sdf.js';
import { face, hair, peplos, overfold } from './figure.js';
import { bakeSdfDetailed } from './bakeSdf.js';

const HEAD = [0, 0.905, 0.01];

function body(x, y, z) {
  let d = peplos(x, y, z, { r0: 0.13, top: 0.62, zs: 0.76 });
  d = smin(d, ellipsoid(x + 0.04, y - 0.3, z - 0.035, 0.055, 0.19, 0.06), 0.045);
  d = smin(d, overfold(x, y, z, 0.48, 0.74), 0.012);
  d = smin(d, ellipsoid(x, y - 0.67, z, 0.088, 0.12, 0.062), 0.03);
  for (const sx of [-1, 1]) d = smin(d, ellipsoid(x - sx * 0.04, y - 0.715, z - 0.048, 0.034, 0.028, 0.025), 0.02);
  d = smin(d, capsule(x, y, z, [-0.095, 0.78, 0], [0.095, 0.78, 0], 0.04), 0.03);
  d = smin(d, capsule(x, y, z, [0, 0.78, 0], [0, 0.875, 0.01], 0.027, 0.024), 0.02);
  const hx = x - HEAD[0], hy = y - HEAD[1], hz = z - HEAD[2];
  if (hx * hx + hy * hy + hz * hz < 0.03) d = smin(d, smin(face(hx, hy, hz), hair(hx, hy, hz), 0.006), 0.012);
  d = smin(d, capsule(x, y, z, [-0.105, 0.775, 0], [-0.13, 0.6, 0.01], 0.028, 0.023), 0.02);
  d = smin(d, capsule(x, y, z, [-0.13, 0.6, 0.01], [-0.12, 0.45, 0.04], 0.022, 0.017), 0.012);
  d = smin(d, ellipsoid(x + 0.118, y - 0.425, z - 0.045, 0.016, 0.026, 0.014), 0.01);
  d = smin(d, capsule(x, y, z, [0.105, 0.775, 0], [0.13, 0.62, 0.03], 0.028, 0.023), 0.02);
  d = smin(d, capsule(x, y, z, [0.13, 0.62, 0.03], [0.1, 0.56, 0.1], 0.022, 0.017), 0.012);
  d = smin(d, ellipsoid(x - 0.095, y - 0.55, z - 0.112, 0.016, 0.014, 0.022), 0.01);
  for (const sx of [-1, 1]) d = smin(d, ellipsoid(x - sx * 0.04, y - 0.012, z - 0.1, 0.021, 0.013, 0.032), 0.01);
  return d;
}

function caryatidSdf(x, y, z) {
  let d = body(x, y, z);
  d = smin(d, cylinderY(x, y - 0.985, z - 0.005, 0.05, 0.03), 0.01);
  d = Math.min(d, cylinderY(x, y - 1.025, z - 0.005, 0.058, 0.012));
  return Math.min(d, boxSdf(x, y - 1.05, z - 0.005, 0.075, 0.014, 0.075));
}

const BOUNDS = {
  caryatid: { min: [-0.19, -0.004, -0.13], max: [0.19, 1.07, 0.16] },
  kore: { min: [-0.19, -0.004, -0.13], max: [0.19, 0.99, 0.16] },
};
const DETAIL = [{ min: [-0.07, 0.83, -0.08], max: [0.07, 0.99, 0.09], factor: 2.5 }];
const cache = new Map();

export function figureGeometry(kind = 'caryatid', cell = 0.005) {
  const key = `${kind}:${cell}`;
  if (cache.has(key)) return cache.get(key);
  const sdf = kind === 'caryatid' ? caryatidSdf : body;
  const r = bakeSdfDetailed(sdf, BOUNDS[kind], cell, DETAIL);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(r.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(r.normals, 3));
  g.setAttribute('cavity', new THREE.BufferAttribute(r.cavity, 1));
  g.setIndex(new THREE.BufferAttribute(r.indices instanceof Array ? new Uint32Array(r.indices) : r.indices, 1));
  g.computeBoundingSphere();
  cache.set(key, g);
  return g;
}
