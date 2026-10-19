import * as THREE from 'three';
import { NOISE_GLSL } from '../materials/glsl.js';

const hd = (f) => 1.5 + 2.2 * Math.sqrt(Math.max(f, 0));

export function waterfallFrame(field, world, startT = 2) {
  const top = field.channelPoint(startT);
  let yTop = Infinity;
  for (const o of [-2, 0, 2]) yTop = Math.min(yTop, field.heightAt(top.x + o * field.lipDir.z, top.z - o * field.lipDir.x));
  yTop += 1.4;
  const dir = new THREE.Vector3(field.lipDir.x, 0, field.lipDir.z).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const drop = yTop - world.waterLevel;
  const bottom = new THREE.Vector3(top.x, world.waterLevel, top.z).addScaledVector(dir, hd(drop));
  return { top: new THREE.Vector3(top.x, yTop, top.z), dir, side, drop, bottom };
}

const fogVertex = `#include <fog_pars_vertex>`;

export function createWaterfall(frame, { sunDir, sunColor, timeUniform }) {
  const { top, dir, side, drop } = frame;
  const rows = 96, cols = 24;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= rows; j++) {
    const s = j / rows;
    const f = drop * Math.pow(s, 1.4);
    const w = 9 + 8 * Math.pow(s, 0.8);
    for (let i = 0; i <= cols; i++) {
      const u = (i / cols) * 2 - 1;
      const bow = -0.1 * u * u * w + 0.6 * Math.sin(u * 3.0 + s * 4.0) * s;
      const p = top.clone().addScaledVector(dir, hd(f) + bow).addScaledVector(side, u * w);
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
        uniform float uTime, uDrop, uLayer;
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
          float streak = fbm3(vec3(vUv.x * 0.9 + uLayer * 7.0, sv, 1.3));
          float fine = fbm3(vec3(vUv.x * 3.5, sv * 3.2, 5.0 + uLayer));
          float foam = smoothstep(0.32, 0.72, streak * 0.75 + fine * 0.45);
          float w = 9.0 + 8.0 * pow(fall / uDrop, 0.8);
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

export function createFoam(frame, { timeUniform, sunColor }) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSunColor: { value: sunColor.clone() } }]);
  uniforms.uTime = timeUniform;
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
      uniform float uTime;
      uniform vec3 uSunColor;
      varying vec3 vW;
      varying vec2 vP;
      ${NOISE_GLSL}
      void main() {
        float r = length(vP);
        float a = atan(vP.y, vP.x);
        float n = fbm3(vec3(vW.xz * 0.18 + vec2(0.0, -uTime * 0.4), uTime * 0.2));
        float rings = fbm3(vec3(r * 0.25 - uTime * 0.8, a * 2.0, 2.0));
        float foam = smoothstep(0.4, 0.7, n * 0.6 + rings * 0.6) * (1.0 - smoothstep(8.0, 42.0, r));
        foam = max(foam, 1.0 - smoothstep(4.0, 14.0, r));
        vec3 col = vec3(0.85, 0.9, 0.92) * (0.6 + uSunColor * 0.9);
        gl_FragColor = vec4(col, foam * 0.85);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(48, 64).rotateX(-Math.PI / 2), mat);
  mesh.position.copy(frame.bottom).y += 0.12;
  mesh.renderOrder = 3;
  return mesh;
}
