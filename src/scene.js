// /workspace/repos/minecraft-3d/src/scene.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  grassTopTexture,
  grassSideTexture,
  dirtTexture,
  stoneTexture,
  woodTexture,
  leavesTexture,
  cloudTexture,
} from "./textures.js";

const CHUNK = 11; // half-width of the chunk in blocks
const UP = new THREE.Vector3(0, 1, 0);

// deterministic terrain so the world looks the same on every reload
function heightAt(x, z) {
  const n =
    Math.sin(x * 0.42 + 1.3) * 1.9 +
    Math.cos(z * 0.37 + 0.7) * 1.7 +
    Math.sin((x + z) * 0.21) * 1.1 +
    Math.cos((x - z) * 0.63) * 0.6;
  return Math.max(1, Math.round(2.4 + n));
}

function makeSkyTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#241446");
  g.addColorStop(0.42, "#6b4a9e");
  g.addColorStop(0.68, "#e2743c");
  g.addColorStop(0.85, "#ffb067");
  g.addColorStop(1, "#ffd9a0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  return t;
}

export function createWorld(canvas, onStats) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(0xe0a071, 48, 120);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 220);
  camera.position.set(30, 23, 38);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  // ---- lights: three only
  scene.add(new THREE.HemisphereLight(0xffd8b0, 0x2a1b3d, 1.1));

  const key = new THREE.DirectionalLight(0xffd9a8, 2.6);
  key.position.set(24, 22, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 80;
  key.shadow.camera.left = -26;
  key.shadow.camera.right = 26;
  key.shadow.camera.top = 26;
  key.shadow.camera.bottom = -26;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.03;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x8fa6ff, 0.9);
  rim.position.set(-20, 10, -16);
  scene.add(rim);

  // ---- materials
  const mk = (map, extra = {}) =>
    new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0, ...extra });

  const grassBlockMat = [
    mk(grassSideTexture()),
    mk(grassSideTexture()),
    mk(grassTopTexture()),
    mk(dirtTexture()),
    mk(grassSideTexture()),
    mk(grassSideTexture()),
  ];
  const dirtMat = mk(dirtTexture());
  const stoneMat = mk(stoneTexture());
  const woodMat = mk(woodTexture());
  const leafMat = mk(leavesTexture());

  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  blockGeo.deleteAttribute("normal"); // flat shading, keeps the voxel look crisp

  // ---- terrain + instancing buckets
  const buckets = {
    grass: [],
    dirt: [],
    stone: [],
    wood: [],
    leaves: [],
  };
  const dummy = new THREE.Object3D();
  const push = (bucket, x, y, z) => {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    buckets[bucket].push(dummy.matrix.clone());
  };

  const surface = [];
  for (let x = -CHUNK; x < CHUNK; x++) {
    for (let z = -CHUNK; z < CHUNK; z++) {
      const h = heightAt(x, z);
      surface.push([x, h, z]);
      for (let y = 0; y <= h; y++) {
        if (y === h) push("grass", x, y, z);
        else if (y >= h - 2) push("dirt", x, y, z);
        else push("stone", x, y, z);
      }
    }
  }

  // ---- trees: pick well-spaced surface tiles
  const trees = [];
  for (const [x, h, z] of surface) {
    if (Math.abs(x) > CHUNK - 3 || Math.abs(z) > CHUNK - 3) continue;
    if (h < 3) continue;
    if (trees.some((t) => Math.abs(t[0] - x) < 5 && Math.abs(t[2] - z) < 5)) continue;
    trees.push([x, h, z]);
    const trunk = 4;
    for (let i = 1; i <= trunk; i++) push("wood", x, h + i, z);
    const crown = h + trunk;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = 0; dy <= 1; dy++) {
          const corner = Math.abs(dx) === 1 && Math.abs(dz) === 1 && dy === 1;
          if (corner) continue;
          if (dx === 0 && dz === 0 && dy === 0) continue;
          push("leaves", x + dx, crown + dy, z + dz);
        }
      }
    }
  }

  const world = new THREE.Group();
  world.name = "world";
  const meshes = [];
  for (const [name, mat] of [
    ["grass", grassBlockMat],
    ["dirt", dirtMat],
    ["stone", stoneMat],
    ["wood", woodMat],
    ["leaves", leafMat],
  ]) {
    const list = buckets[name];
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(blockGeo, mat, list.length);
    im.name = `blocks-${name}`;
    im.castShadow = true;
    im.receiveShadow = true;
    list.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    world.add(im);
    meshes.push(im);
  }

  // ---- torch: the one saturated accent in the scene
  const torch = new THREE.Group();
  const stickGeo = new THREE.BoxGeometry(0.16, 0.7, 0.16);
  const stick = new THREE.Mesh(stickGeo, new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 }));
  stick.position.y = 0.35;
  torch.add(stick);
  const flameGeo = new THREE.BoxGeometry(0.22, 0.26, 0.22);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = 0.82;
  torch.add(flame);
  const flameLight = new THREE.PointLight(0xff8a3d, 14, 22, 2);
  flameLight.position.y = 0.9;
  torch.add(flameLight);
  const spot = surface.find(([x, h, z]) => x === 3 && z === -2) || surface[0];
  torch.position.set(spot[0], spot[1] + 1, spot[2]);
  torch.name = "torch";
  world.add(torch);

  // ---- clouds
  const clouds = [];
  const cloudGeo = new THREE.PlaneGeometry(8, 4);
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const CLOUD_SPAN = 90;
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(cloudGeo, cloudMat);
    m.position.set(
      (i - 3) * 7 + Math.sin(i) * 3,
      15 + Math.sin(i * 2.1) * 2.4,
      (i % 2 === 0 ? -1 : 1) * (6 + i * 2.2)
    );
    m.rotation.y = i * 0.4;
    clouds.push(m);
    world.add(m);
  }

  scene.add(world);

  // ---- controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 14;
  controls.maxDistance = 72;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.target.set(0, 3, 0);
  controls.autoRotate = !reducedMotion.matches;
  controls.autoRotateSpeed = 0.7;
  controls.update();

  // nothing in the scene casts a moving shadow (the torch flame is excluded),
  // so the shadow map only needs redrawing when the camera moves
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  controls.addEventListener("change", () => {
    renderer.shadowMap.needsUpdate = true;
  });

  const CAM_HOME = camera.position.clone();
  const TARGET_HOME = controls.target.clone();
  const UP_HOME = new THREE.Vector3();

  // ---- loop
  const clock = new THREE.Timer();
  let raf = 0;
  let running = true;
  let frames = 0;
  let accum = 0;
  let lastStatsAt = 0;

  const renderFrame = () => {
    raf = requestAnimationFrame(renderFrame);
    if (!running) return;
    clock.update();
    const dt = Math.min(clock.getDelta(), 0.05);
    controls.update();
    // reduced motion: draw the scene, but animate nothing
    if (!reducedMotion.matches) {
      flame.scale.y = 1 + Math.sin(clock.getElapsed() * 9) * 0.14;
      flameLight.intensity = 14 + Math.sin(clock.getElapsed() * 7) * 3;
      for (const c of clouds) {
        c.position.x += dt * 0.35;
        if (c.position.x > CLOUD_SPAN / 2) c.position.x -= CLOUD_SPAN;
      }
    }
    renderer.render(scene, camera);

    // budget readout, driven by the loop rather than a timer so it still
    // updates when the main thread is saturated
    if (onStats && clock.getElapsed() - lastStatsAt > 1) {
      lastStatsAt = clock.getElapsed();
      onStats({
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        textures: renderer.info.memory.textures,
      });
    }

    // adaptive quality: drop pixel ratio before the user notices
    accum += dt;
    frames++;
    if (frames === 120) {
      const avg = accum / frames;
      if (avg > 0.026 && renderer.getPixelRatio() > 1) renderer.setPixelRatio(1);
      frames = 0;
      accum = 0;
    }
  };

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const onVisibility = () => {
    running = !document.hidden;
    if (running) {
      clock.update();
      clock.getDelta(); // discard the gap spent hidden
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onMotionChange = () => {
    controls.autoRotate = !reducedMotion.matches;
    if (reducedMotion.matches) renderer.render(scene, camera);
  };
  reducedMotion.addEventListener("change", onMotionChange);
  if (reducedMotion.matches) {
    controls.autoRotate = false;
    renderer.render(scene, camera);
  }

  renderFrame();

  return {
    controls,
    renderer,
    rotate(step) {
      camera.position.sub(controls.target).applyAxisAngle(UP, step).add(controls.target);
      controls.update();
    },
    nudgeVertical(amount) {
      camera.position.y = THREE.MathUtils.clamp(camera.position.y + amount, 3, 40);
      controls.update();
    },
    reset() {
      camera.position.copy(CAM_HOME);
      controls.target.copy(TARGET_HOME);
      controls.update();
    },
    setAutoRotate(on) {
      controls.autoRotate = on;
    },
    stats: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      textures: renderer.info.memory.textures,
    }),
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionChange);
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) {
          for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
          m.dispose();
        }
      });
      envRT.dispose();
      renderer.dispose();
    },
  };
}