import * as THREE from "three";
import { mulberry32 } from "../utils.js";

function labelSprite(text) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 1024, 128);
  ctx.fillStyle = "rgba(8,10,14,0.0)";
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = "#e4a35a";
  ctx.font = "600 56px Saira Condensed, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 512, 64);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false })
  );
  spr.scale.set(18, 2.2, 1);
  return spr;
}

export function buildDetails(mats) {
  const g = new THREE.Group();
  g.name = "details";

  const rnd = mulberry32(2273);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const clutter = new THREE.InstancedMesh(box, mats.dark, 420);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 420; i++) {
    dummy.position.set((rnd() - 0.5) * 28, (rnd() - 0.5) * 22, -20 - rnd() * 70);
    dummy.scale.set(0.3 + rnd() * 1.4, 0.12 + rnd() * 0.4, 0.4 + rnd() * 1.8);
    dummy.rotation.set(0, rnd() * 0.4, 0);
    dummy.updateMatrix();
    clutter.setMatrixAt(i, dummy.matrix);
  }
  g.add(clutter);

  const hangarSign = labelSprite("MAIN SHUTTLEBAY  ·  AFT");
  hangarSign.position.set(0, 10.5, -102);
  g.add(hangarSign);

  const dock = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.2, 24), mats.dark);
  dock.rotation.x = Math.PI / 2;
  dock.position.set(0, 19.5, 18);
  g.add(dock);

  for (const x of [-1, 1]) {
    const pal = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.35, 1.2), mats.dark);
    pal.position.set(x * 22, 32.2, 18);
    g.add(pal);
    const dish = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16), mats.dark);
    dish.position.set(x * 22, 32.6, 18);
    dish.rotation.x = -Math.PI / 2;
    g.add(dish);
  }

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), mats.deflector);
  crystal.position.set(0, 29.6, -14);
  g.add(crystal);

  return g;
}
