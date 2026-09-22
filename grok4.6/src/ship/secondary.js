import * as THREE from "three";
import { POS } from "../config.js";
import { latheFromXY, makeDecal } from "../utils.js";

function hullSkin() {
  const profile = [
    [0.2, 56],
    [9.5, 54],
    [14.8, 48],
    [17.6, 36],
    [18.4, 18],
    [17.9, 0],
    [16.6, -22],
    [15.2, -42],
    [14.2, -54],
    [13.6, -56],
  ];
  return latheFromXY(profile, 96);
}

export function buildSecondary(mats, tex) {
  const g = new THREE.Group();
  g.name = "secondary";
  g.position.set(POS.secondary.x, POS.secondary.y, POS.secondary.z);

  const outer = new THREE.Mesh(hullSkin(), mats.hullCyl);
  outer.rotation.x = Math.PI / 2;
  g.add(outer);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(13.4, 0.7, 10, 40), mats.hullCyl);
  lip.position.set(0, 0.2, -55.8);
  g.add(lip);

  const dish = new THREE.Mesh(
    latheFromXY(
      [
        [0, 0.2],
        [2.2, 0.6],
        [5.4, 1.4],
        [8.6, 2.2],
        [11.4, 2.55],
        [13.2, 2.1],
      ],
      64
    ),
    mats.dark
  );
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, -1.1, 54.2);
  g.add(dish);

  const emitter = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 24), mats.deflector);
  emitter.position.set(0, -1.1, 53.4);
  emitter.name = "deflectorGlow";
  g.add(emitter);

  for (let i = 1; i <= 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * 1.7, 0.07, 6, 48), mats.deflector);
    ring.position.set(0, -1.1, 53.8 + i * 0.08);
    g.add(ring);
  }

  const hangarFrame = new THREE.Mesh(new THREE.TorusGeometry(11.6, 0.55, 10, 32, Math.PI), mats.dark);
  hangarFrame.position.set(0, 0.6, -55.6);
  g.add(hangarFrame);

  for (const side of [-1, 1]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 16, 7), mats.hullCyl);
    door.position.set(side * 12.2, 0.2, -54);
    door.rotation.y = side * 0.18;
    g.add(door);
  }

  const field = new THREE.Mesh(new THREE.CircleGeometry(11.2, 32), mats.forcefield);
  field.position.set(0, 0.4, -56.2);
  field.name = "hangarField";
  g.add(field);

  for (const side of [-1, 1]) {
    const decal = makeDecal(tex.registry, 18, 4.6);
    decal.position.set(side * 18.05, 2.4, 8);
    decal.rotation.y = side * Math.PI / 2;
    g.add(decal);
  }

  const keel = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.2, 28), mats.dark);
  keel.position.set(0, -16.4, 8);
  g.add(keel);

  for (let i = 0; i < 2; i++) {
    const tube = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 2.8), mats.dark);
    tube.position.set(0, -12.2, 42 - i * 4.2);
    g.add(tube);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.2), mats.windowDark);
    mouth.position.set(0, -12.2, 43.5 - i * 4.2);
    g.add(mouth);
  }

  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 18; i++) {
      const z = 30 - i * 4.4;
      if (z < -48) continue;
      for (const side of [-1, 1]) {
        const lit = (i + row) % 3 !== 0;
        const w = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.55, 1.3),
          lit ? mats.windowLit : mats.windowDark
        );
        const r = 17.2 - Math.abs(z) * 0.02;
        w.position.set(side * r, 4.5 - row * 2.6, z);
        g.add(w);
      }
    }
  }

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 9, 6), mats.dark);
  antenna.position.set(0, 18.5, 22);
  g.add(antenna);
  const dish2 = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), mats.dark);
  dish2.position.set(0, 22.8, 22);
  dish2.rotation.x = -0.6;
  g.add(dish2);

  const light = new THREE.PointLight(0x4aa6ff, 40, 80, 2);
  light.position.set(0, -1, 56);
  g.add(light);

  return g;
}

export function buildNeck(mats) {
  const g = new THREE.Group();
  g.name = "neck";
  g.position.set(0, 12, 16);

  const skin = new THREE.Mesh(new THREE.BoxGeometry(8.4, 28, 14.5), mats.hullCyl);
  skin.position.y = 2;
  skin.rotation.x = 0.32;
  g.add(skin);

  const hollow = new THREE.Mesh(new THREE.BoxGeometry(6.2, 26, 8.8), mats.interior);
  hollow.position.set(0, 2, 0.2);
  hollow.rotation.x = 0.32;
  g.add(hollow);

  for (let i = 0; i < 8; i++) {
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 1.4), mats.windowLit);
      w.position.set(side * 4.25, -6 + i * 3.1, 2.4 - i * 0.35);
      g.add(w);
    }
  }

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 30, 16, 1, true), mats.dark);
  shaft.position.set(2.2, 2, -1);
  g.add(shaft);

  return g;
}
