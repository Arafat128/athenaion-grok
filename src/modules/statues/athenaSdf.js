import { sphere, ellipsoid, capsule, torusY, smin, smax } from './sdf.js';
import { face, hair, corinthianHelmet, peplos, overfold, owl, owlEyes, gorgoneion, aegisSnakes } from './figure.js';

const SH_R = [-0.112, 0.785, 0.0];
const EL_R = [-0.205, 0.855, 0.02];
const HA_R = [-0.222, 0.985, 0.038];
const SH_L = [0.112, 0.785, 0.0];
const EL_L = [0.168, 0.645, 0.03];
const HA_L = [0.205, 0.5, 0.1];
const HEAD = [0, 0.915, 0.008];
const OWL = [-0.118, 0, 0.15];
const GORGON = [0, 0.764, 0.097];

export const SPEAR = { x: HA_R[0], z: HA_R[2], y0: 0.0, y1: 1.3 };

const SHIELD_C = [0.255, 0.27, 0.13];
const SN = (() => {
  const n = [0.78, 0.12, 0.6];
  const l = Math.hypot(...n);
  return n.map((v) => v / l);
})();
const SHIELD_R = 0.2;
const E1 = (() => {
  const v = [SN[2], 0, -SN[0]];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
})();
const E2 = [SN[1] * E1[2] - SN[2] * E1[1], SN[2] * E1[0] - SN[0] * E1[2], SN[0] * E1[1] - SN[1] * E1[0]];

