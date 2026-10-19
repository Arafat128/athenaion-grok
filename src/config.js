import * as THREE from 'three';

export const WORLD = {
  seed: 1337,
  extent: 7000,
  waterLevel: 2,
  acropolis: { x: 0, z: 0, rx: 150, rz: 88, top: 72 },
  lake: { x: -250, z: 150, rx: 175, rz: 125 },
  mesa: { x: -575, z: 120, r: 200, top: 102 },
};

export const SUN_DIR = new THREE.Vector3(0.66, 0.24, 0.6).normalize();

export const ATMOS = {
  sunColor: new THREE.Color(1.0, 0.8, 0.58),
  sunIntensity: 4.2,
  zenith: new THREE.Color(0.16, 0.3, 0.58),
  horizon: new THREE.Color(0.7, 0.72, 0.76),
  fogColor: new THREE.Color(0.53, 0.6, 0.71),
  fogSun: new THREE.Color(1.0, 0.82, 0.6),
  fogDensity: 0.00052,
  fogFalloff: 0.0017,
  fogBase: 0,
  exposure: 0.62,
};

export const QUALITY = {
  low: {
    pixelRatio: 1, terrainSegments: 384, shadowMap: 1024, cypress: 2500, olive: 1500, shrubs: 3000,
    statueCell: 0.007, mirror: false, bloom: false, mist: 600, msaa: 0,
  },
  high: {
    pixelRatio: 1, terrainSegments: 768, shadowMap: 4096, cypress: 9000, olive: 5000, shrubs: 12000,
    statueCell: 0.0035, mirror: true, bloom: true, mist: 2000, msaa: 4,
  },
  ultra: {
    pixelRatio: 2, terrainSegments: 1152, shadowMap: 8192, cypress: 16000, olive: 9000, shrubs: 24000,
    statueCell: 0.0025, mirror: true, bloom: true, mist: 4000, msaa: 4,
  },
};
