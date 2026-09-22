import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = new Set(['position', 'normal', 'uv']);

// 按材质合并静态几何，避免数万 draw call
export class Batcher {
  constructor() {
    this.buckets = new Map();
    this.count = 0;
  }

  add(material, geometry, matrix, color) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (material.vertexColors) {
      const c = color || [1, 1, 1];
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2]; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    let list = this.buckets.get(material);
    if (!list) { list = []; this.buckets.set(material, list); }
    list.push(g);
    this.count++;
  }

  build(parent, { cast = true, receive = true, name = 'batch' } = {}) {
    const meshes = [];
    for (const [material, list] of this.buckets) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = name;
      mesh.castShadow = cast && !material.userData.noShadow;
      mesh.receiveShadow = receive;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.buckets.clear();
    return meshes;
  }
}
