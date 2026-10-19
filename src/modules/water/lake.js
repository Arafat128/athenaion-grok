import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { createWaterNormalTexture } from '../materials/waterNormals.js';

export function createLake(world, { sunDir, sunColor, quality, normals = createWaterNormalTexture() }) {
  const L = world.lake;
  const geo = new THREE.CircleGeometry(1, 96).scale(L.rx * 1.55, L.rz * 1.55, 1);
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
