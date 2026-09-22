import * as THREE from 'three';

const CELL = 6;
const key = (i, j) => i * 73856093 ^ j * 19349663;

function aabb(o) {
  const ex = Math.abs(o.c) * o.hx + Math.abs(o.s) * o.hz;
  const ez = Math.abs(o.s) * o.hx + Math.abs(o.c) * o.hz;
  return [o.cx - ex, o.cz - ez, o.cx + ex, o.cz + ez];
}

class Grid {
  constructor() { this.map = new Map(); }
  insert(o, box) {
    const i0 = Math.floor(box[0] / CELL), i1 = Math.floor(box[2] / CELL);
    const j0 = Math.floor(box[1] / CELL), j1 = Math.floor(box[3] / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = key(i, j);
      let l = this.map.get(k);
      if (!l) { l = []; this.map.set(k, l); }
      l.push(o);
    }
  }
  query(x, z, r, fn) {
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL);
    const j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const l = this.map.get(key(i, j));
      if (l) for (const o of l) fn(o);
    }
  }
}

export class World {
  constructor() {
    this.walls = new Grid();
    this.floors = new Grid();
    this.doors = [];
    this.interact = [];
    this.anim = [];
    this.anchors = [];
    this.zones = [];
    this.spawns = {};
    this.root = new THREE.Group();
    this.onDoor = null;
  }

  addWall({ cx, cz, hx, hz, yaw = 0, y0, y1 }) {
    const o = { cx, cz, hx, hz, c: Math.cos(yaw), s: Math.sin(yaw), y0, y1, active: true };
    this.walls.insert(o, aabb(o));
    return o;
  }

  addFloor({ cx, cz, hx, hz, yaw = 0, y0, y1 = null, circle = 0 }) {
    const o = { cx, cz, hx: circle || hx, hz: circle || hz, c: Math.cos(yaw), s: Math.sin(yaw), y0, y1, circle };
    this.floors.insert(o, circle ? [cx - circle, cz - circle, cx + circle, cz + circle] : aabb(o));
    return o;
  }

  floorAt(x, z, footY, stepUp = 0.55) {
    let best = null;
    this.floors.query(x, z, 0.01, (o) => {
      const dx = x - o.cx, dz = z - o.cz;
      let y;
      if (o.circle) {
        if (dx * dx + dz * dz > o.circle * o.circle) return;
        y = o.y0;
      } else {
        const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
        if (Math.abs(lx) > o.hx || Math.abs(lz) > o.hz) return;
        y = o.y1 === null ? o.y0 : o.y0 + (o.y1 - o.y0) * ((lz + o.hz) / (2 * o.hz));
      }
      if (y <= footY + stepUp && (best === null || y > best)) best = y;
    });
    return best;
  }

  // 圆形玩家与 OBB 墙体分离
  resolve(x, z, r, footY, headY) {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      this.walls.query(x, z, r + 0.05, (o) => {
        if (!o.active || o.y1 < footY + 0.4 || o.y0 > headY) return;
        const dx = x - o.cx, dz = z - o.cz;
        const lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
        const qx = Math.max(-o.hx, Math.min(o.hx, lx)), qz = Math.max(-o.hz, Math.min(o.hz, lz));
        let ex = lx - qx, ez = lz - qz;
        const d2 = ex * ex + ez * ez;
        if (d2 >= r * r) return;
        let px, pz;
        if (d2 > 1e-10) { const d = Math.sqrt(d2); const k = (r - d) / d; px = ex * k; pz = ez * k; }
        else {
          const ax = o.hx - Math.abs(lx), az = o.hz - Math.abs(lz);
          if (ax < az) { px = (Math.sign(lx) || 1) * (ax + r); pz = 0; } else { pz = (Math.sign(lz) || 1) * (az + r); px = 0; }
        }
        x += px * o.c + pz * o.s;
        z += -px * o.s + pz * o.c;
        moved = true;
      });
      if (!moved) break;
    }
    return [x, z];
  }

  zoneAt(x, y, z) {
    let best = null;
    for (const zn of this.zones) {
      if (y < zn.y0 || y > zn.y1) continue;
      const dx = x - zn.cx, dz = z - zn.cz;
      const lx = dx * zn.c - dz * zn.s, lz = dx * zn.s + dz * zn.c;
      if (Math.abs(lx) > zn.hx || Math.abs(lz) > zn.hz) continue;
      if (!best || zn.area < best.area) best = zn;
    }
    return best;
  }

  updateDoors(px, py, pz, dt) {
    for (const d of this.doors) {
      const near = Math.abs(py - d.y) < 3 && Math.hypot(px - d.x, pz - d.z) < d.radius;
      d.target = near ? 1 : 0;
      if (d.target !== d._dir) {
        d._dir = d.target;
        this.onDoor?.(d, d.target === 1, Math.hypot(px - d.x, pz - d.z));
      }
      const prev = d.open;
      const rate = d.target > d.open ? 3.2 : 2.0;
      d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), rate * dt);
      if (d.open !== prev) {
        const off = d.open * d.travel;
        d.leafA.position.x = d.ax - off;
        d.leafB.position.x = d.bx + off;
      }
      if (d.collider) d.collider.active = d.open < 0.7;
      if (d.onChange && (d.open === 0) !== d._closed) { d._closed = d.open === 0; d.onChange(d._closed); }
    }
  }
}
