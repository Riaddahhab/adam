/**
 * pixel-traders — the pixel people of bopzop (seed format «pb1-», 16×16 grid, flat colours).
 *
 * A trader is built from pieces: background, skin tone, hair style, hair colour, one accessory and an optional crown.
 * The same seed draws the same picture everywhere (browser, server, share image): plain SVG, no canvas, no dependencies.
 *
 *   import { encode, decode, svg, random, defaultSeed, PRESETS } from "pixel-traders";
 *   svg(defaultSeed("any-wallet-or-id"))   // → "<svg …>"
 *
 * defaultSeed(key): a stable trader for any string — mulberry32(FNV-1a("pixel-person-v1:" + key)) drives one draw per
 * piece (EVM addresses are lower-cased first). It never wears the crown.
 */
const PixelPerson = (function () {
  var PREFIX = "pb1-", GRID = 16;
  var BACKGROUNDS = ["#10b981", "#f59e0b", "#3b82f6", "#a855f7", "#ef4444", "#14b8a6", "#84cc16", "#ec4899", "#64748b"];
  var SKINS = ["#fde3cf", "#f6cfb2", "#e8bf96", "#dcae86", "#c98a4b", "#a0673f", "#7b4a2a", "#5c3a20"];
  var HAIR_STYLES = ["short", "long", "bun", "spiky", "mohawk", "side", "hood", "bald"];
  var HAIR_COLORS = ["#2a1a12", "#111827", "#7c2d12", "#b45309", "#f97316", "#fde047", "#f8fafc", "#7c3aed", "#ef4444"];
  var ACCESSORIES = ["none", "glasses", "shades", "cap", "hood"];
  var SHIRT = "#1f2937", EYES = "#111111", MOUTH = "#9a3412", FRAME = "#1f2937", SHADES = "#0b0b0b", LENS = "#9ca3af";
  var CAP = "#ef4444", BRIM = "#b91c1c", GOLD = "#fbbf24", GOLD_DARK = "#d97706";

  function inRange(n, list) { return Number.isInteger(n) && n >= 0 && n < list.length; }
  function encode(spec) {
    return PREFIX + spec.background.toString(36) + spec.skin.toString(36) + spec.hair.toString(36) + spec.hairColor.toString(36) + spec.accessory.toString(36) + (spec.crown ? "1" : "0");
  }
  function decode(seed) {
    if (!seed || typeof seed !== "string" || seed.indexOf(PREFIX) !== 0) return null;
    var body = seed.slice(PREFIX.length);
    if (!/^[0-9a-z]{6}$/.test(body)) return null;
    var d = body.split("").map(function (c) { return parseInt(c, 36); });
    var spec = { background: d[0], skin: d[1], hair: d[2], hairColor: d[3], accessory: d[4], crown: d[5] === 1 };
    if (!inRange(d[0], BACKGROUNDS) || !inRange(d[1], SKINS) || !inRange(d[2], HAIR_STYLES) || !inRange(d[3], HAIR_COLORS) || !inRange(d[4], ACCESSORIES) || d[5] > 1) return null;
    return spec;
  }

  function row(y, x0, x1) { var out = []; for (var x = x0; x <= x1; x++) out.push([x, y]); return out; }
  function col(x, y0, y1) { var out = []; for (var y = y0; y <= y1; y++) out.push([x, y]); return out; }
  function block(x0, x1, y0, y1) { var out = []; for (var y = y0; y <= y1; y++) out = out.concat(row(y, x0, x1)); return out; }
  function cat() { return [].concat.apply([], arguments); }
  var FACE = block(4, 11, 5, 12), NECK = row(13, 6, 9), SHIRT_CELLS = block(2, 13, 14, 15);
  var HAIR = {
    short: cat(row(3, 4, 11), row(4, 3, 11), row(5, 3, 8), col(3, 6, 7)),
    long: cat(row(3, 4, 11), row(4, 3, 12), col(3, 5, 13), col(12, 5, 13)),
    bun: cat(block(6, 9, 1, 2), row(3, 4, 11), row(4, 3, 12), col(3, 5, 6), col(12, 5, 6)),
    spiky: cat([[4, 2], [6, 2], [8, 2], [10, 2]], row(3, 4, 11), row(4, 3, 12)),
    mohawk: block(7, 8, 1, 4),
    side: cat(row(3, 5, 12), row(4, 4, 12), row(5, 9, 12), col(12, 6, 7)),
    hood: cat(row(2, 5, 10), row(3, 3, 12), row(4, 2, 13), col(2, 5, 13), col(3, 5, 13), col(12, 5, 13), col(13, 5, 13)),
    bald: [],
  };
  function ring(cx, cy) { return cat(row(cy - 1, cx - 1, cx + 1), [[cx - 1, cy], [cx + 1, cy]], row(cy + 1, cx - 1, cx + 1)); }

  function pixels(spec) {
    var grid = new Array(GRID * GRID).fill(BACKGROUNDS[spec.background] || BACKGROUNDS[0]);
    function paint(cells, color) {
      for (var i = 0; i < cells.length; i++) { var x = cells[i][0], y = cells[i][1]; if (x >= 0 && x < GRID && y >= 0 && y < GRID) grid[y * GRID + x] = color; }
    }
    var skin = SKINS[spec.skin] || SKINS[0], hair = HAIR_COLORS[spec.hairColor] || HAIR_COLORS[0], acc = ACCESSORIES[spec.accessory] || "none";
    paint(SHIRT_CELLS, SHIRT);
    paint(NECK, skin);
    paint(FACE, skin);
    paint([[6, 8], [9, 8]], EYES);
    paint([[7, 11], [8, 11]], MOUTH);
    paint(HAIR[HAIR_STYLES[spec.hair] || "short"], hair);
    if (acc === "glasses") paint(cat(ring(6, 8), ring(9, 8)), FRAME);
    if (acc === "shades") { paint(block(5, 10, 7, 8), SHADES); paint([[6, 7], [9, 7]], LENS); }
    if (acc === "cap") { paint(cat(row(2, 5, 10), row(3, 4, 11), row(4, 3, 12)), CAP); paint(row(5, 2, 7), BRIM); }
    if (acc === "hood") paint(HAIR.hood, SHIRT);
    if (spec.crown) { paint([[5, 0], [7, 0], [8, 0], [10, 0]], GOLD); paint(row(1, 5, 10), GOLD); paint(row(2, 5, 10), GOLD_DARK); }
    return grid;
  }
  /** one path per colour, in first-seen order (the same order as the original's Map) */
  function paths(spec) {
    var grid = pixels(spec), order = [], by = {};
    for (var y = 0; y < GRID; y++) {
      var x = 0;
      while (x < GRID) {
        var color = grid[y * GRID + x], end = x;
        while (end < GRID && grid[y * GRID + end] === color) end++;
        if (!(color in by)) { by[color] = ""; order.push(color); }
        by[color] += "M" + x + " " + y + "h" + (end - x) + "v1h-" + (end - x) + "z";
        x = end;
      }
    }
    return order.map(function (c) { return { color: c, d: by[c] }; });
  }
  function svg(seed) {
    var spec = decode(seed) || PRESETS[0];
    return '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">' + paths(spec).map(function (p) { return '<path fill="' + p.color + '" d="' + p.d + '"/>'; }).join("") + "</svg>";
  }
  var PRESETS = [
    { background: 0, skin: 2, hair: 0, hairColor: 0, accessory: 0, crown: false },
    { background: 7, skin: 1, hair: 1, hairColor: 1, accessory: 2, crown: false },
    { background: 2, skin: 3, hair: 5, hairColor: 2, accessory: 1, crown: false },
    { background: 3, skin: 0, hair: 2, hairColor: 7, accessory: 0, crown: false },
    { background: 1, skin: 4, hair: 3, hairColor: 4, accessory: 0, crown: false },
    { background: 5, skin: 6, hair: 4, hairColor: 1, accessory: 0, crown: false },
    { background: 6, skin: 1, hair: 0, hairColor: 5, accessory: 3, crown: false },
    { background: 8, skin: 5, hair: 6, hairColor: 8, accessory: 0, crown: false },
    { background: 4, skin: 2, hair: 1, hairColor: 3, accessory: 1, crown: false },
    { background: 0, skin: 7, hair: 7, hairColor: 0, accessory: 2, crown: false },
    { background: 2, skin: 0, hair: 3, hairColor: 6, accessory: 0, crown: false },
    { background: 3, skin: 3, hair: 2, hairColor: 2, accessory: 4, crown: false },
  ];
  function random(rnd) {
    rnd = rnd || Math.random;
    function pick(list) { return Math.min(list.length - 1, Math.floor(rnd() * list.length)); }
    var background = pick(BACKGROUNDS), skin = pick(SKINS), hair = pick(HAIR_STYLES), hairColor = pick(HAIR_COLORS), accessory = pick(ACCESSORIES);
    return { background: background, skin: skin, hair: hair, hairColor: hairColor, accessory: accessory, crown: false };
  }
  function stableHash(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function defaultSeed(key) {
    var k = String(key).trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(k)) k = k.toLowerCase();
    return encode(random(mulberry32(stableHash("pixel-person-v1:" + k))));
  }
  return {
    PREFIX: PREFIX, BACKGROUNDS: BACKGROUNDS, SKINS: SKINS, HAIR_STYLES: HAIR_STYLES, HAIR_COLORS: HAIR_COLORS, ACCESSORIES: ACCESSORIES,
    PRESETS: PRESETS, encode: encode, decode: decode, pixels: pixels, paths: paths, svg: svg, random: random, defaultSeed: defaultSeed,
  };
})();

export const { PREFIX, BACKGROUNDS, SKINS, HAIR_STYLES, HAIR_COLORS, ACCESSORIES, PRESETS, encode, decode, pixels, paths, svg, random, defaultSeed } = PixelPerson;
export default PixelPerson;
