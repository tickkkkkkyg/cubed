// /workspace/repos/minecraft-3d/src/main.js
import { createWorld } from "./scene.js";
import "./style.css";

const canvas = document.getElementById("scene");
const fallback = document.getElementById("fallback");
const btnPause = document.getElementById("btn-pause");
const btnSpin = document.getElementById("btn-spin");
const statsEl = document.getElementById("stats");

let world = null;

try {
  // the budget readout is always live: it tells you what the renderer is
  // actually spending, which matters on any GPU
  world = createWorld(canvas, (s) => {
    statsEl.textContent = `${s.calls} calls · ${(s.triangles / 1000).toFixed(1)}k tris · ${s.textures} tex`;
  });
  canvas.addEventListener("keydown", onKey);
  canvas.addEventListener("pointerdown", () => canvas.focus());
} catch (err) {
  console.error("WebGL init failed", err);
  fallback.hidden = false;
  canvas.hidden = true;
  // the whole UI is meaningless without the scene behind it
  document.querySelector(".overlay")?.setAttribute("hidden", "");
}

function onKey(e) {
  switch (e.key) {
    case "ArrowLeft":
      world.rotate(0.16);
      break;
    case "ArrowRight":
      world.rotate(-0.16);
      break;
    case "ArrowUp":
      world.nudgeVertical(1);
      break;
    case "ArrowDown":
      world.nudgeVertical(-1);
      break;
    case "Home":
      world.reset();
      break;
    case " ":
      e.preventDefault();
      togglePause();
      break;
    default:
      return;
  }
}

function togglePause() {
  const paused = btnPause.getAttribute("aria-pressed") === "true";
  btnPause.setAttribute("aria-pressed", String(!paused));
  btnPause.textContent = paused ? "Pause motion" : "Resume motion";
  world.setAutoRotate(paused);
}

if (world) {
  btnPause?.addEventListener("click", togglePause);
  btnSpin?.addEventListener("click", () => {
    world.reset();
    world.setAutoRotate(true);
    btnPause.setAttribute("aria-pressed", "false");
    btnPause.textContent = "Pause motion";
  });

  document.querySelectorAll("[data-rotate]").forEach((b) =>
    b.addEventListener("click", () => world.rotate((Number(b.dataset.rotate) * Math.PI) / 180))
  );
  document.querySelector("[data-reset]")?.addEventListener("click", () => world.reset());
}

// dev-only budget readout is fed from the render loop via the onStats callback

window.addEventListener("beforeunload", () => world?.dispose());