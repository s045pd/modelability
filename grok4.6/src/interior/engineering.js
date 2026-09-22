import * as THREE from "three";

export function buildEngineering(mats) {
  const g = new THREE.Group();
  g.name = "engineeringInterior";
  g.position.set(0, 0, -46);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 42), mats.deck);
  floor.position.y = -6.4;
  floor.name = "walkFloor";
  g.add(floor);

  const cat = new THREE.Mesh(new THREE.BoxGeometry(16, 0.18, 36), mats.dark);
  cat.position.y = 3.6;
  cat.name = "walkFloor";
  g.add(cat);

  for (const y of [-6.2, 3.6]) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.4, 24), mats.dark);
    hole.position.y = y;
    g.add(hole);
  }

  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 22, 32, 1, true), mats.core);
  core.position.y = 2;
  core.name = "warpCore";
  g.add(core);
  const coreIn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 22, 16), mats.deflector);
  coreIn.position.y = 2;
  coreIn.name = "warpCoreInner";
  g.add(coreIn);

  for (let i = 0; i < 10; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 8, 24), mats.dark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -6 + i * 2.1;
    g.add(ring);
  }

  for (const x of [-8.8, 8.8]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 16, 42), mats.interior);
    wall.position.set(x, 1.4, 0);
    g.add(wall);
    for (let i = 0; i < 8; i++) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 14, 8), mats.dark);
      pipe.position.set(x - Math.sign(x) * 0.6, 1, -14 + i * 4);
      g.add(pipe);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), mats.screen);
      panel.position.set(x - Math.sign(x) * 0.2, 1.8, -12 + i * 4);
      panel.rotation.y = Math.sign(x) * -Math.PI / 2;
      g.add(panel);
    }
  }

  const rail = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.08, 6, 24), mats.marking);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 4.0;
  g.add(rail);

  for (const z of [-18, 18]) {
    const bulk = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 0.4), mats.interior);
    bulk.position.set(0, 1.4, z);
    g.add(bulk);
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.5), mats.dark);
    door.position.set(0, -4.6, z);
    g.add(door);
  }

  const light = new THREE.PointLight(0x88d8ff, 30, 40, 2);
  light.position.set(0, 6, 0);
  g.add(light);

  const intermix = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 8), mats.dark);
  intermix.position.set(0, -5.1, 12);
  g.add(intermix);

  return g;
}
