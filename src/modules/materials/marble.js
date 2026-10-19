import * as THREE from 'three';
import { patchWorld } from './glsl.js';

export function createMarbleMaterial({
  color = new THREE.Color(0.86, 0.82, 0.74),
  veinColor = new THREE.Color(0.5, 0.48, 0.47),
  scale = 0.45,
  groundY = 0,
  weathering = 1,
  bump = 0.6,
  roughness = 0.55,
  tiles = 0,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const key = `marble:${[veinColor.getHexString(), scale, weathering, bump, tiles].join(':')}`;
  mat.customProgramCacheKey = () => key;
  mat.userData.uniforms = { uGroundY: { value: groundY } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, mat.userData.uniforms);
    patchWorld(shader, { cavity: true });
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGroundY;')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  vec3 wn = normalize(vWNormal);
  vec3 mp = vWPos * ${scale.toFixed(3)};
  float mn = fbm3(mp);
  float vein = abs(sin((mp.x * 0.7 + mp.y * 1.2 + mp.z * 0.5) * 1.6 + mn * 10.0));
  vein = pow(1.0 - vein, 14.0) + pow(1.0 - abs(sin(mp.y * 3.1 + mp.x * 2.0 + mn * 18.0)), 30.0) * 0.5;
  float grain = vnoise(vWPos * 9.0);
  vec3 col = diffuseColor.rgb * (0.93 + 0.1 * grain + 0.06 * fbm3lo(mp * 4.0));
  col = mix(col, ${'vec3(' + veinColor.r.toFixed(3) + ',' + veinColor.g.toFixed(3) + ',' + veinColor.b.toFixed(3) + ')'}, clamp(vein, 0.0, 1.0) * 0.45);
  float pat = smoothstep(0.35, 0.8, fbm3(vWPos * 0.09 + 3.0));
  col *= mix(vec3(1.0), vec3(0.9, 0.8, 0.66), pat * 0.75 * ${weathering.toFixed(2)});
  float streak = fbm3lo(vec3(vWPos.x * 2.2, vWPos.y * 0.12, vWPos.z * 2.2));
  float vertical = 1.0 - wn.y * wn.y;
  col *= 1.0 - 0.32 * smoothstep(0.45, 0.75, streak) * vertical * ${weathering.toFixed(2)};
  float lowGrime = 1.0 - smoothstep(0.0, 2.2, vWPos.y - uGroundY + mn * 1.2);
  col *= 1.0 - 0.35 * lowGrime * ${weathering.toFixed(2)};
  col *= 1.0 - 0.55 * clamp(vCavity, 0.0, 1.0) * ${weathering.toFixed(2)};
  float lichen = smoothstep(0.62, 0.72, fbm3(vWPos * 0.6 + 11.0)) * smoothstep(0.3, 0.9, wn.y + 0.4) * ${weathering.toFixed(2)};
  col = mix(col, vec3(0.42, 0.4, 0.3), lichen * 0.35);
  ${tiles > 0 ? `
  vec2 tc = vWPos.xz / ${tiles.toFixed(2)} + vec2(0.0, floor(vWPos.x / ${tiles.toFixed(2)}) * 0.5);
  vec2 tf = abs(fract(tc) - 0.5);
  float joint = smoothstep(0.47, 0.495, max(tf.x, tf.y)) * step(0.7, wn.y);
  col *= 1.0 - joint * 0.45;
  col *= 0.9 + 0.2 * hash13(floor(vec3(tc, 1.0)));` : ''}
  diffuseColor.rgb = col;
  float mBump = mn * 0.5 + grain * 0.12 + streak * 0.2;`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor + (pat * 0.25 + lowGrime * 0.2 - grain * 0.08) * ${weathering.toFixed(2)}, 0.15, 1.0);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = bumpNormal(-vViewPosition, normal, mBump, ${bump.toFixed(3)}, faceDirection);`
      );
  };
  return mat;
}

export function createPaintedMaterial(color, opts = {}) {
  return createMarbleMaterial({ color, veinColor: color.clone().multiplyScalar(0.7), weathering: 0.8, roughness: 0.7, ...opts });
}
