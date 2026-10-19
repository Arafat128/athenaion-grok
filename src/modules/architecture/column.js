import * as THREE from 'three';
import { prep, merge, box } from './geometry.js';

export function createDoricColumn({ height = 10.4, radius = 0.95, flutes = 20, radialPerFlute = 6, rings = 28 } = {}) {
  const shaftH = height;
  const seg = flutes * radialPerFlute;
  const pos = [], cav = [], idx = [];
  const R = (t) => radius * (1 - 0.2 * t + 0.035 * Math.sin(Math.PI * t));
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const y = t * shaftH;
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const f = (i % radialPerFlute) / radialPerFlute;
      const groove = Math.sqrt(Math.sin(Math.PI * f));
      const r = R(t) * (1 - 0.055 * groove);
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      cav.push(groove * 0.55);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const shaft = new THREE.BufferGeometry();
  shaft.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  shaft.setAttribute('cavity', new THREE.Float32BufferAttribute(cav, 1));
  shaft.setIndex(idx);
  shaft.computeVertexNormals();

  const rt = R(1);
  const prof = [];
  const necking = [new THREE.Vector2(rt * 0.97, 0), new THREE.Vector2(rt * 0.97, 0.06), new THREE.Vector2(rt * 1.0, 0.07), new THREE.Vector2(rt * 1.0, 0.12)];
  prof.push(...necking);
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    const r = rt * (1.0 + 0.48 * Math.pow(t, 0.55));
    prof.push(new THREE.Vector2(r, 0.12 + t * 0.48 - 0.1 * t * t));
  }
  prof.push(new THREE.Vector2(0.01, 0.5));
  const echinus = new THREE.LatheGeometry(prof, 48).translate(0, shaftH, 0);
  const abacusW = rt * 2 * 1.5;
  const abacus = box(abacusW, 0.42, abacusW, 0, shaftH + 0.5 + 0.21);
  const geo = merge([shaft, echinus, abacus]);
  geo.userData.totalHeight = shaftH + 0.92;
  geo.userData.abacusWidth = abacusW;
  return geo;
}
