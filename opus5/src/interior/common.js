import * as THREE from 'three';
import { parametricSurface, mergeAll, makeRng, mix } from '../lib/geom.js';
import { materials } from '../materials/library.js';

/** 银河级标准甲板层高。 */
export const DECK_H = 3.0;

/** 舱内照明总增益：所有局部光源统一走这个旋钮。 */
export const LIGHT_GAIN = 1.0;

/** 内部构件统一走 1 号图层，避免被舰外恒星光照亮。 */
export function markInterior(root) {
  root.traverse((o) => { o.layers.set(1); });
  return root;
}

export function box(w, h, d, x, y, z, mat, rotY = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

export function plane(w, h, x, y, z, mat, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

/** 带矩形开口的墙（门洞、窗洞）。openings: [{from,to,bottom,top}] 以沿墙坐标给出。 */
export function wallWithOpenings(from, to, bottom, top, thickness, mat, openings = []) {
  const pieces = [];
  const segs = [];
  const sorted = [...openings].sort((a, b) => a.from - b.from);
  let cursor = from;
  for (const o of sorted) {
    if (o.from > cursor) segs.push([cursor, o.from, bottom, top]);
    if (o.bottom > bottom) segs.push([o.from, o.to, bottom, o.bottom]);
    if (o.top < top) segs.push([o.from, o.to, o.top, top]);
    cursor = Math.max(cursor, o.to);
  }
  if (cursor < to) segs.push([cursor, to, bottom, top]);

  for (const [s0, s1, y0, y1] of segs) {
    if (s1 - s0 < 1e-4 || y1 - y0 < 1e-4) continue;
    const g = new THREE.BoxGeometry(s1 - s0, y1 - y0, thickness);
    g.translate((s0 + s1) / 2, (y0 + y1) / 2, 0);
    pieces.push(g);
  }
  if (!pieces.length) return null;
  return new THREE.Mesh(mergeAll(pieces), mat);
}

/** TNG 风格走廊管道：闭合截面沿路径放样，内表面朝向玩家。 */
export function corridorProfile(halfW = 1.32, h = 2.62) {
  return [
    [-halfW, 0], [-halfW, 0.12], [-halfW, 1.86], [-halfW + 0.26, 2.42],
    [-0.52, h], [0.52, h], [halfW - 0.26, 2.42],
    [halfW, 1.86], [halfW, 0.12], [halfW, 0],
  ];
}

function profileAt(pts, t) {
  const n = pts.length;
  const f = ((t % 1) + 1) % 1 * n;
  const i = Math.floor(f) % n;
  const j = (i + 1) % n;
  const k = f - Math.floor(f);
  return [mix(pts[i][0], pts[j][0], k), mix(pts[i][1], pts[j][1], k)];
}

/**
 * 沿路径生成走廊内壁。path(t) -> {x, z, dirX, dirZ}
 */
export function corridorShell(path, {
  length = 20, profile = corridorProfile(), mat, uSegs = 40, y = 0,
}) {
  const fn = (u, v) => {
    const p = path(u);
    const [s, h] = profileAt(profile, v);
    // 横向法线 = 路径方向旋转 90°
    const nx = -p.dirZ;
    const nz = p.dirX;
    return new THREE.Vector3(p.x + nx * s, y + h, p.z + nz * s);
  };
  const geo = parametricSurface(fn, uSegs, profile.length * 3, { uvScale: [length / 6, 1.6] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'corridor-shell';
  return { mesh, fn };
}

/** 自动门：靠近时左右滑开。 */
export function makeDoor({
  x, y, z, rotY = 0, width = 1.6, height = 2.35, mats, tag = 'door', triggerDist = 2.6,
}) {
  const m = mats || materials();
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotY;

  const frameMat = m.doorFrame;
  const t = 0.16;
  const jambL = box(0.22, height + 0.28, t + 0.12, -(width / 2 + 0.11), (height + 0.28) / 2, 0, frameMat);
  const jambR = box(0.22, height + 0.28, t + 0.12, width / 2 + 0.11, (height + 0.28) / 2, 0, frameMat);
  const lintel = box(width + 0.44, 0.28, t + 0.12, 0, height + 0.14, 0, frameMat);
  group.add(jambL, jambR, lintel);

  const panels = [];
  for (const sign of [-1, 1]) {
    const p = new THREE.Group();
    const leaf = box(width / 2, height, t, sign * width / 4, height / 2, 0, m.doorLeaf);
    const trim = box(width / 2 - 0.06, 0.05, t + 0.02, sign * width / 4, height - 0.22, 0, m.doorTrim);
    p.add(leaf, trim);
    p.userData.sign = sign;
    group.add(p);
    panels.push(p);
  }

  const light = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.26), m.lcarsAmber);
  light.position.set(width / 2 + 0.26, 1.35, t / 2 + 0.08);
  group.add(light);

  const worldPos = new THREE.Vector3(x, y, z);
  return {
    group, panels, worldPos, tag, triggerDist,
    openness: 0,
    update(dt, playerPos) {
      const d = playerPos ? worldPos.distanceTo(playerPos) : 99;
      const target = d < triggerDist ? 1 : 0;
      this.openness += (target - this.openness) * Math.min(1, dt * 7);
      for (const p of this.panels) {
        p.position.x = p.userData.sign * this.openness * (width / 2 + 0.02);
      }
    },
  };
}

/** 天花板灯带（发光面 + 局部点光）。 */
export function ceilingStrip(x, y, z, w, d, lights, {
  color = 0xfff0d8, intensity = 6, mat = null, distance = 14,
} = {}) {
  const m = materials();
  const g = new THREE.Group();
  const panel = plane(w, d, x, y - 0.02, z, mat || m.lightPanel, [Math.PI / 2, 0, 0]);
  g.add(panel);
  const pl = new THREE.PointLight(color, intensity * LIGHT_GAIN, distance, 2);
  pl.position.set(x, y - 0.5, z);
  lights.push(pl);
  g.add(pl);
  return g;
}

/** LCARS 壁板。 */
export function lcarsWall(x, y, z, w, h, rotY, seed, dense = 1) {
  const m = materials();
  const g = new THREE.Group();
  const backing = box(w + 0.1, h + 0.1, 0.06, 0, 0, 0, m.blackPanel);
  const screen = plane(w, h, 0, 0, 0.045, m.lcarsLit(seed, 512, Math.max(128, Math.round(512 * h / w)), dense));
  g.add(backing, screen);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return g;
}

/** 站姿控制台（倾斜面板 + 底座）。 */
export function standingConsole(x, y, z, w, rotY, seed) {
  const m = materials();
  const g = new THREE.Group();
  const base = box(w, 0.92, 0.62, 0, 0.46, 0, m.consoleBody);
  const top = box(w, 0.1, 0.72, 0, 0.98, 0.04, m.consoleBody);
  g.add(base, top);
  const face = plane(w - 0.08, 0.62, 0, 1.16, -0.12, m.lcarsLit(seed, 512, 256, 1.2));
  face.rotation.x = -0.92;
  g.add(face);
  const rail = box(w, 0.06, 0.06, 0, 1.02, -0.34, m.trimWarm);
  g.add(rail);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return g;
}

/** 舰桥式座椅。 */
export function chair(x, y, z, rotY, scale = 1) {
  const m = materials();
  const g = new THREE.Group();
  const seat = box(0.62, 0.14, 0.58, 0, 0.46, 0, m.upholstery);
  const back = box(0.62, 0.72, 0.13, 0, 0.84, -0.26, m.upholstery);
  const stem = box(0.16, 0.44, 0.16, 0, 0.22, 0, m.consoleBody);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.08, 20), m.consoleBody);
  foot.position.y = 0.04;
  const armL = box(0.09, 0.09, 0.44, -0.35, 0.66, -0.02, m.consoleBody);
  const armR = box(0.09, 0.09, 0.44, 0.35, 0.66, -0.02, m.consoleBody);
  g.add(seat, back, stem, foot, armL, armR);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  g.scale.setScalar(scale);
  return g;
}

