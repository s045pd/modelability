import * as THREE from 'three';
import { makeHullTextures, makeWallTextures, makeFloorTextures, makeCeilingTextures, makePlateTextures, makeGrateTextures } from './textures.js';

export const TIME = { value: 0 };

const TRI_KEY = 'triplanar-v1';

// 世界坐标三平面投影：无需 UV，任意几何都能获得一致的板缝尺度
function triplanar(mat, { albedo, height, tile = 8, bump = 1.5, local = false }) {
  mat.userData.tri = true;
  mat.customProgramCacheKey = () => TRI_KEY + (local ? 'L' : 'W');
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTriMap = { value: albedo };
    shader.uniforms.uTriH = { value: height };
    shader.uniforms.uTriScale = { value: 1 / tile };
    shader.uniforms.uTriBump = { value: bump };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTPos;\nvarying vec3 vTNor;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vTPos = ${local ? 'position' : '(modelMatrix * vec4(transformed, 1.0)).xyz'};
        vTNor = ${local ? 'objectNormal' : 'normalize(mat3(modelMatrix) * objectNormal)'};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uTriMap; uniform sampler2D uTriH; uniform float uTriScale; uniform float uTriBump;
        varying vec3 vTPos; varying vec3 vTNor;
        vec3 triWeights() { vec3 w = pow(abs(normalize(vTNor)), vec3(8.0)); return w / (w.x + w.y + w.z); }
        vec4 triSample(sampler2D t, vec3 p, vec3 w) {
          p *= uTriScale;
          return texture2D(t, p.zy) * w.x + texture2D(t, p.xz) * w.y + texture2D(t, p.xy) * w.z;
        }
        vec3 triPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
          vec3 sx = normalize(dFdx(surfPos)), sy = normalize(dFdy(surfPos));
          vec3 R1 = cross(sy, surfNorm), R2 = cross(surfNorm, sx);
          float fDet = dot(sx, R1) * faceDir;
          vec3 grad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
          return normalize(abs(fDet) * surfNorm - grad);
        }`)
      .replace('#include <map_fragment>', `vec3 triW = triWeights();
        diffuseColor *= triSample(uTriMap, vTPos, triW);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float hh = triSample(uTriH, vTPos, triW).r;
          vec2 dH = vec2(dFdx(hh), dFdy(hh)) * uTriBump;
          normal = triPerturb(-vViewPosition, normal, dH, faceDirection);
        }`);
  };
  mat.needsUpdate = true;
  return mat;
}

const std = (o) => new THREE.MeshStandardMaterial(o);
const basic = (r, g, b, o = {}) => {
  const m = new THREE.MeshBasicMaterial({ toneMapped: true, ...o });
  m.color.setRGB(r, g, b);
  m.userData.noShadow = true;
  return m;
};

export function createMaterials() {
  const M = {};
  const hull = makeHullTextures(2048, 1701);
  const wall = makeWallTextures(7);
  const floor = makeFloorTextures(11);
  const ceil = makeCeilingTextures(13);
  const plate = makePlateTextures(17);
  const grate = makeGrateTextures();
  M.tex = { hull, wall, floor, ceil, plate, grate };

  const hullTri = (color, rough = 0.42, metal = 0.5, tile = 22, bump = 1.6) =>
    triplanar(std({ color, roughness: rough, metalness: metal, shadowSide: THREE.FrontSide }), { ...hull, tile, bump });

  M.hull = hullTri(0xffffff);
  M.hullDark = hullTri(0x7d838b, 0.5, 0.45);
  M.hullBlack = hullTri(0x2c3036, 0.55, 0.4, 14);
  M.hullWarm = hullTri(0xe8dcc6, 0.45, 0.4);
  M.hullBlue = hullTri(0x7f9bc0, 0.4, 0.5);
  M.hullRed = hullTri(0xc0473b, 0.5, 0.4);

  const strip = (color, rough = 0.5, metal = 0.5) => {
    const m = hullTri(color, rough, metal, 22, 0.8);
    m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2;
    return m;
  };
  M.stripDark = strip(0x3d424a);
  M.stripMid = strip(0x8a9098);
  M.stripLight = strip(0xf2f2ee, 0.4, 0.4);
  M.stripBlue = strip(0x3f6aa8, 0.45, 0.4);
  M.stripRed = strip(0xa8362c, 0.5, 0.4);
  M.stripGold = strip(0xb8924a, 0.4, 0.7);

  M.gold = std({ color: 0xc79b4a, roughness: 0.3, metalness: 0.9, shadowSide: THREE.FrontSide });
  M.copper = std({ color: 0xb46f45, roughness: 0.35, metalness: 0.9, shadowSide: THREE.FrontSide });
  M.steel = std({ color: 0x9aa1aa, roughness: 0.35, metalness: 0.85, shadowSide: THREE.FrontSide });
  M.steelDark = std({ color: 0x3a3f47, roughness: 0.4, metalness: 0.8, shadowSide: THREE.FrontSide });
  M.rubber = std({ color: 0x15171a, roughness: 0.85, metalness: 0.05 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x8fb4d0, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.22, depthWrite: false });
  M.glass.userData.noShadow = true;

  // 自发光
  M.winWarm = basic(2.6, 2.0, 1.1);
  M.winCool = basic(1.5, 2.1, 2.8);
  M.winOff = basic(0.05, 0.06, 0.08);
  M.lampWhite = basic(3.2, 3.2, 3.0);
  M.lampWarm = basic(2.8, 2.2, 1.4);
  M.lampRed = basic(3.2, 0.25, 0.15);
  M.lampGreen = basic(0.3, 3.0, 0.5);
  M.lampAmber = basic(3.2, 1.6, 0.2);
  M.lampBlue = basic(0.5, 1.3, 3.4);
  M.lampCyan = basic(0.4, 2.6, 3.0);
  M.lampVC = basic(1, 1, 1, { vertexColors: true });
  M.panel = basic(1.0, 1.0, 0.94);
  M.panelWarm = basic(1.1, 0.86, 0.52);
  M.panelCool = basic(0.9, 1.3, 1.7);
  M.impulse = basic(4.0, 1.0, 0.25);

  // 闪烁灯
  M.blink = [];
  const blinkColors = [[3.4, 0.3, 0.2], [0.3, 3.0, 0.5], [3.2, 2.4, 0.4], [0.5, 1.6, 3.4], [3, 3, 3]];
  for (let i = 0; i < blinkColors.length * 2; i++) {
    const c = blinkColors[i % blinkColors.length];
    const m = basic(...c);
    m.userData.blink = { base: c, f: 1.1 + (i * 0.37) % 2.6, ph: i * 1.7, duty: 0.5 };
    M.blink.push(m);
  }
  M.navRed = basic(3.6, 0.15, 0.1); M.navRed.userData.blink = { base: [3.6, 0.15, 0.1], f: 0.9, ph: 0, duty: 0.55 };
  M.navGreen = basic(0.15, 3.4, 0.35); M.navGreen.userData.blink = { base: [0.15, 3.4, 0.35], f: 0.9, ph: 0, duty: 0.55 };
  M.strobe = basic(4, 4, 4.2); M.strobe.userData.blink = { base: [4, 4, 4.2], f: 0.7, ph: 0.3, duty: 0.08 };
  M.blink.push(M.navRed, M.navGreen, M.strobe);

  // 舰内
  const wallTri = (color, rough = 0.75) => triplanar(std({ color, roughness: rough, metalness: 0.05 }), { ...wall, tile: 3, bump: 1.0 });
  M.wall = wallTri(0xffffff);
  M.wallWarm = wallTri(0xf0e2c4);
  M.wallBlue = wallTri(0xa9c3e6);
  M.wallGreen = wallTri(0xb6d6bf);
  M.wallDark = wallTri(0x8a8f99);
  M.wallRed = wallTri(0xe0a094);
  const fl = (seed, base, rough = 0.6, bump = 0.8) => triplanar(std({ color: 0xffffff, roughness: rough, metalness: 0.05 }), { ...makeFloorTextures(seed, base), tile: 2, bump });
  M.floor = fl(11, [70, 72, 80], 0.5, 1.0);
  M.floorRed = fl(21, [138, 66, 58], 0.8);
  M.floorBlue = fl(22, [66, 96, 144], 0.7);
  M.floorLight = fl(23, [186, 180, 166], 0.6);
  M.ceiling = triplanar(std({ color: 0xc4c4be, roughness: 0.9, metalness: 0 }), { ...ceil, tile: 2.4, bump: 0.8 });
  M.plate = triplanar(std({ color: 0xffffff, roughness: 0.6, metalness: 0.35 }), { ...plate, tile: 3, bump: 2.0 });
  M.grate = triplanar(std({ color: 0xffffff, roughness: 0.5, metalness: 0.8 }), { ...grate, tile: 1.5, bump: 2.0 });

  // 家具/设备
  M.chairOrange = std({ color: 0xd2661f, roughness: 0.6, metalness: 0 });
  M.chairBlue = std({ color: 0x2f5da0, roughness: 0.6, metalness: 0 });
  M.chairRed = std({ color: 0xb8322a, roughness: 0.6, metalness: 0 });
  M.chairGold = std({ color: 0xd0a028, roughness: 0.6, metalness: 0 });
  M.leather = std({ color: 0x2a201a, roughness: 0.5, metalness: 0 });
  M.wood = std({ color: 0x6a4a30, roughness: 0.55, metalness: 0 });
  M.woodLight = std({ color: 0xa47c50, roughness: 0.5, metalness: 0 });
  M.plastic = std({ color: 0xe6e6e0, roughness: 0.5, metalness: 0 });
  M.plasticGrey = std({ color: 0x8c9098, roughness: 0.5, metalness: 0.1 });
  M.console = std({ color: 0x59636f, roughness: 0.55, metalness: 0.3 });
  M.consoleDark = std({ color: 0x252a32, roughness: 0.5, metalness: 0.3 });
  M.consoleBlue = std({ color: 0x2c4a78, roughness: 0.5, metalness: 0.25 });
  M.consoleRed = std({ color: 0x8a2d28, roughness: 0.5, metalness: 0.25 });
  M.consoleGold = std({ color: 0x9c7a26, roughness: 0.45, metalness: 0.3 });
  M.railRed = std({ color: 0xa8261e, roughness: 0.35, metalness: 0.4 });
  M.fabricBlue = std({ color: 0x3a5f96, roughness: 0.9, metalness: 0 });
  M.fabricRed = std({ color: 0xa63a30, roughness: 0.9, metalness: 0 });
  M.bedWhite = std({ color: 0xf0efe8, roughness: 0.95, metalness: 0 });
  M.leaf = std({ color: 0x3f7d3a, roughness: 0.8, metalness: 0 });
  M.soil = std({ color: 0x3a2a1c, roughness: 1, metalness: 0 });
  M.tube = std({ color: 0x8b9199, roughness: 0.35, metalness: 0.85 });
  M.pipeRed = std({ color: 0xb03020, roughness: 0.45, metalness: 0.5 });
  M.pipeBlue = std({ color: 0x2a5aa8, roughness: 0.45, metalness: 0.5 });
  M.pipeYellow = std({ color: 0xd4a820, roughness: 0.45, metalness: 0.5 });
  M.doorMat = std({ color: 0xffffff, roughness: 0.45, metalness: 0.25, vertexColors: true });
  M.hazard = std({ color: 0xd4a010, roughness: 0.6, metalness: 0.2 });
  M.core = basic(0.4, 1.6, 3.6);
  M.coreRed = basic(3.4, 0.35, 0.15);
  M.forcefield = new THREE.ShaderMaterial({
    uniforms: { uTime: TIME },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){
        float s = 0.5 + 0.5 * sin(vUv.y * 120.0 - uTime * 2.5);
        float w = 0.5 + 0.5 * sin((vUv.x + vUv.y * 0.5) * 40.0 + uTime * 1.3);
        float e = smoothstep(0.0, 0.05, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
        float a = 0.035 + 0.03 * s * w + (1.0 - e) * 0.25;
        gl_FragColor = vec4(vec3(0.25, 0.7, 1.6), a);
      }`,
  });
  M.forcefield.userData.noShadow = true;
  return M;
}

// 每帧驱动闪烁灯
export function updateBlink(M, t) {
  for (const m of M.blink) {
    const b = m.userData.blink;
    const on = ((t * b.f + b.ph) % 1) < b.duty;
    const k = on ? 1 : 0.12;
    m.color.setRGB(b.base[0] * k, b.base[1] * k, b.base[2] * k);
  }
}
