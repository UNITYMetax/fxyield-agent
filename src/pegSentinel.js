/**
 * FxYield Agent – Peg Sentinel
 * Monitors fxUSD peg health against Chainlink price feeds.
 * Triggers protective actions when deviation thresholds are crossed.
 */

export const PEG_TARGET = 1.0;

export const THRESHOLDS = {
  WATCH:  { lower: 0.998, upper: 1.002 }, // ±0.2%  → watch mode
  WARN:   { lower: 0.995, upper: 1.005 }, // ±0.5%  → warning
  ALERT:  { lower: 0.990, upper: 1.010 }, // ±1.0%  → agent acts
  CRITICAL:{ lower: 0.980, upper: 1.020 }, // ±2.0% → emergency
};

/**
 * Classify peg health
 * @param {number} price - Current fxUSD price
 * @returns {{ status, severity, deviation, action }}
 */
export function classifyPeg(price) {
  const deviation = ((price - PEG_TARGET) / PEG_TARGET) * 100;
  const abs = Math.abs(deviation);

  if (abs <= 0.2) {
    return { status: "HEALTHY", severity: "ok", deviation, action: null };
  }
  if (abs <= 0.5) {
    return {
      status: "WATCH",
      severity: "info",
      deviation,
      action: "monitor_stability_pool",
    };
  }
  if (abs <= 1.0) {
    return {
      status: "WARNING",
      severity: "warn",
      deviation,
      action: price < PEG_TARGET ? "deposit_stability_pool" : "redeem_fxusd",
    };
  }
  if (abs <= 2.0) {
    return {
      status: "ALERT",
      severity: "error",
      deviation,
      action: price < PEG_TARGET ? "emergency_stability_deposit" : "emergency_redemption",
    };
  }
  return {
    status: "CRITICAL",
    severity: "critical",
    deviation,
    action: "halt_and_notify",
  };
}

/**
 * Build an on-chain action plan based on peg status
 * @param {Object} pegInfo - Output of classifyPeg()
 * @param {Object} portfolio - Current user portfolio
 * @returns {Array} Ordered list of actions for the agent to execute
 */
export function buildPegActionPlan(pegInfo, portfolio) {
  if (!pegInfo.action) return [];

  const plans = {
    monitor_stability_pool: [
      { type: "log", msg: "Peg within watch band — increased monitoring active" },
    ],
    deposit_stability_pool: [
      { type: "rebalance", from: "aerodrome", to: "stability", amount: portfolio.allocations.aerodrome * 0.25 },
      { type: "log", msg: "Strengthening Stability Pool to restore peg" },
    ],
    redeem_fxusd: [
      { type: "redeem", amount: 500, msg: "Partial redemption to compress premium" },
    ],
    emergency_stability_deposit: [
      { type: "rebalance", from: "morpho", to: "stability", amount: portfolio.allocations.morpho * 0.5 },
      { type: "rebalance", from: "aerodrome", to: "stability", amount: portfolio.allocations.aerodrome * 0.5 },
      { type: "alert", channel: "farcaster", msg: `fxUSD peg at ${pegInfo.deviation.toFixed(3)}% — emergency deposit executed` },
    ],
    emergency_redemption: [
      { type: "redeem", amount: 2000, msg: "Large redemption to compress peg premium" },
      { type: "alert", channel: "farcaster", msg: `fxUSD premium at ${pegInfo.deviation.toFixed(3)}% — redemption executed` },
    ],
    halt_and_notify: [
      { type: "halt", msg: "Critical peg deviation — all agent activity paused" },
      { type: "alert", channel: "farcaster", msg: `CRITICAL: fxUSD at $${(PEG_TARGET + pegInfo.deviation / 100).toFixed(4)}` },
    ],
  };

  return plans[pegInfo.action] || [];
}

/**
 * Format peg deviation for display
 */
export function formatDeviation(deviation) {
  const sign = deviation > 0 ? "+" : "";
  return `${sign}${deviation.toFixed(4)}%`;
}

