import * as THREE from 'three';
import { createMarbleMaterial, createPaintedMaterial } from './modules/materials/marble.js';
import { createGoldMaterial } from './modules/materials/gold.js';
import { createAshlarMaterial } from './modules/materials/stone.js';

export function createMaterials(world) {
  const groundY = world.acropolis.top;
  return {
    marble: createMarbleMaterial({ groundY, color: new THREE.Color(0.78, 0.74, 0.66) }),
    statue: createMarbleMaterial({ groundY: groundY - 10, color: new THREE.Color(0.74, 0.7, 0.63), weathering: 0.85, scale: 0.8, bump: 0.25, roughness: 0.5 }),
    roof: createMarbleMaterial({ groundY: groundY - 50, color: new THREE.Color(0.78, 0.74, 0.66), tiles: 0.9, weathering: 1.2 }),
    paving: createMarbleMaterial({ groundY: groundY - 3, color: new THREE.Color(0.66, 0.62, 0.55), tiles: 2.2, weathering: 1.3, bump: 0.3 }),
    navy: createPaintedMaterial(new THREE.Color(0.06, 0.1, 0.24), { groundY }),
    gold: createGoldMaterial(),
    bronze: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.35, 0.22, 0.12), metalness: 0.9, roughness: 0.45 }),
    ashlar: createAshlarMaterial(),
    plaster: createMarbleMaterial({ groundY: 0, color: new THREE.Color(0.8, 0.76, 0.68), weathering: 1.4, scale: 0.2, roughness: 0.85 }),
    tile: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.55, 0.22, 0.12), roughness: 0.8 }),
  };
}
