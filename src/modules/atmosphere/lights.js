import * as THREE from 'three';

export function createLights({ sunDir, sunColor, sunIntensity, quality, focus = new THREE.Vector3() }) {
  const group = new THREE.Group();
  const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
  sun.position.copy(focus).addScaledVector(sunDir, 900);
  sun.target.position.copy(focus);
  sun.castShadow = true;
  const s = sun.shadow;
  s.mapSize.set(quality.shadowMap, quality.shadowMap);
  s.camera.left = -260; s.camera.right = 260; s.camera.top = 260; s.camera.bottom = -260;
  s.camera.near = 100; s.camera.far = 1800;
  s.bias = -0.0004;
  s.normalBias = 0.6;
  group.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(new THREE.Color(0.55, 0.65, 0.85), new THREE.Color(0.3, 0.25, 0.17), 0.55);
  group.add(hemi);
  return { group, sun, hemi };
}
