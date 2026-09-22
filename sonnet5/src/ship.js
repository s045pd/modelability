import * as THREE from 'three';
import { Kit } from './core/kit.js';
import { makeSpaceWindowMaterial } from './core/sky.js';
import { buildSaucer } from './exterior/saucer.js';
import { buildSecondary, buildNeck } from './exterior/secondary.js';
import { buildNacelle, buildPylon, makeNacelleMaterials } from './exterior/nacelles.js';
import { buildDeck4 } from './interior/deck4.js';
import { buildBridge } from './interior/bridge.js';
import { buildEngineering } from './interior/engineering.js';
import { buildShuttlebay } from './interior/shuttlebay.js';
import { buildNacelleTube } from './interior/nacelle.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function buildShip(world, M, sky, ui, progress = () => {}) {
  const root = new THREE.Group();
  root.name = 'USS Enterprise';
  M.space = makeSpaceWindowMaterial(sky);

  const ext = new Kit(world, M);
  progress(0.25, '铺设碟体装甲板…'); await tick();
  buildSaucer(ext, M);
  progress(0.36, '构建副船体与颈部…'); await tick();
  buildSecondary(ext, M);
  buildNeck(ext, M);
  progress(0.46, '安装曲速舱…'); await tick();
  const FX = makeNacelleMaterials();
  for (const side of [-1, 1]) { buildPylon(ext, M, side); buildNacelle(ext, M, FX, side); }
  progress(0.55, '合并外部几何体…'); await tick();
  const exterior = ext.finish(root, 'exterior');

  const int = new Kit(world, M);
  const ctx = { kit: int, M, world, ui, sky, FX };
  progress(0.65, '布置第 4 层主甲板…'); await tick();
  buildDeck4(ctx);
  progress(0.8, '安装舰桥设备…'); await tick();
  buildBridge(ctx);
  progress(0.86, '建造轮机舱与机库…'); await tick();
  buildEngineering(ctx);
  buildShuttlebay(ctx);
  buildNacelleTube(ctx);
  progress(0.95, '合并内部几何体…'); await tick();
  const interior = int.finish(root, 'interior');
  return { root, exterior, interior };
}
