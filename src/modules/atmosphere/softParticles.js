import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const SOFT_LAYER = 2;

export function createSoftUniforms() {
  return {
    tDepth: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uNear: { value: 0.5 },
    uFar: { value: 30000 },
  };
}

export const SOFT_GLSL = /* glsl */ `
uniform sampler2D tDepth;
uniform vec2 uRes;
uniform float uNear, uFar;
float sceneViewZ() {
  float d = texture2D(tDepth, gl_FragCoord.xy / uRes).x;
  return (uNear * uFar) / ((uFar - uNear) * d - uFar);
}
float softFade(float viewZ, float range) {
  return clamp((viewZ - sceneViewZ()) / range, 0.0, 1.0);
}`;

export class SoftParticlePass {
  constructor(scene, camera, soft, scale = 0.5, depth = null) {
    this.depth = depth;
    this.scene = scene;
    this.camera = camera;
    this.soft = soft;
    this.scale = scale;
    this.enabled = true;
    this.needsSwap = false;
    this.clear = false;
    this.renderToScreen = false;
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tMist: { value: this.rt.texture } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D tMist; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tMist, vUv); }',
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
    }));
  }

  setSize(w, h) {
    this.rt.setSize(Math.max(1, Math.round(w * this.scale)), Math.max(1, Math.round(h * this.scale)));
  }

  render(renderer, writeBuffer, readBuffer) {
    const s = this.soft;
    s.tDepth.value = this.depth || readBuffer.depthTexture;
    s.uRes.value.set(this.rt.width, this.rt.height);
    s.uNear.value = this.camera.near;
    s.uFar.value = this.camera.far;
    const mask = this.camera.layers.mask;
    const bg = this.scene.background;
    this.camera.layers.set(SOFT_LAYER);
    this.scene.background = null;
    renderer.setRenderTarget(this.rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.camera.layers.mask = mask;
    this.scene.background = bg;
    renderer.setRenderTarget(readBuffer);
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    this.quad.render(renderer);
    renderer.autoClear = auto;
  }

  dispose() {
    this.rt.dispose();
    this.quad.dispose();
  }
}
