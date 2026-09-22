import * as THREE from 'three';
import { wedgeLighting, wedgeShape, wedgePolar } from './shell.js';
import { chair, table, plant, sign, wallScreen, ceilLight, pipe, bookshelf, consoleUnit } from '../props.js';
import { rack } from '../props2.js';

const H = 3.2;

export function buildLibrary(ctx) {
  const { kit, M } = ctx;
  wedgeShape(kit, M.floorRed, 0.02, true);
  wedgeShape(kit, M.ceiling, H - 0.02, false);
  wedgeLighting(kit, { mat: M.panelWarm, color: 0xffe0b0 });
  kit.zone('图书馆 · 档案室', 'DECK 4', 16, 16, 13.5, 13.5, 0, H + 0.2);
  // 环形书架
  for (const [r, a0, a1, step] of [[28.9, 10, 80, 6.2], [23.4, 16, 74, 8]]) {
    for (let th = a0; th <= a1; th += step) {
      const [x, z] = wedgePolar(r, th);
      bookshelf(kit, x, z, -((th * Math.PI) / 180) + Math.PI / 2 + Math.PI * (r > 25 ? 1 : 0), 2.0, 2.4, 0.4);
    }
  }
  // 阅读桌
  for (const [r, th] of [[17, 30], [17, 60], [13.5, 45]]) {
    const [x, z] = wedgePolar(r, th);
    table(kit, x, z, 2.6, 1.1, -((th * Math.PI) / 180) + Math.PI / 2, { h: 0.76, mat: M.wood });
    for (const s of [-1, 1]) for (const q of [-0.7, 0.7]) {
      chair(kit, x + Math.cos(-(th * Math.PI) / 180 + Math.PI / 2) * q + Math.sin(-(th * Math.PI) / 180 + Math.PI / 2) * s * 1.0, z - Math.sin(-(th * Math.PI) / 180 + Math.PI / 2) * q + Math.cos(-(th * Math.PI) / 180 + Math.PI / 2) * s * 1.0, -(th * Math.PI) / 180 + Math.PI / 2 + (s > 0 ? Math.PI : 0), M.chairBlue, 'arm');
    }
    kit.cyl(M.panelWarm, [x, 0.95, z], 0.09, 0.28, { seg: 12, rt: 0.06 });
    ceilLight(kit, x, z, 2.2, 0.4, H, M.panelWarm);
    kit.light(x, 2.0, z, 0xffe0b0, 9, 9);
  }
  // 中央档案柱：全息阅读器
  const [cx, cz] = wedgePolar(21, 45);
  kit.cyl(M.consoleDark, [cx, 0.6, cz], 1.0, 1.2, { seg: 24, rt: 0.85 });
  kit.push(0, 0, 0, 0); kit.wall(cx, cz, 1.0, 1.0, 0, 1.3); kit.pop();
  const holo = new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
  holo.color.setRGB(0.9, 0.55, 0.2); holo.userData.noShadow = true;
  for (let i = 0; i < 5; i++) kit.box(holo, [cx, 1.5 + i * 0.16, cz], [0.7 - i * 0.05, 0.02, 0.5 - i * 0.04], [0, i * 0.5, 0]);
  kit.interact(cx, 1.2, cz, 2.2, '档案阅读器 · 联邦星际历史', () => ctx.ui.toast('档案：宪法级星舰，2245 年首航，任务：五年探索使命。'));
  // 计算机终端
  for (let i = 0; i < 3; i++) { const [x, z] = wedgePolar(12.4, 22 + i * 23); consoleUnit(kit, { x, z, rot: -((22 + i * 23) * Math.PI) / 180 + Math.PI / 2 + Math.PI, w: 1.3, d: 0.7, screens: 1, seed: 40 + i, top: M.consoleGold }); }
  for (let i = 0; i < 3; i++) rack(kit, 8.6 + i * 1.3, 2.6, 0, 1.2, 2.2);
  for (let i = 0; i < 3; i++) wallScreen(kit, ['text', 'chart', 'text'][i], 50 + i, 1.86, 1.75, 12 + i * 6, Math.PI / 2, 1.5, 0.85);
  plant(kit, 3, 3.6, 1.2);
  sign(kit, ['图书馆 · 档案室', 'LIBRARY / ARCHIVES'], [1.86, 2.5, 12], Math.PI / 2, [1.5, 0.45], { accent: '#b89cff' });
  pipe(kit, [3, H - 0.2, 3], [3, H - 0.2, 28], 0.06, M.pipeRed);
  const s = wedgePolar(15.5, 45);
  const p = kit.toWorld(s[0], 0, s[1]);
  ctx.world.spawns.library = { x: p.x, y: kit.oy, z: p.z, yaw: kit.yaw() + Math.PI * 1.25 };
}
