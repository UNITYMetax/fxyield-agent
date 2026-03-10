# ⬡ FxYield Agent

<div align="center">

**Autonomous fxUSD Yield Optimizer & Liquidity Agent — Built on Base**

[![License: MIT](https://img.shields.io/badge/License-MIT-4ECDC4.svg)](LICENSE)
[![Built on Base](https://img.shields.io/badge/Built%20on-Base-0052FF.svg)](https://base.org)
[![Powered by f(x)](https://img.shields.io/badge/Powered%20by-f(x)%20Protocol-FFE66D.svg)](https://fx.aladdin.club)
[![Grant](https://img.shields.io/badge/f(x)%20Grant-5000%20fxUSD-A78BFA.svg)](#)

*A grant project for the f(x) Protocol 5,000 fxUSD Builder Grant · Base Ecosystem*

[Live Demo](https://fxyield-agent.vercel.app) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

</div>

---

## 📖 Description

FxYield Agent is a fully autonomous on-chain agent that manages users' fxUSD positions across the Base ecosystem — so you don't have to.

The f(x) Protocol's fxUSD is one of the most capital-efficient stablecoins on Base, offering yield across multiple venues (Morpho vaults, Stability Pool, Aerodrome LP, Curve). The problem: extracting maximum yield requires constant monitoring, manual rebalancing, reward harvesting, and active management of leveraged xPOSITIONs — work most users simply won't do.

FxYield Agent does all of this automatically. It runs a continuous execution cycle every ~4 hours: scanning APYs, routing capital to the best risk-adjusted venue, compounding rewards, monitoring the fxUSD peg, and protecting leveraged positions from liquidation.

**The result**: users earn optimized, compounded fxUSD yield without lifting a finger — while the Base ecosystem gains deeper, more active fxUSD liquidity.

---

## ✨ Features

### 🔁 Auto-Yield Router
Scores all active fxUSD yield venues on Base by risk-adjusted APY using a softmax allocation model. Automatically rebalances when position drift exceeds a gas-cost-adjusted threshold (~3%).

### 🛡️ Peg Sentinel
Monitors the fxUSD peg against Chainlink price feeds in real time. Responds automatically across 5 severity tiers — from passive monitoring at ±0.2% deviation all the way to emergency deposits and Farcaster alerts at ±2%+.

### ♻️ Stability Pool Compounder
Harvests pending rewards from the f(x) Stability Pool and re-deploys them into the optimal venue each cycle. Turns manually-harvested yield into continuously compounding returns.

### 📊 xPOSITION Manager
Monitors f(x) Protocol leveraged xToken positions. Calculates real-time health scores (0–100), sends Farcaster notifications when health drops below warning thresholds, and auto-deleverages to protect positions before liquidation.

### 🖥️ Live Dashboard
A full React dashboard showing: KPIs, venue APY tracker, peg health gauge, allocation map, xPOSITION monitor, and a live agent execution log.

---

## 🏗️ Architecture

```
fxyield-agent/
├── src/
│   ├── agent/
│   │   ├── orchestrator.js        # Main execution loop (~4h cycle)
│   │   ├── yieldRouter.js         # Risk-adjusted APY scoring & allocation
│   │   ├── pegSentinel.js         # Peg health monitor & action planner
│   │   └── xPositionManager.js    # Leverage health scoring & deleverage
│   └── App.jsx                    # React dashboard UI
├── .env.example                   # Environment variable template
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

---

## 🔄 Agent Execution Cycle

```
Every ~4 hours:
  ├── 1. Fetch live data
  │       ├── Venue APYs (Morpho, Stability Pool, Aerodrome, Curve)
  │       ├── fxUSD peg price (Chainlink)
  │       └── xPOSITION health (f(x) Protocol contracts)
  │
  ├── 2. Peg Sentinel check
  │       └── Execute protective action if deviation > threshold
  │
  ├── 3. Yield Router
  │       ├── Score venues by risk-adjusted APY
  │       ├── Compute optimal allocation weights
  │       └── Rebalance if drift > 3%
  │
  ├── 4. Compound rewards
  │       └── Harvest → re-deploy into optimal venue
  │
  ├── 5. xPOSITION Monitor
  │       └── Auto-deleverage if health < 30%
  │
  └── 6. Log summary + push Farcaster notification
```

---

## 🎯 Yield Venues (Base)

| Venue | Protocol | Risk | Notes |
|---|---|---|---|
| fxUSD Agentic Vault | Morpho | Low | Lending vault, single-sided |
| Stability Pool | f(x) Protocol | Medium | Core protocol yield |
| fxUSD/USDC | Aerodrome | Medium | DEX LP, IL risk |
| fxUSD/crvUSD | Curve | Low | Stable-stable LP |

---

## 🔐 Peg Health Thresholds

| Deviation | Status | Agent Action |
|---|---|---|
| < ±0.2% | ✅ HEALTHY | None |
| ±0.2 – 0.5% | 👀 WATCH | Increased monitoring |
| ±0.5 – 1.0% | ⚠️ WARNING | Rebalance toward Stability Pool |
| ±1.0 – 2.0% | 🚨 ALERT | Emergency deposit / redemption |
| > ±2.0% | 🔴 CRITICAL | Halt all activity + Farcaster alert |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Agent Runtime | Coinbase AgentKit |
| Chain | Base Mainnet |
| Yield Protocol | f(x) Protocol (fxUSD) |
| Lending | Morpho Vaults |
| DEX LP | Aerodrome Finance |
| Stable LP | Curve Finance |
| Price Feeds | Chainlink (Base) |
| Notifications | Farcaster Frames |
| Frontend | React |
| Language | JavaScript / Node.js |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- A Base-compatible wallet with ETH for gas
- A free Alchemy or Infura RPC endpoint for Base

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/fxyield-agent.git
cd fxyield-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

Open `.env` and fill in your values:

```env
PRIVATE_KEY=your_agent_wallet_private_key
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
CHAINLINK_FXUSD_FEED=0x...
MORPHO_VAULT_ADDRESS=0x...
FX_STABILITY_POOL=0x...
```

### Run the Dashboard

```bash
npm run dev
# Opens at http://localhost:5173
```

### Run the Agent

```bash
node src/agent/orchestrator.js
# Agent runs one cycle immediately, then every 4 hours
```

---

## 📱 Mobile Deployment (No PC Required)

You can deploy this entirely from your phone:

1. **GitHub** — Paste files using the GitHub mobile app
2. **Vercel** — Connect your GitHub repo at vercel.com → auto-deploys the dashboard
3. **Render** — Connect your repo at render.com → runs the agent server
4. **Alchemy** — Get a free Base RPC at alchemy.com
5. **Coinbase Wallet** — Create and fund your agent wallet

---

## 📅 Grant Milestones

| Week | Deliverable | Status |
|---|---|---|
| 1–2 | Agent wallet + f(x)/Morpho read integration + peg monitoring | ✅ Complete |
| 3–4 | Auto-yield router live on Base testnet | ✅ Complete |
| 5–6 | Farcaster frame UI + xPOSITION alerting | 🔄 In Progress |
| 7–8 | Mainnet deploy + open-source repo + docs | 🔄 In Progress |

---

## 🤝 Contributing

Contributions are welcome! This is an open-source public good for the Base + f(x) ecosystem.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please make sure your PR includes a clear description of what it does and why.

---

## ⚠️ Disclaimer

This software is provided for educational and experimental purposes. DeFi involves significant risk including smart contract risk, liquidation risk, and loss of funds. Always do your own research. The authors are not responsible for any financial losses incurred through use of this software.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [f(x) Protocol](https://fx.aladdin.club) — for building fxUSD and the grant program
- [Coinbase AgentKit](https://github.com/coinbase/agentkit) — for the Base agent infrastructure
- [Morpho](https://morpho.org) — for the fxUSD Agentic Vault
- [Base](https://base.org) — for the L2 infrastructure
- [Aerodrome](https://aerodrome.finance) — for fxUSD liquidity

---

<div align="center">
Built with ❤️ on Base · <a href="https://fx.aladdin.club">f(x) Protocol</a> · MIT License
</div>
