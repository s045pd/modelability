import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { insideBounds, moveWithCollision } from '../src/geometry.js';

// A raster surface is the only browser dependency of the procedural material factory.
const gradient = { addColorStop() {} };
const ctx = new Proxy({ measureText: text => ({ width: String(text).length * 8 }), createLinearGradient: () => gradient, createRadialGradient: () => gradient, getImageData: () => ({ data: new Uint8ClampedArray(16) }) }, { get: (o, key) => key in o ? o[key] : () => {} });
globalThis.document = { createElement: () => ({ width: 1, height: 1, getContext: () => ctx }) };
const module = await import('../src/interiors.js').catch(() => ({}));

test('interiors exports the room constructor', () => assert.equal(typeof module.createInterior, 'function'));
for (const kind of ['bridge', 'engineering', 'hangar']) {
  test(`${kind} has valid walkable spawn, owned lights, furnished finite geometry and bounded rendering cost`, () => {
    assert.equal(typeof module.createInterior, 'function', 'missing interior constructor');
    const room = module.createInterior(THREE, kind);
    assert.ok(room.group.isGroup);
    assert.equal(room.spawn.position[1], 1.68);
    assert.ok(insideBounds(room.spawn.position[0], room.spawn.position[2], room.bounds));
    assert.equal(typeof room.update, 'function');
    let meshes = 0, lights = 0, instances = 0;
    room.group.traverse(node => {
      if (node.isLight) lights++;
      if (node.isMesh) {
        meshes++;
        instances += node.isInstancedMesh ? node.count : 1;
        for (const key of ['position', 'normal']) {
          const attribute = node.geometry.getAttribute(key);
          if (attribute) for (const value of attribute.array) assert.ok(Number.isFinite(value), `${node.name}: non-finite ${key}`);
        }
      }
    });
    assert.ok(meshes < 350, `draw calls ${meshes}`);
    assert.ok(instances > 100, `expected furnished room, got ${instances} elements`);
    assert.ok(lights >= 3 && lights <= 5, `light budget ${lights}`);
    const stay = moveWithCollision({ x: room.spawn.position[0], z: room.spawn.position[2] }, { x: 0.02, z: 0.02 }, room.bounds, room.obstacles);
    assert.ok(Math.abs(stay.x - room.spawn.position[0] - .02) < .001, 'spawn overlaps obstacle');
    room.update(1, .016);
  });
}
test('bridge has 3 command seats, two helm stations, tactical horseshoe, LCARS and viewscreen', () => {
  assert.equal(typeof module.createInterior, 'function');
  const { group } = module.createInterior(THREE, 'bridge');
  for (const name of ['command-chair-0', 'command-chair-1', 'command-chair-2', 'helm-port', 'helm-starboard', 'tactical-horseshoe', 'main-viewscreen']) assert.ok(group.getObjectByName(name), name);
});
test('bridge corridor is physically connected and an operable door changes collision', () => {
  assert.equal(typeof module.createInterior, 'function');
  const room = module.createInterior(THREE, 'bridge');
  assert.ok(room.corridorSpawn);
  assert.ok(insideBounds(...[room.corridorSpawn.position[0], room.corridorSpawn.position[2]], room.bounds));
  const door = room.doors[0];
  assert.ok(door && typeof door.activate === 'function');
  const x = door.position[0], z = door.position[2];
  const before = moveWithCollision({ x, z: z - 1 }, { x: 0, z: 2 }, room.bounds, room.obstacles);
  assert.ok(before.z < z, 'closed door must block passage');
  door.activate();
  for (let i = 0; i < 100; i++) room.update(i / 30, 1 / 30);
  const after = moveWithCollision({ x, z: z - 1 }, { x: 0, z: 25 }, room.bounds, room.obstacles);
  assert.ok(after.z > z + 20, 'open corridor must support at least 20 metres of unblocked walking');
  door.activate();
  for (let i = 0; i < 100; i++) room.update(i / 30, 1 / 30);
  assert.ok(moveWithCollision({ x, z: z - 1 }, { x: 0, z: 2 }, room.bounds, room.obstacles).z < z);
});
test('engineering and hangar provide distinctive core and shuttle architecture', () => {
  assert.equal(typeof module.createInterior, 'function');
  assert.ok(module.createInterior(THREE, 'engineering').group.getObjectByName('warp-core'));
  const hangar = module.createInterior(THREE, 'hangar');
  assert.ok(hangar.group.getObjectByName('shuttle-01'));
  assert.ok(hangar.group.getObjectByName('shuttle-02'));
  assert.ok(hangar.group.getObjectByName('shuttlebay-forcefield'));
});
test('invalid room names fail explicitly rather than returning an undefined scene', () => {
  assert.equal(typeof module.createInterior, 'function');
  assert.throws(() => module.createInterior(THREE, 'unknown'), /Unknown interior/);
});
test('custom shuttle hulls expose outward faces rather than invisible inverted shells', () => {
  const room = module.createInterior(THREE, 'hangar');
  let hulls = 0;
  room.group.traverse(node => {
    if (!node.isMesh || node.geometry.type !== 'BufferGeometry') return;
    hulls++;
    const geometry = node.geometry, p = geometry.attributes.position, n = geometry.attributes.normal;
    geometry.computeBoundingBox();
    const centre = geometry.boundingBox.getCenter(new THREE.Vector3());
    for (let i = 0; i < p.count; i += 3) {
      const midpoint = new THREE.Vector3().fromBufferAttribute(p, i).add(new THREE.Vector3().fromBufferAttribute(p, i + 1)).add(new THREE.Vector3().fromBufferAttribute(p, i + 2)).multiplyScalar(1 / 3);
      assert.ok(midpoint.sub(centre).dot(new THREE.Vector3().fromBufferAttribute(n, i)) > 0, 'inward shuttle hull face');
    }
  });
  assert.equal(hulls, 4);
});
test('each interior owns one bounded shadow-producing key light for grounded furnishings', () => {
  for (const kind of ['bridge', 'engineering', 'hangar']) {
    const room = module.createInterior(THREE, kind), keys = [];
    room.group.traverse(node => { if (node.isLight && node.castShadow) keys.push(node); });
    assert.equal(keys.length, 1, `${kind}: expected one soft-shadow key`);
    assert.ok(keys[0].isSpotLight, 'one shadow-map pass, not a six-pass point light');
    assert.ok(keys[0].shadow.mapSize.x <= 2048);
    assert.ok(keys[0].target.parent, 'light target must be owned by room group');
  }
});
test('core containment railing prevents walking through its front safety perimeter', () => {
  const room = module.createInterior(THREE, 'engineering');
  const stop = moveWithCollision({ x: 0, z: 4 }, { x: 0, z: -10 }, room.bounds, room.obstacles);
  assert.ok(stop.z > -1.3, 'foot movement penetrated the core safety railing');
  assert.ok(stop.z < 0, 'safety perimeter should not block the approach aisle');
});
test('warp plasma segments are externally visible instead of enclosed by the steel support', () => {
  const room = module.createInterior(THREE, 'engineering');
  room.group.updateMatrixWorld(true);
  const core = room.group.getObjectByName('warp-core');
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.3, 0), new THREE.Vector3(0, 0, -1));
  const hits = ray.intersectObject(core, true);
  assert.ok(hits.length, 'ray must hit the reaction assembly');
  assert.equal(hits[0].object.material.emissive?.getHex(), 0x349bff, 'opaque support hides the glowing plasma segment');
});
test('bridge viewscreen backing blocks movement before a visitor crosses the screen surface', () => {
  const room = module.createInterior(THREE, 'bridge');
  const stopped = moveWithCollision({ x: 0, z: -7.8 }, { x: 0, z: -2 }, room.bounds, room.obstacles);
  assert.ok(stopped.z > -8.2, 'visitor walked behind the screen plane');
  assert.ok(stopped.z < -7.8, 'screen obstacle must still allow a short approach');
});
test('bridge arrival is a clear three-quarter composition rather than a close-up of a chair back', () => {
  const room = module.createInterior(THREE, 'bridge');
  room.group.updateMatrixWorld(true);
  const eye = new THREE.Vector3(...room.spawn.position);
  assert.ok(eye.x >= 4.5 && eye.x <= 6.2, 'arrival must be offset into the starboard rear aisle');
  for (let i = 0; i < 3; i++) {
    const chair = room.group.getObjectByName(`command-chair-${i}`);
    assert.ok(eye.distanceTo(chair.getWorldPosition(new THREE.Vector3())) > 4, 'chair dominates arrival view');
  }
  const direction = new THREE.Vector3(0, 2.25, -8.415).sub(eye).normalize();
  const first = new THREE.Raycaster(eye, direction).intersectObject(room.group, true)[0];
  assert.equal(first?.object.name, 'main-viewscreen', 'arrival sightline to screen must not hit chair backs');
  const camera = new THREE.PerspectiveCamera(68, 1.44, .045, 180);
  camera.position.copy(eye); camera.rotation.set(room.spawn.pitch, room.spawn.yaw, 0, 'YXZ'); camera.updateMatrixWorld();
  for (const point of [[-1.62, 1.1, .73], [0, 1.1, 1.05], [1.62, 1.1, .73], [-1.7, 1, -3.5], [1.7, 1, -3.5], [0, 2.25, -8.415]]) {
    const p = new THREE.Vector3(...point).project(camera);
    assert.ok(Math.abs(p.x) < .9 && Math.abs(p.y) < .9, 'key bridge furniture falls outside composed viewport');
  }
});
test('command chairs have rounded upholstered profiles and individually constructed seams', () => {
  const room = module.createInterior(THREE, 'bridge');
  for (let i = 0; i < 3; i++) {
    let rounded = 0, seams = 0;
    room.group.getObjectByName(`command-chair-${i}`).traverse(node => {
      if (node.geometry?.type === 'RoundedBoxGeometry') rounded++;
      if (node.name.startsWith('upholstery-seam')) seams++;
    });
    assert.ok(rounded >= 6, 'chair still consists of sharp-edged raw cubes');
    assert.ok(seams >= 3, 'upholstered chair lacks visible construction detail');
  }
});
test('new forward inset wall assemblies remain solid at both sides of the viewscreen', () => {
  const room = module.createInterior(THREE, 'bridge');
  for (const x of [-7.5, 7.5]) {
    const stopped = moveWithCollision({ x, z: -7.8 }, { x: 0, z: -1 }, room.bounds, room.obstacles);
    assert.ok(stopped.z > -8.1, 'walking entered a newly inset forward wall panel');
  }
});
