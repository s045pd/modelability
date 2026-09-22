// 墙体构建：可在墙上开门（自动门/拱门/电梯门），同时生成碰撞体
export function wallSeg(kit, x0, z0, x1, z1, o = {}) {
  const M = kit.M;
  const { h = 3.2, y0 = 0, t = 0.3, mat = M.wall, mat2 = null, doors = [], trim = M.consoleBlue, ext = 0.12, doorH = 2.4, base = true } = o;
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
  const ang = Math.atan2(-dz, dx);
  kit.push((x0 + x1) / 2, 0, (z0 + z1) / 2, ang);
  const sorted = doors.slice().sort((a, b) => a.t - b.t);
  const solids = [];
  let cursor = -L / 2 - ext;
  for (const d of sorted) {
    const c = -L / 2 + d.t, a = c - d.w / 2, b = c + d.w / 2;
    if (a > cursor) solids.push([cursor, a]);
    cursor = b;
  }
  if (cursor < L / 2 + ext) solids.push([cursor, L / 2 + ext]);
  const out = [];
  for (const [a, b] of solids) {
    const len = b - a, cx = (a + b) / 2;
    if (len < 0.02) continue;
    if (mat2) {
      kit.box(mat, [cx, y0 + h / 2, t / 4], [len, h, t / 2]);
      kit.box(mat2, [cx, y0 + h / 2, -t / 4], [len, h, t / 2]);
    } else kit.box(mat, [cx, y0 + h / 2, 0], [len, h, t]);
    if (o.collide !== false) kit.wall(cx, 0, len / 2, t / 2, y0, y0 + h);
    if (base) {
      kit.box(M.consoleDark, [cx, y0 + 0.08, 0], [len, 0.16, t + 0.05]);
      if (trim) kit.box(trim, [cx, y0 + 1.15, 0], [len, 0.09, t + 0.03]);
    }
  }
  for (const d of sorted) {
    const c = -L / 2 + d.t;
    const dh = d.h || doorH;
    kit.box(mat, [c, y0 + dh + (h - dh) / 2, 0], [d.w + 0.02, h - dh, t]);
    if (d.type === 'arch') {
      kit.box(M.steelDark, [c - d.w / 2 - 0.08, y0 + dh / 2, 0], [0.16, dh, t + 0.06]);
      kit.box(M.steelDark, [c + d.w / 2 + 0.08, y0 + dh / 2, 0], [0.16, dh, t + 0.06]);
      kit.box(M.steelDark, [c, y0 + dh + 0.06, 0], [d.w + 0.32, 0.14, t + 0.06]);
      kit.box(M.lampWarm, [c, y0 + dh - 0.04, 0], [d.w * 0.7, 0.04, t + 0.08]);
      out.push({ t: d.t, x: c, type: 'arch' });
    } else {
      const door = kit.door(c, y0, 0, { w: d.w, h: dh, radius: d.radius || 3.0, tint: d.tint, accent: d.accent });
      out.push({ t: d.t, x: c, type: d.type || 'door', door });
    }
  }
  kit.pop();
  return out;
}

// 多边形闭合墙链
export function wallLoop(kit, pts, o = {}) {
  const res = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const key = o.doorsFor ? o.doorsFor(i, a, b) : [];
    res.push(wallSeg(kit, a[0], a[1], b[0], b[1], { ...o, doors: key }));
  }
  return res;
}
