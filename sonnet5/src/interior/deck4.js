import * as THREE from 'three';
import { wallSeg } from './walls.js';
import { roomShell, H } from './rooms/shell.js';
import { ceilLight, sign, wallPanel, wallScreen, plant, bench, vent, screen, pipe } from './props.js';
import { makeRng } from '../core/rng.js';
import { buildLounge } from './rooms/lounge.js';
import { buildBriefing } from './rooms/briefing.js';
import { buildTransporter } from './rooms/transporter.js';
import { buildCaptainQuarters } from './rooms/captain.js';
import { buildCrewQuarters } from './rooms/crew.js';
import { buildSickbay } from './rooms/sickbay.js';
import { buildBrig } from './rooms/brig.js';
import { buildScienceLab } from './rooms/lab.js';
import { buildRecRoom } from './rooms/rec.js';
import { buildGym } from './rooms/gym.js';
import { buildLibrary } from './rooms/library.js';
import { buildHydroponics } from './rooms/hydro.js';

export const FY = 0.4;
const D2R = Math.PI / 180;
export const polar = (phi, r) => [r * Math.sin(phi), -r * Math.cos(phi)];

const HUB_A = 7.2;
const RING_IN = 30.5;
const RING_OUT = 34.0;
const HALL_HW = 1.7;

function discs(kit) {
  const M = kit.M;
  kit.cyl(M.floor, [0, -0.06, 0], 48, 0.12, { seg: 96 });
  kit.cyl(M.ceiling, [0, H + 0.06, 0], 48, 0.12, { seg: 96 });
  kit.floorDisc(0, 0, 48, 0);
}

function sideEnds(a, k, n) {
  const phi = (k * 2 * Math.PI) / n;
  const hl = a * Math.tan(Math.PI / n);
  const c = polar(phi, a);
  const t = [Math.cos(phi), Math.sin(phi)];
  return { phi, hl, A: [c[0] - t[0] * hl, c[1] - t[1] * hl], B: [c[0] + t[0] * hl, c[1] + t[1] * hl], c };
}

// ---------- 涡轮电梯轿厢 ----------
function liftCar(ctx, k, id) {
  const { kit, M } = ctx;
  const { phi, c } = sideEnds(HUB_A, k, 8);
  kit.push(c[0], 0, c[1], Math.PI - phi);
  const o = { mat: M.wall, mat2: M.plastic, trim: M.consoleGold, h: H };
  wallSeg(kit, -1.45, 0.16, -1.45, 3.2, o);
  wallSeg(kit, -1.45, 3.2, 1.45, 3.2, o);
  wallSeg(kit, 1.45, 3.2, 1.45, 0.16, o);
  kit.box(M.plate, [0, 0.02, 1.7], [2.86, 0.03, 3.0]);
  kit.box(M.ceiling, [0, H - 0.06, 1.7], [2.86, 0.02, 3.0]);
  ceilLight(kit, 0, 1.7, 1.6, 0.9, H, M.panelWarm);
  kit.light(0, H - 1.1, 1.7, 0xfff0d8, 22, 7);
  kit.beam(M.steel, [-1.3, 0.95, 3.0], [1.3, 0.95, 3.0], 0.04);
  // 控制面板
  kit.push(1.32, 1.25, 1.9, -Math.PI / 2);
  kit.box(M.consoleDark, [0, 0, 0.02], [0.7, 0.9, 0.05]);
  screen(kit, 'text', 2 + id, [0, 0.28, 0.06], [0.5, 0.26], 0, 0, false);
  for (let i = 0; i < 6; i++) kit.box(i === 2 ? M.lampAmber : M.lampWhite, [-0.15 + (i % 2) * 0.3, 0 - Math.floor(i / 2) * 0.16, 0.06], [0.08, 0.08, 0.02]);
  kit.pop();
  // 侧壁装饰
  kit.box(M.consoleGold, [-1.4, 1.4, 1.7], [0.04, 0.1, 2.6]);
  kit.box(M.stripGold, [0, 2.9, 3.1], [2.2, 0.06, 0.05]);
  // 交互
  const spawnLocal = { x: 0, y: 0, z: 1.7 };
  const w = kit.toWorld(0, 0, 1.7);
  ctx.world.spawns[`lift${id}`] = { x: w.x, y: kit.oy, z: w.z, yaw: kit.yaw() };
  kit.interact(0, 1.0, 1.6, 2.4, '涡轮电梯 · 选择目的地', () => ctx.ui.openLift(`lift${id}`));
  kit.interact(0, 1.0, -1.3, 2.0, '呼叫涡轮电梯', () => ctx.ui.openLift(`lift${id}`));
  kit.pop();
}

