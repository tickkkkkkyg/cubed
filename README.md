# CUBED — a voxel world in your browser

A Minecraft-style 3D landing page built with **Vite + three.js** (vanilla JS, no framework).
A procedurally generated chunk of terrain — grass, dirt, stone, oak trees, a lit torch —
rendered live in a full-viewport WebGL canvas with an accessible UI overlay on top.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:5100
pnpm build        # -> dist/
pnpm preview      # serve the production build
```

## Files

```
index.html        markup, overlay UI, no-WebGL fallback
src/main.js       wiring: keyboard, buttons, error handling, budget readout
src/scene.js      renderer, lights, terrain generation, render loop, dispose
src/textures.js   procedural pixel textures (CanvasTexture, NearestFilter)
src/style.css     design tokens + layout + responsive + reduced-motion
public/fallback.svg   still image shown when WebGL is unavailable
```

## How the world is built

Terrain height comes from a deterministic trigonometric noise function, so the chunk is
identical on every reload. Each block is placed into one of five buckets by material, and each
bucket becomes a single `InstancedMesh` — that is why the whole island costs **37 draw calls**
instead of thousands. Grass blocks use a six-material array so the top face gets grass and the
sides get the grass-over-dirt texture, exactly like the real thing.

Pixel textures are painted at 16×16 onto a canvas and uploaded with `NearestFilter`, which is
what keeps the blocks reading as Minecraft rather than as smooth 3D.

## Performance

| Metric | Measured | Budget |
|---|---|---|
| Draw calls | 37 | < 150 |
| Triangles | 40.3k | < 300k |
| Textures | 16 | < 20 |
| JS (gzip) | ~142 kB | < 200 kB |

Pixel ratio is capped at 2 and drops to 1 automatically if the average frame time exceeds 26 ms.
The shadow map is only redrawn when the camera moves, since nothing in the scene casts a moving
shadow. The live readout in the bottom-right shows the current budget.

## Accessibility

- Canvas has `role="img"`, an accessible name, and is focusable.
- Arrow keys orbit, `Home` resets, `Space` toggles motion — OrbitControls is mouse-only, so
  these are the keyboard equivalents.
- Visible rotate/reset buttons, all ≥ 44×44 px.
- `prefers-reduced-motion` disables auto-rotate, cloud drift, and flame flicker, and renders a
  single static frame.
- If WebGL fails to initialise, the overlay is hidden and a still image is shown instead.
- A scrim behind the overlay guarantees text contrast over any part of the scene.

## Notes

`NODE_ENV=production` is set container-wide here, which makes `import.meta.env.DEV` false even
under `vite dev`. The budget readout is therefore wired unconditionally rather than behind a DEV
check.