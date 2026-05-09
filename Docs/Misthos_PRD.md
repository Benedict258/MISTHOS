# MISTHOS — Product Requirements Document
**On-Chain Professional Invoicing & Payment Platform on Solana**
*Version 1.0 | Dev3Pack Hackathon Build | May 2026*

---

| Field | Details |
|-------|---------|
| Project Name | Misthos |
| Version | 1.0 — Hackathon MVP |
| Status | Active Development |
| Timeline | 50-Hour Hackathon Sprint |
| Primary Chain | Solana (Devnet → Mainnet) |
| Tracks | Solana ($10K) · LI.FI ($1K) · ElevenLabs · x402 Bonus ($500) |
| Target Users | Freelancers, Agencies, Contractors, Web3 Businesses |

---

## 1. Executive Summary

Misthos is a decentralized, on-chain professional invoicing and payment platform built on Solana. It reimagines how professionals get paid — replacing opaque, slow, traditional invoicing with transparent, programmable, and near-instant payment workflows.

Every invoice is a Solana program account. Every payment flows through a PDA-controlled escrow vault. Every party — creator or payer — has cryptographic proof of what was agreed and what was paid, recorded permanently on-chain.

Payers do not need to own crypto. They can pay by card (fiat onramp), by any token on any chain (LI.FI cross-chain routing), or via x402 HTTP-native payment links. Creators receive SOL or their preferred token. The AI agent layer — powered by Claude and ElevenLabs — assists in drafting invoices, accepting voice input, monitoring payment status, and generating proof summaries.

---

## 2. Problem Statement

### 2.1 Current Pain Points

Traditional invoicing and payment collection is broken in several key ways:

- Payment disputes with no immutable audit trail — "Did you receive it?" has no definitive answer
- Long settlement times — wire transfers and card payments take 1–5 business days
- No transparency — payer and payee operate on separate records that may not match
- Currency friction — global professionals paid in wrong currencies, high FX and conversion fees
- No programmability — no escrow, no milestone payments, no conditional release logic
- Centralized platforms — dependent on intermediaries that can freeze funds or accounts without notice

### 2.2 The Opportunity

Solana's high throughput and sub-cent transaction fees make it the ideal settlement layer for professional invoicing. At 400ms finality, Solana enables real-time payment confirmation at scale. Misthos brings this infrastructure to everyday professionals with a user experience as clean as any modern SaaS product — no crypto knowledge required to receive or make a payment.

---

## 3. Product Vision & Goals

### 3.1 Vision Statement

To become the global standard for professional payment agreements — where every invoice is a smart contract, every payment is provable, and every professional has access to programmable money rails regardless of geography or crypto knowledge.

### 3.2 Hackathon Goals

- Deploy a working Rust/Anchor program to Solana devnet with full invoice lifecycle on-chain
- Deliver a polished web app with creator dashboard and payer experience
- Integrate LI.FI SDK for cross-chain payments — pay in any token, receive SOL or USDC
- Integrate fiat card payment via Coinflow or Sphere Pay onramp — no wallet required for payer
- Implement x402 protocol for HTTP-native invoice payment links — qualifies for the $500 bonus
- Deploy AI agent layer for invoice drafting and automated payment reminders
- Integrate ElevenLabs for voice invoice creation and audio payment confirmations
- Qualify for and submit to: Solana, LI.FI, ElevenLabs, and x402 bonus tracks

---

## 4. Target Users & Personas

| Persona | Who They Are | Pain Point | How Misthos Helps |
|---------|-------------|------------|-------------------|
| Alex — Freelancer | Dev/designer, global clients | Late payments, no proof | On-chain escrow + instant confirmation |
| Maya — Agency Owner | Runs a 10-person studio | Invoice management at scale | Dashboard, AI drafting, analytics |
| Carlos — Web3 Contractor | Crypto-native professional | Cross-chain payment friction | LI.FI routing, any token accepted |
| Lena — Client/Payer | Non-crypto business owner | Doesn't want to deal with wallets | Pay by card via fiat onramp |

---

## 5. Features & Requirements

### 5.1 On-Chain Program (Rust / Anchor)

The core Solana program manages all invoice state and payment logic. This is what makes Misthos fundamentally different from any web2 invoicing tool.

- **Invoice Account** — stores creator pubkey, payer pubkey, amount, token mint, due date, status, line items hash
- **Escrow Vault** — PDA-controlled token account; holds funds in pending state until release conditions are met
- **Status Machine** — Draft → Sent → Viewed → Paid → Settled → Disputed → Refunded
- **Payment Record** — immutable on-chain log entry created for every state transition
- **x402 Payment Handler** — dedicated instruction to accept x402 protocol payment calls natively
- **Access Control** — creator-only update instructions; payer-only payment instruction; program-only escrow release
- **Multi-token Support** — handles SOL (native), USDC, and any SPL token via associated token accounts

### 5.2 Creator Dashboard

- Wallet connection via Solana Wallet Adapter (Phantom, Backpack, Solflare, Ledger)
- Invoice creation form — client name/email, service description, line items, amount, token, due date
- **AI Invoice Agent** — describe work in plain English, Claude API generates structured invoice fields
- **ElevenLabs Voice Input** — speak invoice details, ElevenLabs transcribes, agent populates the form
- Invoice management list — filter by status: draft, sent, paid, overdue, disputed
- Analytics panel — total earned, pending amounts, top clients, payment velocity
- On-chain tx explorer links for every invoice creation, update, and payment event
- PDF receipt download with embedded on-chain proof: tx hash, block time, program address, invoice hash
- **Payment Reminder Agent** — monitors on-chain status, auto-triggers email reminders for overdue invoices

