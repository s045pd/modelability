import * as THREE from "three";
import { POS } from "../config.js";

function station(mats, w = 1.8) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, 0.9), mats.dark);
  body.position.y = 0.55;
  g.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, 0.42), mats.screen);
  screen.position.set(0, 0.95, -0.2);
  screen.rotation.x = -0.35;
  g.add(screen);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.7), mats.marking);
  seat.position.set(0, 0.42, 0.85);
  g.add(seat);
  return g;
}

export function buildBridge(mats) {
  const g = new THREE.Group();
  g.name = "bridgeInterior";
  g.position.set(POS.bridge.x, POS.bridge.y - 1.55, POS.bridge.z);

  const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.3, 6.3, 0.22, 32), mats.deck);
  floor.position.y = 0;
  floor.name = "walkFloor";
  g.add(floor);

  const pit = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.45, 24), mats.dark);
  pit.position.y = 0.12;
  g.add(pit);

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 3.4, 32, 1, true), mats.interior);
  wall.position.y = 1.7;
  g.add(wall);

  const ceiling = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 5.2, 0.25, 32), mats.interior);
  ceiling.position.y = 3.35;
  g.add(ceiling);

  const light = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), mats.lightStrip);
  light.rotation.x = Math.PI / 2;
  light.position.y = 3.2;
  g.add(light);

  const view = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.8), mats.screen);
  view.position.set(0, 1.7, 6.15);
  g.add(view);
  const viewGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.0), mats.forcefield);
  viewGlow.position.set(0, 1.7, 6.12);
  g.add(viewGlow);

  const helm = station(mats, 2.6);
  helm.position.set(0, 0, 1.5);
  g.add(helm);

  const chair = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 1.05), mats.marking);
  chair.position.set(0, 0.7, -0.9);
  g.add(chair);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.3, 0.18), mats.marking);
  back.position.set(0, 1.35, -1.4);
  g.add(back);

  for (let i = 0; i < 8; i++) {
    const a = -0.9 + (i / 7) * 4.9;
    const st = station(mats, 1.35);
    st.position.set(Math.sin(a) * 5.15, 0, Math.cos(a) * 5.15);
    st.lookAt(0, 0, 0);
    g.add(st);
  }

  const rail = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.05, 6, 24, Math.PI * 1.5), mats.impulse);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.85;
  g.add(rail);

  const lift = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 16), mats.dark);
  lift.position.set(-4.6, 0.12, -3.2);
  lift.name = "walkFloor";
  g.add(lift);

  const pl = new THREE.PointLight(0xffe6c8, 12, 18, 2);
  pl.position.set(0, 3, 0);
  g.add(pl);

  return g;
}
