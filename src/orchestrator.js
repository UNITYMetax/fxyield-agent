/**
 * FxYield Agent – Main Orchestrator
 * Coordinates all agent modules in a single execution cycle.
 * Designed to run on Base via Coinbase AgentKit.
 *
 * Execution cycle (runs every ~4 hours):
 *   1. Fetch live data (venues, peg, positions)
 *   2. Classify peg health → execute protective actions if needed
 *   3. Score venues → compute optimal allocation
 *   4. Check if rebalance exceeds threshold → execute if yes
 *   5. Harvest & compound pending rewards
 *   6. Monitor xPOSITIONs → deleverage if needed
 *   7. Log summary + push Farcaster notification
 */

import { scoreVenues, computeOptimalAllocation, shouldRebalance, projectAnnualYield } from "./yieldRouter.js";
import { classifyPeg, buildPegActionPlan } from "./pegSentinel.js";
import { calculatePositionHealth, classifyPosition, buildDeleverageTx } from "./xPositionManager.js";

/**
 * Main agent execution cycle
 * @param {Object} ctx - Agent context: { portfolio, venues, pegPrice, positions, wallet, log }
 * @returns {Object} Execution report
 */
export async function runAgentCycle(ctx) {
  const { portfolio, venues, pegPrice, positions, wallet, log } = ctx;
  const report = { actions: [], errors: [], summary: {} };

  log("info", "Agent cycle started", `Block: ${ctx.blockNumber}`);

  // ── Step 1: Peg Health ──────────────────────────────────────────────────
  const pegInfo = classifyPeg(pegPrice);
  log(
    pegInfo.severity === "ok" ? "success" : "warning",
    `Peg: ${pegInfo.status}`,
    `fxUSD = $${pegPrice.toFixed(4)} (${pegInfo.deviation > 0 ? "+" : ""}${pegInfo.deviation.toFixed(4)}%)`
  );

  if (pegInfo.action) {
    const pegActions = buildPegActionPlan(pegInfo, portfolio);
    for (const action of pegActions) {
      try {
        await executePegAction(action, wallet, log);
        report.actions.push({ type: "peg", ...action });
      } catch (err) {
        report.errors.push({ phase: "peg", error: err.message });
        log("error", "Peg action failed", err.message);
      }
    }
  }

  // ── Step 2: Yield Routing ───────────────────────────────────────────────
  const scored = scoreVenues(venues);
  const optimal = computeOptimalAllocation(scored, portfolio.totalfxUSD);
  const rebalCheck = shouldRebalance(portfolio.allocations, optimal);

  log("info", `Best yield: ${scored[0].name}`, `APY: ${scored[0].apy.toFixed(2)}%`);

  if (rebalCheck.shouldRebalance) {
    log("info", `Rebalancing (avg drift: ${rebalCheck.avgDriftPct}%)`, `${rebalCheck.moves.length} moves`);
    for (const move of rebalCheck.moves) {
      try {
        await executeRebalance(move, wallet, log);
        report.actions.push({ type: "rebalance", ...move });
      } catch (err) {
        report.errors.push({ phase: "rebalance", venueId: move.venueId, error: err.message });
      }
    }
  } else {
    log("success", "Allocation optimal", `Drift ${rebalCheck.avgDriftPct}% < threshold`);
  }

  // ── Step 3: Compound Rewards ────────────────────────────────────────────
  if (portfolio.pendingRewards > 0.1) {
    log("info", "Harvesting rewards", `${portfolio.pendingRewards.toFixed(4)} fxUSD`);
    try {
      await compoundRewards(portfolio.pendingRewards, optimal, wallet, log);
      report.actions.push({ type: "compound", amount: portfolio.pendingRewards });
    } catch (err) {
      report.errors.push({ phase: "compound", error: err.message });
    }
  }

  // ── Step 4: xPOSITION Monitor ──────────────────────────────────────────
  for (const pos of positions) {
    const health = calculatePositionHealth(pos.currentPrice, pos.liquidationPrice, pos.leverage);
    const classification = classifyPosition(health, pos);

    log(
      health > 60 ? "success" : "warning",
      `${pos.collateral} position: ${classification.label}`,
      `Health: ${health.toFixed(0)}%`
    );

    if (classification.action === "auto_deleverage" || classification.action === "emergency_close") {
      const tx = buildDeleverageTx(pos, classification.action === "emergency_close" ? 0.8 : 0.3);
      try {
        await executeDeleverage(tx, wallet, log);
        report.actions.push({ type: "deleverage", positionId: pos.id, ...tx });
      } catch (err) {
        report.errors.push({ phase: "deleverage", positionId: pos.id, error: err.message });
      }
    }
  }

  // ── Step 5: Summary ─────────────────────────────────────────────────────
  report.summary = {
    projectedAnnualYield: projectAnnualYield(optimal, venues).toFixed(2),
    weightedAPY: scored.reduce((acc, v) => acc + (optimal[v.id] / portfolio.totalfxUSD) * v.apy, 0).toFixed(2),
    actionsExecuted: report.actions.length,
    errors: report.errors.length,
    nextRunIn: "4 hours",
  };

  log("success", "Agent cycle complete", `${report.actions.length} actions · ${report.errors.length} errors`);

  return report;
}

// ── Execution helpers (stubbed for simulation) ───────────────────────────────

async function executePegAction(action, wallet, log) {
  await sleep(300);
  if (action.type === "rebalance") {
    log("success", `Peg rebalance: ${action.from} → ${action.to}`, `${action.amount?.toFixed(2)} fxUSD`);
  } else if (action.type === "alert") {
    log("info", `Alert sent via ${action.channel}`, action.msg);
  }
}

async function executeRebalance(move, wallet, log) {
  await sleep(400);
  const direction = parseFloat(move.delta) > 0 ? "↑" : "↓";
  log("success", `Rebalanced ${move.venueId} ${direction}`, `${move.from} → ${move.to} fxUSD`);
}

async function compoundRewards(amount, allocation, wallet, log) {
  await sleep(350);
  log("success", "Rewards compounded", `${amount.toFixed(4)} fxUSD re-deployed`);
}

async function executeDeleverage(tx, wallet, log) {
  await sleep(500);
  log("success", `Deleveraged ${tx.collateral}`, `New leverage: ${tx.newLeverage}x · Redeemed: $${tx.redeemAmountUSD}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

