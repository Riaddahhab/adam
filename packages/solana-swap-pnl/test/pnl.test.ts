import { test } from "node:test";
import assert from "node:assert/strict";
import { computePnl, swapFromBalanceChanges, type Swap } from "../src/index.ts";

const close = (a: number | null, b: number, msg?: string) => assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${msg ?? ""} ${a} ≠ ${b}`);

test("average cost: two buys, one partial sell", () => {
  const swaps: Swap[] = [
    { time: 1, mint: "TOK", side: "buy", amount: 100, quote: 1 },
    { time: 2, mint: "TOK", side: "buy", amount: 100, quote: 3 },
    { time: 3, mint: "TOK", side: "sell", amount: 50, quote: 2 },
  ];
  const r = computePnl(swaps, { TOK: 0.05 });
  const t = r.tokens[0]!;
  close(t.avgCost, 0.02);
  close(t.realized, 2 - 0.02 * 50);
  close(t.position, 150);
  close(t.costBasis, 3);
  close(t.unrealized, 150 * 0.05 - 3);
  assert.equal(r.complete, true);
});

test("fees raise the cost of buys and lower the proceeds of sells", () => {
  const r = computePnl([
    { time: 1, mint: "A", side: "buy", amount: 10, quote: 1, fee: 0.01 },
    { time: 2, mint: "A", side: "sell", amount: 10, quote: 2, fee: 0.01 },
  ]);
  close(r.realized, 2 - 0.01 - 1.01);
  assert.equal(r.tokens[0]!.position, 0);
  assert.equal(r.tokens[0]!.avgCost, null);
});

test("selling more than known buys realizes only the matched part and says so", () => {
  const r = computePnl([
    { time: 1, mint: "B", side: "buy", amount: 10, quote: 1 },
    { time: 2, mint: "B", side: "sell", amount: 30, quote: 6 },
  ]);
  const t = r.tokens[0]!;
  close(t.realized, (6 * 10) / 30 - 1);
  close(t.unmatchedSold, 20);
  assert.equal(t.complete, false);
  assert.equal(r.complete, false);
});

test("no price → unrealized is null, never zero", () => {
  const r = computePnl([{ time: 1, mint: "C", side: "buy", amount: 5, quote: 1 }]);
  assert.equal(r.unrealized, null);
  assert.deepEqual(r.unpriced, ["C"]);
  assert.equal(r.tokens[0]!.unrealized, null);
});

test("order is by time, then input order", () => {
  const r = computePnl([
    { time: 2, mint: "D", side: "sell", amount: 10, quote: 3 },
    { time: 1, mint: "D", side: "buy", amount: 10, quote: 1 },
  ]);
  close(r.realized, 2);
  assert.equal(r.complete, true);
});

test("several tokens add up", () => {
  const r = computePnl(
    [
      { time: 1, mint: "E", side: "buy", amount: 1, quote: 1 },
      { time: 1, mint: "F", side: "buy", amount: 2, quote: 1 },
      { time: 2, mint: "E", side: "sell", amount: 1, quote: 1.5 },
    ],
    { F: 1 },
  );
  close(r.realized, 0.5);
  close(r.unrealized, 1);
  assert.equal(r.tokens.length, 2);
});

test("bad input is refused", () => {
  assert.throws(() => computePnl([{ time: 1, mint: "", side: "buy", amount: 1, quote: 1 }]), /mint/);
  assert.throws(() => computePnl([{ time: 1, mint: "G", side: "hold" as never, amount: 1, quote: 1 }]), /side/);
  assert.throws(() => computePnl([{ time: 1, mint: "G", side: "buy", amount: 0, quote: 1 }]), /amount/);
  assert.throws(() => computePnl([{ time: 1, mint: "G", side: "buy", amount: 1, quote: Number.NaN }]), /quote/);
});

test("swapFromBalanceChanges: buys, sells, and refuses what is not one clean swap", () => {
  const SOL = "So11111111111111111111111111111111111111112";
  assert.deepEqual(swapFromBalanceChanges([{ mint: SOL, delta: -0.5 }, { mint: "TOK", delta: 1000 }], SOL, 10, "sig1"), { time: 10, mint: "TOK", side: "buy", amount: 1000, quote: 0.5, signature: "sig1" });
  assert.deepEqual(swapFromBalanceChanges([{ mint: SOL, delta: 0.8 }, { mint: "TOK", delta: -400 }], SOL, 11), { time: 11, mint: "TOK", side: "sell", amount: 400, quote: 0.8 });
  assert.equal(swapFromBalanceChanges([{ mint: "TOK", delta: 5 }], SOL, 1), null); // a transfer in
  assert.equal(swapFromBalanceChanges([{ mint: SOL, delta: -1 }, { mint: "A", delta: 1 }, { mint: "B", delta: 1 }], SOL, 1), null);
  assert.equal(swapFromBalanceChanges([{ mint: SOL, delta: 1 }, { mint: "A", delta: 1 }], SOL, 1), null);
});
