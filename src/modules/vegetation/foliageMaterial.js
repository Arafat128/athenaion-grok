import * as THREE from 'three';
import { patchWorld } from '../materials/glsl.js';
import { patchWind } from './wind.js';

export function createFoliageMaterial({ roughness = 0.85, bump = 2.5, freq = 1.1, timeUniform = null, wind = null, sheen = 0.0 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    patchWorld(shader);
    if (timeUniform && wind) patchWind(shader, timeUniform, wind);
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
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  // silvery leaf undersides catch grazing light (olive sheen)
  totalEmissiveRadiance += diffuseColor.rgb * ${sheen.toFixed(3)} * pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);`
      );
  };
  mat.customProgramCacheKey = () => `foliage-${freq}-${bump}-${JSON.stringify(wind)}-${sheen}`;
  return mat;
}
