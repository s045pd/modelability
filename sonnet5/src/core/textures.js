import * as THREE from 'three';
import { makeRng } from './rng.js';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(c, srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function gray(v) { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; }

// 可平铺的柔和斑块；colorFn 返回 [ 'r,g,b', alpha ]
function blotches(ctx, size, rng, count, rMin, rMax, colorFn) {
  for (let i = 0; i < count; i++) {
    const x = rng() * size, y = rng() * size, r = rng.range(rMin, rMax);
    const [rgb, alpha] = colorFn(rng);
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      const cx = x + dx, cy = y + dy;
      if (cx + r < 0 || cy + r < 0 || cx - r > size || cy - r > size) continue;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${rgb},${alpha})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }
}

function subdivide(x, y, w, h, rng, minS, maxS, out) {
  const tooBig = w > maxS || h > maxS;
  const canSplit = w > minS * 2 || h > minS * 2;
  if (!canSplit || (!tooBig && rng() < 0.35)) { out.push([x, y, w, h]); return; }
  const vert = w > h ? true : h > w ? false : rng() < 0.5;
  const t = rng.range(0.38, 0.62);
  if (vert && w > minS * 2) {
    subdivide(x, y, w * t, h, rng, minS, maxS, out);
    subdivide(x + w * t, y, w * (1 - t), h, rng, minS, maxS, out);
  } else if (h > minS * 2) {
    subdivide(x, y, w, h * t, rng, minS, maxS, out);
    subdivide(x, y + h * t, w, h * (1 - t), rng, minS, maxS, out);
  } else out.push([x, y, w, h]);
}

const LABELS = ['A-14', 'B-207', 'C-31', 'D-9', 'E-118', 'F-62', 'AFT', 'FWD', 'PORT', 'STBD', 'NO STEP', 'ACCESS', 'HV', 'GR-3', 'K-77', 'VENT', 'SEC-4', 'DK-5', 'L-29'];

