import * as THREE from 'three';
import { RNG } from '../utils/rng.js';

function pointsMaterial(timeUniform, sunColor, defines, uniformsExtra, vertexBody) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    { uSunColor: { value: sunColor.clone() }, uPixel: { value: 1000 }, ...uniformsExtra },
  ]);
  uniforms.uTime = timeUniform;
  return new THREE.ShaderMaterial({
    uniforms,
    defines,
    transparent: true,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute vec4 aSeed;
      uniform float uTime, uPixel;
      uniform vec3 uTop, uDir, uSide;
      uniform float uDrop, uSize;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vSeed = aSeed.x;
        vec3 p;
        float life;
        ${vertexBody}
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = min(uSize * life * uPixel / -mvPosition.z, 512.0);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uSunColor;
      varying float vAlpha;
      varying float vSeed;
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(q, q);
        if (r2 > 1.0) discard;
        float a = exp(-r2 * 3.5) * (1.0 - r2) * vAlpha;
        vec3 col = vec3(0.82, 0.87, 0.92) * (0.75 + uSunColor * 0.7);
        gl_FragColor = vec4(col, a);
        #include <fog_fragment>
      }`,
  });
}

export function createMist(frame, { count, timeUniform, sunColor, seed = 21 }) {
  const rng = new RNG(seed);
  const group = new THREE.Group();
  const shared = {
    uTop: { value: frame.top.clone() },
    uDir: { value: frame.dir.clone() },
    uSide: { value: frame.side.clone() },
    uDrop: { value: frame.drop },
  };
  const mk = (n) => {
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) seeds[i] = rng.next();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    return g;
  };
  const mistMat = pointsMaterial(timeUniform, sunColor, {}, { ...THREE.UniformsUtils.clone(shared), uSize: { value: 20 } }, /* glsl */ `
        float t = fract(uTime * (0.025 + aSeed.w * 0.03) + aSeed.x);
        float off = 1.5 + 2.2 * sqrt(uDrop);
        vec3 base = uTop + uDir * off;
        base.y = uTop.y - uDrop;
        float ang = aSeed.y * 6.2831;
        float rad = (4.0 + 30.0 * t) * sqrt(aSeed.z);
        p = base + uSide * cos(ang) * rad * 1.3 + uDir * (sin(ang) * rad + t * 18.0);
        p.y += t * (14.0 + aSeed.z * 40.0) + 1.5;
        life = 0.5 + 1.8 * t;
        vAlpha = sin(t * 3.14159) * 0.045;`);
  const mist = new THREE.Points(mk(count), mistMat);
  const sprayMat = pointsMaterial(timeUniform, sunColor, {}, { ...THREE.UniformsUtils.clone(shared), uSize: { value: 4.5 } }, /* glsl */ `
        float t = fract(uTime * (0.18 + aSeed.w * 0.12) + aSeed.x);
        float f = uDrop * pow(t, 0.75);
        float w = 9.0 + 8.0 * pow(f / uDrop, 0.8);
        float u = (aSeed.y * 2.0 - 1.0);
        p = uTop + uDir * (1.5 + 2.2 * sqrt(f) + aSeed.z * 6.0 * t) + uSide * u * w * (1.0 + 0.25 * t);
        p.y = uTop.y - f;
        life = 0.6 + t;
        vAlpha = smoothstep(0.0, 0.1, t) * (1.0 - t) * 0.16;`);
  const spray = new THREE.Points(mk(Math.round(count * 1.5)), sprayMat);
  for (const o of [mist, spray]) {
    o.frustumCulled = false;
    o.renderOrder = 4;
    group.add(o);
  }
  group.userData.setPixel = (px) => {
    mistMat.uniforms.uPixel.value = px;
    sprayMat.uniforms.uPixel.value = px;
  };
  return group;
}
