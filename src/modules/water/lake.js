import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { createWaterNormalTexture } from '../materials/waterNormals.js';

// Bake water depth under the lake (metres / 20 in R) so the surface shader can do
// depth-based colour, shallow-water transparency and shoreline foam.
function bakeDepth(field, world, box, size = 256) {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = box.x + ((i + 0.5) / size) * box.w, z = box.z + ((j + 0.5) / size) * box.d;
      const d = Math.max(0, Math.min(1, (world.waterLevel - field.heightAt(x, z)) / 20));
      const k = (j * size + i) * 4;
      data[k] = Math.round(d * 255);
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function patchLakeShader(material, depthTex, box) {
  material.uniforms.uDepth = { value: depthTex };
  material.uniforms.uDepthBox = { value: new THREE.Vector4(box.x, box.z, box.w, box.d) };
  material.transparent = true;
  material.fragmentShader = material.fragmentShader
    .replace('uniform vec3 waterColor;', 'uniform vec3 waterColor;\nuniform sampler2D uDepth;\nuniform vec4 uDepthBox;')
    .replace('vec3 outgoingLight = albedo;\n\t\t\t\t\tgl_FragColor = vec4( outgoingLight, alpha );', `
    float dm = texture2D(uDepth, (worldPosition.xz - uDepthBox.xy) / uDepthBox.zw).r * 20.0;
    float sh = exp(-dm * 0.3);
    vec3 shallowC = vec3(0.07, 0.24, 0.2) * (0.35 + 0.65 * getShadowMask());
    albedo += shallowC * sh * (1.0 - reflectance) * (0.6 + 0.4 * diffuseLight);
    float edge = 1.0 - smoothstep(0.0, 1.8, dm + noise.x * 0.35);
    float bands = 0.5 + 0.5 * sin(dm * 7.0 - time * 5.0 + noise.y * 2.5);
    float foam = edge * smoothstep(0.25, 0.9, bands * edge + noise.z * 0.3) + smoothstep(0.35, 0.0, dm) * 0.8;
    foam = clamp(foam, 0.0, 1.0);
    vec3 foamC = vec3(0.82, 0.86, 0.88) * (0.45 + 0.55 * getShadowMask()) * (0.7 + 0.3 * sunColor);
    vec3 outgoingLight = mix(albedo, foamC, foam * 0.85);
    float a = mix(0.45, 1.0, smoothstep(0.2, 5.0, dm));
    gl_FragColor = vec4(outgoingLight, max(a, foam) * alpha);`);
  if (!material.fragmentShader.includes('uDepthBox.zw')) console.warn('[athenaion] lake shader patch failed');
}

export function createLake(world, { sunDir, sunColor, quality, field, normals = createWaterNormalTexture() }) {
  const L = world.lake;
  const geo = new THREE.CircleGeometry(1, 96).scale(L.rx * 1.55, L.rz * 1.55, 1);
  const box = { x: L.x - L.rx * 1.6, z: L.z - L.rz * 1.6, w: L.rx * 3.2, d: L.rz * 3.2 };
  let mesh, update;
  if (quality.mirror) {
    const water = new Water(geo, {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals: normals,
      sunDirection: sunDir.clone(),
      sunColor: sunColor.clone().multiplyScalar(0.9),
      waterColor: new THREE.Color(0.02, 0.07, 0.08),
      distortionScale: 1.6,
      alpha: 1,
      fog: true,
    });
    water.material.uniforms.size.value = 0.6;
    if (field) patchLakeShader(water.material, bakeDepth(field, world, box), box);
    mesh = water;
    update = (t) => { water.material.uniforms.time.value = t * 0.35; };
  } else {
    const mat = createSimpleWaterMaterial(normals);
    mesh = new THREE.Mesh(geo, mat);
    update = (t) => { normals.offset.set(t * 0.004, t * 0.003); };
  }
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(L.x, world.waterLevel, L.z);
  mesh.receiveShadow = true;
  return { mesh, update, normals };
}

export function createSimpleWaterMaterial(normals) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.02, 0.06, 0.07),
    roughness: 0.06,
    metalness: 0.0,
    normalMap: normals,
    normalScale: new THREE.Vector2(0.35, 0.35),
    envMapIntensity: 1.4,
  });
}
