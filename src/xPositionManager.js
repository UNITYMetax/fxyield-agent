/**
 * FxYield Agent – xPOSITION Leverage Manager
 * Monitors f(x) Protocol xToken leveraged positions.
 * Auto-deleverages or alerts before liquidation thresholds.
 */

export const HEALTH_THRESHOLDS = {
  SAFE:     80,  // > 80% → all good
  WATCH:    60,  // 60-80% → watch
  WARN:     40,  // 40-60% → warn user
  DELEVERAGE: 30, // < 30% → auto-deleverage
  EMERGENCY:  15, // < 15% → emergency close
};

/**
 * Calculate position health as a 0-100 score
 * Based on distance between current price and liquidation price
 * @param {number} currentPrice
 * @param {number} liquidationPrice
 * @param {number} leverage - e.g. 3.2 for 3.2x
 * @returns {number} Health score 0-100
 */
export function calculatePositionHealth(currentPrice, liquidationPrice, leverage) {
  const buffer = currentPrice - liquidationPrice;
  const pctBuffer = (buffer / currentPrice) * 100;
  // Normalize: a 20% buffer on 3x leverage ~= 100% health
  const normalizedHealth = Math.min(100, (pctBuffer / (20 / leverage)) * 100);
  return Math.max(0, normalizedHealth);
}

/**
 * Determine required action for a position
 */
export function classifyPosition(health, position) {
  if (health > HEALTH_THRESHOLDS.SAFE) {
    return { action: null, label: "SAFE", color: "#4ECDC4" };
  }
  if (health > HEALTH_THRESHOLDS.WATCH) {
    return { action: "watch", label: "WATCH", color: "#4ECDC4" };
  }
  if (health > HEALTH_THRESHOLDS.WARN) {
    return { action: "notify", label: "WARNING", color: "#FFE66D", 
      message: `Position health at ${health.toFixed(0)}% — consider adding collateral` };
  }
  if (health > HEALTH_THRESHOLDS.DELEVERAGE) {
    return { action: "auto_deleverage", label: "CRITICAL", color: "#FF6B6B",
      message: `Auto-deleveraging ${position.collateral} by 30% to protect position` };
  }
  return { action: "emergency_close", label: "EMERGENCY", color: "#FF0000",
    message: `Emergency close triggered — position near liquidation` };
}

/**
 * Build deleverage transaction parameters
 * @param {Object} position 
 * @param {number} reducePct - How much to reduce (0-1)
 * @returns {Object} Tx params
 */
export function buildDeleverageTx(position, reducePct = 0.3) {
  const redeemAmount = position.value * reducePct;
  return {
    type: "DELEVERAGE",
    positionId: position.id,
    collateral: position.collateral,
    redeemAmountUSD: redeemAmount.toFixed(2),
    expectedFxUSD: (redeemAmount * 0.997).toFixed(2), // 0.3% slippage estimate
    newLeverage: (position.leverage * (1 - reducePct)).toFixed(2),
    gasEstimate: "~0.0004 ETH",
  };
}

/**
 * Compute liquidation price given position params
 */
export function computeLiquidationPrice(entryPrice, leverage, maintenanceMarginPct = 0.05) {
  return entryPrice * (1 - (1 / leverage) * (1 - maintenanceMarginPct));
}

