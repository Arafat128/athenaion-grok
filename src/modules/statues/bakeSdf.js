import { sampleField, surfaceNets } from './surfaceNets.js';

export function bakeSdf(sdf, bounds, cell, { aoStep = 0.008 } = {}) {
  const grid = sampleField(sdf, bounds, cell);
  const { positions, indices } = surfaceNets(grid);
  const n = positions.length / 3;
  const normals = new Float32Array(n * 3);
  const cavity = new Float32Array(n);
  const e = cell * 0.5;
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    let nx = sdf(x + e, y, z) - sdf(x - e, y, z);
    let ny = sdf(x, y + e, z) - sdf(x, y - e, z);
    let nz = sdf(x, y, z + e) - sdf(x, y, z - e);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    normals[i * 3] = nx; normals[i * 3 + 1] = ny; normals[i * 3 + 2] = nz;
    let occ = 0, w = 1;
    for (let k = 1; k <= 5; k++) {
      const h = aoStep * k;
      occ += (h - sdf(x + nx * h, y + ny * h, z + nz * h)) * w;
      w *= 0.6;
    }
    cavity[i] = Math.min(1, Math.max(0, occ / aoStep * 0.35));
  }
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    const ux = positions[b * 3] - positions[a * 3], uy = positions[b * 3 + 1] - positions[a * 3 + 1], uz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const vx = positions[c * 3] - positions[a * 3], vy = positions[c * 3 + 1] - positions[a * 3 + 1], vz = positions[c * 3 + 2] - positions[a * 3 + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    const gx = normals[a * 3] + normals[b * 3] + normals[c * 3];
    const gy = normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1];
    const gz = normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2];
    if (fx * gx + fy * gy + fz * gz < 0) {
      indices[t + 1] = c;
      indices[t + 2] = b;
    }
  }
  return { positions, normals, cavity, indices };
}

const inside = (b, x, y, z, m) => x > b.min[0] + m && x < b.max[0] - m && y > b.min[1] + m && y < b.max[1] - m && z > b.min[2] + m && z < b.max[2] - m;

export function bakeSdfDetailed(sdf, bounds, cell, details = []) {
  const parts = [bakeSdf(sdf, bounds, cell)];
  const coarse = parts[0];
  const keep = [];
  const P = coarse.positions;
  for (let t = 0; t < coarse.indices.length; t += 3) {
    const a = coarse.indices[t] * 3, b = coarse.indices[t + 1] * 3, c = coarse.indices[t + 2] * 3;
    const cx = (P[a] + P[b] + P[c]) / 3, cy = (P[a + 1] + P[b + 1] + P[c + 1]) / 3, cz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
    if (!details.some((d) => inside(d, cx, cy, cz, cell * 0.75))) keep.push(coarse.indices[t], coarse.indices[t + 1], coarse.indices[t + 2]);
  }
  coarse.indices = keep;
  for (const d of details) {
    const fc = cell / d.factor;
    parts.push(bakeSdf(sdf, d, fc, { aoStep: 0.008 }));
  }
  let nv = 0, ni = 0;
  for (const p of parts) { nv += p.positions.length / 3; ni += p.indices.length; }
  const positions = new Float32Array(nv * 3), normals = new Float32Array(nv * 3), cavity = new Float32Array(nv);
  const indices = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let ov = 0, oi = 0;
  for (const p of parts) {
    positions.set(p.positions, ov * 3);
    normals.set(p.normals, ov * 3);
    cavity.set(p.cavity, ov);
    for (let i = 0; i < p.indices.length; i++) indices[oi++] = p.indices[i] + ov;
    ov += p.positions.length / 3;
  }
  return { positions, normals, cavity, indices };
}
