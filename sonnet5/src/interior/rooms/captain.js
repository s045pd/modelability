import * as THREE from 'three';
import { roomShell, setSpawn } from './shell.js';
import { chair, table, plant, bookshelf, sign, wallScreen, locker } from '../props.js';
import { bed, desk, wallDecor } from '../props2.js';

export function buildCaptainQuarters(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '舰长舱', inside: M.wallWarm, floor: M.floorRed, trim: M.consoleGold, lightMat: M.panelWarm, window: { w: 4.6, sill: 0.9, top: 2.5 } });
  // 圆形地毯
  kit.cyl(M.chairRed, [0, 0.03, 6.4], 2.6, 0.02, { seg: 48 });
  kit.geo(M.gold, new THREE.RingGeometry(2.2, 2.26, 64), [0, 0.045, 6.4], [-Math.PI / 2, 0, 0]);
  kit.geo(M.gold, new THREE.RingGeometry(1.5, 1.54, 64), [0, 0.045, 6.4], [-Math.PI / 2, 0, 0]);
  // 卧区（右后）
  bed(kit, 3.9, 11.6, Math.PI, { blanket: M.fabricBlue });
  kit.solid(M.wood, [5.2, 0.35, 12.9], [0.6, 0.7, 0.55]);
  kit.cyl(M.panelWarm, [5.2, 0.9, 12.9], 0.13, 0.22, { seg: 12, rt: 0.08 });
  kit.light(5.2, 1.0, 12.5, 0xffd7a0, 8, 6);
  // 书桌（左后）
  desk(kit, -4.0, 12.7, Math.PI, 1.8, { screenSeed: 2 });
  chair(kit, -4.0, 11.6, 0, M.chairGold, 'arm');
  bookshelf(kit, -5.7, 8.4, Math.PI / 2, 2.6, 2.0, 0.34);
  bookshelf(kit, -5.7, 5.4, Math.PI / 2, 2.6, 2.0, 0.34);
  // 三维棋
  table(kit, 3.0, 5.6, 1.0, 1.0, 0, { h: 0.7, round: true, mat: M.wood });
  for (let l = 0; l < 3; l++) {
    kit.box(l % 2 ? M.plasticGrey : M.steel, [3.0, 0.78 + l * 0.22, 5.6 + (l - 1) * 0.04], [0.5 - l * 0.06, 0.02, 0.5 - l * 0.06]);
    for (const p of [[-0.14, -0.1], [0.12, 0.1], [0.0, 0.16]]) kit.cyl(l % 2 ? M.chairRed : M.plastic, [3.0 + p[0], 0.86 + l * 0.22, 5.6 + p[1]], 0.03, 0.07, { seg: 8 });
  }
  chair(kit, 3.0, 4.6, 0, M.chairBlue, 'arm'); chair(kit, 3.0, 6.6, Math.PI, M.chairBlue, 'arm');
  // 衣柜、个人物品
  locker(kit, 5.5, 1.8, -Math.PI / 2, 1.8, 2.2, 0.6, M.wood);
  locker(kit, -5.5, 2.0, Math.PI / 2, 1.4, 2.2, 0.6, M.wood);
  kit.cyl(M.gold, [-5.4, 1.55, 3.6], 0.15, 0.4, { seg: 12, rt: 0.08 });
  plant(kit, 5.3, 8.2, 1.2); plant(kit, -5.3, 10.6, 1.0);
  wallScreen(kit, 'chart', 9, 5.83, 1.6, 6.0, -Math.PI / 2, 1.3, 0.75);
  sign(kit, ['舰长舱', "CAPTAIN'S QUARTERS"], [-1.4, 2.3, 0.17], 0, [1.2, 0.36], { accent: '#ffcc66' });
  wallDecor(kit, 12, 14, 41, { from: 1.4, to: 3.4, step: 2.0 });
  kit.interact(-4.0, 1.0, 12.2, 2.0, '舰长日志', () => ctx.ui.toast('舰长日志，星历 3141.9。企业号已进入轨道，全体人员待命。'));
  kit.light(0, 2.0, 7, 0xffd8a8, 12, 12);
  setSpawn(ctx, 'captain', 0, 2.4);
}
