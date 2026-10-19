const EDGES = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

export function sampleField(sdf, bounds, cell, block = 6) {
  const [x0, y0, z0] = bounds.min;
  const nx = Math.ceil((bounds.max[0] - x0) / cell) + 1;
  const ny = Math.ceil((bounds.max[1] - y0) / cell) + 1;
  const nz = Math.ceil((bounds.max[2] - z0) / cell) + 1;
  const field = new Float32Array(nx * ny * nz);
  const reach = Math.sqrt(3) * (block / 2) * cell * 1.15 + cell * 2;
  for (let bk = 0; bk < nz; bk += block) {
    for (let bj = 0; bj < ny; bj += block) {
      for (let bi = 0; bi < nx; bi += block) {
        const ie = Math.min(bi + block, nx), je = Math.min(bj + block, ny), ke = Math.min(bk + block, nz);
        const c = sdf(x0 + ((bi + ie - 1) / 2) * cell, y0 + ((bj + je - 1) / 2) * cell, z0 + ((bk + ke - 1) / 2) * cell);
        const exact = Math.abs(c) < reach;
        for (let k = bk; k < ke; k++) {
          for (let j = bj; j < je; j++) {
            let o = i0(bi, j, k, nx, ny);
            for (let i = bi; i < ie; i++, o++) {
              field[o] = exact ? sdf(x0 + i * cell, y0 + j * cell, z0 + k * cell) : c;
            }
          }
        }
      }
    }
  }
  return { field, nx, ny, nz, origin: [x0, y0, z0], cell };
}

const i0 = (i, j, k, nx, ny) => i + nx * (j + ny * k);

export function surfaceNets({ field, nx, ny, nz, origin, cell }) {
  const cellIndex = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const v = new Float32Array(8);
  let count = 0;
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const val = field[i0(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1), nx, ny)];
          v[c] = val;
          if (val < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of EDGES) {
          const va = v[a], vb = v[b];
          if ((va < 0) === (vb < 0)) continue;
          const t = va / (va - vb);
          sx += (a & 1) + ((b & 1) - (a & 1)) * t;
          sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
          sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
          n++;
        }
        pos.push(origin[0] + (i + sx / n) * cell, origin[1] + (j + sy / n) * cell, origin[2] + (k + sz / n) * cell);
        cellIndex[i0(i, j, k, nx, ny)] = count++;
      }
    }
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, d, c, a, c, b);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const f0 = field[i0(i, j, k, nx, ny)] < 0;
        if (j > 0 && k > 0 && f0 !== field[i0(i + 1, j, k, nx, ny)] < 0) {
          quad(cellIndex[i0(i, j - 1, k - 1, nx, ny)], cellIndex[i0(i, j, k - 1, nx, ny)], cellIndex[i0(i, j, k, nx, ny)], cellIndex[i0(i, j - 1, k, nx, ny)], f0);
        }
        if (i > 0 && k > 0 && f0 !== field[i0(i, j + 1, k, nx, ny)] < 0) {
          quad(cellIndex[i0(i - 1, j, k - 1, nx, ny)], cellIndex[i0(i - 1, j, k, nx, ny)], cellIndex[i0(i, j, k, nx, ny)], cellIndex[i0(i, j, k - 1, nx, ny)], f0);
        }
        if (i > 0 && j > 0 && f0 !== field[i0(i, j, k + 1, nx, ny)] < 0) {
          quad(cellIndex[i0(i - 1, j - 1, k, nx, ny)], cellIndex[i0(i, j - 1, k, nx, ny)], cellIndex[i0(i, j, k, nx, ny)], cellIndex[i0(i - 1, j, k, nx, ny)], f0);
        }
      }
    }
  }
  return { positions: new Float32Array(pos), indices: count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx) };
}
