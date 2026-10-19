import * as THREE from 'three';
import { createDoricColumn } from './column.js';
import { box, merge, prep } from './geometry.js';
import { createPalmette, createUrn, createShield, createTriglyph } from './ornaments.js';

const tmp = new THREE.Object3D();

function instanced(geo, mat, transforms) {
  const m = new THREE.InstancedMesh(geo, mat, transforms.length);
  transforms.forEach((t, i) => {
    tmp.position.set(t[0], t[1], t[2]);
    tmp.rotation.set(0, t[3] || 0, 0);
    tmp.scale.setScalar(t[4] || 1);
    tmp.updateMatrix();
    m.setMatrixAt(i, tmp.matrix);
  });
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildTemple({
  colsX = 17, colsZ = 8, colH = 10.4, radius = 0.95, spacing = 4.3, steps = 3, stepH = 0.55, stepD = 0.75,
  pitch = THREE.MathUtils.degToRad(14), cella = true, pronaos = true, mats,
}) {
  const g = new THREE.Group();
  const colGeo = createDoricColumn({ height: colH, radius });
  const colTotal = colGeo.userData.totalHeight;
  const abW = colGeo.userData.abacusWidth;
  const Lx = (colsX - 1) * spacing, Lz = (colsZ - 1) * spacing;
  const topX = Lx + abW + 1.0, topZ = Lz + abW + 1.0;

  const stepGeos = [];
  for (let i = 0; i < steps; i++) {
    const k = steps - 1 - i;
    stepGeos.push(box(topX + k * 2 * stepD, stepH, topZ + k * 2 * stepD, 0, i * stepH + stepH / 2, 0));
  }
  const Y0 = steps * stepH;
  g.add(mesh(merge([...stepGeos, box(topX + steps * 2 * stepD + 2, 4, topZ + steps * 2 * stepD + 2, 0, -2, 0)]), mats.marble));

  const cols = [];
  for (let i = 0; i < colsX; i++) {
    for (let j = 0; j < colsZ; j++) {
      if (i > 0 && i < colsX - 1 && j > 0 && j < colsZ - 1) continue;
      cols.push([-Lx / 2 + i * spacing, Y0, -Lz / 2 + j * spacing]);
    }
  }
  if (pronaos && colsZ >= 6) {
    for (const sx of [-1, 1]) {
      for (let j = 1; j < colsZ - 1; j++) cols.push([sx * (Lx / 2 - spacing * 1.0), Y0 + 0.3, -Lz / 2 + j * spacing, 0, 0.88]);
    }
  }
  g.add(instanced(colGeo, mats.marble, cols));

  const Y1 = Y0 + colTotal;
  const hA = colH * 0.13, hF = colH * 0.125, hG = colH * 0.06;
  const aX = Lx + abW, aZ = Lz + abW;
  const Y2 = Y1 + hA + hF;
  const over = 0.75;
  const gX = aX + over * 2, gZ = aZ + over * 2;
  const entab = [
    box(aX, hA, aZ, 0, Y1 + hA / 2, 0),
    box(aX + 0.12, hA * 0.12, aZ + 0.12, 0, Y1 + hA - hA * 0.06, 0),
    box(aX - 0.25, hF, aZ - 0.25, 0, Y1 + hA + hF / 2, 0),
    box(gX, hG, gZ, 0, Y2 + hG / 2, 0),
    box(gX - 0.3, hG * 0.4, gZ - 0.3, 0, Y2 - hG * 0.2 + 0.05, 0),
  ];
  g.add(mesh(merge(entab), mats.marble));
  g.add(mesh(merge([box(aX - 0.1, 0.14, aZ - 0.1, 0, Y2 - 0.02, 0), box(gX + 0.06, 0.1, gZ + 0.06, 0, Y2 + hG + 0.05, 0)]), mats.gold));

  const tw = radius * 0.86;
  const tri = createTriglyph(tw, hF * 0.98, 0.16);
  const trigs = [];
  const half = spacing / 2;
  const nX = (colsX - 1) * 2, nZ = (colsZ - 1) * 2;
  const fx = (aX - 0.25) / 2, fz = (aZ - 0.25) / 2;
  const ty = Y1 + hA + hF / 2;
  for (let i = 0; i <= nX; i++) {
    const x = -Lx / 2 + i * half;
    trigs.push([x, ty, fz, 0], [x, ty, -fz, Math.PI]);
  }
  for (let j = 0; j <= nZ; j++) {
    const z = -Lz / 2 + j * half;
    trigs.push([fx, ty, z, Math.PI / 2], [-fx, ty, z, -Math.PI / 2]);
  }
  g.add(instanced(tri, mats.navy, trigs));

  const shield = createShield(hA * 0.33);
  const shields = [];
  for (let i = 0; i < colsX - 1; i++) {
    const x = -Lx / 2 + (i + 0.5) * spacing;
    shields.push([x, Y1 + hA * 0.5, aZ / 2 + 0.02, 0], [x, Y1 + hA * 0.5, -aZ / 2 - 0.02, Math.PI]);
  }
  for (let j = 0; j < colsZ - 1; j++) {
    const z = -Lz / 2 + (j + 0.5) * spacing;
    shields.push([aX / 2 + 0.02, Y1 + hA * 0.5, z, Math.PI / 2], [-aX / 2 - 0.02, Y1 + hA * 0.5, z, -Math.PI / 2]);
  }
  g.add(instanced(shield, mats.gold, shields));

  const Y3 = Y2 + hG;
  const W = gZ;
  const Hp = (W / 2) * Math.tan(pitch);
  const tymp = new THREE.Shape();
  tymp.moveTo(-W / 2 + 1.2, 0);
  tymp.lineTo(W / 2 - 1.2, 0);
  tymp.lineTo(0, Hp - 0.5);
  tymp.closePath();
  const tympGeo = new THREE.ExtrudeGeometry(tymp, { depth: 0.8, bevelEnabled: false });
  const ped = [];
  const Ls = W / 2 / Math.cos(pitch) + 0.3;
  for (const sx of [-1, 1]) {
    const t = prep(tympGeo.clone(), 0.35);
    t.rotateY(Math.PI / 2);
    t.translate(sx * (gX / 2 - 0.6) - 0.4, Y3, 0);
    ped.push(t);
    for (const sz of [-1, 1]) {
      const rc = new THREE.BoxGeometry(1.4, hG * 1.1, Ls);
      rc.rotateX(sz * pitch);
      rc.translate(sx * (gX / 2 - 0.55), Y3 + Hp / 2 + hG * 0.45, (sz * W) / 4);
      ped.push(prep(rc));
    }
  }
  const roofLen = gX + 0.4;
  for (const sz of [-1, 1]) {
    const r = new THREE.BoxGeometry(roofLen - 1.0, 0.45, Ls);
    r.rotateX(sz * pitch);
    r.translate(0, Y3 + Hp / 2 + 0.25, (sz * W) / 4);
    ped.push(prep(r));
  }
  ped.push(box(roofLen - 1.0, 0.4, 0.5, 0, Y3 + Hp + 0.3, 0));
  g.add(mesh(merge(ped), mats.roof || mats.marble));

  const antefix = createPalmette({ height: 0.75, leaves: 7, depth: 0.05 });
  const ants = [];
  for (let i = 0; i <= nX; i++) {
    const x = -Lx / 2 + i * half;
    ants.push([x, Y3 + 0.05, gZ / 2 + 0.02, 0], [x, Y3 + 0.05, -gZ / 2 - 0.02, Math.PI]);
  }
  g.add(instanced(antefix, mats.gold, ants));

  const apex = createPalmette({ height: Math.max(2.2, colH * 0.24), leaves: 11, depth: 0.16 });
  const urn = createUrn({ height: colH * 0.16 });
  const apexT = [], urnT = [];
  for (const sx of [-1, 1]) {
    apexT.push([sx * (gX / 2 - 0.5), Y3 + Hp + 0.4, 0, Math.PI / 2]);
    for (const sz of [-1, 1]) urnT.push([sx * (gX / 2 - 0.6), Y3 + hG * 0.5, sz * (W / 2 - 0.6)]);
  }
  g.add(instanced(apex, mats.gold, apexT));
  g.add(instanced(urn, mats.gold, urnT));

  if (cella) {
    const cx = Lx - spacing * 3.2, cz = Lz - spacing * 1.7;
    const cel = [box(cx, colTotal, cz, 0, Y0 + colTotal / 2, 0), box(cx + 0.3, 0.5, cz + 0.3, 0, Y0 + 0.25, 0)];
    g.add(mesh(merge(cel), mats.marble));
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, colH * 0.72, spacing * 1.1),
      new THREE.MeshStandardMaterial({ color: 0x0a0806, emissive: new THREE.Color(1.0, 0.55, 0.2), emissiveIntensity: 0.25, roughness: 1 })
    );
    door.position.set(cx / 2 + 0.05, Y0 + (colH * 0.72) / 2, 0);
    g.add(door);
    const frame = merge([
      box(0.4, colH * 0.78, 0.35, cx / 2 + 0.1, Y0 + colH * 0.39, spacing * 0.6),
      box(0.4, colH * 0.78, 0.35, cx / 2 + 0.1, Y0 + colH * 0.39, -spacing * 0.6),
      box(0.4, 0.4, spacing * 1.55, cx / 2 + 0.1, Y0 + colH * 0.78, 0),
    ]);
    g.add(mesh(frame, mats.gold));
  }

  g.userData = { width: topZ + steps * 2 * stepD, length: topX + steps * 2 * stepD, ridge: Y3 + Hp, entablatureTop: Y3, Lx, Lz, gX, gZ };
  return g;
}
