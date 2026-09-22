function mockCtx() {
  return {
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    globalAlpha: 1,
    font: "16px sans-serif",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillRect() {},
    clearRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {},
    stroke() {},
    fillText() {},
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    setTransform() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    getImageData(x, y, w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4), width: w, height: h };
    },
    putImageData() {},
  };
}

class MockCanvas {
  constructor() {
    this.width = 256;
    this.height = 256;
  }
  getContext() {
    return mockCtx();
  }
}

global.window = global;
global.document = {
  createElement(tag) {
    if (tag === "canvas") return new MockCanvas();
    return { style: {} };
  },
  getElementById() {
    return { classList: { remove() {}, add() {} }, style: {}, remove() {}, textContent: "", addEventListener() {} };
  },
  querySelectorAll() {
    return [];
  },
  addEventListener() {},
};
global.Image = class Image {};

const { buildTextures } = await import("../src/textures.js");
const { buildMaterials } = await import("../src/materials.js");
const { buildEnterprise } = await import("../src/ship/enterprise.js");
const { buildInteriors } = await import("../src/interior/index.js");

const tex = buildTextures();
const mats = buildMaterials(tex);
const ship = buildEnterprise(mats, tex);
const interiors = buildInteriors(mats);

let meshes = 0;
let floors = 0;
ship.traverse((o) => {
  if (o.isMesh || o.isInstancedMesh) meshes += 1;
});
interiors.traverse((o) => {
  if (o.isMesh || o.isInstancedMesh) meshes += 1;
  if (o.name === "walkFloor") floors += 1;
});

if (!ship.getObjectByName("saucer")) throw new Error("missing saucer");
if (!interiors.getObjectByName("hangarInterior")) throw new Error("missing hangar");
if (!interiors.getObjectByName("bridgeInterior")) throw new Error("missing bridge");
if (!interiors.getObjectByName("engineeringInterior")) throw new Error("missing engineering");
if (floors < 8) throw new Error(`too few walk floors: ${floors}`);
if (meshes < 80) throw new Error(`too few meshes: ${meshes}`);

console.log(JSON.stringify({ ok: true, meshes, floors }, null, 2));
