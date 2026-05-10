# MISTHOS: On-Chain Professional Invoicing

> Every invoice is a contract. Every payment is proof.

**MISTHOS** is a Solana-based invoicing platform that brings transparency, speed, and settlement finality to professional payments. Creators invoice in seconds. Clients pay with one signature. All transactions are on-chain and verifiable.

---

## **Quick Start**

### Prerequisites

- Node.js 18+ (tested on 22.x)
- Yarn (v1.22.22+)
- Phantom or Solflare wallet (https://phantom.app or https://solflare.com)
- Devnet SOL (~0.05 SOL for testing) — get from https://faucet.solana.com

### Installation & Setup

```bash
# Clone and install
git clone <repo-url> && cd MISTHOS
yarn install

# Start dev server
yarn dev

# Open browser
open http://localhost:5173
```

**Expected output:**

```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## **Core Features** ✅

### ✅ Create & Share Invoices

- Draft invoices with line items
- AI-assisted invoice generation (Claude)
- Voice input support (ElevenLabs)
- Generate shareable payment links
- Send branded email notifications (Resend)

### ✅ On-Chain Payment Lifecycle

1. **Create:** Invoice recorded on Solana blockchain
2. **Share:** Shareable link with no account requirement
3. **Pay:** Client pays → funds locked in escrow
4. **Release:** Creator confirms → funds settle
5. **Proof:** All transactions verifiable on Devnet Explorer

### ✅ Payment Methods (Phase 1: Wallet only)

- **Wallet-based payments:** Direct Solana wallet → works today ✅
- **Cross-chain swaps (LI.FI):** Via LI.FI aggregator API (roadmap)
- **Fiat card checkout (Coinflow):** Card → USDC → on-chain (roadmap)
- **x402 Protocol:** Micro-payment streaming (roadmap)

### 🔄 Roadmap Features (Post-Hackathon)

- [ ] Real LI.FI cross-chain execution
- [ ] Coinflow fiat card integration
- [ ] x402 protocol backend
- [ ] Payment reminders (cron agent)
- [ ] Dispute & refund workflows
- [ ] Production deployment (Vercel + Helius RPC)

---

## **Architecture**

### On-Chain (Solana Program)

- **Program ID:** `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht` (Devnet)
- **Framework:** Anchor (Rust)
- **Accounts:**
  - Invoice PDA: Stores invoice metadata
  - Escrow Vault: SPL Token account for payment locking
  - Payment Record: Tracks payer → amount → release status
- **Instructions:**
  - `create_invoice`: Register invoice on-chain
  - `send_invoice`: Notify payer
  - `pay_invoice`: Transfer funds to escrow
  - `release_escrow`: Settle funds to creator
  - `dispute_invoice`: Mark for review
  - `refund_invoice`: Return funds to payer

### Frontend (React + Vite)

- **TypeScript + React 18**
- **Routing:** React Router v6
- **UI Kit:** Tailwind CSS + shadcn/ui + Framer Motion
- **Wallet:** @solana/wallet-adapter (Phantom + Solflare)
- **Blockchain:** @coral-xyz/anchor + @solana/web3.js
- **External APIs:**
  - Claude (AI drafting): `/api/ai/draft`
  - ElevenLabs (voice): `/api/voice/transcribe` (mocked)
  - Resend (email): `/api/email/send`
  - Solana Explorer (proof links): https://explorer.solana.com/?cluster=devnet

---

## **Testing on Devnet**

### 1. Setup Wallet

```bash
# Install Phantom: https://phantom.app
# Or Solflare: https://solflare.com
# Switch to Devnet network in wallet settings
# Request airdrop: https://faucet.solana.com
```

### 2. Start Dev Server

```bash
yarn dev
```

### 3. Follow Demo Flow

1. Click **"Connect Wallet"** → select Phantom/Solflare → approve
2. **Create Invoice:** `/invoice/new` → fill form → click "Create & Send"
3. **Verify On-Chain:** Click explorer link in success toast
   - See transaction on Devnet Explorer
   - Confirm program ID: `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht`
4. **Share Invoice:** Copy shareable link from invoice detail page
5. **Pay Invoice:** Open link in new tab (incognito) → "Pay with Wallet" → sign

### 4. Verify Proof

- Click explorer links in payment confirmation
- See full transaction details on https://explorer.solana.com/?cluster=devnet

**Full runbook:** See [DEVNET_DEPLOYMENT_RUNBOOK.md](./DEVNET_DEPLOYMENT_RUNBOOK.md)

---

## **Demo Script**

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for a complete 2-minute demo walkthrough with timing, talking points, and recovery plans.

---

## **Project Structure**

```
.
├── src/
│   ├── pages/              # Route pages
│   │   ├── CreateInvoice.tsx    # Creator invoice form
│   │   ├── PayInvoice.tsx       # Payer payment flow
│   │   ├── InvoiceDetail.tsx    # Invoice view + release
│   │   ├── Dashboard.tsx        # Creator dashboard
│   │   └── Landing.tsx          # Public landing page
│   ├── components/         # Reusable UI components
│   ├── lib/                # Core logic
│   │   ├── misthos.ts      # Anchor SDK client
│   │   ├── configAddress.ts # Program ID
│   │   ├── constants.ts    # App constants
│   │   └── utils.ts        # Helpers
│   ├── hooks/              # React hooks (wallet, toast, voice)
│   └── App.tsx             # Router root
├── contracts/              # Solana Anchor program
│   ├── programs/workspace/ # Rust smart contract
│   ├── Anchor.toml         # Anchor config
│   └── tests/              # Program tests
├── docs/                   # Documentation
│   ├── Misthos_Architecture.md
│   ├── Misthos_DevPlan.md
│   ├── Misthos_PRD.md
│   └── RELEASE_NOTES_DEVNET.md
├── DEVNET_DEPLOYMENT_RUNBOOK.md  # ← Start here!
├── DEMO_SCRIPT.md                 # ← Demo guidance
├── vite.config.ts          # Vite bundler config
├── tailwind.config.js      # Tailwind theme
└── package.json            # Dependencies

```

---

## **Key Files**

### Frontend Logic

- [src/lib/misthos.ts](./src/lib/misthos.ts) — Anchor SDK with all invoice methods
- [src/pages/CreateInvoice.tsx](./src/pages/CreateInvoice.tsx) — Invoice creation (AI + voice)
- [src/pages/PayInvoice.tsx](./src/pages/PayInvoice.tsx) — Payment flow (wallet + stubs)
- [src/pages/InvoiceDetail.tsx](./src/pages/InvoiceDetail.tsx) — Read & proof display

### Smart Contract

- [contracts/programs/workspace/src/lib.rs](./contracts/programs/workspace/src/lib.rs) — Main program
- [contracts/Anchor.toml](./contracts/Anchor.toml) — Program config & IDs

### Docs

- [DEVNET_DEPLOYMENT_RUNBOOK.md](./DEVNET_DEPLOYMENT_RUNBOOK.md) — Step-by-step testing guide
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) — 2-minute demo with talking points
- [docs/Misthos_Architecture.md](./docs/Misthos_Architecture.md) — Technical deep-dive

---

## **Environment Variables** (Optional)

If you want to enable backend features (currently fallback to demo mode):

```bash
# .env.local
VITE_PROGRAM_ID=DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht

# Backend APIs (not served by Vite; for reference)
ANTHROPIC_API_KEY=sk-...    # Claude API for invoice drafting
RESEND_API_KEY=re_...        # Resend for email notifications
ELEVENLABS_API_KEY=...       # ElevenLabs for voice (future)
```

---

## **Known Limitations**

| Feature                   | Status         | Notes                                                               |
| ------------------------- | -------------- | ------------------------------------------------------------------- |
| Create invoice            | ✅ Ready       | On-chain, fully functional                                          |
| Share link                | ✅ Ready       | Public URLs work, no auth required                                  |
| Wallet payment            | ✅ Ready       | Tested on Devnet, real tx                                           |
| Explorer links            | ✅ Ready       | All txs link to Devnet Explorer                                     |
| Email notifications       | 🟡 Partial     | Endpoint exists; Vite doesn't serve it (next: dedicated API server) |
| AI draft                  | 🟡 Partial     | Falls back gracefully if Claude key missing                         |
| Voice input               | 🟡 Partial     | Mocked with demo transcript                                         |
| Cross-chain swaps (LI.FI) | 🔴 Stubbed     | UI buttons present; no real execution                               |
| Fiat card (Coinflow)      | 🔴 Stubbed     | UI form present; no checkout                                        |
| x402 protocol             | 🔴 Stubbed     | URL display; no backend                                             |
| Dispute flow              | 🔴 Not exposed | SDK methods exist; UI not wired                                     |

---

## **troubleshooting**

| Problem                | Solution                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| Wallet won't connect   | Switch phantom/solflare to **Devnet**; refresh page              |
| "Insufficient balance" | Get airdrop: https://faucet.solana.com                           |
| Transaction fails      | Check program ID: `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht` |
| API calls fail         | Expected—backend not served by dev server; fallback UX active    |
| Slow Devnet            | Build inherent; network accepts txs but ~10–15s to confirm       |
| `yarn dev` errors      | Run `yarn install` again; clear node_modules if needed           |

---

## **Hackathon Submissions**

We're tracking MISTHOS against multiple hackathon bounties:

- **Solana Track:** On-chain invoicing with escrow
- **LI.FI Track:** Cross-chain swap integration (in progress)
- **ElevenLabs Track:** Voice invoice generation (in progress)
- **x402 Bonus:** Micro-payment streaming (in progress)

**Status:** Core flow (create → pay → release → proof) is live on Devnet. Cross-chain and fiat integrations are in progress for next sprint.

---

## **Contributors**

- **Benedict** — Product & Frontend
- **Solana Ecosystem** — Program, wallet adapters, RPC

---

## **License**

MIT

---

## **Links**

- **Program ID:** `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht` (Devnet)
- **Devnet Explorer:** https://explorer.solana.com/?cluster=devnet
- **Devnet Faucet:** https://faucet.solana.com
- **Phantom Wallet:** https://phantom.app
- **Solflare Wallet:** https://solflare.com
- **Docs:** [DEVNET_DEPLOYMENT_RUNBOOK.md](./DEVNET_DEPLOYMENT_RUNBOOK.md) | [DEMO_SCRIPT.md](./DEMO_SCRIPT.md)

---

**Ready to demo?** Follow [DEVNET_DEPLOYMENT_RUNBOOK.md](./DEVNET_DEPLOYMENT_RUNBOOK.md), then use [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for your 2-minute presentation. 🚀
