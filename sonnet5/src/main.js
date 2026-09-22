import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createMaterials, updateBlink, TIME } from './core/materials.js';
import { buildSkyCube, buildPlanet, buildEnvironment, SUN_DIR } from './core/sky.js';
import { World } from './core/world.js';
import { LightPool } from './core/lights.js';
import { Controller } from './player/controller.js';
import { createUI } from './ui/ui.js';
import { ShipAudio } from './core/audio.js';
import { updateScreens } from './interior/props.js';
import { createMinimap } from './ui/minimap.js';
import { codeOf } from './ui/keys.js';
import { buildShip } from './ship.js';

const $ = (id) => document.getElementById(id);
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 40000);
camera.position.set(150, 40, -140);

const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.55, 1.3);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const world = new World();
scene.add(world.root);
const controller = new Controller(camera, canvas, world);

let mode = 'fly';
let started = false;
let M, sun, hemi, shipParts, skyTex, lightPool, ui;
const audio = new ShipAudio();
let minimap = null;
let lastStep = 0;
const lastFlyPos = new THREE.Vector3(170, 55, -150);
const flyLook = { yaw: 2.4, pitch: -0.25 };
const BAY = new THREE.Vector3(0, -40, 150);

function setProgress(p, text) {
  $('ld-fill').style.width = `${Math.round(p * 100)}%`;
  if (text) $('ld-text').textContent = text;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

function setMode(next) {
  if (next === mode && started) return;
  const wasWalk = mode === 'walk';
  const walkPos = controller.pos.clone();
  if (mode === 'fly') { lastFlyPos.copy(controller.pos); flyLook.yaw = controller.yaw; flyLook.pitch = controller.pitch; }
  mode = next;
  controller.setMode(next);
  const walk = next === 'walk';
  hemi.intensity = walk ? 0.2 : 0.25;
  scene.environmentIntensity = walk ? 0.06 : 0.7;
  lightPool.setEnabled(walk);
  bloom.strength = walk ? 0.28 : 0.38;
  if (!walk) {
    if (wasWalk) {
      const inSecondary = walkPos.z > 40 && walkPos.y < -25;
      lastFlyPos.set(...(inSecondary ? [0, -34, 190] : [115, 55, -105]));
      controller.pos.copy(lastFlyPos);
      if (inSecondary) controller.lookAt(0, -40, 110); else controller.lookAt(0, -10, 20);
    } else {
      controller.pos.copy(lastFlyPos);
      controller.yaw = flyLook.yaw; controller.pitch = flyLook.pitch;
    }
    ui.setPrompt('');
    ui.setLocation('外部', '巡游模式');
  }
}

async function boot() {
  setProgress(0.05, '生成星空…'); await tick();
  skyTex = buildSkyCube(renderer, 2048);
  scene.background = skyTex;
  scene.environment = buildEnvironment(renderer, skyTex);
  scene.environmentIntensity = 0.7;

  scene.add(buildPlanet());
  hemi = new THREE.HemisphereLight(0x9db8ff, 0x3b2a20, 0.25);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
  sun.position.copy(SUN_DIR).multiplyScalar(500).add(new THREE.Vector3(0, -20, 80));
  sun.target.position.set(0, -15, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = -190; sc.right = 190; sc.top = 190; sc.bottom = -190; sc.near = 100; sc.far = 1000;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.2;
  scene.add(sun, sun.target);

  ui = createUI({ world, controller, getMode: () => mode, setMode });
  lightPool = new LightPool(scene, world.anchors, 10);

  setProgress(0.12, '合成材质…'); await tick();
  M = createMaterials();
  shipParts = await buildShip(world, M, skyTex, ui, setProgress);
  scene.add(shipParts.root);
  renderer.shadowMap.needsUpdate = true;

  setProgress(1, '就绪');
  $('loading').classList.add('done');
  setTimeout(() => ($('loading').hidden = true), 900);
  $('title').hidden = false;

  controller.onInteract = useNearest;
  controller.onToggleMap = () => ui.toggleMap();
  controller.onToggleMode = toggleMode;
  window.addEventListener('keydown', (e) => { if (codeOf(e) === 'KeyN' && started) { audio.muted = !audio.muted; audio.setMuted(audio.muted); ui.toast(audio.muted ? '音效：关闭' : '音效：开启'); } });
  hookButtons();
  minimap = createMinimap($('mini'));
  world.onDoor = (d, open, dist) => audio.door(open, Math.max(0, 1 - dist / 9));
  ui.onLift = () => audio.lift();
  ui.onTeleport = () => audio.chime();
  window.__ship = { scene, camera, controller, world, renderer, M, ship: shipParts, THREE, ui, sun, setMode, lightPool };

  const q = new URLSearchParams(location.search);
  if (q.has('cam')) {
    const v = q.get('cam').split(',').map(Number);
    startExterior();
    controller.pos.set(v[0], v[1], v[2]);
    controller.lookAt(v[3], v[4], v[5]);
  }
  if (q.has('go')) await startInterior(q.get('go'));
  requestAnimationFrame(loop);
}

function hideTitle() {
  audio.start();
  camera.clearViewOffset();
  $('title').hidden = true;
  $('hud').hidden = false;
  controller.enabled = true;
  started = true;
}

function startExterior() {
  hideTitle();
  setMode('fly');
  controller.pos.copy(lastFlyPos);
  controller.lookAt(0, -15, 80);
  ui.setLocation('外部', '巡游模式');
}

async function startInterior(key) {
  hideTitle();
  setMode('walk');
  await ui.go(key);
}

function hookButtons() {
  $('btn-fly').addEventListener('click', startExterior);
  $('btn-enter').addEventListener('click', () => startInterior('hub'));
  $('btn-bridge').addEventListener('click', () => startInterior('bridge'));
  window.addEventListener('keydown', (e) => {
    if (codeOf(e) === 'Escape' && started && !ui.menuOpen) {
      const t = $('title');
      t.hidden = !t.hidden;
      controller.enabled = t.hidden;
      if (!t.hidden) document.exitPointerLock?.();
    }
  });
}

function toggleMode() {
  if (ui.menuOpen) return;
  if (mode === 'walk') { setMode('fly'); return; }
  if (controller.pos.distanceTo(BAY) < 45 && world.spawns.bayEntry) ui.go('bayEntry');
  else ui.go('hub');
}

function nearestInteract() {
  const p = controller.pos;
  const eye = controller.eyePos;
  const fwd = controller.forward();
  let best = null, bd = 1e9;
  for (const it of world.interact) {
    const d = Math.hypot(it.x - p.x, it.z - p.z);
    if (d > it.r || Math.abs(it.y - eye.y) > 2.6) continue;
    const dx = it.x - eye.x, dz = it.z - eye.z;
    const l = Math.hypot(dx, dz) || 1;
    if ((dx * fwd.x + dz * fwd.z) / l < -0.3 && d > 0.8) continue;
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

function zoneKind(name) {
  if (name === '舰桥') return 'bridge';
  if (name === '轮机舱') return 'engineering';
  if (name.includes('曲速舱')) return 'nacelle';
  if (name === '穿梭机库') return 'bay';
  return 'ship';
}

function useNearest() {
  const it = nearestInteract();
  if (it) it.onUse();
}

const clock = new THREE.Clock();
const orbit = { t: 0 };
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1);
  TIME.value += dt;
  updateBlink(M, TIME.value);

  if (!started) {
    orbit.t += dt * 0.06;
    const a = orbit.t + 0.4;
    camera.position.set(Math.sin(a) * 300, 60 + Math.sin(orbit.t * 1.7) * 25, -Math.cos(a) * 260 + 80);
    camera.lookAt(0, -14, 70);
    camera.setViewOffset(window.innerWidth, window.innerHeight, -window.innerWidth * 0.12, window.innerHeight * 0.1, window.innerWidth, window.innerHeight);
  } else if (controller.enabled && !ui.menuOpen) {
    controller.update(dt);
  }

  for (const f of world.anim) f(TIME.value, dt);
  if (mode === 'walk' && started) {
    updateScreens(TIME.value, 4);
    world.updateDoors(controller.pos.x, controller.pos.y, controller.pos.z, dt);
    lightPool.update(dt, controller.eyePos);
    const it = nearestInteract();
    ui.setPrompt(it && !ui.menuOpen ? `[E] ${it.label}` : '');
    const z = world.zoneAt(controller.pos.x, controller.pos.y + 1, controller.pos.z);
    if (z) ui.setLocation(z.deck, z.name);
    audio.setZone(z ? zoneKind(z.name) : 'ship');
    minimap?.draw(controller.pos.x, controller.pos.z, controller.yaw);
    if (controller.moved - lastStep > 0.85) { lastStep = controller.moved; audio.step(); }
  } else if (started) { audio.setZone('exterior'); minimap?.draw(controller.pos.x, controller.pos.z, controller.yaw); }
  try { audio.update(dt); } catch (e) { audio.ctx = null; console.warn('audio disabled', e); }
  if (shipParts) shipParts.interior.visible = mode === 'walk' || controller.pos.distanceTo(BAY) < 90;
  composer.render();
}

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

boot().catch((e) => { console.error(e); $('ld-text').textContent = '构建失败：' + e.message; });
