import * as THREE from "three";
import { mulberry32 } from "../utils.js";

export function buildSpace(tex) {
  const g = new THREE.Group();
  g.name = "space";

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4200, 48, 32),
    new THREE.MeshBasicMaterial({
      map: tex.stars,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  g.add(sky);

  const rnd = mulberry32(99);
  const count = 2500;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 600 + rnd() * 2800;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const t = rnd();
    col[i * 3] = 0.8 + t * 0.2;
    col[i * 3 + 1] = 0.85 + t * 0.1;
    col[i * 3 + 2] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  g.add(stars);

  const neb = new THREE.Mesh(
    new THREE.PlaneGeometry(1800, 900),
    new THREE.MeshBasicMaterial({
      color: 0x3a1a4a,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  neb.position.set(-700, 80, -900);
  neb.rotation.y = 0.5;
  g.add(neb);

  const neb2 = neb.clone();
  neb2.material = neb.material.clone();
  neb2.material.color.set(0x143060);
  neb2.position.set(900, -200, -600);
  neb2.rotation.y = -0.4;
  g.add(neb2);

  return g;
}

export function buildLights(scene) {
  const key = new THREE.DirectionalLight(0xf2f0ea, 2.15);
  key.position.set(220, 280, 160);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x6ea0ff, 0.55);
  rim.position.set(-180, -40, -120);
  scene.add(rim);

  const hemi = new THREE.HemisphereLight(0x9bb7ff, 0x08060a, 0.22);
  scene.add(hemi);

  const amb = new THREE.AmbientLight(0x1a1e28, 0.16);
  scene.add(amb);
}
