import * as THREE from 'three';
import { TIME } from '../core/materials.js';
import { NAC } from '../exterior/dims.js';
import { sign, pipe, wallPanel } from './props.js';
import { makeRng } from '../core/rng.js';

const T0 = 10, T1 = 124, R = 3.5, FLOOR = -2.4;

function coilMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: TIME },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vW; uniform float uTime;
      void main(){
        float p = pow(0.5 + 0.5 * sin(vW.z * 0.55 - uTime * 5.0), 4.0);
        vec3 c = vec3(0.06, 0.28, 1.0) * (0.55 + 0.45 * p) + vec3(0.5, 1.6, 3.6) * p * 0.9;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

export function buildNacelleTube(ctx) {
  const { kit, M, world, FX } = ctx;
  const rng = makeRng(919);
  const coil = coilMaterial();
  const wall = new THREE.MeshStandardMaterial({ color: 0x8a92a0, roughness: 0.5, metalness: 0.7, side: THREE.BackSide });
  kit.push(NAC.x, NAC.y, NAC.z0, 0);
  const L = T1 - T0, zc = (T0 + T1) / 2;

  // 管壁
  const shell = new THREE.CylinderGeometry(R, R, L, 40, 1, true);
  kit.geo(wall, shell, [0, 0, zc], [Math.PI / 2, 0, 0]);
  // 地板（格栅）与碰撞
  kit.box(M.grate, [0, FLOOR - 0.05, zc], [4.6, 0.1, L]);
  kit.floorRect(0, zc, 2.3, L / 2, FLOOR);
  for (const s of [-1, 1]) {
    kit.box(M.steelDark, [s * 2.45, FLOOR + 0.15, zc], [0.3, 0.3, L]);
    kit.wall(s * 2.5, zc, 0.15, L / 2, FLOOR, 3);
    kit.box(M.lampBlue, [s * 2.28, FLOOR + 0.02, zc], [0.06, 0.02, L]);
  }
  // 两端封板
  kit.wall(0, T0 - 0.2, 3.5, 0.2, FLOOR, 3);
  kit.wall(0, T1 + 0.2, 3.5, 0.2, FLOOR, 3);

  // 曲速线圈环
  for (let z = T0 + 6; z < T1 - 2; z += 3.4) {
    kit.torus(coil, [0, 0, z], R - 0.22, 0.3, { seg: 40, ts: 10 });
    kit.torus(M.steelDark, [0, 0, z - 0.4], R - 0.1, 0.09, { seg: 40, ts: 6 });
    kit.torus(M.steelDark, [0, 0, z + 0.4], R - 0.1, 0.09, { seg: 40, ts: 6 });
    for (const a of [0.9, 2.24, -0.9, -2.24]) kit.box(M.gold, [Math.sin(a) * (R - 0.3), Math.cos(a) * (R - 0.3), z], [0.4, 0.4, 0.5], [0, 0, -a]);
  }
  // 顶部等离子导管
  kit.cyl(coil, [0, 2.75, zc], 0.32, L, { seg: 12, rot: [Math.PI / 2, 0, 0] });
  for (let z = T0 + 4; z < T1 - 2; z += 6) kit.box(M.steelDark, [0, 2.75, z], [0.9, 0.9, 0.3]);
  // 侧壁管线与面板
  for (const s of [-1, 1]) {
    pipe(kit, [s * 3.0, 0.3, T0], [s * 3.0, 0.3, T1], 0.1, s > 0 ? M.pipeRed : M.pipeBlue);
    pipe(kit, [s * 2.7, -0.6, T0], [s * 2.7, -0.6, T1], 0.07, M.pipeYellow);
    for (let z = T0 + 8; z < T1 - 4; z += 12) {
      kit.push(s * 2.85, 0.4, z, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      wallPanel(kit, 0, -0.2, 0.1, 0, ['buttons', 'hatch', 'vent'][Math.floor(z / 12) % 3]);
      kit.pop();
    }
  }
  // 灯
  for (let z = T0 + 4; z < T1 - 2; z += 9) {
    for (const s of [-1, 1]) {
      kit.cyl(M.steelDark, [s * 2.55, 1.6, z], 0.18, 0.3, { seg: 10 });
      kit.cyl(M.lampCyan, [s * 2.55, 1.6, z], 0.13, 0.06, { seg: 10, rot: [0, 0, Math.PI / 2] });
    }
    kit.light(0, 1.6, z, 0x9cc8ff, 13, 11);
  }
  // 前端：布萨德集电器窗口
  kit.box(M.steelDark, [0, 0, T0 - 0.2], [8, 8, 0.4]);
  kit.plane(FX.bussard, [0, 0.3, T0 + 0.02], [6.4, 6.4], [0, Math.PI, 0]);
  kit.torus(M.gold, [0, 0.3, T0 + 0.05], 3.2, 0.14, { seg: 40 });
  kit.torus(M.steelDark, [0, 0.3, T0 + 0.25], 3.5, 0.12, { seg: 40 });
  kit.light(0, 0.5, T0 + 2, 0xff5a20, 26, 10);
  sign(kit, ['布萨德集电器', 'BUSSARD COLLECTOR'], [0, 2.9, T0 + 0.1], Math.PI, [1.5, 0.46], { fg: '#ff9b4a', accent: '#ff5a3a' });
  // 后端：排气窗口
  kit.box(M.steelDark, [0, 0, T1 + 0.2], [8, 8, 0.4]);
  kit.cyl(M.core, [0, 0, T1 - 0.01], 2.2, 0.05, { seg: 32, rot: [Math.PI / 2, 0, 0] });
  kit.torus(M.gold, [0, 0, T1 - 0.05], 2.4, 0.12, { seg: 32 });
  kit.light(0, 0.5, T1 - 2, 0x60a8ff, 20, 10);
  sign(kit, ['返回轮机舱', 'TO ENGINEERING'], [0, 2.9, T1 - 0.1], 0, [1.5, 0.46], { fg: '#6fa8ff', accent: '#6fa8ff' });
  kit.interact(0, FLOOR + 1.0, T1 - 2.4, 3.0, '返回轮机舱', () => ctx.ui.go('engineering'));
  kit.interact(0, FLOOR + 1.0, T0 + 3.0, 3.0, '返回轮机舱', () => ctx.ui.go('engineering'));
  kit.interact(0, FLOOR + 1.0, (T0 + T1) / 2, 6.0, '曲速线圈 · 正在为舰体建立曲速场', () => ctx.ui.toast('曲速线圈 · 输出 4.2 曲速 · 场强稳定'));

  kit.zone('曲速舱维修隧道', '右舷曲速舱', 0, zc, R, L / 2 + 1, FLOOR - 1, 4);
  const p = kit.toWorld(0, FLOOR, T0 + 5);
  world.spawns.nacelle = { x: p.x, y: p.y, z: p.z, yaw: Math.PI };
  kit.pop();
}
