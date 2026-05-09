# MISTHOS — Product System Architecture
**Full-Stack On-Chain Invoicing Platform — Technical Design Document**
*Version 1.0 | Dev3Pack Hackathon | May 2026*

---

## 1. Architecture Overview

Misthos is built on a four-layer architecture: an on-chain Solana program at the core, a Next.js web application layer, an external integrations layer (LI.FI, ElevenLabs, Coinflow, x402), and an AI/agentic layer powered by Claude. These layers communicate through well-defined interfaces and are designed to be independently deployable and testable.

### 1.1 Layer Summary

| Layer | Name | Technology | Responsibility |
|-------|------|-----------|----------------|
| Layer 1 | On-Chain Program | Rust + Anchor | Invoice lifecycle, escrow, payment records, x402 |
| Layer 2 | Web Application | Next.js 14 + TypeScript | Creator dashboard, payer UX, API routes |
| Layer 3 | External Integrations | LI.FI, Coinflow, ElevenLabs, Resend | Cross-chain, fiat, voice, email |
| Layer 4 | AI / Agentic | Claude API + ElevenLabs | Invoice drafting, reminders, voice I/O |

---

## 2. On-Chain Program Architecture (Layer 1)

### 2.1 Program Overview

The Misthos Anchor program is deployed on Solana and manages all invoice state. It is the single source of truth for every invoice — no off-chain database is authoritative for invoice status or payment records.

---

### 2.2 Account Structure

#### InvoiceAccount
**PDA seed:** `[b"invoice", creator_pubkey.as_ref(), invoice_id.as_ref()]`

```rust
pub struct InvoiceAccount {
    pub creator: Pubkey,           // Invoice creator wallet
    pub payer: Pubkey,             // Designated payer wallet (or default)
    pub amount: u64,               // Amount in token base units
    pub token_mint: Pubkey,        // SPL token mint (USDC, SOL wrapped, etc.)
    pub due_date: i64,             // Unix timestamp
    pub status: InvoiceStatus,     // Current state machine status
    pub invoice_id: String,        // Unique identifier (UUID)
    pub metadata_hash: [u8; 32],   // SHA-256 hash of off-chain metadata
    pub created_at: i64,           // Creation timestamp
    pub paid_at: Option<i64>,      // Payment timestamp
    pub bump: u8,                  // PDA bump seed
}
```

#### EscrowVault
**PDA seed:** `[b"escrow", invoice_pubkey.as_ref()]`

This is an SPL associated token account controlled by the program. Funds held here are only releasable by program logic; no individual has authority to withdraw.

#### PaymentRecord
**PDA seed:** `[b"payment", invoice_pubkey.as_ref()]`

Immutable on-chain log of payment details: amount, token, payer, timestamp, and source (wallet/LI.FI/x402/card).

---

### 2.3 Status State Machine

```
Draft → Sent → Viewed → Paid → Settled
                              ↘ Disputed → Refunded
                                         ↘ Settled
```

| Status | Trigger | Next States | On-Chain Action |
|--------|---------|-------------|-----------------|
| Draft | `create_invoice` called | Sent | InvoiceAccount created |
| Sent | Creator sends email link | Viewed, Paid | Off-chain event |
| Viewed | Payer opens invoice link | Paid | Off-chain event |
| Paid | `pay_invoice` executed | Settled, Disputed | Funds locked in EscrowVault |
| Settled | `release_escrow` executed | — | Funds transferred to creator |
| Disputed | `dispute_invoice` executed | Refunded, Settled | Escrow frozen |
| Refunded | `refund_invoice` executed | — | Funds returned to payer |

---

### 2.4 Program Instructions

#### `create_invoice`
**Accounts:** creator (signer), invoice_account (init), escrow_vault (init), system_program, token_program

**Validates:** amount > 0, due_date > now, payer ≠ creator

#### `pay_invoice`
**Accounts:** payer (signer), invoice_account (mut), payer_token_account, escrow_vault (mut), token_program

**Validates:** status == Sent or Viewed, signer matches payer pubkey, amount matches

#### `release_escrow`
**Accounts:** creator (signer), invoice_account (mut), escrow_vault (mut), creator_token_account, token_program

**Validates:** status == Paid, signer matches creator pubkey

#### `pay_x402`
Custom instruction that accepts x402 payment header data, validates the payment signature, and routes to the same escrow logic as `pay_invoice`. Enables HTTP-native payment links.

#### `dispute_invoice`
Either party can call. Freezes the escrow vault. Sets status to Disputed. Requires manual resolution or future DAO arbitration.

#### `refund_invoice`
Returns escrowed funds to payer. Sets status to Refunded. In hackathon build: callable by creator or a designated authority key.

---

## 3. Web Application Architecture (Layer 2)

### 3.1 Application Structure

The Next.js 14 app uses the App Router with server and client components. Wallet-connected operations are client-side. API routes handle server-side logic (email, PDF, AI).

