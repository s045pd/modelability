import * as THREE from 'three';

// 固定数量的点光源池：按玩家距离动态挂到最近的灯位，避免着色器重编译
export class LightPool {
  constructor(scene, anchors, n = 10) {
    this.anchors = anchors;
    this.slots = [];
    for (let i = 0; i < n; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 12, 2);
      light.castShadow = false;
      scene.add(light);
      this.slots.push({ light, anchor: null, level: 0 });
    }
    this.t = 1;
    this.enabled = false;
  }

  setEnabled(v) { this.enabled = v; if (!v) for (const s of this.slots) { s.anchor = null; s.level = 0; s.light.intensity = 0; } }

  update(dt, pos) {
    if (!this.enabled) return;
    this.t += dt;
    if (this.t > 0.12) { this.t = 0; this.assign(pos); }
    for (const s of this.slots) {
      const target = s.anchor ? 1 : 0;
      s.level += (target - s.level) * Math.min(1, dt * 9);
      if (s.anchor) s.light.intensity = s.anchor.intensity * s.level * 0.55;
      else s.light.intensity = s.light.intensity * (1 - Math.min(1, dt * 9));
    }
  }

  assign(pos) {
    const scored = [];
    for (const a of this.anchors) {
      const dx = a.x - pos.x, dy = a.y - pos.y, dz = a.z - pos.z;
      const d2 = dx * dx + dy * dy * 2.5 + dz * dz;
      if (d2 < 30 * 30) scored.push([d2, a]);
    }
    scored.sort((p, q) => p[0] - q[0]);
    const top = scored.slice(0, this.slots.length).map((s) => s[1]);
    const free = [];
    for (const s of this.slots) {
      if (s.anchor && top.includes(s.anchor)) { top.splice(top.indexOf(s.anchor), 1); continue; }
      free.push(s);
    }
    for (const s of free) {
      const a = top.shift();
      if (!a) { s.anchor = null; continue; }
      s.anchor = a;
      s.light.position.set(a.x, a.y, a.z);
      s.light.color.copy(a.color);
      s.light.distance = a.dist;
      s.level = Math.min(s.level, 0.2);
    }
  }
}
