// Animated circuit schematic — procedural layout + packet animation.
//
// The board is generated from a seeded RNG so a given seed always draws the
// same schematic, which makes it shareable and screenshot-stable.
//
// No allocation happens inside the frame loop: trace geometry is flattened to
// a cumulative-length table once, and packets read from it.

const TAU = Math.PI * 2;

/* ---------- deterministic RNG ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];

function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- geometry ---------- */

// Flatten a polyline into cumulative arc lengths so a packet can be placed at
// an arbitrary distance without re-walking the points every frame.
function buildPath(points) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len === 0) continue;
    segs.push({ x1, y1, x2, y2, len, at: total });
    total += len;
  }
  return { segs, total };
}

function pointAt(path, distance) {
  const { segs, total } = path;
  if (!segs.length) return null;
  const d = ((distance % total) + total) % total;
  // linear scan is fine: traces have a handful of segments
  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].at + segs[mid].len < d) lo = mid + 1;
    else hi = mid;
  }
  const s = segs[lo];
  const t = (d - s.at) / s.len;
  return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
}

// Round the corners of an orthogonal route so traces read as PCB artwork.
function roundCorners(points, r) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    if (rr < 0.5) {
      out.push([cx, cy]);
      continue;
    }
    const a = [cx + ((px - cx) / d1) * rr, cy + ((py - cy) / d1) * rr];
    const b = [cx + ((nx - cx) / d2) * rr, cy + ((ny - cy) / d2) * rr];
    out.push(a, b);
  }
  out.push(points[points.length - 1]);
  return out;
}

/* ---------- schematic generation ---------- */

const NETS = [
  "CLK", "RST", "D0", "D1", "D2", "D3", "TX", "RX", "EN", "PWR",
  "SDA", "SCL", "AIN", "AOUT", "VSUP", "GND", "TRIG", "GATE", "SYNC", "MODE",
];

