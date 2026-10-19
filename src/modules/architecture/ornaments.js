import * as THREE from 'three';
import { prep, merge, box } from './geometry.js';

function leafShape(len, wid) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(wid * 0.9, len * 0.25, wid * 0.7, len * 0.8, 0, len);
  s.bezierCurveTo(-wid * 0.7, len * 0.8, -wid * 0.9, len * 0.25, 0, 0);
  return s;
}

export function createPalmette({ height = 2, leaves = 9, depth = 0.12 } = {}) {
  const parts = [];
  const spread = 1.35;
  for (let i = 0; i < leaves; i++) {
    const t = leaves === 1 ? 0 : (i / (leaves - 1)) * 2 - 1;
    const len = height * (0.78 - 0.32 * t * t);
    const g = new THREE.ExtrudeGeometry(leafShape(len, height * 0.11), {
      depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: height * 0.02, bevelSegments: 2, curveSegments: 10,
    });
    g.translate(0, height * 0.12, -depth / 2);
    g.rotateZ(-t * spread * 0.62);
    g.translate(0, height * 0.18, 0);
    parts.push(g);
  }
  for (const side of [-1, 1]) {
    const v = new THREE.TorusGeometry(height * 0.1, height * 0.035, 8, 20, Math.PI * 1.5);
    v.rotateZ(side > 0 ? -Math.PI * 0.25 : Math.PI * 0.75 + Math.PI * 0.5 * 0);
    v.translate(side * height * 0.16, height * 0.12, 0);
    parts.push(v);
  }
  parts.push(box(height * 0.5, height * 0.08, depth * 2.2, 0, height * 0.04, 0));
  const g = merge(parts);
  g.computeVertexNormals();
  return g;
}

export function createUrn({ height = 1.6 } = {}) {
  const h = height;
  const pts = [
    [0, 0], [0.32, 0], [0.32, 0.06], [0.18, 0.1], [0.14, 0.2], [0.3, 0.35], [0.4, 0.5], [0.36, 0.65],
    [0.2, 0.78], [0.16, 0.86], [0.26, 0.9], [0.26, 0.95], [0.08, 0.97], [0.1, 1.06], [0, 1.1],
  ].map(([r, y]) => new THREE.Vector2(r * h * 0.6, y * h));
  return prep(new THREE.LatheGeometry(pts, 32));
}

export function createShield(radius = 0.5) {
  const g = new THREE.SphereGeometry(radius * 2.2, 32, 6, 0, Math.PI * 2, 0, Math.asin(1 / 2.2));
  g.translate(0, -radius * 2.2 * Math.cos(Math.asin(1 / 2.2)), 0);
  const rim = new THREE.TorusGeometry(radius, radius * 0.07, 6, 32).rotateX(Math.PI / 2);
  const boss = new THREE.SphereGeometry(radius * 0.18, 16, 8).scale(1, 0.6, 1).translate(0, radius * 0.22, 0);
  return merge([g, rim, boss]).rotateX(Math.PI / 2);
}

export function createTriglyph(w, h, d) {
  const parts = [box(w, h, d * 0.4, 0, 0, d * 0.2, 0.3)];
  for (const x of [-0.33, 0, 0.33]) parts.push(box(w * 0.22, h * 0.9, d, x * w, -h * 0.05, d * 0.5));
  parts.push(box(w * 1.05, h * 0.1, d * 1.1, 0, h * 0.45, d * 0.55));
  return merge(parts);
}
