import { useState, useEffect, useCallback } from "react";

// ─── Mock Data & Constants ───────────────────────────────────────────────────
const VENUES = [
  {
    id: "morpho",
    name: "Morpho Vault",
    protocol: "Morpho",
    chain: "Base",
    apy: 8.24,
    tvl: 4820000,
    risk: "low",
    color: "#4ECDC4",
    icon: "◈",
  },
  {
    id: "stability",
    name: "Stability Pool",
    protocol: "f(x) Protocol",
    chain: "Base",
    apy: 11.7,
    tvl: 12300000,
    risk: "medium",
    color: "#FFE66D",
    icon: "⬡",
  },
  {
    id: "aerodrome",
    name: "fxUSD/USDC LP",
    protocol: "Aerodrome",
    chain: "Base",
    apy: 14.3,
    tvl: 3100000,
    risk: "medium",
    color: "#FF6B6B",
    icon: "⟁",
  },
  {
    id: "curve",
    name: "fxUSD/crvUSD",
    protocol: "Curve",
    chain: "Base",
    apy: 6.8,
    tvl: 9200000,
    risk: "low",
    color: "#A8E6CF",
    icon: "⬟",
  },
];

const INITIAL_PORTFOLIO = {
  totalfxUSD: 12500,
  allocations: {
    morpho: 3750,
    stability: 5000,
    aerodrome: 2500,
    curve: 1250,
  },
  totalEarned: 847.23,
  pendingRewards: 34.12,
};