function generate(rand, cols, rows) {
  const nodes = [];
  const traces = [];

  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);

  // main processor
  const main = {
    id: "U1",
    kind: "ic",
    x: cx,
    y: cy,
    w: 9,
    h: 6,
    label: "CORE",
    pins: [],
    radius: 10,
  };
  const mainPinCount = 24;
  for (let i = 0; i < mainPinCount; i++) {
    const side = i % 4;
    const along = Math.floor(i / 4);
    const pin = {};
    if (side === 0) {
      pin.x = main.x - 4 + along * 1.6;
      pin.y = main.y - main.h / 2;
      pin.dir = [0, -1];
    } else if (side === 1) {
      pin.x = main.x + 4.5;
      pin.y = main.y - main.h / 2 + 0.5 + along;
      pin.dir = [1, 0];
    } else if (side === 2) {
      pin.x = main.x - 4 + along * 1.6;
      pin.y = main.y + main.h / 2;
      pin.dir = [0, 1];
    } else {
      pin.x = main.x - main.w / 2;
      pin.y = main.y - main.h / 2 + 0.5 + along;
      pin.dir = [-1, 0];
    }
    pin.gx = pin.x;
    pin.gy = pin.y;
    pin.net = NETS[i % NETS.length];
    main.pins.push(pin);
  }
  nodes.push(main);

  // satellites: smaller ICs and passives in a ring
  const kinds = [
    { kind: "ic", w: 3, h: 2, pins: 6 },
    { kind: "ic", w: 3, h: 2, pins: 6 },
    { kind: "ic", w: 3, h: 2, pins: 6 },
    { kind: "ic", w: 3, h: 2, pins: 6 },
    { kind: "passive", w: 1, h: 2, pins: 2 },
    { kind: "passive", w: 1, h: 2, pins: 2 },
    { kind: "passive", w: 1, h: 2, pins: 2 },
    { kind: "passive", w: 1, h: 2, pins: 2 },
  ];

  const slots = [];
  const spanX = cols / 2 - 4;
  const spanY = rows / 2 - 3.5;
  const jitter = (rand() - 0.5) * 2.2;
  for (let i = 0; i < kinds.length; i++) {
    // walk the ring by an irrational-ish step so satellites never line up
    const angle = i * 2.39996 - Math.PI / 2;
    slots.push([
      Math.round(cx + Math.cos(angle) * (spanX * 0.82) + jitter),
      Math.round(cy + Math.sin(angle) * (spanY * 0.86) + jitter),
    ]);
  }

  let refNum = 0;
  for (const k of kinds) {
    const [sx, sy] = slots.pop();
    const x = Math.max(2, Math.min(cols - 3, sx));
    const y = Math.max(2, Math.min(rows - 3, sy));
    const node = {
      id: k.kind === "ic" ? `U${++refNum + 1}` : `R${++refNum}`,
      kind: k.kind,
      x,
      y,
      w: k.w,
      h: k.h,
      pins: [],
      radius: 6,
    };

    for (let i = 0; i < k.pins; i++) {
      const t = k.pins === 1 ? 0.5 : i / (k.pins - 1);
      const horizontal = i % 2 === 0;
      const pin = horizontal
        ? { x: x - k.w / 2, y: y - k.h / 2 + t * k.h, dir: [-1, 0] }
        : { x: x + k.w / 2, y: y - k.h / 2 + t * k.h, dir: [1, 0] };
      pin.gx = pin.x;
      pin.gy = pin.y;
      pin.net = pick(rand, NETS);
      node.pins.push(pin);
    }
    nodes.push(node);
  }

  // route: each satellite pin finds a free main pin and draws an L/Z route
  const usedMain = new Set();
  let channelBias = 0;

  for (const node of nodes) {
    if (node === main) continue;
    for (const pin of node.pins) {
      // prefer a pin on the side this component actually faces, so traces
      // radiate outward instead of crossing the board
      let target = null;
      let bestScore = Infinity;
      for (let tries = 0; tries < main.pins.length; tries++) {
        const idx = Math.floor(rand() * main.pins.length);
        if (usedMain.has(idx)) continue;
        const mp = main.pins[idx];
        const score =
          Math.hypot(mp.gx - pin.gx, mp.gy - pin.gy) +
          (pin.dir[0] !== 0 && mp.dir[0] === pin.dir[0] ? -6 : 0) +
          rand() * 5;
        if (score < bestScore) {
          bestScore = score;
          target = mp;
        }
      }
      for (let tries = 0; tries < main.pins.length; tries++) {
        const idx = Math.floor(rand() * main.pins.length);
        if (!usedMain.has(idx)) {
          usedMain.add(idx);
          target = main.pins[idx];
          break;
        }
      }
      if (!target) continue;

      const from = [pin.gx + pin.dir[0] * 0.5, pin.gy + pin.dir[1] * 0.5];
      const to = [target.gx + target.dir[0] * 0.5, target.gy + target.dir[1] * 0.5];
      // keep the run between the two pins, nudged off the straight line so
      // parallel traces do not overlap
      const mid = (from[1] + to[1]) / 2 + (rand() - 0.5) * 1.6 + channelBias;
      const channel = Math.max(-rows / 2 + 2, Math.min(rows / 2 - 2, mid));

      const pts = [
        from,
        [from[0], channel],
        [to[0], channel],
        to,
      ];
      const rounded = roundCorners(pts, 0.42);
      const path = buildPath(rounded);

      channelBias = -channelBias || (rand() - 0.5) * 1.2;

      traces.push({
        points: rounded,
        path,
        a: pin,
        b: target,
        nodeA: node,
        nodeB: main,
        hue: rand(),
        width: pick(rand, [1.4, 1.4, 1.9, 2.3]),
        speed: 0.045 + rand() * 0.075,
        // packets are spaced along the trace; a few traces get more of them
        count: rand() > 0.55 ? 2 : 1,
        offset: rand(),
      });
    }
  }

  return { nodes, traces };
}

/* ---------- renderer ---------- */

const THEMES = {
  blueprint: {
    bg: "#0a1526",
    grid: "rgba(120,170,255,0.09)",
    gridBold: "rgba(120,170,255,0.2)",
    trace: "rgba(126,196,255,0.5)",
    traceHot: "#7ec4ff",
    node: "#bfe0ff",
    nodeFill: "#0a1526",
    glow: "rgba(126,196,255,0.85)",
    chip: "#132845",
    chipEdge: "#3d6ea8",
    text: "#cfe4ff",
    textDim: "rgba(207,228,255,0.5)",
  },
  amber: {
    bg: "#140f06",
    grid: "rgba(255,190,90,0.085)",
    gridBold: "rgba(255,190,90,0.19)",
    trace: "rgba(255,183,77,0.5)",
    traceHot: "#ffb74d",
    node: "#ffd9a0",
    nodeFill: "#140f06",
    glow: "rgba(255,183,77,0.85)",
    chip: "#2a1d0a",
    chipEdge: "#8a5f1c",
    text: "#ffe3bd",
    textDim: "rgba(255,227,189,0.5)",
  },
  mint: {
    bg: "#04140f",
    grid: "rgba(90,230,180,0.09)",
    gridBold: "rgba(90,230,180,0.2)",
    trace: "rgba(90,230,180,0.5)",
    traceHot: "#5ae6b4",
    node: "#c6ffe9",
    nodeFill: "#04140f",
    glow: "rgba(90,230,180,0.85)",
    chip: "#0b2a20",
    chipEdge: "#2c7d63",
    text: "#c6ffe9",
    textDim: "rgba(198,255,233,0.5)",
  },
};

