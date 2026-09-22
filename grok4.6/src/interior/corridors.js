import * as THREE from "three";
import { SAUCER_R, POS } from "../config.js";

function segment(mats, length) {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, length), mats.deck);
  floor.position.y = 0;
  floor.name = "walkFloor";
  g.add(floor);
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, length), mats.interior);
  ceil.position.y = 2.45;
  g.add(ceil);
  for (const x of [-1.35, 1.35]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, length), mats.interior);
    wall.position.set(x, 1.2, 0);
    g.add(wall);
  }
  const n = Math.max(1, Math.round(length / 2.2));
  for (let i = 0; i < n; i++) {
    const z = -length / 2 + 1.1 + i * 2.2;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.6), mats.lightStrip);
    strip.position.set(0, 2.38, z);
    g.add(strip);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 0.12), mats.dark);
    rib.position.set(0, 1.2, z);
    g.add(rib);
  }
  return g;
}

export function buildCorridors(mats) {
  const root = new THREE.Group();
  root.name = "corridors";

  const hangarToEng = segment(mats, 28);
  hangarToEng.position.set(0, -6.55, -64);
  root.add(hangarToEng);

  const neck = new THREE.Group();
  const shaftFloor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.4), mats.deck);
  shaftFloor.position.set(0, -6.55, -18);
  shaftFloor.name = "walkFloor";
  neck.add(shaftFloor);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 34, 16, 1, true), mats.interior);
  tube.position.set(0, 12, 16);
  tube.rotation.x = 0.38;
  neck.add(tube);

  for (let i = 0; i < 12; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.1), mats.deck);
    const t = i / 11;
    step.position.set(0, -4 + t * 32, -16 + t * 30);
    step.rotation.x = 0.38;
    step.name = "walkFloor";
    neck.add(step);
  }
  root.add(neck);

  const ring = new THREE.Group();
  ring.position.set(POS.saucer.x, POS.saucer.y - 1.2, POS.saucer.z);
  const R = 18;
  const segs = 20;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const a2 = ((i + 1) / segs) * Math.PI * 2;
    const mid = (a + a2) / 2;
    const s = segment(mats, ((a2 - a) * R) + 0.4);
    s.position.set(Math.sin(mid) * R, 0, Math.cos(mid) * R);
    s.rotation.y = mid;
    ring.add(s);
  }
  const spoke = segment(mats, 16);
  spoke.position.set(0, 0, 8);
  ring.add(spoke);
  const toBridge = segment(mats, 10);
  toBridge.position.set(0, 6.6, 1.2);
  toBridge.rotation.x = -0.9;
  ring.add(toBridge);

  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.08), mats.glass);
    w.position.set(Math.sin(a) * (SAUCER_R - 1.2), 0.9, Math.cos(a) * (SAUCER_R - 1.2));
    w.lookAt(0, 0.9, 0);
    ring.add(w);
  }

  root.add(ring);
  return root;
}

export function buildInteriors(mats) {
  const g = new THREE.Group();
  g.name = "interiors";
  return g;
}
