import * as THREE from 'three';
import { patchWorld } from '../materials/glsl.js';

export function createStream(field, world, timeUniform) {
  const pts = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) pts.push(field.channelPoint((i / steps) * field.channelLen));
  const pos = [], uv = [], idx = [];
  const width = 9;
  let dist = 0;
  for (let i = 0; i <= steps; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(steps, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    const nx = -dz / l, nz = dx / l;
    if (i > 0) dist += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    let y = Infinity;
    for (const o of [-2, 0, 2]) y = Math.min(y, field.heightAt(pts[i].x + nx * o, pts[i].z + nz * o));
    y = Math.max(y + 1.4, i === 0 ? y + 1.4 : y + 1.4);
    for (const s of [-1, 1]) {
      pos.push(pts[i].x + nx * width * s, y, pts[i].z + nz * width * s);
      uv.push(s * 0.5 + 0.5, dist);
    }
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.03, 0.07, 0.08), roughness: 0.08, envMapIntensity: 1.3 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    patchWorld(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float sf = fbm3(vec3(vWPos.xz * 0.35, uTime * 0.6) + vec3(0.0, 0.0, 0.0));
  float flow = fbm3(vec3(vWPos.x * 0.5, vWPos.z * 0.5, 0.0) + vec3(-uTime * 0.8, 0.0, uTime * 0.3));
  float foamS = smoothstep(0.62, 0.8, flow);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.8, 0.82), foamS * 0.5);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = bumpNormal(-vViewPosition, normal, sf + flow, 0.5, faceDirection);`
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
