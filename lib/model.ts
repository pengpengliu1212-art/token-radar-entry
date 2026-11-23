// The launch radar's valuation model: a sealed DefiLlama snapshot in, a ranked
// pre-token board out.
//
// Nothing here is hand-picked per protocol. What the snapshot's own figures
// fit: the two OLS slopes (growth, size), the per-category intercepts and the
// global intercept they shrink toward. What is a stated choice, not a fit: the
// maturity shape (0.75 + 0.25 x min(age, 1095)/1095), the growth clamp window
// and slope cap, the winsor percentiles, the shrinkage pseudo-count (K=5),
// MIN_CATEGORY_N, the board/live row counts, and the farm plan's gas prices.
// The dashboard's Model page discloses the fitted-versus-chosen split too.
//
//   1. Comparables: live-token protocols give a market cap / TVL ratio each.
//      Four fifths of them (by a hash of the slug) fit the model, one fifth is
//      held out to score it blind.
//   2. Per-category multiples: in log space, ln(mcap/TVL) = intercept + growth
//      slope x clamp(7d) + size slope x (ln TVL - ln reference TVL). The two
//      slopes are one OLS over the fit set; ratios are winsorised at the fit
//      set's 10th/90th percentile first. The intercept is per category — the
//      median residual of that category's fit-set comparables, shrunk toward
//      the global intercept with a pseudo-count of 5 — and a global fallback
//      covers categories too thin to carry their own. The reference TVL is the
//      fit set's median, so an intercept reads as a multiple at an ordinary
//      size; the fitted size slope (negative) says the market prices TVL
//      sublinearly, a size discount the model keeps because the holdout proves
//      it predicts.
//   3. Growth: the OLS slope on the clamped 7-day change, kept positive and
//      capped so one hot week cannot dominate. growthMult = exp(slope x clamp).
//   4. Maturity: how long the protocol has run with no token. A protocol that
//      has carried its TVL for years is a larger business by the time its token
//      launches, so implied value rises with age up to three years and then
//      plateaus (0.75 + 0.25 x min(age, 1095) / 1095). An unknown age counts as
//      the midpoint, 0.875. This direction is a choice: it rewards size, not
//      token-launch urgency — urgency is shown separately in the dashboard and
//      never touches the ranking.
//   5. Implied value = round(TVL x multiple(category) x sizeAdj x growthMult x maturityMult).
//
// The holdout set then judges the fit: median absolute log error of the
// prediction against the market's own market caps, for the global baseline,
// the category intercepts alone, and the full model. All three go into the
// dashboard's Model section.
//
// Live-token protocols never enter the ranked board; they appear only in the
// Live token view with the market's own values. The board ranks protocols that
// record no token at all (market cap, CoinGecko id and symbol all null) and
// applies the house's own exclusions: no exchanges, no versioned pools, no
// wrapped, staked or bridged products of an asset that already trades.

/** The snapshot's protocol entry: the ten fields the sealed input carries, no more. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** One row of board.json. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  token_status: 'pre-token';
  implied_value_usd: number;
  model: {
    multiple: number;
    multiple_source: string;
    size_adjustment: number;
    growth_pct: number | null;
    growth_multiplier: number;
    maturity_multiplier: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one board row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  on_watchlist: boolean;
  multiple: number;
  multiple_source: string;
  size_adjustment: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the market's own value stands. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number;
  ratio: number;
  change_7d: number | null;
}

/** A fitted category multiple, as the dashboard's Model section states it. */
export interface CategoryFit {
  category: string;
  multiple: number;
  n_total: number;
  n_fit: number;
  n_test: number;
}

/** The holdout scores: median absolute log error, lower is better. */
export interface HoldoutScore {
  test_size: number;
  global_baseline: number;
  category_model: number;
  full_model: number;
}

/** Everything the model fitted, as the dashboard states it. */
export interface ModelFit {
  version: string;
  comparable_total: number;
  fit_size: number;
  test_size: number;
  /** The multiple at the reference TVL: the global intercept, for protocols no category covers. */
  global_multiple: number;
  reference_tvl: number;
  winsor_lo: number;
  winsor_hi: number;
  /** Fitted OLS slopes of ln(mcap/TVL) on the clamped 7-day change and on ln(TVL) about the reference. */
  growth_slope: number;
  size_slope: number;
  min_category_n: number;
  categories: CategoryFit[];
  holdout: HoldoutScore;
}

