# pixel-traders

The pixel people of [bopzop](https://bopzop.trade): 16×16 traders built from pieces, drawn as tiny SVG strings.
Zero dependencies, deterministic, the same picture in the browser, on the server and in share images.

**[Live demo →](https://riaddahhab.github.io/adam/)**

```js
import { svg, encode, decode, random, defaultSeed, PRESETS } from "pixel-traders";

svg(defaultSeed("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")); // a stable trader for any id or wallet
const seed = encode({ background: 2, skin: 3, hair: 5, hairColor: 2, accessory: 1, crown: false }); // "pb1-235210"
decode(seed);          // → the pieces back, or null for anything that isn't a valid seed
svg(encode(random())); // a random trader (never the crown)
```

| Piece | Options |
| --- | --- |
| background | 9 colours |
| skin | 8 tones |
| hair | short, long, bun, spiky, mohawk, side, hood, bald |
| hairColor | 9 colours |
| accessory | none, glasses, shades, cap, hood |
| crown | earned in the bopzop app |

A seed is `pb1-` + six base-36 digits (51,840 possible traders). `npm test` runs the tests;
`node examples/basic.mjs > traders.html` writes a gallery.
