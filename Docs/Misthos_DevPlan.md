# MISTHOS — Development Plan
**50-Hour Hackathon Sprint — Full Team Execution Guide**
*Dev3Pack Hackathon | May 2026*

---

## 1. Sprint Overview

This document is the execution guide for the Misthos hackathon build. With a full team across Rust/Solana, frontend, full-stack, UI/UX, and AI/ML — we have coverage to build and ship all components in 50 hours. Parallel execution and clear ownership of each module are critical.

**The goal:** a working, demo-ready product that qualifies for the Solana ($10K), LI.FI ($1K), ElevenLabs, and x402 bonus ($500) tracks — with a live deployment, on-chain contract, and a polished demo video.

---

## 2. Team Structure & Ownership

| Role | Module Owned | Key Deliverable |
|------|-------------|-----------------|
| Rust/Solana Dev | On-Chain Program | Anchor program: invoice, escrow, x402, devnet deploy |
| Frontend Dev | Creator Dashboard | Next.js dashboard: wallet connect, invoice list, analytics |
| Full-Stack Dev | Payer Flow + APIs | Invoice page, payment flow, email service, PDF generation |
| UI/UX Designer | Design System | Figma → component library, all screens, brand identity |
| AI/ML Engineer | AI + Voice Layer | Claude agent, ElevenLabs STT/TTS, reminder agent |

---

## 3. Full Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| On-Chain | Rust + Anchor Framework | Invoice program, escrow vault, PDA accounts |
| On-Chain Testing | Solana Test Validator | Local devnet for rapid iteration |
| Blockchain | Solana Devnet → Mainnet | Primary settlement layer |
| Frontend | Next.js 14 + TypeScript | Creator dashboard, payer invoice page |
| Styling | Tailwind CSS + shadcn/ui | Component library, design system |
| Wallet | Solana Wallet Adapter | Phantom, Backpack, Solflare, Ledger support |
| Solana JS | @solana/web3.js v2 | Transactions, accounts, program interaction |
| Token | @solana/spl-token | SPL token accounts, transfers, mints |
| Cross-Chain | LI.FI SDK + Widget | Cross-chain payment routing and bridging |
| Fiat Onramp | Coinflow / Sphere Pay | Card-to-crypto for non-crypto payers |
| x402 | x402 Solana Protocol | HTTP-native invoice payment links |
| AI Agent | Claude API (Anthropic) | Invoice drafting, NLP, reminder scheduling |
| Voice Input | ElevenLabs STT API | Speak-to-invoice voice input |
| Voice Output | ElevenLabs TTS API | Payment confirmations, overdue alerts |
| Email | Resend | Invoice delivery, payment notifications |
| PDF | react-pdf / puppeteer | On-chain proof receipt generation |
| Deployment | Vercel | Frontend hosting, always-on demo |
| Version Control | GitHub (public repo) | Open source, hackathon submission |

---

## 4. 50-Hour Sprint Plan

The sprint is divided into 5 phases. Phases 1–3 run in parallel across teams. Phases 4 and 5 are integration and polish.

---

### Phase 1: Foundation (Hours 0–10)

All teams set up environments and deliver core scaffolding simultaneously.

| Phase | Tasks | Owner(s) | Hours |
|-------|-------|----------|-------|
| Rust Dev | Init Anchor project, write Invoice account struct + CreateInvoice instruction | Rust Dev | 0–10h |
| Frontend | Scaffold Next.js app, install wallet-adapter, set up Tailwind + shadcn/ui | Frontend Dev | 0–10h |
| Full-Stack | Set up API routes (Next.js API), Resend email integration, env variables | Full-Stack Dev | 0–10h |
| UI/UX | Deliver component library in Figma: colors, typography, buttons, cards, forms | UI/UX Designer | 0–10h |
| AI/ML | Init Claude API integration, build invoice drafting prompt, test NLP accuracy | AI/ML Engineer | 0–10h |

---

### Phase 2: Core Build (Hours 10–28)

Each team builds their primary feature module. This is the heaviest parallel execution phase.

