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
vec3 heightFogApply(vec3 color, vec3 worldPos) {
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
  vec3 T = exp(-optical * vec3(0.78, 0.95, 1.22));
  float mu = dot(dir, ${v3(sunDir)});
  float g = 0.72;
  float mie = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5) * 0.08;
  float ray2 = 0.75 * (1.0 + mu * mu);
  vec3 sunC = ${c3(fogSun)};
  vec3 ins = fogColor * (0.82 + 0.18 * ray2) + sunC * mie * 0.9;
  ins = mix(ins, mix(fogColor, sunC * 1.2, 0.6), pow(max(mu, 0.0), 6.0) * 0.5);
  return color * T + ins * (1.0 - T);
}
#endif`;
  C.fog_fragment = /* glsl */ `
#ifdef USE_FOG
gl_FragColor.rgb = heightFogApply(gl_FragColor.rgb, vFogWorld);
#endif`;
}
