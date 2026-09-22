import * as THREE from "three";

function shuttle(mats) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.6, 6.8), mats.hullCyl);
  hull.position.y = 1.05;
  g.add(hull);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.5, 2.2, 10), mats.hullCyl);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.05, 4.3);
  g.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8, 0, Math.PI * 2, 0, 1.2), mats.glass);
  canopy.position.set(0, 1.7, 2.4);
  g.add(canopy);
  const impulse = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.2), mats.impulse);
  impulse.position.set(0, 1.0, -3.5);
  g.add(impulse);
  return g;
}

export function buildShuttlebay(mats) {
  const g = new THREE.Group();
  g.name = "hangarInterior";
  g.position.set(0, 0, -88);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.35, 36), mats.deck);
  floor.position.y = -6.7;
  floor.name = "walkFloor";
  g.add(floor);

  const hazard = new THREE.Mesh(new THREE.BoxGeometry(8, 0.05, 34), mats.hazard);
  hazard.position.y = -6.5;
  g.add(hazard);

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 36), mats.interior);
  ceil.position.y = 8.4;
  g.add(ceil);

  for (const x of [-11, 11]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 15.2, 36), mats.interior);
    wall.position.set(x, 0.9, 0);
    g.add(wall);
  }
  const forward = new THREE.Mesh(new THREE.BoxGeometry(22, 15.2, 0.4), mats.interior);
  forward.position.set(0, 0.9, 18);
  g.add(forward);

  for (let i = 0; i < 9; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(18, 0.12, 0.28), mats.lightStrip);
    strip.position.set(0, 8.2, -14 + i * 4);
    g.add(strip);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 0.4), mats.dark);
    rib.position.set(0, 8.1, -14 + i * 4);
    g.add(rib);
  }

  for (let i = 0; i < 6; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.8), mats.dark);
    crate.position.set(-8.5 + (i % 3) * 2.1, -5.8, 10 - Math.floor(i / 3) * 2.4);
    g.add(crate);
  }

  const s1 = shuttle(mats);
  s1.position.set(-5.5, -6.55, -4);
  s1.rotation.y = 0.12;
  g.add(s1);
  const s2 = shuttle(mats);
  s2.position.set(5.8, -6.55, 2);
  s2.rotation.y = -0.2;
  g.add(s2);

  const booth = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 4), mats.interior);
  booth.position.set(7.5, -4.9, 14);
  g.add(booth);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 0.08), mats.glass);
  glass.position.set(7.5, -4.2, 12);
  g.add(glass);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), mats.screen);
  screen.position.set(7.5, -4.1, 12.05);
  g.add(screen);

  const tractor = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 1.2, 16), mats.dark);
  tractor.position.set(0, 7.6, -6);
  g.add(tractor);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.6, 12, 10, 1, true), mats.forcefield);
  beam.position.set(0, 1.4, -6);
  g.add(beam);

  for (const x of [-9, 9]) {
    const light = new THREE.PointLight(0xffe6c4, 18, 36, 1.6);
    light.position.set(x, 6.5, 0);
    g.add(light);
  }

  const hatch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.6, 0.2), mats.dark);
  hatch.position.set(0, -4.6, 17.7);
  g.add(hatch);

  return g;
}
