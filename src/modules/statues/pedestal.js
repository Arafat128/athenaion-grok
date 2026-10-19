import * as THREE from 'three';
import { box, merge, prep } from '../architecture/geometry.js';

const GLYPHS = {
  A: [[0, 0, 0.3, 1], [0.3, 1, 0.6, 0], [0.13, 0.38, 0.47, 0.38]],
  H: [[0, 0, 0, 1], [0.6, 0, 0.6, 1], [0, 0.5, 0.6, 0.5]],
  N: [[0, 0, 0, 1], [0, 1, 0.6, 0], [0.6, 0, 0.6, 1]],
  E: [[0, 0, 0, 1], [0, 1, 0.55, 1], [0, 0.5, 0.45, 0.5], [0, 0, 0.55, 0]],
  I: [[0.1, 0, 0.1, 1]],
  K: [[0, 0, 0, 1], [0, 0.5, 0.55, 1], [0, 0.5, 0.55, 0]],
  Theta: 'ring',
};

function stroke(x0, y0, x1, y1, t, depth) {
  const len = Math.hypot(x1 - x0, y1 - y0) + t;
  const g = new THREE.BoxGeometry(len, t, depth);
  g.rotateZ(Math.atan2(y1 - y0, x1 - x0));
  return g.translate((x0 + x1) / 2, (y0 + y1) / 2, depth / 2);
}

export function inscription(text, { size = 1, depth = 0.05, weight = 0.12 } = {}) {
  const parts = [];
  let cx = 0;
  for (const ch of text) {
    const key = ch === 'Θ' ? 'Theta' : ch === 'Α' ? 'A' : ch === 'Η' ? 'H' : ch === 'Ν' ? 'N' : ch === 'Ε' ? 'E' : ch === 'Ι' ? 'I' : ch === 'Κ' ? 'K' : ch;
    const g = GLYPHS[key];
    if (g === 'ring') {
      const ring = new THREE.TorusGeometry(0.47, weight * 0.5, 6, 28).scale(0.66, 1, depth / weight);
      parts.push(ring.translate(cx + 0.31, 0.5, depth / 2).scale(size, size, 1));
      parts.push(stroke(cx + 0.16, 0.5, cx + 0.46, 0.5, weight, depth).scale(size, size, 1));
      cx += 0.95;
      continue;
    }
    if (g) for (const [a, b, c, d] of g) parts.push(stroke(cx + a, b, cx + c, d, weight, depth).scale(size, size, 1));
    cx += g ? 0.95 : 0.6;
  }
  const geo = merge(parts);
  geo.translate((-cx + 0.35) * size / 2, 0, 0);
  return geo;
}

export function meander(length, height, { depth = 0.04 } = {}) {
  const u = height / 5;
  const t = u * 0.55;
  const parts = [stroke(0, 0, length, 0, t, depth), stroke(0, height, length, height, t, depth)];
  const unit = 5 * u;
  const n = Math.floor(length / unit);
  const off = (length - n * unit) / 2;
  const path = [[0, 0.8], [0, 4], [3.5, 4], [3.5, 1.5], [1.5, 1.5], [1.5, 2.8], [2.5, 2.8]];
  for (let i = 0; i < n; i++) {
    const x0 = off + i * unit;
    for (let k = 0; k < path.length - 1; k++) {
      const [ax, ay] = path[k], [bx, by] = path[k + 1];
      parts.push(stroke(x0 + ax * u, ay * u, x0 + bx * u, by * u, t, depth));
    }
  }
  return merge(parts).translate(-length / 2, -height / 2, 0);
}

export function createPedestal({ H, mats, label = 'ΑΘΗΝΑ', ph = H * 0.26, pw = H * 0.42 }) {
  const group = new THREE.Group();
  const stone = merge([
    box(pw * 1.3, ph * 0.12, pw * 1.3, 0, ph * 0.06),
    box(pw * 1.15, ph * 0.1, pw * 1.15, 0, ph * 0.17),
    box(pw * 1.06, ph * 0.04, pw * 1.06, 0, ph * 0.24),
    box(pw, ph * 0.58, pw, 0, ph * 0.53),
    box(pw * 1.06, ph * 0.04, pw * 1.06, 0, ph * 0.84),
    box(pw * 1.1, ph * 0.06, pw * 1.1, 0, ph * 0.89),
    box(pw * 1.16, ph * 0.08, pw * 1.16, 0, ph * 0.96),
  ]);
  const ped = new THREE.Mesh(stone, mats.marble);
  ped.castShadow = ped.receiveShadow = true;
  const gold = [];
  const band = meander(pw * 0.94, ph * 0.075, { depth: ph * 0.012 });
  const text = inscription(label, { size: ph * 0.16, depth: ph * 0.014, weight: 0.13 });
  for (let k = 0; k < 4; k++) {
    const rot = new THREE.Matrix4().makeRotationY((k * Math.PI) / 2);
    gold.push(band.clone().translate(0, ph * 0.745, pw / 2).applyMatrix4(rot));
    if (k === 0) gold.push(text.clone().translate(0, ph * 0.42, pw / 2).applyMatrix4(rot));
  }
  const lettering = new THREE.Mesh(merge(gold), mats.gold);
  lettering.castShadow = true;
  group.add(ped, lettering);
  group.userData.height = ph;
  return group;
}