```
misthos/
├── app/
│   ├── (dashboard)/          # Creator-only routes (wallet required)
│   │   ├── page.tsx           # Dashboard home — invoice list + analytics
│   │   ├── invoice/new/       # Create invoice form + AI agent
│   │   └── invoice/[id]/      # Single invoice detail + management
│   ├── pay/[invoiceId]/       # Payer experience — public, no wallet needed
│   └── api/
│       ├── invoice/           # send, remind, proof endpoints
│       ├── ai/draft/          # Claude invoice drafting endpoint
│       └── voice/transcribe/  # ElevenLabs STT endpoint
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── invoice/               # Invoice-specific components
│   └── payment/               # Payment flow components (LI.FI, card, wallet)
├── lib/
│   ├── solana/                # web3.js helpers, program client
│   ├── anchor/                # Anchor IDL + program types
│   └── utils/                 # Shared utilities
└── programs/misthos/          # Anchor Rust program
```

---

### 3.2 Creator Dashboard Flow

1. User connects wallet via Solana Wallet Adapter (Phantom/Backpack/Solflare)
2. Dashboard reads all `InvoiceAccount` PDAs owned by the connected wallet via `getProgramAccounts`
3. Invoice creation: form data → Claude AI draft (optional) or voice input (ElevenLabs STT)
4. On submit: metadata stored (hash), `create_invoice` instruction sent to program
5. Confirmation: tx hash displayed, invoice account verified on-chain, email sent via `/api/invoice/send`
6. Dashboard updates in real-time by polling RPC or subscribing to account change events

---

### 3.3 Payer Flow

1. Payer receives email with link: `/pay/[invoiceId]`
2. Page fetches invoice data from on-chain program (public read, no wallet needed)
3. Payer chooses payment method:

| Method | Flow |
|--------|------|
| **Wallet** | Standard SPL token transfer via wallet adapter |
| **LI.FI Cross-Chain** | Widget renders; payer selects source chain + token; LI.FI routes to Solana escrow |
| **Fiat Card** | Coinflow embedded checkout; onramp converts to USDC; funds go to escrow |
| **x402 Link** | `pay_x402` instruction called via signed HTTP request |

4. On confirmation: ElevenLabs TTS plays audio confirmation; PDF receipt available

---

## 4. External Integrations (Layer 3)

### 4.1 LI.FI Integration

LI.FI provides cross-chain routing enabling payers on any EVM chain (or Solana) to pay invoices denominated in any token. The creator always receives their preferred token on Solana.

- **SDK:** `@lifi/sdk` + `@lifi/widget` embedded in payer payment page
- **Flow:** payer selects source (chain + token) → LI.FI calculates route → payer approves → LI.FI bridges → escrow receives USDC/SOL on Solana
- **LI.FI MCP Server:** used by AI agent to query bridge transaction status
- Covers 60+ chains, 20+ bridges, all major Solana DEX aggregation

---

### 4.2 Fiat Card Payment (Coinflow)

Coinflow provides a card-to-crypto checkout that requires no crypto wallet on the payer's side.

- **Integration:** Coinflow's embedded React checkout component
- **Flow:** payer enters card → Coinflow processes → converts USD to USDC → transfers to invoice escrow PDA on Solana
- Coinflow handles KYC/AML, PCI compliance, and fiat-to-crypto conversion
- **Fallback:** Sphere Pay if Coinflow sandbox access is unavailable

---

### 4.3 x402 Protocol

x402 is an HTTP-native payment standard for Solana that enables one-click payment links.

- A unique x402 payment URL is generated per invoice: `misthos.app/pay/x402/[invoiceId]`
- The URL encodes: Solana program address, escrow vault, expected amount, token mint
- Compatible wallets detect the x402 header and prompt the user to pay without visiting the full invoice page
- Qualifies Misthos for the **$500 x402 bonus track**

---

### 4.4 ElevenLabs Voice

| Integration | API | Use Case |
|-------------|-----|---------|
| Speech-to-Text | ElevenLabs Transcribe API | User dictates invoice → text → Claude drafts form |
| Text-to-Speech | ElevenLabs TTS API | Payment confirmation, invoice sent, overdue alerts |
| Conversational Agent | ElevenLabs Agents Platform | Full voice-driven invoice creation workflow (optional) |

**Integration path documented in README for ElevenLabs track qualification.**

---

### 4.5 Email (Resend)

| Template | Trigger |
|----------|---------|
| Invoice Notification | Creator sends invoice — branded email with amount, due date, payment link |
| Payment Reminder | AI agent detects overdue invoice — automated reminder |
| Payment Confirmation | Escrow vault receives funds — notification to creator |
| Proof Receipt | Creator requests — email with PDF attachment containing tx hash |

---

## 5. AI & Agentic Layer (Layer 4)

### 5.1 Invoice Drafting Agent

The drafting agent accepts a plain-English description of work and returns a fully structured invoice object, powered by the Claude API.

