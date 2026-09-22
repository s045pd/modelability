import * as THREE from 'three';
import { roomShell, setSpawn } from './shell.js';
import { sign, wallScreen, locker } from '../props.js';
import { wallDecor, ceilingRun } from '../props2.js';

export function buildTransporter(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '传送室', inside: M.wallDark, floor: M.floor, trim: M.consoleBlue, lights: true });
  const cz = 9.2;
  // 传送平台
  kit.cyl(M.steelDark, [0, 0.18, cz], 3.0, 0.36, { seg: 48 });
  kit.cyl(M.plasticGrey, [0, 0.365, cz], 2.75, 0.03, { seg: 48 });
  kit.floorDisc(0, cz, 3.0, 0.36);
  kit.push(0, 0, 0, 0);
  kit.pop();
  kit.geo(M.hazard, new THREE.RingGeometry(3.05, 3.4, 64), [0, 0.02, cz], [-Math.PI / 2, 0, 0]);
  kit.geo(M.lampBlue, new THREE.RingGeometry(2.55, 2.65, 64), [0, 0.385, cz], [-Math.PI / 2, 0, 0]);
  const pads = [[0, 0]];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pads.push([Math.sin(a) * 1.55, Math.cos(a) * 1.55]); }
  const pm = new THREE.MeshStandardMaterial({ color: 0x1a1d22, metalness: 0.7, roughness: 0.3 });
  for (const [px, pz] of pads) {
    kit.cyl(pm, [px, 0.395, cz + pz], 0.5, 0.03, { seg: 24 });
    kit.geo(M.lampCyan, new THREE.RingGeometry(0.4, 0.46, 32), [px, 0.412, cz + pz], [-Math.PI / 2, 0, 0]);
  }
  // 头顶发射环
  kit.torus(M.steelDark, [0, 3.05, cz], 2.7, 0.14, { rot: [Math.PI / 2, 0, 0], seg: 48 });
  kit.torus(M.lampBlue, [0, 3.0, cz], 2.5, 0.05, { rot: [Math.PI / 2, 0, 0], seg: 48, ts: 6 });
  for (const [px, pz] of pads) {
    kit.cyl(M.steelDark, [px, 3.0, cz + pz], 0.42, 0.18, { seg: 20, rt: 0.5 });
    kit.cyl(M.lampCyan, [px, 2.9, cz + pz], 0.28, 0.03, { seg: 20 });
  }
  kit.light(0, 2.0, cz, 0x66aaff, 14, 8);
  // 后墙壁龛
  kit.box(M.steelDark, [0, 1.6, 13.85], [7.0, 3.0, 0.2]);
  for (let i = 0; i < 9; i++) kit.box(i % 2 ? M.lampBlue : M.lampCyan, [-3.2 + i * 0.8, 1.6, 13.72], [0.12, 2.6, 0.04]);
  kit.box(M.hazard, [0, 0.15, 13.7], [7.0, 0.3, 0.1]);
  for (const s of [-1, 1]) kit.box(M.steelDark, [s * 3.7, 1.6, 13.4], [0.3, 3.0, 1.1]);
  // 控制台：三滑杆
  kit.push(0, 0, 4.6, 0);
  kit.solid(M.console, [0, 0.5, 0], [4.4, 1.0, 1.0]);
  kit.box(M.consoleDark, [0, 1.02, 0], [4.5, 0.05, 1.1]);
  kit.pushEuler([0, 1.08, 0.05], [0.32, 0, 0]);
  kit.box(M.consoleBlue, [0, 0, 0], [4.3, 0.04, 0.9]);
  for (let i = 0; i < 3; i++) {
    const x = -1.2 + i * 1.2;
    kit.box(M.consoleDark, [x, 0.03, 0.05], [0.22, 0.03, 0.75]);
    kit.box(M.lampAmber, [x, 0.05, 0.05], [0.04, 0.02, 0.7]);
    kit.box(M.steel, [x, 0.09, 0.05 + (i - 1) * 0.15], [0.16, 0.1, 0.12]);
    kit.cyl(M.chairRed, [x, 0.16, 0.05 + (i - 1) * 0.15], 0.05, 0.08, { seg: 10 });
  }
  for (let i = 0; i < 24; i++) kit.box(M.lampVC, [-2.0 + (i % 12) * 0.34, 0.03, -0.32 + Math.floor(i / 12) * 0.12], [0.08, 0.03, 0.06], null, [[3, 0.3, 0.2], [0.3, 2.8, 0.5], [0.5, 1.4, 3.3], [3, 2.2, 0.3]][i % 4]);
  kit.pop();
  for (let i = 0; i < 3; i++) kit.beam(M.steel, [-2.0 + i * 2.0, 1.0, -0.4], [-2.0 + i * 2.0, 1.55, -0.45], 0.02);
  kit.pop();
  // 控制台上方屏幕
  kit.interact(0, 1.0, 3.6, 2.2, '传送器控制台 · 选择传送目的地', () => ctx.ui.toggleMap());
  kit.interact(0, 0.5, cz, 3.2, '传送平台 · 站上去后按 M 传送', () => ctx.ui.toggleMap());
  // 侧墙设备
  for (const z of [3, 6.5, 12]) { locker(kit, -5.5, z, Math.PI / 2, 1.2, 2.0, 0.5, M.plasticGrey); }
  kit.solid(M.consoleDark, [5.4, 0.55, 5.0], [1.0, 1.1, 2.2]);
  kit.box(M.consoleBlue, [5.4, 1.12, 5.0], [1.05, 0.05, 2.3]);
  wallScreen(kit, 'chart', 5, 5.83, 1.75, 5.0, -Math.PI / 2, 1.5, 0.8);
  sign(kit, ['传送室', 'TRANSPORTER ROOM'], [-1.4, 2.3, 0.17], 0, [1.2, 0.36], { accent: '#4aa3ff' });
  ceilingRun(kit, 12, 14, 3.2, [M.pipeBlue, M.pipeYellow]);
  wallDecor(kit, 12, 14, 31, { from: 8, to: 13 });
  setSpawn(ctx, 'transporter', 0, 2.4);
}
