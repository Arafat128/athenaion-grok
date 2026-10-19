import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SoftParticlePass } from './softParticles.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVignette: { value: 0.32 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uGrain: { value: 0.025 }, uCA: { value: 0.0006 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uVignette, uTime, uGrain, uCA; uniform vec2 uRes; varying vec2 vUv;
    float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    void main() {
      vec2 q = vUv - 0.5;
      float r2 = dot(q, q);
      vec2 off = q * r2 * uCA * 4.0;
      vec4 c = texture2D(tDiffuse, vUv);
      c.r = texture2D(tDiffuse, vUv + off).r;
      c.b = texture2D(tDiffuse, vUv - off).b;
      c.rgb *= 1.0 - uVignette * smoothstep(0.05, 0.6, r2 * 1.8);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, 1.1);
      float sh = 1.0 - smoothstep(0.0, 0.25, l);
      float hi = smoothstep(0.35, 1.2, l);
      c.rgb *= mix(vec3(1.0), vec3(0.94, 1.0, 1.06), sh * 0.6);
      c.rgb *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), hi * 0.6);
      c.rgb += (h12(vUv * uRes + fract(uTime) * 91.7) - 0.5) * uGrain * (0.4 + 0.6 * sqrt(max(l, 0.0)));
      gl_FragColor = c;
    }`,
};

const ClampShader = {
  uniforms: { tDiffuse: { value: null }, uMax: { value: 12 } },
  vertexShader: VERT,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb = max(c.rgb, 0.0);
      float l = max(c.r, max(c.g, c.b));
      c.rgb *= l > uMax ? uMax / l : 1.0;
      gl_FragColor = c;
    }`,
};

class ScenePass extends Pass {
  constructor(scene, camera, samples) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples, depthTexture: new THREE.DepthTexture(1, 1) });
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: this.rt.texture } },
      vertexShader: VERT,
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }',
      depthTest: false,
      depthWrite: false,
    }));
  }
  setSize(w, h) { this.rt.setSize(w, h); }
  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(writeBuffer);
    this.copy.render(renderer);
  }
}

class GodRaysPass extends Pass {
  constructor(camera, depth, { sunDir, sunColor, strength = 0.5 }) {
    super();
    this.needsSwap = false;
    this.camera = camera;
    this.sunDir = sunDir;
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tDepth: { value: depth }, uSun: { value: new THREE.Vector2() }, uVis: { value: 0 }, uColor: { value: sunColor.clone().multiplyScalar(strength) }, uAspect: { value: 1 } },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDepth; uniform vec2 uSun; uniform float uVis, uAspect; uniform vec3 uColor; varying vec2 vUv;
        float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
        float skyAt(vec2 uv) {
          if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
          float d = texture2D(tDepth, uv).x;
          vec2 o = (uv - uSun) * vec2(uAspect, 1.0);
          return step(0.99995, d) * exp(-dot(o, o) * 9.0);
        }
        void main() {
          if (uVis <= 0.0) discard;
          vec2 delta = (uSun - vUv) / 56.0;
          vec2 uv = vUv + delta * h12(gl_FragCoord.xy);
          float acc = 0.0, w = 1.0;
          for (int i = 0; i < 56; i++) {
            acc += skyAt(uv) * w;
            w *= 0.972;
            uv += delta;
          }
          acc /= 24.0;
          vec2 o = (vUv - uSun) * vec2(uAspect, 1.0);
          float fall = 1.0 / (1.0 + dot(o, o) * 3.0);
          gl_FragColor = vec4(uColor * acc * uVis * fall, 0.0);
        }`,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    }));
    this._v = new THREE.Vector3();
    this._f = new THREE.Vector3();
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.quad.material.uniforms;
    const p = this._v.copy(this.camera.position).addScaledVector(this.sunDir, 10000).project(this.camera);
    this.camera.getWorldDirection(this._f);
    const facing = this._f.dot(this.sunDir);
    u.uSun.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    u.uVis.value = THREE.MathUtils.smoothstep(facing, 0.15, 0.6) * (p.z < 1 ? 1 : 0);
    u.uAspect.value = readBuffer.width / readBuffer.height;
    if (u.uVis.value <= 0) return;
    renderer.setRenderTarget(readBuffer);
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    this.quad.render(renderer);
    renderer.autoClear = auto;
  }
}

export function createComposer(renderer, scene, camera, quality, size, { soft, sunDir, sunColor } = {}) {
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  const scenePass = new ScenePass(scene, camera, quality.msaa);
  composer.addPass(scenePass);
  const depth = scenePass.rt.depthTexture;
  let gtao = null;
  if (quality.ssao) {
    gtao = new GTAOPass(scene, camera, size.x, size.y);
    gtao.updateGtaoMaterial({ radius: 2.2, distanceExponent: 1.4, thickness: 3, scale: 1.4, samples: 12, distanceFallOff: 1 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
  }
  let softPass = null;
  if (soft) {
    softPass = new SoftParticlePass(scene, camera, soft, quality.mistScale ?? 0.5, depth);
    composer.addPass(softPass);
  }
  let rays = null;
  if (quality.godRays && sunDir) {
    rays = new GodRaysPass(camera, depth, { sunDir, sunColor, strength: 0.55 });
    composer.addPass(rays);
  }
  composer.addPass(new ShaderPass(ClampShader));
  let bloom = null;
  if (quality.bloom) {
    bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.22, 0.65, 1.6);
    composer.addPass(bloom);
  }
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uRes.value.copy(size);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return { composer, bloom, softPass, gtao, rays, grade };
}
