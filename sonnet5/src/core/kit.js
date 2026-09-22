import * as THREE from 'three';
import { Batcher } from './batch.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);
const cache = new Map();
function cached(k, fn) { let g = cache.get(k); if (!g) { g = fn(); cache.set(k, g); } return g; }

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();

const eul = (r) => (typeof r === 'number' ? [0, r, 0] : r || [0, 0, 0]);

// 矩阵栈 + 批处理 + 碰撞/门/灯光登记
export class Kit {
  constructor(world, mats) {
    this.world = world;
    this.M = mats;
    this.b = new Batcher();
    this.stack = [new THREE.Matrix4()];
    this.group = new THREE.Group();
  }

  get m() { return this.stack[this.stack.length - 1]; }

  push(x = 0, y = 0, z = 0, ry = 0) {
    const t = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    this.stack.push(this.m.clone().multiply(t));
    return this;
  }
  pushEuler(p, r) {
    _e.set(...eul(r)); _q.setFromEuler(_e); _p.set(...p); _s.set(1, 1, 1);
    this.stack.push(this.m.clone().multiply(_m.compose(_p, _q, _s)));
    return this;
  }
  pop() { this.stack.pop(); return this; }

  yaw() { const e = this.m.elements; return Math.atan2(e[8], e[0]); }
  toWorld(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(this.m); }

  mat(p, r, s) {
    _e.set(...eul(r)); _q.setFromEuler(_e); _p.set(...p); _s.set(...s);
    return this.m.clone().multiply(_m.compose(_p, _q, _s));
  }

  // ---- 视觉 ----
  box(material, p, s, r, col) { this.b.add(material, BOX, this.mat(p, r, s), col); }
  plane(material, p, s, r, col) { this.b.add(material, PLANE, this.mat(p, r, [s[0], s[1], 1]), col); }
  cyl(material, p, radius, h, { seg = 16, rt = radius, rot, col, open = false } = {}) {
    const k = `cyl${seg}_${(rt / radius).toFixed(3)}_${open}`;
    const g = cached(k, () => new THREE.CylinderGeometry(rt / radius, 1, 1, seg, 1, open));
    this.b.add(material, g, this.mat(p, rot, [radius, h, radius]), col);
  }
  sph(material, p, radius, { ws = 16, hs = 10, s = [1, 1, 1], rot, col } = {}) {
    const g = cached(`sph${ws}_${hs}`, () => new THREE.SphereGeometry(1, ws, hs));
    this.b.add(material, g, this.mat(p, rot, [radius * s[0], radius * s[1], radius * s[2]]), col);
  }
  torus(material, p, R, tube, { rot, seg = 32, ts = 8, col } = {}) {
    const g = cached(`tor${seg}_${ts}_${(tube / R).toFixed(3)}`, () => new THREE.TorusGeometry(1, tube / R, ts, seg));
    this.b.add(material, g, this.mat(p, rot, [R, R, R]), col);
  }
  geo(material, geometry, p = [0, 0, 0], r, s = [1, 1, 1], col) { this.b.add(material, geometry, this.mat(p, r, s), col); }

