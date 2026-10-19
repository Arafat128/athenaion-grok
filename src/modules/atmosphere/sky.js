import * as THREE from 'three';
import { NOISE_GLSL } from '../materials/glsl.js';

export function createSky({ sunDir, sunColor, zenith, horizon, fogColor, cloudSteps = 0 }) {
  const uniforms = {
    uSunDir: { value: sunDir.clone() },
    uSunColor: { value: sunColor.clone() },
    uZenith: { value: zenith.clone() },
    uHorizon: { value: horizon.clone() },
    uGround: { value: fogColor.clone().multiplyScalar(0.8) },
    uTime: { value: 0 },
    uClouds: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    defines: { CLOUD_STEPS: cloudSteps },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir, uSunColor, uZenith, uHorizon, uGround;
      uniform float uTime, uClouds;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        float mu = dot(d, uSunDir);
        vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.45));
        col = mix(col, uHorizon * 1.08, pow(1.0 - abs(h), 12.0) * 0.6);
        col = mix(col, uGround, smoothstep(0.0, -0.12, h));
        float glow = pow(max(mu, 0.0), 6.0) * 0.35 + pow(max(mu, 0.0), 48.0) * 0.9 + pow(max(mu, 0.0), 600.0) * 4.0;
        col += uSunColor * glow * (0.6 + 0.4 * smoothstep(-0.05, 0.3, h));
        col += uSunColor * 60.0 * smoothstep(0.99985, 0.99995, mu);
        #if CLOUD_STEPS > 0
        if (uClouds > 0.5 && h > 0.012) {
          float t0 = 1.5 / h, t1 = min(2.6 / h, 45.0);
          float dt = (t1 - t0) / float(CLOUD_STEPS);
          float T = 1.0;
          vec3 acc = vec3(0.0);
          float jitter = hash13(vec3(gl_FragCoord.xy, uTime));
          float g1 = (1.0 - 0.36) / pow(1.0 + 0.36 - 1.2 * mu, 1.5);
          float g2 = (1.0 - 0.09) / pow(1.0 + 0.09 + 0.6 * mu, 1.5);
          float phase = mix(g2, g1, 0.7) * 0.6;
          vec3 wind = vec3(uTime * 0.01, 0.0, uTime * 0.004);
          for (int i = 0; i < CLOUD_STEPS; i++) {
            if (t0 + dt * (float(i) + jitter) > t1 || T < 0.03) break;
            vec3 p = d * (t0 + dt * (float(i) + jitter));
            float hf = (p.y - 1.5) / 1.1;
            float prof = smoothstep(0.0, 0.2, hf) * (1.0 - smoothstep(0.45, 1.0, hf));
            vec3 q = p * 0.9 + wind;
            float cov = smoothstep(0.38, 0.62, fbm3lo(q * 0.18 + 3.0));
            float thr = 0.68 - 0.28 * cov - 0.12 * (1.0 - hf);
            float den = clamp((fbm3(q) - thr) * prof * 9.0, 0.0, 1.0);
            if (den > 0.01) {
              vec3 lp = p + uSunDir * 0.18;
              float ld = clamp((fbm3lo(lp * 0.9 + wind) - thr) * 6.0, 0.0, 1.0);
              float shadow = exp(-ld * 2.5) * (1.0 - exp(-den * 6.0) * 0.5);
              vec3 amb = mix(uHorizon * 0.8, uZenith * 1.4 + 0.2, hf);
              vec3 lit = uSunColor * (shadow * (phase * 2.0 + 0.55)) + amb * 0.7;
              float a = 1.0 - exp(-den * dt * 9.0);
              acc += T * a * lit;
              T *= 1.0 - a;
            }
          }
          float fade = smoothstep(0.012, 0.09, h);
          col = mix(col, col * T + acc, fade);
        }
        if (uClouds > 0.5 && h > 0.0) {
          vec2 uv = d.xz / (h + 0.08) * 1.6;
          float streak = fbm3(vec3(uv.x * 0.6, uv.y * 3.5, 4.0));
          float c = smoothstep(0.58, 0.82, streak) * 0.35 * smoothstep(0.04, 0.3, h);
          col = mix(col, mix(uHorizon * 1.1, uSunColor * 1.35, 0.5) * (0.8 + 0.5 * pow(max(mu, 0.0), 4.0)), c);
        }
        #else
        if (uClouds > 0.5 && h > 0.0) {
          vec2 uv = d.xz / (h + 0.08) * 1.6;
          vec3 q = vec3(uv * 1.3 + vec2(uTime * 0.004, 0.0), 0.0);
          float c = fbm3(q + fbm3(q * 0.7) * 0.8);
          c = smoothstep(0.48, 0.78, c) * smoothstep(0.0, 0.18, h);
          float streak = fbm3(vec3(uv.x * 0.6, uv.y * 3.5, 4.0));
          c = max(c, smoothstep(0.55, 0.8, streak) * 0.45 * smoothstep(0.02, 0.3, h));
          float lit = 0.75 + 0.6 * pow(max(mu, 0.0), 4.0);
          vec3 cloudCol = mix(uHorizon * 1.1, uSunColor * 1.35, 0.45) * lit;
          col = mix(col, cloudCol, c * 0.85);
        }
        #endif
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material);
  mesh.scale.setScalar(20000);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  function bakeEnvironment(renderer) {
    const envScene = new THREE.Scene();
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material.clone());
    m.material.uniforms.uClouds.value = 0;
    m.scale.setScalar(100);
    envScene.add(m);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(95, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.17, 0.12) })
    );
    ground.position.y = -8;
    envScene.add(ground);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(envScene, 0.02);
    pmrem.dispose();
    return rt.texture;
  }

  return { mesh, uniforms, bakeEnvironment };
}
