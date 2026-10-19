import * as THREE from 'three';
import { NOISE_GLSL } from '../materials/glsl.js';

export function createSky({ sunDir, sunColor, zenith, horizon, fogColor }) {
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
