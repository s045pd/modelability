import { roomShell, setSpawn } from './shell.js';
import { chair, sign, wallScreen, consoleUnit } from '../props.js';
import { ceilingRun, forceBars } from '../props2.js';

export function buildBrig(ctx) {
  const { kit, M } = ctx;
  roomShell(kit, { w: 12, d: 14, name: '保安室 · 禁闭室', inside: M.wallDark, floor: M.plate, trim: M.consoleRed });
  // 三间牢房
  const cells = [-4.0, 0, 4.0];
  cells.forEach((cx, i) => {
    const o = { mat: M.wallDark, mat2: M.wallDark, trim: null };
    kit.solid(M.consoleDark, [cx + 1.98, 1.4, 11.9], [0.1, 2.8, 4.2]);
    kit.solid(M.consoleDark, [cx - 1.98, 1.4, 11.9], [0.1, 2.8, 4.2]);
    // 床铺、马桶
    kit.solid(M.steel, [cx - 1.0, 0.4, 13.0], [1.6, 0.8, 0.9]);
    kit.box(M.bedWhite, [cx - 1.0, 0.85, 13.0], [1.5, 0.1, 0.85]);
    kit.solid(M.steel, [cx + 1.3, 0.3, 13.3], [0.5, 0.6, 0.5]);
    kit.box(M.panelCool, [cx, 2.7, 12.0], [1.6, 0.03, 0.4]);
    // 力场栅栏
    if (i === 1) { forceBars(kit, cx - 1.0, 0, 9.85, 1.9, 2.6); kit.push(0, 0, 0, 0); kit.wall(cx - 1.0, 9.85, 0.98, 0.05, 0, 2.6); kit.pop(); forceBars(kit, cx + 1.45, 0, 9.85, 1.05, 2.6); kit.push(0, 0, 0, 0); kit.wall(cx + 1.45, 9.85, 0.55, 0.05, 0, 2.6); kit.pop(); }
    else { forceBars(kit, cx, 0, 9.85, 3.9, 2.6); kit.push(0, 0, 0, 0); kit.wall(cx, 9.85, 1.95, 0.05, 0, 2.6); kit.pop(); }
    kit.box(M.consoleDark, [cx + 1.75, 1.25, 9.8], [0.1, 0.3, 0.12]);
    kit.box(i === 1 ? M.lampGreen : M.lampRed, [cx + 1.75, 1.3, 9.74], [0.06, 0.06, 0.02]);
  });
  kit.light(-4, 2.2, 11.5, 0xff8060, 8, 6); kit.light(0, 2.2, 11.5, 0xff8060, 8, 6); kit.light(4, 2.2, 11.5, 0xff8060, 8, 6);
  // 警卫台
  consoleUnit(kit, { x: 2.6, z: 6.3, rot: Math.PI, w: 2.2, d: 0.9, screens: 3, top: M.consoleRed, seed: 7 });
  chair(kit, 2.6, 5.3, 0, M.chairRed, 'arm');
  // 武器柜：相位枪架
  kit.solid(M.steelDark, [-5.5, 1.1, 4.5], [0.5, 2.2, 3.6]);
  kit.box(M.glass, [-5.24, 1.2, 4.5], [0.02, 1.6, 3.2]);
  for (let i = 0; i < 6; i++) {
    kit.push(-5.4, 1.35 + (i % 2) * 0.6, 3.2 + Math.floor(i / 2) * 1.0, 0);
    kit.box(M.plasticGrey, [0, 0, 0], [0.12, 0.1, 0.28]);
    kit.box(M.steelDark, [0, -0.1, -0.08], [0.06, 0.16, 0.08]);
    kit.box(M.lampBlue, [0.07, 0, 0.1], [0.02, 0.04, 0.05]);
    kit.pop();
  }
  kit.box(M.hazard, [-5.24, 2.25, 4.5], [0.03, 0.12, 3.4]);
  kit.solid(M.consoleDark, [5.4, 0.5, 3.0], [1.0, 1.0, 2.2]);
  wallScreen(kit, 'ship', 2, 5.83, 1.7, 5.5, -Math.PI / 2, 1.3, 0.8);
  sign(kit, ['保安室', 'SECURITY / BRIG'], [-1.4, 2.3, 0.17], 0, [1.2, 0.36], { accent: '#ff5a3a' });
  ceilingRun(kit, 12, 14, 3.2, [M.pipeRed, M.pipeYellow]);
  kit.light(0, 2.1, 4, 0xffe0d0, 12, 10);
  setSpawn(ctx, 'brig', 0, 2.4);
}
