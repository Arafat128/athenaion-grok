import * as THREE from 'three';
import { box, merge, prep } from './geometry.js';
import { createDoricColumn } from './column.js';

const tmp = new THREE.Object3D();

export function createStoa({ length = 90, depth = 12, colH = 6.2, radius = 0.5, spacing = 3.2, mats }) {
  const g = new THREE.Group();
  const col = createDoricColumn({ height: colH, radius });
  const H = col.userData.totalHeight;
  const n = Math.floor(length / spacing);
  const L = n * spacing;
  const front = depth / 2 - 1.2;
  const pos = [];
  for (let i = 0; i <= n; i++) pos.push([-L / 2 + i * spacing, front]);
  for (let i = 0; i <= n; i += 2) pos.push([-L / 2 + i * spacing, 0]);
  const cols = new THREE.InstancedMesh(col, mats.marble, pos.length);
  pos.forEach(([x, z], i) => {
    tmp.position.set(x, 1.2, z);
    tmp.scale.setScalar(z === 0 ? 1.06 : 1);
    tmp.updateMatrix();
    cols.setMatrixAt(i, tmp.matrix);
  });
  cols.castShadow = cols.receiveShadow = true;
  const Y = 1.2 + H;
  const pitch = 0.22;
  const roofW = depth + 1.6;
  const roof = new THREE.BoxGeometry(L + 3, 0.4, roofW / Math.cos(pitch));
  roof.rotateX(pitch).translate(0, Y + 1.4 + Math.tan(pitch) * roofW * 0.5 * 0, 0);
  const body = merge([
    box(L + 4, 0.4, depth + 2, 0, 0.2),
    box(L + 3, 0.4, depth + 1, 0, 0.6),
    box(L + 2, 0.4, depth, 0, 1.0),
    box(L + 1.4, H + 1.2, 1.0, 0, (H + 1.2) / 2, -depth / 2 + 0.5),
    box(1.0, H + 1.2, depth, -L / 2 - 0.2, (H + 1.2) / 2, 0),
    box(1.0, H + 1.2, depth, L / 2 + 0.2, (H + 1.2) / 2, 0),
    box(L + 1.4, 0.9, depth, 0, Y + 0.45, 0),
  ]);
  const b = new THREE.Mesh(body, mats.marble);
  b.castShadow = b.receiveShadow = true;
  const frieze = new THREE.Mesh(box(L + 1.5, 0.45, 0.2, 0, Y + 0.55, depth / 2 + 0.02), mats.navy);
  const gold = new THREE.Mesh(box(L + 1.6, 0.1, 0.25, 0, Y + 0.25, depth / 2 + 0.05), mats.gold);
  const r = new THREE.Mesh(prep(roof), mats.tile);
  r.position.y = 0.2;
  r.castShadow = true;
  g.add(b, cols, frieze, gold, r);
  g.userData = { length: L, depth, top: Y + 1 };
  return g;
}
