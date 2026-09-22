import * as THREE from 'three';
import { hullSurface, bulkheadSurface, gratingSurface, carpetSurface, lcarsPanel } from './textures.js';

const animated = [];
export function tickMaterials(elapsed) {
  for (const m of animated) m.uniforms.uTime.value = elapsed;
}

function registerAnimated(mat) { animated.push(mat); return mat; }

const NOISE = /* glsl */`
  vec3 hash3(vec3 p){
    p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
  }
  float noise(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p);
    vec3 u = f*f*(3.0-2.0*f);
    return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)), dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                   mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)), dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
               mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)), dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                   mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)), dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
  }
  float fbm(vec3 p){
    float s = 0.0, a = 0.5;
    for(int i=0;i<5;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; }
    return s;
  }
`;

/** 巴萨德收集器：旋转的红橙等离子漩涡。 */
export function bussardMaterial() {
  return registerAnimated(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vPos; varying vec3 vNormal;
      void main(){ vPos = position; vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec3 vPos; varying vec3 vNormal;
      ${NOISE}
      void main(){
        vec3 p = normalize(vPos);
        float ang = atan(p.y, p.x);
        float rad = length(p.xy);
        float swirl = ang * 2.0 + uTime * 1.35 - rad * 5.0;
        float n = fbm(vec3(cos(swirl), sin(swirl), p.z * 2.4) * 2.2 + uTime * 0.28);
        float core = smoothstep(0.85, 0.0, rad);
        float band = 0.5 + 0.5 * sin(swirl * 3.0 + n * 6.0);
        vec3 hot = vec3(1.0, 0.86, 0.62);
        vec3 mid = vec3(1.0, 0.36, 0.10);
        vec3 deep = vec3(0.45, 0.04, 0.02);
        vec3 col = mix(deep, mid, band) + hot * pow(max(core, 0.0), 2.4) * 1.5;
        col += mid * n * 0.55;
        float rim = pow(max(0.0, 1.0 - abs(dot(normalize(vNormal), vec3(0.0,0.0,1.0)))), 2.0);
        col += vec3(1.0,0.5,0.2) * rim * 0.4;
        gl_FragColor = vec4(col * 1.35, 1.0);
      }
    `,
  }));
}

/** 曲速线圈栅格：流动的蓝色脉冲。 */
export function warpGrilleMaterial({ speed = 0.55, tint = new THREE.Color(0.35, 0.62, 1.0) } = {}) {
  return registerAnimated(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSpeed: { value: speed }, uTint: { value: tint } },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uSpeed; uniform vec3 uTint; varying vec2 vUv;
      ${NOISE}
      void main(){
        float grille = smoothstep(0.42, 0.5, abs(fract(vUv.x * 26.0) - 0.5));
        float flow = fbm(vec3(vUv.x * 7.0, vUv.y * 3.0 - uTime * uSpeed, uTime * 0.2));
        float pulse = 0.55 + 0.45 * sin(uTime * 2.1 + vUv.x * 12.0);
        float edge = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.84, vUv.y);
        float i = max(0.0, (0.42 + flow * 0.9) * pulse * edge);
        vec3 col = uTint * i + vec3(0.75,0.88,1.0) * pow(i, 3.0) * 0.8;
        gl_FragColor = vec4(col, clamp(i * (0.35 + grille * 0.65), 0.0, 1.0));
      }
    `,
  }));
}

/** 曲速核心：竖直流动的等离子柱。 */
export function warpCoreMaterial({ tint = new THREE.Color(0.4, 0.72, 1.0), flow = 1.5 } = {}) {
  return registerAnimated(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTint: { value: tint }, uFlow: { value: flow } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uTint; uniform float uFlow; varying vec2 vUv; varying vec3 vN;
      ${NOISE}
      void main(){
        float y = vUv.y * 6.0 - uTime * uFlow;
        float n = fbm(vec3(vUv.x * 5.0, y, uTime * 0.35));
        float pulse = pow(max(0.0, 0.5 + 0.5 * sin(vUv.y * 22.0 - uTime * 6.0)), 3.0);
        float i = max(0.0, 0.62 + n * 1.15 + pulse * 0.85);
        float rim = pow(max(0.0, 1.0 - abs(normalize(vN).z)), 1.5);
        vec3 col = uTint * i * 1.25 + vec3(0.80,0.92,1.0) * pow(min(i, 1.0), 5.0) * 0.7;
        gl_FragColor = vec4(col, clamp(i * 0.72 + rim * 0.28, 0.0, 1.0));
      }
    `,
  }));
}

/** 主偏导盘。 */
export function deflectorMaterial() {
  return registerAnimated(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying vec3 vP;
      ${NOISE}
      void main(){
        float r = length(vUv - 0.5) * 2.0;
        float rings = 0.5 + 0.5 * sin(r * 46.0 - uTime * 1.1);
        float n = fbm(vec3(vUv * 6.0, uTime * 0.22));
        vec3 amber = vec3(1.0, 0.68, 0.22);
        vec3 blue = vec3(0.35, 0.62, 1.0);
        vec3 col = mix(amber, blue, smoothstep(0.25, 0.95, r + n * 0.18));
        float glow = max(0.0, (1.0 - smoothstep(0.0, 1.05, r)) * (0.55 + rings * 0.45 + n * 0.3));
        gl_FragColor = vec4(col * glow * 2.0, 1.0);
      }
    `,
  }));
}

