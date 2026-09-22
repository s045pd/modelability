import * as THREE from 'three';
import { roomShell, setSpawn } from './shell.js';
import { chair, table, plant, bookshelf, sign, wallScreen, pipe } from '../props.js';
import { sofa, wallDecor } from '../props2.js';

export function buildLounge(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '观景休息室', inside: M.wallBlue, floor: M.floorBlue, trim: M.consoleGold, lightMat: M.panelWarm, window: { w: 9.8, sill: 0.55, top: 2.85 } });
  // 窗前沙发
  for (const x of [-3.5, 0, 3.5]) sofa(kit, x, 12.2, 0, 2.8, M.fabricRed);
  // 茶几与落地灯
  for (const x of [-3.5, 0, 3.5]) table(kit, x, 10.2, 0.9, 0.9, 0, { h: 0.42, round: true, mat: M.woodLight });
  for (const [x, z, rot] of [[-4.6, 8.4, 0.9], [-2.4, 8.4, -0.9], [2.4, 8.4, 0.9], [4.6, 8.4, -0.9]]) {
    kit.push(x, 0, z, rot + Math.PI);
    kit.solid(M.chairBlue, [0, 0.24, 0], [0.8, 0.48, 0.8]);
    kit.box(M.chairBlue, [0, 0.66, -0.34], [0.8, 0.6, 0.14]);
    kit.pop();
  }
  // 中央星图桌
  kit.cyl(M.consoleDark, [0, 0.5, 5.2], 1.1, 1.0, { seg: 32, rt: 0.9 });
  kit.push(0, 0, 0, 0); kit.wall(0, 5.2, 1.1, 1.1, 0, 1.05); kit.pop();
  kit.cyl(M.console, [0, 1.02, 5.2], 1.18, 0.06, { seg: 32 });
  const holo = new THREE.MeshBasicMaterial({ color: 0x4ab0ff, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending });
  holo.color.setRGB(0.18, 0.55, 1.0); holo.userData.noShadow = true;
  kit.sph(holo, [0, 1.6, 5.2], 0.45, { ws: 20, hs: 12 });
  kit.spinner((g) => {
    for (const [r, rx, rz] of [[0.66, 1.2, 0.3], [0.82, 0.4, 0.6], [0.5, 0.2, 1.4]]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 48), holo); t.rotation.set(rx, 0, rz); g.add(t);
    }
    for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), holo); s.position.set(Math.sin(i * 1.7) * 0.6, Math.cos(i * 2.3) * 0.5, Math.cos(i * 1.1) * 0.6); g.add(s); }
  }, [0, 1.6, 5.2], { speed: 0.6 });
  kit.cyl(holo, [0, 1.3, 5.2], 0.3, 0.55, { seg: 16, rt: 0.06 });
  kit.interact(0, 1.2, 5.2, 2.2, '星图 · 阿尔法象限', () => ctx.ui.toast('星图：联邦星际空间 · 当前航向：星期日 · 曲速 4.2'));
  // 吧台
  kit.solid(M.wood, [-5.1, 0.55, 3.2], [0.9, 1.1, 4.4]);
  kit.box(M.woodLight, [-5.1, 1.12, 3.2], [1.05, 0.05, 4.5]);
  kit.box(M.consoleGold, [-4.62, 0.55, 3.2], [0.03, 0.06, 4.4]);
  for (let i = 0; i < 4; i++) chair(kit, -3.9, 1.9 + i * 0.95, -Math.PI / 2, M.chairRed, 'stool');
  kit.box(M.woodLight, [-5.85, 1.5, 3.2], [0.16, 0.06, 4.0]);
  kit.box(M.woodLight, [-5.85, 1.9, 3.2], [0.16, 0.06, 4.0]);
  const bottleColors = [0x2a6a3a, 0x8a2a1a, 0x2a4a8a, 0xb88a2a, 0x5a2a6a];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.MeshStandardMaterial({ color: bottleColors[i % 5], roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 });
    kit.cyl(m, [-5.8, 1.66, 1.4 + i * 0.24], 0.055, 0.32, { seg: 8 });
    kit.cyl(m, [-5.8, 2.06, 1.4 + i * 0.24], 0.05, 0.28, { seg: 8 });
  }
  kit.box(M.panelWarm, [-5.9, 1.4, 3.2], [0.03, 0.03, 4.0]);
  // 装饰
  bookshelf(kit, 5.7, 3.4, -Math.PI / 2, 2.4, 2.0, 0.34);
  bookshelf(kit, 5.7, 6.1, -Math.PI / 2, 2.4, 2.0, 0.34);
  plant(kit, 5.3, 1.6, 1.3); plant(kit, -5.2, 12.8, 1.4); plant(kit, 5.3, 12.8, 1.4);
  sign(kit, ['观景休息室', 'OBSERVATION LOUNGE'], [-1.4, 2.3, 0.17], 0, [1.2, 0.36]);
  wallScreen(kit, 'chart', 3, 5.83, 1.7, 8.8, -Math.PI / 2, 1.1, 0.65);
  wallScreen(kit, 'ship', 5, 5.83, 1.7, 10.4, -Math.PI / 2, 1.1, 0.65);
  wallDecor(kit, 12, 14, 21, { from: 7, to: 12, step: 3 });
  kit.push(0, 0, 0, 0); pipe(kit, [-5.6, 3.0, 0.4], [-5.6, 3.0, 13.4], 0.05, M.pipeBlue); kit.pop();
  kit.light(0, 1.9, 7, 0xffe2c0, 12, 12);
  setSpawn(ctx, 'lounge', 0, 2.4);
}