/** 栏杆（工程部/舰桥围栏）。 */
export function railing(points, y, height = 1.06) {
  const m = materials();
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], y + height, p[1])));
  const top = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 6, 0.045, 8, false), m.trimWarm);
  g.add(top);
  const mid = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], y + height * 0.45, p[1]))), points.length * 6, 0.03, 6, false),
    m.trimWarm,
  );
  g.add(mid);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    g.add(box(0.07, height, 0.07, p[0], y + height / 2, p[1], m.consoleBody));
  }
  return g;
}

/** 弧形舱壁（圆形舱室用）。 */
export function arcWall(r, a0, span, y0, y1, mat, segments = 48) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, segments, 1, true, a0, span);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = (y0 + y1) / 2;
  return mesh;
}

/**
 * 房间构建器：负责把局部坐标的几何与世界坐标的碰撞体/出生点对齐。
 */
export class RoomBuilder {
  constructor(ctx, origin, name) {
    this.ctx = ctx;
    this.o = origin;
    this.group = new THREE.Group();
    this.group.name = name;
    this.group.position.copy(origin);
    ctx.root.add(this.group);
  }

  add(...objs) {
    for (const o of objs) if (o) this.group.add(o);
    return this;
  }

  rect(x0, z0, x1, z1, y, tag) {
    this.ctx.walk.rect(x0 + this.o.x, z0 + this.o.z, x1 + this.o.x, z1 + this.o.z, y + this.o.y, tag);
    return this;
  }

