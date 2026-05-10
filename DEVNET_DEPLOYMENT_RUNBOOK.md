# MISTHOS Devnet Deployment Runbook

**Last Updated:** May 10, 2026  
**Network:** Solana Devnet  
**Program ID:** `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht`

---

## **PRE-DEMO SETUP (Do This First)**

### 1. Fund Your Devnet Wallet

```bash
# Request airdrop in Solana CLI
solana config set --url devnet
solana airdrop 2 <your-wallet-address>
```

Or use faucet: https://faucet.solana.com/

**Need:** ~0.05 SOL minimum for 5 test transactions (create + 4 test payments)

### 2. Verify Wallet Adapters

- Phantom: https://phantom.app
- Solflare: https://solflare.com

Both support Devnet. **Recommended:** Phantom for live demo (most familiar to judges).

---

## **PHASE 3A: START DEV SERVER**

```bash
# From repo root
yarn dev
```

Expected output:

```
  VITE v5.4.21  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Open browser: `http://localhost:5173/`

---

## **PHASE 3B: CREATE & SHARE INVOICE LINK**

### Step 1: Connect Wallet

- Click **"Connect Wallet"** (top-right navbar)
- Select Phantom or Solflare
- Sign on Devnet
- Toggle to Dashboard

### Step 2: Create Invoice

1. Click **"New Invoice"** (or navig ate to `/invoice/new`)
2. Fill form:
   - **Client Name:** "Test Client"
   - **Amount:** 0.01 SOL
   - **Description:** "Demo Invoice"
   - **Due Date:** tomorrow
3. Click **"Create & Send"**
   - AI draft will attempt if Claude key available (falls back if not)
   - Voice input will show mock transcript
4. Wait for on-chain confirmation
   - **Success Toast:** Shows transaction signature + explorer link
   - **Copy:** Click explorer link to verify on-chain (optional)

### Step 3: Generate Shareable Link

After success, you'll see invoice ID in URL/toast. Share this link format:

```
http://localhost:5173/pay/{invoiceId}
```

**Example:**

```
http://localhost:5173/pay/11111111111111111111111111111111
```

---

## **PHASE 3C: TEST PAYMENT (Recipient Path)**

### Option A: Test in Same Browser Tab

1. Copy invoice ID from dashboard
2. Navigate to: `http://localhost:5173/pay/{invoiceId}`
3. Invoice loads with details
4. Click **"Pay with Wallet"**
5. Select payment amount (usually full invoice amount pre-filled)
6. Sign transaction with Phantom/Solflare
7. Wait for confirmation
   - **Success Toast:** Shows tx signature + explorer link
   - **Verify:** Click link to see tx on Solana Explorer (Devnet)

### Option B: Test in Separate Browser / Incognito (Simulates Real Client)

1. Open new incognito window
2. Paste share link: `http://localhost:5173/pay/{invoiceId}`
3. **Wallet NOT connected yet** (like real client)
4. Click "Connect Wallet"
5. Sign in as different wallet (or same, doesn't matter for demo)
6. Pay invoice
7. Verify tx on Devnet explorer

---

## **PHASE 3D: VERIFY ON-CHAIN PROOF**

### Using Solana Explorer (Devnet)

1. After successful payment, toast shows tx signature (hash)
2. Click the **blue explorer link** in toast
3. Lands on: `https://explorer.solana.com/tx/{signature}?cluster=devnet`
4. Verify:
   - ✅ Status: "Success"
   - ✅ Program: `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht` (MISTHOS)
   - ✅ Instructions: Shows create_invoice, pay_invoice, or release_escrow
   - ✅ Accounts: Invoice account, creator, payer, escrow vault

### Using Solana CLI

```bash
solana config set --url devnet
solana transaction {tx-signature}
solana account {invoice-account-address}
```

---

## **PHASE 3E: TROUBLESHOOTING**

| Problem                                    | Solution                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| Wallet won't connect                       | Ensure Devnet selected in Phantom/Solflare; refresh page                             |
| "Insufficient balance"                     | Request airdrop: `solana airdrop 2 <wallet>`                                         |
| Transaction fails with "account not found" | Program not deployed; use program ID: `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht` |
| API calls fail (email/voice/AI)            | Expected — backend not served by Vite; fallback UX handles this                      |
| Invoice link returns 404                   | Use correct invoiceId; verify router at `/pay/:invoiceId`                            |

---

## **PHASE 4: DEMO SCRIPT (1-2 Minutes)**

### **Hook (10 seconds)**

_"MISTHOS solves invoice fragmentation on Solana. Creators invoice in seconds, clients pay with one signature."_

### **Demo Flow (60 seconds)**

1. **Create** (20s)
   - "I'll draft an invoice for a design service"
   - Click New Invoice, fill $0.01 SOL
   - Hit Create → show tx on explorer
   - "Recorded on-chain instantly"

2. **Share** (10s)
   - "Copy the shareable link"
   - Show: `http://localhost:5173/pay/{id}`
   - "Send to anyone—no account needed"

3. **Pay** (20s)
   - Open link in new tab
   - "They see the invoice, click Pay"
   - Sign with Phantom
   - "Done in one signature—no email, no API"
   - Show tx confirmation + explorer

4. **Proof** (10s)
   - Click explorer link
   - "All payments are on-chain and transparent"
   - Show escrow account + release flow (if time)

### **Close (10 seconds)**

_"Core workflow is live today. Next sprint: cross-chain swaps, fiat card checkout, and recurring payments."_

---

## **DEPLOYMENT CHECKLIST**

**Before Submitting:**

- [ ] Wallet funded with ≥0.05 SOL (Devnet)
- [ ] `yarn dev` starts without errors
- [ ] Create invoice works (tx on explorer)
- [ ] Share link works (fresh browser tab)
- [ ] Pay invoice works (tx on explorer)
- [ ] Explorer links clickable and resolve
- [ ] Demo script timed to 1–2 minutes

---

## **KEY URLS**

- **App Local:** `http://localhost:5173/`
- **Devnet Explorer:** `https://explorer.solana.com/?cluster=devnet`
- **Program:** `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht` (searchable on explorer)
- **Airdrop Faucet:** `https://faucet.solana.com/`

---

## **NEXT SPRINT (Post-Hackathon)**

- [ ] Real LI.FI cross-chain execution
- [ ] Coinflow fiat card processing
- [ ] x402 protocol integration
- [ ] Production deployment (Vercel + Helius/QuickNode RPC)
- [ ] Reminder cron agent
- [ ] Dispute & refund UI

---

**You're ready to demo!** Run `yarn dev` and follow Phase 3B–3D above.
