// Wires the schematic to the page controls.

import { Schematic } from "./schematic.js";

const canvas = document.getElementById("board");
const statsEl = document.getElementById("stats");
const readout = document.getElementById("readout");
const rId = document.getElementById("readout-id");
const rKind = document.getElementById("readout-kind");
const rPins = document.getElementById("readout-pins");
const rNets = document.getElementById("readout-nets");
const toggle = document.getElementById("toggle");
const reseed = document.getElementById("reseed");
const speed = document.getElementById("speed");
const speedOut = document.getElementById("speed-out");

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

const board = new Schematic(canvas, {
  seed: 20261015,
  speed: reduced.matches ? 0 : 1,
  onStats: (s) => {
    statsEl.textContent = `${s.nodes} components · ${s.pins} pins · ${s.packets} packets · seed ${s.seed}`;
  },
  onSelect: (info) => {
    if (!info) {
      readout.hidden = true;
      return;
    }
    readout.hidden = false;
    rId.textContent = `${info.id} · ${info.label}`;
    rKind.textContent = info.kind;
    rPins.textContent = info.pins;
    rNets.textContent = info.nets.length ? info.nets.join(", ") : "—";
  },
});

/* ---------- loop ---------- */

let last = performance.now();
let raf = 0;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  board.update(dt);
  board.draw();
}
raf = requestAnimationFrame(frame);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
  } else {
    last = performance.now(); // don't bill the user for the hidden gap
    raf = requestAnimationFrame(frame);
  }
});

/* ---------- controls ---------- */

toggle.addEventListener("click", () => {
  const isPaused = toggle.getAttribute("aria-pressed") === "true";
  const next = !isPaused;
  toggle.setAttribute("aria-pressed", String(next));
  toggle.textContent = next ? "Resume" : "Pause";
  board.setRunning(!next);
});

reseed.addEventListener("click", () => {
  board.regenerate((Math.random() * 0xffffffff) >>> 0);
  readout.hidden = true;
});

speed.addEventListener("input", () => {
  const v = Number(speed.value);
  board.speed = v;
  speedOut.textContent = `${v.toFixed(1)}×`;
  // At 0x the simulation time stops advancing on its own, because update()
  // multiplies dt by speed — no special handling needed.
});

document.querySelectorAll(".swatch").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-checked", "false");
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-checked", "true");
    board.setTheme(btn.dataset.theme);
    document.documentElement.style.setProperty("--board-bg", board.theme.bg);
  });
});

if (reduced.matches) {
  toggle.setAttribute("aria-pressed", "true");
  toggle.textContent = "Resume";
  board.setRunning(false);
}

const ro = new ResizeObserver(() => board.resize());
ro.observe(canvas);

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(raf);
  board.destroy();
});