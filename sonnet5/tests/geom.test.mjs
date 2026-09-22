import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { latheGeo, loftGeo, superSection } from '../src/core/geom.js';
import { saucerProfile, saucerTopY, saucerBotY } from '../src/exterior/profile.js';

const v = (g, i) => new THREE.Vector3(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i));
const n = (g, i) => new THREE.Vector3(g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i));

// 每个三角形的几何法线应与其顶点法线同向（面朝外）
function windingAgreesWithNormals(g) {
  const ix = g.index.array;
  let bad = 0, total = 0;
  for (let i = 0; i < ix.length; i += 3) {
    const a = v(g, ix[i]), b = v(g, ix[i + 1]), c = v(g, ix[i + 2]);
    const face = b.clone().sub(a).cross(c.clone().sub(a));
    if (face.lengthSq() < 1e-12) continue;
    total++;
    const nn = n(g, ix[i]).add(n(g, ix[i + 1])).add(n(g, ix[i + 2]));
    if (face.dot(nn) < 0) bad++;
  }
  return { bad, total };
}

test('车削圆柱：法线朝外且绕序一致', () => {
  const g = latheGeo([[2, 0], [2, 3]], 24);
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = v(g, i), nm = n(g, i);
    assert.ok(nm.x * p.x + nm.z * p.z > 0, '径向分量应为正');
  }
  const r = windingAgreesWithNormals(g);
  assert.equal(r.bad, 0);
  assert.ok(r.total > 0);
});

test('碟体剖面：顶面法线朝上、底面法线朝下', () => {
  const g = latheGeo(saucerProfile(), 48);
  let top = 0, bottom = 0;
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = v(g, i), nm = n(g, i), r = Math.hypot(p.x, p.z);
    if (r > 20 && r < 40 && p.y > 0) { assert.ok(nm.y > 0.8); top++; }
    if (r > 20 && r < 40 && p.y < 0) { assert.ok(nm.y < -0.8); bottom++; }
  }
  assert.ok(top > 0 && bottom > 0);
  assert.equal(windingAgreesWithNormals(g).bad, 0);
});

test('碟体上下表面高度查询单调且上表面高于下表面', () => {
  let prevTop = Infinity;
  for (let r = 0; r <= 60; r += 5) {
    const t = saucerTopY(r), b = saucerBotY(r);
    assert.ok(t > b);
    assert.ok(t <= prevTop + 1e-6);
    prevTop = t;
  }
});

test('放样体：法线背离轴线', () => {
  const secs = [0, 5, 10].map((z) => superSection(new THREE.Vector3(0, 0, z), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 3, 2, 3, 32));
  const g = loftGeo(secs, { capStart: false, capEnd: false });
  for (let i = 0; i < g.attributes.position.count; i += 7) {
    const p = v(g, i), nm = n(g, i);
    assert.ok(nm.x * p.x + nm.y * p.y > 0);
  }
});
