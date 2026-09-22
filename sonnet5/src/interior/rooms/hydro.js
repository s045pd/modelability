import * as THREE from 'three';
import { wedgeLighting, wedgeShape, wedgePolar } from './shell.js';
import { plant, sign, wallScreen, ceilLight, pipe, bench } from '../props.js';
import { planter } from '../props2.js';

const H = 3.2;

export function buildHydroponics(ctx) {
  const { kit, M } = ctx;
  wedgeShape(kit, M.plate, 0.02, true);
  wedgeShape(kit, M.ceiling, H - 0.02, false);
  wedgeLighting(kit, { mat: M.panelCool, color: 0xffc0f4 });
  kit.zone('水培植物园', 'DECK 4', 16, 16, 13.5, 13.5, 0, H + 0.2);
  const grow = new THREE.MeshBasicMaterial({ color: 0xffffff });
  grow.color.setRGB(2.4, 0.6, 2.2); grow.userData.noShadow = true;
  // 弧形种植槽
  for (const [r, a0, a1] of [[14, 20, 70], [19, 15, 75], [24, 14, 76]]) {
    for (let th = a0; th <= a1; th += 100 / r * 1.2) {
      const [x, z] = wedgePolar(r, th);
      planter(kit, x, z, -((th * Math.PI) / 180) + Math.PI / 2, 2.4, 0.9, grow);
      kit.beam(M.steel, [x, 3.15, z], [x, 1.7, z], 0.02);
    }
  }
  // 中央树与水池
  const [cx, cz] = wedgePolar(21.8, 45);
  kit.cyl(M.consoleDark, [cx, 0.15, cz], 2.5, 0.3, { seg: 32 });
  const water = new THREE.MeshStandardMaterial({ color: 0x3a90b0, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.8 });
  kit.cyl(water, [cx, 0.28, cz], 2.35, 0.02, { seg: 32 });
  kit.push(0, 0, 0, 0); kit.wall(cx, cz, 2.5, 2.5, 0, 0.4); kit.pop();
  kit.cyl(M.wood, [cx, 1.4, cz], 0.22, 2.6, { seg: 12, rt: 0.12 });
  for (let i = 0; i < 9; i++) { const a = i * 0.7; kit.beam(M.wood, [cx, 2.4, cz], [cx + Math.cos(a) * 0.9, 2.9, cz + Math.sin(a) * 0.9], 0.05, { seg: 5 }); kit.sph(M.leaf, [cx + Math.cos(a) * 1.0, 2.95, cz + Math.sin(a) * 1.0], 0.55, { ws: 10, hs: 8, s: [1, 0.7, 1] }); }
  kit.light(cx, 2.4, cz, 0xffb0f0, 10, 11);
  // 水箱与管路
  for (let i = 0; i < 3; i++) {
    const [x, z] = wedgePolar(28.6, 22 + i * 24);
    kit.cyl(M.steelDark, [x, 0.1, z], 0.95, 0.2, { seg: 20 });
    kit.cyl(water, [x, 1.3, z], 0.85, 2.3, { seg: 20 });
    kit.cyl(M.steelDark, [x, 2.5, z], 0.95, 0.15, { seg: 20 });
    kit.push(0, 0, 0, 0); kit.wall(x, z, 0.95, 0.95, 0, 2.6); kit.pop();
    pipe(kit, [x, 2.55, z], [x + 1.5, 3.05, z + 1.5], 0.07, M.pipeBlue);
  }
  for (let i = 0; i < 4; i++) { const [x, z] = wedgePolar(10.5 + i * 5, 8); plant(kit, x, z + 0.4, 1.4); }
  bench(kit, 6.5, 3.0, 0, 1.8, M.fabricBlue);
  for (let i = 0; i < 3; i++) wallScreen(kit, ['scope', 'text', 'bars'][i], 60 + i, 10 + i * 6, 1.75, 1.86, 0, 1.4, 0.8);
  sign(kit, ['水培植物园', 'HYDROPONICS'], [12, 2.5, 1.86], 0, [1.5, 0.45], { accent: '#5ad08a' });
  ceilLight(kit, cx, cz, 4.0, 0.4, H, M.panelCool);
  pipe(kit, [3, H - 0.2, 3], [28, H - 0.2, 3], 0.06, M.pipeBlue);
  const s = wedgePolar(15, 45);
  const p = kit.toWorld(s[0], 0, s[1]);
  ctx.world.spawns.hydro = { x: p.x, y: kit.oy, z: p.z, yaw: kit.yaw() + Math.PI * 1.25 };
}
