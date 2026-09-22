import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createExteriorControls(camera, dom) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.6;
  controls.minDistance = 40;
  controls.maxDistance = 6500;
  controls.target.set(0, -6, -20);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.18;

  let idle = 0;
  const wake = () => { idle = 0; controls.autoRotate = false; };
  for (const ev of ['pointerdown', 'wheel', 'touchstart', 'keydown']) {
    dom.addEventListener(ev, wake, { passive: true });
  }

  let tween = null;
  function flyTo(position, target, duration = 2.2) {
    tween = {
      t: 0, duration,
      p0: camera.position.clone(), p1: position.clone(),
      t0: controls.target.clone(), t1: target.clone(),
    };
    controls.autoRotate = false;
    idle = 0;
  }

  function update(dt) {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.duration);
      const k = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - (-2 * tween.t + 2) ** 3 / 2;
      camera.position.lerpVectors(tween.p0, tween.p1, k);
      controls.target.lerpVectors(tween.t0, tween.t1, k);
      if (tween.t >= 1) tween = null;
    } else {
      idle += dt;
      if (idle > 9) controls.autoRotate = true;
    }
    controls.update();
  }

  return { controls, update, flyTo, get busy() { return !!tween; } };
}

/** 预设机位。 */
export const VIEWPOINTS = {
  hero: { pos: new THREE.Vector3(430, 190, 560), target: new THREE.Vector3(0, -6, -20) },
  beauty: { pos: new THREE.Vector3(-620, 250, -430), target: new THREE.Vector3(0, -10, -60) },
  top: { pos: new THREE.Vector3(0, 780, 120), target: new THREE.Vector3(0, 0, 60) },
  nacelle: { pos: new THREE.Vector3(215, 120, -340), target: new THREE.Vector3(95, 55, -230) },
  deflector: { pos: new THREE.Vector3(120, -40, 210), target: new THREE.Vector3(0, -48, 20) },
  bow: { pos: new THREE.Vector3(30, 60, 640), target: new THREE.Vector3(0, 0, 150) },
};
