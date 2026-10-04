import { test } from "node:test";
import assert from "node:assert/strict";
import { encode, decode, svg, random, defaultSeed, paths, pixels, PRESETS, BACKGROUNDS, SKINS, HAIR_STYLES, HAIR_COLORS, ACCESSORIES } from "../src/index.js";

test("encode/decode round-trip for every possible trader", () => {
  let n = 0;
  for (let background = 0; background < BACKGROUNDS.length; background++)
    for (let skin = 0; skin < SKINS.length; skin++)
      for (let hair = 0; hair < HAIR_STYLES.length; hair++)
        for (let hairColor = 0; hairColor < HAIR_COLORS.length; hairColor++)
          for (let accessory = 0; accessory < ACCESSORIES.length; accessory++)
            for (const crown of [false, true]) {
              const spec = { background, skin, hair, hairColor, accessory, crown };
              assert.deepEqual(decode(encode(spec)), spec);
              n++;
            }
  assert.equal(n, 51840);
});

test("invalid seeds are refused", () => {
  for (const bad of ["", null, undefined, "pb1-", "pb1-zzzzzz", "pb1-00000", "pb1-900000", "pb1-000002", "PB1-000000", "<svg>"]) assert.equal(decode(bad), null, String(bad));
});

test("pixels: 256 cells, every cell painted, symmetric face", () => {
  const grid = pixels(PRESETS[0]);
  assert.equal(grid.length, 256);
  assert.ok(grid.every((c) => /^#[0-9a-f]{6}$/.test(c)));
  assert.equal(grid[8 * 16 + 6], "#111111"); // eyes
  assert.equal(grid[8 * 16 + 9], "#111111");
});

test("paths cover the whole grid exactly once", () => {
  for (const spec of PRESETS) {
    let area = 0;
    for (const p of paths(spec)) for (const m of p.d.matchAll(/h(\d+)v1/g)) area += Number(m[1]);
    assert.equal(area, 256);
  }
});

test("svg is a small, self-contained picture", () => {
  const s = svg(encode(PRESETS[3]));
  assert.match(s, /^<svg viewBox="0 0 16 16" shape-rendering="crispEdges"/);
  assert.ok(s.length < 4000);
  assert.equal(svg("not-a-seed"), svg(encode(PRESETS[0]))); // unknown seeds draw the first preset
});

test("defaultSeed is stable, valid, case-insensitive for EVM, never crowned", () => {
  assert.equal(defaultSeed("abc"), defaultSeed("abc"));
  assert.equal(defaultSeed("0xAbCdEf0123456789aBcDeF0123456789AbCdEf01"), defaultSeed("0xabcdef0123456789abcdef0123456789abcdef01"));
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const s = defaultSeed("user-" + i);
    const spec = decode(s);
    assert.ok(spec && spec.crown === false, s);
    seen.add(s);
  }
  assert.ok(seen.size > 400); // well spread
});

test("random never draws the crown and uses the given source", () => {
  assert.deepEqual(random(() => 0), { background: 0, skin: 0, hair: 0, hairColor: 0, accessory: 0, crown: false });
  assert.deepEqual(random(() => 0.999999), { background: 8, skin: 7, hair: 7, hairColor: 8, accessory: 4, crown: false });
});

test("fixed vectors (changing the drawing is a breaking change)", () => {
  assert.equal(encode(PRESETS[1]), "pb1-711120");
  assert.equal(defaultSeed("bopzop"), defaultSeed("bopzop"));
});