const near = (x, y, z, c, r) => {
  const d = Math.sqrt((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2) - r;
  return d;
};

function fist(x, y, z) {
  const px = x - HA_R[0], pz = z - HA_R[2];
  let d = ellipsoid(px - 0.008, y - HA_R[1] + 0.004, pz + 0.004, 0.017, 0.022, 0.015);
  for (let i = 0; i < 4; i++) {
    const fy = y - (HA_R[1] + 0.013 - i * 0.0085);
    const ring = torusY(px, fy, pz, 0.0118, 0.0043 - i * 0.0003);
    d = smin(d, Math.max(ring, -(px * 0.2 + pz * 0.98) - 0.004), 0.003);
  }
  d = smin(d, capsule(x, y, z, [HA_R[0] + 0.004, HA_R[1] + 0.02, HA_R[2] + 0.012], [HA_R[0] - 0.006, HA_R[1] + 0.022, HA_R[2] + 0.014], 0.0045), 0.004);
  return d;
}

function openHand(x, y, z) {
  let d = ellipsoid(x - HA_L[0], y - HA_L[1], z - HA_L[2], 0.017, 0.022, 0.011);
  for (let i = 0; i < 4; i++) {
    const o = -0.011 + i * 0.0072;
    const a = [HA_L[0] + 0.006, HA_L[1] - 0.016, HA_L[2] + o];
    const b = [HA_L[0] + 0.019, HA_L[1] - 0.038 + Math.abs(i - 1.5) * 0.004, HA_L[2] + o * 1.1];
    d = smin(d, capsule(x, y, z, a, b, 0.0042, 0.0034), 0.003);
  }
  d = smin(d, capsule(x, y, z, [HA_L[0] - 0.006, HA_L[1] - 0.006, HA_L[2] + 0.014], [HA_L[0] - 0.002, HA_L[1] - 0.03, HA_L[2] + 0.022], 0.0045, 0.0036), 0.004);
  return d;
}

function headGroup(x, y, z) {
  const b = near(x, y, z, HEAD, 0.13);
  if (b > 0.02) return b;
  const hx = x - HEAD[0], hy = y - HEAD[1], hz = z - HEAD[2];
  let d = smin(face(hx, hy, hz), hair(hx, hy, hz), 0.006);
  return smin(d, capsule(x, y, z, [0, 0.79, 0], [0, 0.885, 0.01], 0.03, 0.025), 0.016);
}

function aegis(x, y, z) {
  const ax = x, ay = y - 0.77, az = z - 0.004;
  const ang = Math.atan2(ax, az);
  let shell = Math.abs(ellipsoid(ax, ay, az, 0.13, 0.06, 0.09)) - 0.006;
  shell -= 0.0011 * Math.max(0, Math.sin(ang * 46 + ay * 30) * Math.sin(ay * 260 + ang * 4));
  const edge = -0.035 - 0.012 * Math.cos(ang * 2) + 0.006 * Math.sin(ang * 11);
  let d = Math.max(shell, edge - ay);
  if (Math.abs(ay - edge) < 0.03) {
    const k = Math.sqrt(Math.max(0, 1 - ((edge) / 0.06) ** 2));
    d = smin(d, aegisSnakes(ax, ay - edge, az, 0.136 * k, 0.096 * k), 0.003);
  }
  return d;
}

export function marbleSdf(x, y, z) {
  let d = peplos(x, y, z);
  d = smin(d, ellipsoid(x - 0.045, y - 0.3, z - 0.04, 0.062, 0.2, 0.065), 0.05);
  d = smin(d, overfold(x, y, z), 0.012);
  const ta = Math.atan2(x, z);
  d = smin(d, ellipsoid(x, y - 0.67, z, 0.094, 0.13, 0.066) - 0.0022 * Math.abs(Math.sin(ta * 9 + Math.sin(y * 40) * 0.7)), 0.03);
  d = smin(d, ellipsoid(x, y - 0.725, z - 0.016, 0.098, 0.055, 0.066), 0.03);
  for (const sx of [-1, 1]) d = smin(d, ellipsoid(x - sx * 0.042, y - 0.718, z - 0.052, 0.036, 0.03, 0.026), 0.02);
  d = smin(d, capsule(x, y, z, [0.085, 0.79, 0.045], [-0.085, 0.575, 0.075], 0.014) - 0.0015 * Math.sin((x + y) * 220), 0.012);
  d = smin(d, capsule(x, y, z, [-0.1, 0.785, 0], [0.1, 0.785, 0], 0.042), 0.03);
  d = smin(d, headGroup(x, y, z), 0.012);
  d = smin(d, capsule(x, y, z, SH_R, EL_R, 0.03, 0.026), 0.02);
  d = smin(d, capsule(x, y, z, EL_R, [HA_R[0] + 0.002, HA_R[1] - 0.02, HA_R[2]], 0.025, 0.018), 0.012);
  if (near(x, y, z, HA_R, 0.06) < 0.02) d = smin(d, fist(x, y, z), 0.008);
  d = smin(d, capsule(x, y, z, SH_L, EL_L, 0.03, 0.026), 0.02);
  d = smin(d, capsule(x, y, z, EL_L, [HA_L[0] - 0.004, HA_L[1] + 0.018, HA_L[2] - 0.004], 0.024, 0.017), 0.012);
  if (near(x, y, z, HA_L, 0.07) < 0.02) d = smin(d, openHand(x, y, z), 0.008);
  d = smin(d, aegis(x, y, z), 0.008);
  for (const sx of [-1, 1]) d = smin(d, ellipsoid(x - sx * 0.04, y - 0.012, z - 0.105, 0.022, 0.014, 0.035), 0.01);
  d = Math.min(d, owl(x - OWL[0], y - OWL[1], z - OWL[2]));
  return d;
}

export function goldSdf(x, y, z) {
  let d = 1;
  if (near(x, y, z, HEAD, 0.15) < 0.02) d = corinthianHelmet(x - HEAD[0], y - HEAD[1], z - HEAD[2]);
  else d = near(x, y, z, HEAD, 0.15);
  d = Math.min(d, torusY(x, y - 0.58, z / 0.75, 0.084, 0.008));
  d = Math.min(d, gorgoneion(x - GORGON[0], y - GORGON[1], z - GORGON[2]));
  const px = x - SHIELD_C[0], py = y - SHIELD_C[1], pz = z - SHIELD_C[2];
  const u = px * SN[0] + py * SN[1] + pz * SN[2];
  const vx = px - SN[0] * u, vy = py - SN[1] * u, vz = pz - SN[2] * u;
  const vr = Math.sqrt(vx * vx + vy * vy + vz * vz);
  const bulge = 0.035 * (1 - Math.min(1, (vr / SHIELD_R) ** 2));
  let shield = Math.max(vr - SHIELD_R, Math.abs(u - bulge * 0.5) - 0.008 - bulge * 0.5);
  shield = Math.min(shield, Math.sqrt((vr - SHIELD_R) ** 2 + (u - 0.004) ** 2) - 0.011);
  shield = Math.min(shield, Math.sqrt((vr - SHIELD_R * 0.62) ** 2 + (u - 0.024) ** 2) - 0.005);
  if (vr < SHIELD_R * 0.6 && u > -0.02 && u < 0.09) {
    const a = (vx * E1[0] + vy * E1[1] + vz * E1[2]) / 1.9, b = (vx * E2[0] + vy * E2[1] + vz * E2[2]) / 1.9 + 0.047;
    shield = smin(shield, owl(a, b, (u - 0.036) / 1.2) * 1.9 * 0.5, 0.006);
  }
  const bead = Math.atan2(vx * E2[0] + vy * E2[1] + vz * E2[2], vx * E1[0] + vy * E1[1] + vz * E1[2]);
  const bk = Math.round(bead / (Math.PI / 24)) * (Math.PI / 24);
  shield = Math.min(shield, Math.hypot(vr * Math.cos(bead - bk) - SHIELD_R * 0.78, vr * Math.sin(bead - bk), u - 0.02) - 0.0055);
  d = Math.min(d, shield);
  d = Math.min(d, torusY(x - HA_R[0], y - (HA_R[1] - 0.034), z - HA_R[2], 0.021, 0.004));
  if (Math.abs(y - 0.035) < 0.03) d = Math.min(d, Math.max(Math.abs(peplos(x, y, z) - 0.003) - 0.003, Math.abs(y - 0.035) - 0.01));
  d = Math.min(d, owlEyes(x - OWL[0], y - OWL[1], z - OWL[2]));
  return d;
}

export const ATHENA_BOUNDS = { min: [-0.3, -0.005, -0.18], max: [0.46, 1.06, 0.32] };
export const ATHENA_DETAIL = [
  { min: [-0.075, 0.835, -0.1], max: [0.075, 1.035, 0.095], factor: 3 },
  { min: [-0.252, 0.95, 0.008], max: [-0.19, 1.02, 0.072], factor: 2.5 },
  { min: [0.18, 0.455, 0.075], max: [0.232, 0.53, 0.135], factor: 2.5 },
  { min: [-0.15, -0.002, 0.125], max: [-0.086, 0.095, 0.178], factor: 2.5 },
  { min: [-0.032, 0.73, 0.08], max: [0.032, 0.8, 0.12], factor: 3 },
];
