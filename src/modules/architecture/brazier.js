import * as THREE from 'three';
import { merge, prep } from './geometry.js';
import { RNG } from '../utils/rng.js';
import { SOFT_LAYER } from '../atmosphere/softParticles.js';

const tmp = new THREE.Object3D();

function brazierGeometry() {
  const pts = [[0.0, 1.3], [0.55, 1.32], [0.78, 1.55], [0.82, 1.62], [0.74, 1.6], [0.5, 1.4], [0.0, 1.38]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.LatheGeometry(pts, 24);
  const legs = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62),
      new THREE.Vector3(Math.cos(a) * 0.4, 0.7, Math.sin(a) * 0.4),
      new THREE.Vector3(Math.cos(a) * 0.5, 1.35, Math.sin(a) * 0.5),
    ]);
    legs.push(new THREE.TubeGeometry(c, 12, 0.045, 6));
    legs.push(new THREE.SphereGeometry(0.09, 8, 6).translate(Math.cos(a) * 0.62, 0.05, Math.sin(a) * 0.62));
  }
  legs.push(new THREE.TorusGeometry(0.45, 0.03, 6, 24).rotateX(Math.PI / 2).translate(0, 0.7, 0));
  return merge([bowl, ...legs]);
}

function flameMaterial(timeUniform, soft) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: timeUniform, uPixel: { value: 1000 }, ...soft },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute vec3 aBase;
      uniform float uTime, uPixel;
      varying float vT, vViewZ, vSeed;
      void main() {
        float t = fract(uTime * (0.9 + aSeed.w * 0.8) + aSeed.x);
        vT = t;
        vSeed = aSeed.y;
        vec3 p = aBase + vec3((aSeed.y - 0.5) * 0.7 * (1.0 - t), t * (1.0 + aSeed.z * 1.4), (aSeed.z - 0.5) * 0.7 * (1.0 - t));
        p.x += sin(uTime * 6.0 + aSeed.x * 30.0) * 0.08 * t;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        vViewZ = mv.z;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((0.9 - 0.5 * t) * uPixel / -mv.z, 1.0, 256.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear, uFar;
      varying float vT, vViewZ, vSeed;
      void main() {
        float d = texture2D(tDepth, gl_FragCoord.xy / uRes).x;
        float sz = (uNear * uFar) / ((uFar - uNear) * d - uFar);
        if (vViewZ < sz) discard;
        vec2 q = gl_PointCoord * 2.0 - 1.0;
        float r2 = dot(q, q);
        if (r2 > 1.0) discard;
        float a = (1.0 - r2) * (1.0 - r2) * (1.0 - vT);
        vec3 c = mix(vec3(4.0, 2.2, 0.7), vec3(2.4, 0.5, 0.08), vT) * (0.7 + 0.6 * vSeed);
        gl_FragColor = vec4(c * a * 0.5, 0.0);
      }`,
  });
}

export function createBraziers(spots, { mats, timeUniform, soft, perFlame = 36 }) {
  const group = new THREE.Group();
  const geo = brazierGeometry();
  const mesh = new THREE.InstancedMesh(geo, mats.bronze, spots.length);
  const coals = new THREE.InstancedMesh(prep(new THREE.CircleGeometry(0.62, 16).rotateX(-Math.PI / 2).translate(0, 1.42, 0)), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.1, 0.25) }), spots.length);
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeUniform },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uTime; varying vec2 vP; void main(){ float r = length(vP) / 6.0; float f = 0.85 + 0.15 * sin(uTime * 13.0) * sin(uTime * 7.3); gl_FragColor = vec4(vec3(1.0, 0.45, 0.12) * pow(max(1.0 - r, 0.0), 2.2) * 0.35 * f, 1.0); }',
  });
  const glow = new THREE.InstancedMesh(new THREE.CircleGeometry(6, 32).rotateX(-Math.PI / 2), glowMat, spots.length);
  spots.forEach((s, i) => {
    tmp.position.set(s.x, s.y, s.z);
    tmp.scale.setScalar(s.scale ?? 1);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
    coals.setMatrixAt(i, tmp.matrix);
    tmp.position.y += 0.08;
    tmp.updateMatrix();
    glow.setMatrixAt(i, tmp.matrix);
  });
  mesh.castShadow = true;
  group.add(mesh, coals, glow);
  const rng = new RNG(99);
  const n = spots.length * perFlame;
  const seeds = new Float32Array(n * 4), base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = spots[Math.floor(i / perFlame)];
    for (let k = 0; k < 4; k++) seeds[i * 4 + k] = rng.next();
    base.set([s.x, s.y + 1.45 * (s.scale ?? 1), s.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  g.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const fm = flameMaterial(timeUniform, soft);
  const flames = new THREE.Points(g, fm);
  flames.frustumCulled = false;
  flames.layers.set(SOFT_LAYER);
  flames.userData.setPixel = (px) => (fm.uniforms.uPixel.value = px);
  group.add(flames);
  group.userData.flames = flames;
  return group;
}
