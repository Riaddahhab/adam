/**
 * solana-swap-pnl — realized and unrealized PnL of a Solana wallet from its swaps, with the average-cost method.
 *
 * Input: swaps already reduced to "this wallet bought / sold `amount` of `mint` for `quote` units of the quote asset"
 * (SOL, USDC, … — one quote asset per call). `swapFromBalanceChanges` turns a transaction's token balance changes into
 * that shape. Nothing here fetches data: bring swaps from any indexer or RPC you trust.
 *
 * Rules (average cost):
 *  - buy:  position += amount; cost += quote + fee
 *  - sell: matched = min(amount, position); avg = cost / position;
 *          realized += (quote − fee) × matched / amount − avg × matched; cost −= avg × matched; position −= matched
 *  - a sell larger than the known position (tokens that arrived by transfer, airdrop, …) only realizes the matched part;
 *    the rest is reported in `unmatchedSold` and the token is marked `complete: false` — never guessed.
 *  - unrealized = position × price − cost, only when a price is given; otherwise null (unknown is not zero).
 */

export type Side = "buy" | "sell";

export interface Swap {
  /** Unix time in seconds (or any increasing number): swaps are applied in this order. */
  time: number;
  mint: string;
  side: Side;
  /** Token amount in whole units (already divided by 10^decimals). */
  amount: number;
  /** Quote asset paid (buy) or received (sell), in whole units. */
  quote: number;
  /** Optional fee in quote units (network fee, tip, platform fee). */
  fee?: number;
  signature?: string;
}

export interface TokenPnl {
  mint: string;
  position: number;
  /** Quote units still invested in the open position. */
  costBasis: number;
  /** Average cost per token of the open position, or null with no position. */
  avgCost: number | null;
  realized: number;
  /** null when no price was given for this mint. */
  unrealized: number | null;
  bought: number;
  sold: number;
  /** Tokens sold beyond the known position (not realized, not guessed). */
  unmatchedSold: number;
  trades: number;
  /** false when some sells could not be matched to known buys. */
  complete: boolean;
}

export interface PnlReport {
  tokens: TokenPnl[];
  realized: number;
  /** Sum over tokens with a price; null if no open position has a price. */
  unrealized: number | null;
  /** Mints with an open position but no price. */
  unpriced: string[];
  complete: boolean;
}

const EPS = 1e-12;
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

function validate(s: Swap, i: number): void {
  if (!s || typeof s.mint !== "string" || !s.mint) throw new TypeError(`swap ${i}: mint is required`);
  if (s.side !== "buy" && s.side !== "sell") throw new TypeError(`swap ${i}: side must be "buy" or "sell"`);
  if (!finite(s.amount) || s.amount <= 0) throw new TypeError(`swap ${i}: amount must be a positive number`);
  if (!finite(s.quote) || s.quote < 0) throw new TypeError(`swap ${i}: quote must be a number ≥ 0`);
  if (s.fee !== undefined && (!finite(s.fee) || s.fee < 0)) throw new TypeError(`swap ${i}: fee must be a number ≥ 0`);
  if (!finite(s.time)) throw new TypeError(`swap ${i}: time must be a number`);
}

/** PnL per token and in total. `prices` maps mint → current price in quote units per token. */
export function computePnl(swaps: readonly Swap[], prices: Readonly<Record<string, number>> = {}): PnlReport {
  swaps.forEach(validate);
  const ordered = swaps.map((s, i) => ({ s, i })).sort((a, b) => a.s.time - b.s.time || a.i - b.i);
  const book = new Map<string, TokenPnl>();
  for (const { s } of ordered) {
    let t = book.get(s.mint);
    if (!t) {
      t = { mint: s.mint, position: 0, costBasis: 0, avgCost: null, realized: 0, unrealized: null, bought: 0, sold: 0, unmatchedSold: 0, trades: 0, complete: true };
      book.set(s.mint, t);
    }
    const fee = s.fee ?? 0;
    t.trades++;
    if (s.side === "buy") {
      t.position += s.amount;
      t.costBasis += s.quote + fee;
      t.bought += s.amount;
    } else {
      t.sold += s.amount;
      const matched = Math.min(s.amount, t.position);
      if (s.amount - matched > EPS) {
        t.unmatchedSold += s.amount - matched;
        t.complete = false;
      }
      if (matched > EPS) {
        const avg = t.costBasis / t.position;
        const proceeds = ((s.quote - fee) * matched) / s.amount;
        t.realized += proceeds - avg * matched;
        t.costBasis -= avg * matched;
        t.position -= matched;
      }
      if (t.position < EPS) {
        t.position = 0;
        t.costBasis = 0;
      }
    }
  }
  const tokens = [...book.values()];
  const unpriced: string[] = [];
  let unrealized: number | null = null;
  for (const t of tokens) {
    t.avgCost = t.position > 0 ? t.costBasis / t.position : null;
    if (t.position > 0) {
      const p = prices[t.mint];
      if (finite(p) && p >= 0) {
        t.unrealized = t.position * p - t.costBasis;
        unrealized = (unrealized ?? 0) + t.unrealized;
      } else unpriced.push(t.mint);
    } else t.unrealized = 0;
  }
  return {
    tokens,
    realized: tokens.reduce((a, t) => a + t.realized, 0),
    unrealized,
    unpriced,
    complete: tokens.every((t) => t.complete),
  };
}

export interface BalanceChange {
  mint: string;
  /** Change of the wallet's balance in whole units: negative = left the wallet. */
  delta: number;
}

/**
 * One swap from a transaction's balance changes for the wallet (e.g. pre/post token balances): exactly one quote asset
 * moving one way and one other token moving the other way. Returns null for anything else (transfers, multi-hop
 * leftovers, liquidity moves) instead of guessing. Use the native SOL change minus the network fee as the SOL delta.
 */
export function swapFromBalanceChanges(changes: readonly BalanceChange[], quoteMint: string, time: number, signature?: string): Swap | null {
  const moved = changes.filter((c) => finite(c.delta) && Math.abs(c.delta) > EPS);
  const quote = moved.filter((c) => c.mint === quoteMint);
  const others = moved.filter((c) => c.mint !== quoteMint);
  if (quote.length !== 1 || others.length !== 1) return null;
  const q = quote[0]!, o = others[0]!;
  if (Math.sign(q.delta) === Math.sign(o.delta)) return null;
  return { time, mint: o.mint, side: o.delta > 0 ? "buy" : "sell", amount: Math.abs(o.delta), quote: Math.abs(q.delta), ...(signature ? { signature } : {}) };
}
