/**
 * FxYield Agent – Yield Router
 * Calculates optimal allocation across fxUSD yield venues on Base
 * using risk-adjusted APY scoring.
 */

const RISK_MULTIPLIERS = {
  low: 1.0,
  medium: 0.85,
  high: 0.65,
};

const MIN_ALLOCATION_PCT = 0.05; // 5% minimum per venue
const MAX_SINGLE_VENUE_PCT = 0.50; // 50% max concentration

/**
 * Score each venue by risk-adjusted APY
 * @param {Array} venues - Live venue data with apy and risk fields
 * @returns {Array} Scored and sorted venues
 */
export function scoreVenues(venues) {
  return venues
    .map((v) => ({
      ...v,
      score: v.apy * RISK_MULTIPLIERS[v.risk],
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Compute optimal allocation weights based on scores
 * Uses a softmax-style distribution biased toward top venues
 * @param {Array} scoredVenues - Output of scoreVenues()
 * @param {number} totalCapital - Total fxUSD to allocate
 * @returns {Object} { venueId: amount }
 */
export function computeOptimalAllocation(scoredVenues, totalCapital) {
  const totalScore = scoredVenues.reduce((s, v) => s + v.score, 0);

  // Raw proportional weights
  let weights = scoredVenues.map((v) => ({
    id: v.id,
    weight: v.score / totalScore,
  }));

  // Clamp: enforce min/max per venue
  weights = weights.map((w) => ({
    ...w,
    weight: Math.max(MIN_ALLOCATION_PCT, Math.min(MAX_SINGLE_VENUE_PCT, w.weight)),
  }));

  // Renormalize
  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
  weights = weights.map((w) => ({ ...w, weight: w.weight / totalWeight }));

  // Convert to amounts
  const allocation = {};
  weights.forEach((w) => {
    allocation[w.id] = w.weight * totalCapital;
  });

  return allocation;
}

/**
 * Determine if rebalancing is worth the gas cost
 * @param {Object} current - Current allocation { id: amount }
 * @param {Object} optimal - Optimal allocation { id: amount }
 * @param {number} threshold - Min drift % to trigger rebalance (default 3%)
 * @returns {{ shouldRebalance: boolean, driftPct: number, moves: Array }}
 */
export function shouldRebalance(current, optimal, threshold = 3.0) {
  const moves = [];
  let totalDrift = 0;

  Object.keys(optimal).forEach((id) => {
    const curr = current[id] || 0;
    const opt = optimal[id];
    const drift = Math.abs(opt - curr);
    const driftPct = curr > 0 ? (drift / curr) * 100 : 100;
    totalDrift += driftPct;

    if (driftPct > threshold) {
      moves.push({
        venueId: id,
        from: curr.toFixed(2),
        to: opt.toFixed(2),
        delta: (opt - curr).toFixed(2),
        driftPct: driftPct.toFixed(1),
      });
    }
  });

  return {
    shouldRebalance: moves.length > 0,
    avgDriftPct: (totalDrift / Object.keys(optimal).length).toFixed(2),
    moves,
  };
}

/**
 * Estimate projected annual yield given allocation and venue APYs
 */
export function projectAnnualYield(allocation, venues) {
  return venues.reduce((total, v) => {
    const amount = allocation[v.id] || 0;
    return total + (amount * v.apy) / 100;
  }, 0);
}