// 舰体：镶嵌板 + 铆钉 + 检修盖 + 铭牌 + 风化
export function makeHullTextures(size = 2048, seed = 1701, base = [212, 215, 218]) {
  const rng = makeRng(seed);
  const A = canvas(size), H = canvas(size);
  const a = A.getContext('2d'), h = H.getContext('2d');
  a.fillStyle = `rgb(${base})`; a.fillRect(0, 0, size, size);
  h.fillStyle = gray(128); h.fillRect(0, 0, size, size);

  const panels = [];
  subdivide(0, 0, size, size, rng, 70, 300, panels);

  for (const [x, y, w, hh] of panels) {
    const tone = rng.range(-9, 9);
    const warm = rng.range(-2.5, 2.5);
    a.fillStyle = `rgb(${base[0] + tone + warm},${base[1] + tone},${base[2] + tone - warm})`;
    a.fillRect(x, y, w, hh);
    h.fillStyle = gray(128 + rng.range(-5, 5));
    h.fillRect(x, y, w, hh);
    // 面板内轻微拉丝
    if (rng() < 0.4) {
      a.globalAlpha = 0.05;
      for (let i = 0; i < w; i += 3) { a.fillStyle = rng() < 0.5 ? '#fff' : '#000'; a.fillRect(x + i, y, 1, hh); }
      a.globalAlpha = 1;
    }
    const inset = 5;
    // 接缝
    a.fillStyle = 'rgba(38,42,48,0.75)';
    a.fillRect(x, y, w, 2); a.fillRect(x, y, 2, hh);
    a.fillStyle = 'rgba(255,255,255,0.4)';
    a.fillRect(x + 2, y + 2, w - 2, 1); a.fillRect(x + 2, y + 2, 1, hh - 2);
    h.fillStyle = gray(38); h.fillRect(x, y, w, 3); h.fillRect(x, y, 3, hh);
    h.fillStyle = gray(150); h.fillRect(x + 3, y + 3, w - 3, 1); h.fillRect(x + 3, y + 3, 1, hh - 3);
    // 铆钉
    if (w > 110 && hh > 110) {
      const step = 30;
      for (let i = inset + 12; i < w - inset; i += step) for (const yy of [y + inset + 3, y + hh - inset - 3]) rivet(a, h, x + i, yy);
      for (let j = inset + 12; j < hh - inset; j += step) for (const xx of [x + inset + 3, x + w - inset - 3]) rivet(a, h, xx, y + j);
    }
    const kind = rng();
    if (kind < 0.14 && w > 90 && hh > 90) {
      // 检修盖
      const iw = w * rng.range(0.3, 0.5), ih = hh * rng.range(0.3, 0.5);
      const ix = x + (w - iw) * rng(), iy = y + (hh - ih) * rng();
      a.strokeStyle = 'rgba(30,34,40,0.8)'; a.lineWidth = 2; a.strokeRect(ix, iy, iw, ih);
      a.fillStyle = 'rgba(0,0,0,0.06)'; a.fillRect(ix, iy, iw, ih);
      h.fillStyle = gray(100); h.fillRect(ix, iy, iw, ih);
      h.strokeStyle = gray(30); h.lineWidth = 3; h.strokeRect(ix, iy, iw, ih);
      for (const [cx, cy] of [[ix + 8, iy + 8], [ix + iw - 8, iy + 8], [ix + 8, iy + ih - 8], [ix + iw - 8, iy + ih - 8]]) rivet(a, h, cx, cy, 3);
    } else if (kind < 0.24 && w > 100 && hh > 60) {
      // 通风格栅
      const n = rng.int(5, 9), gx = x + w * 0.2, gw = w * 0.6, gy = y + hh * 0.3, gh = hh * 0.4;
      for (let i = 0; i < n; i++) {
        const yy = gy + (gh / n) * i;
        a.fillStyle = 'rgba(25,28,32,0.85)'; a.fillRect(gx, yy, gw, gh / n * 0.55);
        h.fillStyle = gray(20); h.fillRect(gx, yy, gw, gh / n * 0.55);
      }
    } else if (kind < 0.31 && w > 80) {
      a.fillStyle = 'rgba(40,44,52,0.55)';
      a.font = `bold ${rng.int(11, 16)}px monospace`;
      a.__lbl = rng.pick(LABELS);
      a.fillText(a.__lbl, x + 10, y + hh - 10);
      h.fillStyle = gray(112); h.font = a.font; h.fillText(a.__lbl, x + 10, y + hh - 10);
    } else if (kind < 0.36) {
      // 警示斜纹
      const sx = x + 12, sy = y + 12, sw = Math.min(70, w - 24), sh = 10;
      for (let i = 0; i < sw; i += 10) {
        a.fillStyle = (i / 10) % 2 ? 'rgba(210,150,30,0.7)' : 'rgba(30,30,30,0.6)';
        a.fillRect(sx + i, sy, 8, sh);
      }
    }
  }

  blotches(a, size, rng, 260, 40, 220, (r) => [r() < 0.6 ? '30,34,40' : '255,255,255', r.range(0.02, 0.07).toFixed(3)]);
  // 竖向雨渍
  for (let i = 0; i < 140; i++) {
    const x = rng() * size, y = rng() * size, l = rng.range(40, 260);
    const g = a.createLinearGradient(0, y, 0, y + l);
    g.addColorStop(0, 'rgba(40,40,44,0.10)'); g.addColorStop(1, 'rgba(40,40,44,0)');
    a.fillStyle = g; a.fillRect(x, y, rng.range(2, 6), l);
  }
  return { albedo: tex(A), height: tex(H, false) };
}

function rivet(a, h, x, y, r = 1.7) {
  a.fillStyle = 'rgba(30,34,40,0.55)'; a.beginPath(); a.arc(x + 0.6, y + 0.8, r + 0.5, 0, 6.3); a.fill();
  a.fillStyle = 'rgba(255,255,255,0.75)'; a.beginPath(); a.arc(x, y, r, 0, 6.3); a.fill();
  h.fillStyle = gray(215); h.beginPath(); h.arc(x, y, r + 0.5, 0, 6.3); h.fill();
}

// 舰内墙板：竖向条缝 + 检修面板
export function makeWallTextures(seed = 7, tint = [188, 186, 176]) {
  const s = 512, rng = makeRng(seed);
  const A = canvas(s), H = canvas(s);
  const a = A.getContext('2d'), h = H.getContext('2d');
  a.fillStyle = `rgb(${tint})`; a.fillRect(0, 0, s, s);
  h.fillStyle = gray(128); h.fillRect(0, 0, s, s);
  const cols = 4, cw = s / cols;
  for (let i = 0; i < cols; i++) {
    const x = i * cw;
    const t = rng.range(-5, 5);
    a.fillStyle = `rgb(${tint[0] + t},${tint[1] + t},${tint[2] + t})`;
    a.fillRect(x, 0, cw, s);
    a.fillStyle = 'rgba(40,40,36,0.5)'; a.fillRect(x, 0, 2, s);
    a.fillStyle = 'rgba(255,255,255,0.35)'; a.fillRect(x + 2, 0, 1, s);
    h.fillStyle = gray(40); h.fillRect(x, 0, 3, s);
    // 水平分段
    for (const y of [s * 0.5]) {
      a.fillStyle = 'rgba(40,40,36,0.35)'; a.fillRect(x, y, cw, 2);
      h.fillStyle = gray(70); h.fillRect(x, y, cw, 2);
    }
    // 小螺丝
    for (const [xx, yy] of [[x + 8, 8], [x + cw - 8, 8], [x + 8, s - 8], [x + cw - 8, s - 8], [x + 8, s / 2 + 8], [x + cw - 8, s / 2 + 8]]) rivet(a, h, xx, yy, 1.6);
  }
  blotches(a, s, rng, 30, 30, 120, () => ['50,48,40', 0.04]);
  return { albedo: tex(A), height: tex(H, false) };
}

