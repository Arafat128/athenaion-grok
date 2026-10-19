import * as THREE from 'three';
import { drawOwlBanner } from './owlEmblem.js';

export function createBannerMaterial(timeUniform) {
  const tex = new THREE.CanvasTexture(drawOwlBanner());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    roughness: 0.75,
    metalness: 0.0,
    sheen: 0.6,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0.5, 0.55, 0.8),
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  float hang = clamp(1.0 - uv.y, 0.0, 1.0);
  vec3 ip = vec3(0.0);
  #ifdef USE_INSTANCING
  ip = instanceMatrix[3].xyz;
  #endif
  float ph = dot(ip, vec3(0.13, 0.0, 0.09));
  transformed.z += (sin(uTime * 1.7 + position.y * 0.9 + ph) * 0.35 + sin(uTime * 2.9 + position.x * 2.0 + position.y * 1.7 + ph) * 0.12) * hang * hang;
  transformed.x += sin(uTime * 1.1 + position.y * 0.6 + ph) * 0.08 * hang;`
      );
  };
  return mat;
}
