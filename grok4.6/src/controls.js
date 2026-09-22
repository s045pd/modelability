import * as THREE from "three";
import { TELEPORTS } from "./config.js";

const UP = new THREE.Vector3(0, 1, 0);

export class FlyRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.yaw = -0.7;
    this.pitch = -0.22;
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.locked = false;
    this.mode = "fly";
    this.speed = 0;
    this.floors = [];
    this.ray = new THREE.Raycaster();
    this.down = new THREE.Vector3(0, -1, 0);
    this._onKey = (e) => this.onKey(e);
    this._onMouse = (e) => this.onMouse(e);
    this._onClick = () => this.lock();
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      document.getElementById("lock-hint").style.opacity = this.locked ? "0" : "1";
    };
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("keyup", this._onKey);
    document.addEventListener("mousemove", this._onMouse);
    document.addEventListener("pointerlockchange", this._onLockChange);
    this.dom.addEventListener("click", this._onClick);
  }

  setFloors(meshes) {
    this.floors = meshes;
  }

  lock() {
    this.dom.requestPointerLock();
  }

  teleport(id) {
    const t = TELEPORTS[id];
    if (!t) return;
    this.camera.position.set(...t.pos);
    this.velocity.set(0, 0, 0);
    const look = new THREE.Vector3(...t.look);
    const dir = look.sub(this.camera.position).normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.99, 0.99));
    this.mode = id === "inspect" ? "fly" : "walk";
    this.applyLook();
  }

  onKey(e) {
    const down = e.type === "keydown";
    const k = e.code;
    if (down) this.keys.add(k);
    else this.keys.delete(k);
    if (!down) return;
    if (k === "Digit1") this.teleport("inspect");
    if (k === "Digit2") this.teleport("hangar");
    if (k === "Digit3") this.teleport("engineering");
    if (k === "Digit4") this.teleport("bridge");
    if (k === "KeyF") {
      if (this.mode === "walk") {
        this.mode = "fly";
      } else if (this.floors.length) {
        this.ray.set(this.camera.position.clone().add(new THREE.Vector3(0, 1.2, 0)), this.down);
        this.ray.far = 6;
        if (this.ray.intersectObjects(this.floors, false)[0]) this.mode = "walk";
      }
    }
  }

  onMouse(e) {
    if (!this.locked) return;
    this.yaw -= e.movementX * 0.0022;
    this.pitch -= e.movementY * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
  }

  applyLook() {
    const e = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    this.camera.quaternion.setFromEuler(e);
  }

  update(dt) {
    this.applyLook();
    const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
    const base = this.mode === "walk" ? 6.5 : 38;
    const max = base * (sprint ? 4.2 : 1);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    if (this.mode === "walk") {
      forward.y = 0;
      if (forward.lengthSq() > 1e-6) forward.normalize();
    }
    const right = new THREE.Vector3().crossVectors(forward, UP).normalize();
    const wish = new THREE.Vector3();
    if (this.keys.has("KeyW")) wish.add(forward);
    if (this.keys.has("KeyS")) wish.sub(forward);
    if (this.keys.has("KeyD")) wish.add(right);
    if (this.keys.has("KeyA")) wish.sub(right);
    if (this.mode === "fly") {
      if (this.keys.has("KeyE") || this.keys.has("Space")) wish.add(UP);
      if (this.keys.has("KeyQ") || this.keys.has("ControlLeft")) wish.sub(UP);
    }
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(max);
    this.velocity.lerp(wish, 1 - Math.exp(-dt * (this.mode === "walk" ? 14 : 6)));
    this.camera.position.addScaledVector(this.velocity, dt);
    this.speed = this.velocity.length();

    if (this.mode === "walk" && this.floors.length) {
      this.ray.set(this.camera.position.clone().add(new THREE.Vector3(0, 1.2, 0)), this.down);
      this.ray.far = 4;
      const hits = this.ray.intersectObjects(this.floors, false);
      if (hits[0]) {
        this.camera.position.y = hits[0].point.y + 1.7;
        this.velocity.y = 0;
      } else {
        this.camera.position.y -= 9.8 * dt;
      }
    }
  }
}