  circle(cx, cz, r, y, tag) {
    this.ctx.walk.circle(cx + this.o.x, cz + this.o.z, r, y + this.o.y, tag);
    return this;
  }

  annulus(cx, cz, rIn, rOut, y, a0, a1, tag) {
    this.ctx.walk.annulus(cx + this.o.x, cz + this.o.z, rIn, rOut, y + this.o.y, a0, a1, tag);
    return this;
  }

  ramp(x0, z0, x1, z1, yA, yB, axis, tag) {
    this.ctx.walk.ramp(x0 + this.o.x, z0 + this.o.z, x1 + this.o.x, z1 + this.o.z, yA + this.o.y, yB + this.o.y, axis, tag);
    return this;
  }

  block(x0, z0, x1, z1, yBottom = -1e3, yTop = 1e3) {
    this.ctx.walk.block(
      x0 + this.o.x, z0 + this.o.z, x1 + this.o.x, z1 + this.o.z,
      yBottom + this.o.y, yTop + this.o.y,
    );
    return this;
  }

  door(opts) {
    const d = makeDoor(opts);
    d.worldPos.set(opts.x + this.o.x, opts.y + this.o.y, opts.z + this.o.z);
    this.group.add(d.group);
    this.ctx.doors.push(d);
    return d;
  }

  light(x, y, z, color, intensity, distance) {
    const l = new THREE.PointLight(color, intensity * LIGHT_GAIN, distance, 2);
    l.position.set(x, y, z);
    this.group.add(l);
    this.ctx.lights.push(l);
    return l;
  }

  strip(x, y, z, w, d, opts) {
    const g = ceilingStrip(x, y, z, w, d, this.ctx.lights, opts);
    this.group.add(g);
    return g;
  }

  spawn(name, x, y, z, yaw = 0) {
    this.ctx.spawns[name] = {
      position: new THREE.Vector3(x + this.o.x, y + this.o.y, z + this.o.z),
      yaw,
    };
    return this;
  }

  /** 注册可交互点（涡轮电梯呼叫板等）。 */
  hotspot(name, x, y, z, label, action) {
    this.ctx.hotspots.push({
      name, label, action,
      position: new THREE.Vector3(x + this.o.x, y + this.o.y, z + this.o.z),
    });
    return this;
  }
}

/**
 * 矩形舱室外壳：地板 / 天花板 / 四面墙（可开洞）。
 * 墙面方向：north=+Z, south=-Z, east=+X, west=-X；开口坐标沿墙走向给出。
 */
export function roomShell(rb, {
  x0, z0, x1, z1, y = 0, h = 2.9, thickness = 0.22,
  floorMat, ceilMat, wallMat, openings = {}, floorUv = 2, noCeiling = false, noFloor = false,
}) {
  const m = materials();
  const fm = floorMat || m.carpet;
  const cm = ceilMat || m.ceiling;
  const wm = wallMat || m.bulkhead;
  const w = x1 - x0;
  const d = z1 - z0;

  if (!noFloor) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fm);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    rb.add(floor);
  }
  if (!noCeiling) {
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), cm);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set((x0 + x1) / 2, y + h, (z0 + z1) / 2);
    rb.add(ceil);
  }

  const walls = [
    ['north', x0, x1, 0, z1],
    ['south', x0, x1, 0, z0],
    ['east', z0, z1, -Math.PI / 2, x1],
    ['west', z0, z1, -Math.PI / 2, x0],
  ];
  for (const [side, a, b, rotY, pos] of walls) {
    const mesh = wallWithOpenings(a, b, y, y + h, thickness, wm, openings[side] || []);
    if (!mesh) continue;
    if (side === 'north' || side === 'south') mesh.position.z = pos;
    else { mesh.rotation.y = rotY; mesh.position.x = pos; }
    rb.add(mesh);
  }
  rb.rect(x0, z0, x1, z1, y, 'room');
  return rb;
}

