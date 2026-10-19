import GUI from 'lil-gui';

export function createGui({ renderer, scene, setView, views, qualityName, lights }) {
  const gui = new GUI({ title: 'Athenaion' });
  const state = {
    view: 'vista',
    quality: qualityName,
    exposure: renderer.toneMappingExposure,
    fog: scene.fog.density,
    sun: lights.sun.intensity,
  };
  gui.add(state, 'view', Object.keys(views)).onChange(setView);
  gui.add(state, 'quality', ['low', 'high', 'ultra']).onChange((q) => {
    const p = new URLSearchParams(location.search);
    p.set('quality', q);
    location.search = p.toString();
  });
  gui.add(state, 'exposure', 0.1, 2, 0.01).onChange((v) => (renderer.toneMappingExposure = v));
  gui.add(state, 'fog', 0, 0.002, 0.00001).onChange((v) => (scene.fog.density = v));
  gui.add(state, 'sun', 0, 10, 0.1).onChange((v) => (lights.sun.intensity = v));
  return gui;
}
