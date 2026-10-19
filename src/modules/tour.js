import * as THREE from 'three';

// Smooth looping flythrough: centripetal Catmull-Rom splines through the named views
// (camera positions and look targets separately), arc-length parameterised so speed
// is even, and kept a safe height above the terrain.
export function createTour(field, views, order, { duration = 110, clearance = 10 } = {}) {
  const P = [], T = [];
  for (const name of order) {
    const v = views[name];
    if (!v) continue;
    const [x, y, z] = v.pos;
    P.push(new THREE.Vector3(x, v.abs ? y : field.heightAt(x, z) + y, z));
    T.push(new THREE.Vector3(...v.target));
  }
  const pc = new THREE.CatmullRomCurve3(P, true, 'centripetal');
  const tc = new THREE.CatmullRomCurve3(T, true, 'centripetal');
  pc.arcLengthDivisions = 2000;
  const tmpT = new THREE.Vector3();
  function apply(camera, time) {
    const u = ((time / duration) % 1 + 1) % 1;
    pc.getPointAt(u, camera.position);
    const g = field.heightAt(camera.position.x, camera.position.z) + clearance;
    if (camera.position.y < g) camera.position.y = g;
    // Targets follow the same arc-length fraction mapped back to the knot parameter.
    tc.getPoint(pc.getUtoTmapping(u), tmpT);
    camera.lookAt(tmpT);
    return tmpT;
  }
  return { apply, duration, curve: pc };
}

export const TOUR_ORDER = ['aerial', 'vista', 'waterfall', 'sunrays', 'theatre', 'hero', 'stairs', 'statue', 'temple', 'agora'];