  // 在两点之间放一根圆管/盒梁
  beam(material, a, bb, thick = 0.1, { round = true, seg = 8, col } = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...bb);
    const len = A.distanceTo(B);
    if (len < 1e-4) return;
    const mid = A.clone().add(B).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    if (round) this.cyl(material, [mid.x, mid.y, mid.z], thick, len, { seg, rot: [e.x, e.y, e.z], col });
    else this.box(material, [mid.x, mid.y, mid.z], [thick, len, thick], [e.x, e.y, e.z], col);
  }

  // 沿方向 a→b 的扁条（up 指定“朝上”参考，如表面法线）
  strut(material, a, bb, width, thick, up = [0, 1, 0], col) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...bb);
    const len = A.distanceTo(B);
    const z = B.clone().sub(A).normalize();
    let x = new THREE.Vector3(...up).cross(z);
    if (x.lengthSq() < 1e-8) x = new THREE.Vector3(1, 0, 0).cross(z);
    x.normalize();
    const y = z.clone().cross(x).normalize();
    const mid = A.clone().add(B).multiplyScalar(0.5);
    const basis = new THREE.Matrix4().makeBasis(x, y, z).setPosition(mid);
    const sc = new THREE.Matrix4().makeScale(width, thick, len);
    this.b.add(material, BOX, this.m.clone().multiply(basis).multiply(sc), col);
  }

  // ---- 碰撞 ----
  get oy() { return this.m.elements[13]; }
  wall(x, z, hx, hz, y0, y1) {
    const w = this.toWorld(x, 0, z);
    return this.world.addWall({ cx: w.x, cz: w.z, hx, hz, yaw: this.yaw(), y0: y0 + this.oy, y1: y1 + this.oy });
  }
  floorRect(x, z, hx, hz, y0, y1 = null) {
    const w = this.toWorld(x, 0, z);
    return this.world.addFloor({ cx: w.x, cz: w.z, hx, hz, yaw: this.yaw(), y0: y0 + this.oy, y1: y1 === null ? null : y1 + this.oy });
  }
  floorDisc(x, z, r, y0) {
    const w = this.toWorld(x, 0, z);
    return this.world.addFloor({ cx: w.x, cz: w.z, circle: r, y0: y0 + this.oy });
  }
  // 家具：视觉盒 + 碰撞（footprint 用中心/尺寸；y 用世界局部 y）
  solid(material, p, s, r = 0, col, { collide = true } = {}) {
    this.box(material, p, s, r, col);
    if (collide) {
      const yaw = typeof r === 'number' ? r : (r && r[1]) || 0;
      this.push(p[0], 0, p[2], yaw);
      this.wall(0, 0, s[0] / 2, s[2] / 2, p[1] - s[1] / 2, p[1] + s[1] / 2);
      this.pop();
    }
  }
  zone(name, deck, x, z, hx, hz, y0, y1) {
    const w = this.toWorld(x, 0, z), yaw = this.yaw();
    this.world.zones.push({ name, deck, cx: w.x, cz: w.z, hx, hz, c: Math.cos(yaw), s: Math.sin(yaw), y0: y0 + this.oy, y1: y1 + this.oy, area: hx * hz });
  }

  // ---- 灯光锚点 ----
  light(x, y, z, color = 0xfff2dd, intensity = 40, dist = 16) {
    const w = this.toWorld(x, y, z);
    this.world.anchors.push({ x: w.x, y: w.y, z: w.z, color: new THREE.Color(color), intensity, dist });
  }

  // ---- 交互点 ----
  interact(x, y, z, r, label, onUse) {
    const w = this.toWorld(x, y, z);
    const it = { x: w.x, y: w.y, z: w.z, r, label, onUse };
    this.world.interact.push(it);
    return it;
  }

  // ---- 自动门（墙沿局部 x，法线沿局部 z） ----
  door(x, y0, z, { w = 2.2, h = 2.4, radius = 3.0, tint = 0xd9dad4, accent = 0xd0a028, collide = true } = {}) {
    const M = this.M;
    const g = new THREE.Group();
    g.matrixAutoUpdate = false;
    g.matrix.copy(this.m).multiply(new THREE.Matrix4().makeTranslation(x, y0, z));
    g.matrixWorldNeedsUpdate = true;
    const leafW = w / 2 + 0.03;
    const mkLeaf = (sign) => {
      const geos = [];
      const col = new THREE.Color(tint), acc = new THREE.Color(accent);
      const add = (sx, sy, sz, px, py, pz, c) => {
        const gg = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
        gg.translate(px, py, pz);
        const arr = new Float32Array(gg.attributes.position.count * 3);
        for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
        gg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        geos.push(gg);
      };
      add(leafW, h, 0.09, 0, h / 2, 0, col);
      add(0.06, h - 0.3, 0.11, sign * (leafW / 2 - 0.05), h / 2, 0, acc);
      add(leafW - 0.2, 0.05, 0.11, 0, h * 0.55, 0, new THREE.Color(0x777a80));
      add(leafW - 0.2, 0.05, 0.11, 0, h * 0.2, 0, new THREE.Color(0x777a80));
      const merged = mergeVC(geos);
      const mesh = new THREE.Mesh(merged, M.doorMat);
      mesh.castShadow = false;
      return mesh;
    };
    const A = mkLeaf(-1), B = mkLeaf(1);
    const ax = -w / 4 - 0.005, bx = w / 4 + 0.005;
    A.position.x = ax; B.position.x = bx;
    g.add(A, B);
    this.world.root.add(g);
    // 门框
    const t = 0.16;
    this.box(M.steelDark, [x - w / 2 - t / 2, y0 + h / 2 + 0.05, z], [t, h + 0.1, 0.34]);
    this.box(M.steelDark, [x + w / 2 + t / 2, y0 + h / 2 + 0.05, z], [t, h + 0.1, 0.34]);
    this.box(M.steelDark, [x, y0 + h + 0.1, z], [w + t * 2, 0.16, 0.34]);
    this.box(M.lampWarm, [x, y0 + h + 0.2, z + 0.18], [w * 0.5, 0.04, 0.03]);
    this.box(M.lampWarm, [x, y0 + h + 0.2, z - 0.18], [w * 0.5, 0.04, 0.03]);
    const wc = this.toWorld(x, y0, z);
    let collider = null;
    if (collide) {
      this.push(x, 0, z, 0);
      collider = this.wall(0, 0, w / 2, 0.14, y0, y0 + h);
      this.pop();
    }
    const door = { x: wc.x, y: wc.y, z: wc.z, radius, open: 0, target: 0, travel: w / 2 - 0.02, ax, bx, leafA: A, leafB: B, collider, _closed: true, _dir: 0 };
    this.world.doors.push(door);
    return door;
  }

  // 独立网格（不合并），绕自身局部 Y 轴缓慢旋转
  spinner(build, p = [0, 0, 0], { speed = 0.5, axis = [0, 1, 0] } = {}) {
    const g = new THREE.Group();
    build(g);
    const m = this.mat(p, null, [1, 1, 1]);
    m.decompose(g.position, g.quaternion, g.scale);
    this.world.root.add(g);
    const base = g.quaternion.clone(), ax = new THREE.Vector3(...axis).normalize(), q = new THREE.Quaternion();
    this.world.anim.push((t) => { q.setFromAxisAngle(ax, t * speed); g.quaternion.copy(base).multiply(q); });
    return g;
  }

  finish(parent, name) {
    this.b.build(this.group, { name });
    parent.add(this.group);
    return this.group;
  }
}

function mergeVC(list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2); col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