/** 全息 / 能量屏障。 */
export function forceFieldMaterial(color = new THREE.Color(0.45, 0.7, 1.0)) {
  return registerAnimated(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: color } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float scan = 0.5 + 0.5*sin(vUv.y*120.0 - uTime*3.0);
        float grid = step(0.992, fract(vUv.x*24.0)) + step(0.992, fract(vUv.y*14.0));
        float a = 0.02 + scan*0.018 + grid*0.14;
        gl_FragColor = vec4(uColor*(0.5+scan*0.4), a);
      }`,
  }));
}

/** 主屏幕：缓慢流动的星空 + 行星。 */
export function viewscreenMaterial() {
  return registerAnimated(new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vUv;
      ${NOISE}
      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        vec3 col = vec3(0.004, 0.008, 0.02);
        // 星场
        for (int L = 0; L < 3; L++) {
          float sc = 60.0 + float(L) * 95.0;
          vec2 p = uv * sc + vec2(uTime * (0.6 + float(L) * 0.5), 0.0);
          vec2 id = floor(p);
          vec2 f = fract(p) - 0.5;
          float h = hash(id);
          if (h > 0.90) {
            float d = length(f);
            float b = smoothstep(0.42, 0.0, d) * (0.4 + h * 0.6);
            col += vec3(0.75, 0.85, 1.0) * b * (1.0 - float(L) * 0.22);
          }
        }
        // 远处星云
        float n = fbm(vec3(uv * 3.2, uTime * 0.02));
        col += vec3(0.10, 0.16, 0.34) * max(0.0, n) * 0.55;
        // 行星
        vec2 pc = uv - vec2(0.72, 0.42);
        pc.x *= 2.2;
        float d = length(pc);
        float disc = smoothstep(0.165, 0.158, d);
        float lightSide = smoothstep(0.1, -0.12, pc.x * 0.9 - pc.y * 0.5);
        col = mix(col, vec3(0.22, 0.42, 0.62) * (0.25 + lightSide * 1.25), disc);
        col += vec3(0.3, 0.6, 1.0) * smoothstep(0.178, 0.16, d) * smoothstep(0.155, 0.17, d) * 1.4;
        gl_FragColor = vec4(col * 1.25, 1.0);
      }
    `,
  }));
}

