import * as THREE from 'three';
import { makeRng } from '../lib/geom.js';

const cache = new Map();
export function cached(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

export function makeCanvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function finish(canvas, { repeat = [1, 1], srgb = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** 由高度图（灰度 canvas）生成法线贴图。 */
export function normalFromHeight(canvas, strength = 2.2) {
  const w = canvas.width;
  const h = canvas.height;
  const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h * 4);
  const at = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** 可平铺的随机行列切分，返回 [{x,y,w,h}] */
function panelGrid(size, rows, colsRange, rng) {
  const cells = [];
  const rowH = [];
  let acc = 0;
  for (let i = 0; i < rows; i++) {
    const v = 0.6 + rng() * 0.8;
    rowH.push(v); acc += v;
  }
  let y = 0;
  for (let i = 0; i < rows; i++) {
    const hh = Math.round((rowH[i] / acc) * size);
    const cols = colsRange[0] + Math.floor(rng() * (colsRange[1] - colsRange[0] + 1));
    const colW = [];
    let acc2 = 0;
    for (let j = 0; j < cols; j++) { const v = 0.5 + rng() * 1.2; colW.push(v); acc2 += v; }
    let x = 0;
    for (let j = 0; j < cols; j++) {
      const ww = j === cols - 1 ? size - x : Math.round((colW[j] / acc2) * size);
      cells.push({ x, y, w: ww, h: i === rows - 1 ? size - y : hh });
      x += ww;
    }
    y += hh;
  }
  return cells;
}

/**
 * 舰体 aztec 蒙皮：albedo + roughness + normal。
 * 官方设定中银河级蒙皮是成千上万块微妙差异的装甲板。
 */
export function hullSurface({ size = 2048, base = '#b9bcc4', seed = 3, contrast = 1 } = {}) {
  return cached(`hull:${size}:${base}:${seed}:${contrast}`, () => {
    const rng = makeRng(seed);
    const albedo = makeCanvas(size);
    const height = makeCanvas(size);
    const rough = makeCanvas(size);
    const a = albedo.getContext('2d');
    const hc = height.getContext('2d');
    const rc = rough.getContext('2d');

    a.fillStyle = base; a.fillRect(0, 0, size, size);
    hc.fillStyle = '#808080'; hc.fillRect(0, 0, size, size);
    rc.fillStyle = '#9a9a9a'; rc.fillRect(0, 0, size, size);

    // 三层嵌套装甲板：大区块 → 装甲板 → 微板
    const layers = [
      { rows: 6, cols: [3, 6], amp: 5.0 * contrast, line: 0.16, hAmp: 26 },
      { rows: 18, cols: [10, 18], amp: 3.4 * contrast, line: 0.11, hAmp: 14 },
      { rows: 46, cols: [26, 44], amp: 2.1 * contrast, line: 0.07, hAmp: 7 },
    ];
    const baseCol = new THREE.Color(base);
    for (const L of layers) {
      const cells = panelGrid(size, L.rows, L.cols, rng);
      for (const c of cells) {
        const d = (rng() - 0.5) * 2;
        const col = baseCol.clone();
        col.offsetHSL(0, (rng() - 0.5) * 0.02, (d * L.amp) / 255);
        a.fillStyle = `#${col.getHexString()}`;
        a.globalAlpha = 0.55;
        a.fillRect(c.x, c.y, c.w, c.h);
        a.globalAlpha = 1;

        const hv = 128 + d * L.hAmp * 0.5;
        hc.fillStyle = `rgb(${hv | 0},${hv | 0},${hv | 0})`;
        hc.globalAlpha = 0.6; hc.fillRect(c.x, c.y, c.w, c.h); hc.globalAlpha = 1;

        const rv = 140 + d * 26 + (rng() - 0.5) * 18;
        rc.fillStyle = `rgb(${rv | 0},${rv | 0},${rv | 0})`;
        rc.globalAlpha = 0.5; rc.fillRect(c.x, c.y, c.w, c.h); rc.globalAlpha = 1;

        // 板缝
        a.strokeStyle = `rgba(28,32,40,${L.line})`;
        a.lineWidth = 1;
        a.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
        hc.strokeStyle = 'rgba(70,70,70,0.65)';
        hc.lineWidth = L === layers[2] ? 1 : 2;
        hc.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
      }
    }

    // 舱口 / 维修面板 / 散热格栅
    for (let i = 0; i < 260; i++) {
      const x = rng() * size, y = rng() * size;
      const w = 8 + rng() * 42, h = 6 + rng() * 26;
      a.fillStyle = `rgba(${60 + rng() * 60 | 0},${64 + rng() * 60 | 0},${72 + rng() * 60 | 0},0.22)`;
      a.fillRect(x, y, w, h);
      hc.fillStyle = rng() > 0.5 ? 'rgba(150,150,150,0.5)' : 'rgba(104,104,104,0.5)';
      hc.fillRect(x, y, w, h);
      if (rng() > 0.6) {
        a.strokeStyle = 'rgba(24,28,36,0.35)';
        for (let k = 2; k < h; k += 3) { a.beginPath(); a.moveTo(x, y + k); a.lineTo(x + w, y + k); a.stroke(); }
      }
    }

    // 微粒噪声，打破塑料感
    const img = a.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rng() - 0.5) * 4.5;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    a.putImageData(img, 0, 0);

    return {
      map: finish(albedo, { srgb: true }),
      roughnessMap: finish(rough),
      normalMap: normalFromHeight(height, 1.5),
    };
  });
}

/** 内部舱壁：横向分层 + 灯带凹槽。 */
export function bulkheadSurface({ size = 1024, base = '#cfd4dc', seed = 21 } = {}) {
  return cached(`bulkhead:${base}:${seed}`, () => {
    const rng = makeRng(seed);
    const c = makeCanvas(size);
    const h = makeCanvas(size);
    const ctx = c.getContext('2d');
    const hx = h.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
    hx.fillStyle = '#7f7f7f'; hx.fillRect(0, 0, size, size);
    const bands = [0, 0.18, 0.3, 0.62, 0.78, 1];
    for (let i = 0; i < bands.length - 1; i++) {
      const y = bands[i] * size;
      const hh = (bands[i + 1] - bands[i]) * size;
      const col = new THREE.Color(base).offsetHSL(0, 0, (rng() - 0.5) * 0.06);
      ctx.fillStyle = `#${col.getHexString()}`;
      ctx.fillRect(0, y, size, hh);
      ctx.fillStyle = 'rgba(20,26,36,0.25)';
      ctx.fillRect(0, y, size, 3);
      hx.fillStyle = 'rgba(56,56,56,1)';
      hx.fillRect(0, y, size, 5);
    }
    for (let i = 0; i < 40; i++) {
      const x = rng() * size, y = rng() * size;
      const w = 30 + rng() * 90, hh = 20 + rng() * 60;
      ctx.strokeStyle = 'rgba(30,38,52,0.2)'; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, hh);
      hx.strokeStyle = 'rgba(96,96,96,1)'; hx.lineWidth = 3;
      hx.strokeRect(x, y, w, hh);
    }
    return { map: finish(c, { srgb: true }), normalMap: normalFromHeight(h, 1.0) };
  });
}

/** 工程部金属格栅地板。 */
export function gratingSurface({ size = 512, seed = 5 } = {}) {
  return cached('grating', () => {
    const c = makeCanvas(size);
    const h = makeCanvas(size);
    const ctx = c.getContext('2d');
    const hx = h.getContext('2d');
    const rng = makeRng(seed);
    ctx.fillStyle = '#3a3f48'; ctx.fillRect(0, 0, size, size);
    hx.fillStyle = '#404040'; hx.fillRect(0, 0, size, size);
    const step = size / 16;
    for (let x = 0; x < size; x += step) {
      for (let y = 0; y < size; y += step) {
        ctx.fillStyle = `rgba(${142 + rng() * 30 | 0},${148 + rng() * 30 | 0},${158 + rng() * 30 | 0},1)`;
        ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
        ctx.fillStyle = 'rgba(16,19,25,0.85)';
        ctx.fillRect(x + 6, y + 6, step - 12, step - 12);
        hx.fillStyle = '#dcdcdc'; hx.fillRect(x + 2, y + 2, step - 4, step - 4);
        hx.fillStyle = '#1a1a1a'; hx.fillRect(x + 6, y + 6, step - 12, step - 12);
      }
    }
    return { map: finish(c, { srgb: true }), normalMap: normalFromHeight(h, 2.6) };
  });
}

/** 舰桥 / 生活区地毯。 */
export function carpetSurface({ size = 512, base = '#3b3f4d', seed = 9 } = {}) {
  return cached(`carpet:${base}`, () => {
    const rng = makeRng(seed);
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (rng() - 0.5) * 26;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    const h = makeCanvas(size);
    const hx = h.getContext('2d');
    hx.fillStyle = '#808080'; hx.fillRect(0, 0, size, size);
    const hi = hx.getImageData(0, 0, size, size);
    for (let i = 0; i < hi.data.length; i += 4) {
      const n = (rng() - 0.5) * 80;
      hi.data[i] = 128 + n; hi.data[i + 1] = 128 + n; hi.data[i + 2] = 128 + n;
    }
    hx.putImageData(hi, 0, 0);
    return { map: finish(c, { srgb: true }), normalMap: normalFromHeight(h, 0.55) };
  });
}

const LCARS_COLORS = ['#ff9c00', '#cc99cc', '#9999ff', '#ff7b3d', '#ffcc66', '#6a8fff', '#cc6666'];

/**
 * LCARS 控制台面板贴图。
 * 按 (变体, 尺寸, 密度) 缓存：舰内有上百块面板，逐块生成 canvas 会吃掉几百 MB。
 */
export function lcarsPanel({ w = 512, h = 256, seed = 1, dense = 1 } = {}) {
  const variant = Math.abs(Math.round(seed)) % 14;
  return cached(`lcars:${variant}:${w}x${h}:${dense.toFixed(1)}`, () => buildLcarsPanel(w, h, variant, dense));
}

function buildLcarsPanel(w, h, variant, dense) {
  const seed = variant + 1;
  const rng = makeRng(seed * 977 + 13);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, w, h);
  const pick = () => LCARS_COLORS[Math.floor(rng() * LCARS_COLORS.length)];
  const pad = Math.round(h * 0.06);

  // 左侧 elbow 立柱
  const railW = Math.round(w * 0.14);
  ctx.fillStyle = pick();
  roundRect(ctx, pad, pad, railW, h - pad * 2, [railW * 0.45, 6, 6, railW * 0.45]);
  let y = pad + 6;
  while (y < h - pad - 10) {
    const bh = 10 + rng() * (h * 0.16);
    ctx.fillStyle = pick();
    roundRect(ctx, pad, y, railW, bh, [4, 4, 4, 4]);
    y += bh + 5;
  }

  // 右侧数据区
  const x0 = pad + railW + 12;
  const cols = Math.max(2, Math.round(3 * dense));
  const colW = (w - x0 - pad) / cols;
  for (let i = 0; i < cols; i++) {
    let yy = pad;
    while (yy < h - pad) {
      const bh = 8 + rng() * (h * 0.2);
      if (rng() > 0.35) {
        ctx.fillStyle = pick();
        ctx.globalAlpha = 0.55 + rng() * 0.45;
        roundRect(ctx, x0 + i * colW, yy, colW - 8, bh, [3, 3, 3, 3]);
        ctx.globalAlpha = 1;
        if (rng() > 0.6) {
          ctx.fillStyle = '#05070c';
          ctx.font = `${Math.max(7, bh * 0.4) | 0}px "JetBrains Mono", monospace`;
          ctx.fillText(String(Math.floor(rng() * 999999)).padStart(6, '0'), x0 + i * colW + 6, yy + bh * 0.7);
        }
      } else {
        // 波形 / 读数
        ctx.strokeStyle = 'rgba(159,215,255,0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < colW - 8; k += 2) {
          const yv = yy + bh / 2 + Math.sin(k * 0.22 + rng()) * bh * 0.35;
          k === 0 ? ctx.moveTo(x0 + i * colW + k, yv) : ctx.lineTo(x0 + i * colW + k, yv);
        }
        ctx.stroke();
      }
      yy += bh + 6;
    }
  }
  return finish(c, { srgb: true });
}

