import * as THREE from 'three';
import { NOISE_GLSL } from '../materials/glsl.js';

const hd = (f, fr) => (fr.offset ?? 1.5) + (fr.throwK ?? 2.2) * Math.sqrt(Math.max(f, 0));

export function waterfallFrame(field, world, startT = 2) {
  const top = field.channelPoint(startT);
  let yTop = Infinity;
  for (const o of [-2, 0, 2]) yTop = Math.min(yTop, field.heightAt(top.x + o * field.lipDir.z, top.z - o * field.lipDir.x));
  yTop += 1.4;
  const dir = new THREE.Vector3(field.lipDir.x, 0, field.lipDir.z).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const drop = yTop - world.waterLevel;
  const fr = { dir, side, drop, offset: 1.5, throwK: 2.2, width: 9, widthGrow: 8 };
  fr.bottom = new THREE.Vector3(top.x, world.waterLevel, top.z).addScaledVector(dir, hd(drop, fr));
  fr.top = new THREE.Vector3(top.x, yTop, top.z);
  return fr;
}

export function cascadeFrame(field, world, { angle, y, width = 2.2, widthGrow = 3 }) {
  const M = world.mesa;
  const a = Math.atan2(field.lipDir.z, field.lipDir.x) + angle;
  const dx = Math.cos(a), dz = Math.sin(a);
  let r = M.r * 0.7;
  while (r < M.r * 1.6 && field.heightAt(M.x + dx * r, M.z + dz * r) > y) r += 0.25;
  const dir = new THREE.Vector3(dx, 0, dz);
  const side = new THREE.Vector3(-dz, 0, dx);
  const top = new THREE.Vector3(M.x + dx * (r - 1.5), y, M.z + dz * (r - 1.5));
  const ground = Math.max(world.waterLevel, field.heightAt(top.x + dx * 14, top.z + dz * 14));
  const fr = { top, dir, side, drop: y - ground, offset: 0.6, throwK: 1.3, width, widthGrow };
  fr.bottom = new THREE.Vector3(top.x, ground, top.z).addScaledVector(dir, hd(fr.drop, fr));
  return fr;
}

const fogVertex = `#include <fog_pars_vertex>`;

