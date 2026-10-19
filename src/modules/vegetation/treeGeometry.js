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

function blob(n, r, detail, cx, cy, cz, sy, amp, freq, color) {
  let s = new THREE.IcosahedronGeometry(r, detail);
  s.deleteAttribute('uv');
  s.deleteAttribute('normal');
  s = mergeVertices(s, 1e-4);
  const p = s.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = 1 + amp * n.noise3(x * freq + cx * 3.1, y * freq + cy, z * freq + cz * 2.3) + amp * 0.5 * n.noise3(x * freq * 2.7, y * freq * 2.7 + cy, z * freq * 2.7);
    p.setXYZ(i, x * d + cx, y * d * sy + cy, z * d + cz);
  }
  s.computeVertexNormals();
  colorize(s, color);
  return clean(s);
}

// Italian cypress built from many overlapping foliage clumps around a dark core:
// a ragged, layered silhouette instead of a smooth spindle.
export function createCypressClumpGeometry(seed = 5, detail = 1) {
  const n = createNoise(seed);
  const H = 14, trunkH = 1.6;
  const prof = (t) => 1.45 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - 0.25 * t) + 0.05;
  const parts = [];
  const core = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    core.push(new THREE.Vector2(i === 14 ? 0.001 : prof(t) * 0.72, trunkH * 0.7 + t * (H - trunkH * 0.7 - 0.4)));
  }
  parts.push(colorize(clean(new THREE.LatheGeometry(core, 10)), (c, x, y) => c.setRGB(0.02, 0.035 + 0.02 * (y / H), 0.018)));
  const clumps = Math.round(70 * detail);
  for (let i = 0; i < clumps; i++) {
    const t = Math.pow((i + 0.5) / clumps, 0.85) * 0.95 + 0.02;
    const a = i * 2.39996 + n.noise2(i, 3.3) * 0.8;
    const R = prof(t);
    const rr = R * (0.5 + 0.3 * Math.abs(n.noise2(i, 8.1)));
    const y = trunkH * 0.7 + t * (H - trunkH * 0.7 - 0.5);
    const size = Math.max(0.28, R * (0.42 + 0.12 * n.noise2(i, 5.5)));
    const tone = 0.8 + 0.4 * Math.abs(n.noise2(i, 12.7));
    parts.push(blob(n, size, 1, Math.cos(a) * rr, y, Math.sin(a) * rr, 2.1, 0.5, 2.6, (c, px, py, pz) => {
      const tt = py / H, rad = Math.hypot(px, pz);
      c.setRGB((0.03 + 0.028 * tt + 0.012 * rad) * tone, (0.052 + 0.048 * tt + 0.02 * rad) * tone, (0.024 + 0.012 * tt) * tone);
    }));
  }
  const trunk = colorize(new THREE.CylinderGeometry(0.15, 0.27, trunkH * 1.4, 7).translate(0, trunkH * 0.7, 0), (c) => c.setRGB(0.12, 0.08, 0.05));
  parts.push(clean(trunk));
  return mergeGeometries(parts);
}

// Variable-radius tube along a curve (TubeGeometry has a constant radius).
function gnarledTube(n, curve, seg, radial, r0, r1, seed, color) {
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const p = g.getAttribute('position');
  const ring = radial + 1;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const c = curve.getPointAt(t);
    for (let j = 0; j < ring; j++) {
      const k = i * ring + j;
      const dx = p.getX(k) - c.x, dy = p.getY(k) - c.y, dz = p.getZ(k) - c.z;
      const a = (j / radial) * Math.PI * 2;
      const fl = 1 + 0.28 * Math.sin(a * 3 + t * 9 + seed) + 0.22 * n.noise2(t * 6 + seed, a);
      const r = (r0 + (r1 - r0) * Math.pow(t, 0.7)) * fl;
      p.setXYZ(k, c.x + dx * r, c.y + dy * r, c.z + dz * r);
    }
  }
  g.computeVertexNormals();
  return colorize(clean(g), color);
}

