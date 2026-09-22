import * as THREE from 'three';

// 沿曲面铺贴花：fn(s,t) → [x,y,z]；s 沿阅读方向，t 自基线向上
export function surfaceDecal(fn, ns = 48, nt = 4, wantUp = 1) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nt; j++) for (let i = 0; i <= ns; i++) {
    const s = i / ns, t = j / nt;
    pos.push(...fn(s, t));
    uv.push(s, t);
  }
  const cols = ns + 1;
  for (let j = 0; j < nt; j++) for (let i = 0; i < ns; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ny = g.attributes.normal.getY(Math.floor(g.attributes.normal.count / 2));
  if (ny * wantUp < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) { const k = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = k; }
    g.computeVertexNormals();
  }
  return g;
}

export function decalMaterial(map, { rough = 0.55, metal = 0.2 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: rough, metalness: metal, transparent: false, alphaTest: 0.45, alphaToCoverage: true, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, shadowSide: THREE.FrontSide });
  m.userData.noShadow = true;
  return m;
}
