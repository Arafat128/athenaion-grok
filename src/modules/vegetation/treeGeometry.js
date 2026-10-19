import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createNoise } from '../utils/noise.js';

function colorize(geo, fn) {
  const p = geo.getAttribute('position');
  const c = new Float32Array(p.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    fn(col, p.getX(i), p.getY(i), p.getZ(i));
    c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function clean(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  return g;
}

export function createCypressGeometry(seed = 5, detail = 1) {
  const n = createNoise(seed);
  const H = 14, trunkH = 1.6;
  const pts = [];
  const rings = Math.round(26 * detail);
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const r = 1.55 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - 0.25 * t) + 0.02;
    pts.push(new THREE.Vector2(i === rings ? 0.001 : r, trunkH * 0.6 + t * (H - trunkH * 0.6)));
  }
  let crown = new THREE.LatheGeometry(pts, Math.round(16 * detail));
  crown.deleteAttribute('uv');
  crown.deleteAttribute('normal');
  crown = mergeVertices(crown, 1e-3);
  const p = crown.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const d = 1 + 0.3 * n.fbm3(Math.cos(a) * 1.3, y * 0.55, Math.sin(a) * 1.3, 3) + 0.22 * Math.abs(n.noise3(Math.cos(a) * 3, y * 1.4, Math.sin(a) * 3));
    p.setXYZ(i, x * d, y, z * d);
  }
  crown.computeVertexNormals();
  colorize(crown, (c, x, y, z) => {
    const t = (y - trunkH) / H;
    const r = Math.hypot(x, z);
    c.setRGB(0.03 + 0.025 * t, 0.05 + 0.04 * t + 0.015 * r, 0.025 + 0.01 * t);
  });
  const trunk = colorize(new THREE.CylinderGeometry(0.16, 0.26, trunkH * 1.4, 7).translate(0, trunkH * 0.7, 0), (c) => c.setRGB(0.12, 0.08, 0.05));
  return mergeGeometries([clean(crown), clean(trunk)]);
}

export function createOliveGeometry(seed = 9) {
  const n = createNoise(seed);
  const parts = [];
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0.25, 1.0, 0.1), new THREE.Vector3(-0.1, 2.0, -0.15), new THREE.Vector3(0.2, 2.8, 0.05),
  ]);
  const bark = (c, x, y) => c.setRGB(0.16 + 0.04 * Math.sin(y * 9), 0.13, 0.1);
  parts.push(colorize(new THREE.TubeGeometry(trunkCurve, 10, 0.32, 7, false), bark));
  const branchEnds = [[1.6, 3.6, 0.6], [-1.5, 3.4, 0.5], [0.2, 4.0, -1.4], [0.1, 4.2, 1.2]];
  for (const e of branchEnds) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 2.6, 0.05), new THREE.Vector3(e[0] * 0.5, e[1] * 0.85, e[2] * 0.5), new THREE.Vector3(...e)]);
    parts.push(colorize(new THREE.TubeGeometry(c, 6, 0.13, 5, false), bark));
  }
  const blobs = [[0, 4.3, 0, 2.3], [1.7, 3.9, 0.7, 1.6], [-1.6, 3.7, 0.5, 1.6], [0.3, 4.2, -1.6, 1.5], [0.1, 4.6, 1.4, 1.4], [-0.9, 4.9, -0.6, 1.3]];
  for (const [x, y, z, r] of blobs) {
    let s = new THREE.IcosahedronGeometry(r, 3);
    s.deleteAttribute('uv');
    s.deleteAttribute('normal');
    s = mergeVertices(s, 1e-4);
    const p = s.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      const d = 1 + 0.35 * n.noise3(px * 1.2 + x, py * 1.2 + y, pz * 1.2 + z);
      p.setXYZ(i, px * d + x, py * d * 0.7 + y, pz * d + z);
    }
    s.computeVertexNormals();
    colorize(s, (c, px, py) => {
      const t = (py - 3) / 3;
      c.setRGB(0.17 + 0.07 * t, 0.21 + 0.07 * t, 0.14 + 0.05 * t);
    });
    parts.push(clean(s));
  }
  return mergeGeometries(parts.map(clean));
}

export function createShrubGeometry(seed = 13) {
  const n = createNoise(seed);
  let s = new THREE.IcosahedronGeometry(1, 2);
  s.deleteAttribute('uv');
  s.deleteAttribute('normal');
  s = mergeVertices(s, 1e-4);
  const p = s.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = 1 + 0.4 * n.noise3(x * 1.8, y * 1.8, z * 1.8);
    p.setXYZ(i, x * d * 1.2, Math.max(y * d * 0.75, -0.2) + 0.45, z * d * 1.2);
  }
  s.computeVertexNormals();
  colorize(s, (c, x, y) => c.setRGB(0.07 + 0.04 * y, 0.09 + 0.05 * y, 0.04));
  return clean(s);
}

export function createGrassTuftGeometry(seed = 17, blades = 18) {
  const n = createNoise(seed);
  const pos = [], colr = [];
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + n.noise2(b, 1.3) * 2;
    const r = 0.15 + 0.25 * Math.abs(n.noise2(b, 7.1));
    const h = 0.45 + 0.5 * Math.abs(n.noise2(b, 3.7) + 0.5);
    const lean = 0.25 + 0.2 * n.noise2(b, 9.2);
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const px = -Math.sin(a) * 0.025, pz = Math.cos(a) * 0.025;
    const tx = bx + Math.cos(a) * lean, tz = bz + Math.sin(a) * lean;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, tx, h, tz);
    colr.push(0.08, 0.09, 0.035, 0.08, 0.09, 0.035, 0.36, 0.31, 0.14);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.computeVertexNormals();
  const nrm = g.getAttribute('normal');
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, nrm.getX(i) * 0.3, 1, nrm.getZ(i) * 0.3);
  g.normalizeNormals();
  return g;
}