export function makeFloorTextures(seed = 11, base = [62, 64, 70]) {
  const s = 512, rng = makeRng(seed);
  const A = canvas(s), H = canvas(s);
  const a = A.getContext('2d'), h = H.getContext('2d');
  a.fillStyle = `rgb(${base})`; a.fillRect(0, 0, s, s);
  h.fillStyle = gray(128); h.fillRect(0, 0, s, s);
  const n = 4, cw = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const t = rng.range(-6, 6);
    a.fillStyle = `rgb(${base[0] + t},${base[1] + t},${base[2] + t})`;
    a.fillRect(i * cw, j * cw, cw, cw);
    for (let k = 0; k < 90; k++) { a.fillStyle = `rgba(${rng() < 0.5 ? '255,255,255' : '0,0,0'},0.04)`; a.fillRect(i * cw + rng() * cw, j * cw + rng() * cw, 2, 2); }
    a.fillStyle = 'rgba(0,0,0,0.6)'; a.fillRect(i * cw, j * cw, cw, 2); a.fillRect(i * cw, j * cw, 2, cw);
    h.fillStyle = gray(50); h.fillRect(i * cw, j * cw, cw, 3); h.fillRect(i * cw, j * cw, 3, cw);
  }
  return { albedo: tex(A), height: tex(H, false) };
}

export function makeCeilingTextures(seed = 13) {
  const s = 512;
  const A = canvas(s), H = canvas(s);
  const a = A.getContext('2d'), h = H.getContext('2d');
  a.fillStyle = 'rgb(214,214,208)'; a.fillRect(0, 0, s, s);
  h.fillStyle = gray(128); h.fillRect(0, 0, s, s);
  const n = 4, cw = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    a.fillStyle = 'rgba(60,60,56,0.55)'; a.fillRect(i * cw, j * cw, cw, 2); a.fillRect(i * cw, j * cw, 2, cw);
    a.fillStyle = 'rgba(0,0,0,0.05)'; for (let k = 0; k < 6; k++) a.fillRect(i * cw + 10, j * cw + 12 + k * 18, cw - 20, 1);
    h.fillStyle = gray(60); h.fillRect(i * cw, j * cw, cw, 3); h.fillRect(i * cw, j * cw, 3, cw);
  }
  return { albedo: tex(A), height: tex(H, false) };
}

// 花纹钢板
export function makePlateTextures(seed = 17, base = [92, 96, 102]) {
  const s = 512, rng = makeRng(seed);
  const A = canvas(s), H = canvas(s);
  const a = A.getContext('2d'), h = H.getContext('2d');
  a.fillStyle = `rgb(${base})`; a.fillRect(0, 0, s, s);
  h.fillStyle = gray(90); h.fillRect(0, 0, s, s);
  const step = 32;
  for (let i = 0; i < s / step; i++) for (let j = 0; j < s / step; j++) {
    const x = i * step + 16, y = j * step + 16;
    const d = (i + j) % 2 ? 1 : -1;
    for (const [c, len] of [['a', 20]]) {
      a.save(); a.translate(x, y); a.rotate((Math.PI / 4) * d);
      a.fillStyle = 'rgba(255,255,255,0.28)'; a.fillRect(-len / 2, -2.5, len, 5);
      a.fillStyle = 'rgba(0,0,0,0.3)'; a.fillRect(-len / 2, 2.5, len, 1.5);
      a.restore();
      h.save(); h.translate(x, y); h.rotate((Math.PI / 4) * d);
      h.fillStyle = gray(220); h.fillRect(-len / 2, -2.5, len, 5);
      h.restore();
    }
  }
  blotches(a, s, rng, 40, 20, 90, () => ['20,18,14', 0.06]);
  const edge = 4;
  a.fillStyle = 'rgba(0,0,0,0.5)'; a.fillRect(0, 0, s, edge); a.fillRect(0, 0, edge, s);
  return { albedo: tex(A), height: tex(H, false) };
}

