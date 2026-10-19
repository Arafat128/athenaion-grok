import * as THREE from 'three';
import { patchWorld } from './glsl.js';

export function createAshlarMaterial({ color = new THREE.Color(0.55, 0.5, 0.42), block = new THREE.Vector2(2.4, 1.1) } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  mat.onBeforeCompile = (shader) => {
    patchWorld(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  vec3 wn = normalize(vWNormal);
  float along = abs(wn.x) > abs(wn.z) ? vWPos.z : vWPos.x;
  vec2 bc = vec2(along / ${block.x.toFixed(2)}, vWPos.y / ${block.y.toFixed(2)});
  bc.x += floor(bc.y) * 0.5 + hash13(vec3(floor(bc.y), 2.0, 7.0)) * 0.3;
  vec2 bf = abs(fract(bc) - 0.5);
  float joint = smoothstep(0.43, 0.49, max(bf.x * 1.0, bf.y));
  if (wn.y > 0.7) joint = 0.0;
  vec3 cell = floor(vec3(bc, 3.0));
  float tone = 0.78 + 0.3 * hash13(cell);
  float sn = fbm3(vWPos * 0.8);
  vec3 col = diffuseColor.rgb * tone * (0.8 + 0.35 * sn);
  col = mix(col, vec3(0.32, 0.31, 0.24), smoothstep(0.6, 0.75, fbm3(vWPos * 0.25 + 5.0)) * 0.5);
  col *= 1.0 - joint * 0.6;
  diffuseColor.rgb = col;
  float sBump = sn * 0.6 - joint * 0.5;`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = bumpNormal(-vViewPosition, normal, sBump, 1.2, faceDirection);`
      );
  };
  return mat;
}
