import { sphere, ellipsoid, capsule, torusY, smin, cylinderY } from './sdf.js';
import { clamp, smoothstep } from '../utils/math.js';

const SH_R = [-0.112, 0.785, 0.0];
const EL_R = [-0.205, 0.855, 0.02];
const HA_R = [-0.222, 0.985, 0.038];
const SH_L = [0.112, 0.785, 0.0];
const EL_L = [0.168, 0.645, 0.03];
const HA_L = [0.205, 0.5, 0.1];
const HEAD = [0, 0.915, 0.008];

export const SPEAR = { x: HA_R[0], z: HA_R[2], y0: 0.0, y1: 1.3 };

const SHIELD_C = [0.255, 0.27, 0.13];
const SN = (() => {
  const n = [0.78, 0.12, 0.6];
  const l = Math.hypot(...n);
  return n.map((v) => v / l);
})();
const SHIELD_R = 0.2;

function robe(x, y, z) {
  const t = clamp(y / 0.6, 0, 1);
  const ang = Math.atan2(x, z);
  let r = 0.148 - 0.07 * t + 0.02 * Math.pow(1 - t, 5) + 0.012 * Math.sin(Math.PI * t * 0.9);
  const fold = Math.sin(ang * 15 + Math.sin(y * 24 + ang * 2) * 0.8) + 0.45 * Math.sin(ang * 31 + y * 9);
  r += (0.005 + 0.011 * (1 - t)) * fold * (0.6 + 0.4 * Math.sin(ang * 3 + 1.0));
  const zz = z / 0.78;
  const d = (Math.sqrt(x * x + zz * zz) - r) * 0.78;
  return Math.max(d, -y, y - 0.62);
}

function overfold(x, y, z) {
  const t = clamp((y - 0.47) / 0.27, 0, 1);
  const ang = Math.atan2(x, z);
  let r = 0.122 - 0.032 * t;
  r += (0.003 + 0.006 * (1 - t)) * Math.sin(ang * 11 + 0.5 + Math.sin(y * 30) * 0.5);
  const zz = (z - 0.005) / 0.74;
  const d = (Math.sqrt(x * x + zz * zz) - r) * 0.74;
  const hem = 0.47 + 0.02 * Math.sin(ang * 5.0);
  return Math.max(d, hem - y, y - 0.76);
}

export function marbleSdf(x, y, z) {
  let d = robe(x, y, z);
  d = smin(d, ellipsoid(x - 0.045, y - 0.3, z - 0.04, 0.062, 0.2, 0.065), 0.05);
  d = smin(d, overfold(x, y, z), 0.012);
  d = smin(d, ellipsoid(x, y - 0.67, z, 0.094, 0.13, 0.066), 0.03);
  d = smin(d, ellipsoid(x, y - 0.725, z - 0.016, 0.098, 0.055, 0.066), 0.03);
  for (const sx of [-1, 1]) d = smin(d, ellipsoid(x - sx * 0.042, y - 0.718, z - 0.052, 0.036, 0.03, 0.026), 0.02);
  d = smin(d, capsule(x, y, z, [0.085, 0.79, 0.045], [-0.085, 0.575, 0.075], 0.014), 0.012);
  d = smin(d, capsule(x, y, z, [-0.1, 0.785, 0], [0.1, 0.785, 0], 0.042), 0.03);
  d = smin(d, capsule(x, y, z, [0, 0.79, 0], [0, 0.87, 0.008], 0.028, 0.026), 0.02);
  const hx = x - HEAD[0], hy = y - HEAD[1], hz = z - HEAD[2];
  let head = ellipsoid(hx, hy, hz, 0.044, 0.056, 0.05);
  head = smin(head, ellipsoid(hx, hy + 0.035, hz - 0.016, 0.03, 0.026, 0.032), 0.02);
  head = smin(head, ellipsoid(hx, hy + 0.002, hz - 0.05, 0.007, 0.016, 0.01), 0.008);
  head = smin(head, ellipsoid(hx, hy + 0.05, hz + 0.03, 0.05, 0.075, 0.035), 0.02);
  d = smin(d, head, 0.015);
  d = smin(d, capsule(x, y, z, SH_R, EL_R, 0.03, 0.026), 0.02);
  d = smin(d, capsule(x, y, z, EL_R, HA_R, 0.025, 0.02), 0.012);
  d = smin(d, sphere(x - HA_R[0], y - HA_R[1] + 0.005, z - HA_R[2], 0.023), 0.01);
  d = smin(d, capsule(x, y, z, SH_L, EL_L, 0.03, 0.026), 0.02);
  d = smin(d, capsule(x, y, z, EL_L, HA_L, 0.024, 0.02), 0.012);
  d = smin(d, sphere(x - HA_L[0], y - HA_L[1], z - HA_L[2], 0.022), 0.01);
  const ax = x, ay = y - 0.77, az = z - 0.004;
  const aeg = Math.abs(ellipsoid(ax, ay, az, 0.13, 0.06, 0.09)) - 0.006;
  d = smin(d, Math.max(aeg, 0.73 - y), 0.01);
  for (const sx of [-1, 1]) d = smin(d, ellipsoid(x - sx * 0.04, y - 0.012, z - 0.105, 0.022, 0.014, 0.035), 0.01);
  return d;
}

