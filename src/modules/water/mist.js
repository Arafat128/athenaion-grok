import * as THREE from 'three';
import { RNG } from '../utils/rng.js';
import { SOFT_GLSL, SOFT_LAYER } from '../atmosphere/softParticles.js';
import { NOISE_GLSL } from '../materials/glsl.js';

const PREMULT = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };

export function pointsMaterial({ timeUniform, light, soft, extra, vertexBody, rainbow = 0, density = 1 }) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    { uPixel: { value: 1000 }, uRainbow: { value: rainbow }, uDensity: { value: density }, ...extra },
  ]);
  uniforms.uTime = timeUniform;
  Object.assign(uniforms, light, soft);
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: true,
    ...PREMULT,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute vec4 aSeed;
      uniform float uTime, uPixel;
      uniform vec3 uTop, uDir, uSide;
      uniform float uDrop, uSize, uWidth;
      varying float vAlpha, vSeed, vViewZ, vRad;
      varying vec3 vW;
      void main() {
        vSeed = aSeed.x;
        vec3 p;
        float life;
        ${vertexBody}
        vW = p;
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        vViewZ = mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        float px = uSize * life * uPixel / -mvPosition.z;
        vRad = uSize * life * 0.5;
        vAlpha *= smoothstep(0.5, 3.0, px);
        gl_PointSize = clamp(px, 1.0, 384.0);
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uSunColor, uSunDir, uSkyColor, uGroundColor;
      uniform float uRainbow, uDensity;
      varying float vAlpha, vSeed, vViewZ, vRad;
      varying vec3 vW;
      ${SOFT_GLSL}
      ${NOISE_GLSL}
      vec3 spectrum(float h) {
        return clamp(abs(fract(h + vec3(0.0, 0.6667, 0.3333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
      }
      void main() {
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(q, q);
        if (r2 > 1.0) discard;
        float nz = vnoise(vec3(gl_PointCoord * 3.2 + vSeed * 37.0, vSeed * 11.0)) * 0.65 + vnoise(vec3(gl_PointCoord * 7.0 + vSeed * 13.0, 3.0)) * 0.35;
        float shape = exp(-r2 * 3.0) * (1.0 - r2) * smoothstep(0.15, 0.75, nz + 0.35 * (1.0 - r2));
        float a = shape * vAlpha * uDensity;
        float zc = vViewZ + sqrt(1.0 - r2) * vRad;
        a *= softFade(zc, max(vRad * 0.8, 1.5));
        a *= smoothstep(0.5, 6.0, -vViewZ);
        if (a < 0.0005) discard;
        vec3 v = normalize(vW - cameraPosition);
        float mu = dot(v, uSunDir);
        float g = 0.55;
        float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5) / 12.566;
        float back = 0.08 * (1.0 + 0.4 * mu * mu);
        float self = 0.55 + 0.45 * (1.0 - shape);
        vec3 col = uSkyColor * 0.85 + uGroundColor * 0.2 + uSunColor * (hg * 2.6 + back + 0.28) * self;
        if (uRainbow > 0.0) {
          float th = degrees(acos(clamp(-mu, -1.0, 1.0)));
          float band = smoothstep(39.4, 40.6, th) * (1.0 - smoothstep(41.8, 42.6, th));
          col += spectrum(0.78 - (th - 40.0) / 2.6 * 0.78) * band * uRainbow * uSunColor;
        }
        vec4 outc = vec4(col, 1.0);
        #ifdef USE_FOG
        outc.rgb = heightFogApply(outc.rgb, vFogWorld);
        #endif
        gl_FragColor = vec4(outc.rgb * a, a);
      }`,
  });
}

export function createMist(frame, { count, timeUniform, light, soft, seed = 21, width = 9, widthGrow = 8, scale = 1, rainbow = 0.35 }) {
  const rng = new RNG(seed);
  const group = new THREE.Group();
  const shared = () => ({
    uTop: { value: frame.top.clone() },
    uDir: { value: frame.dir.clone() },
    uSide: { value: frame.side.clone() },
    uDrop: { value: frame.drop },
    uWidth: { value: width },
  });
  const mk = (n) => {
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) seeds[i] = rng.next();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    return g;
  };
  const off = (frame.offset ?? 1.5).toFixed(2), k = (frame.throwK ?? 2.2).toFixed(3);
  const mistMat = pointsMaterial({ timeUniform, light, soft, rainbow, extra: { ...shared(), uSize: { value: 22 * scale } }, vertexBody: /* glsl */ `
        float t = fract(uTime * (0.02 + aSeed.w * 0.025) + aSeed.x);
        vec3 base = uTop + uDir * (${off} + ${k} * sqrt(uDrop));
        base.y = uTop.y - uDrop;
        float ang = aSeed.y * 6.2831;
        float rad = (uWidth * 0.5 + uWidth * 3.6 * t) * sqrt(aSeed.z);
        p = base + uSide * cos(ang) * rad * 1.5 + uDir * (sin(ang) * rad * 0.9 + t * uWidth * 2.8);
        p.y += t * (uWidth * 0.9 + aSeed.z * uWidth * 2.2) * (0.6 + aSeed.w) + 0.5;
        life = 0.45 + 1.5 * t;
        vAlpha = sin(t * 3.14159) * 0.085;` });
  const sprayMat = pointsMaterial({ timeUniform, light, soft, rainbow: rainbow * 1.6, extra: { ...shared(), uSize: { value: 3.2 * scale } }, vertexBody: /* glsl */ `
        float t = fract(uTime * (0.18 + aSeed.w * 0.12) + aSeed.x);
        float f = uDrop * pow(t, 0.75);
        float w = uWidth + ${widthGrow.toFixed(2)} * pow(f / uDrop, 0.8);
        float u = (aSeed.y * 2.0 - 1.0);
        p = uTop + uDir * (${off} + ${k} * sqrt(f) + aSeed.z * 6.0 * t) + uSide * u * w * (1.0 + 0.25 * t);
        p.y = uTop.y - f;
        life = 0.6 + t;
        vAlpha = smoothstep(0.0, 0.1, t) * (1.0 - t) * 0.28;` });
  const splashMat = pointsMaterial({ timeUniform, light, soft, rainbow: rainbow * 2.0, extra: { ...shared(), uSize: { value: 1.6 * scale } }, vertexBody: /* glsl */ `
        float t = fract(uTime * (0.45 + aSeed.w * 0.4) + aSeed.x);
        vec3 base = uTop + uDir * (${off} + ${k} * sqrt(uDrop));
        base.y = uTop.y - uDrop;
        float ang = aSeed.y * 6.2831;
        float sp = uWidth * (0.6 + 1.4 * aSeed.z);
        vec3 h = uSide * cos(ang) * 1.2 + uDir * sin(ang);
        p = base + uSide * (aSeed.z - 0.5) * uWidth * 1.6 + h * sp * t;
        p.y += (uWidth * 1.4 * aSeed.w + 2.0) * 4.0 * t * (1.0 - t);
        life = 0.7 + 0.6 * t;
        vAlpha = (1.0 - t) * 0.5;` });
  const mist = new THREE.Points(mk(count), mistMat);
  const spray = new THREE.Points(mk(Math.round(count * 1.5)), sprayMat);
  const splash = new THREE.Points(mk(Math.round(count * 1.2)), splashMat);
  const mats = [mistMat, sprayMat, splashMat];
  for (const o of [mist, spray, splash]) {
    o.frustumCulled = false;
    o.layers.set(SOFT_LAYER);
    group.add(o);
  }
  group.userData.setPixel = (px) => {
    for (const m of mats) m.uniforms.uPixel.value = px;
  };
  return group;
}
