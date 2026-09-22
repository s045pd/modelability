import * as THREE from "three";
import { mulberry32 } from "./utils.js";

function canvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  return { c, ctx };
}

function tex(c, { wrap = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

function fillNoise(ctx, size, alpha, seed) {
  const rnd = mulberry32(seed);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = rnd() * 255;
    d[i] = d[i + 1] = d[i + 2] = n;
    d[i + 3] = alpha;
  }
  ctx.putImageData(img, 0, 0);
}

export function makeAztecSaucer(size = 2048) {
  const { c, ctx } = canvas(size);
  const cx = size / 2;
  ctx.fillStyle = "#c7c4bc";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(1701);
  const tones = ["#e4e0d6", "#c4c0b6", "#8f969e", "#6e767e", "#d8dde0", "#b1aa9c", "#9a8f82"];
  for (let ring = 0; ring < 56; ring++) {
    const r0 = (ring / 56) * cx;
    const r1 = ((ring + 1) / 56) * cx;
    const n = Math.max(10, Math.floor(8 + ring * 4.2));
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cx, r1, a0, a1);
      ctx.arc(cx, cx, r0, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = tones[(rnd() * tones.length) | 0];
      ctx.fill();
      ctx.strokeStyle = "rgba(40,44,50,0.22)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  }
  ctx.strokeStyle = "rgba(30,34,40,0.28)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(cx, cx, (i / 18) * cx, 0, Math.PI * 2);
    ctx.stroke();
  }
  return tex(c);
}

export function makeAztecCylinder(size = 1024) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#c4c1ba";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(2271);
  const tones = ["#d2cfc7", "#b4b8bc", "#8c9298", "#a9a398", "#c9ced1"];
  const cols = 72;
  const rows = 18;
  const cw = size / cols;
  const rh = size / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = tones[(rnd() * tones.length) | 0];
      const jitter = rnd() * 0.15 * cw;
      ctx.fillRect(x * cw + 1, y * rh + 1, cw - 2 - jitter, rh - 2);
    }
  }
  ctx.strokeStyle = "rgba(28,32,36,0.25)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cw, 0);
    ctx.lineTo(x * cw, size);
    ctx.stroke();
  }
  return tex(c);
}

export function makeHullNormal(size = 1024) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#8080ff";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(88);
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const w = 8 + rnd() * 40;
    const h = 2 + rnd() * 5;
    ctx.fillStyle = rnd() > 0.5 ? "#9098ff" : "#7078f0";
    ctx.fillRect(x, y, w, h);
  }
  const t = tex(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function makeGrille(size = 512) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#0c1218";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#9fd6ff";
  const slats = 28;
  const h = size / slats;
  for (let i = 0; i < slats; i++) {
    ctx.globalAlpha = 0.35 + (i % 3) * 0.15;
    ctx.fillRect(0, i * h + 2, size, h * 0.38);
  }
  ctx.globalAlpha = 1;
  return tex(c);
}

export function makeDeck(size = 1024) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#3b4550";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(12,14,18,0.55)";
  ctx.lineWidth = 2;
  const n = 16;
  const s = size / n;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.moveTo(i * s, 0);
    ctx.lineTo(i * s, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * s);
    ctx.lineTo(size, i * s);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  const rnd = mulberry32(19);
  for (let i = 0; i < 80; i++) {
    ctx.fillRect(rnd() * size, rnd() * size, 20 + rnd() * 80, 8);
  }
  return tex(c);
}

export function makeBulkhead(size = 1024) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#e6dccb";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#cfc4b0";
  const cols = 6;
  const w = size / cols;
  for (let i = 0; i < cols; i++) {
    ctx.fillRect(i * w + 8, 12, w - 16, size - 24);
    ctx.strokeStyle = "#9c9488";
    ctx.strokeRect(i * w + 8, 12, w - 16, size - 24);
    ctx.fillStyle = "#d8b56a";
    ctx.fillRect(i * w + 18, 28, w - 36, 10);
    ctx.fillStyle = "#cfc4b0";
  }
  return tex(c);
}

export function makeDisplay(size = 512) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#0b1016";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#e4a35a";
  ctx.strokeRect(12, 12, size - 24, size - 24);
  ctx.fillStyle = "#e4a35a";
  ctx.font = "28px monospace";
  const lines = ["NAV  2271.04", "WARP  STANDBY", "IMPULSE  IDLE", "LS  NOMINAL", "SIF  100%", "TRACTOR  OFF"];
  lines.forEach((l, i) => ctx.fillText(l, 28, 70 + i * 42));
  ctx.strokeStyle = "#4aa6ff";
  ctx.beginPath();
  ctx.moveTo(28, 360);
  for (let x = 0; x < 440; x += 8) {
    ctx.lineTo(28 + x, 360 + Math.sin(x * 0.04) * 28);
  }
  ctx.stroke();
  return tex(c, { wrap: false });
}

export function makeRegistry({ text, sub, w = 2048, h = 512 }) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#1e3d66";
  ctx.font = "700 220px 'Saira Condensed', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h * 0.42);
  if (sub) {
    ctx.font = "600 92px 'Saira Condensed', sans-serif";
    ctx.fillText(sub, w / 2, h * 0.78);
  }
  return tex(c, { wrap: false });
}

export function makeStars(size = 2048) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#020308";
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(42);
  for (let i = 0; i < 9000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = rnd() ** 3 * 1.6;
    const a = 0.35 + rnd() * 0.65;
    const tint = rnd();
    ctx.fillStyle =
      tint > 0.85
        ? `rgba(180,210,255,${a})`
        : tint > 0.7
          ? `rgba(255,220,180,${a})`
          : `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 18; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 80 + rnd() * 140);
    g.addColorStop(0, `rgba(${80 + rnd() * 80},${40 + rnd() * 40},${120 + rnd() * 80},0.18)`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 200, y - 200, 400, 400);
  }
  return tex(c, { wrap: true });
}

export function makeNoise(size = 256) {
  const { c, ctx } = canvas(size);
  fillNoise(ctx, size, 255, 7);
  const t = tex(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function makeHazard(size = 256) {
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#d4a017";
  for (let i = -2; i < 10; i++) {
    ctx.save();
    ctx.translate(i * 40, 0);
    ctx.rotate(-0.7);
    ctx.fillRect(0, -20, 18, size * 2);
    ctx.restore();
  }
  return tex(c);
}

export function buildTextures() {
  const saucerAztec = makeAztecSaucer();
  const cylAztec = makeAztecCylinder();
  const registry = makeRegistry({ text: "NCC-1701", sub: "ENTERPRISE" });
  const nameOnly = makeRegistry({ text: "U.S.S. ENTERPRISE", sub: "" });
  return {
    saucerAztec,
    cylAztec,
    hullNormal: makeHullNormal(),
    grille: makeGrille(),
    deck: makeDeck(),
    bulkhead: makeBulkhead(),
    display: makeDisplay(),
    registry,
    nameOnly,
    stars: makeStars(),
    noise: makeNoise(),
    hazard: makeHazard(),
  };
}
