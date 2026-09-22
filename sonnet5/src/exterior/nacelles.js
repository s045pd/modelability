import * as THREE from 'three';
import { latheGeo, loftGeo, superSection } from '../core/geom.js';
import { makeRng } from '../core/rng.js';
import { TIME } from '../core/materials.js';
import { NAC, NAC_PROFILE, nacR } from './dims.js';

// ---- 动态材质 ----
function bussardMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: TIME },
    transparent: false,
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; uniform float uTime;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float a = atan(vP.y, vP.x);
        float r = length(vP.xy) / 5.4;
        float t = uTime;
        float spiral = sin(a * 4.0 + r * 9.0 - t * 3.4) * 0.5 + 0.5;
        float spiral2 = sin(a * 7.0 - r * 14.0 + t * 2.1) * 0.5 + 0.5;
        float nz = n(vec2(a * 3.0 + t * 0.7, r * 6.0 - t * 1.6));
        float core = smoothstep(0.55, 0.0, r);
        float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 1.4);
        vec3 c = mix(vec3(0.45, 0.01, 0.0), vec3(2.6, 0.22, 0.05), spiral * 0.6 + spiral2 * 0.25 + nz * 0.35);
        c += vec3(2.6, 0.9, 0.3) * core * (0.6 + 0.4 * sin(t * 6.0));
        c *= 0.55 + 0.6 * f;
        c += vec3(0.6, 0.04, 0.02) * (1.0 - f);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

function grilleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: TIME },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){
        float along = vUv.y;
        float ribs = smoothstep(0.35, 0.5, abs(fract(along * 0.9) - 0.5) * 2.0);
        float pulse = pow(0.5 + 0.5 * sin(along * 0.42 - uTime * 3.2), 3.0);
        float pulse2 = pow(0.5 + 0.5 * sin(along * 0.9 - uTime * 5.0 + 1.3), 6.0);
        float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
        vec3 base = vec3(0.04, 0.16, 0.5);
        vec3 c = base * (0.6 + ribs * 0.6) + vec3(0.5, 1.6, 3.6) * pulse * 0.7 + vec3(1.6, 2.4, 3.8) * pulse2 * 0.5;
        gl_FragColor = vec4(c * edge, 1.0);
      }`,
  });
}

export function makeNacelleMaterials() {
  return { bussard: bussardMaterial(), grille: grilleMaterial() };
}

// ---- 曲速舱（局部：轴向 = +z，舱首在 z=0） ----
export function buildNacelle(kit, M, FX, side) {
  const rng = makeRng(side > 0 ? 88 : 89);
  kit.push(side * NAC.x, NAC.y, NAC.z0, 0);
  const axial = (ax) => [0, 0, ax];
  const rot = [Math.PI / 2, 0, 0];
  kit.geo(M.hull, latheGeo(NAC_PROFILE, 72), [0, 0, 0], rot);

  // 布萨德集电罩
  const dome = new THREE.SphereGeometry(1, 56, 36, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.rotateX(-Math.PI / 2);
  kit.geo(FX.bussard, dome, [0, 0, 5.7], [0, 0, 0], [5.4, 5.4, 5.0]);
  kit.torus(M.gold, [0, 0, 5.75], 5.42, 0.24, { seg: 64 });
  kit.torus(M.steelDark, [0, 0, 6.6], 5.5, 0.16, { seg: 64 });
  kit.torus(M.lampRed, [0, 0, 5.55], 5.2, 0.06, { seg: 64, ts: 4 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    kit.beam(M.gold, [Math.cos(a) * 5.4, Math.sin(a) * 5.4, 5.8], [Math.cos(a) * 5.55, Math.sin(a) * 5.55, 7.4], 0.07);
  }

  // 舱身分段环与铠板
  const ringZ = [];
  for (let z = 22; z < 132; z += 9.5) ringZ.push(z);
  ringZ.forEach((z, i) => {
    kit.torus(i % 3 === 0 ? M.gold : M.steelDark, [0, 0, z], nacR(z) + 0.02, i % 3 === 0 ? 0.11 : 0.09, { seg: 64, ts: 6 });
    kit.torus(M.stripLight, [0, 0, z + 0.55], nacR(z + 0.55) + 0.02, 0.05, { seg: 64, ts: 4 });
  });
  for (let z = 20; z < 128; z += 3.1) {
    for (let k = 0; k < 24; k++) {
      if (rng() < 0.55) continue;
      const a = (k / 24) * Math.PI * 2;
      if (Math.abs(Math.cos(a)) > 0.7 && z > 34 && z < 124) continue; // 让出栅格
      const r = nacR(z) + 0.03;
      kit.box(rng() < 0.85 ? M.stripDark : M.stripLight, [Math.sin(a) * r, Math.cos(a) * r, z], [0.05, 0.03, 2.4], [0, 0, -a]);
    }
  }

  // 曲速线圈栅格：内外两侧
  for (const sx of [-1, 1]) {
    const a0 = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    const pts = [];
    for (let z = 34; z <= 124; z += 3) pts.push([nacR(z) + 0.06, z]);
    // 侧向条带：lathe 的 φ 由 x=r*sin(φ) 起算，取 ±38° 弧
    const strip = latheGeo(pts, 24, { phiStart: (sx > 0 ? Math.PI / 2 : -Math.PI / 2) - 0.68, phiLength: 1.36 });
    kit.geo(FX.grille, strip, [0, 0, 0], rot);
    for (let z = 36; z < 124; z += 2.4) {
      const r = nacR(z);
      kit.box(M.steelDark, [sx * (r + 0.09), 0, z], [0.14, 2.6 * (r / 5.5) * 0.98, 0.16]);
    }
    kit.box(M.gold, [sx * (nacR(34) + 0.12), 0, 33.6], [0.18, 3.4, 0.4]);
    kit.box(M.gold, [sx * (nacR(124) + 0.12), 0, 124.4], [0.18, 3.0, 0.4]);
    // 栅格上下边框
    for (const sy of [-1, 1]) for (let z = 34; z < 124; z += 6) {
      const r = nacR(z);
      kit.box(M.steel, [sx * (r * Math.cos(0.72) + 0.06), sy * r * Math.sin(0.72), z + 3], [0.12, 0.12, 6]);
    }
  }

  // 前部舷窗、舱首标识
  for (let z = 17; z < 32; z += 1.6) for (let k = 0; k < 2; k++) {
    if (rng() < 0.2) continue;
    const a = (k === 0 ? 1 : -1) * 1.25;
    const r = nacR(z) + 0.04;
    kit.box(rng() < 0.7 ? M.winWarm : M.winCool, [Math.sin(a) * r, Math.cos(a) * r, z], [0.05, 0.2, 0.55], [0, 0, -a]);
  }

  // 尾部：锥形排气盖
  kit.sph(M.lampBlue, [0, 0, 138.4], 2.1, { ws: 24, hs: 12, s: [1, 1, 0.55] });
  kit.torus(M.gold, [0, 0, 137.5], 3.1, 0.14, { seg: 48 });
  kit.torus(M.steelDark, [0, 0, 134], 3.9, 0.12, { seg: 48 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.box(M.lampCyan, [Math.cos(a) * 2.6, Math.sin(a) * 2.6, 137.0], [0.1, 0.5, 0.9], [0, 0, a]);
  }
  kit.sph(M.strobe, [0, nacR(136) + 0.3, 136], 0.2, { ws: 8, hs: 6 });
  // 顶部/底部导航灯
  kit.sph(side > 0 ? M.navGreen : M.navRed, [0, 0, 6.6], 0.0001);
  kit.sph(M.lampWhite, [0, nacR(60) + 0.25, 60], 0.2, { ws: 8, hs: 6 });
  kit.pop();
}

// ---- 挂架 ----
export function buildPylon(kit, M, side) {
  const P = [
    { c: [6.4, -33, 114], hl: 18, ht: 2.2 },
    { c: [13.2, -20, 120], hl: 14.5, ht: 1.5 },
    { c: [21, -7, 130], hl: 14, ht: 1.3 },
    { c: [27.5, 1.5, 141], hl: 16.5, ht: 1.7 },
    { c: [30, 5.2, 148], hl: 21, ht: 2.2 },
  ];
  const secs = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)].c, b = P[Math.min(P.length - 1, i + 1)].c;
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize();
    const n = new THREE.Vector3(-d.y, d.x, 0);
    const c = new THREE.Vector3(side * P[i].c[0], P[i].c[1], P[i].c[2]);
    const nn = new THREE.Vector3(side * n.x, n.y, 0);
    secs.push(superSection(c, new THREE.Vector3(0, 0, 1), nn, P[i].hl, P[i].ht, 3.2, 56));
  }
  kit.geo(M.hull, loftGeo(secs, { capStart: false, capEnd: false }));

  const rng = makeRng(side > 0 ? 501 : 502);
  // 挂架两面：舷窗行与格栅
  for (let i = 1; i < P.length - 1; i++) {
    const p = P[i];
    const prev = P[i - 1].c, next = P[i + 1].c;
    const d = new THREE.Vector3(next[0] - prev[0], next[1] - prev[1], 0).normalize();
    const n = new THREE.Vector3(-d.y, d.x, 0);
    for (const face of [-1, 1]) {
      for (let zz = -0.6; zz <= 0.6; zz += 0.12) {
        if (rng() < 0.3) continue;
        const z = p.c[2] + zz * p.hl;
        const off = p.ht * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(zz), 3.2)), 1 / 3.2) + 0.04;
        const pos = new THREE.Vector3(side * p.c[0], p.c[1], z).addScaledVector(new THREE.Vector3(side * n.x, n.y, 0), face * off);
        kit.box(rng() < 0.7 ? M.winWarm : M.winCool, [pos.x, pos.y, pos.z], [0.2, 0.2, 0.5], [0, 0, Math.atan2(-side * n.x * face, n.y * face)]);
      }
    }
  }
  // 结构加强筋与前缘灯
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    kit.beam(M.steelDark, [side * a.c[0], a.c[1], a.c[2] - a.hl + 0.3], [side * b.c[0], b.c[1], b.c[2] - b.hl + 0.3], 0.22);
    kit.beam(M.stripBlue, [side * a.c[0], a.c[1], a.c[2] + a.hl - 0.3], [side * b.c[0], b.c[1], b.c[2] + b.hl - 0.3], 0.18);
  }
}
