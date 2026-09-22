/**
 * 几何回归测试：程序化船体最容易出的两类错误是
 *   1) 参数曲面法线朝内（外观会被"反着打光"）
 *   2) 极点退化产生 NaN（经 bloom 可分离模糊后会变成整块矩形黑斑）
 * 这两类问题在截图上都不易一眼认出，所以用断言守住。
 */
import * as THREE from 'three';
import { surfaceNormal, parametricSurface } from '../src/lib/geom.js';
import { saucerSurface } from '../src/ship/saucer.js';
import { engineeringSurface } from '../src/ship/engineeringHull.js';
import { neckSurface, pylonSurface } from '../src/ship/struts.js';
import { nacelleSurface } from '../src/ship/nacelles.js';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ok   ${msg}`);
  else { console.log(`  FAIL ${msg}`); failures++; }
};

/** 法线应当背离部件内部的参考点。 */
function assertOutward(name, fn, center, flip = false) {
  let inward = 0;
  for (let i = 1; i < 24; i++) {
    for (let j = 0; j < 18; j++) {
      const u = i / 24;
      const v = j / 18;
      const p = fn(u, v);
      const n = surfaceNormal(fn, u, v, flip);
      if (n.dot(p.clone().sub(center).normalize()) <= 0) inward++;
    }
  }
  ok(inward === 0, `${name}: 法线全部朝外 (朝内 ${inward} 处)`);
}

/** 翼型部件用弦向厚度判断，质心法不适用。 */
function assertAirfoilOutward(name, fn, sx, flip) {
  let wrong = 0;
  for (let i = 1; i < 12; i++) {
    for (const v of [0.12, 0.25, 0.38, 0.62, 0.75, 0.88]) {
      const n = surfaceNormal(fn, i / 12, v, flip);
      if (Math.sign(n.x) !== Math.sign((v < 0.5 ? 1 : -1) * sx)) wrong++;
    }
  }
  ok(wrong === 0, `${name}: 翼面法线朝外 (错误 ${wrong} 处)`);
}

function assertFinite(name, fn, uSegs, vSegs) {
  const g = parametricSurface(fn, uSegs, vSegs);
  let bad = 0;
  for (const key of ['position', 'normal', 'uv']) {
    const a = g.getAttribute(key).array;
    for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) bad++;
  }
  let zeroNormals = 0;
  const n = g.getAttribute('normal').array;
  for (let i = 0; i < n.length; i += 3) {
    if (n[i] ** 2 + n[i + 1] ** 2 + n[i + 2] ** 2 < 0.25) zeroNormals++;
  }
  ok(bad === 0, `${name}: 顶点属性无 NaN/Inf`);
  ok(zeroNormals === 0, `${name}: 无零长法线 (${zeroNormals} 个)`);
}

console.log('外壳曲面朝向');
assertOutward('碟部', saucerSurface(), new THREE.Vector3(0, 3, 118));
assertOutward('工程船体', engineeringSurface(), new THREE.Vector3(0, -62, -140));
assertOutward('颈部', neckSurface(), new THREE.Vector3(0, -24, -8));
assertOutward('右舷引擎舱', nacelleSurface(1), new THREE.Vector3(97, 52, -215));
assertOutward('左舷引擎舱', nacelleSurface(-1), new THREE.Vector3(-97, 52, -215), true);
assertAirfoilOutward('右舷挂架', pylonSurface(1), 1, false);
assertAirfoilOutward('左舷挂架', pylonSurface(-1), -1, true);

console.log('顶点数值健全性');
assertFinite('碟部', saucerSurface(), 60, 90);
assertFinite('工程船体', engineeringSurface(), 60, 48);
assertFinite('颈部', neckSurface(), 30, 40);
assertFinite('引擎舱', nacelleSurface(1), 40, 36);
assertFinite('挂架', pylonSurface(1), 30, 36);

console.log('主尺度');
const box = new THREE.Box3();
const v = new THREE.Vector3();
for (const fn of [saucerSurface(), engineeringSurface(), neckSurface(),
  pylonSurface(1), pylonSurface(-1), nacelleSurface(1), nacelleSurface(-1)]) {
  for (let i = 0; i <= 20; i++) {
    for (let j = 0; j <= 24; j++) box.expandByPoint(fn(i / 20, j / 24));
  }
}
box.getSize(v);
ok(Math.abs(v.z - 642.5) < 40, `全长 ${v.z.toFixed(1)}m ≈ 642.5m`);
ok(Math.abs(v.x - 463.7) < 30, `全宽 ${v.x.toFixed(1)}m ≈ 463.7m`);
ok(Math.abs(v.y - 195.3) < 45, `全高 ${v.y.toFixed(1)}m ≈ 195.3m`);

console.log(failures ? `\n${failures} 项失败` : '\n全部通过');
process.exit(failures ? 1 : 0);
