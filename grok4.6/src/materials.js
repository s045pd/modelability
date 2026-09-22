import * as THREE from "three";
import { COLORS } from "./config.js";

export function buildMaterials(tex) {
  const hull = new THREE.MeshPhysicalMaterial({
    color: COLORS.hullA,
    map: tex.saucerAztec,
    roughness: 0.38,
    metalness: 0.72,
    clearcoat: 0.28,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.9,
    normalMap: tex.hullNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
  });

  const hullCyl = hull.clone();
  hullCyl.map = tex.cylAztec;

  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x2a2e34,
    roughness: 0.45,
    metalness: 0.8,
  });

  const marking = new THREE.MeshBasicMaterial({
    color: COLORS.marking,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9ad0ff,
    roughness: 0.05,
    metalness: 0.05,
    transmission: 0.55,
    thickness: 0.4,
    transparent: true,
    opacity: 0.55,
    emissive: 0x1a3344,
    emissiveIntensity: 0.4,
  });

  const windowLit = new THREE.MeshStandardMaterial({
    color: 0xffe6c4,
    emissive: 0xffd09a,
    emissiveIntensity: 2.2,
    roughness: 0.3,
    metalness: 0.1,
  });

  const windowDark = new THREE.MeshStandardMaterial({
    color: 0x0a1016,
    emissive: 0x05080c,
    roughness: 0.4,
    metalness: 0.2,
  });

  const bussard = new THREE.MeshPhysicalMaterial({
    color: 0xff3a22,
    emissive: COLORS.bussard,
    emissiveIntensity: 3.4,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
    transmission: 0.25,
  });

  const warp = new THREE.MeshStandardMaterial({
    color: COLORS.warp,
    emissive: COLORS.warp,
    emissiveIntensity: 3.6,
    roughness: 0.2,
    map: tex.grille,
    emissiveMap: tex.grille,
  });

  const deflector = new THREE.MeshStandardMaterial({
    color: COLORS.deflector,
    emissive: COLORS.deflector,
    emissiveIntensity: 4.2,
    roughness: 0.12,
    metalness: 0.3,
  });

  const impulse = new THREE.MeshStandardMaterial({
    color: COLORS.impulse,
    emissive: COLORS.impulse,
    emissiveIntensity: 3.2,
    roughness: 0.25,
  });

  const interior = new THREE.MeshStandardMaterial({
    color: COLORS.interior,
    map: tex.bulkhead,
    roughness: 0.62,
    metalness: 0.08,
  });

  const deck = new THREE.MeshStandardMaterial({
    color: COLORS.deck,
    map: tex.deck,
    roughness: 0.7,
    metalness: 0.15,
  });

  const hazard = new THREE.MeshStandardMaterial({
    map: tex.hazard,
    roughness: 0.55,
    metalness: 0.2,
  });

  const lightStrip = new THREE.MeshStandardMaterial({
    color: 0xfff1d6,
    emissive: 0xffe3b0,
    emissiveIntensity: 2.4,
  });

  const screen = new THREE.MeshStandardMaterial({
    map: tex.display,
    emissive: 0xffffff,
    emissiveMap: tex.display,
    emissiveIntensity: 1.3,
    roughness: 0.25,
  });

  const forcefield = new THREE.MeshBasicMaterial({
    color: 0x4aa6ff,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const core = new THREE.MeshStandardMaterial({
    color: 0xbfe9ff,
    emissive: 0x7fd2ff,
    emissiveIntensity: 5,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  });

  return {
    hull,
    hullCyl,
    dark,
    marking,
    glass,
    windowLit,
    windowDark,
    bussard,
    warp,
    deflector,
    impulse,
    interior,
    deck,
    hazard,
    lightStrip,
    screen,
    forcefield,
    core,
  };
}

export function patchAztecShader(material, radial = false) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = material.userData.uTime = { value: 0 };
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #include <map_fragment>
      vec2 pv = ${radial ? "vMapUv - 0.5" : "vMapUv"};
      float panel = ${radial
        ? "floor(length(pv)*48.0) + floor(atan(pv.y,pv.x)*12.0)"
        : "floor(vMapUv.x*70.0)+floor(vMapUv.y*16.0)"};
      float h = fract(sin(panel*127.1)*43758.5453);
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.78,0.80,0.84), step(0.55,h));
      vec2 f = fract(${radial ? "vec2(length(pv)*48.0, atan(pv.y,pv.x)*7.0)" : "vMapUv*vec2(70.0,16.0)"});
      float g = min(min(f.x,1.0-f.x), min(f.y,1.0-f.y));
      diffuseColor.rgb *= mix(vec3(0.55), vec3(1.0), smoothstep(0.0,0.06,g));
      `
    );
  };
  material.customProgramCacheKey = () => (radial ? "aztec-r" : "aztec-c");
}
