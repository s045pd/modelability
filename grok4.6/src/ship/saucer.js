import * as THREE from "three";
import { SAUCER_R, POS } from "../config.js";
import { latheFromXY, addChild, makeDecal, mulberry32 } from "../utils.js";

function saucerGeometry() {
  const profile = [
    [0, -7.6],
    [5.5, -7.35],
    [14, -6.2],
    [26, -4.7],
    [40, -3.35],
    [52, -2.45],
    [61, -1.85],
    [67.2, -1.15],
    [69.6, -0.42],
    [70.85, 0.05],
    [70.85, 1.22],
    [69.1, 1.7],
    [62, 2.55],
    [50, 3.7],
    [36, 5.05],
    [22, 6.35],
    [12, 7.25],
    [6.2, 7.9],
    [2.4, 8.35],
    [0, 8.5],
  ];
  const geo = latheFromXY(profile, 192);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(
      i,
      pos.getX(i) / (SAUCER_R * 2) + 0.5,
      pos.getZ(i) / (SAUCER_R * 2) + 0.5
    );
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function addRingWindows(group, mats, { y, r, count, size, litRatio }) {
  const rnd = mulberry32(Math.floor(r * 10 + y * 3));
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const lit = new THREE.InstancedMesh(geo, mats.windowLit, count);
  const dark = new THREE.InstancedMesh(geo, mats.windowDark, count);
  lit.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  let li = 0;
  let di = 0;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.02;
    dummy.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    dummy.lookAt(0, y, 0);
    dummy.rotateY(Math.PI);
    dummy.updateMatrix();
    if (rnd() < litRatio) {
      lit.setMatrixAt(li++, dummy.matrix);
    } else {
      dark.setMatrixAt(di++, dummy.matrix);
    }
  }
  lit.count = li;
  dark.count = di;
  lit.instanceMatrix.needsUpdate = true;
  dark.instanceMatrix.needsUpdate = true;
  group.add(lit);
  group.add(dark);
}

function addPhaserStrip(group, mats, y, r) {
  const geo = new THREE.TorusGeometry(r, 0.18, 8, 160, Math.PI * 1.35);
  const mesh = new THREE.Mesh(geo, mats.dark);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  mesh.rotation.z = 0.4;
  group.add(mesh);
}

function addGreebles(group, mats) {
  const rnd = mulberry32(1701);
  const n = 720;
  const geo = new THREE.BoxGeometry(1, 0.08, 0.7);
  const mesh = new THREE.InstancedMesh(geo, mats.dark, n);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const t = Math.sqrt(rnd()) * 0.92;
    const r = 8 + t * (SAUCER_R - 10);
    const top = rnd() > 0.42;
    const y = top ? 2.2 + (1 - t) * (1 - t) * 6.1 : -(1.6 + (1 - t) * 5.2);
    dummy.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    dummy.lookAt(0, y, 0);
    dummy.rotateX(top ? -0.12 : 0.12);
    dummy.scale.set(0.6 + rnd() * 1.6, 1, 0.5 + rnd());
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  group.add(mesh);

  const rcsGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 8);
  const rcs = new THREE.InstancedMesh(rcsGeo, mats.dark, 36);
  let k = 0;
  for (let cluster = 0; cluster < 12; cluster++) {
    const a = (cluster / 12) * Math.PI * 2;
    const r = SAUCER_R - 2.4;
    for (let j = 0; j < 3; j++) {
      dummy.position.set(Math.sin(a) * r + (j - 1) * 0.4, 1.15, Math.cos(a) * r);
      dummy.rotation.set(Math.PI / 2, a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rcs.setMatrixAt(k++, dummy.matrix);
    }
  }
  group.add(rcs);
}

export function buildSaucer(mats, tex) {
  const g = new THREE.Group();
  g.name = "saucer";
  g.position.set(POS.saucer.x, POS.saucer.y, POS.saucer.z);

  const body = new THREE.Mesh(saucerGeometry(), mats.hull);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(SAUCER_R - 0.15, 0.55, 12, 192), mats.hullCyl);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.6;
  g.add(rim);

  const bridge = new THREE.Group();
  bridge.position.set(0, 9.35, 1.2);
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(6.1, 6.6, 2.6, 32), mats.hull);
  bridge.add(dome);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(6.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), mats.hull);
  cap.position.y = 1.15;
  bridge.add(cap);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 2.4), mats.dark);
  brow.position.set(0, 0.4, 5.4);
  bridge.add(brow);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const w = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.08), mats.windowLit);
    w.position.set(Math.sin(a) * 6.15, 0.35, Math.cos(a) * 6.15);
    w.lookAt(0, 0.35, 0);
    w.rotateY(Math.PI);
    bridge.add(w);
  }
  g.add(bridge);

  const sensor = new THREE.Mesh(new THREE.SphereGeometry(3.6, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.7), mats.dark);
  sensor.position.y = -7.7;
  sensor.rotation.x = Math.PI;
  g.add(sensor);
  const phaserDome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 24, 16), mats.glass);
  phaserDome.position.set(0, -8.4, 2);
  g.add(phaserDome);

  for (const side of [-1, 1]) {
    const impulse = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.2, 4.6), mats.dark);
    impulse.position.set(side * 16.5, 1.35, -62.5);
    impulse.rotation.y = side * 0.08;
    g.add(impulse);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.4, 0.2), mats.impulse);
    glow.position.set(side * 16.5, 1.35, -64.9);
    g.add(glow);
  }

  addRingWindows(g, mats, { y: 1.35, r: SAUCER_R - 0.2, count: 96, size: [1.35, 0.42, 0.1], litRatio: 0.72 });
  addRingWindows(g, mats, { y: 0.15, r: SAUCER_R - 0.35, count: 88, size: [1.1, 0.32, 0.1], litRatio: 0.55 });
  addRingWindows(g, mats, { y: -0.85, r: SAUCER_R - 1.6, count: 64, size: [1.0, 0.28, 0.1], litRatio: 0.4 });

  addPhaserStrip(g, mats, 2.6, 38);
  addPhaserStrip(g, mats, -3.1, 34);

  addGreebles(g, mats);

  const name = makeDecal(tex.nameOnly, 38, 7.5);
  name.rotation.x = -Math.PI / 2;
  name.position.set(0, 8.62, -22);
  g.add(name);

  const reg = makeDecal(tex.registry, 28, 7);
  reg.rotation.x = -Math.PI / 2;
  reg.position.set(0, 6.55, -44);
  g.add(reg);

  const airlock = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 20), mats.dark);
  airlock.rotation.x = Math.PI / 2;
  airlock.position.set(0, -7.9, 18);
  g.add(airlock);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.4), mats.hullCyl);
    pod.position.set(Math.sin(a) * 58, -2.15, Math.cos(a) * 58);
    pod.lookAt(0, -2.15, 0);
    g.add(pod);
  }

  const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), mats.windowLit.clone());
  navRed.material.color.set(0xff2222);
  navRed.material.emissive.set(0xff2222);
  navRed.position.set(-SAUCER_R, 1.4, 0);
  g.add(navRed);
  const navGreen = navRed.clone();
  navGreen.material = mats.windowLit.clone();
  navGreen.material.color.set(0x33ff66);
  navGreen.material.emissive.set(0x22ee55);
  navGreen.position.set(SAUCER_R, 1.4, 0);
  g.add(navGreen);

  addChild(g, new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 1.4), mats.dark), 0, 8.9, -6.8);

  return g;
}
