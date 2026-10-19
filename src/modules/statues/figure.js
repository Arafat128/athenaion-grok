import { ellipsoid, capsule, torusY, smin, smax } from './sdf.js';
import { clamp } from '../utils/math.js';
import { createNoise } from '../utils/noise.js';

const N = createNoise(77);

export function face(hx, hy, hz) {
  let d = ellipsoid(hx, hy, hz, 0.043, 0.054, 0.049);
  d = smin(d, ellipsoid(hx, hy + 0.03, hz - 0.014, 0.031, 0.03, 0.034), 0.02);
  d = smin(d, ellipsoid(hx, hy + 0.049, hz - 0.036, 0.012, 0.01, 0.011), 0.012);
  const ax = Math.abs(hx);
  d = smin(d, ellipsoid(ax - 0.02, hy + 0.013, hz - 0.033, 0.013, 0.012, 0.012), 0.012);
  d = smin(d, ellipsoid(hx, hy - 0.014, hz - 0.039, 0.03, 0.008, 0.011), 0.008);
  d = smax(d, -ellipsoid(ax - 0.0165, hy - 0.002, hz - 0.051, 0.0115, 0.0068, 0.0095), 0.004);
  d = smin(d, ellipsoid(ax - 0.0165, hy - 0.0015, hz - 0.0405, 0.0088, 0.0052, 0.0078), 0.0015);
  d = smin(d, ellipsoid(ax - 0.0165, hy - 0.0062, hz - 0.0445, 0.0098, 0.0022, 0.005), 0.0015);
  d = smin(d, capsule(hx, hy, hz, [0, 0.009, 0.049], [0, -0.0155, 0.06], 0.0032, 0.0052), 0.005);
  d = smin(d, ellipsoid(ax - 0.0052, hy + 0.0165, hz - 0.054, 0.0042, 0.0034, 0.0038), 0.003);
  d = smax(d, -ellipsoid(ax - 0.0035, hy + 0.0205, hz - 0.059, 0.0018, 0.0012, 0.0022), 0.001);
  d = smin(d, ellipsoid(hx, hy + 0.0262, hz - 0.0505, 0.0092, 0.0028, 0.0048), 0.003);
  d = smin(d, ellipsoid(hx, hy + 0.0316, hz - 0.0488, 0.0078, 0.0032, 0.005), 0.003);
  d = smax(d, -Math.max(Math.abs(hy + 0.0289) - 0.0006, ax - 0.0088, 0.0475 - hz), 0.0008);
  return d;
}

export function hair(hx, hy, hz) {
  const ang = Math.atan2(hx, hz);
  let base = ellipsoid(hx, hy + 0.004, hz + 0.008, 0.049, 0.052, 0.053);
  base -= 0.0022 * Math.sin(ang * 24 + hy * 70 + Math.sin(hy * 120) * 0.6);
  base = smax(base, hz - 0.024 - Math.max(0, hy) * 0.6, 0.008);
  base = Math.max(base, -0.045 - hy);
  let d = base;
  for (const s of [-1, 1]) {
    const lock = capsule(hx, hy, hz, [s * 0.036, -0.012, -0.004], [s * 0.052, -0.115, 0.012], 0.0095, 0.006);
    d = smin(d, lock - 0.0016 * Math.sin((hy + hx * s) * 260), 0.01);
  }
  d = smin(d, ellipsoid(hx, hy + 0.07, hz + 0.036, 0.036, 0.06, 0.02) - 0.0018 * Math.sin(hx * 300), 0.015);
  return d;
}

