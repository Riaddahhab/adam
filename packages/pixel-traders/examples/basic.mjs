// node examples/basic.mjs > traders.html  — writes a page with the 12 presets and 12 traders made from ids.
import { svg, encode, defaultSeed, PRESETS } from "../src/index.js";

const cell = (s, label) => `<figure><div class="a">${svg(s)}</div><figcaption>${label}</figcaption></figure>`;
const presets = PRESETS.map((p, i) => cell(encode(p), "preset " + (i + 1))).join("");
const fromIds = ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi", "ivan", "judy", "mallory", "niaj"].map((id) => cell(defaultSeed(id), id)).join("");
console.log(`<!doctype html><meta charset="utf-8"><title>pixel-traders</title>
<style>body{background:#0A0A0C;color:#C7CCD6;font:15px system-ui;padding:24px}.g{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;text-align:center}.a{width:96px;height:96px;border-radius:50%;overflow:hidden}.a svg{width:100%;height:100%}</style>
<h2>Presets</h2><div class="g">${presets}</div><h2>defaultSeed(id)</h2><div class="g">${fromIds}</div>`);
