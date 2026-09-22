import * as THREE from 'three';
import { TIME } from '../core/materials.js';
import { wallSeg } from './walls.js';
import { consoleUnit, chair, sign, wallScreen, ceilLight, pipe, locker } from './props.js';
import { stairs, railArc, rack } from './props2.js';
import { makeRng } from '../core/rng.js';
import { HY } from '../exterior/dims.js';

export const EY = HY - 7.5; // 轮机舱地面
export const EZ = 69;

function coreMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: TIME },
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; uniform float uTime;
      void main(){
        float y = vP.y;
        float a = atan(vP.x, vP.z);
        float rise = pow(0.5 + 0.5 * sin(y * 2.6 - uTime * 4.0), 3.0);
        float rise2 = pow(0.5 + 0.5 * sin(y * 7.0 - uTime * 9.0 + a * 2.0), 6.0);
        float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 1.6);
        vec3 c = vec3(0.05, 0.25, 0.9) * (0.45 + 0.4 * rise) + vec3(0.4, 1.4, 3.6) * rise2 * 0.55 + vec3(0.2, 0.8, 2.4) * f * 0.9;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

export function buildEngineering(ctx) {
  const { kit, M, world } = ctx;
  const rng = makeRng(707);
  const HALF_W = 11, HALF_L = 17, HH = 15;
  const core = coreMaterial();
  kit.push(0, EY, EZ, 0);

  // 地面、天花
  kit.box(M.plate, [0, -0.04, 0], [HALF_W * 2, 0.08, HALF_L * 2]);
  kit.floorRect(0, 0, HALF_W, HALF_L, 0);
  kit.box(M.ceiling, [0, HH + 0.04, 0], [HALF_W * 2, 0.08, HALF_L * 2]);
  for (const s of [-1, 1]) for (let z = -15; z <= 15; z += 3) kit.box(M.grate, [s * 5.2, 0.005, z], [3.2, 0.02, 1.2]);
  kit.geo(M.hazard, new THREE.RingGeometry(3.15, 3.55, 48), [0, 0.02, 2], [-Math.PI / 2, 0, 0]);

  // 墙体
  const wo = { mat: M.wallDark, mat2: M.wallDark, trim: M.consoleRed, h: HH, doorH: 2.5 };
  wallSeg(kit, -HALF_W, HALF_L, -HALF_W, -HALF_L, { ...wo });
  wallSeg(kit, HALF_W, -HALF_L, HALF_W, HALF_L, { ...wo });
  wallSeg(kit, -HALF_W, -HALF_L, HALF_W, -HALF_L, { ...wo, doors: [{ t: HALF_W, w: 2.0, type: 'lift', radius: 2.8, accent: 0xd8a830 }] });
  wallSeg(kit, HALF_W, HALF_L, -HALF_W, HALF_L, { ...wo, doors: [{ t: HALF_W - 6, w: 1.4, h: 2.0, type: 'door', radius: 2.6, accent: 0xd0a028 }] });

  // 电梯轿厢
  {
    const o = { mat: M.wall, mat2: M.plastic, trim: M.consoleGold, h: 3.2 };
    wallSeg(kit, -1.4, -HALF_L - 0.15, -1.4, -HALF_L - 3.0, o);
    wallSeg(kit, -1.4, -HALF_L - 3.0, 1.4, -HALF_L - 3.0, o);
    wallSeg(kit, 1.4, -HALF_L - 3.0, 1.4, -HALF_L - 0.15, o);
    kit.box(M.plate, [0, 0.02, -HALF_L - 1.6], [2.8, 0.03, 2.9]);
    kit.box(M.ceiling, [0, 3.2, -HALF_L - 1.6], [2.8, 0.03, 2.9]);
    kit.box(M.panelWarm, [0, 3.15, -HALF_L - 1.6], [1.4, 0.03, 0.6]);
    kit.light(0, 2.2, -HALF_L - 1.6, 0xfff0d8, 10, 5);
    kit.interact(0, 1.0, -HALF_L - 1.4, 2.3, '涡轮电梯 · 选择目的地', () => ctx.ui.openLift('engineering'));
    kit.interact(0, 1.0, -HALF_L + 1.3, 2.0, '呼叫涡轮电梯', () => ctx.ui.openLift('engineering'));
  }

  // ---- 曲速核心 ----
  const CZ = 2;
  kit.cyl(M.steelDark, [0, 0.4, CZ], 2.8, 0.8, { seg: 40, rt: 2.5 });
  kit.cyl(M.hazard, [0, 0.82, CZ], 2.55, 0.03, { seg: 40 });
  kit.push(0, 0, 0, 0); kit.wall(0, CZ, 2.4, 2.4, 0, HH); kit.pop();
  kit.cyl(core, [0, 7.4, CZ], 1.15, 12.4, { seg: 40 });
  kit.cyl(M.core, [0, 7.4, CZ], 0.32, 12.4, { seg: 16 });
  for (let y = 1.4; y < 13.4; y += 1.15) {
    kit.torus(Math.round(y * 10) % 2 ? M.steel : M.gold, [0, y, CZ], 1.28, 0.09, { rot: [Math.PI / 2, 0, 0], seg: 32 });
  }
  for (const a of [0.4, 2.0, 3.6, 5.2]) {
    kit.beam(M.steelDark, [Math.sin(a) * 1.28, 1.4, CZ + Math.cos(a) * 1.28], [Math.sin(a) * 1.28, 13.4, CZ + Math.cos(a) * 1.28], 0.05);
  }
  kit.cyl(M.steelDark, [0, 14.2, CZ], 2.0, 1.2, { seg: 32, rt: 1.4 });
  kit.torus(M.coreRed, [0, 13.55, CZ], 1.9, 0.07, { rot: [Math.PI / 2, 0, 0], seg: 32 });
  kit.torus(M.lampCyan, [0, 1.0, CZ], 2.1, 0.06, { rot: [Math.PI / 2, 0, 0], seg: 32 });
  // 物质/反物质注入管
  for (const s of [-1, 1]) {
    kit.cyl(M.steel, [s * 3.1, 5.0, CZ], 0.6, 9.5, { seg: 20 });
    kit.cyl(M.steelDark, [s * 3.1, 9.9, CZ], 0.8, 0.4, { seg: 20 });
    kit.cyl(s > 0 ? M.lampBlue : M.lampRed, [s * 3.1, 9.9, CZ + 0.1], 0.5, 0.05, { seg: 16 });
    kit.beam(M.pipeBlue, [s * 3.1, 9.3, CZ], [s * 1.3, 11.0, CZ], 0.18);
    kit.cyl(M.hazard, [s * 3.1, 0.8, CZ], 0.7, 0.2, { seg: 20 });
  }
  for (const a of [0.8, 2.4, 3.9, 5.5]) {
    kit.beam(M.pipeYellow, [Math.sin(a) * 2.2, 13.8, CZ + Math.cos(a) * 2.2], [Math.sin(a) * 8, 14.6, CZ + Math.cos(a) * 8], 0.14);
    kit.beam(M.pipeRed, [Math.sin(a) * 2.0, 0.6, CZ + Math.cos(a) * 2.0], [Math.sin(a) * 7.5, 0.3, CZ + Math.cos(a) * 7.5], 0.12);
  }
  kit.light(0, 5, CZ, 0x60a8ff, 40, 16);
  for (const x of [-7, 0, 7]) for (let z = -13; z <= 13; z += 6.5) kit.light(x, 8.5, z, x === 0 ? 0xcfe0ff : 0xffe8cc, 46, 15);
  for (const x of [-8, 8]) for (let z = -13; z <= 13; z += 6.5) kit.light(x, 2.0, z, 0xffe0c0, 14, 8);
  kit.light(0, 11, CZ, 0x60a8ff, 24, 12);

  // ---- 环形步道（y=4.5）----
  const CY = 4.5;
  kit.geo(M.grate, new THREE.RingGeometry(2.6, 6.2, 48), [0, CY, CZ], [-Math.PI / 2, 0, 0]);
  kit.geo(M.steelDark, new THREE.RingGeometry(2.6, 6.2, 48), [0, CY - 0.1, CZ], [Math.PI / 2, 0, 0]);
  kit.torus(M.steelDark, [0, CY - 0.05, CZ], 6.2, 0.1, { rot: [Math.PI / 2, 0, 0], seg: 48 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39; kit.beam(M.steelDark, [Math.sin(a) * 6.0, CY - 0.1, CZ + Math.cos(a) * 6.0], [Math.sin(a) * 6.0, 0.8, CZ + Math.cos(a) * 6.0], 0.15); }
  // 楼梯口留在 ±z
  const zLo = Math.PI - 0.32, zHi = Math.PI + 0.32;
  railArc(kit, 0, CZ, 6.05, CY, [[-0.32, 0.32], [zLo, zHi], [Math.PI * 2 - 0.32, Math.PI * 2 + 0.32]], 48);
  kit.push(0, 0, 0, 0); kit.pop();
  // 圆形地板碰撞体 y=4.5，同时避开中心（核心柱有墙）
  kit.floorDisc(0, CZ, 6.2, CY);
  const RUN = 0.3, ST = 16, RISE = CY / ST;
  stairs(kit, { x: 0, z: CZ + 6.2 + ST * RUN, ry: Math.PI, w: 1.5, steps: ST, rise: RISE, run: RUN });
  stairs(kit, { x: 0, z: CZ - 6.2 - ST * RUN, ry: 0, w: 1.5, steps: ST, rise: RISE, run: RUN });
  // 步道控制台
  for (const a of [Math.PI / 2, -Math.PI / 2]) {
    consoleUnit(kit, { x: Math.sin(a) * 4.6, z: CZ + Math.cos(a) * 4.6, rot: a + Math.PI, w: 1.6, d: 0.7, screens: 2, seed: 51 + a, top: M.consoleBlue, height: 0.9 });
  }

  // ---- 侧墙设备 ----
  for (const s of [-1, 1]) {
    const x = s * (HALF_W - 0.5);
    for (let i = 0; i < 5; i++) {
      const z = -13 + i * 3.6;
      if (i === 2) { // 大型热交换器
        kit.cyl(M.steelDark, [x - s * 0.6, 3.5, z], 1.1, 7, { seg: 24 });
        kit.cyl(M.lampBlue, [x - s * 0.6, 3.5, z], 1.14, 4, { seg: 24, open: true });
        for (let k = 0; k < 6; k++) kit.torus(M.gold, [x - s * 0.6, 0.6 + k * 1.2, z], 1.15, 0.06, { rot: [Math.PI / 2, 0, 0], seg: 24 });
        kit.push(0, 0, 0, 0); kit.wall(x - s * 0.6, z, 1.15, 1.15, 0, 7); kit.pop();
      } else {
        consoleUnit(kit, { x: x - s * 0.4, z, rot: s > 0 ? -Math.PI / 2 : Math.PI / 2, w: 2.2, d: 0.85, screens: 3, seed: 20 + i + (s > 0 ? 5 : 0), top: i % 2 ? M.consoleGold : M.consoleRed, height: 1.0, kinds: ['chart', 'scope', 'bars', 'ship', 'text'] });
        wallScreen(kit, ['scope', 'chart', 'bars', 'ship', 'text'][(i + (s > 0 ? 2 : 0)) % 5], 40 + i, s * (HALF_W - 0.17), 2.7, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, 2.2, 1.3);
        chair(kit, x - s * 1.9, z, s > 0 ? Math.PI / 2 : -Math.PI / 2, M.chairRed, 'arm');
      }
      // 竖直管路
      pipe(kit, [s * (HALF_W - 0.25), 0.2, z + 1.5], [s * (HALF_W - 0.25), 14.8, z + 1.5], 0.12, i % 2 ? M.pipeRed : M.pipeBlue);
      pipe(kit, [s * (HALF_W - 0.55), 0.2, z + 1.8], [s * (HALF_W - 0.55), 14.8, z + 1.8], 0.08, M.pipeYellow);
      if (i % 2 === 0) kit.light(s * 8, 3.2, z, 0xffe8c8, 12, 9);
    }
    // 上部大幅示意板与格栅
    for (let z = -12; z <= 12; z += 6) {
      kit.box(M.consoleDark, [s * (HALF_W - 0.18), 8.5, z], [0.06, 3.0, 4.6]);
      kit.box(M.panelCool, [s * (HALF_W - 0.22), 8.5, z], [0.03, 2.4, 4.0]);
      for (let k = 0; k < 6; k++) kit.box(M.steelDark, [s * (HALF_W - 0.26), 7.4 + k * 0.4, z], [0.03, 0.05, 4.0]);
    }
    // 悬挂桁架
    for (let z = -16; z <= 16; z += 4) {
      kit.box(M.steelDark, [0, 14.6, z], [HALF_W * 2, 0.35, 0.3]);
      kit.box(M.steelDark, [s * (HALF_W - 0.3), 14.0, z], [0.35, 1.5, 0.3]);
    }
  }
  for (let z = -15; z <= 15; z += 6) { ceilLight(kit, -5, z, 0.5, 2.4, HH, M.panelCool); ceilLight(kit, 5, z, 0.5, 2.4, HH, M.panelCool); }
  // 前后墙
  wallScreen(kit, 'chart', 60, 0, 6.8, -HALF_L + 0.17, 0, 6.4, 3.6);
  wallScreen(kit, 'ship', 61, -6.6, 5.0, -HALF_L + 0.17, 0, 3.2, 1.8);
  wallScreen(kit, 'bars', 62, 6.6, 5.0, -HALF_L + 0.17, 0, 3.2, 1.8);
  sign(kit, ['轮机舱', 'ENGINEERING'], [-3.6, 2.6, -HALF_L + 0.18], 0, [1.6, 0.5], { accent: '#e2664e', size: 52 });
  for (let i = 0; i < 4; i++) rack(kit, -7.5 + i * 1.3, HALF_L - 0.6, Math.PI, 1.2, 2.4);
  locker(kit, 6.0, HALF_L - 0.5, Math.PI, 1.2, 2.1, 0.5, M.hazard);
  locker(kit, 7.4, HALF_L - 0.5, Math.PI, 1.2, 2.1, 0.5, M.hazard);
  // 曲速舱维修隧道入口
  kit.push(HALF_W - 5, 0, HALF_L, Math.PI);
  sign(kit, ['杰弗里斯管道 →', '曲速舱 / NACELLE'], [0, 2.5, 0.2], 0, [1.1, 0.34], { fg: '#ff9b4a', accent: '#ff5a3a' });
  kit.interact(0, 1.0, -0.9, 2.2, '杰弗里斯管道 · 前往曲速舱维修隧道', () => ctx.ui.go('nacelle'));
  kit.pop();
  kit.zone('轮机舱', '副船体', 0, 0, HALF_W, HALF_L + 3.4, -2, HH + 0.4);
  const p = kit.toWorld(0, 0, -HALF_L + 4.5);
  world.spawns.engineering = { x: p.x, y: EY, z: p.z, yaw: Math.PI };
  kit.pop();
}
