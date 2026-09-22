import * as THREE from 'three';
import { stepWalk, EYE } from './walker.js';
import { codeOf } from '../ui/keys.js';

export class Controller {
  constructor(camera, dom, world) {
    this.camera = camera;
    this.dom = dom;
    this.world = world;
    this.mode = 'fly';
    this.keys = new Set();
    this.yaw = 0.6;
    this.pitch = -0.15;
    this.pos = new THREE.Vector3(150, 40, -140); // fly: 相机位置；walk: 脚底位置
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.flySpeed = 30;
    this.enabled = false;
    this.locked = false;
    this.dragging = false;
    this.bob = 0;
    this.onInteract = null;
    this.onToggleMap = null;
    this.onToggleMode = null;
    this.moved = 0;
    this._bind();
  }

  _bind() {
    const d = this.dom;
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === d; });
    d.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (!this.locked) { d.requestPointerLock?.()?.catch?.(() => {}); }
      this.dragging = true;
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (!this.locked && !this.dragging) return;
      const k = 0.0022;
      this.yaw -= e.movementX * k;
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - e.movementY * k));
    });
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const code = codeOf(e);
      if (code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      if (code === 'Tab') { this.onToggleMode?.(); return; }
      if (code === 'KeyM') { this.onToggleMap?.(); return; }
      if (code === 'KeyE' && this.mode === 'walk') { this.onInteract?.(); return; }
      this.keys.add(code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(codeOf(e)));
    window.addEventListener('blur', () => this.keys.clear());
    d.addEventListener('wheel', (e) => {
      if (this.mode === 'fly') this.flySpeed = Math.max(3, Math.min(400, this.flySpeed * (e.deltaY < 0 ? 1.15 : 0.87)));
    }, { passive: true });
  }

  setMode(mode) {
    this.mode = mode;
    this.vel.set(0, 0, 0);
    this.vy = 0;
    this.camera.near = mode === 'walk' ? 0.05 : 0.5;
    this.camera.far = 40000;
    this.camera.updateProjectionMatrix();
  }

  teleportWalk(x, y, z, yaw = this.yaw) {
    this.pos.set(x, y, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.vy = 0;
  }

  get eyePos() { return this.mode === 'walk' ? new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z) : this.pos.clone(); }

  update(dt) {
    dt = Math.min(dt, 0.05);
    const k = this.keys;
    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const boost = k.has('ShiftLeft') || k.has('ShiftRight');
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);

    if (this.mode === 'fly') {
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const fwd = new THREE.Vector3(-sy * cp, sp, -cy * cp);
      const right = new THREE.Vector3(cy, 0, -sy);
      const up = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
      const wish = new THREE.Vector3().addScaledVector(fwd, f).addScaledVector(right, s).addScaledVector(new THREE.Vector3(0, 1, 0), up);
      if (wish.lengthSq() > 0) wish.normalize();
      const speed = this.flySpeed * (boost ? 4 : 1) * (k.has('ControlLeft') ? 0.2 : 1);
      this.vel.lerp(wish.multiplyScalar(speed), 1 - Math.exp(-dt * 5));
      this.pos.addScaledVector(this.vel, dt);
      this.camera.position.copy(this.pos);
    } else {
      const wish = new THREE.Vector3(-sy * f + cy * s, 0, -cy * f - sy * s);
      if (wish.lengthSq() > 0) wish.normalize();
      const speed = boost ? 6.2 : 3.3;
      this.vel.lerp(wish.multiplyScalar(speed), 1 - Math.exp(-dt * 9));
      const r = stepWalk(this.world, { x: this.pos.x, y: this.pos.y, z: this.pos.z, vy: this.vy }, this.vel.x * dt, this.vel.z * dt, dt);
      if (r.blocked && r.moved < 1e-4) this.vel.set(0, 0, 0);
      const dist = r.moved;
      this.moved += dist;
      this.pos.set(r.x, r.y, r.z);
      this.vy = r.vy;
      this.bob += dist * 2.6;
      const bobY = Math.sin(this.bob) * 0.022 * Math.min(1, this.vel.length() / 3);
      this.camera.position.set(this.pos.x, this.pos.y + EYE + bobY, this.pos.z);
    }
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  lookAt(x, y, z) {
    const e = this.mode === 'walk' ? this.eyePos : this.pos;
    const dx = x - e.x, dy = y - e.y, dz = z - e.z;
    this.yaw = Math.atan2(-dx, -dz);
    this.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }

  // 视线方向（用于交互点筛选）
  forward() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }
}
