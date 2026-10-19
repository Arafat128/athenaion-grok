import * as THREE from 'three';

// Bakes a side view of a tree into albedo + tangent-space normal textures and builds an
// instanced, cylindrically camera-facing quad that is lit by the regular PBR pipeline.
const ALBEDO_VS = `
attribute vec3 color;
varying vec3 vC; varying vec3 vN; varying vec3 vP;
void main(){ vC = color; vN = normalize(normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function bakeImpostor(renderer, geometry, { size = 256, darken = 0.75 } = {}) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const halfW = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z) * 1.04;
  const H = (bb.max.y - bb.min.y) * 1.02;
  const w = size, h = Math.round(size * Math.min(4, Math.max(1, H / (halfW * 2))));
  const cam = new THREE.OrthographicCamera(-halfW, halfW, bb.min.y + H, bb.min.y, -100, 100);
  cam.position.set(0, 0, 50);
  cam.lookAt(0, 0, 0);
  cam.position.set(0, 0, 50);
  cam.updateMatrixWorld();
  const mk = (frag) => new THREE.ShaderMaterial({ vertexShader: ALBEDO_VS, fragmentShader: frag, side: THREE.DoubleSide });
  const albedoMat = mk(`varying vec3 vC; varying vec3 vN; varying vec3 vP;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
    void main(){ float n = 0.75 + 0.5 * h(floor(vP * 3.0)); gl_FragColor = vec4(vC * ${darken.toFixed(3)} * n, 1.0); }`);
  const normalMat = mk(`varying vec3 vC; varying vec3 vN; varying vec3 vP;
    void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; n.z = abs(n.z) * 0.8 + 0.2; gl_FragColor = vec4(normalize(n) * 0.5 + 0.5, 1.0); }`);
  const scene = new THREE.Scene();
  const m = new THREE.Mesh(geometry, albedoMat);
  scene.add(m);
  const out = [];
  const prevTarget = renderer.getRenderTarget(), prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  const prevTone = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  for (const mat of [albedoMat, normalMat]) {
    const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.UnsignedByteType });
    m.material = mat;
    renderer.setRenderTarget(rt);
    renderer.setClearColor(mat === albedoMat ? 0x000000 : 0x8080ff, 0);
    renderer.clear();
    renderer.render(scene, cam);
    rt.texture.generateMipmaps = true;
    rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
    rt.texture.anisotropy = 4;
    out.push(rt);
  }
  // Mipmaps: re-blit into a non-MSAA target with mips by rendering a quad.
  const final = out.map((src) => {
    const rt = new THREE.WebGLRenderTarget(w, h, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { t: { value: src.texture } },
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D t; varying vec2 vU; void main(){ vec4 c = texture2D(t, vU); gl_FragColor = c; }',
    }));
    const s = new THREE.Scene();
    s.add(q);
    renderer.setRenderTarget(rt);
    renderer.render(s, cam);
    src.dispose();
    return rt;
  });
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.toneMapping = prevTone;
  albedoMat.dispose();
  normalMat.dispose();
  return { albedo: final[0].texture, normal: final[1].texture, width: halfW * 2, height: H, base: bb.min.y };
}

export function createImpostorMaterial(bake, { timeUniform, tint = 1.0, sway = 0.0 } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: bake.albedo, normalMap: bake.normal, alphaTest: 0.45, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
    color: new THREE.Color(tint, tint, tint),
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = timeUniform || { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace('#include <beginnormal_vertex>', `
  vec3 iP = instanceMatrix[3].xyz;
  mat3 iM = mat3(instanceMatrix);
  float iS2 = dot(iM[1], iM[1]);
  vec3 toCam = cameraPosition - iP; toCam.y = 0.0; toCam = normalize(toCam + vec3(1e-5, 0.0, 0.0));
  vec3 bbR = vec3(toCam.z, 0.0, -toCam.x);
  vec3 objectNormal = transpose(iM) * toCam / iS2;
  #ifdef USE_TANGENT
  vec3 objectTangent = vec3(1.0, 0.0, 0.0);
  #endif`)
      .replace('#include <begin_vertex>', `
  float sw = ${sway.toFixed(3)} * position.y * sin(uWindTime * 1.3 + dot(iP.xz, vec2(0.031, 0.047))) * 0.03;
  vec3 wOff = (bbR * (position.x + sw) + vec3(0.0, position.y, 0.0)) * sqrt(iS2);
  vec3 transformed = transpose(iM) * wOff / iS2;`);
  };
  mat.customProgramCacheKey = () => `impostor-${sway}`;
  return mat;
}

export function impostorGeometry(bake) {
  return new THREE.PlaneGeometry(bake.width, bake.height).translate(0, bake.height / 2 + bake.base, 0);
}
