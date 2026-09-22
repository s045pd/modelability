import * as THREE from 'three';
import { buildSaucer } from './saucer.js';
import { buildEngineeringHull } from './engineeringHull.js';
import { buildNeck, buildPylons } from './struts.js';
import { buildNacelles } from './nacelles.js';

export function buildEnterprise() {
  const group = new THREE.Group();
  group.name = 'enterprise';

  const saucer = buildSaucer();
  const engineering = buildEngineeringHull();
  const neck = buildNeck();
  const pylons = buildPylons();
  const nacelles = buildNacelles();

  for (const part of [saucer, engineering, neck, pylons, nacelles]) group.add(part.group);

  return { group, saucer, engineering, neck, pylons, nacelles };
}