/** The dashboard's whole dataset. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  fit: ModelFit;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'launch-radar-fit-1';

/** The early radar's size: pre-token protocols below the floor, by TVL. */
export const EARLY_ROWS = 160;

/** The Live token view's size, by market cap. */
export const LIVE_ROWS = 40;

/** Growth is clamped to this per cent window before it enters the model. */
export const GROWTH_FLOOR = -60;
export const GROWTH_CAP = 120;

/** A category needs at least this many fit-set comparables for its own multiple. */
export const MIN_CATEGORY_N = 5;

/** Maturity: floor + span x min(age, MATURITY_DAYS)/MATURITY_DAYS; null age -> MATURITY_NULL. */
export const MATURITY_FLOOR = 0.75;
export const MATURITY_SPAN = 0.25;
export const MATURITY_DAYS = 1095;
export const MATURITY_NULL = 0.875;

/** The growth slope's sane window; outside it the model falls back to GROWTH_SLOPE_FALLBACK. */
export const GROWTH_SLOPE_MAX = 0.004;
export const GROWTH_SLOPE_FALLBACK = 0.0015;

/** Ratios are winsorised at the fit set's 10th/90th percentile of ln(mcap/TVL) before any median. */
export const WINSOR_LO_PCT = 0.1;
export const WINSOR_HI_PCT = 0.9;

/** Category intercepts shrink toward the global intercept with this pseudo-count (K=5). */
export const SHRINK_K = 5;

/** Categories whose tokens are products of another asset, not protocol value: they never fit multiples and never rank. */
const PRODUCT_CATEGORIES = new Set([
  'CEX',
  'Bridge',
  'Canonical Bridge',
  'Cross Chain Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
]);

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** The exchanges whose own products never rank. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

const DAY_MS = 86_400_000;

/** Whole days from the snapshot's as_of back to listed_at, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** The house's exclusions, shared by the board and the comparables: versioned pools and wrapped, staked or bridged products. */
function isWrappedOrVersioned(p: SnapshotProtocol): boolean {
  if (VERSIONED.test(p.name)) return true;
  const words = p.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 0);
  if (words.includes('wrapped') || words.includes('staked') || words.includes('staking')) return true;
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return true;
  if (EXCHANGE_PREFIXES.some((e) => p.name.startsWith(e))) return true;
  return false;
}

/** Whether the board may rank a protocol: no token recorded, and none of the house's exclusions. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !isWrappedOrVersioned(p);
}

/** A comparable for the value model: a live-token protocol whose market cap is its protocol's own value. */
function isComparable(p: SnapshotProtocol): boolean {
  return p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && !isWrappedOrVersioned(p);
}

