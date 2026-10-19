import { mulberry32 } from '../utils/rng.js';

export function erode(sample, { size, extent, drops, steps = 56, seed = 7, thermal = 4 }) {
  const N = size;
  const cs = (2 * extent) / (N - 1);
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = sample(-extent + i * cs, -extent + j * cs) / cs;
  const orig = H.slice();
  const flow = new Float32Array(N * N);
  const dep = new Float32Array(N * N);
  const rnd = mulberry32(seed);
  const inertia = 0.06, capK = 5, minCap = 0.005, depRate = 0.25, eroRate = 0.35, evap = 0.018, grav = 4;

  const sampleHG = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j;
    const k = j * N + i;
    const a = H[k], b = H[k + 1], c = H[k + N], d = H[k + N + 1];
    return [a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v, (b - a) * (1 - v) + (d - c) * v, (c - a) * (1 - u) + (d - b) * u];
  };

  for (let n = 0; n < drops; n++) {
    let x = 2 + rnd() * (N - 5), y = 2 + rnd() * (N - 5);
    let dx = 0, dy = 0, speed = 1, water = 1, sed = 0;
    for (let s = 0; s < steps; s++) {
      const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j;
      const [h, gx, gy] = sampleHG(x, y);
      dx = dx * inertia - gx * (1 - inertia);
      dy = dy * inertia - gy * (1 - inertia);
      const l = Math.hypot(dx, dy);
      if (l < 1e-6) break;
      dx /= l; dy /= l;
      x += dx; y += dy;
      if (x < 1 || y < 1 || x > N - 3 || y > N - 3) break;
      const nh = sampleHG(x, y)[0];
      const dh = nh - h;
      const k = j * N + i;
      flow[k] += water;
      const cap = Math.max(-dh * speed * water * capK, minCap);
      if (sed > cap || dh > 0) {
        const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depRate;
        sed -= amt;
        H[k] += amt * (1 - u) * (1 - v); H[k + 1] += amt * u * (1 - v);
        H[k + N] += amt * (1 - u) * v; H[k + N + 1] += amt * u * v;
        dep[k] += amt;
      } else {
        const amt = Math.min((cap - sed) * eroRate, -dh);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const w = (ox === 0 && oy === 0 ? 0.36 : ox === 0 || oy === 0 ? 0.11 : 0.05) * amt;
            H[k + oy * N + ox] -= w;
          }
        }
        sed += amt;
      }
      speed = Math.sqrt(Math.max(0.01, speed * speed - dh * grav));
      water *= 1 - evap;
    }
  }

  const talus = 0.75;
  for (let it = 0; it < thermal; it++) {
    for (let j = 1; j < N - 1; j++) {
      for (let i = 1; i < N - 1; i++) {
        const k = j * N + i;
        for (const o of [1, -1, N, -N]) {
          const d = H[k] - H[k + o];
          if (d > talus) {
            const m = (d - talus) * 0.25;
            H[k] -= m; H[k + o] += m;
            dep[k + o] += m * 0.5;
          }
        }
      }
    }
  }

  const delta = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) delta[k] = (H[k] - orig[k]) * cs;
  const maps = new Uint8Array(N * N * 4);
  for (let k = 0; k < N * N; k++) {
    maps[k * 4] = Math.min(255, Math.log1p(flow[k]) * 42);
    maps[k * 4 + 1] = Math.min(255, Math.max(0, delta[k]) * 6);
    maps[k * 4 + 2] = Math.min(255, Math.max(0, -delta[k]) * 4);
    maps[k * 4 + 3] = 255;
  }
  return {
    size: N,
    extent,
    maps,
    deltaAt(x, z) {
      const fx = (x + extent) / cs, fz = (z + extent) / cs;
      if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return 0;
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * N + i;
      return delta[k] * (1 - u) * (1 - v) + delta[k + 1] * u * (1 - v) + delta[k + N] * (1 - u) * v + delta[k + N + 1] * u * v;
    },
  };
}
