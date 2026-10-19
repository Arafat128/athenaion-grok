import * as THREE from 'three';
import { patchWorld } from './glsl.js';

export function createGoldMaterial({ color = new THREE.Color(1.0, 0.72, 0.32), roughness = 0.26 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, envMapIntensity: 1.3 });
  mat.onBeforeCompile = (shader) => {
    patchWorld(shader, { cavity: true });
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float gn = fbm3(vWPos * 1.7);
  float tarnish = smoothstep(0.55, 0.8, gn) * 0.35 + clamp(vCavity, 0.0, 1.0) * 0.6;
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.45, 0.32, 0.18), tarnish);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
  roughnessFactor = clamp(roughnessFactor + tarnish * 0.35 + (gn - 0.5) * 0.12, 0.08, 1.0);`
      );
  };
  return mat;
}
