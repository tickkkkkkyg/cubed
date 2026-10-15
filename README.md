# CUBED — a voxel world, and the XyleHosting marketing site

Two sites in one Vite project, both deployed to GitHub Pages.

| Path | What it is |
|---|---|
| `/` | A Minecraft-style 3D landing page — three.js, procedural voxel terrain |
| `/hosting/` | The XyleHosting marketing and legal site |
| `/animation/` | An animated circuit schematic — procedural board, packets travelling the traces |

Both are static and share one build. There is no framework.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:5100
pnpm build        # -> dist/
pnpm preview      # serve the production build
```

## Files

```
index.html                3D site: overlay UI, no-WebGL fallback
src/main.js               3D site wiring: keyboard, buttons, error handling
src/scene.js              renderer, lights, terrain generation, render loop, dispose
src/textures.js           procedural pixel textures (CanvasTexture, NearestFilter)
src/style.css             3D site design tokens + layout

animation/index.html       schematic animation page
animation/schematic.js     procedural board generation + packet renderer
animation/schematic.css    animation page styles
animation/app.js           control wiring

hosting/index.html        marketing home (stacked product list)
hosting/web-hosting.html  website hosting plans
hosting/minecraft.html    Minecraft plans
hosting/vps.html          VPS plans
hosting/dedicated.html    dedicated server plans
hosting/terms.html        terms of service  (DRAFT — see below)
hosting/privacy.html      privacy policy     (DRAFT — see below)
hosting/hosting.css       XyleHosting brand tokens, dark + light themes
hosting/hosting.js        theme toggle, mobile nav, Escape-to-close

public/fallback.svg       still image shown when WebGL is unavailable
```

## The 3D site

Terrain height comes from a deterministic trigonometric noise function, so the chunk is
identical on every reload. Each block is placed into one of five buckets by material, and each
bucket becomes a single `InstancedMesh` — that is why the whole island costs **37 draw calls**
instead of thousands. Grass blocks use a six-material array so the top face gets grass and the
sides get the grass-over-dirt texture, exactly like the real thing.

| Metric | Measured | Budget |
|---|---|---|
| Draw calls | 37 | < 150 |
| Triangles | 40.3k | < 300k |
| Textures | 16 | < 20 |
| JS (gzip) | ~142 kB | < 200 kB |

Pixel ratio is capped at 2 and drops to 1 automatically if the average frame time exceeds 26 ms.
The shadow map is only redrawn when the camera moves, since nothing in the scene casts a moving
shadow. The live readout in the bottom-right shows the current budget.

**Accessibility.** Canvas has `role="img"`, an accessible name, and is focusable. Arrow keys
orbit, `Home` resets, `Space` toggles motion — OrbitControls is mouse-only, so these are the
keyboard equivalents. `prefers-reduced-motion` disables auto-rotate, cloud drift and flame
flicker, and renders a single static frame. If WebGL fails to initialise the overlay is hidden
and a still image is shown instead.

## The XyleHosting site

Brand tokens live at the top of `hosting/hosting.css`: `#0d0d0f` background and `#7c5cff` violet
primary, with a light theme that swaps primary to `#6a4bf0`. Components consume only `var(--*)`;
there are no hex literals outside the token block.

Plan data is hardcoded in each page's markup. When you connect a real billing API, replace the
card and table contents rather than teaching the CSS about your pricing.

**Accessibility.** One `<h1>` per page in order, real landmarks, `scope` on every table header,
visible focus rings, 44 px minimum tap targets, and a skip link on every page.

### Legal pages need a lawyer

`hosting/terms.html` and `hosting/privacy.html` were written from a generic hosting template.
**They have not been reviewed by a lawyer and are not safe to rely on as-is.** Both carry a
visible "this is a draft" callout. Before you publish them as binding, counsel should confirm:

- the legal entity name and jurisdiction
- the 72-hour refund window and the uptime SLA wording
- the liability cap and indemnity terms
- whether you are the controller or a processor for customer server content
- your actual sub-processors, retention periods and data-transfer safeguards

`legal@xyle.host` and `privacy@xyle.host` are placeholders. Make sure they resolve before launch.

## The schematic animation

`animation/` draws a procedurally generated circuit board on canvas 2D. A seeded
RNG (`mulberry32`) places a core IC and eight satellite components on a grid and
routes traces between their pins, so a given seed always draws the same board.

Packets travel along each trace and are placed by arc length, so they follow the
rounded corners rather than cutting across them. Hovering a component dims
everything it is not wired to; clicking pins the probe and shows its nets.

Two performance decisions carry this page:

- **No `shadowBlur` in the frame loop.** Canvas shadow blur is the most expensive
  operation available here, and doing one per packet cost ~48 fps of headroom. A
  radial-gradient sprite is baked once per colour and blitted instead.
- **The static layer is cached.** Grid, traces and node bodies never change
  between frames, so they are drawn once to an offscreen canvas and blitted.
  Only packets are drawn live. Focusing a component redraws from scratch, since
  selective dimming cannot be expressed in a flat cached image.

Measured 52 fps at 1440×900 under pure software rendering (SwiftShader, no GPU).

## Images

Photography on the hosting pages is self-hosted in `public/img/` as responsive WebP at
480 / 768 / 960 px. Every file is CC0 or Public Domain Mark — no attribution legally
required, but `public/img/CREDITS.md` credits each source anyway.

Sources were pulled through the Openverse API filtered to `license=cc0,pdm`. Nothing is
hotlinked, so a third party cannot break the page or throttle the visitor. Only widths at
or below each source's native width are emitted, so the `srcset` in the markup is honest.

**No Minecraft artwork is used.** Mojang owns the Minecraft IP, and their brand guidelines
restrict using it to promote commercial products — a CC licence on a screenshot does not
override that. The Minecraft identity leans on the voxel renderer at the site root instead.

## Deployment

GitHub Actions builds on every push to `main` and deploys to Pages. The Vite `base` is `"./"`, so
the build works from any Pages subpath without a rebuild — verified by serving `dist/` from a
nested directory, which is the condition Pages actually uses.

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