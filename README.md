# Athenaion

A procedural ancient Greek world in Three.js with **zero external assets**. Every mesh, texture and shader is generated in code: noise heightfields, SDF statues baked to mesh, instanced vegetation, canvas-drawn banners, DataTexture water normals and GLSL materials.

## Run

```bash
npm install
npm run dev                # http://localhost:5173
npm run build && npm run serve   # static server for dist/ on http://localhost:4173
```

URL params: `?quality=low|high|ultra`, `?view=vista|hero|waterfall|statue|temple|aerial|stairs`, `?time=12` (freeze animation), `?exposure=0.62`, `?w=&h=` (fixed canvas size), `?gui=0` (hide lil-gui).

## Render stills

```bash
npm run build
npm run render -- --quality=high --views=vista,hero,waterfall --w=1920 --h=1080
```

Uses puppeteer-core with a local Chrome/Chromium (`CHROME_PATH` to override). SwiftShader by default; add `--gpu=true` to use the real GPU. Output goes to `renders/<view>-<quality>[-suffix].png`. Options: `--out`, `--suffix`, `--time`, `--port`.

## Structure

```
index.html  vite.config.js  package.json
src/
  main.js        renderer, scene assembly, controls, render loop
  config.js      world layout, sun/atmosphere, quality presets
  views.js       preset camera views
  materials.js   shared material set
  gui.js         lil-gui panel (views, sun, exposure, quality)
  modules/
    utils/        rng (seeded mulberry32), noise (value/perlin, fBm, ridged), math
    terrain/      heightfield (fBm + ridged mountains, acropolis plateau, mesa cliff, lake basin, terraced cliffs),
                  terrainMesh (non-uniform LOD grid), terrainMaterial (grass/dirt/rock/snow by height+slope, triplanar-ish fissures, bump)
    architecture/ column (fluted Doric, entasis, echinus, abacus), temple (stylobate, peristyle, entablature, triglyphs, pediment,
                  roof, gold acroteria/shields), ornaments, walls (terrain-following circuit wall, stairway), banners, town, acropolis (assembly)
    statues/      sdf primitives, athenaSdf (marble + gold fields), surfaceNets mesher, bakeSdf (gradient normals, cavity AO), athena
    vegetation/   treeGeometry (cypress, olive, shrub, grass tuft), foliageMaterial, scatter (slope/height/noise density, clearings)
    water/        lake (Water.js mirror with procedural normals, or cheap PBR fallback), stream, waterfall (scrolling foam), mist (instanced spray)
    atmosphere/   sky (procedural dome + baked env map for IBL), lights (sun with shadows, hemisphere), fog (exponential height fog), post (bloom, grade, ACES output)
    materials/    marble (veining, weathering, streaks, lichen, cavity dirt), gold, stone (ashlar), banner (waving cloth), owlEmblem (canvas), waterNormals, glsl helpers
tools/
  serve.js   plain node static server
  render.js  headless screenshot capture
```

## Known limitations

- Single heightfield mesh, no chunking or streaming; far mountains are low frequency and a bit uniform.
- Statue is SDF-baked at moderate resolution. The face and drapery are stylized, and the spear is separate geometry.
- Vegetation is low-poly instanced geometry with no billboards/impostors; cypresses read slightly smooth up close.
- Mist is a soft particle cloud with no lighting, and it can bloom hot against bright sky.
- SwiftShader renders take about 30 to 40 s per high-quality frame.

## Roadmap (prioritized)

1. Hydraulic/thermal erosion pass on the heightfield; carved river from waterfall to lake.
2. Terrain chunking + LOD (CDLOD/quadtree) and GPU-side heightfield for a larger world.
3. Statue detail: higher-res sparse SDF bake, sculpted face, deeper drapery, relief pedestal; more statues (kouroi, caryatids).
4. City expansion: agora, stoa, theatre, roads, Erechtheion with Ionic columns, procedural weathering per building.
5. Volumetric clouds and god rays; lit mist with depth-aware soft particles.
6. Vegetation impostors, wind animation, and denser grass via GPU instancing.
7. Offline path-traced mode via three-gpu-pathtracer for hero stills.
8. Time-of-day and weather presets; cinematic camera paths and video capture.