/** 直走廊（沿 ±X 或 ±Z），自动生成内壁、灯带、踢脚与碰撞。 */
export function straightCorridor(rb, {
  axis = 'z', at: atPos = 0, from = 0, to = 10, y = 0, halfW = 1.32, h = 2.62,
  lightEvery = 6, seed = 1, sideDoors = [],
}) {
  const m = materials();
  const len = to - from;
  const path = (t) => {
    const s = from + t * len;
    return axis === 'z'
      ? { x: atPos, z: s, dirX: 0, dirZ: 1 }
      : { x: s, z: atPos, dirX: 1, dirZ: 0 };
  };
  const { mesh } = corridorShell(path, {
    length: len, profile: corridorProfile(halfW, h), mat: m.bulkhead,
    uSegs: Math.max(8, Math.round(len / 1.4)), y,
  });
  rb.add(mesh);

  // 地面（走廊壳是开口截面，底边即地板）
  const floorGeo = new THREE.PlaneGeometry(axis === 'z' ? halfW * 2 : len, axis === 'z' ? len : halfW * 2);
  const floor = new THREE.Mesh(floorGeo, m.carpet);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(
    axis === 'z' ? atPos : (from + to) / 2,
    y + 0.005,
    axis === 'z' ? (from + to) / 2 : atPos,
  );
  rb.add(floor);

  // 灯带与结构肋
  const rng = makeRng(seed);
  for (let s = from + 1.2; s < to - 0.6; s += lightEvery) {
    const x = axis === 'z' ? atPos : s;
    const z = axis === 'z' ? s : atPos;
    rb.strip(x, y + h - 0.02, z, axis === 'z' ? 0.9 : 2.2, axis === 'z' ? 2.2 : 0.9,
      { color: 0xffe9cc, intensity: 7.5, distance: 12, mat: m.lightPanel });
  }
  for (let s = from + 0.8; s < to - 0.4; s += 2.6) {
    for (const sign of [-1, 1]) {
      const x = axis === 'z' ? atPos + sign * (halfW - 0.05) : s;
      const z = axis === 'z' ? s : atPos + sign * (halfW - 0.05);
      const rot = axis === 'z' ? Math.PI / 2 : 0;
      rb.add(box(0.1, h - 0.2, 0.14, x, y + (h - 0.2) / 2, z, m.rib, rot));
      if (rng() > 0.62) {
        const px = axis === 'z' ? atPos + sign * (halfW - 0.09) : s + 0.7;
        const pz = axis === 'z' ? s + 0.7 : atPos + sign * (halfW - 0.09);
        rb.add(lcarsWall(px, y + 1.55, pz, 0.62, 0.42, axis === 'z' ? (sign > 0 ? -Math.PI / 2 : Math.PI / 2) : (sign > 0 ? Math.PI : 0), Math.round(s * 7 + sign), 0.7));
      }
    }
  }
  // 踢脚线
  for (const sign of [-1, 1]) {
    const x = axis === 'z' ? atPos + sign * (halfW - 0.03) : (from + to) / 2;
    const z = axis === 'z' ? (from + to) / 2 : atPos + sign * (halfW - 0.03);
    rb.add(box(axis === 'z' ? 0.07 : len, 0.14, axis === 'z' ? len : 0.07, x, y + 0.07, z, m.trimWarm));
  }

  if (axis === 'z') rb.rect(atPos - halfW, from, atPos + halfW, to, y, 'corridor');
  else rb.rect(from, atPos - halfW, to, atPos + halfW, y, 'corridor');

  for (const sd of sideDoors) {
    const x = axis === 'z' ? atPos + sd.side * halfW : sd.at;
    const z = axis === 'z' ? sd.at : atPos + sd.side * halfW;
    rb.door({
      x, y, z,
      rotY: axis === 'z' ? (sd.side > 0 ? -Math.PI / 2 : Math.PI / 2) : (sd.side > 0 ? Math.PI : 0),
      width: 1.6, height: 2.3, tag: sd.tag,
    });
  }
  return rb;
}
