import * as THREE from 'three';

const v3 = (v) => `vec3(${v.x.toFixed(5)}, ${v.y.toFixed(5)}, ${v.z.toFixed(5)})`;
const c3 = (c) => `vec3(${c.r.toFixed(5)}, ${c.g.toFixed(5)}, ${c.b.toFixed(5)})`;

export function installHeightFog({ sunDir, fogSun, fogFalloff, fogBase }) {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
varying float vFogDepth;
varying vec3 vFogWorld;
#endif`;
  C.fog_vertex = /* glsl */ `
#ifdef USE_FOG
vFogDepth = -mvPosition.z;
vFogWorld = (inverse(viewMatrix) * mvPosition).xyz;
#endif`;
  C.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
uniform vec3 fogColor;
varying float vFogDepth;
varying vec3 vFogWorld;
#ifdef FOG_EXP2
uniform float fogDensity;
#else
uniform float fogNear;
uniform float fogFar;
#endif
vec4 heightFog(vec3 worldPos) {
  vec3 ray = worldPos - cameraPosition;
  float dist = length(ray);
  vec3 dir = ray / max(dist, 1e-4);
  float b = ${fogFalloff.toFixed(6)};
  #ifdef FOG_EXP2
  float a = fogDensity;
  #else
  float a = 0.0003;
  #endif
  float fy = dir.y * b * dist;
  float shape = abs(fy) > 1e-4 ? (1.0 - exp(-fy)) / fy : 1.0;
  float optical = a * exp(-(cameraPosition.y - ${fogBase.toFixed(2)}) * b) * dist * shape;
  float f = 1.0 - exp(-optical);
  float s = max(dot(dir, ${v3(sunDir)}), 0.0);
  vec3 col = mix(fogColor, ${c3(fogSun)} * 1.25, pow(s, 5.0) * 0.75);
  return vec4(col, clamp(f, 0.0, 1.0));
}
#endif`;
  C.fog_fragment = /* glsl */ `
#ifdef USE_FOG
vec4 hf = heightFog(vFogWorld);
gl_FragColor.rgb = mix(gl_FragColor.rgb, hf.rgb, hf.a);
#endif`;
}
