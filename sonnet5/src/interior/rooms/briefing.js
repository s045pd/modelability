import * as THREE from 'three';
import { roomShell, setSpawn } from './shell.js';
import { chair, plant, sign, screen, wallScreen, ceilLight } from '../props.js';
import { wallDecor, ceilingRun } from '../props2.js';

function shipModel(kit, M, x, y, z) {
  kit.push(x, y, z, Math.PI);
  kit.cyl(M.steel, [0, 0.01, 0], 0.32, 0.02, { seg: 16 });
  kit.cyl(M.hullWarm, [0, 0.12, 0.05], 0.15, 0.02, { seg: 24, rt: 0.15 });
  kit.sph(M.hullWarm, [0, 0.1, 0], 0.16, { ws: 20, hs: 8, s: [1, 0.16, 1] });
  kit.cyl(M.hullWarm, [0, -0.02, 0.2], 0.03, 0.14, { seg: 10, rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) { kit.cyl(M.hullWarm, [s * 0.09, 0.09, 0.32], 0.012, 0.22, { seg: 8, rot: [Math.PI / 2, 0, 0] }); kit.box(M.hullWarm, [s * 0.05, 0.04, 0.24], [0.005, 0.1, 0.06], [0, 0, s * 0.5]); }
  kit.pop();
}

export function buildBriefing(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '会议室', inside: M.wallWarm, floor: M.floorRed, trim: M.consoleGold });
  // 椭圆会议桌
  kit.box(M.woodLight, [0, 0.76, 7.4], [6.6, 0.06, 1.9]);
  for (const s of [-1, 1]) kit.cyl(M.woodLight, [s * 3.3, 0.76, 7.4], 0.95, 0.06, { seg: 32 });
  kit.box(M.steelDark, [0, 0.38, 7.4], [5.6, 0.7, 0.9]);
  for (const s of [-1, 1]) kit.cyl(M.steelDark, [s * 3.3, 0.38, 7.4], 0.5, 0.7, { seg: 16 });
  kit.push(0, 0, 0, 0); kit.wall(0, 7.4, 3.9, 0.95, 0, 0.85); kit.pop();
  kit.geo(M.lampVC, new THREE.PlaneGeometry(1, 1), [0, 0.795, 7.4], [-Math.PI / 2, 0, 0], [5.2, 0.08, 1], [0.3, 1.5, 3]);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    const x = -2.5 + i * 1.25;
    chair(kit, x, 7.4 - s * 1.35, s > 0 ? 0 : Math.PI, i % 2 ? M.chairBlue : M.chairRed, 'arm');
  }
  chair(kit, -4.6, 7.4, -Math.PI / 2, M.chairGold, 'arm');
  chair(kit, 4.6, 7.4, Math.PI / 2, M.chairGold, 'arm');
  // 桌面全息投影器
  kit.cyl(M.steelDark, [0, 0.82, 7.4], 0.22, 0.06, { seg: 20 });
  const holo = new THREE.MeshBasicMaterial({ color: 0x4ab0ff, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
  holo.color.setRGB(0.18, 0.55, 1.0); holo.userData.noShadow = true;
  kit.cyl(holo, [0, 1.18, 7.4], 0.38, 0.6, { seg: 20, rt: 0.03 });
  // 后墙主屏
  kit.box(M.steelDark, [0, 1.75, 13.82], [4.6, 2.1, 0.1]);
  screen(kit, 'chart', 4, [0, 1.75, 13.75], [4.3, 1.8], 0, Math.PI, false);
  kit.box(M.consoleGold, [0, 2.85, 13.8], [4.8, 0.08, 0.12]);
  wallScreen(kit, 'ship', 7, -5.83, 1.7, 5.5, Math.PI / 2, 1.3, 0.8);
  wallScreen(kit, 'bars', 8, -5.83, 1.7, 9.2, Math.PI / 2, 1.3, 0.8);
  // 侧柜：咖啡与舰模
  kit.solid(M.wood, [5.4, 0.5, 11.6], [0.9, 1.0, 3.0]);
  kit.box(M.woodLight, [5.4, 1.02, 11.6], [1.0, 0.05, 3.1]);
  kit.cyl(M.steel, [5.4, 1.3, 11.0], 0.16, 0.5, { seg: 16, rt: 0.12 });
  for (let i = 0; i < 4; i++) kit.cyl(M.plastic, [5.4, 1.1, 11.8 + i * 0.25], 0.05, 0.08, { seg: 8 });
  kit.box(M.wood, [5.8, 2.0, 11.6], [0.3, 0.05, 2.6]);
  shipModel(kit, M, 5.8, 2.06, 11.6);
  plant(kit, 5.2, 1.6, 1.3); plant(kit, -5.2, 12.9, 1.3);
  sign(kit, ['会议室', 'BRIEFING ROOM'], [-1.4, 2.3, 0.17], 0, [1.2, 0.36]);
  ceilLight(kit, 0, 7.4, 4.8, 0.7, 3.2, M.panel);
  ceilingRun(kit, 12, 14, 3.2, [M.pipeRed, M.pipeBlue]);
  wallDecor(kit, 12, 14, 12, { from: 1.5, to: 4.6, step: 2.0 });
  kit.light(0, 2.1, 7.4, 0xfff0dc, 14, 10);
  setSpawn(ctx, 'briefing', 0, 2.4);
}
