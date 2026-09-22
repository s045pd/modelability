import * as THREE from 'three';
import { roomShell, setSpawn } from './shell.js';
import { chair, locker, sign, wallScreen, consoleUnit } from '../props.js';
import { biobed, desk, ceilingRun } from '../props2.js';

export function buildSickbay(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '医疗湾', inside: M.wallGreen, floor: M.floorLight, trim: M.consoleBlue, lightMat: M.panelCool });
  for (let i = 0; i < 4; i++) biobed(kit, 4.6, 2.8 + i * 2.2, -Math.PI / 2, i * 2 + 1);
  // 手术台与手术灯
  kit.solid(M.steel, [-0.8, 0.85, 8.2], [1.0, 0.1, 2.2]);
  kit.cyl(M.steelDark, [-0.8, 0.4, 8.2], 0.22, 0.8, { seg: 12 });
  kit.push(0, 0, 0, 0); kit.wall(-0.8, 8.2, 0.5, 1.1, 0, 0.95); kit.pop();
  kit.beam(M.steel, [-0.8, 3.15, 8.2], [-0.8, 2.6, 8.2], 0.04);
  kit.cyl(M.steelDark, [-0.8, 2.5, 8.2], 0.5, 0.1, { seg: 24, rt: 0.4 });
  kit.cyl(M.lampWhite, [-0.8, 2.44, 8.2], 0.42, 0.03, { seg: 24 });
  kit.light(-0.8, 2.3, 8.2, 0xe8f4ff, 16, 8);
  for (const [x, z] of [[-1.9, 7.2], [0.4, 9.2]]) {
    kit.solid(M.steel, [x, 0.5, z], [0.6, 0.06, 0.4]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.box(M.steelDark, [x + sx * 0.27, 0.25, z + sz * 0.17], [0.03, 0.5, 0.03]);
    for (let i = 0; i < 4; i++) kit.box(M.steel, [x - 0.2 + i * 0.13, 0.55, z], [0.06, 0.03, 0.2]);
  }
  // 左墙：药柜与工作台
  kit.solid(M.plastic, [-5.3, 0.5, 3.2], [1.0, 1.0, 5.0]);
  kit.box(M.consoleBlue, [-5.3, 1.03, 3.2], [1.1, 0.05, 5.1]);
  for (let i = 0; i < 6; i++) { const m = new THREE.MeshStandardMaterial({ color: [0x3a8a5a, 0xa03a2a, 0x3a5aa0, 0xc0a030][i % 4], roughness: 0.15, transparent: true, opacity: 0.85 }); kit.cyl(m, [-5.3, 1.2, 1.2 + i * 0.8], 0.07, 0.24, { seg: 8 }); }
  for (let i = 0; i < 4; i++) kit.box(M.plastic, [-5.6, 1.55, 1.2 + i * 1.3], [0.4, 0.5, 1.1]);
  kit.solid(M.plasticGrey, [-5.7, 1.4, 3.2], [0.3, 0.02, 0.02], 0, null, { collide: false });
  // 后墙：医生办公室（磨砂玻璃隔断）
  kit.box(M.glass, [-2.6, 1.4, 11.2], [5.8, 2.6, 0.04]);
  kit.box(M.steelDark, [-2.6, 2.75, 11.2], [5.9, 0.1, 0.1]); kit.box(M.steelDark, [-2.6, 0.06, 11.2], [5.9, 0.12, 0.1]);
  for (const x of [-5.5, -2.6, 0.3]) kit.box(M.steelDark, [x, 1.4, 11.2], [0.1, 2.7, 0.1]);
  kit.push(0, 0, 0, 0); kit.wall(-3.75, 11.2, 2.2, 0.05, 0, 2.7); kit.wall(-1.0, 11.2, 0.4, 0.05, 0, 2.7); kit.pop();
  desk(kit, -3.2, 12.9, Math.PI, 1.8, { screenSeed: 3 });
  chair(kit, -3.2, 12.0, 0, M.chairBlue, 'arm');
  locker(kit, -5.5, 13.5, Math.PI, 1.0, 2.1, 0.5, M.plastic);
  // 后墙中：仪器柜
  for (let i = 0; i < 3; i++) locker(kit, 1.6 + i * 1.3, 13.6, Math.PI, 1.2, 2.2, 0.5, M.plastic);
  consoleUnit(kit, { x: 4.6, z: 12.8, rot: Math.PI, w: 1.6, d: 0.7, screens: 2, top: M.consoleBlue, seed: 5 });
  wallScreen(kit, 'scope', 3, 0, 1.9, 0.16, 0, 1.2, 0.7);
  sign(kit, ['医疗湾', 'SICKBAY'], [-1.4, 2.3, 0.17], 0, [1.2, 0.36], { accent: '#5ad08a' });
  ceilingRun(kit, 12, 14, 3.2, [M.pipeBlue, M.pipeRed]);
  kit.light(2.8, 2.0, 5, 0xe8f4ff, 12, 10);
  setSpawn(ctx, 'sickbay', 0, 2.4);
}