### 5.3 Payer Experience

- Receives invoice via branded email — view link requires no wallet or account creation
- Professional invoice display — line items, amounts, due date, creator profile, payment options
- **Payment Method 1:** Connected wallet — pay in SOL or any SPL token directly
- **Payment Method 2:** Cross-chain via LI.FI — pay in ETH, USDC on Base, MATIC, or 60+ other tokens
- **Payment Method 3:** Fiat card — pay in USD/EUR via Coinflow/Sphere Pay card onramp, no crypto needed
- **Payment Method 4:** x402 link — one-click HTTP-native payment via x402 protocol
- Real-time status display — pending, confirming, confirmed, settled
- ElevenLabs audio confirmation — voice message confirms successful payment
- Downloadable PDF payment receipt with full on-chain proof

### 5.4 Cross-Chain Payments (LI.FI)

- LI.FI SDK integrated into payer payment flow — payer selects their token and chain
- LI.FI routes and bridges across 60+ chains, aggregates Solana DEXs, converts to creator's preferred token
- LI.FI Widget embedded for seamless UX — single interface for chain selection, routing, execution
- LI.FI MCP Server used by AI agent to query bridge transaction status
- Real-time route preview — shows estimated fees, slippage, and arrival time before confirmation

### 5.5 Fiat Card Payment (Onramp)

- Coinflow or Sphere Pay embedded checkout for card-to-crypto flow
- Payer pays in USD, EUR, GBP via Visa or Mastercard — familiar checkout experience
- Onramp converts fiat to USDC/SOL and routes directly to the invoice escrow vault on-chain
- No crypto wallet, no seed phrase, no exchange account required on the payer's side
- KYC/AML handled entirely by the onramp provider — Misthos is not a money transmitter

### 5.6 AI & Agentic Layer

- **Invoice Drafting Agent** — NLP form fill from plain English: *"Invoice John for 20 hours of React dev at $150/hr"*
- **Voice Input Agent** — ElevenLabs Speech-to-Text captures spoken invoice details, Claude structures the data
- **Payment Reminder Agent** — monitors devnet for overdue invoice accounts, schedules email reminders
- **Dispute Analyzer** — reads on-chain event history, generates a human-readable payment proof PDF
- **ElevenLabs TTS Notifications** — voice alerts for: invoice sent, payment received, invoice overdue

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Invoice creation tx confirms in < 2s on devnet; frontend loads in < 3s |
| Security | PDA-controlled escrow — funds releasable only by program logic; no admin keys or upgrade authority on mainnet |
| Availability | Frontend hosted on Vercel (99.9% SLA); program lives on Solana network |
| Scalability | Stateless frontend; on-chain state per invoice account; no central DB dependency for core function |
| Open Source | Public GitHub repo; MIT license; README with setup instructions and deployed contract addresses |
| Accessibility | WCAG 2.1 AA compliant; works on Chrome, Firefox, Safari; mobile-responsive layout |

---

## 7. Hackathon Qualification Checklist

| Requirement | How Misthos Satisfies It | Track |
|-------------|--------------------------|-------|
| Unique Rust program on Solana | Anchor invoice + escrow program written from scratch | Solana |
| Deployed to devnet | Program deployed and tested via Anchor CLI | Solana |
| Contract addresses in README | Devnet + mainnet addresses documented and linked | Solana |
| Public GitHub repo + README | Open source, full setup, contribution docs | Solana |
| Demo video < 3 minutes | Full walkthrough: create → pay → settle → proof | All |
| Live demo link | Deployed on Vercel, always-on | All |
| LI.FI SDK integration | Widget + SDK in payer cross-chain payment flow | LI.FI |
| x402 payment support | Invoice link via x402 protocol instruction | x402 Bonus |
| ElevenLabs integration | Voice input (STT) + payment confirmation (TTS) | ElevenLabs |
| ElevenLabs README section | Integration path and API usage documented | ElevenLabs |
| Solana SDK/libraries usage | web3.js, wallet-adapter, spl-token, anchor throughout | Solana |

---

## 8. Success Metrics

For the hackathon demo, Misthos succeeds if all of the following are demonstrated live:

- End-to-end flow works: invoice created on-chain → payer pays → escrow releases → creator receives funds
- All 4 payment methods demonstrated or shown: wallet, LI.FI cross-chain, fiat card, x402 link
- AI agent drafts an invoice from a plain-English prompt — live on screen
- ElevenLabs voice flow shown: speak invoice details → form auto-populated
- On-chain transactions visible and verifiable on Solana Explorer
- PDF proof receipt downloaded with embedded tx hash
- Demo video is polished, under 3 minutes, tells a coherent user story

---

## 9. Post-Hackathon Roadmap

- **Phase 2:** Mobile app — Android-native APK using Solana Mobile Stack
- **Phase 3:** Recurring invoices, subscription billing, milestone-based escrow release
- **Phase 4:** Multi-sig approval workflows for enterprise agency teams
- **Phase 5:** Native fiat offramp — creator withdraws to bank account directly
- **Phase 6:** Misthos protocol token — fee sharing, governance, liquidity incentives
- **Phase 7:** On-chain dispute resolution via community arbitration or DAO vote

---

*MISTHOS — Every invoice is a contract. Every payment is proof.*