function useAgentSimulation() {
  const [agentLog, setAgentLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pegHealth, setPegHealth] = useState(99.94);
  const [apyData, setApyData] = useState(VENUES);
  const [portfolio, setPortfolio] = useState(INITIAL_PORTFOLIO);
  const [agentStatus, setAgentStatus] = useState("idle");
  const [rebalanceAlert, setRebalanceAlert] = useState(null);

  const addLog = useCallback((type, message, detail = "") => {
    setAgentLog((prev) => [
      {
        id: Date.now() + Math.random(),
        type,
        message,
        detail,
        time: new Date().toLocaleTimeString(),
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setApyData((prev) =>
        prev.map((v) => ({
          ...v,
          apy: Math.max(2, v.apy + (Math.random() - 0.48) * 0.3),
          tvl: Math.max(1000000, v.tvl + (Math.random() - 0.5) * 50000),
        }))
      );
      setPegHealth((prev) => {
        const next = Math.max(99.1, Math.min(100.05, prev + (Math.random() - 0.5) * 0.04));
        if (next < 99.6 && prev >= 99.6) {
          setRebalanceAlert({ type: "peg", severity: "warning", value: next.toFixed(3) });
          setTimeout(() => setRebalanceAlert(null), 5000);
        }
        return next;
      });
      setPortfolio((prev) => ({
        ...prev,
        totalEarned: prev.totalEarned + Math.random() * 0.08,
        pendingRewards: prev.pendingRewards + Math.random() * 0.02,
      }));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const startAgent = useCallback(async () => {
    setIsRunning(true);
    setAgentStatus("scanning");
    addLog("info", "Agent initializing...", "Connecting to Base RPC");

    await delay(800);
    addLog("success", "Connected to Base mainnet", "Block #28,441,892");

    await delay(600);
    setAgentStatus("analyzing");
    addLog("info", "Scanning yield venues", "Querying Morpho, f(x), Aerodrome, Curve");

    await delay(1000);
    const sorted = [...apyData].sort((a, b) => b.apy - a.apy);
    addLog(
      "success",
      `Best yield: ${sorted[0].name}`,
      `Current APY: ${sorted[0].apy.toFixed(2)}%`
    );

    await delay(700);
    addLog("info", "Checking peg health", `fxUSD = $${pegHealth.toFixed(4)}`);

    await delay(500);
    if (pegHealth < 99.8) {
      addLog("warning", "Slight peg deviation detected", "Monitoring Stability Pool");
    } else {
      addLog("success", "Peg healthy", "No intervention needed");
    }

    await delay(800);
    setAgentStatus("routing");
    addLog("info", "Calculating optimal allocation", "Risk-adjusted yield router running");

    await delay(1200);
    const optimal = calculateOptimalAllocation(apyData, portfolio.totalfxUSD);
    addLog(
      "success",
      "Allocation computed",
      `Stability Pool: ${optimal.stability.toFixed(0)} fxUSD | Morpho: ${optimal.morpho.toFixed(0)} fxUSD`
    );

    await delay(600);
    setAgentStatus("executing");
    addLog("info", "Submitting rebalance tx", "Signing with agent wallet...");

    await delay(1500);
    addLog("success", "Rebalance executed", "Tx: 0x4f8a...3c21 ✓ confirmed");

    await delay(500);
    setAgentStatus("compounding");
    addLog("info", "Harvesting pending rewards", `${portfolio.pendingRewards.toFixed(4)} fxUSD`);

    await delay(900);
    addLog("success", "Rewards compounded", "Re-deposited into Stability Pool");

    await delay(400);
    setAgentStatus("idle");
    addLog("success", "Agent cycle complete", "Next run in ~4 hours");

    setPortfolio((prev) => ({
      ...prev,
      allocations: {
        morpho: optimal.morpho,
        stability: optimal.stability,
        aerodrome: optimal.aerodrome,
        curve: optimal.curve,
      },
      totalEarned: prev.totalEarned + prev.pendingRewards,
      pendingRewards: 0,
    }));
  }, [apyData, pegHealth, portfolio, addLog]);

  const stopAgent = useCallback(() => {
    setIsRunning(false);
    setAgentStatus("idle");
    addLog("warning", "Agent paused by user", "");
  }, [addLog]);

  return {
    agentLog,
    isRunning,
    pegHealth,
    apyData,
    portfolio,
    agentStatus,
    rebalanceAlert,
    startAgent,
    stopAgent,
  };
}

function calculateOptimalAllocation(venues, total) {
  const sorted = [...venues].sort((a, b) => b.apy - a.apy);
  return {
    [sorted[0].id]: total * 0.4,
    [sorted[1].id]: total * 0.3,
    [sorted[2].id]: total * 0.2,
    [sorted[3].id]: total * 0.1,
  };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PegGauge({ value }) {
  const pct = Math.min(100, Math.max(0, ((value - 99.0) / 1.5) * 100));
  const color = value >= 99.8 ? "#4ECDC4" : value >= 99.5 ? "#FFE66D" : "#FF6B6B";
  const status = value >= 99.8 ? "HEALTHY" : value >= 99.5 ? "WATCH" : "ALERT";

  return (
    <div style={styles.pegGauge}>
      <div style={styles.pegLabel}>
        <span style={styles.pegTitle}>fxUSD PEG HEALTH</span>
        <span style={{ ...styles.pegStatus, color }}>{status}</span>
      </div>
      <div style={styles.pegValue}>${value.toFixed(4)}</div>
      <div style={styles.pegBarBg}>
        <div style={{ ...styles.pegBar, width: `${pct}%`, background: color }} />
      </div>
      <div style={styles.pegRange}>
        <span>$0.990</span>
        <span style={{ color }}>TARGET: $1.000</span>
        <span>$1.005</span>
      </div>
    </div>
  );
}

function VenueCard({ venue, allocation, totalfxUSD, selected, onClick }) {
  const pct = totalfxUSD > 0 ? ((allocation / totalfxUSD) * 100).toFixed(1) : 0;
  const riskColors = { low: "#4ECDC4", medium: "#FFE66D", high: "#FF6B6B" };

  return (
    <div
      style={{
        ...styles.venueCard,
        borderColor: selected ? venue.color : "rgba(255,255,255,0.08)",
        boxShadow: selected ? `0 0 20px ${venue.color}33` : "none",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <div style={styles.venueHeader}>
        <span style={{ ...styles.venueIcon, color: venue.color }}>{venue.icon}</span>
        <div>
          <div style={styles.venueName}>{venue.name}</div>
          <div style={styles.venueProtocol}>{venue.protocol} · {venue.chain}</div>
        </div>
        <div style={{ ...styles.riskBadge, borderColor: riskColors[venue.risk], color: riskColors[venue.risk] }}>
          {venue.risk}
        </div>
      </div>
      <div style={styles.venueStats}>
        <div>
          <div style={styles.statLabel}>APY</div>
          <div style={{ ...styles.statValue, color: venue.color }}>{venue.apy.toFixed(2)}%</div>
        </div>
        <div>
          <div style={styles.statLabel}>TVL</div>
          <div style={styles.statValue}>${(venue.tvl / 1e6).toFixed(2)}M</div>
        </div>
        <div>
          <div style={styles.statLabel}>ALLOCATED</div>
          <div style={styles.statValue}>{pct}%</div>
        </div>
      </div>
      <div style={styles.venueBar}>
        <div style={{ ...styles.venueFill, width: `${pct}%`, background: venue.color }} />
      </div>
    </div>
  );
}

function AgentStatusBadge({ status }) {
  const configs = {
    idle: { color: "#888", label: "IDLE", pulse: false },
    scanning: { color: "#4ECDC4", label: "SCANNING", pulse: true },
    analyzing: { color: "#FFE66D", label: "ANALYZING", pulse: true },
    routing: { color: "#A78BFA", label: "ROUTING", pulse: true },
    executing: { color: "#FF6B6B", label: "EXECUTING", pulse: true },
    compounding: { color: "#4ECDC4", label: "COMPOUNDING", pulse: true },
  };
  const cfg = configs[status] || configs.idle;

  return (
    <div style={{ ...styles.statusBadge, borderColor: cfg.color }}>
      <div
        style={{
          ...styles.statusDot,
          background: cfg.color,
          boxShadow: cfg.pulse ? `0 0 8px ${cfg.color}` : "none",
          animation: cfg.pulse ? "pulse 1s infinite" : "none",
        }}
      />
      <span style={{ color: cfg.color, fontSize: 11, fontFamily: "monospace", letterSpacing: 2 }}>
        {cfg.label}
      </span>
    </div>
  );
}

function LogEntry({ entry }) {
  const colors = {
    info: "#888",
    success: "#4ECDC4",
    warning: "#FFE66D",
    error: "#FF6B6B",
  };
  const icons = { info: "›", success: "✓", warning: "⚠", error: "✗" };

  return (
    <div style={styles.logEntry}>
      <span style={{ color: colors[entry.type], minWidth: 16 }}>{icons[entry.type]}</span>
      <span style={styles.logTime}>{entry.time}</span>
      <span style={{ color: colors[entry.type], flex: 1 }}>{entry.message}</span>
      {entry.detail && <span style={styles.logDetail}>{entry.detail}</span>}
    </div>
  );
}

function MiniChart({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120, h = 40;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity={0.1} stroke="none" />
    </svg>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function FxYieldAgent() {
  const {
    agentLog, isRunning, pegHealth, apyData, portfolio,
    agentStatus, rebalanceAlert, startAgent, stopAgent,
  } = useAgentSimulation();

  const [selectedVenue, setSelectedVenue] = useState("stability");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chartHistory] = useState(() =>
    Array.from({ length: 24 }, (_, i) => 8 + Math.sin(i * 0.4) + Math.random() * 2)
  );

  const bestVenue = [...apyData].sort((a, b) => b.apy - a.apy)[0];
  const weightedAPY = apyData.reduce((acc, v) => {
    const alloc = portfolio.allocations[v.id] || 0;
    return acc + (alloc / portfolio.totalfxUSD) * v.apy;
  }, 0);

  const projectedAnnual = (portfolio.totalfxUSD * weightedAPY) / 100;

  return (
    <div style={styles.root}>
      <style>{CSS}</style>

      {/* Alert Banner */}
      {rebalanceAlert && (
        <div style={styles.alertBanner}>
          <span style={{ color: "#FFE66D" }}>⚠</span>
          <span>Peg deviation detected — fxUSD at ${rebalanceAlert.value} · Agent monitoring</span>
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoMark}>⬡</div>
          <div>
            <div style={styles.logoName}>FxYield Agent</div>
            <div style={styles.logoSub}>Autonomous fxUSD Optimizer · Base</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {["dashboard", "venues", "xposition", "logs"].map((tab) => (
            <button
              key={tab}
              style={{ ...styles.navBtn, ...(activeTab === tab ? styles.navBtnActive : {}) }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>

        <div style={styles.headerRight}>
          <AgentStatusBadge status={agentStatus} />
          <button
            style={{ ...styles.ctaBtn, ...(isRunning ? styles.ctaBtnStop : {}) }}
            onClick={isRunning ? stopAgent : startAgent}
          >
            {isRunning ? "⏹ STOP AGENT" : "▶ RUN AGENT"}
          </button>
        </div>
      </header>

      {/* Body */}
      <main style={styles.main}>

        {activeTab === "dashboard" && (
          <>
            {/* KPI Row */}
            <div style={styles.kpiRow}>
              <KpiCard label="Total fxUSD" value={`${portfolio.totalfxUSD.toLocaleString()}`} unit="fxUSD" color="#4ECDC4" chart={<MiniChart data={chartHistory} color="#4ECDC4" />} />
              <KpiCard label="Weighted APY" value={weightedAPY.toFixed(2)} unit="%" color="#FFE66D" chart={<MiniChart data={chartHistory.map(v => v * 0.9)} color="#FFE66D" />} />
              <KpiCard label="Total Earned" value={portfolio.totalEarned.toFixed(2)} unit="fxUSD" color="#A78BFA" sub={`+${portfolio.pendingRewards.toFixed(4)} pending`} />
              <KpiCard label="Projected Annual" value={(projectedAnnual).toFixed(0)} unit="fxUSD" color="#FF6B6B" sub={`@ ${weightedAPY.toFixed(2)}% APY`} />
            </div>

            {/* Peg + Best Venue row */}
            <div style={styles.midRow}>
              <PegGauge value={pegHealth} />

              <div style={styles.bestVenue}>
                <div style={styles.sectionTitle}>BEST YIELD NOW</div>
                <div style={styles.bestVenueIcon}>{bestVenue.icon}</div>
                <div style={{ ...styles.bestVenueName, color: bestVenue.color }}>{bestVenue.name}</div>
                <div style={styles.bestVenueApy}>{bestVenue.apy.toFixed(2)}%</div>
                <div style={styles.bestVenueProtocol}>{bestVenue.protocol}</div>
                {bestVenue.id !== Object.entries(portfolio.allocations).sort((a,b) => b[1]-a[1])[0][0] && (
                  <div style={styles.rebalanceHint}>⟳ Rebalance opportunity</div>
                )}
              </div>

              <div style={styles.allocationMap}>
                <div style={styles.sectionTitle}>ALLOCATION MAP</div>
                {apyData.map((v) => {
                  const alloc = portfolio.allocations[v.id] || 0;
                  const pct = ((alloc / portfolio.totalfxUSD) * 100);
                  return (
                    <div key={v.id} style={styles.allocRow}>
                      <span style={{ color: v.color, width: 20 }}>{v.icon}</span>
                      <span style={styles.allocName}>{v.name}</span>
                      <div style={styles.allocBarBg}>
                        <div style={{ ...styles.allocBarFill, width: `${pct}%`, background: v.color }} />
                      </div>
                      <span style={styles.allocPct}>{pct.toFixed(1)}%</span>
                      <span style={styles.allocAmt}>{alloc.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Logs Preview */}
            <div style={styles.logsPreview}>
              <div style={styles.sectionTitle}>AGENT LOG · LIVE</div>
              {agentLog.length === 0 ? (
                <div style={styles.emptyLog}>Run the agent to see live execution logs</div>
              ) : (
                agentLog.slice(0, 6).map((e) => <LogEntry key={e.id} entry={e} />)
              )}
            </div>
          </>
        )}

        {activeTab === "venues" && (
          <div>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>YIELD VENUES · BASE CHAIN</div>
              <div style={styles.sectionSub}>Live APY refreshes every 2.5s · Risk-adjusted allocation</div>
            </div>
            <div style={styles.venueGrid}>
              {apyData.map((v) => (
                <VenueCard
                  key={v.id}
                  venue={v}
                  allocation={portfolio.allocations[v.id] || 0}
                  totalfxUSD={portfolio.totalfxUSD}
                  selected={selectedVenue === v.id}
                  onClick={() => setSelectedVenue(v.id)}
                />
              ))}
            </div>

            {selectedVenue && (
              <VenueDetail venue={apyData.find(v => v.id === selectedVenue)} allocation={portfolio.allocations[selectedVenue] || 0} totalfxUSD={portfolio.totalfxUSD} />
            )}
          </div>
        )}

        {activeTab === "xposition" && (
          <XPositionPanel />
        )}

        {activeTab === "logs" && (
          <div style={styles.logsPanel}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>FULL AGENT LOG</div>
              <div style={styles.sectionSub}>{agentLog.length} entries</div>
            </div>
            <div style={styles.logsFull}>
              {agentLog.length === 0 ? (
                <div style={styles.emptyLog}>No logs yet — run the agent to begin</div>
              ) : (
                agentLog.map((e) => <LogEntry key={e.id} entry={e} />)
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>FxYield Agent · Built on Base · Powered by f(x) Protocol + Morpho + AgentKit</span>
        <span>Open Source · MIT License</span>
      </footer>
    </div>
  );
}

function KpiCard({ label, value, unit, color, chart, sub }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValueRow}>
        <span style={{ ...styles.kpiValue, color }}>{value}</span>
        <span style={styles.kpiUnit}>{unit}</span>
      </div>
      {sub && <div style={styles.kpiSub}>{sub}</div>}
      {chart && <div style={styles.kpiChart}>{chart}</div>}
    </div>
  );
}

function VenueDetail({ venue, allocation, totalfxUSD }) {
  if (!venue) return null;
  const earned = (allocation * venue.apy) / 100 / 365;
  return (
    <div style={{ ...styles.venueDetail, borderColor: venue.color }}>
      <div style={styles.venueDetailHeader}>
        <span style={{ ...styles.venueIcon, color: venue.color, fontSize: 32 }}>{venue.icon}</span>
        <div>
          <div style={{ ...styles.venueName, fontSize: 20, color: venue.color }}>{venue.name}</div>
          <div style={styles.venueProtocol}>{venue.protocol} · {venue.chain}</div>
        </div>
      </div>
      <div style={styles.venueDetailStats}>
        <DetailStat label="Current APY" value={`${venue.apy.toFixed(3)}%`} color={venue.color} />
        <DetailStat label="Total TVL" value={`$${(venue.tvl / 1e6).toFixed(2)}M`} />
        <DetailStat label="Your Allocation" value={`${allocation.toFixed(2)} fxUSD`} />
        <DetailStat label="Daily Earnings" value={`+${earned.toFixed(4)} fxUSD`} color="#4ECDC4" />
        <DetailStat label="Risk Level" value={venue.risk.toUpperCase()} />
        <DetailStat label="Portfolio Share" value={`${((allocation/totalfxUSD)*100).toFixed(1)}%`} />
      </div>
    </div>
  );
}

function DetailStat({ label, value, color }) {
  return (
    <div style={styles.detailStat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.detailStatValue, color: color || "#fff" }}>{value}</div>
    </div>
  );
}

function XPositionPanel() {
  const [positions] = useState([
    { id: 1, collateral: "wstETH", leverage: "3.2x", value: 8240, health: 78, liquidationPrice: 1820, currentPrice: 3240, color: "#4ECDC4" },
    { id: 2, collateral: "WBTC", leverage: "2.1x", value: 15600, health: 92, liquidationPrice: 38200, currentPrice: 67400, color: "#FFE66D" },
  ]);

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionTitle}>xPOSITION MONITOR · LEVERAGE MANAGER</div>
        <div style={styles.sectionSub}>Agent auto-deleverages at 30% health threshold</div>
      </div>
      {positions.map((pos) => (
        <div key={pos.id} style={{ ...styles.positionCard, borderColor: pos.color }}>
          <div style={styles.positionHeader}>
            <div>
              <div style={styles.posCollateral}>{pos.collateral}</div>
              <div style={{ color: pos.color, fontFamily: "monospace", fontWeight: 700 }}>{pos.leverage} leverage</div>
            </div>
            <div style={styles.posValue}>${pos.value.toLocaleString()}</div>
          </div>

          <div style={styles.healthRow}>
            <span style={styles.statLabel}>POSITION HEALTH</span>
            <span style={{ color: pos.health > 60 ? "#4ECDC4" : "#FF6B6B", fontFamily: "monospace" }}>
              {pos.health}%
            </span>
          </div>
          <div style={styles.healthBarBg}>
            <div style={{
              ...styles.healthBarFill,
              width: `${pos.health}%`,
              background: pos.health > 60 ? "#4ECDC4" : pos.health > 30 ? "#FFE66D" : "#FF6B6B",
            }} />
          </div>

          <div style={styles.priceRow}>
            <div>
              <div style={styles.statLabel}>CURRENT PRICE</div>
              <div style={styles.priceValue}>${pos.currentPrice.toLocaleString()}</div>
            </div>
            <div>
              <div style={styles.statLabel}>LIQUIDATION PRICE</div>
              <div style={{ ...styles.priceValue, color: "#FF6B6B" }}>${pos.liquidationPrice.toLocaleString()}</div>
            </div>
            <div>
              <div style={styles.statLabel}>BUFFER</div>
              <div style={{ ...styles.priceValue, color: "#4ECDC4" }}>
                {(((pos.currentPrice - pos.liquidationPrice) / pos.currentPrice) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={styles.posActions}>
            <button style={styles.posBtn}>⬇ Deleverage</button>
            <button style={styles.posBtn}>+ Add Collateral</button>
            <button style={{ ...styles.posBtn, borderColor: "#4ECDC4", color: "#4ECDC4" }}>⚙ Auto-protect ON</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080C10; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0D1117; }
  ::-webkit-scrollbar-thumb { background: #2A3040; border-radius: 2px; }
`;

const styles = {
  root: {
    minHeight: "100vh",
    background: "#080C10",
    color: "#E8EDF2",
    fontFamily: "'Syne', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  alertBanner: {
    background: "rgba(255,230,109,0.1)",
    borderBottom: "1px solid rgba(255,230,109,0.3)",
    padding: "8px 24px",
    display: "flex",
    gap: 10,
    alignItems: "center",
    fontSize: 13,
    color: "#FFE66D",
    animation: "slideIn 0.3s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(13,17,23,0.9)",
    backdropFilter: "blur(10px)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    gap: 16,
    flexWrap: "wrap",
  },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoMark: {
    fontSize: 28,
    color: "#4ECDC4",
    lineHeight: 1,
    filter: "drop-shadow(0 0 10px #4ECDC4aa)",
  },
  logoName: { fontSize: 18, fontWeight: 800, letterSpacing: 1, color: "#fff" },
  logoSub: { fontSize: 11, color: "#556", letterSpacing: 2, fontFamily: "Space Mono, monospace" },
  nav: { display: "flex", gap: 4 },
  navBtn: {
    background: "none",
    border: "1px solid transparent",
    color: "#556",
    padding: "6px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: 1.5,
    transition: "all 0.2s",
  },
  navBtnActive: { color: "#4ECDC4", borderColor: "rgba(78,205,196,0.3)", background: "rgba(78,205,196,0.06)" },
  headerRight: { display: "flex", gap: 12, alignItems: "center" },
  statusBadge: {
    display: "flex", alignItems: "center", gap: 8,
    border: "1px solid", borderRadius: 20, padding: "5px 12px",
  },
  statusDot: { width: 7, height: 7, borderRadius: "50%" },
  ctaBtn: {
    background: "linear-gradient(135deg, #4ECDC4, #45B7AA)",
    border: "none",
    color: "#080C10",
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700,
    fontSize: 12,
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer",
    letterSpacing: 1,
    transition: "all 0.2s",
  },
  ctaBtnStop: { background: "linear-gradient(135deg, #FF6B6B, #E05555)" },
  main: { flex: 1, padding: "24px 32px", maxWidth: 1400, margin: "0 auto", width: "100%" },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  kpiLabel: { fontSize: 10, letterSpacing: 2, color: "#556", fontFamily: "Space Mono, monospace", marginBottom: 8 },
  kpiValueRow: { display: "flex", alignItems: "baseline", gap: 6 },
  kpiValue: { fontSize: 28, fontWeight: 800, letterSpacing: -1 },
  kpiUnit: { fontSize: 13, color: "#667", fontFamily: "Space Mono, monospace" },
  kpiSub: { fontSize: 11, color: "#4ECDC4", marginTop: 4, fontFamily: "Space Mono, monospace" },
  kpiChart: { position: "absolute", bottom: 12, right: 12, opacity: 0.6 },
  midRow: {
    display: "grid",
    gridTemplateColumns: "280px 200px 1fr",
    gap: 16,
    marginBottom: 20,
  },
  pegGauge: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 20,
  },
  pegLabel: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  pegTitle: { fontSize: 10, letterSpacing: 2, color: "#556", fontFamily: "Space Mono, monospace" },
  pegStatus: { fontSize: 10, letterSpacing: 2, fontFamily: "Space Mono, monospace", fontWeight: 700 },
  pegValue: { fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 16, color: "#fff" },
  pegBarBg: { background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 6, marginBottom: 6 },
  pegBar: { height: 6, borderRadius: 4, transition: "width 1s ease, background 1s ease" },
  pegRange: { display: "flex", justifyContent: "space-between", fontSize: 10, color: "#445", fontFamily: "Space Mono, monospace" },
  bestVenue: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 20,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  sectionTitle: { fontSize: 10, letterSpacing: 2, color: "#556", fontFamily: "Space Mono, monospace", marginBottom: 12 },
  bestVenueIcon: { fontSize: 36, marginBottom: 4 },
  bestVenueName: { fontSize: 14, fontWeight: 700 },
  bestVenueApy: { fontSize: 36, fontWeight: 800, letterSpacing: -1 },
  bestVenueProtocol: { fontSize: 11, color: "#556", fontFamily: "Space Mono, monospace" },
  rebalanceHint: { fontSize: 11, color: "#FFE66D", marginTop: 8, fontFamily: "Space Mono, monospace" },
  allocationMap: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    padding: 20,
  },
  allocRow: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
  },
  allocName: { fontSize: 12, color: "#889", minWidth: 110 },
  allocBarBg: { flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 3, height: 4 },
  allocBarFill: { height: 4, borderRadius: 3, transition: "width 1.5s ease" },
  allocPct: { fontSize: 11, color: "#778", fontFamily: "Space Mono, monospace", minWidth: 38, textAlign: "right" },
  allocAmt: { fontSize: 11, color: "#556", fontFamily: "Space Mono, monospace", minWidth: 50, textAlign: "right" },
  logsPreview: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 20,
  },
  logEntry: {
    display: "flex",
    gap: 10,
    padding: "6px 0",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    fontSize: 12,
    fontFamily: "Space Mono, monospace",
    alignItems: "flex-start",
    animation: "slideIn 0.2s ease",
  },
  logTime: { color: "#445", minWidth: 80, fontSize: 10 },
  logDetail: { color: "#4ECDC4", fontSize: 10, marginLeft: "auto" },
  emptyLog: { color: "#334", fontFamily: "Space Mono, monospace", fontSize: 12, textAlign: "center", padding: "20px 0" },
  sectionHeader: { marginBottom: 20 },
  sectionSub: { fontSize: 12, color: "#445", fontFamily: "Space Mono, monospace", marginTop: 4 },
  venueGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 16,
    marginBottom: 20,
  },
  venueCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid",
    borderRadius: 12,
    padding: 20,
    transition: "all 0.3s ease",
  },
  venueHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  venueIcon: { fontSize: 24, lineHeight: 1 },
  venueName: { fontSize: 15, fontWeight: 700 },
  venueProtocol: { fontSize: 11, color: "#556", fontFamily: "Space Mono, monospace" },
  riskBadge: {
    marginLeft: "auto", border: "1px solid", borderRadius: 20,
    padding: "3px 10px", fontSize: 10, fontFamily: "Space Mono, monospace", letterSpacing: 1,
  },
  venueStats: { display: "flex", gap: 20, marginBottom: 12 },
  statLabel: { fontSize: 10, letterSpacing: 1.5, color: "#556", fontFamily: "Space Mono, monospace", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 700, fontFamily: "Space Mono, monospace" },
  venueBar: { background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 3 },
  venueFill: { height: 3, borderRadius: 3, transition: "width 1.5s ease" },
  venueDetail: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid",
    borderRadius: 12,
    padding: 24,
  },
  venueDetailHeader: { display: "flex", gap: 16, alignItems: "center", marginBottom: 20 },
  venueDetailStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  detailStat: {
    background: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    padding: "12px 16px",
  },
  detailStatValue: { fontSize: 20, fontWeight: 700, fontFamily: "Space Mono, monospace", marginTop: 4 },
  positionCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  positionHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  posCollateral: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
  posValue: { fontSize: 24, fontWeight: 800, fontFamily: "Space Mono, monospace" },
  healthRow: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  healthBarBg: { background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 8, marginBottom: 16 },
  healthBarFill: { height: 8, borderRadius: 4, transition: "width 1s ease" },
  priceRow: { display: "flex", gap: 32, marginBottom: 16 },
  priceValue: { fontSize: 18, fontWeight: 700, fontFamily: "Space Mono, monospace", marginTop: 4 },
  posActions: { display: "flex", gap: 10 },
  posBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#889",
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "Space Mono, monospace",
    fontSize: 11,
    letterSpacing: 1,
  },
  logsPanel: {},
  logsFull: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 20,
    maxHeight: "60vh",
    overflowY: "auto",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 32px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    fontSize: 11,
    color: "#334",
    fontFamily: "Space Mono, monospace",
  },
};