export function createWaterfall(frame, { sunDir, sunColor, timeUniform }) {
  const { top, dir, side, drop, width: W0, widthGrow: WG } = frame;
  const rows = 96, cols = 24;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= rows; j++) {
    const s = j / rows;
    const f = drop * Math.pow(s, 1.4);
    const w = W0 + WG * Math.pow(s, 0.8);
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * 2 - 1;
      const bow = -0.1 * u * u * w + 0.6 * (W0 / 9) * Math.sin(u * 3.0 + s * 4.0) * s;
      const p = top.clone().addScaledVector(dir, hd(f, frame) + bow).addScaledVector(side, u * w);
      p.y = top.y - f;
      pos.push(p.x, p.y, p.z);
      uv.push(u * w, f);
    }
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uSunDir: { value: sunDir.clone() },
      uSunColor: { value: sunColor.clone() },
      uDrop: { value: drop },
      uLayer: { value: 0 },
      uW0: { value: W0 },
      uWG: { value: WG },
    },
  ]);
  uniforms.uTime = timeUniform;
  const make = (layer) => {
    const u = THREE.UniformsUtils.clone(uniforms);
    u.uTime = timeUniform;
    u.uLayer.value = layer;
    return new THREE.ShaderMaterial({
      uniforms: u,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
      vertexShader: /* glsl */ `
        ${fogVertex}
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vW;
        uniform float uLayer;
        void main() {
          vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          vec3 p = position + normal * uLayer * 0.8;
          vec4 w = modelMatrix * vec4(p, 1.0);
          vW = w.xyz;
          vec4 mvPosition = viewMatrix * w;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform float uTime, uDrop, uLayer, uW0, uWG;
        uniform vec3 uSunDir, uSunColor;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vW;
        ${NOISE_GLSL}
        void main() {
          float t = uTime * (1.0 + uLayer * 0.3);
          float fall = vUv.y;
          float speed = 9.0 + fall * 0.35;
          float sv = fall * 0.12 - t * speed * 0.12;
          float xs = vUv.x * 9.0 / uW0;
          float streak = fbm3(vec3(xs * 0.9 + uLayer * 7.0, sv, 1.3));
          float fine = fbm3(vec3(xs * 3.5, sv * 3.2, 5.0 + uLayer));
          float foam = smoothstep(0.32, 0.72, streak * 0.75 + fine * 0.45);
          float w = uW0 + uWG * pow(fall / uDrop, 0.8);
          float ex = abs(vUv.x) / w;
          float edge = 1.0 - smoothstep(0.7 - fine * 0.25, 1.0, ex);
          float bottomMist = smoothstep(uDrop * 0.75, uDrop, fall);
          float alpha = edge * mix(0.35 + 0.65 * foam, 0.9, bottomMist) * smoothstep(0.0, 1.5, fall + 1.0);
          alpha *= (uLayer > 0.5 ? 0.55 : 0.9);
          vec3 n = normalize(vN);
          vec3 base = mix(vec3(0.32, 0.42, 0.45), vec3(0.92, 0.95, 0.98), clamp(foam + bottomMist * 0.6, 0.0, 1.0));
          vec3 v = normalize(cameraPosition - vW);
          float sunL = abs(dot(n, uSunDir)) * 0.6 + 0.4;
          float scatter = pow(max(dot(-v, uSunDir), 0.0), 4.0) * 0.6;
          vec3 col = base * (vec3(0.55, 0.62, 0.72) * 0.9 + uSunColor * (sunL + scatter) * 1.6);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
          #include <fog_fragment>
        }`,
    });
  };
  const group = new THREE.Group();
  const back = new THREE.Mesh(geo, make(0));
  const front = new THREE.Mesh(geo, make(1));
  front.renderOrder = 2;
  back.renderOrder = 1;
  group.add(back, front);
  return group;
}

export function createFoam(frame, { timeUniform, light, radius = 48 }) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uR: { value: radius }, uW: { value: frame.width } }]);
  uniforms.uTime = timeUniform;
  Object.assign(uniforms, light);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vW;
      varying vec2 vP;
      void main() {
        vP = position.xz;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mvPosition = viewMatrix * w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime, uR, uW;
      uniform vec3 uSunColor, uSunDir, uSkyColor;
      varying vec3 vW;
      varying vec2 vP;
      ${NOISE_GLSL}
      void main() {
        float r = length(vP) / uR;
        float a = atan(vP.y, vP.x);
        vec2 dirv = vP / max(length(vP), 1e-3);
        float flow = r * 5.0 - uTime * 0.35;
        float streaks = fbm3(vec3(a * 5.0, flow, 2.0));
        float churn = fbm3(vec3(vW.xz * (0.35 * 9.0 / uW) - dirv * uTime * 1.2, uTime * 0.3));
        float cells = vnoise(vec3(vW.xz * (1.4 * 9.0 / uW) - dirv * uTime * 2.0, uTime * 0.5));
        float lace = smoothstep(0.45, 0.62, streaks * 0.65 + churn * 0.5) * (1.0 - smoothstep(0.25, 1.0, r));
        lace *= 0.55 + 0.45 * smoothstep(0.3, 0.7, cells);
        float core = 1.0 - smoothstep(0.06, 0.26, r + (churn - 0.5) * 0.12);
        float foam = max(lace, core);
        vec3 col = vec3(0.86, 0.9, 0.93) * (uSkyColor * 0.6 + uSunColor * (0.35 + 0.5 * max(uSunDir.y, 0.0)));
        col *= 0.85 + 0.25 * cells;
        gl_FragColor = vec4(col, foam * 0.9);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 64).rotateX(-Math.PI / 2), mat);
  mesh.position.copy(frame.bottom).y += 0.12;
  mesh.renderOrder = 3;
  return mesh;
}