**Example:**
```
Input:  "Invoice David for 40 hours of backend API dev at $120/hr, due in 14 days"

Output: {
  client: "David",
  service: "Backend API Development",
  hours: 40,
  rate: 120,
  total: 4800,
  currency: "USDC",
  due_date: "+14days",
  line_items: [...]
}
```

This output pre-populates the invoice creation form. The user reviews and edits before submitting on-chain.

---

### 5.2 Payment Reminder Agent

A scheduled process (Vercel cron job) monitors on-chain invoice accounts:

1. Reads all `InvoiceAccount` PDAs with status != Paid/Settled
2. Compares `due_date` to current timestamp
3. If overdue → calls `/api/invoice/remind` → sends branded reminder email
4. Logs the reminder event off-chain to prevent duplicate sends

---

### 5.3 Voice Input Pipeline

```
1. User clicks mic icon on invoice creation form
2. Browser captures audio via MediaRecorder API
3. Audio blob POSTed to /api/voice/transcribe
4. Server sends audio to ElevenLabs STT API
5. ElevenLabs returns text transcript
6. Transcript POSTed to /api/ai/draft (Claude agent)
7. Claude returns structured invoice JSON
8. Frontend populates form fields from JSON
```

---

## 6. Data Architecture

### 6.1 On-Chain Data (Source of Truth)

Invoice status, payment records, and escrow state all live on-chain. This data is immutable, public, and verifiable by anyone with a Solana Explorer link.

### 6.2 Off-Chain Data

| Data Type | Storage | Notes |
|-----------|---------|-------|
| Invoice metadata (names, descriptions) | Hashed — SHA-256 stored on-chain | Tamper-proof verification |
| Email delivery logs | Resend dashboard | Not required for core function |
| Voice transcription sessions | Ephemeral | Not persisted |
| AI draft history | Ephemeral per session | Not persisted |

### 6.3 PDF Proof Receipt Contents

- Invoice ID and on-chain program address
- Creator wallet address and payer wallet address
- Invoice amount, token, and payment date
- Solana transaction signature (tx hash) with Explorer link
- Block time and slot number of payment transaction
- Escrow vault PDA address
- QR code linking to Solana Explorer for the invoice program account

---

## 7. Security Architecture

### 7.1 On-Chain Security

- Escrow vault is a PDA — no private key exists; only program logic can release funds
- Access control enforced via Anchor's account constraints: `#[account(has_one = creator)]`
- No upgrade authority after mainnet launch — immutable program for trust
- All amounts validated against u64 overflow and minimum amount constraints

### 7.2 Application Security

- All API routes validate request origin and require valid Solana signatures for authenticated actions
- ElevenLabs and Claude API keys stored in server-side env vars only — never exposed to client
- Coinflow integration handles PCI compliance — Misthos never touches raw card data
- CORS policies restrict API access to Misthos domains only

### 7.3 User Data

- Misthos does not store sensitive personal data — payer email used only for invoice delivery
- On-chain wallet addresses are public by nature of blockchain transparency
- Invoice metadata hash verification allows users to prove invoice contents without trusting Misthos

---

## 8. Deployment Architecture

| Component | Platform | Environment | Notes |
|-----------|----------|-------------|-------|
| Next.js Frontend | Vercel | Preview + Production | Auto-deploy from GitHub main branch |
| Anchor Program | Solana Devnet | Development | For hackathon demo and testing |
| Anchor Program | Solana Mainnet | Production | After hackathon; immutable deploy |
| Cron Agent | Vercel Cron Jobs | Production | Overdue invoice reminder scheduler |
| Email Service | Resend | Production | Transactional email delivery |

---

## 9. Environment Variables

```env
# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<deployed_program_id>
PROGRAM_DEPLOYER_KEYPAIR=<base58_private_key>

# LI.FI
NEXT_PUBLIC_LIFI_INTEGRATOR=misthos

# Coinflow
NEXT_PUBLIC_COINFLOW_ENV=sandbox
COINFLOW_API_KEY=<key>

# ElevenLabs
ELEVENLABS_API_KEY=<key>
ELEVENLABS_VOICE_ID=<voice_id>

# Claude / Anthropic
ANTHROPIC_API_KEY=<key>

# Resend
RESEND_API_KEY=<key>
RESEND_FROM_EMAIL=invoices@misthos.app

# App
NEXT_PUBLIC_APP_URL=https://misthos.vercel.app
```

---

## 10. Key Dependencies

```json
{
  "dependencies": {
    "@solana/web3.js": "^2.0.0",
    "@solana/spl-token": "^0.4.0",
    "@solana/wallet-adapter-react": "^0.15.0",
    "@solana/wallet-adapter-phantom": "^0.9.0",
    "@coral-xyz/anchor": "^0.30.0",
    "@lifi/sdk": "^3.0.0",
    "@lifi/widget": "^3.0.0",
    "@anthropic-ai/sdk": "^0.27.0",
    "resend": "^3.0.0",
    "next": "14.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

*MISTHOS — Programmable invoicing infrastructure on Solana.*
