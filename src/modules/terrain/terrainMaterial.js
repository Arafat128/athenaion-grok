import * as THREE from 'three';
import { patchWorld } from '../materials/glsl.js';

export function createTerrainMaterial(world) {
  const A = world.acropolis;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    patchWorld(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
  vec3 wp = vWPos;
  float onAcroB = 0.0, acroBump = 0.0;
  vec3 wn = normalize(vWNormal);
  float slope = 1.0 - wn.y;
  float n1 = fbm3(wp * 0.006);
  float n2 = fbm3(wp * 0.09);
  float camDist = length(wp - cameraPosition);
  float lod = 1.0 - smoothstep(250.0, 1400.0, camDist);
  float n3 = mix(0.5, vnoise(wp * 1.3), lod);
  float detail = mix(0.45, fbm3lo(wp * 0.7), lod);
  vec3 grassA = vec3(0.06, 0.085, 0.03);
  vec3 grassB = vec3(0.19, 0.17, 0.075);
  float speck = mix(0.5, vnoise(wp * 4.0), lod);
  vec3 grass = mix(grassA, grassB, smoothstep(0.38, 0.62, n1 + (n2 - 0.5) * 0.3)) * (0.7 + 0.6 * n2) * (0.75 + 0.5 * detail) * (0.85 + 0.3 * speck);
  vec3 dirt = vec3(0.25, 0.19, 0.12) * (0.8 + 0.4 * n2);
  vec3 rockA = vec3(0.2, 0.185, 0.165);
  vec3 rockB = vec3(0.44, 0.4, 0.34);
  vec2 hz = abs(wn.x) > abs(wn.z) ? wp.zy : wp.xy;
  float fiss = fbm3(vec3(hz.x * 0.22, hz.y * 0.05, 1.0)) * 0.65 + mix(0.5, fbm3(vec3(hz.x * 0.9, hz.y * 0.3, 4.0)), lod) * 0.35;
  float varnish = smoothstep(0.45, 0.75, fbm3(vec3(hz.x * 0.12, hz.y * 0.012, 7.0)));
  vec3 rock = mix(rockA, rockB, smoothstep(0.25, 0.75, n2 * 0.5 + fiss * 0.7)) * (0.8 + 0.3 * n3);
  rock *= 1.0 - 0.45 * varnish * smoothstep(0.3, 0.6, slope);
  rock *= 0.9 + 0.1 * sin(wp.y * 0.6 + fiss * 6.0);
  rock = mix(rock, vec3(0.3, 0.27, 0.18), smoothstep(0.6, 0.75, fbm3(wp * 0.15 + 9.0)) * 0.35);
  float rockMask = smoothstep(0.24, 0.42, slope + (n2 - 0.5) * 0.3);
  rockMask = max(rockMask, smoothstep(320.0, 520.0, wp.y + (n1 - 0.5) * 200.0) * 0.85);
  vec3 col = mix(grass, dirt, smoothstep(0.5, 0.75, n2 + n1 * 0.3) * 0.7);
  float shore = 1.0 - smoothstep(${(world.waterLevel + 0.4).toFixed(2)}, ${(world.waterLevel + 3.5).toFixed(2)}, wp.y + n3 * 0.8);
  col = mix(col, vec3(0.42, 0.37, 0.28) * (0.8 + 0.3 * n3), shore);
  col = mix(col, vec3(0.18, 0.16, 0.12), 1.0 - smoothstep(${(world.waterLevel - 3).toFixed(2)}, ${world.waterLevel.toFixed(2)}, wp.y));
  col = mix(col, rock, rockMask);
  vec2 ae = (wp.xz - vec2(${A.x.toFixed(1)}, ${A.z.toFixed(1)})) / vec2(${A.rx.toFixed(1)}, ${A.rz.toFixed(1)});
  float onAcro = (1.0 - smoothstep(0.9, 1.0, length(ae))) * smoothstep(${(A.top - 3).toFixed(1)}, ${(A.top - 0.5).toFixed(1)}, wp.y);
  float worn = fbm3(wp * 0.05 + 2.0);
  float patchN = fbm3(wp * 0.012 + 3.0);
  float crack = 1.0 - smoothstep(0.0, mix(0.025, 0.012, lod), abs(fbm3(wp * 0.11 + 11.0) - 0.5));
  float pebble = mix(0.5, vnoise(wp * 2.6), lod);
  vec3 acroCol = mix(vec3(0.5, 0.39, 0.25), vec3(0.7, 0.58, 0.42), smoothstep(0.3, 0.7, worn));
  acroCol = mix(acroCol, vec3(0.6, 0.42, 0.24), smoothstep(0.5, 0.68, patchN) * 0.7);
  acroCol = mix(acroCol, vec3(0.3, 0.26, 0.2), smoothstep(0.35, 0.2, patchN) * 0.55);
  acroCol *= (0.7 + 0.45 * n2) * (0.78 + 0.4 * detail) * (0.85 + 0.3 * pebble);
  acroCol *= 1.0 - 0.3 * crack * lod;
  acroCol = mix(acroCol, grass * 1.3, smoothstep(0.6, 0.72, fbm3(wp * 0.03 + 5.0)) * 0.8);
  onAcroB = onAcro;
  acroBump = crack * 0.5 + pebble * 0.5;
  col = mix(col, acroCol, onAcro);
  float snowLine = 760.0 + (n1 - 0.5) * 300.0;
  float tSnow = smoothstep(snowLine, snowLine + 90.0, wp.y) * (1.0 - smoothstep(0.5, 0.78, slope + (n2 - 0.5) * 0.35));
  col = mix(col, vec3(0.88, 0.91, 0.97) * (0.94 + 0.06 * n3), tSnow);
  diffuseColor.rgb = col;
  float tBump = (detail * (1.0 - tSnow * 0.7) + n3 * 0.15 + (fiss * 1.6 - varnish * 0.3) * rockMask - acroBump * onAcroB * 0.6) * (0.25 + 0.75 * lod);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
  roughnessFactor = mix(0.95, 0.5, tSnow) - rockMask * 0.1;`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = bumpNormal(-vViewPosition, normal, tBump, 0.9 * (0.4 + rockMask), faceDirection);`
      );
  };
  return mat;
}
