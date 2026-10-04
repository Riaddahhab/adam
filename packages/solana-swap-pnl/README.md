# solana-swap-pnl

Realized and unrealized PnL of a Solana wallet from its swaps, using the **average-cost** method. TypeScript, zero
dependencies, no network calls: bring swaps from any indexer or RPC you trust.

```ts
import { computePnl, swapFromBalanceChanges } from "solana-swap-pnl";

const report = computePnl(
  [
    { time: 1, mint: "TOK", side: "buy", amount: 100, quote: 1 },   // paid 1 SOL
    { time: 2, mint: "TOK", side: "buy", amount: 100, quote: 3 },   // paid 3 SOL
    { time: 3, mint: "TOK", side: "sell", amount: 50, quote: 2 },   // got 2 SOL
  ],
  { TOK: 0.05 }, // current price in SOL per token
);
report.realized;   // 1    (2 − 50 × 0.02)
report.unrealized; // 4.5  (150 × 0.05 − 3)
```

- Fees raise the cost of buys and lower the proceeds of sells.
- A sell larger than the known position (tokens that arrived by transfer or airdrop) only realizes the matched part;
  the rest is reported as `unmatchedSold` and the result says `complete: false`. Nothing is guessed.
- No price for a mint → its unrealized PnL is `null`, not `0`.
- `swapFromBalanceChanges(changes, quoteMint, time)` turns a transaction's balance changes into a swap, or `null` when
  it isn't exactly one clean swap.

`npm test` runs the tests (Node ≥ 22.18 runs the TypeScript directly); `npm run example` prints a sample wallet.
