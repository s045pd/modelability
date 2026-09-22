import { roomShell, setSpawn } from './shell.js';
import { chair, table, plant, locker, sign, wallScreen } from '../props.js';
import { bunk, desk, ceilingRun } from '../props2.js';

export function buildCrewQuarters(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '船员舱', inside: M.wall, floor: M.floorBlue, trim: M.consoleBlue });
  for (let i = 0; i < 4; i++) {
    bunk(kit, -4.85, 3.2 + i * 2.6, Math.PI / 2, i % 2 ? M.fabricBlue : M.fabricRed);
    bunk(kit, 4.85, 3.2 + i * 2.6, -Math.PI / 2, i % 2 ? M.fabricRed : M.fabricBlue);
  }
  // 公共桌
  table(kit, 0, 7.4, 2.4, 1.0, 0, { h: 0.74 });
  for (const s of [-1, 1]) for (const x of [-0.6, 0.6]) chair(kit, x, 7.4 + s * 0.95, s > 0 ? Math.PI : 0, M.chairBlue, 'stool');
  for (let i = 0; i < 3; i++) kit.cyl(M.plastic, [-0.6 + i * 0.6, 0.83, 7.4], 0.06, 0.1, { seg: 10 });
  // 后墙储物柜
  for (let i = 0; i < 5; i++) locker(kit, -4 + i * 2, 13.6, Math.PI, 1.4, 2.1, 0.55, M.plasticGrey);
  desk(kit, -1.2, 1.0, 0, 1.4, { screenSeed: 4 });
  plant(kit, 1.6, 1.2, 1.1);
  wallScreen(kit, 'text', 6, 0, 1.6, 0.16, 0, 0.9, 0.5);
  sign(kit, ['船员舱', 'CREW QUARTERS'], [-1.4, 2.3, 0.17], 0, [1.2, 0.36]);
  ceilingRun(kit, 12, 14, 3.2, [M.pipeYellow, M.pipeBlue]);
  kit.light(0, 2.1, 7, 0xfff0dc, 12, 12);
  setSpawn(ctx, 'crew', 0, 2.4);
}
