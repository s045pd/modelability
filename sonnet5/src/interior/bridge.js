import * as THREE from 'three';
import { latheGeo } from '../core/geom.js';
import { TIME } from '../core/materials.js';
import { wallSeg } from './walls.js';
import { consoleUnit, chair, captainChair, sign, wallScreen, vent, plant } from './props.js';
import { makeRng } from '../core/rng.js';

export const BY = 10.7;
const BR = 7.5;
const BH = 2.5;
const polar = (phi, r) => [r * Math.sin(phi), -r * Math.cos(phi)];
const D2R = Math.PI / 180;

function viewscreenMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: TIME, uMode: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uMode;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float a = .5, s = 0.; for(int i=0;i<5;i++){ s += a*n(p); p = p*2.1+3.7; a*=.5; } return s; }
      vec3 stars(vec2 uv, float t){
        vec3 c = vec3(0.);
        for (int L = 0; L < 3; L++) {
          float sc = 40. + float(L) * 55.;
          vec2 p = uv * sc + vec2(t * (0.4 + float(L) * 0.5), 0.);
          vec2 id = floor(p), f = fract(p) - .5;
          float r = h(id + float(L) * 17.);
          vec2 o = (vec2(h(id + 3.1), h(id + 7.7)) - .5) * .7;
          float d = length(f - o);
          c += vec3(1., .9, .8) * smoothstep(.09, .0, d) * step(.86, r) * (.5 + r);
        }
        return c;
      }
      void main(){
        vec2 uv = vUv; vec2 p = (uv - .5) * vec2(2.15, 1.);
        vec3 col;
        if (uMode < .5) {
          col = vec3(.004, .006, .014) + stars(uv, uTime * .12) * 1.2;
          col += vec3(.05, .03, .09) * fbm(uv * 3. + 2.) * .6;
          vec2 c = p - vec2(.55, -.08); float R = .62; float d = length(c);
          if (d < R) {
            vec3 nn = normalize(vec3(c / R, sqrt(max(0., 1. - d * d / (R * R)))));
            vec3 L = normalize(vec3(-.6, .35, .7));
            float dl = max(dot(nn, L), 0.);
            vec2 sp = nn.xy / (1.2 + nn.z) * 3. + vec2(uTime * .01, 0.);
            float land = smoothstep(.48, .56, fbm(sp * 1.5));
            vec3 base = mix(vec3(.03, .15, .34), vec3(.22, .36, .16), land);
            float cl = smoothstep(.5, .75, fbm(sp * 2.5 + vec2(uTime * .02, 1.)));
            base = mix(base, vec3(1.), cl * .8);
            col = base * (dl * 1.5 + .02) + vec3(.2, .5, 1.) * pow(1. - nn.z, 3.) * (.3 + dl);
          } else col += vec3(.2, .45, 1.) * exp(-(d - R) * 14.) * .5;
        } else {
          vec2 q = p; float ang = atan(q.y, q.x), rad = length(q);
          col = vec3(0.);
          for (int L = 0; L < 3; L++) {
            float sc = 60. + float(L) * 40.;
            float a = ang * sc / 6.283;
            vec2 id = vec2(floor(a), float(L));
            float r = h(id);
            float z = fract(uTime * (0.4 + r * 0.8) + r * 7.);
            float rr = z * z * 1.6;
            float streak = smoothstep(.05 + z * .35, 0., abs(rad - rr)) * step(.7, r) * z;
            col += vec3(.6, .8, 1.) * streak * 2.;
          }
          col += vec3(.1, .2, .6) * exp(-rad * 3.) * .8;
        }
        float v = smoothstep(.0, .06, uv.x) * smoothstep(1., .94, uv.x) * smoothstep(.0, .08, uv.y) * smoothstep(1., .92, uv.y);
        gl_FragColor = vec4(col * v * 1.3, 1.);
      }`,
  });
  return m;
}

function station(ctx, phi, kind, seed) {
  const { kit, M } = ctx;
  const [x, z] = polar(phi * D2R, 6.4);
  const ry = -phi * D2R;
  const tops = { eng: M.consoleGold, sci: M.consoleBlue, com: M.consoleRed, wep: M.consoleRed, sys: M.consoleBlue, lib: M.consoleGold };
  consoleUnit(kit, { x, z, rot: ry, w: kind === 'eng' ? 2.4 : 1.7, d: 0.8, screens: kind === 'eng' ? 3 : 2, top: tops[kind], seed, hood: kind === 'sci', height: kind === 'sci' ? 1.05 : 0.9 });
  const [cx, cz] = polar(phi * D2R, 5.4);
  chair(kit, cx, cz, ry + Math.PI, kind === 'sci' ? M.chairBlue : kind === 'com' ? M.chairRed : M.chairOrange, 'arm');
}

export function buildBridge(ctx) {
  const { kit, M, world } = ctx;
  const rng = makeRng(555);
  M.viewscreen = viewscreenMaterial();
  kit.push(0, BY, 0, 0);

  // ---- 地面、圈层 ----
  kit.cyl(M.floor, [0, -0.06, 0], BR + 0.4, 0.12, { seg: 64 });
  kit.floorDisc(0, 0, BR + 0.3, 0);
  kit.geo(M.floorRed, new THREE.RingGeometry(4.8, BR, 64), [0, 0.014, 0], [-Math.PI / 2, 0, 0]);
  for (const r of [5.1, 6.1, 7.0]) kit.geo(M.gold, new THREE.RingGeometry(r - 0.03, r + 0.03, 96), [0, 0.03, 0], [-Math.PI / 2, 0, 0]);
  // 中央台阶（同心圆）
  const tiers = [[4.6, 0.15], [4.2, 0.3], [3.8, 0.45]];
  for (const [r, y] of tiers) {
    kit.cyl(M.consoleDark, [0, y / 2, 0], r, y, { seg: 64 });
    kit.cyl(M.floorLight, [0, y + 0.005, 0], r - 0.06, 0.012, { seg: 64 });
    kit.floorDisc(0, 0, r, y);
  }
  kit.geo(M.gold, new THREE.RingGeometry(1.7, 1.8, 64), [0, 0.463, 0], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) kit.box(M.gold, [Math.sin(i * 0.5236) * 2.8, 0.462, Math.cos(i * 0.5236) * 2.8], [0.05, 0.01, 1.6], [0, i * 0.5236, 0]);

  // ---- 墙体：24 边形 ----
  const N = 24;
  const hl = BR * Math.tan(Math.PI / N);
  for (let k = 0; k < N; k++) {
    const phi = (k * 2 * Math.PI) / N;
    const c = polar(phi, BR);
    const t = [Math.cos(phi), Math.sin(phi)];
    const A = [c[0] - t[0] * hl, c[1] - t[1] * hl], B = [c[0] + t[0] * hl, c[1] + t[1] * hl];
    const aft = k === 11 || k === 13;
    const doors = aft ? [{ t: hl, w: 1.7, type: 'lift', radius: 2.6, accent: 0xd8a830 }] : [];
    wallSeg(kit, A[0], A[1], B[0], B[1], { mat: M.wallDark, mat2: M.wallDark, trim: M.consoleRed, h: BH, ext: 0.25, doors, doorH: 2.2, base: true });
  }
  // 电梯竖井（小凹槽）
  for (const k of [11, 13]) {
    const phi = (k * 2 * Math.PI) / N;
    const c = polar(phi, BR);
    kit.push(c[0], 0, c[1], Math.PI - phi);
    const o = { mat: M.wall, mat2: M.plastic, trim: null, h: BH, y0: 0 };
    wallSeg(kit, -0.85, 0.15, -0.85, 1.8, o);
    wallSeg(kit, -0.85, 1.8, 0.85, 1.8, o);
    wallSeg(kit, 0.85, 1.8, 0.85, 0.15, o);
    kit.box(M.plate, [0, 0.012, 0.95], [1.7, 0.024, 1.65]);
    kit.box(M.panelWarm, [0, BH - 0.04, 0.95], [1.0, 0.03, 0.8]);
    kit.light(0, BH - 1.1, 0.95, 0xfff0d8, 10, 5);
    kit.pop();
  }
  {
    const phi = (11 * 2 * Math.PI) / N;
    const c = polar(phi, BR);
    kit.push(c[0], 0, c[1], Math.PI - phi);
    kit.interact(0, 1.0, 0.9, 2.4, '涡轮电梯 · 选择目的地', () => ctx.ui.openLift('bridge'));
    kit.interact(0, 1.0, -1.4, 2.0, '呼叫涡轮电梯', () => ctx.ui.openLift('bridge'));
    kit.pop();
  }

  // ---- 穹顶天花 ----
  const dome = [[0, BH + 1.4], [2.2, BH + 1.32], [4.4, BH + 1.0], [6.2, BH + 0.5], [BR + 0.2, BH]];
  kit.geo(M.ceiling, latheGeo(dome, 64), [0, 0, 0]);
  for (const [r, yy] of [[2.8, BH + 1.22], [5.0, BH + 0.84]]) kit.geo(M.panel, new THREE.RingGeometry(r, r + 0.3, 64), [0, yy - 0.02, 0], [Math.PI / 2, 0, 0]);
  kit.cyl(M.panel, [0, BH + 1.36, 0], 1.3, 0.05, { seg: 32 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    kit.cyl(M.steelDark, [Math.sin(a) * 5.6, BH + 0.66, Math.cos(a) * 5.6], 0.2, 0.12, { seg: 12 });
    kit.cyl(M.panelWarm, [Math.sin(a) * 5.6, BH + 0.59, Math.cos(a) * 5.6], 0.14, 0.03, { seg: 12 });
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    kit.box(M.steelDark, [Math.sin(a) * (BR - 0.15), BH - 0.08, Math.cos(a) * (BR - 0.15)], [0.3, 0.16, 0.25], [0, a, 0]);
  }
  for (let i = 0; i < 3; i++) kit.light(Math.sin(i * 2.094) * 3, BH - 0.7, Math.cos(i * 2.094) * 3, 0xfff0dc, 7, 11);
  for (let i = 0; i < 6; i++) kit.light(Math.sin(i * 1.0472) * 5, BH - 1.0, Math.cos(i * 1.0472) * 5, 0xffeedd, 7, 9);

  // ---- 主观景屏（贴合圆弧墙的弧面）----
  {
    const vr = BR - 0.16, ang = 0.86, y0 = 0.5, hgt = 1.85;
    const back = (m) => { const c = m.clone(); c.side = THREE.BackSide; return c; };
    M.viewscreen.side = THREE.BackSide;
    const arc = (r, h, y, mat) => kit.geo(mat, new THREE.CylinderGeometry(r, r, h, 24, 1, true, Math.PI - ang / 2, ang), [0, y, 0]);
    arc(vr, hgt, y0 + hgt / 2, M.viewscreen);
    if (!M._vsBack) M._vsBack = { gold: back(M.consoleGold), dark: back(M.steelDark) };
    arc(vr + 0.03, 0.12, y0 + hgt + 0.06, M._vsBack.gold);
    arc(vr + 0.03, 0.12, y0 - 0.06, M._vsBack.gold);
    arc(vr + 0.06, hgt + 0.3, y0 + hgt / 2, M._vsBack.dark);
    for (const s of [-1, 1]) {
      const a = s * ang / 2;
      const [x, z] = polar(a, vr - 0.02);
      kit.box(M.consoleGold, [x, y0 + hgt / 2, z], [0.14, hgt + 0.24, 0.14], [0, -a, 0]);
    }
    // 下沿状态灯带
    for (let i = 0; i < 24; i++) {
      const a = (-ang / 2 + (i + 0.5) * (ang / 24));
      const [x, z] = polar(a, vr - 0.12);
      kit.box(i % 3 ? M.lampAmber : M.lampGreen, [x, 0.3, z], [0.08, 0.04, 0.03], [0, -a, 0]);
    }
    kit.box(M.consoleDark, [0, 0.16, -vr + 0.2], [0.01, 0.01, 0.01]);
    kit.light(0, 1.6, -6.4, 0x88aaff, 12, 9);
    sign(kit, ['USS ENTERPRISE', 'NCC-1701'], [polar(0.62, vr - 0.03)[0], 1.7, polar(0.62, vr - 0.03)[1]], -0.62, [1.3, 0.34], { size: 46, accent: '#ffcc66' });
  }

  // ---- 舵手 / 领航 ----
  consoleUnit(kit, { x: 0, z: -3.2, rot: 0, w: 2.6, d: 0.95, screens: 3, top: M.consoleGold, seed: 3, kinds: ['chart', 'scope', 'ship', 'bars'] });
  chair(kit, -0.7, -2.35, Math.PI, M.chairOrange, 'arm');
  chair(kit, 0.7, -2.35, Math.PI, M.chairOrange, 'arm');
  kit.light(0, 1.6, -3.0, 0xfff2e0, 14, 7);

  // ---- 船长椅 ----
  captainChair(kit, 0, 0.35, Math.PI);
  kit.push(0, 0.45, 0.35, Math.PI);
  kit.pop();
  kit.interact(0, 1.0, 1.0, 1.9, '舰长椅 · 切换观景屏（轨道 / 曲速）', () => {
    const v = M.viewscreen.uniforms.uMode;
    v.value = (v.value + 1) % 2;
    ctx.ui.toast(v.value ? '观景屏：曲速航行' : '观景屏：行星轨道');
  });

  // ---- 环周站位 ----
  station(ctx, 48, 'wep', 1);
  station(ctx, -48, 'sys', 2);
  station(ctx, 100, 'eng', 4);
  station(ctx, 128, 'com', 6);
  station(ctx, 232, 'sci', 8);
  station(ctx, 260, 'lib', 10);
  station(ctx, 78, 'sys', 12);
  station(ctx, -78, 'wep', 14);
  // 后部栏杆
  for (let i = 0; i <= 14; i++) {
    const a = (100 + i * 10) * D2R;
    const [x, z] = polar(a, 4.85);
    kit.cyl(M.railRed, [x, 0.6, z], 0.05, 1.05, { seg: 8 });
    if (i < 14) {
      const [x2, z2] = polar((100 + (i + 1) * 10) * D2R, 4.85);
      kit.beam(M.railRed, [x, 1.1, z], [x2, 1.1, z2], 0.045);
      kit.beam(M.railRed, [x, 0.7, z], [x2, 0.7, z2], 0.03);
      kit.push((x + x2) / 2, 0, (z + z2) / 2, Math.atan2(-(z2 - z), x2 - x));
      kit.wall(0, 0, Math.hypot(x2 - x, z2 - z) / 2 + 0.05, 0.06, 0, 1.2);
      kit.pop();
    }
  }
  // ---- 墙面装饰：壁灯、面板 ----
  for (let k = 0; k < 24; k++) {
    if (k === 11 || k === 13) continue;
    const phi = (k * 2 * Math.PI) / N;
    const c = polar(phi, BR - 0.17);
    kit.push(c[0], 0, c[1], Math.PI - phi);
    kit.box(M.panelWarm, [0, 1.85, 0.02], [0.05, 0.5, 0.02]);
    kit.box(M.steelDark, [0.7, 1.75, 0.03], [0.6, 0.06, 0.04]);
    kit.box(M.steelDark, [-0.7, 1.75, 0.03], [0.6, 0.06, 0.04]);
    if (k % 2) wallScreen(kit, ['scope', 'chart', 'bars', 'ship', 'text'][k % 5], k, 0, 1.55, 0.05, 0, 0.9, 0.5);
    else { vent(kit, 0, 1.6, 0.03, 0, 0.8, 0.4); }
    kit.pop();
  }
  plant(kit, -5.6, 2.2, 1.0);
  kit.zone('舰桥', '第 1 层', 0, 0, 9, 9, 0, 6);
  const sp = kit.toWorld(0, 0, 5.4);
  world.spawns.bridge = { x: sp.x, y: BY, z: sp.z, yaw: 0 };
  kit.pop();
}
