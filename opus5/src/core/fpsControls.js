import * as THREE from 'three';
import { PLAYER } from '../systems/collision.js';

const SPEED_WALK = 2.45;
const SPEED_RUN = 5.4;
const ACCEL = 14;

/** 指针锁定的第一人称行走控制，带惯性、头部起伏与碰撞解算。 */
export function createFpsControls(camera, dom, walk) {
  const state = {
    enabled: false,
    position: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    velocity: new THREE.Vector2(0, 0),
    bob: 0,
    floorY: 0,
    keys: new Set(),
    locked: false,
  };

  const onKey = (e, down) => {
    if (!state.enabled) return;
    const k = e.code;
    if (down) state.keys.add(k); else state.keys.delete(k);
    if (down && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(k)) e.preventDefault();
  };
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  const onMove = (e) => {
    if (!state.enabled || !state.locked) return;
    state.yaw -= e.movementX * 0.0022;
    state.pitch -= e.movementY * 0.0022;
    state.pitch = THREE.MathUtils.clamp(state.pitch, -1.45, 1.45);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === dom;
  });

  function requestLock() {
    if (state.enabled && !state.locked) dom.requestPointerLock();
  }
  dom.addEventListener('click', requestLock);

  function teleport(pos, yaw = 0) {
    state.position.set(pos.x, pos.y, pos.z);
    state.floorY = pos.y;
    state.yaw = yaw;
    state.pitch = 0;
    state.velocity.set(0, 0);
  }

  function update(dt) {
    if (!state.enabled) return;
    const forward = (state.keys.has('KeyW') ? 1 : 0) - (state.keys.has('KeyS') ? 1 : 0);
    const strafe = (state.keys.has('KeyD') ? 1 : 0) - (state.keys.has('KeyA') ? 1 : 0);
    const run = state.keys.has('ShiftLeft') || state.keys.has('ShiftRight');
    const speed = run ? SPEED_RUN : SPEED_WALK;

    const sin = Math.sin(state.yaw);
    const cos = Math.cos(state.yaw);
    // yaw=0 面向 -Z
    const wishX = (-sin * forward + cos * strafe);
    const wishZ = (-cos * forward - sin * strafe);
    const len = Math.hypot(wishX, wishZ) || 1;
    const targetX = (wishX / len) * speed * (forward || strafe ? 1 : 0);
    const targetZ = (wishZ / len) * speed * (forward || strafe ? 1 : 0);

    state.velocity.x += (targetX - state.velocity.x) * Math.min(1, ACCEL * dt);
    state.velocity.y += (targetZ - state.velocity.y) * Math.min(1, ACCEL * dt);

    const from = state.position;
    const to = {
      x: from.x + state.velocity.x * dt,
      z: from.z + state.velocity.y * dt,
    };
    const res = walk.resolve(from, to, state.floorY);
    state.position.x = res.x;
    state.position.z = res.z;
    state.floorY += (res.y - state.floorY) * Math.min(1, 16 * dt);
    state.position.y = state.floorY;

    const moving = Math.hypot(state.velocity.x, state.velocity.y);
    state.bob += dt * moving * (run ? 2.1 : 1.65);
    const bobY = Math.sin(state.bob * 3.4) * 0.028 * Math.min(1, moving / 2);
    const bobR = Math.cos(state.bob * 1.7) * 0.0075 * Math.min(1, moving / 2);

    camera.position.set(state.position.x, state.position.y + PLAYER.eye + bobY, state.position.z);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(state.yaw);
    camera.rotateX(state.pitch);
    camera.rotateZ(bobR);
  }

  return {
    state,
    update,
    teleport,
    requestLock,
    set enabled(v) {
      state.enabled = v;
      if (!v && document.pointerLockElement === dom) document.exitPointerLock();
    },
    get enabled() { return state.enabled; },
    get locked() { return state.locked; },
  };
}