| Phase | Tasks | Owner(s) | Hours |
|-------|-------|----------|-------|
| Rust Dev | PayInvoice + ReleaseEscrow instructions, PDA vault, SPL token support, x402 instruction | Rust Dev | 10–28h |
| Frontend | Creator dashboard: invoice creation form, invoice list, wallet connect, status badges | Frontend Dev | 10–28h |
| Full-Stack | Payer invoice page, LI.FI Widget integration, Coinflow card flow, PDF generation | Full-Stack Dev | 10–28h |
| UI/UX | Implement designs into components; payer page; dashboard screens; mobile responsive | UI/UX Designer | 10–28h |
| AI/ML | ElevenLabs STT voice input flow; TTS payment confirmation; Claude reminder agent logic | AI/ML Engineer | 10–28h |

---

### Phase 3: Integration (Hours 28–38)

Teams merge work. Frontend connects to on-chain program. AI layer connects to dashboard.

| Phase | Tasks | Owner(s) | Hours |
|-------|-------|----------|-------|
| Rust Dev | Deploy to Solana devnet, verify all instructions, document program IDs in README | Rust Dev | 28–38h |
| Frontend | Connect dashboard to Anchor program via web3.js; invoice creation writes on-chain | Frontend + Full-Stack | 28–38h |
| Full-Stack | Connect payer payment flows to escrow; test LI.FI routing; test card onramp | Full-Stack Dev | 28–38h |
| UI/UX | QA all screens for visual consistency; fix spacing, overflow, mobile issues | UI/UX Designer | 28–38h |
| AI/ML | Integrate voice input into creation form; wire TTS to payment confirmation events | AI/ML Engineer | 28–38h |

---

### Phase 4: QA & Polish (Hours 38–46)

| Phase | Tasks | Owner(s) | Hours |
|-------|-------|----------|-------|
| QA | End-to-end test: create invoice → LI.FI pay → escrow release → PDF download | All Teams | 38–46h |
| QA | Test x402 payment link flow end-to-end from link generation to settlement | Rust + Full-Stack | 38–46h |
| QA | Fix all critical bugs; remove console errors; handle all wallet error states | All Teams | 38–46h |
| QA | Verify all on-chain transactions visible and correct on Solana Explorer | Rust Dev | 38–46h |
| Docs | Write README: setup, contract addresses, ElevenLabs + LI.FI integration sections | Full-Stack Dev | 38–46h |

---

### Phase 5: Demo & Submission (Hours 46–50)

| Phase | Tasks | Owner(s) | Hours |
|-------|-------|----------|-------|
| Demo | Record 3-minute demo video: full creator + payer walkthrough, all payment types | All Teams | 46–48h |
| Deploy | Deploy final build to Vercel; ensure live demo link works; test on mobile | Full-Stack Dev | 46–48h |
| Submit | Final GitHub push: README, contract addresses, setup instructions complete | All Teams | 48–49h |
| Submit | Submit to Solana, LI.FI, ElevenLabs tracks; submit x402 bonus; optional Colosseum | Team Lead | 49–50h |

---

## 5. On-Chain Program Architecture

### 5.1 Program Accounts

- **InvoiceAccount** — PDA seeded by `[creator_pubkey, invoice_id]` — stores all invoice metadata and status
- **EscrowVault** — PDA seeded by `[invoice_pubkey, 'escrow']` — SPL token account holding locked funds
- **PaymentRecord** — PDA seeded by `[invoice_pubkey, 'payment']` — immutable log of payment event

### 5.2 Program Instructions

| Instruction | Parameters | Purpose |
|-------------|-----------|---------|
| `create_invoice` | id, payer, amount, mint, due_date, metadata_hash | Creates InvoiceAccount on-chain |
| `update_invoice` | id, fields... | Creator only; allowed before payment |
| `pay_invoice` | invoice_id | Payer transfers to EscrowVault; status → Paid |
| `release_escrow` | invoice_id | Creator claims funds; status → Settled |
| `pay_x402` | invoice_id, payment_data | Handles x402 protocol payment calls |
| `dispute_invoice` | invoice_id | Either party; freezes escrow; status → Disputed |
| `refund_invoice` | invoice_id | Returns funds to payer; status → Refunded |