/** FNV-1a, 32-bit, on a slug's UTF-8 bytes: the deterministic holdout split. */
function hashSlug(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One value in five goes to the holdout, by slug hash: deterministic, name-blind, reproducible. */
function isHoldout(slug: string): boolean {
  return hashSlug(slug) % 5 === 0;
}

/** The median of a numeric array (average of the two middle values when even). */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** The p-th percentile (0..1) of a numeric array. */
function quantile(values: number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const at = (s.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo]! + (s[hi]! - s[lo]!) * (at - lo);
}

const clampGrowth = (g: number | null): number => Math.min(GROWTH_CAP, Math.max(GROWTH_FLOOR, g ?? 0));

/** The growth multiplier one protocol gets under the fitted slope. */
function growthMultiplier(growth: number | null, slope: number): number {
  return Math.exp(slope * clampGrowth(growth));
}

/** The maturity multiplier one protocol gets from its age. */
function maturityMultiplier(age: number | null): number {
  if (age === null) return MATURITY_NULL;
  return MATURITY_FLOOR + MATURITY_SPAN * (Math.min(Math.max(age, 0), MATURITY_DAYS) / MATURITY_DAYS);
}

/**
 * Fit the model on the snapshot's own live-token protocols, in log space:
 *
 *   ln(mcap/TVL) = intercept + growthSlope x clamp(7d) + sizeSlope x (ln TVL - ln reference TVL)
 *
 * The ratios are winsorised at the fit set's 10th/90th percentile of
 * ln(mcap/TVL) first. The two slopes are one OLS over the whole fit set. The
 * intercept is per category — the median residual of the fit set's
 * comparables in the category, shrunk toward the global intercept with a
 * pseudo-count of SHRINK_K — and protocols no category covers (fewer than
 * MIN_CATEGORY_N fit-set comparables, or no category at all) get the global
 * intercept. One fifth of the comparables, chosen by slug hash, never touches
 * the fit: the errors of the global baseline, the category intercepts alone
 * and the full model are median absolute log errors on that fifth.
 */
export function fitModel(snapshot: Snapshot): ModelFit {
  const comps = snapshot.protocols.filter(isComparable);
  const fitSet = comps.filter((p) => !isHoldout(p.slug));
  const testSet = comps.filter((p) => isHoldout(p.slug));

  const winsorLo = quantile(fitSet.map(lnRatio), WINSOR_LO_PCT);
  const winsorHi = quantile(fitSet.map(lnRatio), WINSOR_HI_PCT);
  const clamped = (p: SnapshotProtocol): number => Math.min(winsorHi, Math.max(winsorLo, lnRatio(p)));

  // The reference TVL is the fit set's median, so the intercept reads as a multiple at an ordinary size.
  const referenceTvl = Math.exp(median(fitSet.map((p) => Math.log(p.tvl_usd))));

  // One OLS over the fit set: ln ratio ~ intercept + growthSlope x clamp(7d) + sizeSlope x d(ln TVL).
  const X = fitSet.map((p) => [1, clampGrowth(p.change_7d), Math.log(p.tvl_usd) - Math.log(referenceTvl)]);
  const y = fitSet.map(clamped);
  const [intercept, growthSlope, sizeSlope] = ols(X, y);
  const growth = growthSlope > 0 && growthSlope <= GROWTH_SLOPE_MAX ? growthSlope : growthSlope > GROWTH_SLOPE_MAX ? GROWTH_SLOPE_MAX : GROWTH_SLOPE_FALLBACK;

  // Category intercepts: median residual after the slopes, shrunk toward the global intercept.
  const residualBySlug = new Map<string, number>();
  fitSet.forEach((p, i) => residualBySlug.set(p.slug, clamped(p) - growth * clampGrowth(p.change_7d) - sizeSlope * (Math.log(p.tvl_usd) - Math.log(referenceTvl))));
  const byCategory = new Map<string, number[]>();
  for (const p of fitSet) {
    if (p.category === null) continue;
    const list = byCategory.get(p.category) ?? [];
    list.push(residualBySlug.get(p.slug)!);
    byCategory.set(p.category, list);
  }
  const categories: CategoryFit[] = [...byCategory.entries()]
    .filter(([, list]) => list.length >= MIN_CATEGORY_N)
    .map(([category, list]) => {
      const all = comps.filter((p) => p.category === category);
      const lr = (list.length * median(list) + SHRINK_K * intercept) / (list.length + SHRINK_K);
      return {
        category,
        multiple: Math.exp(lr),
        n_total: all.length,
        n_fit: list.length,
        n_test: all.length - list.length,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
  const interceptOf = (category: string | null): number => {
    const c = categories.find((c2) => c2.category === category);
    return c !== undefined ? Math.log(c.multiple) : intercept;
  };

  // Holdout: median absolute log error against the held-out fifth's own market caps, three ways.
  const mal = (predict: (p: SnapshotProtocol) => number): number =>
    median(testSet.map((p) => Math.abs(predict(p) - lnRatio(p))));
  const globalBaseline = mal(() => intercept);
  const categoryModel = mal((p) => interceptOf(p.category));
  const fullModel = mal((p) => interceptOf(p.category) + growth * clampGrowth(p.change_7d) + sizeSlope * (Math.log(p.tvl_usd) - Math.log(referenceTvl)));

  return {
    version: MODEL_VERSION,
    comparable_total: comps.length,
    fit_size: fitSet.length,
    test_size: testSet.length,
    global_multiple: Math.exp(intercept),
    reference_tvl: referenceTvl,
    winsor_lo: Math.exp(winsorLo),
    winsor_hi: Math.exp(winsorHi),
    growth_slope: growth,
    size_slope: sizeSlope,
    min_category_n: MIN_CATEGORY_N,
    categories,
    holdout: {
      test_size: testSet.length,
      global_baseline: round4(globalBaseline),
      category_model: round4(categoryModel),
      full_model: round4(fullModel),
    },
  };
}

/** ln(mcap/tvl) of a comparable; both figures are positive by isComparable's rule. */
function lnRatio(p: SnapshotProtocol): number {
  return Math.log(p.mcap_usd! / p.tvl_usd);
}

/** Ordinary least squares over a 3-column design matrix, by normal equations. */
function ols(X: number[][], y: number[]): [number, number, number] {
  const a = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const b = [0, 0, 0];
  for (let i = 0; i < X.length; i++) {
    for (let r = 0; r < 3; r++) {
      b[r]! += X[i]![r]! * y[i]!;
      for (let c = 0; c < 3; c++) a[r]![c]! += X[i]![r]! * X[i]![c]!;
    }
  }
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < 3; col++) {
    const piv = m[col]![col]!;
    if (Math.abs(piv) < 1e-12) return [median(y), GROWTH_SLOPE_FALLBACK, 0];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r]![col]! / piv;
      for (let c = col; c < 4; c++) m[r]![c]! -= f * m[col]![c]!;
    }
  }
  const out: [number, number, number] = [m[0]![3]! / m[0]![0]!, m[1]![3]! / m[1]![1]!, m[2]![3]! / m[2]![2]!];
  if (out.some((v) => !Number.isFinite(v))) return [median(y), GROWTH_SLOPE_FALLBACK, 0];
  return out;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** One protocol's implied value and the model terms behind it. */
export function scoreProtocol(
  p: SnapshotProtocol,
  fit: ModelFit,
  asOf: string,
): { implied: number; age: number | null; multiple: number; source: string; sizeAdj: number; growthMult: number; maturityMult: number } {
  const c = fit.categories.find((c2) => c2.category === p.category);
  const multiple = c !== undefined ? c.multiple : fit.global_multiple;
  const source = c !== undefined ? `${p.category} multiple (n=${c.n_fit} fit)` : 'global fallback';
  const growthMult = growthMultiplier(p.change_7d, fit.growth_slope);
  const sizeAdj = Math.exp(fit.size_slope * (Math.log(p.tvl_usd) - Math.log(fit.reference_tvl)));
  const age = ageDays(asOf, p.listed_at);
  const maturityMult = maturityMultiplier(age);
  const implied = Math.max(1, Math.round(p.tvl_usd * multiple * sizeAdj * growthMult * maturityMult));
  return { implied, age, multiple, source, sizeAdj, growthMult, maturityMult };
}

/** The protocols the board ranks: every watchlist slug, plus the early radar below the floor. */
function boardUniverse(snapshot: Snapshot): SnapshotProtocol[] {
  const index = new Map(snapshot.protocols.map((p) => [p.slug, p] as const));
  const chosen = new Map<string, SnapshotProtocol>();
  // Coverage first: every watchlist slug the snapshot carries, whatever the model thinks of it.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined && isPreToken(p)) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the floor, by TVL, then slug for a stable cut.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);
  return [...chosen.values()];
}

/** Chains that are layer 2 rollups: only these may carry the farm plan's L2 label. */
const L2_CHAINS = new Set(['Arbitrum', 'Base', 'Optimism', 'Polygon', 'zkSync', 'zkSync Era']);

/**
 * A farm plan: six specific steps, each with what it costs and how long it
 * takes, derived from the protocol's own record — its category sets the core
 * action, its chains set the gas, its TVL sets the position size, its age sets
 * the holding window. Never a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): string[] {
  const chain = p.chains[0] ?? 'its main chain';
  const second = p.chains.length > 1 ? p.chains[1] : null;
  const c = (p.category ?? '').toLowerCase();

  const gas = chain === 'Ethereum' ? 14 : chain === 'Solana' ? 0.05 : ['Arbitrum', 'Base', 'Optimism', 'Polygon', 'zkSync', 'zkSync Era', 'Sui', 'Aptos'].includes(chain) ? 0.4 : 2;
  const gas2 = second === null ? 0 : second === 'Ethereum' ? 14 : second === 'Solana' ? 0.05 : 0.6;
  const isL2 = L2_CHAINS.has(chain);
  const gasWeekly = gas < 1 ? gas.toFixed(2) : `${Math.round(gas)}`;
  const capital = p.tvl_usd >= 5_000_000_000 ? 500 : p.tvl_usd >= 1_000_000_000 ? 300 : p.tvl_usd >= 250_000_000 ? 150 : p.tvl_usd >= 50_000_000 ? 100 : 50;
  const hold = age === null ? 30 : age < 120 ? 90 : age < 365 ? 60 : 45;

  let action: string;
  let weekly: string;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('stablecoin')) {
    action = `Supply $${capital} of USDC into ${p.name}'s lending market on ${chain} and leave it in the same market the whole window.`;
    weekly = 'Borrow and repay one small position, or deposit and withdraw $20, so the wallet shows repeated lending activity.';
  } else if (c.includes('dex') || c.includes('liquidity') || c.includes('yield')) {
    action = `Provide $${capital} of liquidity to ${p.name}'s deepest pool on ${chain} and leave the LP tokens in place.`;
    weekly = 'Swap $20 through the pool once a week so the wallet accumulates volume on top of the liquidity position.';
  } else if (c.includes('perp') || c.includes('derivative') || c.includes('basis') || c.includes('trading')) {
    action = `Deposit $${capital} of USDC as margin on ${p.name} and hold one small, hedged position open on ${chain}.`;
    weekly = 'Open and close one small trade a week; keep the size under 5% of the deposit so the cost of churn stays trivial.';
  } else if (c.includes('rwa') || c.includes('treasury') || c.includes('credit')) {
    action = `Mint or deposit $${capital} of the protocol's yield asset on ${chain} and hold the receipt token untouched.`;
    weekly = 'Check the protocol attestations page weekly and record the yield accrual in your farm log.';
  } else if (c.includes('launch') || c.includes('incubator') || c.includes('accelerator')) {
    action = `Join ${p.name}'s testnet or points campaign from a fresh wallet and complete every task it publishes.`;
    weekly = 'Complete one published task a week on the testnet; testnet gas is free, mainnet actions stay under $1.';
  } else if (c.includes('oracle') || c.includes('infrastructure') || c.includes('interop') || c.includes('restak') || c.includes('validator')) {
    action = `Delegate $${capital} of the chain's staking asset through ${p.name} on ${chain} and keep the delegate receipt.`;
    weekly = 'Restake or re-delegate once a week between its operator sets so the wallet interacts with every contract it points users at.';
  } else if (c.includes('insurance') || c.includes('cover')) {
    action = `Buy $${capital} of cover from ${p.name} on ${chain}, let it expire, and buy a second, smaller policy.`;
    weekly = 'Renew a minimal policy each week; the premium is the cost of the interaction, so keep it small.';
  } else if (c.includes('curator') || c.includes('allocator')) {
    action = `Deposit $${capital} of USDC into a vault or strategy that ${p.name} curates on ${chain} — as ${c.includes('curator') ? 'a risk curator it allocates capital into the vaults it reviews and sets their risk rules' : 'an onchain capital allocator it routes deposits between the venues its strategy covers'} — and keep the vault shares or deposit receipt.`;
    weekly = 'Read its latest curator report or allocation update, then rebalance a small part of the deposit between the vaults or venues it covers, so the wallet follows its strategy.';
  } else if (c.includes('wallet') || c.includes('payment') || c.includes('nft') || c.includes('social')) {
    action = `Use ${p.name} as your main app on ${chain} for a month: deposits, transfers and every feature it ships.`;
    weekly = 'Make one transaction a week through the app and try each new feature the day it ships.';
  } else {
    action = `Deposit $${capital} of USDC into ${p.name} on ${chain} and keep the position open for the whole window.`;
    weekly = 'Make one qualifying action a week — a deposit, a withdrawal or a vote — so the wallet never sits idle.';
  }

  const steps: string[] = [
    `Set up a fresh wallet used only for this farm, fund it with just the gas and principal you plan to deploy, and keep the seed phrase offline. Cost: under $${gas.toFixed(2)} of gas to start. Time: 10 minutes.`,
    `${action} Cost: $${capital} of principal plus about $${gas < 1 ? gas.toFixed(2) : Math.round(gas)} of gas. Time: 20 minutes to set up.`,
    `${weekly} Cost: about $${gasWeekly} of gas a week on ${chain}${isL2 ? ' — a rollup L2, where gas is cheap' : ''}. Time: 10 minutes a week.`,
    second !== null
      ? `Repeat the core deposit on ${second}, where gas runs about $${gas2.toFixed(2)}, so your activity spans more than one of the protocol's chains. Cost: $${Math.round(capital / 2)} of principal plus gas. Time: 15 minutes.`
      : `Add one more qualifier the protocol can measure: hold the position through a weekly snapshot rather than hopping in and out. Cost: the $${capital} stays deployed. Time: 5 minutes a week to check.`,
    `Hold the position for at least ${hold} days without withdrawing, so the wallet appears in more than one snapshot of the eventual airdrop criteria. Cost: the $${capital} stays in the position${hold >= 60 ? '; any yield it earns offsets the gas' : ''}. Time: ${hold} days.`,
    `Before claiming anything, open ${p.name}'s own points or rewards page, claim only through links it publishes, and revoke every approval you no longer need. Cost: no fee — never pay anyone to claim an airdrop. Time: 15 minutes.`,
  ];
  return steps.map(padStep);
}

/** A farm step is 20 to 600 characters once trimmed; pad the floor, trim the ceiling. */
function padStep(s: string): string {
  let t = s.trim();
  if (t.length < 20) t = `${t} Check the protocol's own docs before you transact.`;
  if (t.length > 600) t = `${t.slice(0, 597)}...`;
  return t;
}

/** The live-token protocols, by market cap, for the dashboard's Live token view — never the board. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0)
    .sort((a, b) => b.mcap_usd! - a.mcap_usd! || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd!,
      ratio: round4(p.mcap_usd! / p.tvl_usd),
      change_7d: p.change_7d,
    }));
}

/** The board out of the snapshot: fitted model, scored, ranked, planned. */
export function buildBoard(snapshot: Snapshot): { board: BoardRow[]; fit: ModelFit } {
  const fit = fitModel(snapshot);
  const universe = boardUniverse(snapshot);
  const scored = universe.map((p) => {
    const s = scoreProtocol(p, fit, snapshot.as_of);
    return { p, ...s, farm: farmSteps(p, s.age) };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.slug ? 1 : 0));
  const board: BoardRow[] = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    listed_at: s.p.listed_at,
    age_days: s.age,
    token_status: 'pre-token',
    implied_value_usd: s.implied,
    model: {
      multiple: s.multiple,
      multiple_source: s.source,
      size_adjustment: round4(s.sizeAdj),
      growth_pct: s.p.change_7d === null ? null : round4(clampGrowth(s.p.change_7d)),
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
    },
    farm_steps: s.farm,
  }));
  return { board, fit };
}