// ---------- 中央枢纽 ----------
function hub(ctx) {
  const { kit, M, world } = ctx;
  let liftId = 1;
  for (let k = 0; k < 8; k++) {
    const { A, B, hl, phi, c } = sideEnds(HUB_A, k, 8);
    const isLift = k % 2 === 1;
    const doors = isLift ? [{ t: hl, w: 2.4, type: 'lift', radius: 2.8, accent: 0xd8a830 }] : [{ t: hl, w: 3.4, type: 'arch' }];
    wallSeg(kit, A[0], A[1], B[0], B[1], { mat: M.wallWarm, mat2: M.wall, trim: M.consoleGold, doors, h: H, ext: 0.3 });
    if (isLift) {
      liftCar(ctx, k, liftId);
      kit.push(c[0], 0, c[1], Math.PI - phi);
      sign(kit, ['涡轮电梯 ' + liftId, 'TURBOLIFT ' + liftId], [-1.9, 1.75, -0.18], Math.PI, [0.9, 0.28]);
      kit.box(M.consoleDark, [1.8, 1.15, -0.16], [0.24, 0.4, 0.05]);
      kit.box(M.lampAmber, [1.8, 1.22, -0.19], [0.08, 0.08, 0.02]);
      kit.box(M.lampGreen, [1.8, 1.06, -0.19], [0.08, 0.08, 0.02]);
      kit.pop();
      liftId++;
    } else {
      kit.push(c[0], 0, c[1], Math.PI - phi);
      const names = { 0: ['舰艏 · 观景休息室', 'FORWARD'], 2: ['右舷 · 传送室', 'STARBOARD'], 4: ['舰艉 · 船员区', 'AFT'], 6: ['左舷 · 保安区', 'PORT'] };
      sign(kit, names[k], [-2.25, 2.35, -0.19], Math.PI, [1.1, 0.34]);
      kit.pop();
    }
  }
  // 地面：同心图案
  kit.cyl(M.floorBlue, [0, 0.014, 0], 6.9, 0.028, { seg: 48 });
  for (const [r, m] of [[2.4, M.gold], [4.0, M.stripGold], [5.6, M.gold]]) kit.geo(m, new THREE.RingGeometry(r - 0.06, r + 0.06, 64), [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    kit.box(M.gold, [Math.sin(a) * 4.8, 0.03, Math.cos(a) * 4.8], [0.05, 0.02, 1.6], [0, a, 0]);
  }
  // 中央：舰体全息图
  kit.cyl(M.consoleDark, [0, 0.55, 0], 1.25, 1.1, { seg: 32, rt: 1.0 });
  kit.cyl(M.console, [0, 1.12, 0], 1.32, 0.08, { seg: 32 });
  kit.push(0, 0, 0, 0); kit.wall(0, 0, 1.32, 1.32, 0, 1.2); kit.pop();
  const holo = new THREE.MeshBasicMaterial({ color: 0x40b4ff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
  holo.color.setRGB(0.16, 0.55, 1.0); holo.userData.noShadow = true;
  kit.spinner((g) => {
    const mk = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, holo); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
    const sph = new THREE.SphereGeometry(1, 24, 10), cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
    mk(sph, 0, 0.1, -0.35, 0.5, 0.05, 0.5);
    mk(sph, 0, 0.14, -0.35, 0.16, 0.05, 0.16);
    mk(cyl, 0, -0.04, -0.05, 0.06, 0.22, 0.06).rotation.x = 0.5;
    const hull = mk(cyl, 0, -0.2, 0.2, 0.09, 0.5, 0.09); hull.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const n = mk(cyl, s * 0.2, 0.08, 0.5, 0.045, 0.55, 0.045); n.rotation.x = Math.PI / 2; mk(cyl, s * 0.11, -0.04, 0.32, 0.012, 0.28, 0.16).rotation.z = s * 0.7; }
  }, [0, 1.62, 0], { speed: 0.45 });
  kit.cyl(holo, [0, 1.36, 0], 0.62, 0.02, { seg: 40 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.box(M.lampCyan, [Math.sin(a) * 1.28, 1.16, Math.cos(a) * 1.28], [0.12, 0.02, 0.08], [0, a, 0]);
  }
  // 长椅、植物
  for (const k of [0, 2, 4, 6]) {
    const phi = k * 45 * D2R;
    for (const s of [-1, 1]) {
      const p = polar(phi + s * 0.55, 5.8);
      bench(kit, p[0], p[1], -(phi + s * 0.55) + Math.PI, 1.7, M.fabricBlue);
    }
  }
  for (const a of [22.5, 112.5, 202.5, 292.5]) { const p = polar(a * D2R, 6.15); plant(kit, p[0], p[1], 1.2); }
  // 天花：光环与管线
  kit.geo(M.panelWarm, new THREE.RingGeometry(3.6, 3.85, 64), [0, H - 0.03, 0], [Math.PI / 2, 0, 0]);
  kit.geo(M.panel, new THREE.RingGeometry(1.7, 1.8, 48), [0, H - 0.03, 0], [Math.PI / 2, 0, 0]);
  kit.cyl(M.steelDark, [0, H - 0.05, 0], 1.6, 0.1, { seg: 32 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; kit.beam(M.pipeBlue, [Math.sin(a) * 1.6, H - 0.15, Math.cos(a) * 1.6], [Math.sin(a) * 6.9, H - 0.2, Math.cos(a) * 6.9], 0.05); }
  kit.torus(M.pipeYellow, [0, H - 0.22, 0], 6.2, 0.06, { rot: [Math.PI / 2, 0, 0], seg: 64 });
  for (let i = 0; i < 4; i++) kit.light(Math.sin(i * 1.57) * 3, H - 0.6, Math.cos(i * 1.57) * 3, 0xfff0dc, 28, 12);
  kit.zone('中央枢纽', 'DECK 4', 0, 0, 7.2, 7.2, 0, H + 0.2);
  world.spawns.hub = { x: 0, y: FY, z: 4.2, yaw: 0 };
  kit.interact(0, 1.2, 0, 2.2, '舰体全息图 · 宪法级 NCC-1701', () => ctx.ui.toast('U.S.S. ENTERPRISE · NCC-1701 · 宪法级重型巡洋舰 · 全长 289 米 · 编制 430 人'));
}

// ---------- 四条辐射走廊（墙体在各楔形舱室 builder 内构建） ----------
function hallDecor(ctx) {
  const { kit, M } = ctx;
  for (let q = 0; q < 4; q++) {
    const ry = q * (Math.PI / 2);
    kit.push(0, 0, 0, ry);
    // 走廊沿局部 +z：地毯、灯带
    kit.box(M.floorRed, [0, 0.014, 18.6], [1.9, 0.028, 23.4]);
    kit.box(M.gold, [-1.0, 0.03, 18.6], [0.05, 0.02, 23.4]);
    kit.box(M.gold, [1.0, 0.03, 18.6], [0.05, 0.02, 23.4]);
    for (let z = 9; z < 30; z += 3.4) {
      ceilLight(kit, 0, z, 0.5, 1.4, H, M.panel);
      if (Math.round((z - 9) / 3.4) % 2 === 0) kit.light(0, H - 1.1, z, 0xfff0dc, 22, 10);
    }
    pipe(kit, [-1.4, H - 0.18, 7.5], [-1.4, H - 0.18, 30.3], 0.06, M.pipeRed);
    pipe(kit, [1.4, H - 0.18, 7.5], [1.4, H - 0.18, 30.3], 0.06, M.pipeBlue);
    kit.zone(['舰艉走廊', '右舷走廊', '舰艏走廊', '左舷走廊'][q] || '走廊', 'DECK 4', 0, 18.9, 1.7, 11.8, 0, H + 0.2);
    kit.pop();
  }
}

// ---------- 环形走廊 ----------
function ring(ctx) {
  const { kit, M } = ctx;
  const rng = makeRng(88);
  kit.geo(M.floorRed, new THREE.RingGeometry(RING_IN + 0.9, RING_OUT - 0.9, 96), [0, 0.014, 0], [-Math.PI / 2, 0, 0]);
  kit.geo(M.gold, new THREE.RingGeometry(RING_IN + 0.55, RING_IN + 0.62, 96), [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  kit.geo(M.gold, new THREE.RingGeometry(RING_OUT - 0.62, RING_OUT - 0.55, 96), [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  kit.torus(M.pipeRed, [0, H - 0.2, 0], RING_IN + 0.35, 0.07, { rot: [Math.PI / 2, 0, 0], seg: 96 });
  kit.torus(M.pipeBlue, [0, H - 0.2, 0], RING_OUT - 0.35, 0.07, { rot: [Math.PI / 2, 0, 0], seg: 96 });
  kit.torus(M.tube, [0, H - 0.34, 0], RING_IN + 0.5, 0.035, { rot: [Math.PI / 2, 0, 0], seg: 96 });

  for (let k = 0; k < 16; k++) {
    const inn = sideEnds(RING_IN, k, 16), out = sideEnds(RING_OUT, k, 16);
    const hall = k % 4 === 0;
    wallSeg(kit, inn.A[0], inn.A[1], inn.B[0], inn.B[1], { mat: M.wallBlue, mat2: M.wallWarm, trim: M.consoleBlue, h: H, ext: 0.25, doors: hall ? [{ t: inn.hl, w: 3.4, type: 'arch' }] : [] });
    const roomSide = k % 2 === 0;
    wallSeg(kit, out.A[0], out.A[1], out.B[0], out.B[1], { mat: M.wallWarm, mat2: M.wall, trim: M.consoleBlue, h: H, ext: 0.25, doors: [{ t: out.hl, w: roomSide ? 2.6 : 1.8, type: 'door', radius: 3.2, accent: roomSide ? 0xd8a830 : 0x8a9099 }] });

    // 沿墙灯与面板
    const phi = inn.phi;
    kit.push(inn.c[0], 0, inn.c[1], Math.PI - phi);
    ceilLight(kit, 0, 1.9, 1.7, 0.4, H, M.panel);
    ceilLight(kit, 0, 1.9, 1.7, 0.4, H, M.panel);
    ceilLight(kit, -3.4, 1.9, 1.5, 0.4, H, M.panel);
    ceilLight(kit, 3.4, 1.9, 1.5, 0.4, H, M.panel);
    kit.light(0, H - 1.1, 1.9, 0xfff0dc, 22, 11);
    if (!hall) {
      const types = ['buttons', 'locker', 'vent', 'hatch'];
      wallPanel(kit, -3.0 + rng() * 0.5, 1.35, 0.17, 0, types[k % 4]);
      wallPanel(kit, 2.4 + rng() * 0.6, 1.35, 0.17, 0, types[(k + 1) % 4]);
      sign(kit, [`环廊 ${String.fromCharCode(65 + k)} 区`, `SECTION ${String.fromCharCode(65 + k)}`], [0, 2.05, 0.17], 0, [0.9, 0.28], { size: 40, accent: k % 4 === 0 ? '#ffb14a' : '#4aa3ff' });
      wallScreen(kit, ['scope', 'chart', 'bars', 'text'][k % 4], k, 0.2, 1.5, 0.17, 0, 0.7, 0.45);
    } else {
      sign(kit, ['辐射走廊 → 中央', 'TO CENTRAL HUB'], [-3.2, 2.05, 0.17], 0, [1.0, 0.3]);
    }
    kit.pop();
    // 外墙一侧
    kit.push(out.c[0], 0, out.c[1], Math.PI - phi);
    if (!roomSide) {
      kit.box(M.hazard, [0, 2.7, -0.17], [1.9, 0.08, 0.02]);
      sign(kit, ['维修管道', 'JEFFERIES TUBE'], [0, 2.55, -0.18], Math.PI, [0.75, 0.24], { fg: '#ff9b4a', accent: '#ff5a3a', size: 36 });
    }
    kit.pop();
  }
  // 环形走廊区域（用 16 个楔形近似）
  for (let k = 0; k < 16; k++) {
    const s = sideEnds(32.25, k, 16);
    kit.push(s.c[0], 0, s.c[1], Math.PI - s.phi);
    kit.zone('环形走廊', 'DECK 4', 0, 0, s.hl + 0.5, 1.9, 0, H + 0.2);
    kit.pop();
  }
  ctx.world.spawns.ring = { x: 0, y: FY, z: -32.2, yaw: Math.PI };
}

// ---------- 楔形舱室外壳：两侧走廊墙 + 门 ----------
const WEDGES = [
  { ry: Math.PI / 2, name: 'rec', build: buildRecRoom },
  { ry: 0, name: 'gym', build: buildGym },
  { ry: -Math.PI / 2, name: 'library', build: buildLibrary },
  { ry: Math.PI, name: 'hydro', build: buildHydroponics },
];

function wedgeShell(ctx, w) {
  const { kit, M } = ctx;
  const o = { mat: M.wall, mat2: M.wallWarm, trim: M.consoleBlue, h: H };
  // 局部：+x 走廊沿 z=±1.7，+z 走廊沿 x=±1.7；墙体方向使 +z 侧朝走廊外
  wallSeg(kit, HUB_A, HALL_HW, RING_IN, HALL_HW, { ...o, doors: [{ t: 9, w: 2.4, type: 'door', radius: 3.2 }] });
  wallSeg(kit, HALL_HW, RING_IN, HALL_HW, HUB_A, { ...o, doors: [{ t: 9, w: 2.4, type: 'door', radius: 3.2 }] });
}

// ---------- 外圈房间 ----------
const OUTER = [
  { k: 0, build: buildLounge },
  { k: 2, build: buildBriefing },
  { k: 4, build: buildTransporter },
  { k: 6, build: buildCaptainQuarters },
  { k: 8, build: buildCrewQuarters },
  { k: 10, build: buildSickbay },
  { k: 12, build: buildBrig },
  { k: 14, build: buildScienceLab },
];

function closet(ctx, k) {
  const { kit, M } = ctx;
  const s = sideEnds(RING_OUT, k, 16);
  kit.push(s.c[0], 0, s.c[1], Math.PI - s.phi);
  roomShell(kit, { w: 4.2, d: 3.4, outside: M.wall, inside: M.wallDark, floor: M.plate, lights: false, trim: null });
  ceilLight(kit, 0, 1.7, 1.2, 0.4, H, M.panel);
  kit.light(0, H - 1.1, 1.7, 0xfff0dc, 18, 6);
  const n = k % 4;
  if (n === 1) { // 维修管道口
    kit.box(M.steelDark, [0, 1.2, 3.25], [1.6, 2.4, 0.2]);
    kit.box(M.hazard, [0, 1.2, 3.12], [1.2, 2.0, 0.03]);
    kit.box(M.steelDark, [0, 1.2, 3.1], [0.9, 1.6, 0.03]);
    sign(kit, ['杰弗里斯管道', 'JEFFERIES TUBE'], [0, 2.45, 3.1], Math.PI);
  } else {
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) kit.box(M.plasticGrey, [sx * 1.6, 0.2 + i * 0.6, 1.9], [0.5, 0.5, 2.4], null);
    kit.box(M.pipeRed, [0, 2.9, 2.4], [3.6, 0.1, 0.1]);
  }
  kit.pop();
}

export function buildDeck4(ctx) {
  const { kit, M } = ctx;
  kit.push(0, FY, 0, 0);
  discs(kit);
  hub(ctx);
  hallDecor(ctx);
  ring(ctx);
  for (const w of WEDGES) {
    kit.push(0, 0, 0, w.ry);
    wedgeShell(ctx, w);
    w.build(ctx);
    kit.pop();
  }
  for (const r of OUTER) {
    const s = sideEnds(RING_OUT, r.k, 16);
    kit.push(s.c[0], 0, s.c[1], Math.PI - s.phi);
    r.build(ctx, r.k);
    kit.pop();
  }
  for (let k = 1; k < 16; k += 2) closet(ctx, k);
  kit.pop();
}
