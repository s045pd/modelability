import * as THREE from "three";
import { buildSaucer } from "./saucer.js";
import { buildSecondary, buildNeck } from "./secondary.js";
import { buildNacelles } from "./nacelles.js";
import { buildDetails } from "./details.js";
import { patchAztecShader } from "../materials.js";

export function buildEnterprise(mats, tex) {
  patchAztecShader(mats.hull, true);
  patchAztecShader(mats.hullCyl, false);

  const ship = new THREE.Group();
  ship.name = "USS-Enterprise";

  ship.add(buildSaucer(mats, tex));
  ship.add(buildSecondary(mats, tex));
  ship.add(buildNeck(mats));
  ship.add(buildNacelles(mats));
  ship.add(buildDetails(mats));

  const strobe = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2,
    })
  );
  strobe.name = "strobe";
  strobe.position.set(0, 41.4, 48);
  ship.add(strobe);

  ship.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = true;
    }
  });

  return ship;
}

export function tickShip(ship, t) {
  const strobe = ship.getObjectByName("strobe");
  if (strobe) {
    const on = Math.sin(t * 6.2) > 0.65;
    strobe.material.emissiveIntensity = on ? 8 : 0.05;
    strobe.visible = true;
  }
  ship.traverse((o) => {
    if (o.name === "bussardCore") {
      o.rotation.z = t * 1.8;
      o.material.emissiveIntensity = 2.4 + Math.sin(t * 5) * 0.8;
    }
    if (o.name === "deflectorGlow") {
      o.material.emissiveIntensity = 3.6 + Math.sin(t * 2.2) * 0.9;
    }
    if (o.name === "hangarField") {
      o.material.opacity = 0.08 + Math.sin(t * 3.5) * 0.04;
    }
    if (o.name === "warpGrille") {
      o.material.emissiveIntensity = 3.2 + Math.sin(t * 1.4) * 0.5;
    }
  });
}
