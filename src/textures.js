// /workspace/repos/minecraft-3d/src/textures.js
import * as THREE from "three";

function canvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"));
  return c;
}

function finish(c) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// deterministic pseudo-random for stable textures
function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function grassTopTexture() {
  return finish(canvas(16, 16, (ctx) => {
    const r = rng(1);
    ctx.fillStyle = "#5b8f3a";
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * 16);
      const y = Math.floor(r() * 16);
      ctx.fillStyle = r() > 0.5 ? "#4a7a2e" : "#6fae45";
      ctx.fillRect(x, y, 1, 1);
    }
    // a few dark flecks
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "#3f6b24";
      ctx.fillRect(Math.floor(r()*16), Math.floor(r()*16), 1, 1);
    }
  }));
}

export function grassSideTexture() {
  return finish(canvas(16, 16, (ctx) => {
    const r = rng(2);
    // dirt lower 12 rows
    ctx.fillStyle = "#7a4f2e";
    ctx.fillRect(0, 4, 16, 12);
    for (let y = 4; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (r() < 0.18) {
          ctx.fillStyle = r() > 0.5 ? "#5f3a20" : "#8a5a34";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    // grass top band
    ctx.fillStyle = "#5b8f3a";
    ctx.fillRect(0, 0, 16, 4);
    for (let x = 0; x < 16; x++) {
      if (r() < 0.4) {
        ctx.fillStyle = "#6fae45";
        ctx.fillRect(x, 3, 1, 1);
      }
      if (r() < 0.25) {
        ctx.fillStyle = "#4a7a2e";
        ctx.fillRect(x, 0, 1, 1);
      }
    }
    // dirt speckles bleeding into grass
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#7a4f2e";
      ctx.fillRect(Math.floor(r()*16), 3, 1, 1);
    }
  }));
}

export function dirtTexture() {
  return finish(canvas(16, 16, (ctx) => {
    const r = rng(3);
    ctx.fillStyle = "#7a4f2e";
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (r() < 0.3) {
          ctx.fillStyle = r() > 0.5 ? "#5f3a20" : "#8a5a34";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }));
}

export function stoneTexture() {
  return finish(canvas(16, 16, (ctx) => {
    const r = rng(4);
    ctx.fillStyle = "#8a8a8a";
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (r() < 0.22) {
          ctx.fillStyle = r() > 0.5 ? "#6b6b6b" : "#a3a3a3";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    // cracks
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#5a5a5a";
      const x = Math.floor(r() * 14);
      const y = Math.floor(r() * 14);
      ctx.fillRect(x, y, 2, 1);
    }
  }));
}

export function woodTexture() {
  return finish(canvas(16, 16, (ctx) => {
    const r = rng(5);
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(0, 0, 16, 16);
    for (let x = 0; x < 16; x++) {
      const w = r() > 0.5 ? 2 : 1;
      ctx.fillStyle = r() > 0.5 ? "#55381f" : "#7a5836";
      ctx.fillRect(x, 0, w, 16);
    }
    // rings (horizontal dashes)
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(r() * 16);
      ctx.fillStyle = "#55381f";
      ctx.fillRect(0, y, 16, 1);
    }
  }));
}

export function leavesTexture() {
  return finish(canvas(16, 16, (ctx) => {
    const r = rng(6);
    ctx.fillStyle = "#3d6b2a";
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (r() < 0.35) {
          ctx.fillStyle = r() > 0.5 ? "#2f5520" : "#4f8a34";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }));
}

export function waterTexture() {
  return finish(canvas(16, 16, (ctx) => {
    const r = rng(7);
    ctx.fillStyle = "#2e6b8a";
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (r() < 0.25) {
          ctx.fillStyle = r() > 0.5 ? "#3a7fa3" : "#245a78";
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }));
}

export function cloudTexture() {
  return finish(canvas(32, 16, (ctx) => {
    ctx.clearRect(0, 0, 32, 16);
    const r = rng(8);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * 24);
      const y = Math.floor(r() * 8);
      const w = 4 + Math.floor(r() * 6);
      const h = 2 + Math.floor(r() * 3);
      ctx.fillRect(x, y, w, h);
    }
  }));
}
