import { DESTS } from '../interior/dests.js';
import { codeOf } from './keys.js';

const $ = (id) => document.getElementById(id);

export function createUI({ world, controller, getMode, setMode }) {
  const state = { menu: null, toastTimer: 0 };
  const fade = $('fade');
  const promptEl = $('prompt');

  function showMenu(name) {
    $('map').hidden = name !== 'map';
    $('lift').hidden = name !== 'lift';
    state.menu = name;
    if (name) { document.exitPointerLock?.(); controller.keys.clear(); }
  }

  function destButtons(container, fromKey) {
    container.innerHTML = '';
    DESTS.forEach((d, i) => {
      if (!world.spawns[d.key]) return;
      const b = document.createElement('button');
      b.className = 'dest';
      b.dataset.c = d.c;
      b.innerHTML = `<b>${i + 1 <= 9 ? i + 1 : ''}</b>${d.name}<small>${d.sub}</small>`;
      b.addEventListener('click', () => go(d.key));
      container.appendChild(b);
    });
  }

  async function go(key) {
    const sp = world.spawns[key];
    if (!sp) return;
    showMenu(null);
    ui.onLift?.();
    fade.classList.add('on');
    await new Promise((r) => setTimeout(r, 380));
    if (getMode() !== 'walk') setMode('walk');
    controller.teleportWalk(sp.x, sp.y, sp.z, sp.yaw);
    controller.vel.set(0, 0, 0);
    await new Promise((r) => setTimeout(r, 120));
    fade.classList.remove('on');
    ui.onTeleport?.(key);
  }

  const ui = {
    onTeleport: null,
    onLift: null,
    go,
    openLift(fromKey) { destButtons($('lift-list'), fromKey); showMenu('lift'); },
    toggleMap() {
      if (state.menu === 'map') { showMenu(null); return; }
      destButtons($('map-list'), null);
      showMenu('map');
    },
    close() { showMenu(null); },
    get menuOpen() { return !!state.menu; },
    toast(text) {
      promptEl.hidden = false;
      promptEl.textContent = text;
      promptEl.dataset.toast = '1';
      clearTimeout(state.toastTimer);
      state.toastTimer = setTimeout(() => { delete promptEl.dataset.toast; }, 5000);
    },
    setPrompt(text) {
      if (promptEl.dataset.toast) return;
      if (text) { promptEl.hidden = false; promptEl.textContent = text; } else promptEl.hidden = true;
    },
    setLocation(deck, name) { $('loc-deck').textContent = deck || ''; $('loc-name').textContent = name || ''; },
  };

  $('map-close').addEventListener('click', () => showMenu(null));
  $('lift').addEventListener('click', (e) => { if (e.target === $('lift')) showMenu(null); });
  window.addEventListener('keydown', (e) => {
    const code = codeOf(e);
    if (code === 'Escape' && state.menu) showMenu(null);
    if (state.menu && /^Digit[1-9]$/.test(code)) {
      const avail = DESTS.filter((d) => world.spawns[d.key]);
      const d = avail[Number(code.slice(5)) - 1];
      if (d) go(d.key);
    }
  });
  return ui;
}
