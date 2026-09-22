// 舰体示意图：船首朝上，标出玩家位置与朝向
const W = 132, H = 300, S = 0.98;
const OX = W / 2, OY = 76;
const px = (x) => OX + x * S;
const py = (z) => OY + z * S;

function drawShip(ctx) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,9,14,0.7)';
  ctx.strokeStyle = 'rgba(255,156,58,0.9)';
  ctx.lineWidth = 1.4;
  // 碟体
  ctx.beginPath(); ctx.arc(px(0), py(0), 63.9 * S, 0, 6.3); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(111,168,255,0.55)'; ctx.lineWidth = 1;
  for (const r of [7.2, 32.2, 48]) { ctx.beginPath(); ctx.arc(px(0), py(0), r * S, 0, 6.3); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(111,168,255,0.4)';
  for (const a of [0, 1, 2, 3]) { ctx.beginPath(); ctx.moveTo(px(Math.sin(a * 1.5708) * 7.2), py(-Math.cos(a * 1.5708) * 7.2)); ctx.lineTo(px(Math.sin(a * 1.5708) * 30.5), py(-Math.cos(a * 1.5708) * 30.5)); ctx.stroke(); }
  // 颈部与副船体
  ctx.strokeStyle = 'rgba(255,156,58,0.9)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.rect(px(-13.5), py(22), 27, 110.5 * S); ctx.fillStyle = 'rgba(6,9,14,0.7)'; ctx.fill(); ctx.stroke();
  // 曲速舱
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.rect(px(s * 30) - 5.5, py(88), 11, 138 * S); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px(s * 6.4), py(118)); ctx.lineTo(px(s * 30), py(140)); ctx.strokeStyle = 'rgba(255,156,58,0.5)'; ctx.stroke(); ctx.strokeStyle = 'rgba(255,156,58,0.9)'; }
  // 工程与机库
  ctx.fillStyle = 'rgba(226,102,78,0.5)'; ctx.fillRect(px(-11), py(52), 22, 34 * S);
  ctx.fillStyle = 'rgba(255,204,102,0.5)'; ctx.fillRect(px(-11), py(100.5), 22, 32 * S);
  ctx.fillStyle = 'rgba(255,204,102,0.9)'; ctx.beginPath(); ctx.arc(px(0), py(0), 9 * S, 0, 6.3); ctx.fill();
  ctx.font = '9px sans-serif'; ctx.fillStyle = 'rgba(233,237,245,0.75)'; ctx.textAlign = 'center';
  ctx.fillText('桥', px(0), py(0) + 3); ctx.fillText('轮机', px(0), py(69) + 3); ctx.fillText('机库', px(0), py(116) + 3);
}

export function createMinimap(canvas) {
  canvas.width = W; canvas.height = H;
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  drawShip(base.getContext('2d'));
  const ctx = canvas.getContext('2d');
  return {
    draw(x, z, yaw) {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(base, 0, 0);
      const cx = px(x), cy = py(z);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-yaw);
      ctx.fillStyle = '#ffcc66'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.2, 4.5); ctx.lineTo(0, 2.4); ctx.lineTo(-4.2, 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
  };
}
