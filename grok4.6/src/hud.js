import { REGIONS } from "./config.js";
import { pointInBox as inBox } from "./utils.js";

export function bindHud(rig) {
  document.querySelectorAll("[data-tp]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      rig.teleport(btn.dataset.tp);
    });
  });
}

export function tickHud(rig) {
  const loc = document.getElementById("loc");
  const speed = document.getElementById("speed");
  const mode = document.getElementById("mode");
  const deck = document.getElementById("deck");
  const p = rig.camera.position;
  let found = { name: "深空", deck: "EVA" };
  for (const r of REGIONS) {
    if (inBox(p, r.box)) {
      found = r;
      break;
    }
  }
  loc.textContent = found.name;
  deck.textContent = found.deck;
  speed.textContent = `${rig.speed.toFixed(1).padStart(5, "0")} m/s`;
  mode.textContent = rig.mode === "walk" ? "舰内行走" : "EVA 飞行";
}
