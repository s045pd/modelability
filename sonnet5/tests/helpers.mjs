import * as THREE from 'three';
import { World } from '../src/core/world.js';
import { Kit } from '../src/core/kit.js';

// 无需 DOM 的假材质表：任意属性都返回同一个基础材质
export function fakeMaterials() {
  const cache = {};
  return new Proxy(cache, { get: (t, k) => (k in t ? t[k] : (t[k] = new THREE.MeshBasicMaterial())) });
}

export function makeKit() {
  const world = new World();
  const kit = new Kit(world, fakeMaterials());
  return { world, kit };
}

export const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
