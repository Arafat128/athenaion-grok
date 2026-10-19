import * as THREE from 'three';
import { box, merge, prep } from './geometry.js';
import { createDoricColumn } from './column.js';

// Angular strip of quads; theta follows CylinderGeometry convention (x = sin, z = cos).
function strip(a0, len, seg, pa, pb) {
  const pos = [], idx = [];
  for (let k = 0; k <= seg; k++) {
    const t = a0 + (len * k) / seg, sx = Math.sin(t), cz = Math.cos(t);
    pos.push(pa[0] * sx, pa[1], pa[0] * cz, pb[0] * sx, pb[1], pb[0] * cz);
    if (k < seg) { const b = k * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function fix(g, flip) {
  if (flip) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } }
  g.computeVertexNormals();
  const n = g.attributes.position.count, uv = new Float32Array(n * 2), p = g.attributes.position.array;
  for (let i = 0; i < n; i++) { uv[i * 2] = (p[i * 3] + p[i * 3 + 1]) * 0.25; uv[i * 2 + 1] = (p[i * 3 + 2] + p[i * 3 + 1]) * 0.25; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export function createTheatre(T, { mats }) {
  const group = new THREE.Group();
  const seats = [];
  const run = 0.85;
  const a0 = Math.PI - T.span, len = T.span * 2;
  const n = Math.floor((T.r1 - T.r0 - 1) / run);
  const dia = Math.floor(n * 0.55);
  let prev = T.y + 0.45, rIn = T.r0 + 1;
  for (let i = 0; i <= n; i++) {
    const rOut = rIn + run;
    const top = T.y + (rOut - T.r0) * T.slope + (i === dia ? 0.6 : 0);
    const seg = Math.max(24, Math.round(rOut * 1.6));
    seats.push(fix(strip(a0, len, seg, [rIn, prev], [rIn, top]), false));
    seats.push(fix(strip(a0, len, seg, [rIn, top], [rOut, top]), false));
    prev = top; rIn = rOut;
  }
  seats.push(fix(strip(a0, len, 80, [rIn, prev], [rIn, T.y - 4]), false));
  seats.push(fix(strip(a0, len, 30, [T.r0 + 1, T.y + 0.45], [T.r0 + 1, T.y - 2]), true));
  for (const a of [a0, a0 + len]) {
    const sh = new THREE.Shape([new THREE.Vector2(T.r0 + 1, T.y - 3), new THREE.Vector2(rIn, T.y - 3), new THREE.Vector2(rIn, prev), new THREE.Vector2(T.r0 + 1, T.y + 0.45)]);
    const g = new THREE.ShapeGeometry(sh);
    g.rotateY(a - Math.PI / 2);
    seats.push(fix(g, a !== a0));
  }
  const cavea = new THREE.Mesh(merge(seats), mats.paving);
  cavea.castShadow = cavea.receiveShadow = true;
  group.add(cavea);

  const aisles = [];
  const k = 8;
  for (let i = 0; i <= k; i++) {
    const a = a0 + (len * i) / k;
    const L = T.r1 - T.r0;
    const g = new THREE.BoxGeometry(1.1, 0.5, L);
    g.rotateX(Math.atan(T.slope));
    g.translate(0, T.y + L * T.slope * 0.5 + 0.35, -(T.r0 + L / 2));
    g.rotateY(a - Math.PI);
    aisles.push(prep(g, 0.4));
  }
  const aisleMesh = new THREE.Mesh(merge(aisles), mats.ashlar);
  aisleMesh.receiveShadow = true;
  group.add(aisleMesh);

  const orchestra = new THREE.Mesh(prep(new THREE.CylinderGeometry(T.r0 + 0.5, T.r0 + 0.5, 0.5, 64).translate(0, T.y + 0.05, 0)), mats.paving);
  orchestra.receiveShadow = true;
  group.add(orchestra);
  const altar = new THREE.Mesh(merge([box(1.6, 1.0, 1.6, 0, T.y + 0.8, 0), box(2.0, 0.25, 2.0, 0, T.y + 1.4, 0)]), mats.marble);
  altar.castShadow = true;
  group.add(altar);

  const skene = [
    box(46, 7.5, 7, 0, T.y + 3.5, T.r0 + 13),
    box(48, 0.6, 8, 0, T.y + 7.5, T.r0 + 13),
    box(40, 2.4, 4.5, 0, T.y + 1.2, T.r0 + 7.6),
    box(6, 9, 8, -25, T.y + 4.5, T.r0 + 13),
    box(6, 9, 8, 25, T.y + 4.5, T.r0 + 13),
  ];
  const sk = new THREE.Mesh(merge(skene), mats.marble);
  sk.castShadow = sk.receiveShadow = true;
  group.add(sk);
  const col = createDoricColumn({ height: 4.6, radius: 0.36 });
  const cols = new THREE.InstancedMesh(col, mats.marble, 11);
  const tmp = new THREE.Object3D();
  for (let i = 0; i < 11; i++) {
    tmp.position.set(-18 + i * 3.6, T.y + 2.4, T.r0 + 5.7);
    tmp.updateMatrix();
    cols.setMatrixAt(i, tmp.matrix);
  }
  cols.castShadow = true;
  group.add(cols);
  const doors = new THREE.Mesh(merge([-9, 0, 9].map((x) => box(2.6, 4.2, 0.3, x, T.y + 2.1, T.r0 + 9.4))), mats.navy);
  group.add(doors);

  group.position.set(T.x, 0, T.z);
  group.userData.clearing = { x: T.x, z: T.z, r: T.r1 + 12 };
  return group;
}
