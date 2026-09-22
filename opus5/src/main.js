import * as THREE from 'three';
import { createRenderer, createCameras, onResize } from './core/renderer.js';
import { createComposer } from './core/postfx.js';
import { createEnvironment } from './core/environment.js';
import { createExteriorControls, VIEWPOINTS } from './core/exteriorControls.js';
import { createFpsControls } from './core/fpsControls.js';
import { tickMaterials } from './materials/library.js';
import { buildEnterprise } from './ship/index.js';
import { buildInterior, tickInterior } from './interior/index.js';
import { createHud } from './ui/hud.js';

/* ---------- 引导 ---------- */
const bootEl = document.getElementById('boot');
const bootFill = document.getElementById('boot-fill');
const bootLog = document.getElementById('boot-log');
const steps = [];
const stage = (label, fn) => steps.push({ label, fn });
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

/* ---------- 渲染栈 ---------- */
const canvas = document.getElementById('viewport');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const { exterior: exteriorCam, interior: interiorCam } = createCameras();
exteriorCam.layers.enableAll();
interiorCam.layers.enableAll();
const fx = createComposer(renderer, scene, exteriorCam);
const applyResize = onResize(renderer, fx.composer, [exteriorCam, interiorCam]);
applyResize();

let env = null;
let ship = null;
let interior = null;
const clock = new THREE.Clock();
renderer.info.autoReset = false;

stage('CALIBRATING STELLAR CARTOGRAPHY', async () => { env = createEnvironment(renderer, scene); });
stage('FABRICATING PRIMARY & SECONDARY HULL', async () => {
  ship = buildEnterprise();
  scene.add(ship.group);
});
stage('PRESSURIZING HABITABLE VOLUMES', async () => {
  interior = buildInterior();
  scene.add(interior.root);
  interior.root.visible = false;
});

/* ---------- 控制 ---------- */
const exterior = createExteriorControls(exteriorCam, canvas);
let fps = null;

const state = { mode: 'exterior', location: 'exterior', busy: false, nearHotspot: null, tlOptions: [] };

/** 涡轮电梯可达的甲板。 */
const TURBOLIFT_STOPS = [
  { key: 'bridge', label: '主舰桥', deck: 'DECK 1' },
  { key: 'corridor', label: '碟部主走廊', deck: 'DECK 10' },
  { key: 'tenforward', label: '十前酒廊', deck: 'DECK 10' },
  { key: 'transporter', label: '传送室 3 号', deck: 'DECK 6' },
  { key: 'engineering', label: '主工程部', deck: 'DECK 36' },
  { key: 'shuttlebay', label: '主穿梭机舱', deck: 'DECK 39' },
];

const hud = createHud({ onGoto: (name) => goTo(name) });

async function goTo(name) {
  if (state.busy) return;
  if (name === state.location) return;
  state.busy = true;
  await hud.fadeOut();

  if (name === 'exterior') {
    state.mode = 'exterior';
    state.location = 'exterior';
    interior.root.visible = false;
    fps.enabled = false;
    fx.setCamera(exteriorCam);
    exterior.flyTo(VIEWPOINTS.hero.pos, VIEWPOINTS.hero.target, 0.001);
  } else {
    const spawn = interior.spawns[name];
    if (!spawn) { state.busy = false; await hud.fadeIn(); return; }
    state.mode = 'interior';
    state.location = name;
    interior.root.visible = true;
    fps.enabled = true;
    fps.teleport(spawn.position, spawn.yaw);
    fx.setCamera(interiorCam);
  }
  hud.setMode(state.mode, state.location);
  await hud.fadeIn();
  state.busy = false;
}

/* ---------- 主循环 ---------- */
const strobes = [];
const playerPos = new THREE.Vector3();