export function corinthianHelmet(hx, hy, hz) {
  const outer = ellipsoid(hx, hy - 0.012, hz + 0.002, 0.051, 0.057, 0.057);
  const inner = ellipsoid(hx, hy - 0.012, hz + 0.002, 0.0465, 0.0525, 0.0525);
  const back = clamp((0.01 - hz) / 0.055, 0, 1);
  let d = Math.max(outer, -inner, 0.02 - back * 0.072 - hy);
  let visor = Math.max(
    ellipsoid(hx, hy - 0.046, hz - 0.012, 0.054, 0.042, 0.058),
    -ellipsoid(hx, hy - 0.046, hz - 0.012, 0.0495, 0.0375, 0.0535),
    0.018 - hz, 0.024 - hy
  );
  visor = smax(visor, -ellipsoid(Math.abs(hx) - 0.019, hy - 0.05, hz - 0.066, 0.0115, 0.0068, 0.03), 0.002);
  d = smin(d, visor, 0.004);
  d = smin(d, capsule(hx, hy, hz, [0, 0.062, 0.066], [0, 0.03, 0.072], 0.0042, 0.0034), 0.003);
  const cy = hy - 0.024, cz = hz + 0.006;
  const rr = Math.sqrt(cy * cy + cz * cz) - 0.072;
  const th = Math.atan2(cz, cy);
  const spanOk = Math.max(-0.028 + 0.06 * clamp((cz + 0.03) / 0.09, 0, 1) - cy, cz - 0.058);
  const endT = Math.min(clamp((0.058 - cz) / 0.03, 0, 1), clamp((cy + 0.028) / 0.04, 0, 1));
  const half = (0.0075 * (0.6 + 0.4 * clamp(1 - Math.abs(rr) / 0.016, 0, 1)) + 0.0011 * Math.sin(th * 140)) * (0.35 + 0.65 * Math.sqrt(endT));
  const plume = smax(Math.max(Math.abs(rr) - 0.0145 * (0.5 + 0.5 * Math.sqrt(endT)), Math.abs(hx) - half), spanOk, 0.006);
  d = Math.min(d, plume);
  d = smin(d, capsule(hx, hy, hz, [0, 0.06, -0.002], [0, 0.086, -0.004], 0.0055), 0.004);
  return d;
}

export function peplos(x, y, z, { r0 = 0.148, top = 0.62, zs = 0.78 } = {}) {
  const t = clamp(y / top, 0, 1);
  const ang = Math.atan2(x, z);
  let r = r0 - 0.07 * t + 0.02 * Math.pow(1 - t, 5) + 0.012 * Math.sin(Math.PI * t * 0.9);
  const warp = N.noise3(x * 9, y * 2.2, z * 9) * 1.8;
  const f1 = Math.abs(Math.sin(ang * 8 + warp + y * 1.2)) * 2 - 1;
  const f2 = Math.abs(Math.sin(ang * 19 + warp * 1.6 - y * 3.0)) * 2 - 1;
  r += (0.004 + 0.013 * (1 - t)) * f1 + (0.002 + 0.004 * (1 - t)) * f2;
  r += 0.0016 * (1 - Math.abs(N.noise3(x * 45, y * 22, z * 45))) * (0.4 + t);
  const zz = z / zs;
  const d = (Math.sqrt(x * x + zz * zz) - r) * zs;
  return Math.max(d, -y, y - top);
}

export function overfold(x, y, z, y0 = 0.47, y1 = 0.74) {
  const t = clamp((y - y0) / (y1 - y0), 0, 1);
  const ang = Math.atan2(x, z);
  let r = 0.122 - 0.032 * t;
  const warp = N.noise3(x * 12, y * 6, z * 12) * 1.2;
  r += (0.004 + 0.01 * (1 - t)) * (Math.abs(Math.sin(ang * 7 + 0.5 + warp)) * 2 - 1) + 0.002 * (Math.abs(Math.sin(ang * 17 - warp)) * 2 - 1);
  const zz = (z - 0.005) / 0.74;
  const d = (Math.sqrt(x * x + zz * zz) - r) * 0.74;
  const hem = y0 + 0.022 * Math.sin(ang * 5.0) + 0.012 * N.noise2(ang * 3, 1.7);
  return Math.max(d, hem - y, y - y1);
}

