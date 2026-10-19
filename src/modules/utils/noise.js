import { mulberry32 } from './rng.js';

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

function grad2(h, x, y) {
  switch (h & 7) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    case 3: return -x - y;
    case 4: return x;
    case 5: return -x;
    case 6: return y;
    default: return -y;
  }
}

function grad3(h, x, y, z) {
  const k = h & 15;
  const u = k < 8 ? x : y;
  const v = k < 4 ? y : k === 12 || k === 14 ? x : z;
  return ((k & 1) === 0 ? u : -u) + ((k & 2) === 0 ? v : -v);
}

export function createNoise(seed = 1) {
  const rnd = mulberry32(seed);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  function noise2(x, y) {
    let X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y; X &= 255; Y &= 255;
    const u = fade(x), v = fade(y);
    const a = p[X] + Y, b = p[X + 1] + Y;
    return lerp(
      lerp(grad2(p[a], x, y), grad2(p[b], x - 1, y), u),
      lerp(grad2(p[a + 1], x, y - 1), grad2(p[b + 1], x - 1, y - 1), u),
      v
    ) * 0.7;
  }

  function noise3(x, y, z) {
    let X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z; X &= 255; Y &= 255; Z &= 255;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
    const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(
      lerp(lerp(grad3(p[AA], x, y, z), grad3(p[BA], x - 1, y, z), u),
        lerp(grad3(p[AB], x, y - 1, z), grad3(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad3(p[AA + 1], x, y, z - 1), grad3(p[BA + 1], x - 1, y, z - 1), u),
        lerp(grad3(p[AB + 1], x, y - 1, z - 1), grad3(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w
    );
  }

  function fbm2(x, y, octaves = 5, lac = 2.03, gain = 0.5) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) {
      s += a * noise2(x * f + i * 17.1, y * f - i * 9.3);
      f *= lac; a *= gain;
    }
    return s;
  }

  function ridged2(x, y, octaves = 6, lac = 2.05, gain = 0.5) {
    let s = 0, a = 0.5, f = 1, w = 1;
    for (let i = 0; i < octaves; i++) {
      let n = 1 - Math.abs(noise2(x * f + i * 31.7, y * f + i * 11.9) * 1.4);
      n *= n;
      s += n * a * w;
      w = Math.min(1, n * 1.6);
      f *= lac; a *= gain;
    }
    return s;
  }

  function fbm3(x, y, z, octaves = 4) {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) {
      s += a * noise3(x * f, y * f, z * f);
      f *= 2.02; a *= 0.5;
    }
    return s;
  }

  return { noise2, noise3, fbm2, ridged2, fbm3 };
}
