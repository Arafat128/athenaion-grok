import * as THREE from 'three';
import { buildTemple } from './temple.js';
import { createPerimeterWall, createStairway } from './walls.js';
import { createBannerPoles, createHangingBanners } from './banners.js';
import { createAthena } from '../statues/athena.js';
import { createTown } from './town.js';
import { box, merge } from './geometry.js';
import { createErechtheion } from './erechtheion.js';
import { createTheatre } from './theatre.js';
import { createAgora } from './agora.js';
import { createBraziers } from './brazier.js';
import { figureGeometry } from '../statues/caryatid.js';

export function createAcropolis(field, world, { mats, bannerMat, quality, clearings = [], timeUniform, soft }) {
  const A = world.acropolis;
  const group = new THREE.Group();
  const Y = A.top;

  const paveGeo = merge([
    box(104, 0.6, 54, A.x - 18, Y + 0.05, A.z - 14),
    box(70, 0.6, 22, A.x + 70, Y + 0.05, A.z + 2),
    box(34, 0.6, 34, A.x + 75, Y + 0.06, A.z + 42),
    box(44, 0.6, 34, A.x - 98, Y + 0.05, A.z + 30),
    box(60, 0.6, 9, A.x - 45, Y + 0.04, A.z + 20, 0),
    box(34, 0.6, 30, A.x + 52, Y + 0.05, A.z - 48),
  ]);
  const pave = new THREE.Mesh(paveGeo, mats.paving);
  pave.receiveShadow = true;
  group.add(pave);

  const pedimentFigure = figureGeometry('kore', quality.figureCell);
  const parthenon = buildTemple({ colsX: 17, colsZ: 8, mats, pedimentFigure });
  parthenon.position.set(A.x - 18, Y + 0.3, A.z - 14);
  group.add(parthenon);

  const propylaea = buildTemple({ colsX: 3, colsZ: 6, colH: 8.6, radius: 0.8, spacing: 3.9, steps: 4, cella: false, pronaos: false, mats });
  propylaea.position.set(A.x + 118, Y + 0.3, A.z + 2);
  group.add(propylaea);

  const nike = buildTemple({ colsX: 5, colsZ: 4, colH: 4.6, radius: 0.42, spacing: 2.1, stepH: 0.35, stepD: 0.45, cella: true, pronaos: false, mats });
  nike.position.set(A.x + 104, Y + 0.3, A.z - 40);
  nike.rotation.y = -0.12;
  group.add(nike);

  const zeus = buildTemple({ colsX: 9, colsZ: 6, colH: 7.4, radius: 0.68, spacing: 3.1, cella: true, mats });
  zeus.position.set(A.x - 98, Y + 0.3, A.z + 30);
  zeus.rotation.y = -0.05;
  group.add(zeus);

  const erech = createErechtheion({ mats, cell: quality.figureCell, pedimentFigure });
  erech.position.set(A.x + 50, Y + 0.3, A.z - 50);
  group.add(erech);

  const theatre = createTheatre(world.theatre, { mats });
  group.add(theatre);
  const agora = createAgora(world.agora, { mats, cell: quality.figureCell });
  group.add(agora);

  const athena = createAthena({ height: 22, cell: quality.statueCell, mats });
  athena.position.set(A.x + 75, Y + 0.3, A.z + 42);
  athena.rotation.y = 0.9;
  group.add(athena);

  const stairStart = new THREE.Vector3(A.x + 128, Y + 0.3, A.z + 2);
  const stairs = createStairway(field, mats.ashlar, { start: stairStart, dir: new THREE.Vector3(1, 0, 0), width: 16 });
  group.add(stairs);
  const s0 = stairs.userData.steps[0];
  const landing = new THREE.Mesh(box(s0.x - stairStart.x + 2, 0.8, 18, (s0.x + stairStart.x) / 2 - 0.5, Y - 0.1, A.z + 2), mats.paving);
  landing.receiveShadow = true;
  group.add(landing);
  const corridor = stairs.userData.steps.filter((_, i) => i % 16 === 0).map((st) => ({ x: st.x, z: st.z, r: 15 }));

  group.add(createPerimeterWall(field, world, mats.ashlar, { skip: (x, z) => x > A.x + 100 && Math.abs(z - A.z - 2) < 12 }));

  const poles = [];
  for (const s of stairs.userData.steps.filter((_, i) => i % 18 === 9)) {
    for (const side of [-1, 1]) poles.push({ x: s.x, y: s.y + 1.2, z: s.z + side * 10.2, rot: Math.PI / 2 });
  }
  const ca = Math.cos(athena.rotation.y), sa = Math.sin(athena.rotation.y);
  for (const [lx, lz] of [[-11, 3], [11, 3], [-8, -9], [8, -9]]) {
    poles.push({ x: athena.position.x + lx * ca + lz * sa, y: Y + 0.3, z: athena.position.z - lx * sa + lz * ca, rot: athena.rotation.y });
  }
  for (const dz of [-16, 16]) poles.push({ x: A.x + 132, y: Y + 0.3, z: A.z + 2 + dz, rot: Math.PI / 2, scale: 1.2 });
  poles.push(...agora.userData.banners);
  group.add(createBannerPoles(poles, { mats, bannerMat }));

  const T = world.theatre;
  const fires = [
    ...[[-14, 10], [14, 10], [-14, -6], [14, -6]].map(([lx, lz]) => ({ x: athena.position.x + lx * ca + lz * sa, y: Y + 0.3, z: athena.position.z - lx * sa + lz * ca, scale: 1.3 })),
    ...[-9, 9].map((dz) => ({ x: parthenon.position.x + parthenon.userData.length / 2 + 4, y: Y + 0.35, z: parthenon.position.z + dz, scale: 1.2 })),
    ...[-7, 7].map((dz) => ({ x: A.x + 112, y: Y + 0.35, z: A.z + 2 + dz })),
    ...[-1, 1].map((sx) => ({ x: T.x + sx * (T.r0 + 2), y: T.y + 0.3, z: T.z + T.r0 * 0.4 })),
    ...agora.userData.braziers,
  ];
  const braziers = createBraziers(fires, { mats, timeUniform, soft, perFlame: quality.flame ?? 36 });
  group.add(braziers);

  const pd = parthenon.userData;
  const hang = [];
  const colTopY = parthenon.position.y + 1.65 + 11.32 - 0.1;
  for (const i of [1, 3, 5]) {
    const z = parthenon.position.z - pd.Lz / 2 + (i + 0.5) * 4.3;
    hang.push({ x: parthenon.position.x + pd.Lx / 2 + 0.2, y: colTopY, z, rot: Math.PI / 2 });
  }
  for (const i of [1, 4, 7, 8, 11, 14]) {
    const x = parthenon.position.x - pd.Lx / 2 + (i + 0.5) * 4.3;
    hang.push({ x, y: colTopY, z: parthenon.position.z + pd.Lz / 2 + 0.2, rot: 0 });
  }
  group.add(createHangingBanners(hang, { bannerMat, width: 2.2, height: 6.5 }));
  const drapes = [];
  for (const i of [0, 2, 4, 6]) {
    const z = parthenon.position.z - pd.Lz / 2 + (i + 0.5) * 4.3;
    drapes.push({ x: parthenon.position.x + pd.Lx / 2 + 0.25, y: colTopY, z, rot: Math.PI / 2 });
  }
  const pp = propylaea.userData;
  for (const i of [0, 2, 3, 5]) drapes.push({ x: propylaea.position.x + pp.Lx / 2 + 0.2, y: propylaea.position.y + 1.65 + 8.6 * 1.09 - 0.1, z: propylaea.position.z - pp.Lz / 2 + (i + 0.5) * 3.9, rot: Math.PI / 2 });
  group.add(createHangingBanners(drapes, { bannerMat, width: 1.5, height: 10.5 }));

  group.add(createTown(field, world, { count: quality.houses, wallMat: mats.plaster, roofMat: mats.tile, podiumMat: mats.ashlar, clearings: [...clearings, ...corridor, theatre.userData.clearing, agora.userData.clearing] }));

  group.userData = { parthenon, athena, propylaea, stairs, erech, theatre, agora, flames: braziers.userData.flames, clearings: [...corridor, theatre.userData.clearing, agora.userData.clearing] };
  return group;
}
