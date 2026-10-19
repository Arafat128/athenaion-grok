import * as THREE from 'three';
import { patchWorld } from '../materials/glsl.js';

export function createStream(field, world, timeUniform) {
  const pts = [];
  const steps = 160;
  for (let i = 0; i <= steps; i++) pts.push(field.channelPoint((i / steps) * field.channelLen));
  const pos = [], uv = [], idx = [], speed = [];
  let prevY = null;
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
    const seg = i > 0 ? Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z) : 1;
    const sp = prevY === null ? 0.2 : Math.min(1, Math.max(0.05, (prevY - y) / Math.max(seg, 0.1) * 6));
    prevY = y;
    for (const s of [-1, 1]) {
      pos.push(pts[i].x + nx * width * s, y, pts[i].z + nz * width * s);
      uv.push(s * 0.5 + 0.5, dist);
      speed.push(sp);
    }
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aSpeed', new THREE.Float32BufferAttribute(speed, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.03, 0.07, 0.08), roughness: 0.08, envMapIntensity: 1.3 });
  // Flow-mapped surface: two noise phases scrolled along the channel's own (u across, v along)
  // coordinates and cross-faded, so ripples always travel downstream without stretching.
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = timeUniform;
    patchWorld(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSpeed;\nvarying vec2 vFlowUv;\nvarying float vSpeed;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlowUv = uv; vSpeed = aSpeed;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vFlowUv;\nvarying float vSpeed;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float spd = 0.7 + vSpeed * 4.0;
  float ph0 = fract(uTime * 0.25), ph1 = fract(uTime * 0.25 + 0.5);
  float blend = abs((0.5 - ph0) / 0.5);
  vec2 fu = vec2(vFlowUv.x * ${(width * 2).toFixed(1)}, vFlowUv.y);
  float n0 = fbm3(vec3(fu.x * 0.4, (fu.y - ph0 * spd * 4.0) * 0.4, 1.3));
  float n1 = fbm3(vec3(fu.x * 0.4 + 7.3, (fu.y - ph1 * spd * 4.0) * 0.4, 4.1));
  float fl = mix(n0, n1, blend);
  float d0 = fbm3(vec3(fu.x * 1.3, (fu.y - ph0 * spd * 4.0) * 1.1, 9.0));
  float d1 = fbm3(vec3(fu.x * 1.3 + 3.1, (fu.y - ph1 * spd * 4.0) * 1.1, 2.0));
  float fd = mix(d0, d1, blend);
  float across = min(vFlowUv.x, 1.0 - vFlowUv.x);
  float bank = 1.0 - smoothstep(0.0, 0.16, across + (fd - 0.5) * 0.08);
  float foamS = max(bank * smoothstep(0.45, 0.7, fl + fd * 0.3), smoothstep(0.6, 0.78, fl * 0.7 + fd * 0.5) * smoothstep(0.15, 0.6, vSpeed));
  vec3 shallowC = vec3(0.06, 0.16, 0.14), deepC = vec3(0.015, 0.045, 0.055);
  diffuseColor.rgb = mix(shallowC, deepC, smoothstep(0.05, 0.4, across));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.82, 0.84), clamp(foamS, 0.0, 1.0) * 0.75);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = bumpNormal(-vViewPosition, normal, fl + fd * 0.5, 0.6 + vSpeed, faceDirection);`
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.06, 0.6, clamp(foamS, 0.0, 1.0));');
  };
  mat.customProgramCacheKey = () => 'stream-flow';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