let _lib = null;
const _lcarsMats = new Map();
export function materials() {
  if (_lib) return _lib;
  const hull = hullSurface({ size: 2048, base: '#b2b7c2', seed: 3, contrast: 2.6 });
  const hullDark = hullSurface({ size: 1024, base: '#8d929c', seed: 17, contrast: 2.0 });
  const bulk = bulkheadSurface({ base: '#d3d7de' });
  const bulkWarm = bulkheadSurface({ base: '#b9a898', seed: 44 });
  const grate = gratingSurface();
  const carpet = carpetSurface({ base: '#39404f' });
  const carpetWarm = carpetSurface({ base: '#6b5a4a', seed: 31 });

  _lib = {
    hull: new THREE.MeshStandardMaterial({
      ...hull, color: 0xdfe3ea, metalness: 0.42, roughness: 0.62,
      normalScale: new THREE.Vector2(1.15, 1.15), envMapIntensity: 0.55,
    }),
    hullShell: new THREE.MeshStandardMaterial({
      ...hull, color: 0xd6dae2, metalness: 0.42, roughness: 0.62,
      normalScale: new THREE.Vector2(1.15, 1.15), envMapIntensity: 0.55, side: THREE.FrontSide,
    }),
    hullDark: new THREE.MeshStandardMaterial({
      ...hullDark, color: 0x9aa0ab, metalness: 0.62, roughness: 0.48, envMapIntensity: 0.7,
    }),
    trim: new THREE.MeshStandardMaterial({ color: 0x6d7480, metalness: 0.85, roughness: 0.35, envMapIntensity: 0.9 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x2b2f38, metalness: 0.9, roughness: 0.42 }),
    blackPanel: new THREE.MeshStandardMaterial({ color: 0x0b0d12, metalness: 0.4, roughness: 0.55 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xb6763c, metalness: 0.95, roughness: 0.3 }),
    phaser: new THREE.MeshStandardMaterial({ color: 0x585240, metalness: 0.65, roughness: 0.45 }),
    window: new THREE.MeshBasicMaterial({ color: 0xffe9bd, toneMapped: false }),
    windowDim: new THREE.MeshBasicMaterial({ color: 0x8fb4d8, toneMapped: false }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x0a1626, metalness: 0, roughness: 0.06, transmission: 0.0,
      transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    }),
    lightRed: new THREE.MeshBasicMaterial({ color: 0xff2b1a, toneMapped: false }),
    lightGreen: new THREE.MeshBasicMaterial({ color: 0x26ff5a, toneMapped: false }),
    lightWhite: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    lightBlue: new THREE.MeshBasicMaterial({ color: 0x77c8ff, toneMapped: false }),
    impulse: new THREE.MeshBasicMaterial({ color: 0xff6a2a, toneMapped: false }),

    bulkhead: new THREE.MeshStandardMaterial({ ...bulk, color: 0xe6e9ef, metalness: 0.12, roughness: 0.72, normalScale: new THREE.Vector2(0.5, 0.5) }),
    bulkheadWarm: new THREE.MeshStandardMaterial({ ...bulkWarm, color: 0xe2d5c6, metalness: 0.08, roughness: 0.8, normalScale: new THREE.Vector2(0.4, 0.4) }),
    grating: new THREE.MeshStandardMaterial({ ...grate, color: 0xc3c9d3, metalness: 0.72, roughness: 0.5, normalScale: new THREE.Vector2(0.5, 0.5) }),
    carpet: new THREE.MeshStandardMaterial({ ...carpet, color: 0x99a2b5, metalness: 0, roughness: 0.96, normalScale: new THREE.Vector2(0.35, 0.35) }),
    carpetWarm: new THREE.MeshStandardMaterial({ ...carpetWarm, color: 0xb9a591, metalness: 0, roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xf0f2f6, metalness: 0.05, roughness: 0.85 }),
    lightPanel: new THREE.MeshBasicMaterial({ color: 0x9e937f, toneMapped: false, side: THREE.DoubleSide }),
    lightPanelBright: new THREE.MeshBasicMaterial({ color: 0xd8cdb4, toneMapped: false, side: THREE.DoubleSide }),
    lcarsLit: (seed, w = 512, h = 256, dense = 1) => {
      const key = `${Math.abs(Math.round(seed)) % 14}:${w}x${h}:${dense.toFixed(1)}`;
      let mat = _lcarsMats.get(key);
      if (!mat) {
        mat = new THREE.MeshBasicMaterial({
          map: lcarsPanel({ seed, w, h, dense }), toneMapped: false, side: THREE.DoubleSide,
        });
        _lcarsMats.set(key, mat);
      }
      return mat;
    },

    // —— 舱内构件
    doorFrame: new THREE.MeshStandardMaterial({ color: 0x9c9689, metalness: 0.35, roughness: 0.55 }),
    doorLeaf: new THREE.MeshStandardMaterial({ color: 0xd8d4c8, metalness: 0.25, roughness: 0.42 }),
    doorTrim: new THREE.MeshStandardMaterial({ color: 0x44464d, metalness: 0.6, roughness: 0.4 }),
    consoleBody: new THREE.MeshStandardMaterial({ color: 0x33363d, metalness: 0.45, roughness: 0.5 }),
    trimWarm: new THREE.MeshStandardMaterial({ color: 0xb7a893, metalness: 0.5, roughness: 0.45 }),
    trimCool: new THREE.MeshStandardMaterial({ color: 0x7e8794, metalness: 0.6, roughness: 0.38 }),
    rib: new THREE.MeshStandardMaterial({ color: 0x8e9199, metalness: 0.4, roughness: 0.5 }),
    upholstery: new THREE.MeshStandardMaterial({ color: 0x3b4658, metalness: 0.0, roughness: 0.95 }),
    lcarsAmber: new THREE.MeshBasicMaterial({ color: 0xff9c00, toneMapped: false }),
    lcarsBlue: new THREE.MeshBasicMaterial({ color: 0x6a8fff, toneMapped: false }),
    plasmaGlass: new THREE.MeshPhysicalMaterial({
      color: 0x8fd0ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, transmission: 0.6, thickness: 0.4,
    }),
    viewGlass: new THREE.MeshPhysicalMaterial({
      color: 0xbcd8ff, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.07,
      side: THREE.DoubleSide,
    }),
  };

  // 舱内面板一律双面，避免走廊/舱室内壁被背面剔除
  for (const k of ['bulkhead', 'bulkheadWarm', 'grating', 'carpet', 'carpetWarm', 'ceiling',
    'doorFrame', 'doorLeaf', 'consoleBody', 'rib', 'lightPanel', 'trimWarm', 'trimCool']) {
    _lib[k].side = THREE.DoubleSide;
  }
  for (const k of ['bulkhead', 'bulkheadWarm', 'carpet', 'carpetWarm', 'grating']) {
    _lib[k].envMapIntensity = 0.25;
  }

  // 纹理密度由各部件几何的 uvScale 按真实米数给出，材质本身保持 1:1
  for (const k of ['hull', 'hullShell', 'hullDark']) {
    _lib[k].map.repeat.set(1, 1);
    _lib[k].normalMap.repeat.set(1, 1);
    _lib[k].roughnessMap.repeat.set(1, 1);
  }
  _lib.grating.map.repeat.set(5, 5);
  _lib.grating.normalMap.repeat.set(5, 5);
  _lib.carpet.map.repeat.set(6, 6);
  _lib.carpet.normalMap.repeat.set(6, 6);
  return _lib;
}
