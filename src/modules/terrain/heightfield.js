import { createNoise } from '../utils/noise.js';
import { clamp, lerp, smoothstep } from '../utils/math.js';

export function createHeightfield(world) {
  const n = createNoise(world.seed);
  const { acropolis: A, lake: L, mesa: M, waterLevel } = world;

  const toLake = { x: L.x - M.x, z: L.z - M.z };
  const tl = Math.hypot(toLake.x, toLake.z);
  const lipDir = { x: toLake.x / tl, z: toLake.z / tl };
  const lip = { x: M.x + lipDir.x * (M.r - 4), z: M.z + lipDir.z * (M.r - 4) };
  const channelLen = 170;

  function acropolisEllipse(x, z) {
    const dx = (x - A.x) / A.rx, dz = (z - A.z) / A.rz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function channelPoint(t) {
    const wob = n.noise2(t * 0.02, 3.3) * 18 * smoothstep(10, 60, t);
    return { x: lip.x - lipDir.x * t - lipDir.z * wob, z: lip.z - lipDir.z * t + lipDir.x * wob };
  }

  function channelDist(x, z) {
    const px = x - lip.x, pz = z - lip.z;
    const t = clamp(-(px * lipDir.x + pz * lipDir.z), 0, channelLen);
    const c = channelPoint(t);
    return Math.hypot(x - c.x, z - c.z);
  }

  function base(x, z) {
    let h = 12 + n.fbm2(x * 0.0019, z * 0.0019, 5) * 30 + n.fbm2(x * 0.011, z * 0.011, 3) * 3.5;
    const d = Math.hypot(x, z);
    const wx = x + n.fbm2(x * 0.0005 + 3.1, z * 0.0005, 3) * 700;
    const wz = z + n.fbm2(x * 0.0005, z * 0.0005 + 7.7, 3) * 700;
    const ridge = n.ridged2(wx * 0.00055, wz * 0.00055, 7, 2.1, 0.45);
    const dirBias = d > 1 ? 0.5 + 0.5 * ((x * -0.62 + z * -0.78) / d) : 0.5;
    const mFactor = smoothstep(800, 3200, d);
    h += mFactor * (260 + 1500 * dirBias * dirBias) * Math.pow(Math.max(ridge, 0), 1.25);
    h += smoothstep(1500, 5000, d) * 260 * (0.6 + 0.4 * dirBias);
    return h;
  }

  const ridgeDir = { x: -0.82, z: -0.57 };
  const ridgeLen = 900;

  function mesaDist(x, z) {
    const px = x - M.x, pz = z - M.z;
    const t = clamp(px * ridgeDir.x + pz * ridgeDir.z, 0, ridgeLen);
    const cx = M.x + ridgeDir.x * t, cz = M.z + ridgeDir.z * t;
    return { d: Math.hypot(x - cx, z - cz), t };
  }

  function heightAt(x, z) {
    let h = base(x, z);
    h = h < 5 ? lerp(5, h, 0.3) : h;

    const ae = acropolisEllipse(x, z);
    h += 30 * Math.pow(1 - smoothstep(0.9, 2.1, ae), 1.5);
    const edge = ae + n.fbm2(x * 0.011, z * 0.011, 4) * 0.13 + n.noise2(x * 0.08, z * 0.08) * 0.02;
    const plateau = 1 - smoothstep(0.93, 1.03, edge);
    const crag = Math.abs(n.noise2(x * 0.045, z * 0.045)) * 9 * smoothstep(0.98, 1.1, edge) * (1 - smoothstep(1.2, 1.5, edge));
    const tq = h / 7 + n.noise2(x * 0.03, z * 0.03) * 0.5;
    h = lerp(h, 7 * (Math.floor(tq) + smoothstep(0.35, 0.65, tq - Math.floor(tq))), 0.4 * smoothstep(1.0, 1.25, edge) * (1 - smoothstep(1.3, 1.6, edge)));
    h = lerp(h + crag, A.top + n.fbm2(x * 0.05, z * 0.05, 2) * 0.35 - Math.max(ae - 0.75, 0) * 4, plateau);

    const lex = (x - L.x) / L.rx, lez = (z - L.z) / L.rz;
    const le = Math.sqrt(lex * lex + lez * lez) + n.fbm2(x * 0.006, z * 0.006, 4) * 0.34;
    const lakeBed = waterLevel - 12 * (1 - Math.min(le * le, 1)) + Math.max(le - 1, 0) * 14;
    h = lerp(h, Math.min(h, lakeBed), 1 - smoothstep(0.95, 1.6, le));

    const { d: md0, t: mt } = mesaDist(x, z);
    const nearLip = smoothstep(18, 70, Math.hypot(x - lip.x, z - lip.z));
    const r = M.r * (1 - 0.35 * smoothstep(0, ridgeLen, mt));
    const md = md0 + (n.fbm2(x * 0.009, z * 0.009, 4) * 60 + n.fbm2(x * 0.04, z * 0.04, 3) * 14 + n.noise2(x * 0.11, z * 0.11) * 4) * nearLip;
    const mm = 1 - smoothstep(r - 4 - 10 * nearLip, r + 2 + 4 * nearLip, md);
    if (mm > 0) {
      const mTop = M.top + n.fbm2(x * 0.01, z * 0.01, 4) * 10 + mt * 0.35 + Math.abs(n.noise2(x * 0.03, z * 0.03)) * 4;
      const cd = channelDist(x, z);
      const top = mTop - 5 * (1 - smoothstep(5, 11, cd));
      const ledge = Math.sin(mm * Math.PI * 3 + n.noise2(x * 0.05, z * 0.05) * 2) * 0.04 * (1 - mm);
      let hv = lerp(h, top, Math.min(1, mm + ledge));
      const tq = hv / 11 + n.noise2(x * 0.02, z * 0.02) * 0.6;
      const terr = 11 * (Math.floor(tq) + smoothstep(0.3, 0.7, tq - Math.floor(tq))) - n.noise2(x * 0.02, z * 0.02) * 6.6;
      hv = lerp(hv, terr, 0.55 * Math.min(1, mm * (1 - mm) * 4) * nearLip);
      h = Math.max(h, hv);
    }
    return h;
  }

  function normalAt(x, z, e = 1.5) {
    const hx = heightAt(x + e, z) - heightAt(x - e, z);
    const hz = heightAt(x, z + e) - heightAt(x, z - e);
    const nx = -hx, ny = 2 * e, nz = -hz;
    const l = Math.hypot(nx, ny, nz);
    return { x: nx / l, y: ny / l, z: nz / l };
  }

  return { heightAt, normalAt, acropolisEllipse, lip, lipDir, channelLen, channelDist, channelPoint, noise: n };
}
