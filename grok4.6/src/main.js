import * as THREE from "three";
import { buildTextures } from "./textures.js";
import { buildMaterials } from "./materials.js";
import { buildEnterprise, tickShip } from "./ship/enterprise.js";
import { buildInteriors } from "./interior/index.js";
import { buildSpace, buildLights } from "./env/space.js";
import { FlyRig } from "./controls.js";
import { bindHud, tickHud } from "./hud.js";
import { buildComposer } from "./postfx.js";
import { TELEPORTS } from "./config.js";

const viewport = document.getElementById("viewport");

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = false;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020308);
scene.fog = new THREE.FogExp2(0x020308, 0.00022);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.12, 8000);
camera.position.set(...TELEPORTS.inspect.pos);

const tex = buildTextures();
const mats = buildMaterials(tex);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(buildEnvProbe()).texture;
pmrem.dispose();

buildLights(scene);
scene.add(buildSpace(tex));
const ship = buildEnterprise(mats, tex);
scene.add(ship);
const interiors = buildInteriors(mats);
scene.add(interiors);

const composer = buildComposer(renderer, scene, camera);
const rig = new FlyRig(camera, renderer.domElement);
rig.teleport("inspect");

const floors = [];
interiors.traverse((o) => {
  if (o.name === "walkFloor") floors.push(o);
});
rig.setFloors(floors);

bindHud(rig);
const view = new URLSearchParams(location.search).get("view");
if (view && TELEPORTS[view]) rig.teleport(view);
document.getElementById("hud").classList.remove("hidden");
document.getElementById("boot").classList.add("gone");
setTimeout(() => document.getElementById("boot")?.remove(), 700);

const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  rig.update(dt);
  tickShip(ship, t);
  tickHud(rig);
  if (mats.hull.userData.uTime) mats.hull.userData.uTime.value = t;
  if (mats.hullCyl.userData.uTime) mats.hullCyl.userData.uTime.value = t;
  const core = interiors.getObjectByName("warpCoreInner");
  if (core) core.rotation.y = t * 1.4;
  composer.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

function buildEnvProbe() {
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0x99b7ff, 0x09070c, 1.2));
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(12, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff5e6 })
  );
  sun.position.set(40, 30, 20);
  s.add(sun);
  return s;
}
