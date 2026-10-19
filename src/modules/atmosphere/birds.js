import * as THREE from 'three';
import { RNG } from '../utils/rng.js';

function birdGeometry() {
  const p = [], w = [];
  const tri = (a, b, c, wa, wb, wc) => { p.push(...a, ...b, ...c); w.push(wa, wb, wc); };
  tri([0, 0, 0.55], [-0.09, 0, -0.35], [0.09, 0, -0.35], 0, 0, 0);
  tri([0, 0, -0.3], [-0.16, 0, -0.62], [0.16, 0, -0.62], 0, 0, 0);
  for (const s of [-1, 1]) {
    tri([0, 0, 0.18], [s * 0.55, 0, 0.12], [0, 0, -0.18], 0, 0.5, 0);
    tri([s * 0.55, 0, 0.12], [s * 1.0, 0, -0.08], [s * 0.5, 0, -0.14], 0.5, 1, 0.5);
    tri([0, 0, -0.18], [s * 0.55, 0, 0.12], [s * 0.5, 0, -0.14], 0, 0.5, 0.5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute(w, 1));
  return g;
}

export function createBirds({ flocks, timeUniform, light, seed = 11 }) {
  const rng = new RNG(seed);
  const total = flocks.reduce((s, f) => s + f.count, 0);
  const geo = new THREE.InstancedBufferGeometry().copy(birdGeometry());
  const a = new Float32Array(total * 4), b = new Float32Array(total * 4);
  let k = 0;
  for (const f of flocks) {
    for (let i = 0; i < f.count; i++, k++) {
      a.set([f.x, f.y + (rng.next() - 0.5) * f.spread * 0.4, f.z, f.r * (0.7 + 0.6 * rng.next())], k * 4);
      b.set([rng.next() * 6.283, (0.5 + rng.next() * 0.5) * f.speed * (f.cw ? -1 : 1), rng.next(), f.size * (0.8 + 0.4 * rng.next())], k * 4);
    }
  }
  geo.setAttribute('aOrbit', new THREE.InstancedBufferAttribute(a, 4));
  geo.setAttribute('aMotion', new THREE.InstancedBufferAttribute(b, 4));
  geo.instanceCount = total;
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  uniforms.uTime = timeUniform;
  Object.assign(uniforms, light);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute float aWing;
      attribute vec4 aOrbit, aMotion;
      uniform float uTime;
      varying float vShade;
      void main() {
        float ang = aMotion.x + uTime * aMotion.y / aOrbit.w;
        float wob = sin(uTime * 0.31 + aMotion.z * 20.0) * 0.18;
        float r = aOrbit.w * (1.0 + wob);
        vec3 c = aOrbit.xyz + vec3(cos(ang) * r, sin(uTime * 0.4 + aMotion.z * 9.0) * 6.0 + sin(ang * 2.0 + aMotion.z * 5.0) * 10.0, sin(ang) * r * 0.75);
        vec3 fwd = normalize(vec3(-sin(ang), 0.0, cos(ang) * 0.75) * sign(aMotion.y));
        vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
        float flap = sin(uTime * (7.0 + aMotion.z * 4.0) + aMotion.z * 30.0);
        float glide = smoothstep(0.2, 0.6, sin(uTime * 0.5 + aMotion.z * 17.0));
        flap = mix(flap, 0.15, glide);
        vec3 lp = position * aMotion.w;
        lp.y += abs(position.x) * aMotion.w * flap * 0.6 * aWing;
        vec3 p = c + side * lp.x + vec3(0.0, lp.y, 0.0) + fwd * lp.z;
        vShade = 0.6 + 0.4 * aWing;
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uSunColor, uSkyColor;
      varying float vShade;
      void main() {
        gl_FragColor = vec4((uSkyColor * 0.12 + uSunColor * 0.08) * vShade, 1.0);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}