### 5.3 Framework: Anchor

Anchor is used for the hackathon build. Its IDL generation, account validation macros, and TypeScript client generation reduce development time significantly — critical in a 50-hour sprint. The full IDL will be published in the GitHub repo for transparency.

---

## 6. API Design (Next.js API Routes)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/invoice/send` | POST | Send invoice email to payer with branded link |
| `/api/invoice/remind` | POST | Trigger overdue reminder email for a given invoice |
| `/api/invoice/proof` | POST | Generate signed PDF receipt with on-chain proof |
| `/api/ai/draft` | POST | Take plain English description → return structured invoice JSON |
| `/api/voice/transcribe` | POST | Receive audio blob → ElevenLabs STT → return transcript |
| `/api/invoice/:id` | GET | Return invoice metadata (reads from Solana RPC) |

---

## 7. Risk Register

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Anchor program bugs delay devnet deploy | High | Start Rust work at Hour 0; use Solana Playground as fallback IDE |
| LI.FI routing fails on devnet tokens | Medium | Test against testnet tokens early; wallet-only as fallback |
| Coinflow/Sphere Pay sandbox access issues | Medium | Get API keys in first 2 hours; mock fiat flow in demo if needed |
| ElevenLabs voice latency in live demo | Low | Pre-record voice segment; use TTS as primary focus if STT lags |
| Team integration conflicts in codebase | Medium | Feature branches; integration lead; merge checkpoint at Hour 28 |
| Demo video exceeds 3 minutes | Low | Script and rehearse at Hour 46; keep to 5 core screens only |

---

## 8. Demo Script (3-Minute Walkthrough)

### Screen 1 — Creator Dashboard (0:00–0:40)
- Creator logs in with Phantom wallet on devnet
- Click **New Invoice** — AI demo: type *"Invoice Sarah for 3 weeks of UI design at $2,500"* → form auto-populates
- Show ElevenLabs voice input: speak same phrase → form fills from audio
- Set token to USDC, due date 7 days → **Create Invoice** → Solana tx fires → invoice account created on-chain

### Screen 2 — Invoice Sent (0:40–1:10)
- Invoice appears in dashboard with **Sent** status and on-chain tx link
- Show branded email received by payer (Resend delivery)

### Screen 3 — Payer Experience (1:10–1:50)
- Open invoice payment link — professional view, no wallet required
- Demo LI.FI Widget: payer selects ETH on Ethereum → LI.FI routes cross-chain to Solana
- Show fiat card flow: Coinflow checkout with card details — fiat-to-USDC-to-escrow
- Payment confirms → ElevenLabs voice: *"Your payment of $2,500 has been received and confirmed on Solana"*

### Screen 4 — Creator Receives (1:50–2:30)
- Back to creator dashboard — invoice shows **Paid**; click **Release Escrow**
- Funds transfer to creator wallet; download PDF proof with tx hash

### Screen 5 — On-Chain Proof (2:30–3:00)
- Open Solana Explorer — show invoice program account, escrow PDA, payment record
- Close: *"Every invoice. Every payment. On-chain. That's Misthos."*

---

## 9. Submission Checklist

- [ ] Public GitHub repo with full codebase, MIT license, clear folder structure
- [ ] README: project description, setup instructions, contract addresses (devnet + mainnet)
- [ ] README section: ElevenLabs integration path documentation (STT + TTS APIs used)
- [ ] README section: LI.FI integration documentation and SDK usage
- [ ] Demo video under 3 minutes — uploaded to YouTube or Loom, link in README
- [ ] Live demo link on Vercel — tested, always-on, accessible without login
- [ ] Submitted to: Solana track, LI.FI track, ElevenLabs track, x402 bonus
- [ ] Optional: submitted to Colosseum side track for accelerator consideration

---

*MISTHOS — Build fast. Ship on-chain. Get paid.*
