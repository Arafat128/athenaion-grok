import * as THREE from 'three';
import { RNG } from '../utils/rng.js';
import { pointsMaterial } from '../water/mist.js';
import { SOFT_LAYER } from './softParticles.js';

export function createDust({ count, timeUniform, light, soft, box = 50, seed = 5 }) {
  const rng = new RNG(seed);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i++) seeds[i] = rng.next();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const mat = pointsMaterial({ timeUniform, light, soft, rainbow: 0, density: 1, extra: { uSize: { value: 0.08 }, uBox: { value: box } }, vertexBody: /* glsl */ `
        vec3 drift = vec3(0.35, 0.06 + 0.1 * aSeed.w, 0.18) * uTime + vec3(sin(uTime * 0.3 + aSeed.x * 40.0), cos(uTime * 0.23 + aSeed.y * 30.0), sin(uTime * 0.17 + aSeed.z * 20.0)) * 0.8;
        vec3 q = aSeed.xyz * ${box.toFixed(1)} + drift - cameraPosition;
        p = cameraPosition + mod(q, ${box.toFixed(1)}) - ${(box / 2).toFixed(1)};
        life = 0.5 + aSeed.w;
        float dc = length(p - cameraPosition);
        vAlpha = 0.3 * smoothstep(${(box / 2).toFixed(1)}, ${(box / 4).toFixed(1)}, dc) * smoothstep(0.6, 2.5, dc);` });
  mat.uniforms.uDensity.value = 1;
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.layers.set(SOFT_LAYER);
  pts.userData.setPixel = (px) => (mat.uniforms.uPixel.value = px);
  return pts;
}