export function owl(x, y, z) {
  if (x * x + (y - 0.045) ** 2 + z * z > 0.0064) return Math.sqrt(x * x + (y - 0.045) ** 2 + z * z) - 0.06;
  const ax = Math.abs(x);
  let d = ellipsoid(x, y - 0.032, z, 0.024, 0.033, 0.022);
  d = smin(d, ellipsoid(x, y - 0.071, z - 0.003, 0.021, 0.018, 0.019), 0.008);
  d = smin(d, ellipsoid(ax - 0.013, y - 0.087, z - 0.001, 0.0045, 0.008, 0.004), 0.004);
  d = smax(d, -ellipsoid(ax - 0.0085, y - 0.073, z - 0.021, 0.0085, 0.0085, 0.006), 0.002);
  d = smin(d, ellipsoid(x, y - 0.065, z - 0.02, 0.0028, 0.0058, 0.0042), 0.002);
  const wing = ellipsoid(ax - 0.019, y - 0.03, z + 0.003, 0.008, 0.027, 0.018) - 0.0008 * Math.sin(y * 420 + z * 80);
  d = smin(d, wing, 0.004);
  d = smin(d, ellipsoid(x, y - 0.008, z + 0.018, 0.012, 0.006, 0.014), 0.006);
  d -= 0.0006 * Math.sin(y * 500) * Math.sin(x * 400) * (z > 0 ? 1 : 0);
  for (const s of [-1, 1]) d = smin(d, capsule(x, y, z, [s * 0.009, 0.0, 0.01], [s * 0.01, 0.004, 0.022], 0.0026), 0.003);
  return d;
}

export function owlEyes(x, y, z) {
  return ellipsoid(Math.abs(x) - 0.0085, y - 0.073, z - 0.017, 0.0048, 0.0048, 0.0032);
}

export function gorgoneion(x, y, z) {
  const r = Math.sqrt(x * x + y * y);
  if (r > 0.04 || Math.abs(z) > 0.02) return Math.max(r - 0.03, Math.abs(z) - 0.01);
  const ax = Math.abs(x);
  let d = Math.max(r - 0.019, Math.abs(z) - 0.0025);
  d = smin(d, ellipsoid(x, y + 0.001, z - 0.002, 0.012, 0.014, 0.006), 0.003);
  d = smax(d, -ellipsoid(ax - 0.0052, y - 0.004, z - 0.008, 0.0035, 0.0028, 0.003), 0.001);
  d = smin(d, ellipsoid(ax - 0.0052, y - 0.004, z - 0.0055, 0.0022, 0.002, 0.0018), 0.0006);
  d = smin(d, capsule(x, y, z, [0, 0.002, 0.007], [0, -0.004, 0.0085], 0.0014, 0.0022), 0.0015);
  d = smax(d, -ellipsoid(x, y + 0.0085, z - 0.008, 0.0052, 0.0022, 0.004), 0.001);
  d = smin(d, ellipsoid(x, y + 0.0105, z - 0.006, 0.0022, 0.0035, 0.0018), 0.001);
  const a = Math.atan2(y, x);
  const k = Math.round(a / (Math.PI / 6)) * (Math.PI / 6);
  const sx = Math.cos(k) * 0.0215, sy = Math.sin(k) * 0.0215;
  const snake = torusY(x - sx, z - 0.001, y - sy, 0.0035, 0.0016);
  return Math.min(d, snake, Math.sqrt((r - 0.0195) ** 2 + (z - 0.0005) ** 2) - 0.0016);
}

export function aegisSnakes(ax, ay, az, rx, rz) {
  const ang = Math.atan2(ax / rx, az / rz);
  const k = Math.round(ang / (Math.PI / 11)) * (Math.PI / 11);
  const ex = Math.sin(k) * rx, ez = Math.cos(k) * rz;
  const dx = ax - ex, dz = az - ez;
  return Math.min(
    Math.sqrt(dx * dx + (ay + 0.006) ** 2 + dz * dz) - 0.0055,
    Math.sqrt((dx * 1.2) ** 2 + (ay + 0.013) ** 2 + (dz * 1.2) ** 2) - 0.0042
  );
}
