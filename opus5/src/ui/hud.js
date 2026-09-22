const $ = (id) => document.getElementById(id);

const LOCATION_LABELS = {
  exterior: '外部视角 · EXTERNAL',
  bridge: '主舰桥 · DECK 1',
  engineering: '主工程部 · DECK 36',
  tenforward: '十前酒廊 · DECK 10',
  transporter: '传送室 3 号 · DECK 6',
  shuttlebay: '主穿梭机舱 · DECK 39',
  corridor: '碟部主走廊 · DECK 8',
};

export function createHud({ onGoto }) {
  const hud = $('hud');
  const modePill = $('mode-pill');
  const readout = $('readout');
  const keys = $('keys');
  const stats = $('stats');
  const crosshair = $('crosshair');
  const prompt = $('prompt');
  const centerNote = $('center-note');
  const fade = $('fade');
  const turbolift = $('turbolift');
  const tlList = $('tl-list');
  const transit = $('transit');
  const transitLabel = $('transit-label');

  for (const btn of document.querySelectorAll('.lcars-btn')) {
    btn.addEventListener('click', () => onGoto(btn.dataset.goto));
  }

  let frames = 0;
  let acc = 0;
  let fps = 0;

  function setActive(name) {
    for (const btn of document.querySelectorAll('.lcars-btn')) {
      btn.classList.toggle('active', btn.dataset.goto === name);
    }
    modePill.textContent = (LOCATION_LABELS[name] || name).split(' · ')[0].toUpperCase();
  }

  return {
    show() { hud.hidden = false; },
    openTurbolift(options) {
      tlList.innerHTML = options
        .map((o, i) => `<li><span>${i + 1}</span><span>${o.label}</span><em>${o.deck}</em></li>`)
        .join('');
      turbolift.hidden = false;
    },
    closeTurbolift() { turbolift.hidden = true; },
    get turboliftOpen() { return !turbolift.hidden; },
    async transit(label, ms = 1500) {
      transitLabel.textContent = label;
      transit.hidden = false;
      await new Promise((r) => setTimeout(r, ms));
      transit.hidden = true;
    },
    setMode(mode, location) {
      setActive(location);
      const inside = mode === 'interior';
      crosshair.hidden = !inside;
      centerNote.hidden = !inside;
      keys.innerHTML = inside
        ? '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 行走 &nbsp; <kbd>Shift</kbd> 疾行<br><kbd>鼠标</kbd> 视角 &nbsp; <kbd>E</kbd> 交互 &nbsp; <kbd>ESC</kbd> 解锁'
        : '<kbd>左键拖动</kbd> 环绕 &nbsp; <kbd>滚轮</kbd> 推拉<br><kbd>右键拖动</kbd> 平移 &nbsp; 右侧按钮进入舰内';
      readout.innerHTML = inside
        ? `<b>${LOCATION_LABELS[location] || location}</b><br>U.S.S. ENTERPRISE NCC-1701-D<br>GALAXY CLASS · 42 DECKS`
        : '<b>U.S.S. ENTERPRISE</b><br>NCC-1701-D · GALAXY CLASS<br>全长 642.5m · 全宽 463.7m<br>全高 195.3m · 乘员 1014';
    },
    hideCenterNote() { centerNote.hidden = true; },
    showCenterNote() { centerNote.hidden = false; },
    setPrompt(text) {
      if (!text) { prompt.hidden = true; return; }
      prompt.hidden = false;
      prompt.textContent = text;
    },
    tick(dt, renderer) {
      frames++;
      acc += dt;
      if (acc >= 0.5) {
        fps = Math.round(frames / acc);
        frames = 0;
        acc = 0;
        const info = renderer.info.render;
        stats.innerHTML = `<b>${fps}</b> FPS<br>${info.calls} draw calls<br>${(info.triangles / 1000).toFixed(0)}k tris`;
      }
    },
    async fadeOut(ms = 420) {
      fade.classList.add('on');
      await new Promise((r) => setTimeout(r, ms));
    },
    async fadeIn(ms = 420) {
      fade.classList.remove('on');
      await new Promise((r) => setTimeout(r, ms));
    },
  };
}
