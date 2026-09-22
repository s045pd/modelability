import * as THREE from "three";
import { buildShuttlebay } from "./shuttlebay.js";
import { buildEngineering } from "./engineering.js";
import { buildBridge } from "./bridge.js";
import { buildCorridors } from "./corridors.js";

export function buildInteriors(mats) {
  const g = new THREE.Group();
  g.name = "interiors";
  g.add(buildShuttlebay(mats));
  g.add(buildEngineering(mats));
  g.add(buildBridge(mats));
  g.add(buildCorridors(mats));
  return g;
}