function collectStrobes() {
  scene.traverse((o) => { if (o.name && o.name.startsWith('beacon:')) strobes.push(o); });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  renderer.info.reset();

  tickMaterials(t);
  fx.update(t);

  if (state.mode === 'exterior') {
    env.update(exteriorCam, dt);
    exterior.update(dt);
  } else {
    fps.update(dt);
    env.update(interiorCam, dt);
    tickInterior(interior, t);
    playerPos.copy(interiorCam.position);
    for (const d of interior.doors) d.update(dt, playerPos);
    let near = null;
    for (const h of interior.hotspots) {
      const dist = h.position.distanceTo(playerPos);
      if (dist < 3.4 && (!near || dist < near.d)) near = { h, d: dist };
    }
    state.nearHotspot = near ? near.h : null;
    hud.setPrompt(near && !hud.turboliftOpen ? `[E] ${near.h.label}` : null);
  }

  for (let i = 0; i < strobes.length; i++) {
    const phase = (t * 1.15 + i * 0.37) % 1;
    strobes[i].visible = phase < 0.16;
  }

  fx.composer.render();
  hud.tick(dt, renderer);
}

async function runBoot() {
  for (let i = 0; i < steps.length; i++) {
    bootLog.textContent = steps[i].label;
    bootFill.style.width = `${Math.round((i / steps.length) * 100)}%`;
    await nextFrame();
    await steps[i].fn();
  }
  bootFill.style.width = '100%';
  bootLog.textContent = 'ALL SYSTEMS NOMINAL';
  await nextFrame();
}

runBoot().then(() => {
  fps = createFpsControls(interiorCam, canvas, interior.walk);
  collectStrobes();
  hud.show();
  hud.setMode('exterior', 'exterior');
  bootEl.classList.add('done');
  exterior.flyTo(VIEWPOINTS.hero.pos, VIEWPOINTS.hero.target, 3.6);
  animate();
});

async function rideTurbolift(key) {
  const stop = TURBOLIFT_STOPS.find((s) => s.key === key);
  if (!stop || state.busy) return;
  hud.closeTurbolift();
  state.busy = true;
  await hud.fadeOut(300);
  await hud.transit(`TURBOLIFT → ${stop.deck}`, 1400);
  const spawn = interior.spawns[key];
  if (spawn) {
    state.mode = 'interior';
    state.location = key;
    interior.root.visible = true;
    fps.enabled = true;
    fps.teleport(spawn.position, spawn.yaw);
    fx.setCamera(interiorCam);
    hud.setMode(state.mode, state.location);
  }
  await hud.fadeIn(320);
  state.busy = false;
}

window.addEventListener('keydown', (e) => {
  if (state.mode !== 'interior') return;
  if (hud.turboliftOpen) {
    const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
    if (idx >= 0 && state.tlOptions[idx]) { e.preventDefault(); rideTurbolift(state.tlOptions[idx].key); return; }
    if (e.code === 'Escape') { hud.closeTurbolift(); return; }
  }
  if (e.code === 'KeyE' && state.nearHotspot && state.nearHotspot.action === 'turbolift') {
    state.tlOptions = TURBOLIFT_STOPS.filter((s) => s.key !== state.location);
    hud.openTurbolift(state.tlOptions);
  }
  if (e.code === 'Escape') hud.showCenterNote();
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) hud.hideCenterNote();
  else if (state.mode === 'interior') hud.showCenterNote();
});

/** 调试入口：控制台里可直接调机位、瞬移、切换舱室。 */
window.enterprise = {
  renderer, scene, fx, exterior, state, goTo,
  // ship / interior / env 在引导阶段才装配，用 getter 而不是快照
  get ship() { return ship; },
  get interior() { return interior; },
  get env() { return env; },
  get camera() { return state.mode === 'interior' ? interiorCam : exteriorCam; },
  /** 外部模式落位到指定机位。 */
  view(px, py, pz, tx = 0, ty = -10, tz = -20) {
    exterior.controls.autoRotate = false;
    exterior.flyTo(new THREE.Vector3(px, py, pz), new THREE.Vector3(tx, ty, tz), 0.001);
  },
  /** 舱内模式把玩家瞬移到世界坐标。 */
  walk(x, y, z, yaw = 0, pitch = 0) {
    fps.teleport(new THREE.Vector3(x, y, z), yaw);
    fps.state.pitch = pitch;
  },
};