export function makeGrateTextures() {
  const s = 256;
  const A = canvas(s), H = canvas(s);
  const a = A.getContext('2d'), h = H.getContext('2d');
  a.fillStyle = 'rgb(14,15,18)'; a.fillRect(0, 0, s, s);
  h.fillStyle = gray(30); h.fillRect(0, 0, s, s);
  for (let i = 0; i < s; i += 32) {
    a.fillStyle = 'rgb(112,116,124)'; a.fillRect(i, 0, 6, s); a.fillRect(0, i, s, 6);
    h.fillStyle = gray(230); h.fillRect(i, 0, 6, s); h.fillRect(0, i, s, 6);
  }
  return { albedo: tex(A), height: tex(H, false) };
}

// 分段文字贴花（透明底）
export function makeTextTexture(text, { font = 'bold 200px "Arial Narrow","Helvetica Neue",Arial,sans-serif', color = '#3a4048', w = 2048, h = 320, letterSpacing = 18 } = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + letterSpacing);
  const total = widths.reduce((s, v) => s + v, 0) - letterSpacing;
  let x = (w - total) / 2;
  chars.forEach((ch, i) => { ctx.fillText(ch, x, h / 2 + 4); x += widths[i]; });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 甲板牌/标识
export function makeSignTexture(lines, { w = 512, h = 160, bg = '#151a22', fg = '#ffb14a', accent = '#4aa3ff', size = 44 } = {}) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, 14, h);
  ctx.fillStyle = fg;
  ctx.font = `bold ${size}px "Arial Narrow","Helvetica Neue",Arial,sans-serif`;
  ctx.textBaseline = 'middle';
  const lh = h / (lines.length + 0.4);
  lines.forEach((l, i) => ctx.fillText(l, 34, lh * (i + 0.85)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// 控制台显示屏：可随时间重绘
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

export function drawScreen(ctx, w, h, kind, seed, t = 0) {
  const cols = ['#57e2ff', '#ffb14a', '#7dff9c', '#ff6a5a', '#c58bff'];
  const col = cols[seed % cols.length];
  ctx.fillStyle = '#04070a'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.22;
  for (let x = 0; x <= w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  if (kind === 'scope') {
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = 0.9 - k * 0.25;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 + Math.sin(x * (0.05 + k * 0.03) + seed + t * (1.6 + k)) * (26 - k * 6) + (hash(x, k + Math.floor(t * 6)) - 0.5) * 5;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'bars') {
    for (let i = 0; i < 18; i++) {
      const v = 0.5 + 0.4 * Math.sin(t * (0.8 + hash(i, seed) * 1.6) + i * 1.7 + seed);
      const bh = (0.12 + v * 0.8) * (h - 20);
      ctx.fillRect(10 + i * 13, h - 10 - bh, 9, bh);
    }
  } else if (kind === 'chart') {
    for (let i = 0; i < 60; i++) { const big = hash(i, seed) < 0.15; ctx.fillRect(hash(i, seed + 3) * w, hash(i, seed + 7) * h, big ? 3 : 1.5, big ? 3 : 1.5); }
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 46, 0, 6.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 24, 0, 6.3); ctx.stroke();
    const a = t * 1.3;
    ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + Math.cos(a) * 46, h / 2 + Math.sin(a) * 46); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.arc(w / 2, h / 2, 46, a - 0.5, a); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  } else if (kind === 'text') {
    ctx.font = '10px monospace';
    const off = (t * 14) % 12;
    for (let i = -1; i < 14; i++) {
      const row = i + Math.floor(t * 14 / 12);
      let str = '';
      const n = 8 + Math.floor(hash(row, seed) * 18);
      for (let j = 0; j < n; j++) str += '01AF73-: '[Math.floor(hash(row * 31 + j, seed) * 9)];
      ctx.fillText(str, 10, 14 + i * 12 - off);
    }
  } else if (kind === 'ship') {
    const p = 0.5 + 0.5 * Math.sin(t * 2);
    ctx.beginPath(); ctx.ellipse(w / 2, h / 2 - 10, 56, 14, 0, 0, 6.3); ctx.stroke();
    ctx.fillRect(w / 2 - 6, h / 2, 12, 34);
    ctx.fillRect(w / 2 - 34, h / 2 + 28, 68, 5);
    ctx.fillRect(w / 2 - 50, h / 2 + 10, 8, 40);
    ctx.fillRect(w / 2 + 42, h / 2 + 10, 8, 40);
    ctx.globalAlpha = 0.3 + 0.5 * p; ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.arc(w / 2 - 46, h / 2 + 8, 4, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#fff';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;
}

export function makeScreenTexture(kind = 'scope', seed = 3, w = 256, h = 160) {
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  drawScreen(ctx, w, h, kind, seed, seed * 1.7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.userData = { kind, seed, ctx, w, h };
  return t;
}