/** Everything the dashboard renders, from the snapshot: the typed board and its compact data. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const { board, fit } = buildBoard(snapshot);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    fit,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map((r) => ({
      rank: r.rank,
      slug: r.slug,
      name: r.name,
      category: r.category,
      chains: r.chains,
      tvl_usd: r.tvl_usd,
      change_7d: r.change_7d,
      listed_at: r.listed_at,
      age_days: r.age_days,
      implied_value_usd: r.implied_value_usd,
      on_watchlist: snapshot.watchlist.includes(r.slug),
      multiple: r.model.multiple,
      multiple_source: r.model.multiple_source,
      size_adjustment: r.model.size_adjustment,
      growth_multiplier: r.model.growth_multiplier,
      maturity_multiplier: r.model.maturity_multiplier,
      farm_steps: r.farm_steps,
    })),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new Error('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new Error('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new Error('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new Error('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new Error('snapshot.json has no watchlist of slugs');
  const protocols: SnapshotProtocol[] = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new Error(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, values, farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100 || board.length > 4000) return `the board holds ${board.length} rows, the gate takes 100 to 4000`;
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slugs: ${missing.slice(0, 5).join(', ')}`;
  const known = new Set(snapshot.protocols.map((p) => p.slug));
  const invented = board.filter((r) => !known.has(r.slug));
  if (invented.length > 0) return `the board names protocols the snapshot does not: ${invented.slice(0, 5).map((r) => r.slug).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  }
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.farm_steps.length < 3 || r.farm_steps.length > 12) return `${r.slug} has ${r.farm_steps.length} farm steps`;
    for (const s of r.farm_steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} characters`;
    }
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `// Generated by main.ts from the sealed snapshot — do not edit.\nwindow.RADAR=${JSON.stringify(radar)};\n`;
}