export function goldSdf(x, y, z) {
  const hx = x - HEAD[0], hy = y - HEAD[1], hz = z - HEAD[2];
  const shell = Math.abs(ellipsoid(hx, hy - 0.012, hz + 0.004, 0.054, 0.058, 0.06)) - 0.006;
  const keep = Math.min(0.903 - y, Math.max(z + 0.012, 0.855 - y));
  let d = Math.max(shell, keep);
  d = smin(d, ellipsoid(hx, hy - 0.077, hz + 0.012, 0.011, 0.04, 0.078), 0.012);
  d = smin(d, ellipsoid(hx, hy - 0.035, hz + 0.095, 0.01, 0.06, 0.03), 0.015);
  const brim = Math.max(torusY(hx, hy + 0.012 - 0.0, hz + 0.004, 0.058, 0.005), -hz - 0.02);
  d = Math.min(d, Math.max(brim, Math.abs(hy) - 0.03));
  const belt = torusY(x / 1.0, y - 0.58, z / 0.75, 0.084, 0.008);
  d = Math.min(d, belt);
  d = Math.min(d, ellipsoid(x, y - 0.742, z - 0.075, 0.022, 0.022, 0.008));
  const px = x - SHIELD_C[0], py = y - SHIELD_C[1], pz = z - SHIELD_C[2];
  const u = px * SN[0] + py * SN[1] + pz * SN[2];
  const vx = px - SN[0] * u, vy = py - SN[1] * u, vz = pz - SN[2] * u;
  const vr = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const bulge = 0.035 * (1 - Math.min(1, (vr / SHIELD_R) ** 2));
  let shield = Math.max(vr - SHIELD_R, Math.abs(u - bulge * 0.5) - 0.008 - bulge * 0.5);
  shield = Math.min(shield, Math.sqrt((vr - SHIELD_R) ** 2 + (u - 0.004) ** 2) - 0.011);
  shield = Math.min(shield, Math.sqrt((vr - SHIELD_R * 0.62) ** 2 + (u - 0.024) ** 2) - 0.005);
  shield = smin(shield, Math.sqrt(vr * vr + (u - 0.035) ** 2) - 0.032, 0.012);
  d = Math.min(d, shield);
  d = Math.min(d, torusY(x - HA_R[0], y - (HA_R[1] - 0.04), z - HA_R[2], 0.024, 0.004));
  const hem = Math.max(Math.abs(Math.sqrt(x * x + (z / 0.78) ** 2) - 0.166) - 0.007, Math.abs(y - 0.03) - 0.011);
  d = Math.min(d, hem);
  return d;
}

export const ATHENA_BOUNDS = { min: [-0.3, -0.005, -0.18], max: [0.46, 1.06, 0.32] };
