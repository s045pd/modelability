import * as THREE from 'three';
import { WalkSystem } from '../systems/collision.js';
import { markInterior } from './common.js';
import { buildBridge } from './bridge.js';
import { buildCorridors } from './corridors.js';
import { buildTenForward } from './tenforward.js';
import { buildEngineering } from './engineering.js';
import { buildShuttlebay } from './shuttlebay.js';
import { buildTransporter } from './transporter.js';

/**
 * 各舱室在舰体内的世界坐标锚点。
 * 约束：必须完全位于外壳曲面内侧，否则会看到被恒星照亮的舰体外皮。
 */
export const ANCHORS = {
  bridge: new THREE.Vector3(0, 27.75, 120),      // 1 号甲板，碟部顶端穹顶内
  corridors: new THREE.Vector3(0, -2.4, 200),    // 10 号甲板十字枢纽
  tenforward: new THREE.Vector3(0, -2.4, 264),   // 碟部前缘，窗外即星空
  transporter: new THREE.Vector3(-27, -2.4, 200),
  engineering: new THREE.Vector3(0, -74, -40),   // 次船体，曲速核心贯穿
  shuttlebay: new THREE.Vector3(0, -70, -294),   // 次船体尾部主机库
};

export function buildInterior() {
  const root = new THREE.Group();
  root.name = 'interior';
  const ctx = {
    root,
    walk: new WalkSystem(),
    doors: [],
    lights: [],
    spawns: {},
    hotspots: [],
    pulses: [],
  };

  buildBridge(ctx, ANCHORS.bridge);
  buildCorridors(ctx, ANCHORS.corridors);
  buildTenForward(ctx, ANCHORS.tenforward);
  buildTransporter(ctx, ANCHORS.transporter);
  buildEngineering(ctx, ANCHORS.engineering);
  buildShuttlebay(ctx, ANCHORS.shuttlebay);

  // 舱内环境光（仅作用于 1 号图层）
  root.add(new THREE.HemisphereLight(0xc8d2e4, 0x2b3038, 0.55));
  root.add(new THREE.AmbientLight(0x8b95a8, 0.26));

  markInterior(root);
  return ctx;
}

/** 曲速核心等脉动光源。 */
export function tickInterior(ctx, t) {
  for (const p of ctx.pulses) {
    p.light.intensity = p.base * (0.72 + 0.28 * Math.sin(t * 2.4));
  }
}
