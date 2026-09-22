import * as THREE from "three";
import { POS } from "../config.js";

function nacelleBody(mats) {
  const g = new THREE.Group();
  const len = 142;
  const shape = new THREE.Shape();
  const w = 6.4;
  const h = 5.6;
  shape.moveTo(-w, 0);
  shape.lineTo(-w * 0.7, h);
  shape.lineTo(w * 0.7, h);
  shape.lineTo(w, 0);
  shape.lineTo(w * 0.7, -h);
  shape.lineTo(-w * 0.7, -h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: len,
    bevelEnabled: true,
    bevelThickness: 0.6,
    bevelSize: 0.6,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.translate(0, 0, -len * 0.55);
  const body = new THREE.Mesh(geo, mats.hullCyl);
  g.add(body);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7.6, 108), mats.warp);
  grille.position.set(0, 0, -8);
  grille.name = "warpGrille";
  g.add(grille);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.6, 10, 8), mats.hullCyl);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 64;
  g.add(cap);

  const bussard = new THREE.Mesh(new THREE.SphereGeometry(5.9, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.72), mats.bussard);
  bussard.rotation.x = Math.PI / 2;
  bussard.position.z = 72.5;
  bussard.name = "bussard";
  g.add(bussard);

  const inner = new THREE.Mesh(new THREE.SphereGeometry(4.4, 24, 16), mats.impulse);
  inner.position.z = 70.4;
  inner.name = "bussardCore";
  g.add(inner);

  for (let i = 0; i < 12; i++) {
    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 8.8, 0.5), mats.dark);
    vane.position.z = 71.6;
    vane.rotation.z = (i / 12) * Math.PI;
    g.add(vane);
  }

  const aft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.8, 8, 8), mats.dark);
  aft.rotation.x = Math.PI / 2;
  aft.position.z = -82;
  g.add(aft);

  const ribs = 18;
  for (let i = 0; i < ribs; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.12, 0.35), mats.dark);
    rib.position.z = 40 - i * 7;
    g.add(rib);
  }

  const light = new THREE.PointLight(0xff3318, 28, 55, 2);
  light.position.z = 74;
  g.add(light);
  const wlight = new THREE.PointLight(0x79c7ff, 16, 50, 2);
  wlight.position.set(0, 0, -8);
  g.add(wlight);

  return g;
}

function strut(from, to, r0, r1, mat) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 10), mat);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export function buildNacelles(mats) {
  const g = new THREE.Group();
  g.name = "nacelles";

  const port = nacelleBody(mats);
  port.position.set(POS.nacellePort.x, POS.nacellePort.y, POS.nacellePort.z);
  port.rotation.y = 0;
  const grilleP = port.getObjectByName("warpGrille");
  if (grilleP) grilleP.position.x = 6.55;
  g.add(port);

  const stbd = nacelleBody(mats);
  stbd.position.set(POS.nacelleStbd.x, POS.nacelleStbd.y, POS.nacelleStbd.z);
  const grilleS = stbd.getObjectByName("warpGrille");
  if (grilleS) grilleS.position.x = -6.55;
  g.add(stbd);

  g.add(
    strut(
      new THREE.Vector3(-14, 12, -48),
      new THREE.Vector3(-42.5, 21.5, -68),
      2.6,
      1.7,
      mats.hullCyl
    )
  );
  g.add(
    strut(
      new THREE.Vector3(14, 12, -48),
      new THREE.Vector3(42.5, 21.5, -68),
      2.6,
      1.7,
      mats.hullCyl
    )
  );
  g.add(
    strut(
      new THREE.Vector3(-10, 8, -40),
      new THREE.Vector3(-18, 14, -52),
      1.8,
      1.4,
      mats.hullCyl
    )
  );
  g.add(
    strut(
      new THREE.Vector3(10, 8, -40),
      new THREE.Vector3(18, 14, -52),
      1.8,
      1.4,
      mats.hullCyl
    )
  );

  return g;
}
