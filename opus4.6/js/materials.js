/**
 * materials.js — All shared materials and procedural texture generators
 * USS Enterprise NCC-1701-D
 */
import * as THREE from 'three';

// ============================================================
// Procedural Texture Generators
// ============================================================

/** Generate hull panel normal map via Canvas */
export function createHullNormalMap(width = 1024, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Neutral normal base
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, width, height);

  // Panel grid lines (subtle indentations)
  ctx.strokeStyle = '#7575f0';
  ctx.lineWidth = 1.5;

  // Large panels
  for (let x = 0; x < width; x += 128) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 96) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  // Sub-panel details (finer lines)
  ctx.strokeStyle = '#7878f4';
  ctx.lineWidth = 0.5;
  for (let x = 64; x < width; x += 128) {
    if (Math.random() > 0.4) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
  }
  for (let y = 48; y < height; y += 96) {
    if (Math.random() > 0.4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }

  // Small rectangular details (vents, access panels)
  ctx.fillStyle = '#7272ee';
  for (let i = 0; i < 30; i++) {
    const rx = Math.floor(Math.random() * width);
    const ry = Math.floor(Math.random() * height);
    ctx.fillRect(rx, ry, 12 + Math.random() * 20, 6 + Math.random() * 10);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/** Generate window row emissive texture */
export function createWindowTexture(width = 2048, height = 128, rows = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const rowHeight = height / (rows + 1);
  for (let r = 1; r <= rows; r++) {
    const y = r * rowHeight - 6;
    for (let x = 10; x < width; x += 24) {
      if (Math.random() > 0.15) { // some windows dark
        const brightness = 0.6 + Math.random() * 0.4;
        const g = Math.floor(220 * brightness);
        const b = Math.floor(180 * brightness);
        ctx.fillStyle = `rgb(255, ${g}, ${b})`;
        ctx.fillRect(x, y, 10, 8);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Generate LCARS wall panel texture */
export function createLCARSTexture(width = 512, height = 256, variant = 'default') {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, width, height);

  // LCARS color palette
  const colors = ['#ff9900', '#cc6699', '#9999ff', '#ff9966', '#cc99cc', '#6699cc', '#ffcc66'];

  // Left sidebar bars
  const barX = 10;
  const barWidth = 60;
  let barY = 10;
  for (let i = 0; i < 8; i++) {
    const barHeight = 12 + Math.random() * 20;
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 6);
    ctx.fill();
    barY += barHeight + 4;
  }

  // Main content area - header bar
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.roundRect(80, 10, width - 90, 24, [12, 12, 0, 0]);
  ctx.fill();

  // Content blocks
  for (let row = 0; row < 3; row++) {
    const y = 44 + row * 60;
    for (let col = 0; col < 3; col++) {
      const x = 80 + col * 140;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.globalAlpha = 0.3 + Math.random() * 0.4;
      ctx.fillRect(x, y, 120, 40);
      ctx.globalAlpha = 1;
    }
  }

  // Bottom bar
  ctx.fillStyle = '#cc6699';
  ctx.beginPath();
  ctx.roundRect(80, height - 34, width - 90, 24, [0, 0, 12, 12]);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/** Generate starfield / space background texture */
export function createStarfieldTexture(width = 2048, height = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Deep space gradient
  const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width * 0.7);
  grad.addColorStop(0, '#050510');
  grad.addColorStop(0.5, '#020208');
  grad.addColorStop(1, '#000004');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Stars
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2;
    const brightness = 0.3 + Math.random() * 0.7;

    // Star color (mostly white, some colored)
    const colorRoll = Math.random();
    let r, g, b;
    if (colorRoll < 0.7) { r = g = b = brightness; }
    else if (colorRoll < 0.8) { r = brightness; g = brightness * 0.8; b = brightness * 0.6; } // warm
    else if (colorRoll < 0.9) { r = brightness * 0.6; g = brightness * 0.7; b = brightness; } // cool
    else { r = brightness; g = brightness * 0.6; b = brightness * 0.6; } // red

    ctx.fillStyle = `rgba(${Math.floor(r*255)}, ${Math.floor(g*255)}, ${Math.floor(b*255)}, ${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Bright star glow
    if (size > 1.5) {
      ctx.fillStyle = `rgba(${Math.floor(r*255)}, ${Math.floor(g*255)}, ${Math.floor(b*255)}, ${brightness * 0.15})`;
      ctx.beginPath();
      ctx.arc(x, y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Faint nebula wisps
  for (let i = 0; i < 5; i++) {
    const nx = Math.random() * width;
    const ny = Math.random() * height;
    const nr = 100 + Math.random() * 200;
    const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    const hue = Math.random() * 360;
    ng.addColorStop(0, `hsla(${hue}, 60%, 30%, 0.03)`);
    ng.addColorStop(0.5, `hsla(${hue}, 50%, 20%, 0.015)`);
    ng.addColorStop(1, 'transparent');
    ctx.fillStyle = ng;
    ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

/** Create carpet-like texture for interior floors */
export function createCarpetTexture(width = 256, height = 256, color = '#2a2a44') {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Noise pattern
  const imageData = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
    imageData.data[i+1] = Math.max(0, Math.min(255, imageData.data[i+1] + noise));
    imageData.data[i+2] = Math.max(0, Math.min(255, imageData.data[i+2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}

// ============================================================
// Material Library
// ============================================================

const normalMap = createHullNormalMap();

/** Primary hull material — light metallic gray */
export const hullMaterial = new THREE.MeshStandardMaterial({
  color: 0xc8c8d0,
  metalness: 0.35,
  roughness: 0.55,
  normalMap: normalMap,
  normalScale: new THREE.Vector2(0.3, 0.3),
});

/** Hull dark variant — for recessed/shadow areas */
export const hullDarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x888890,
  metalness: 0.4,
  roughness: 0.6,
  normalMap: normalMap,
  normalScale: new THREE.Vector2(0.3, 0.3),
});

/** Bridge dome — slightly warmer tone */
export const bridgeDomeMaterial = new THREE.MeshStandardMaterial({
  color: 0xb0b0b8,
  metalness: 0.3,
  roughness: 0.5,
});

/** Window emissive — warm yellow glow */
export const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0xffeedd,
  emissive: 0xffddaa,
  emissiveIntensity: 2.5,
  metalness: 0,
  roughness: 1,
});

/** Deflector dish — blue glow */
export const deflectorMaterial = new THREE.MeshStandardMaterial({
  color: 0x3388ff,
  emissive: 0x3388ff,
  emissiveIntensity: 3.0,
  metalness: 0.1,
  roughness: 0.3,
  transparent: true,
  opacity: 0.9,
});

/** Bussard collector — red/orange glow */
export const bussardMaterial = new THREE.MeshStandardMaterial({
  color: 0xff4400,
  emissive: 0xff4400,
  emissiveIntensity: 4.0,
  metalness: 0.1,
  roughness: 0.2,
});

/** Warp nacelle glow strip — blue */
export const warpGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  emissive: 0x4488ff,
  emissiveIntensity: 5.0,
  metalness: 0,
  roughness: 0.3,
});

/** Impulse engine glow — red-orange */
export const impulseGlowMaterial = new THREE.MeshStandardMaterial({
  color: 0xff6633,
  emissive: 0xff5522,
  emissiveIntensity: 3.0,
});

/** Phaser array — subtle golden emissive */
export const phaserMaterial = new THREE.MeshStandardMaterial({
  color: 0xddaa44,
  emissive: 0xddaa44,
  emissiveIntensity: 0.8,
  metalness: 0.6,
  roughness: 0.3,
});

/** Navigation light — red (port) */
export const navRedMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  emissive: 0xff0000,
  emissiveIntensity: 4.0,
});

/** Navigation light — green (starboard) */
export const navGreenMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  emissive: 0x00ff00,
  emissiveIntensity: 4.0,
});

/** Navigation light — white (strobes) */
export const navWhiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 5.0,
});

// ===== Interior Materials =====

/** Interior wall — light blue-gray with slight sheen */
export const interiorWallMaterial = new THREE.MeshStandardMaterial({
  color: 0x8899aa,
  metalness: 0.2,
  roughness: 0.7,
});

/** Interior floor — dark carpet */
export const interiorFloorMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a2a44,
  metalness: 0,
  roughness: 0.9,
  map: createCarpetTexture(),
});

/** Interior ceiling — light panel */
export const interiorCeilingMaterial = new THREE.MeshStandardMaterial({
  color: 0xaabbcc,
  emissive: 0x334455,
  emissiveIntensity: 0.3,
  metalness: 0.1,
  roughness: 0.8,
});

/** Ceiling light strip */
export const ceilingLightMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xaaccff,
  emissiveIntensity: 2.0,
});

/** Console surface — dark with emissive */
export const consoleMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a2e,
  emissive: 0x334466,
  emissiveIntensity: 0.5,
  metalness: 0.6,
  roughness: 0.3,
});

/** Console screen — active display */
export const consoleScreenMaterial = new THREE.MeshStandardMaterial({
  color: 0x000000,
  emissive: 0x4488cc,
  emissiveIntensity: 1.5,
});

/** Chair upholstery */
export const chairMaterial = new THREE.MeshStandardMaterial({
  color: 0x3a2a2a,
  metalness: 0,
  roughness: 0.85,
});

/** Viewscreen — dark reflective */
export const viewscreenMaterial = new THREE.MeshStandardMaterial({
  color: 0x000011,
  emissive: 0x112244,
  emissiveIntensity: 0.3,
  metalness: 0.8,
  roughness: 0.1,
});

/** Warp core — bright blue pulsing (intensity animated externally) */
export const warpCoreMaterial = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  emissive: 0x4488ff,
  emissiveIntensity: 6.0,
  transparent: true,
  opacity: 0.85,
});

/** Warp core containment — metallic frame */
export const warpCoreFrameMaterial = new THREE.MeshStandardMaterial({
  color: 0x666688,
  metalness: 0.8,
  roughness: 0.2,
});

/** Door material */
export const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x667788,
  metalness: 0.5,
  roughness: 0.4,
});

/** Railing / handrail material */
export const railingMaterial = new THREE.MeshStandardMaterial({
  color: 0x999999,
  metalness: 0.7,
  roughness: 0.3,
});

/** Transparent window (for Ten Forward large windows) */
export const transparentWindowMaterial = new THREE.MeshStandardMaterial({
  color: 0x112244,
  transparent: true,
  opacity: 0.15,
  metalness: 0.9,
  roughness: 0.05,
  side: THREE.DoubleSide,
});

/** LCARS panel orange */
export const lcarsOrangeMaterial = new THREE.MeshStandardMaterial({
  color: 0xff9900,
  emissive: 0xff9900,
  emissiveIntensity: 0.6,
});

/** LCARS panel blue/teal */
export const lcarsBlueMaterial = new THREE.MeshStandardMaterial({
  color: 0x6699cc,
  emissive: 0x6699cc,
  emissiveIntensity: 0.6,
});

/** Red alert light */
export const redAlertMaterial = new THREE.MeshStandardMaterial({
  color: 0xff0000,
  emissive: 0xff0000,
  emissiveIntensity: 0,
});

/** Shuttlebay floor — industrial gray */
export const shuttlebayFloorMaterial = new THREE.MeshStandardMaterial({
  color: 0x555566,
  metalness: 0.3,
  roughness: 0.7,
});

/** Force field / energy barrier effect */
export const forceFieldMaterial = new THREE.MeshStandardMaterial({
  color: 0x4488ff,
  emissive: 0x4488ff,
  emissiveIntensity: 1.0,
  transparent: true,
  opacity: 0.1,
  side: THREE.DoubleSide,
});

// ============================================================
// Export all materials as a collection
// ============================================================
export const materials = {
  hull: hullMaterial,
  hullDark: hullDarkMaterial,
  bridgeDome: bridgeDomeMaterial,
  window: windowMaterial,
  deflector: deflectorMaterial,
  bussard: bussardMaterial,
  warpGlow: warpGlowMaterial,
  impulseGlow: impulseGlowMaterial,
  phaser: phaserMaterial,
  navRed: navRedMaterial,
  navGreen: navGreenMaterial,
  navWhite: navWhiteMaterial,
  interiorWall: interiorWallMaterial,
  interiorFloor: interiorFloorMaterial,
  interiorCeiling: interiorCeilingMaterial,
  ceilingLight: ceilingLightMaterial,
  console: consoleMaterial,
  consoleScreen: consoleScreenMaterial,
  chair: chairMaterial,
  viewscreen: viewscreenMaterial,
  warpCore: warpCoreMaterial,
  warpCoreFrame: warpCoreFrameMaterial,
  door: doorMaterial,
  railing: railingMaterial,
  transparentWindow: transparentWindowMaterial,
  lcarsOrange: lcarsOrangeMaterial,
  lcarsBlue: lcarsBlueMaterial,
  redAlert: redAlertMaterial,
  shuttlebayFloor: shuttlebayFloorMaterial,
  forceField: forceFieldMaterial,
};
