import * as THREE from 'three';
import { createTerrainMaterial } from './terrainMaterial.js';

export function createTerrain(field, { extent, segments, world, sunDir, sunColor, timeUniform }) {
  const n = segments + 1;
  const pos = new Float32Array(n * n * 3);
  const map = (u) => extent * (0.22 * u + 0.78 * u * u * u);
  for (let j = 0; j < n; j++) {
    const z = map((j / segments) * 2 - 1);
    for (let i = 0; i < n; i++) {
      const x = map((i / segments) * 2 - 1);
      const k = (j * n + i) * 3;
      pos[k] = x;
      pos[k + 1] = field.heightAt(x, z);
      pos[k + 2] = z;
    }
  }
  const idx = new Uint32Array(segments * segments * 6);
  let t = 0;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      idx[t++] = a; idx[t++] = c; idx[t++] = b;
      idx[t++] = b; idx[t++] = c; idx[t++] = d;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, createTerrainMaterial(world, { erosion: field.erosion, sunDir, sunColor, timeUniform }));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
