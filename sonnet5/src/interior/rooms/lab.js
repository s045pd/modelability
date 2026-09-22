import * as THREE from 'three';
import { roomShell, setSpawn } from './shell.js';
import { chair, plant, sign, wallScreen, consoleUnit } from '../props.js';
import { rack, ceilingRun } from '../props2.js';

function glassware(kit, x, y, z, seed) {
  const M = kit.M;
  const gm = new THREE.MeshStandardMaterial({ color: [0x4ad0a0, 0xd0a04a, 0x4a80d0, 0xd04a80][seed % 4], roughness: 0.1, transparent: true, opacity: 0.6 });
  kit.sph(gm, [x, y + 0.12, z], 0.1, { ws: 12, hs: 8 });
  kit.cyl(M.plastic, [x, y + 0.27, z], 0.03, 0.14, { seg: 8, rt: 0.03 });
  kit.cyl(gm, [x + 0.3, y + 0.12, z + 0.05], 0.05, 0.24, { seg: 8 });
}

export function buildScienceLab(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '科学实验室', inside: M.wallBlue, floor: M.floorLight, trim: M.consoleBlue, lightMat: M.panelCool });
  // 实验台
  for (const z of [4.6, 7.6]) {
    kit.solid(M.plasticGrey, [-2.0, 0.45, z], [4.6, 0.9, 1.1]);
    kit.box(M.steelDark, [-2.0, 0.92, z], [4.7, 0.04, 1.2]);
    for (let i = 0; i < 5; i++) glassware(kit, -3.8 + i * 0.85, 0.94, z + ((i % 2) - 0.5) * 0.3, i + z);
    kit.cyl(M.steelDark, [-0.6, 1.1, z], 0.08, 0.35, { seg: 8 });
    kit.box(M.steelDark, [-0.6, 1.3, z + 0.08], [0.12, 0.2, 0.1], [0.5, 0, 0]);
    chair(kit, -3.0, z + 1.1, Math.PI, M.chairBlue, 'stool');
    chair(kit, -1.0, z + 1.1, Math.PI, M.chairBlue, 'stool');
  }
  // 全息星图桌
  kit.cyl(M.consoleDark, [-3.6, 0.5, 11.2], 1.2, 1.0, { seg: 32, rt: 1.0 });
  kit.push(0, 0, 0, 0); kit.wall(-3.6, 11.2, 1.2, 1.2, 0, 1.05); kit.pop();
  const holo = new THREE.MeshBasicMaterial({ color: 0x40ff90, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  holo.color.setRGB(0.16, 0.9, 0.5); holo.userData.noShadow = true;
  for (let i = 0; i < 26; i++) kit.sph(holo, [-3.6 + Math.sin(i * 2.4) * 0.7, 1.3 + (i % 5) * 0.12, 11.2 + Math.cos(i * 1.7) * 0.7], 0.035, { ws: 6, hs: 4 });
  kit.torus(holo, [-3.6, 1.5, 11.2], 0.85, 0.012, { seg: 48, rot: [Math.PI / 2, 0, 0] });
  kit.interact(-3.6, 1.2, 11.2, 2.2, '星图分析仪 · 未知天体', () => ctx.ui.toast('扫描结果：M 级行星，大气含氧，探测到低强度生命信号。'));
  // 右墙：计算机核心
  for (let i = 0; i < 5; i++) rack(kit, 5.3, 2.4 + i * 1.3, -Math.PI / 2, 1.2, 2.2);
  // 后墙：标本柜（发光标本罐）
  kit.solid(M.plastic, [3.0, 1.0, 13.55], [4.4, 2.0, 0.6]);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    m.color.setRGB(...[[0.3, 1.6, 0.6], [1.6, 0.9, 0.2], [0.3, 0.8, 1.6], [1.2, 0.4, 1.4]][(i + j) % 4]);
    kit.cyl(m, [1.2 + i * 0.5, 0.5 + j * 0.6, 13.24], 0.13, 0.3, { seg: 10 });
  }
  // 学者控制台
  consoleUnit(kit, { x: -5.2, z: 1.8, rot: Math.PI / 2, w: 1.4, d: 0.8, hood: true, top: M.consoleBlue, seed: 3 });
  consoleUnit(kit, { x: 1.8, z: 2.2, rot: Math.PI, w: 1.6, d: 0.8, screens: 2, seed: 9, top: M.consoleBlue });
  wallScreen(kit, 'chart', 2, 0, 1.9, 0.16, 0, 1.4, 0.8);
  wallScreen(kit, 'scope', 5, -5.83, 1.9, 8.0, Math.PI / 2, 1.4, 0.8);
  plant(kit, 5.2, 1.4, 1.0);
  sign(kit, ['科学实验室', 'SCIENCE LAB'], [-1.4, 2.3, 0.17], 0, [1.2, 0.36], { accent: '#b89cff' });
  ceilingRun(kit, 12, 14, 3.2, [M.pipeBlue, M.pipeYellow]);
  kit.light(-1, 2.1, 6, 0xe8f4ff, 14, 11);
  setSpawn(ctx, 'lab', 0, 2.4);
}
