// node examples/sample.ts — PnL of a made-up wallet (sample data, not a real wallet), in SOL.
import { computePnl, swapFromBalanceChanges, type Swap } from "../src/index.ts";

const SOL = "So11111111111111111111111111111111111111112";
const swaps: Swap[] = [
  { time: 1_700_000_000, mint: "SAMPLE_MOON", side: "buy", amount: 2_000_000, quote: 1.2, fee: 0.0005 },
  { time: 1_700_000_600, mint: "SAMPLE_MOON", side: "buy", amount: 1_000_000, quote: 0.9, fee: 0.0005 },
  { time: 1_700_003_600, mint: "SAMPLE_MOON", side: "sell", amount: 1_500_000, quote: 2.4, fee: 0.0005 },
  { time: 1_700_007_200, mint: "SAMPLE_FROG", side: "buy", amount: 50_000, quote: 0.5 },
];
// A swap read from a transaction's balance changes:
const fromTx = swapFromBalanceChanges([{ mint: SOL, delta: 0.35 }, { mint: "SAMPLE_FROG", delta: -20_000 }], SOL, 1_700_010_000);
if (fromTx) swaps.push(fromTx);

const report = computePnl(swaps, { SAMPLE_MOON: 0.0000012 }); // SAMPLE_FROG has no price → its unrealized PnL is null
for (const t of report.tokens) {
  console.log(`${t.mint.padEnd(12)} position ${t.position.toLocaleString("en-US").padStart(10)}  avg ${t.avgCost?.toExponential(3) ?? "—"}  realized ${t.realized.toFixed(4)} SOL  unrealized ${t.unrealized === null ? "unknown" : t.unrealized.toFixed(4) + " SOL"}`);
}
console.log(`total realized ${report.realized.toFixed(4)} SOL · unrealized ${report.unrealized?.toFixed(4) ?? "unknown"} SOL · unpriced: ${report.unpriced.join(", ") || "none"}`);