// Olive: a split, twisted, hollowed-looking trunk with fluted bark and silvery clustered crown.
export function createGnarledOliveGeometry(seed = 9) {
  const n = createNoise(seed);
  const parts = [];
  const bark = (c, x, y, z) => { const v = 0.5 + 0.5 * n.noise3(x * 4, y * 9, z * 4); c.setRGB(0.13 + 0.09 * v, 0.11 + 0.07 * v, 0.085 + 0.05 * v); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const stems = [
    [V(0.15, -0.4, 0), V(0.4, 0.6, 0.2), V(0.1, 1.4, 0.35), V(0.6, 2.3, 0.5), V(1.1, 3.0, 0.6)],
    [V(-0.15, -0.4, 0.05), V(-0.45, 0.7, -0.1), V(-0.2, 1.6, -0.35), V(-0.7, 2.4, -0.4), V(-1.2, 3.2, -0.2)],
    [V(0, -0.4, -0.15), V(0.1, 0.9, -0.4), V(0.3, 1.9, -0.6), V(0.1, 2.8, -1.1), V(0.3, 3.5, -1.4)],
  ];
  stems.forEach((pts, i) => parts.push(gnarledTube(n, new THREE.CatmullRomCurve3(pts), 16, 9, 0.32, 0.1, i * 3.7, bark)));
  const tips = [[1.1, 3.0, 0.6], [-1.2, 3.2, -0.2], [0.3, 3.5, -1.4]];
  const crown = [];
  for (const [tx, ty, tz] of tips) {
    for (let b = 0; b < 3; b++) {
      const a = b * 2.1 + tx;
      const e = V(tx + Math.cos(a) * 1.1, ty + 0.6 + b * 0.25, tz + Math.sin(a) * 1.1);
      parts.push(gnarledTube(n, new THREE.CatmullRomCurve3([V(tx, ty, tz), V((tx + e.x) / 2, ty + 0.5, (tz + e.z) / 2), e]), 6, 5, 0.1, 0.035, a, bark));
      crown.push(e);
    }
  }
  crown.push(V(0, 4.3, 0), V(0.4, 4.6, -0.5));
  crown.forEach((e, i) => {
    const r = 0.95 + 0.4 * Math.abs(n.noise2(i, 2.2));
    parts.push(blob(n, r, 2, e.x, e.y + 0.3, e.z, 0.62, 0.42, 1.6, (c, px, py, pz) => {
      const under = Math.max(0, Math.min(1, (e.y + 0.3 - py) / r + 0.3));
      c.setRGB(0.2 + 0.1 * under, 0.23 + 0.08 * under, 0.15 + 0.08 * under);
    }));
  });
  return mergeGeometries(parts);
}

// A small clump of wildflowers: stems plus crossed petal cards, colored per vertex.
export function createFlowerGeometry(seed = 23, petal = [0.8, 0.1, 0.06], heads = 6) {
  const n = createNoise(seed);
  const pos = [], colr = [];
  const green = [0.06, 0.1, 0.03];
  for (let i = 0; i < heads; i++) {
    const a = i * 2.4 + n.noise2(i, 1.1), r = 0.08 + 0.22 * Math.abs(n.noise2(i, 4.4));
    const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.3 + 0.25 * Math.abs(n.noise2(i, 6.6) + 0.4);
    const lean = 0.05 * n.noise2(i, 9.9);
    pos.push(x - 0.01, 0, z, x + 0.01, 0, z, x + lean, h, z);
    colr.push(...green, ...green, ...green);
    const s = 0.055 + 0.03 * Math.abs(n.noise2(i, 2.2));
    for (let k = 0; k < 5; k++) {
      const pa = (k / 5) * Math.PI * 2 + a;
      const pa2 = pa + Math.PI / 5;
      const cx = x + lean, cy = h;
      pos.push(cx, cy + 0.01, z, cx + Math.cos(pa) * s, cy + 0.02, z + Math.sin(pa) * s, cx + Math.cos(pa2) * s, cy + 0.025, z + Math.sin(pa2) * s);
      colr.push(petal[0] * 0.6 + 0.12, petal[1] * 0.6 + 0.08, petal[2] * 0.6 + 0.02, ...petal, ...petal);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  g.computeVertexNormals();
  const nrm = g.getAttribute('normal');
  for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, nrm.getX(i) * 0.2, 1, nrm.getZ(i) * 0.2);
  g.normalizeNormals();
  return g;
}
