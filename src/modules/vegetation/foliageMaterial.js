import * as THREE from 'three';
import { patchWorld } from '../materials/glsl.js';

export function createFoliageMaterial({ roughness = 0.85, bump = 2.5, freq = 1.1 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    patchWorld(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float fn = fbm3lo(vWPos * ${freq.toFixed(2)});
  float fc = vnoise(vWPos * ${(freq * 4).toFixed(2)});
  diffuseColor.rgb *= (0.35 + 1.1 * fn) * (0.55 + 0.7 * fc);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = bumpNormal(-vViewPosition, normal, fn + fc * 0.3, ${bump.toFixed(2)}, faceDirection);`
      );
  };
  return mat;
}
