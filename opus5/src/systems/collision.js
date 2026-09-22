import * as THREE from 'three';

const PLAYER_RADIUS = 0.34;
const PLAYER_HEIGHT = 1.78;
const STEP_UP = 0.55;

/**
 * 舱室行走系统：地面由若干可行走区域（矩形/圆形/坡道）并集定义，
 * 障碍物为 AABB。离开并集即视为墙外，移动被拒绝或沿轴滑动。
 */
export class WalkSystem {
  constructor() {
    this.regions = [];
    this.blockers = [];
  }

  rect(x0, z0, x1, z1, y, tag = '') {
    this.regions.push({ kind: 'rect', x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y, tag });
    return this;
  }

  circle(cx, cz, r, y, tag = '') {
    this.regions.push({ kind: 'circle', cx, cz, r, y, tag });
    return this;
  }

  /** 沿 axis 线性升高的坡道。 */
  ramp(x0, z0, x1, z1, yStart, yEnd, axis = 'z', tag = '') {
    this.regions.push({
      kind: 'ramp', x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1),
      yStart, yEnd, axis, tag,
    });
    return this;
  }

  /** 环形走廊地面（用于碟部主走廊）。 */
  annulus(cx, cz, rInner, rOuter, y, a0 = 0, a1 = Math.PI * 2, tag = '') {
    this.regions.push({ kind: 'annulus', cx, cz, rInner, rOuter, y, a0, a1, tag });
    return this;
  }

  block(x0, z0, x1, z1, yBottom = -1e6, yTop = 1e6) {
    this.blockers.push({
      x0: Math.min(x0, x1), x1: Math.max(x0, x1),
      z0: Math.min(z0, z1), z1: Math.max(z0, z1),
      yBottom, yTop,
    });
    return this;
  }

  /** 以玩家半径收缩后判断某点是否在可行走面上，返回地面高度。 */
  floorAt(x, z, hintY = null) {
    let best = null;
    for (const r of this.regions) {
      let y = null;
      if (r.kind === 'rect') {
        if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) y = r.y;
      } else if (r.kind === 'circle') {
        if ((x - r.cx) ** 2 + (z - r.cz) ** 2 <= r.r * r.r) y = r.y;
      } else if (r.kind === 'ramp') {
        if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
          const t = r.axis === 'z' ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0);
          y = r.yStart + (r.yEnd - r.yStart) * t;
        }
      } else if (r.kind === 'annulus') {
        const dx = x - r.cx;
        const dz = z - r.cz;
        const d = Math.hypot(dx, dz);
        if (d >= r.rInner && d <= r.rOuter) {
          let a = Math.atan2(dz, dx);
          if (a < 0) a += Math.PI * 2;
          const span = r.a1 - r.a0;
          let rel = a - r.a0;
          if (rel < 0) rel += Math.PI * 2;
          if (span >= Math.PI * 2 - 1e-6 || rel <= span) y = r.y;
        }
      }
      if (y === null) continue;
      if (best === null) best = y;
      else if (hintY !== null && Math.abs(y - hintY) < Math.abs(best - hintY)) best = y;
      else if (hintY === null && y > best) best = y;
    }
    return best;
  }

  /** 玩家圆柱体与障碍物的分离。 */
  pushOut(p, feetY) {
    const head = feetY + PLAYER_HEIGHT;
    for (const b of this.blockers) {
      if (head < b.yBottom || feetY > b.yTop) continue;
      const cx = THREE.MathUtils.clamp(p.x, b.x0, b.x1);
      const cz = THREE.MathUtils.clamp(p.z, b.z0, b.z1);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > PLAYER_RADIUS * PLAYER_RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * PLAYER_RADIUS;
        p.z = cz + (dz / d) * PLAYER_RADIUS;
      } else {
        // 圆心落在盒内：沿最近的面推出
        const left = p.x - b.x0;
        const right = b.x1 - p.x;
        const back = p.z - b.z0;
        const front = b.z1 - p.z;
        const mn = Math.min(left, right, back, front);
        if (mn === left) p.x = b.x0 - PLAYER_RADIUS;
        else if (mn === right) p.x = b.x1 + PLAYER_RADIUS;
        else if (mn === back) p.z = b.z0 - PLAYER_RADIUS;
        else p.z = b.z1 + PLAYER_RADIUS;
      }
    }
  }

  /** 边缘检测：玩家圆周若有采样点悬空则视为越界。 */
  supported(x, z, hintY) {
    const y = this.floorAt(x, z, hintY);
    if (y === null) return null;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const fy = this.floorAt(x + Math.cos(a) * PLAYER_RADIUS, z + Math.sin(a) * PLAYER_RADIUS, y);
      if (fy === null || Math.abs(fy - y) > STEP_UP) return null;
    }
    return y;
  }

  /** 从 from 走向 to，返回实际落点（含地面高度）。 */
  resolve(from, to, currentY) {
    const cand = new THREE.Vector3(to.x, 0, to.z);
    this.pushOut(cand, currentY);
    let y = this.supported(cand.x, cand.z, currentY);
    if (y !== null && Math.abs(y - currentY) <= STEP_UP) {
      return { x: cand.x, z: cand.z, y };
    }
    // 沿单轴滑动
    for (const axis of ['x', 'z']) {
      const slide = new THREE.Vector3(axis === 'x' ? to.x : from.x, 0, axis === 'z' ? to.z : from.z);
      this.pushOut(slide, currentY);
      const sy = this.supported(slide.x, slide.z, currentY);
      if (sy !== null && Math.abs(sy - currentY) <= STEP_UP) {
        return { x: slide.x, z: slide.z, y: sy };
      }
    }
    return { x: from.x, z: from.z, y: currentY };
  }
}

export const PLAYER = { radius: PLAYER_RADIUS, height: PLAYER_HEIGHT, eye: 1.64 };
