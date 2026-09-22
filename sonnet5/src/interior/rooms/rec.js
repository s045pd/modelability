import { wedgeLighting, wedgeShape, wedgePolar } from './shell.js';
import { chair, table, plant, sign, wallScreen, ceilLight, pipe, bench } from '../props.js';

const H = 3.2;
const tang = (th) => -(th * Math.PI) / 180;

export function buildRecRoom(ctx) {
  const { kit, M } = ctx;
  wedgeShape(kit, M.floorLight, 0.02, true);
  wedgeShape(kit, M.ceiling, H - 0.02, false);
  wedgeLighting(kit, { mat: M.panelWarm, color: 0xffe6c8 });
  kit.zone('娱乐室 · 餐厅', 'DECK 4', 16, 16, 13.5, 13.5, 0, H + 0.2);

  // 餐桌与座椅
  const layout = [[14.5, 28], [14.5, 62], [19, 18], [19, 45], [19, 72], [23.5, 14], [23.5, 33], [23.5, 55], [23.5, 76]];
  layout.forEach(([r, th], i) => {
    const [x, z] = wedgePolar(r, th);
    table(kit, x, z, 1.5, 1.5, 0, { round: true, h: 0.76, mat: i % 2 ? M.plastic : M.woodLight });
    kit.cyl(M.lampWarm, [x, 0.83, z], 0.04, 0.12, { seg: 8 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + i;
      chair(kit, x + Math.sin(a) * 1.05, z + Math.cos(a) * 1.05, a + Math.PI, [M.chairOrange, M.chairBlue, M.chairRed, M.chairGold][k], 'stool');
    }
    ceilLight(kit, x, z, 1.4, 0.4, H, M.panelWarm);
    if (i % 2 === 0) kit.light(x, 2.0, z, 0xffe6c8, 9, 9);
  });
  // 自助餐台：沿圆弧
  for (let th = 22; th <= 68; th += 6) {
    const [x, z] = wedgePolar(28.4, th);
    kit.push(x, 0, z, tang(th) + Math.PI / 2 * 0 - Math.PI / 2 + Math.PI);
    kit.solid(M.consoleDark, [0, 0.55, 0], [1.8, 1.1, 0.8]);
    kit.box(M.steel, [0, 1.12, 0], [1.9, 0.04, 0.9]);
    kit.box(M.panelWarm, [0, 2.15, -0.28], [1.6, 0.4, 0.04]);
    for (let q = 0; q < 3; q++) kit.cyl(M.steel, [-0.55 + q * 0.55, 1.22, 0.05], 0.13, 0.15, { seg: 12 });
    kit.pop();
  }
  // 食物合成机排
  for (let th = 20; th <= 70; th += 10) {
    const [x, z] = wedgePolar(29.4, th);
    kit.push(x, 0, z, tang(th) + Math.PI / 2);
    kit.solid(M.plasticGrey, [0, 1.1, 0], [1.4, 2.2, 0.5]);
    kit.box(M.consoleDark, [0, 1.3, 0.26], [0.9, 0.8, 0.02]);
    kit.box(M.lampAmber, [0, 1.3, 0.28], [0.7, 0.5, 0.01]);
    kit.box(M.steel, [0, 0.8, 0.3], [0.5, 0.05, 0.16]);
    kit.pop();
  }
  // 中央绿化岛
  const [px, pz] = wedgePolar(10.6, 45);
  const [qx, qz] = wedgePolar(17.2, 45);
  kit.cyl(M.consoleDark, [qx, 0.2, qz], 2.0, 0.4, { seg: 32 });
  kit.cyl(M.soil, [qx, 0.41, qz], 1.85, 0.03, { seg: 32 });
  kit.push(0, 0, 0, 0); kit.wall(qx, qz, 2.0, 2.0, 0, 0.5); kit.pop();
  kit.cyl(M.wood, [qx, 1.3, qz], 0.14, 2.2, { seg: 10, rt: 0.08 });
  for (let i = 0; i < 7; i++) { const a = i * 0.9; kit.sph(M.leaf, [qx + Math.cos(a) * 0.7, 2.5 + (i % 3) * 0.15, qz + Math.sin(a) * 0.7], 0.5, { ws: 10, hs: 8 }); }
  kit.light(qx + 2.5, 1.5, qz + 2.5, 0xd8ffd0, 6, 8);
  // 沿墙屏幕、长椅、植物
  for (let i = 0; i < 4; i++) {
    wallScreen(kit, ['ship', 'chart', 'scope', 'bars'][i], i + 20, 10 + i * 5, 1.75, 1.86, 0, 1.6, 0.9);
    wallScreen(kit, ['bars', 'ship', 'chart', 'scope'][i], i + 24, 1.86, 1.75, 10 + i * 5, Math.PI / 2, 1.6, 0.9);
  }
  for (const [x, z, r] of [[5, 2.6, 0], [2.6, 5, Math.PI / 2]]) bench(kit, x + 4, z, r, 1.8, M.fabricRed);
  for (let i = 0; i < 6; i++) { const [x, z] = wedgePolar(8.8 + i * 4.3, 6); plant(kit, x, z + 0.9, 1.2); const [a, b] = wedgePolar(8.8 + i * 4.3, 84); plant(kit, a - 0.4, b, 1.2); }
  sign(kit, ['娱乐室 · 餐厅', 'RECREATION / MESS'], [12, 2.5, 1.86], 0, [1.5, 0.45]);
  sign(kit, ['娱乐室 · 餐厅', 'RECREATION / MESS'], [1.86, 2.5, 12], Math.PI / 2, [1.5, 0.45]);
  pipe(kit, [3, H - 0.2, 3], [3, H - 0.2, 28], 0.06, M.pipeBlue);
  pipe(kit, [3, H - 0.25, 3], [28, H - 0.25, 3], 0.06, M.pipeRed);
  const s = wedgePolar(16, 45);
  const p = kit.toWorld(s[0], 0, s[1]);
  ctx.world.spawns.rec = { x: p.x, y: kit.oy, z: p.z, yaw: kit.yaw() + Math.PI * 1.25 };
}
