/** Constitution-class refit, 1 unit = 1 meter. +Z forward, +Y up, +X starboard. */

export const SAUCER_R = 70.85;
export const SHIP_LENGTH = 305;

export const POS = {
  saucer: { x: 0, y: 28, z: 48 },
  secondary: { x: 0, y: 0, z: -42 },
  deflector: { x: 0, y: -1.2, z: 18 },
  hangarAft: { x: 0, y: -2.5, z: -98 },
  nacellePort: { x: -48.5, y: 26, z: -52 },
  nacelleStbd: { x: 48.5, y: 26, z: -52 },
  bridge: { x: 0, y: 40.6, z: 48 },
  engineering: { x: 0, y: 1.2, z: -46 },
};

export const TELEPORTS = {
  inspect: { pos: [168, 62, 128], look: [0, 18, 0] },
  hangar: { pos: [0, -4.9, -86], look: [0, -4.2, -108] },
  engineering: { pos: [6.2, -4.7, -38], look: [0, 2, -46] },
  bridge: { pos: [0, 39.35, 43.2], look: [0, 39.6, 54] },
};

export const REGIONS = [
  { id: "bridge", name: "舰桥 · Deck 1", deck: "Deck 1", box: [-7, 37.6, 40, 7, 43.2, 56] },
  { id: "saucer", name: "碟部环形走廊", deck: "Deck 5", box: [-62, 26.4, -8, 62, 33.5, 108] },
  { id: "neck", name: "连接颈 / 涡轮电梯井", deck: "Deck 8–15", box: [-4.2, 6, 8, 4.2, 30, 28] },
  { id: "engineering", name: "主引擎室", deck: "Deck 15", box: [-11, -8, -72, 11, 14, -18] },
  { id: "hangar", name: "主穿梭机库", deck: "Deck 19", box: [-12, -8.5, -108, 12, 10, -72] },
  { id: "hull", name: "近舰外壳", deck: "EVA", box: [-90, -30, -180, 90, 55, 130] },
];

export const COLORS = {
  hullA: 0xc9c6be,
  hullB: 0x8e9298,
  hullC: 0x6a6e74,
  marking: 0x1e3d66,
  bussard: 0xff2d18,
  warp: 0x79c7ff,
  deflector: 0x4aa6ff,
  impulse: 0xff7a32,
  interior: 0xe7dccb,
  bulkhead: 0xb7b1a6,
  deck: 0x3a4450,
  amber: 0xe4a35a,
};
