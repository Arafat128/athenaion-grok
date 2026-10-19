// Vertex wind: a slow trunk sway (gusts travelling across the landscape) plus fast leaf flutter.
// Works on instanced meshes; the sway direction is transformed into each instance's local frame.
export const WIND_DIR = [0.8, 0.6];

export function patchWind(shader, timeUniform, { height = 10, sway = 0.3, flutter = 0.05, power = 2.0 } = {}) {
  shader.uniforms.uWindTime = timeUniform;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
uniform float uWindTime;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  #ifdef USE_INSTANCING
  vec3 iP = instanceMatrix[3].xyz;
  vec3 wl = transpose(mat3(instanceMatrix)) * vec3(${WIND_DIR[0]}, 0.0, ${WIND_DIR[1]});
  #else
  vec3 iP = vec3(0.0);
  vec3 wl = vec3(${WIND_DIR[0]}, 0.0, ${WIND_DIR[1]});
  #endif
  wl = normalize(vec3(wl.x, 0.0, wl.z));
  float hN = clamp(position.y / ${height.toFixed(2)}, 0.0, 1.4);
  float front = dot(iP.xz, vec2(${WIND_DIR[0]}, ${WIND_DIR[1]})) * 0.012;
  float ph = dot(iP.xz, vec2(0.031, 0.047));
  float gust = 0.55 + 0.45 * sin(uWindTime * 0.35 - front) * sin(uWindTime * 0.13 - front * 0.6 + 1.7);
  float sw = (0.6 + 0.4 * sin(uWindTime * 1.3 + ph)) * gust + 0.25 * sin(uWindTime * 2.7 + ph * 1.9);
  float hp = pow(hN, ${power.toFixed(2)});
  transformed += wl * (${sway.toFixed(3)} * sw * hp);
  float fl = sin(uWindTime * 7.0 + dot(position, vec3(2.3, 1.7, 3.1)) + ph) * cos(uWindTime * 5.3 + dot(position, vec3(1.1, 2.9, 0.7)));
  transformed += vec3(1.0, 0.35, 1.0) * (${flutter.toFixed(3)} * fl * gust * hN);
}`);
  return shader;
}
