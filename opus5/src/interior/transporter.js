import * as THREE from 'three';
import { materials, forceFieldMaterial } from '../materials/library.js';
import { RoomBuilder, lcarsWall, roomShell, standingConsole } from './common.js';

const HX = 5.2;
const HZ = 7.5;
const H = 3.1;

export function buildTransporter(ctx, origin) {
  const m = materials();
  const rb = new RoomBuilder(ctx, origin, 'transporter');

  roomShell(rb, {
    x0: -HX, z0: -HZ, x1: HX, z1: HZ, y: 0, h: H, thickness: 0.24,
    floorMat: m.carpet, ceilMat: m.ceiling, wallMat: m.bulkheadWarm,
    openings: { east: [{ from: -1.35, to: 1.35, bottom: 0, top: 2.34 }] },
  });
  rb.door({ x: HX - 0.05, y: 0, z: 0, rotY: -Math.PI / 2, width: 1.62, height: 2.32, tag: 'transporter' });

  // —— 传送台
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.22, 48), m.trimWarm);
  dais.position.set(0, 0.11, -3.0);
  rb.add(dais);
  const daisTop = new THREE.Mesh(new THREE.CircleGeometry(2.55, 48), m.consoleBody);
  daisTop.rotation.x = -Math.PI / 2;
  daisTop.position.set(0, 0.225, -3.0);
  rb.add(daisTop);
  rb.rect(-2.2, -5.1, 2.2, -0.9, 0.22, 'transporter-pad');

  // 六个传送圆盘 + 顶部发射器
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * 1.62;
    const z = -3.0 + Math.sin(a) * 1.62;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 32), m.lightPanelBright);
    pad.position.set(x, 0.26, z);
    rb.add(pad);
    const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.18, 32), m.lightPanel);
    emitter.position.set(x, H - 0.16, z);
    rb.add(emitter);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, H - 0.5, 24, 1, true),
      forceFieldMaterial(new THREE.Color(0.55, 0.78, 1.0)),
    );
    beam.position.set(x, (H - 0.5) / 2 + 0.26, z);
    rb.add(beam);
    rb.light(x, H - 0.4, z, 0x9fd0ff, 5, 7);
  }
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.22, 48), m.trimWarm);
  canopy.position.set(0, H - 0.11, -3.0);
  rb.add(canopy);

  // —— 控制台
  rb.add(standingConsole(0, 0, 2.6, 3.2, 0, 910));
  rb.block(-1.7, 2.2, 1.7, 3.1, 0, 1.3);
  rb.add(lcarsWall(-HX + 0.14, 1.72, 1.6, 2.4, 1.2, Math.PI / 2, 911, 1.3));
  rb.add(lcarsWall(-HX + 0.14, 1.72, -2.8, 2.4, 1.2, Math.PI / 2, 912, 1.1));
  rb.add(lcarsWall(0, 1.9, HZ - 0.14, 3.0, 1.2, Math.PI, 913, 1.4));

  rb.strip(0, H - 0.04, 3.4, 3.6, 2.4, { color: 0xffe6c6, intensity: 26, distance: 16, mat: m.lightPanelBright });
  rb.light(0, 2.7, -3.0, 0xbfd8ff, 24, 16);
  rb.light(0, 2.7, 4.5, 0xffe2bd, 16, 12);

  rb.hotspot('turbolift-transporter', HX - 0.7, 1.5, 2.0, '涡轮电梯 · 选择目的地', 'turbolift');
  rb.spawn('transporter', 0, 0, 6.0, 0);
  return rb.group;
}
