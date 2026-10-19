import * as THREE from 'three';
import { RNG } from '../utils/rng.js';

export function createWaterNormalTexture(size = 256, seed = 3) {
  const rng = new RNG(seed);
  const waves = [];
  for (let i = 0; i < 48; i++) {
    const f = 1 + Math.floor(rng.float(0, 1) ** 2 * 14);
    const a = rng.float(0, Math.PI * 2);
    const kx = Math.round(Math.cos(a) * f), ky = Math.round(Math.sin(a) * f);
    if (kx === 0 && ky === 0) continue;
    waves.push({ kx, ky, amp: 1 / (Math.hypot(kx, ky) ** 1.1), ph: rng.float(0, Math.PI * 2) });
  }
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      const u = (x / size) * Math.PI * 2, w = (y / size) * Math.PI * 2;
      for (const wv of waves) v += wv.amp * Math.sin(wv.kx * u + wv.ky * w + wv.ph);
      h[y * size + x] = v;
    }
  }
  const data = new Uint8Array(size * size * 4);
  const s = 0.9;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1 + size) % size)], r = h[y * size + ((x + 1) % size)];
      const d = h[((y - 1 + size) % size) * size + x], u = h[((y + 1) % size) * size + x];
      let nx = (l - r) * s, ny = (d - u) * s, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const k = (y * size + x) * 4;
      data[k] = (nx * 0.5 + 0.5) * 255;
      data[k + 1] = (ny * 0.5 + 0.5) * 255;
      data[k + 2] = (nz * 0.5 + 0.5) * 255;
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