export class Schematic {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.themeName = opts.theme || "blueprint";
    this.theme = THEMES[this.themeName];
    this.speed = opts.speed ?? 1;
    this.running = true;
    this.seed = opts.seed ?? 20261015;
    this.t = 0;
    this.dpr = 1;
    this.cell = 32;
    this.cols = 40;
    this.rows = 24;
    this.hover = null;
    this.pinned = null;
    this.packets = 0;

    this.onStats = opts.onStats || null;
    this.onSelect = opts.onSelect || null;
    this.onHoverChange = opts.onHoverChange || null;

    this.#bindPointer();
    this.resize();
  }

  /* ---------- geometry / layout ---------- */

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(240, Math.round(rect.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;

    this.cols = Math.max(22, Math.min(64, Math.round(w / 30)));
    this.rows = Math.max(14, Math.min(40, Math.round(h / 30)));
    this.cell = Math.min(w / this.cols, h / this.rows);
    this.ox = (w - this.cell * this.cols) / 2;
    this.oy = (h - this.cell * this.rows) / 2;

    this.regenerate(this.seed);
  }

  regenerate(seed) {
    if (typeof seed === "number") this.seed = seed >>> 0;
    const rand = mulberry32(this.seed);
    const { nodes, traces } = generate(rand, this.cols, this.rows);
    this.nodes = nodes;
    this.traces = traces;
    this.packets = traces.reduce((n, t) => n + t.count, 0);
    this._layerKey = null;
    if (this.onStats) {
      this.onStats({
        nodes: nodes.length,
        traces: traces.length,
        pins: nodes.reduce((n, nd) => n + nd.pins.length, 0),
        packets: this.packets,
        seed: this.seed,
      });
    }
  }

  setTheme(name) {
    if (!THEMES[name]) return;
    this.themeName = name;
    this.theme = THEMES[name];
    this._layerKey = null;
    this.draw();
  }

  /* ---------- interaction ---------- */

  #bindPointer() {
    const toCell = (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left - this.ox) / this.cell;
      const y = (ev.clientY - rect.top - this.oy) / this.cell;
      return [x, y];
    };

    this.canvas.addEventListener("pointermove", (ev) => {
      const [x, y] = toCell(ev);
      const hit = this.#nodeAt(x, y);
      const id = hit ? hit.id : null;
      if (id !== this.hover) {
        this.hover = id;
        this.canvas.style.cursor = id ? "pointer" : "default";
        if (this.onHoverChange) this.onHoverChange(id);
      }
    });

    this.canvas.addEventListener("pointerleave", () => {
      this.hover = null;
      if (this.onHoverChange) this.onHoverChange(null);
    });

    this.canvas.addEventListener("click", (ev) => {
      const [x, y] = toCell(ev);
      const hit = this.#nodeAt(x, y);
      const id = hit ? hit.id : null;
      this.pinned = this.pinned === id ? null : id;
      if (this.onSelect) this.onSelect(this.pinned ? this.#describe(this.pinned) : null);
    });
  }

  #nodeAt(x, y) {
    let best = null;
    let bestD = 1.6; // in cells
    for (const node of this.nodes) {
      const cx = node.x;
      const cy = node.y;
      const d = Math.hypot(x - cx, y - cy);
      const inside =
        Math.abs(x - cx) <= node.w / 2 + 0.3 && Math.abs(y - cy) <= node.h / 2 + 0.3;
      if (!inside && d > bestD) continue;
      if (inside || d < bestD) {
        best = node;
        bestD = inside ? 0 : d;
      }
    }
    return best;
  }

  #describe(id) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return null;
    const linked = this.traces.filter((t) => t.a.net === undefined ? false : (t.nodeA === node || t.nodeB === node));
    return {
      id: node.id,
      kind: node.kind,
      label: node.label || node.kind.toUpperCase(),
      pins: node.pins.length,
      nets: linked.slice(0, 6).map((t) => (t.nodeA === node ? t.a.net : t.b.net)),
    };
  }

  /* ---------- cached assets ---------- */

  // Baked once per theme: a soft radial dot used for every packet glow.
  #glowSprite() {
    if (this._glow && this._glowFor === this.themeName) return this._glow;
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, hexToRgba(this.theme.traceHot, 0.95));
    grd.addColorStop(0.22, hexToRgba(this.theme.traceHot, 0.42));
    grd.addColorStop(0.55, hexToRgba(this.theme.traceHot, 0.1));
    grd.addColorStop(1, hexToRgba(this.theme.traceHot, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    this._glow = c;
    this._glowFor = this.themeName;
    return c;
  }

  // Grid + traces + node bodies never change between frames, so they are baked
  // to an offscreen layer and blitted. Only the packets are drawn live.
  #renderLayer() {
    const { w, h, dpr } = this;
    if (!this.layer) this.layer = document.createElement("canvas");
    if (this.layer.width !== Math.round(w * dpr) || this.layer.height !== Math.round(h * dpr)) {
      this.layer.width = Math.round(w * dpr);
      this.layer.height = Math.round(h * dpr);
    }
    const c = this.layer.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = this.theme.bg;
    c.fillRect(0, 0, w, h);
    c.lineCap = "round";
    c.lineJoin = "round";
    this.#drawGrid(c);
    this.#strokeTraces(c, null);
    this.#drawNodes(c, null);
    this._layerKey = `${this.themeName}|${this.seed}|${this.w}x${this.h}`;
  }

  #strokeTraces(ctx, focus) {
    const { theme, cell, ox, oy } = this;
    for (const t of this.traces) {
      const dimmed = focus && !(t.nodeA.id === focus || t.nodeB.id === focus);
      ctx.globalAlpha = dimmed ? 0.22 : 1;
      ctx.strokeStyle = theme.trace;
      ctx.lineWidth = t.width;
      const p = t.points;
      ctx.beginPath();
      ctx.moveTo(ox + p[0][0] * cell, oy + p[0][1] * cell);
      for (let i = 1; i < p.length; i++) ctx.lineTo(ox + p[i][0] * cell, oy + p[i][1] * cell);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  setRunning(on) {
    this.running = on;
  }

  /* ---------- frame ---------- */

  update(dt) {
    if (!this.running) return;
    this.t += dt * this.speed;
  }

  draw() {
    const { ctx, theme, cell, ox, oy, w, h } = this;
    const focus = this.pinned || this.hover;

    // With nothing focused — the common case — blit the baked layer.
    // Focusing needs selective dimming, which the flat layer cannot express,
    // so that path redraws from scratch.
    if (!focus) {
      const key = `${this.themeName}|${this.seed}|${w}x${h}`;
      if (this._layerKey !== key) this.#renderLayer();
      ctx.drawImage(this.layer, 0, 0, w, h);
    } else {
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      this.#drawGrid(ctx);
      this.#strokeTraces(ctx, focus);
      this.#drawNodes(ctx, focus);
    }

    // packets
    // A canvas shadowBlur per packet is the single most expensive thing this
    // can do — dozens of blurred fills per frame. Instead a radial-gradient
    // sprite is baked once per colour and blitted, which is roughly free.
    const sprite = this.#glowSprite();
    ctx.globalCompositeOperation = "lighter";
    for (const t of this.traces) {
      const dimmed = focus && !(t.nodeA.id === focus || t.nodeB.id === focus);
      ctx.globalAlpha = dimmed ? 0.18 : 1;
      for (let i = 0; i < t.count; i++) {
        const d =
          (this.t * t.path.total * t.speed +
            t.offset * t.path.total +
            i * (t.path.total / t.count)) %
          t.path.total;
        const p = pointAt(t.path, d);
        if (!p) continue;
        const x = ox + p.x * cell;
        const y = oy + p.y * cell;
        const r = 2.6 + t.width * 0.6;
        const halo = r * 5;

        ctx.drawImage(sprite, x - halo, y - halo, halo * 2, halo * 2);
        ctx.globalAlpha = dimmed ? 0.25 : 1;
        ctx.fillStyle = theme.traceHot;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    this.#drawScanline(ctx);

    if (focus) this.#drawProbe(ctx, focus);
  }

  #drawGrid(ctx) {
    const { theme, cell, ox, oy, cols, rows } = this;
    const fine = cell < 26;
    const top = Math.round(oy) + 0.5;
    const left = Math.round(ox) + 0.5;
    const bottom = Math.round(oy + rows * cell) + 0.5;
    const right = Math.round(ox + cols * cell) + 0.5;

    ctx.lineWidth = 1;

    // One stroke per line. Iterating (col, row) and drawing both lines inside
    // the loop drew every line dozens of times, which stacked the alpha up to
    // near-opaque and buried the schematic under the grid.
    for (let c = 0; c <= cols; c++) {
      if (fine && c % 2) continue;
      ctx.strokeStyle = c % 5 === 0 ? theme.gridBold : theme.grid;
      const x = Math.round(ox + c * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    for (let r = 0; r <= rows; r++) {
      if (fine && r % 2) continue;
      ctx.strokeStyle = r % 5 === 0 ? theme.gridBold : theme.grid;
      const y = Math.round(oy + r * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    // board outline
    ctx.strokeStyle = theme.gridBold;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left, top, right - left, bottom - top);
  }

  #drawNodes(ctx, focus) {
    const { theme, cell, ox, oy } = this;
    ctx.font = `600 ${Math.max(8, Math.min(11, cell * 0.42))}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const node of this.nodes) {
      const cx = ox + node.x * cell;
      const cy = oy + node.y * cell;
      const w = node.w * cell;
      const h = node.h * cell;
      const dimmed = focus && node.id !== focus && !this.#linkedTo(node, focus);

      ctx.globalAlpha = dimmed ? 0.3 : 1;

      // body
      ctx.fillStyle = theme.chip;
      ctx.strokeStyle = focus === node.id ? theme.traceHot : theme.chipEdge;
      ctx.lineWidth = focus === node.id ? 2 : 1.4;
      this.#roundRect(ctx, cx - w / 2, cy - h / 2, w, h, node.radius);
      ctx.fill();
      ctx.stroke();

      // pin ticks
      ctx.strokeStyle = theme.chipEdge;
      ctx.lineWidth = 1.4;
      for (const pin of node.pins) {
        const px = ox + pin.gx * cell;
        const py = oy + pin.gy * cell;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + pin.dir[0] * cell * 0.28, py + pin.dir[1] * cell * 0.28);
        ctx.stroke();
        ctx.fillStyle = theme.nodeFill;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.6, cell * 0.07), 0, TAU);
        ctx.fill();
        ctx.strokeStyle = theme.node;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = theme.chipEdge;
        ctx.lineWidth = 1.4;
      }

      // designator
      ctx.fillStyle = focus === node.id ? theme.traceHot : theme.text;
      const label = node.id;
      ctx.fillText(label, cx, cy - h * 0.16);
      if (node.label) {
        ctx.fillStyle = theme.textDim;
        ctx.fillText(node.label, cx, cy + h * 0.22);
      }
    }
    ctx.globalAlpha = 1;
  }

  #linkedTo(node, focus) {
    return this.traces.some(
      (t) => (t.nodeA === node && t.nodeB.id === focus) || (t.nodeB === node && t.nodeA.id === focus)
    );
  }

  #drawScanline(ctx) {
    if (this.speed <= 0) return;
    const { theme, h } = this;
    const y = ((this.t * 0.12) % 1) * h;
    const g = ctx.createLinearGradient(0, y - 46, 0, y + 46);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, theme.glow.replace("0.85", "0.07"));
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 46, this.w, 92);
  }

  #drawProbe(ctx, id) {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    const { theme, cell, ox, oy } = this;
    const pad = cell * 0.45;
    const x = ox + node.x * cell - node.w * cell / 2 - pad;
    const y = oy + node.y * cell - node.h * cell / 2 - pad;
    const w = node.w * cell + pad * 2;
    const h = node.h * cell + pad * 2;

    ctx.save();
    ctx.strokeStyle = theme.traceHot;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    // corner ticks, like a measurement caliper
    ctx.strokeStyle = theme.traceHot;
    ctx.lineWidth = 2;
    const t = Math.min(12, cell * 0.5);
    for (const [cx, cy, sx, sy] of [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * t);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * t, cy);
      ctx.stroke();
    }
  }

  #roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  destroy() {
    this.running = false;
  }
}

export { THEMES };