function roundRect(ctx, x, y, w, h, r) {
  const [a, b, cc, d] = r;
  ctx.beginPath();
  ctx.moveTo(x + a, y);
  ctx.lineTo(x + w - b, y); ctx.quadraticCurveTo(x + w, y, x + w, y + b);
  ctx.lineTo(x + w, y + h - cc); ctx.quadraticCurveTo(x + w, y + h, x + w - cc, y + h);
  ctx.lineTo(x + d, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - d);
  ctx.lineTo(x, y + a); ctx.quadraticCurveTo(x, y, x + a, y);
  ctx.fill();
}

/** 舰名 / 舷号 / 联邦徽记贴花（透明底）。 */
export function decalTexture(lines, { w = 1024, h = 256, color = '#4a4f59', align = 'center', font = 'Antonio', weight = 600, letterSpacing = 0.14 } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  const n = lines.length;
  lines.forEach((line, i) => {
    const size = Math.round((h / n) * 0.62);
    ctx.font = `${weight} ${size}px ${font}, sans-serif`;
    const x = align === 'center' ? w / 2 : 8;
    const y = (h / n) * (i + 0.5);
    const spaced = line.split('').join(' '.repeat(Math.max(1, Math.round(letterSpacing * 10))));
    ctx.fillText(spaced, x, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** 星云环境贴图（等距柱状）。 */
export function nebulaTexture({ w = 2048, h = 1024, seed = 4 } = {}) {
  return cached('nebula', () => {
    const rng = makeRng(seed);
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#01020a'; ctx.fillRect(0, 0, w, h);
    const blobs = [
      ['rgba(40,70,160,0.30)', 'rgba(10,20,60,0)'],
      ['rgba(120,50,150,0.22)', 'rgba(30,10,50,0)'],
      ['rgba(30,120,140,0.20)', 'rgba(5,30,40,0)'],
      ['rgba(160,80,60,0.14)', 'rgba(40,15,10,0)'],
    ];
    for (let i = 0; i < 52; i++) {
      const [c0, c1] = blobs[Math.floor(rng() * blobs.length)];
      const x = rng() * w, y = rng() * h;
      const r = 90 + rng() * 460;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c0); g.addColorStop(1, c1);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 9000; i++) {
      const x = rng() * w, y = rng() * h;
      const s = rng();
      const b = 140 + rng() * 115;
      ctx.fillStyle = `rgba(${b},${b},${255 - rng() * 60 | 0},${0.25 + s * 0.7})`;
      ctx.fillRect(x, y, s > 0.97 ? 2 : 1, s > 0.97 ? 2 : 1);
    }
    return finish(c, { srgb: true });
  });
}
