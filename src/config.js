import * as THREE from 'three';

export const WORLD = {
  seed: 1337,
  extent: 7000,
  waterLevel: 2,
  acropolis: { x: 0, z: 0, rx: 150, rz: 88, top: 72 },
  lake: { x: -250, z: 150, rx: 175, rz: 125 },
  mesa: { x: -575, z: 120, r: 200, top: 102 },
  theatre: { x: 10, z: 168, y: 15, r0: 11, r1: 60, slope: 0.46, span: 1.9 },
  agora: { x: 255, z: -140, w: 130, d: 96, y: 10 },
};

const C = (r, g, b) => new THREE.Color(r, g, b);

export const TOD = {
  day: {
    sun: [0.66, 0.24, 0.6], sunColor: C(1.0, 0.8, 0.58), sunIntensity: 4.2,
    zenith: C(0.16, 0.3, 0.58), horizon: C(0.7, 0.72, 0.76), fogColor: C(0.53, 0.6, 0.71), fogSun: C(1.0, 0.82, 0.6),
    hemiSky: C(0.55, 0.65, 0.85), hemiGround: C(0.3, 0.25, 0.17), hemi: 0.55, exposure: 0.62, fogDensity: 0.00052,
  },
  noon: {
    sun: [0.3, 0.88, 0.36], sunColor: C(1.0, 0.94, 0.86), sunIntensity: 4.6,
    zenith: C(0.11, 0.27, 0.62), horizon: C(0.66, 0.73, 0.83), fogColor: C(0.56, 0.65, 0.78), fogSun: C(1.0, 0.92, 0.8),
    hemiSky: C(0.55, 0.68, 0.9), hemiGround: C(0.32, 0.27, 0.19), hemi: 0.6, exposure: 0.52, fogDensity: 0.00048,
  },
  golden: {
    sun: [0.82, 0.085, 0.57], sunColor: C(1.0, 0.56, 0.27), sunIntensity: 3.6,
    zenith: C(0.13, 0.22, 0.46), horizon: C(0.92, 0.66, 0.46), fogColor: C(0.66, 0.56, 0.5), fogSun: C(1.0, 0.58, 0.28),
    hemiSky: C(0.5, 0.52, 0.7), hemiGround: C(0.32, 0.22, 0.14), hemi: 0.5, exposure: 0.78, fogDensity: 0.0006,
  },
};

const todName = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('tod') : null;
export const TOD_NAME = TOD[todName] ? todName : 'day';
const T = TOD[TOD_NAME];

export const SUN_DIR = new THREE.Vector3(...T.sun).normalize();

export const ATMOS = {
  sunColor: T.sunColor,
  sunIntensity: T.sunIntensity,
  zenith: T.zenith,
  horizon: T.horizon,
  fogColor: T.fogColor,
  fogSun: T.fogSun,
  hemiSky: T.hemiSky,
  hemiGround: T.hemiGround,
  hemi: T.hemi,
  fogDensity: T.fogDensity,
  fogFalloff: 0.0017,
  fogBase: 0,
  exposure: T.exposure,
};

export const QUALITY = {
  low: {
    pixelRatio: 1, terrainSegments: 384, shadowMap: 1024, cypress: 2500, olive: 1500, shrubs: 3000,
    statueCell: 0.007, mirror: false, bloom: false, mist: 600, msaa: 0,
    erosion: { size: 384, drops: 50000 }, clouds: 0, godRays: false, ssao: false, birds: 60, dust: 0, houses: 380, figureCell: 0.009, flowers: 2500, treeLod: [220, 700],
  },
  high: {
    pixelRatio: 1, terrainSegments: 768, shadowMap: 4096, cypress: 9000, olive: 5000, shrubs: 12000,
    statueCell: 0.0035, mirror: true, bloom: true, mist: 2000, msaa: 4,
    erosion: { size: 768, drops: 220000 }, clouds: 18, godRays: true, ssao: true, birds: 140, dust: 1500, houses: 1100, figureCell: 0.006, flowers: 9000, treeLod: [380, 1200],
  },
  ultra: {
    pixelRatio: 2, terrainSegments: 1152, shadowMap: 8192, cypress: 16000, olive: 9000, shrubs: 24000,
    statueCell: 0.0025, mirror: true, bloom: true, mist: 4000, msaa: 4,
    erosion: { size: 1024, drops: 420000 }, clouds: 36, godRays: true, ssao: true, birds: 260, dust: 3000, houses: 1800, figureCell: 0.0045, flowers: 18000, treeLod: [600, 1800],
  },
};
