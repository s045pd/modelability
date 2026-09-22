import { wedgeLighting, wedgeShape, wedgePolar } from './shell.js';
import { plant, sign, wallScreen, ceilLight, pipe, bench, screen } from '../props.js';

const H = 3.2;

function ringRing(kit, M, cx, cz, s) {
  kit.solid(M.consoleDark, [cx, 0.3, cz], [s, 0.6, s]);
  kit.box(M.fabricBlue, [cx, 0.62, cz], [s - 0.1, 0.05, s - 0.1]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kit.cyl(M.steelDark, [cx + sx * (s / 2 - 0.1), 1.35, cz + sz * (s / 2 - 0.1)], 0.07, 1.5, { seg: 10 });
  for (const y of [0.95, 1.25, 1.55]) {
    for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
      kit.beam(y > 1.4 ? M.chairRed : M.plastic, [cx + ax * (s / 2 - 0.1), y, cz + az * (s / 2 - 0.1)], [cx + bx * (s / 2 - 0.1), y, cz + bz * (s / 2 - 0.1)], 0.025);
    }
  }
}

export function buildGym(ctx) {
  const { kit, M } = ctx;
  wedgeShape(kit, M.floorLight, 0.02, true);
  wedgeShape(kit, M.ceiling, H - 0.02, false);
  wedgeLighting(kit, { mat: M.panel, color: 0xfff2e0 });
  kit.zone('健身房', 'DECK 4', 16, 16, 13.5, 13.5, 0, H + 0.2);
  const [rx, rz] = wedgePolar(18, 45);
  ringRing(kit, M, rx, rz, 4.6);
  // 垫子
  for (let i = 0; i < 6; i++) { const [x, z] = wedgePolar(14.5 + (i % 3) * 2.3, 70 + Math.floor(i / 3) * 7); kit.box(M.fabricRed, [x, 0.06, z], [2, 0.08, 1.2], [0, i * 0.4, 0]); }
  // 沙袋
  for (let i = 0; i < 3; i++) {
    const [x, z] = wedgePolar(25, 20 + i * 9);
    kit.beam(M.steel, [x, 3.15, z], [x, 2.35, z], 0.02);
    kit.cyl(M.leather, [x, 1.6, z], 0.22, 1.4, { seg: 14 });
    kit.push(0, 0, 0, 0); kit.wall(x, z, 0.28, 0.28, 0, 2.3); kit.pop();
  }
  // 举重凳与杠铃
  for (let i = 0; i < 4; i++) {
    const [x, z] = wedgePolar(23 + (i % 2) * 3, 55 + Math.floor(i / 2) * 15);
    kit.push(x, 0, z, i * 0.3);
    kit.solid(M.leather, [0, 0.42, 0], [0.4, 0.1, 1.3]);
    for (const s of [-1, 1]) kit.box(M.steelDark, [s * 0.3, 0.65, -0.5], [0.05, 0.5, 0.05]);
    kit.beam(M.steel, [-0.9, 1.0, -0.5], [0.9, 1.0, -0.5], 0.025, { seg: 6 });
    for (const s of [-1, 1]) for (const k of [0, 1]) kit.cyl(M.rubber, [s * (0.5 + k * 0.08), 1.0, -0.5], 0.22 - k * 0.04, 0.06, { seg: 16, rot: [0, 0, Math.PI / 2] });
    kit.pop();
  }
  // 哑铃架
  for (let i = 0; i < 2; i++) {
    const [x, z] = wedgePolar(28.8, 30 + i * 30);
    kit.push(x, 0, z, -((30 + i * 30) * Math.PI) / 180 + Math.PI / 2 + Math.PI);
    kit.solid(M.steelDark, [0, 0.4, 0], [2.0, 0.8, 0.5]);
    for (let k = 0; k < 8; k++) { kit.cyl(M.steel, [-0.85 + k * 0.24, 0.9, -0.05], 0.1, 0.34, { seg: 10, rot: [0, 0, Math.PI / 2] }); kit.cyl(M.rubber, [-0.85 + k * 0.24, 0.9, -0.05], 0.09 + (k % 3) * 0.02, 0.36, { seg: 10, rot: [0, 0, Math.PI / 2] }); }
    kit.pop();
  }
  // 跑步机
  for (let i = 0; i < 3; i++) {
    const [x, z] = wedgePolar(12.6, 30 + i * 12);
    kit.push(x, 0, z, -((30 + i * 12) * Math.PI) / 180 + Math.PI / 2 + Math.PI);
    kit.solid(M.consoleDark, [0, 0.16, 0], [0.8, 0.3, 1.8]);
    kit.box(M.rubber, [0, 0.32, 0], [0.7, 0.03, 1.7]);
    kit.box(M.steelDark, [0, 1.1, 0.8], [0.7, 0.06, 0.12]);
    kit.beam(M.steelDark, [-0.34, 0.3, 0.85], [-0.34, 1.1, 0.85], 0.03);
    kit.beam(M.steelDark, [0.34, 0.3, 0.85], [0.34, 1.1, 0.85], 0.03);
    screen(kit, 'bars', i, [0, 1.25, 0.86], [0.4, 0.22], -0.5, Math.PI, false);
    kit.pop();
  }
  for (let i = 0; i < 3; i++) {
    wallScreen(kit, ['ship', 'bars', 'chart'][i], 30 + i, 10 + i * 6, 1.75, 1.86, 0, 1.6, 0.9);
  }
  bench(kit, 6, 2.6, 0, 2.2, M.fabricBlue);
  plant(kit, 2.6, 6, 1.4); plant(kit, 8, 27, 1.2);
  sign(kit, ['健身房', 'GYMNASIUM'], [12, 2.5, 1.86], 0, [1.5, 0.45], { accent: '#ff9c3a' });
  ceilLight(kit, rx, rz, 3.4, 0.6, H, M.panel);
  for (let i = 0; i < 4; i++) { const [x, z] = wedgePolar(13 + i * 4.5, 45); ceilLight(kit, x, z, 1.8, 0.4, H, M.panel); if (i % 2 === 0) kit.light(x, 2.0, z, 0xfff2e0, 10, 10); }
  pipe(kit, [3, H - 0.2, 3], [3, H - 0.2, 28], 0.06, M.pipeYellow);
  const s = wedgePolar(15, 45);
  const p = kit.toWorld(s[0], 0, s[1]);
  ctx.world.spawns.gym = { x: p.x, y: kit.oy, z: p.z, yaw: kit.yaw() + Math.PI * 1.25 };
}
