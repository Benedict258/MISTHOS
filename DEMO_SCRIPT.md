# MISTHOS Demo Script & Checklist

**Last Updated:** May 10, 2026  
**Duration:** 1–2 minutes  
**Audience:** Hackathon judges

---

## **PHASE 4A: PRE-DEMO CHECKLIST (5 minutes)**

### Environment Setup
- [ ] Wallet funded: ≥0.05 SOL on Devnet (use faucet: https://faucet.solana.com)
- [ ] Phantom or Solflare installed and configured for Devnet
- [ ] Terminal ready for `yarn dev` command
- [ ] Browser open and cleared cache (Ctrl+Shift+Delete)
- [ ] Spare tab open: https://explorer.solana.com/?cluster=devnet

### Code Ready
- [ ] No uncommitted changes with errors
- [ ] `yarn dev` runs without warnings
- [ ] Dashboard loads without console errors (check DevTools: F12)
- [ ] All routes work: `/`, `/dashboard`, `/invoice/new`, `/invoice/:id`, `/pay/:id`

### Credentials (Optional but Recommended)
- [ ] Have demo talking points ready (see script below)
- [ ] Have 1–2 backup invoices pre-drafted (copy-paste in /invoice/new)
- [ ] Pre-calculated amounts for demo (0.01 SOL, 0.02 SOL) to avoid math errors

---

## **PHASE 4B: LIVE DEMO SCRIPT**

### **[0:00–0:10] HOOK & PROBLEM STATEMENT**

**Say:** 
> "MISTHOS solves invoice fragmentation in crypto. Today, invoices are emails or PDFs—no transparency, no proof. We bring every invoice on-chain: instant, verifiable, final settlement in one signature."

**Show:** App landing page (http://localhost:5173/)

**Action:**
- Gesture to the features listed: "Create in seconds. Share anywhere. Pay with one click."
- Emphasize: "Every transaction is recorded on Solana."

---

### **[0:10–0:30] DEMO: CREATE INVOICE**

**Say:**
> "Let me create a real invoice right now and show you the full flow."

**Actions:**
1. Click **"Dashboard"** or **"New Invoice"** button
2. Connect wallet:
   - Click **"Connect Wallet"** (top-right)
   - Select **Phantom** (or Solflare)
   - Approve connection in wallet popup
   - Wait for confirmation toast
3. Navigate to **Create Invoice** (`/invoice/new`)
4. **Fill form:**
   - **Client Name:** "Demo Client"
   - **Client Email:** "client@example.com"
   - **Description:** "Smart Contract Audit"
   - **Amount:** 0.01 SOL
   - **Due Date:** Click calendar, pick tomorrow
5. Click **"Create & Send"**
   - **Pause** for Devnet confirmation (~8 seconds)
   - **Success toast** appears with **TX signature + blue explorer link**
   - **Say:** "Invoice just went on-chain. Let me show you the proof."

**Timing Note:** Devnet typically confirms in 4–12 seconds depending on network. Build in the pause.

---

### **[0:30–0:45] PROOF & TRANSPARENCY**

**Say:**
> "Here's where MISTHOS is different. Every invoice is a contract. Every transaction is verifiable."

**Actions:**
1. **Click the blue explorer link** in the toast (or manually click a link in the On-Chain Data section)
2. **Wait** for Solana Explorer to load (it opens in new tab)
3. **Show on explorer:**
   - Transaction hash/signature at the top
   - Status: **"✓ Success"** (green badge)
   - Program: **`DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht`** (MISTHOS program)
   - Instructions: Click "Show Details" to expand and show the on-chain instruction (e.g., `create_invoice`)
4. **Say:** "This isn't a database—it's blockchain. No backups, no undo, no fudging numbers."

**Alternative if explorer is slow:**
- Pre-load a sample tx in another tab
- Reference it: "Here's what a real MISTHOS transaction looks like on Devnet"

---

### **[0:45–1:00] SHARE & PAY**

**Say:**
> "Now, any client can pay this invoice in seconds. Let me generate a shareable link."

**Actions:**
1. Go back to the **Invoice Detail** page (`/invoice/{id}`)
   - Show the **Payment Link** section (bottom of page)
   - Copy: `localhost:5173/pay/{invoiceId}`
2. **Say:** "If I send this to a client, they click the link, connect their wallet, and pay—all in one transaction."
3. **[Optional—if time allows]:**
   - Open link in new incognito tab to simulate a real client
   - Show they can pay without being logged into creator account
   - Click "Pay with Wallet"
   - Sign transaction
   - **Point to explorer link:** "Payment confirmed on-chain."

**Alternative—Time Saver:**
- If link-in-incognito takes too long, use a pre-recorded video clip (5 seconds) or describe the flow verbally

---

### **[1:00–1:15] FEATURE ROADMAP (Optional Close)**

**Say:**
> "This is day one. The roadmap includes: cross-chain payments via LI.FI, fiat card checkout, recurring invoices, and an AI payment reminder agent. All orchestrated on-chain."

**Show:** Click through the **Payment Methods** section in `/pay/{id}` to highlight the buttons (even if stubbed for now—mention they're "coming next sprint").

---

### **[1:15–2:00] Q&A / JUDGE NOTES**

**Key Talking Points (if asked):**

| Q | A |
|---|---|
| **How does on-chain invoicing save money?** | No payment processor fees; escrow is built-in via SPL token vault; settlement is instant. |
| **What if payment gets disputed?** | On-chain record is immutable proof. Disputes are adjudicated by a multisig or community (future feature). |
| **Why Solana, not Ethereum?** | Sub-second finality, $0.00001 transactions, and better user experience for micro-invoices. |
| **How do you handle recurring invoices?** | Payment instruction can be parameterized; next sprint integrates with Solana cron worker. |
| **What's the business model?** | Take 1–2% on settlement or charge a monthly creator subscription. |
| **Can this scale to enterprises?** | Yes—we're building batching, escrow pools, and multi-sig approval workflows. |

---

## **PHASE 4C: GOTCHAS & RECOVERY (In Case of Issues)**

| Issue | Recovery |
|-------|----------|
| **Wallet won't connect** | Switch Phantom/Solflare network to **Devnet**; refresh page; clear browser cache. |
| **Devnet is slow (no confirmation)** | Wait another 10 seconds; show the pending tx hash in wallet history; say: "Devnet network load." |
| **"Account not found" error** | Confirm program ID is correct: `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht`. If differs, update in code. |
| **API calls fail (email/voice/AI)** | Expected—these endpoints aren't served by dev server. Fallback UX handles it; say: "Backend APIs are deployed separately." |
| **Explorer link is slow** | Pre-open a sample Devnet transaction in another tab; reference it instead. |
| **Out of Devnet SOL** | Say: "Just hit the faucet—(https://faucet.solana.com)—instant top-up." Ask judges to wait 30 seconds. |
| **WiFi drops** | Have demo video ready (5–10 second clip of working flow). |

---

## **PHASE 4D: TIMING CHEAT SHEET**

| Milestone | Time | Notes |
|-----------|------|-------|
| Start Script | 0:00 | Begin with problem statement |
| Connect Wallet | 0:10 | May add 5–10 sec if wallet slow |
| Fill & Submit | 0:20 | Devnet confirmation adds 8–12 sec |
| Show Explorer | 0:35 | Explorer load 5–10 sec |
| Share Link | 0:50 | Copy and show; skip full pay demo if tight |
| Q&A Open | 1:15 | Ready for judge questions |
| **Total** | **~2:00** | Comfortable pace |

---

## **PHASE 4E: BACKUP PLAN (If Live Demo Fails)**

1. **Pre-recorded 1-minute video** (silent with subtitles):
   - Create invoice (10 sec)
   - Show tx on explorer (15 sec)
   - Share link and pay (20 sec)
   - Proof on explorer (15 sec)

2. **Slides with screenshots:**
   - Current app state
   - Sample txs from explorer
   - Architecture diagram (from docs)

3. **Live code walkthrough** (if web app won't load):
   - Open `src/lib/misthos.ts`
   - Show core SDK methods: `createInvoice`, `payInvoice`, `releaseEscrow`
   - Explain anchor.idl integration
   - Point to `/src/pages/CreateInvoice` and `/src/pages/PayInvoice` for UX flows

---

## **SUBMISSION CHECKLIST (Before Hitting Submit)**

### Repository
- [ ] README.md updated with:
  - What MISTHOS does (1 paragraph)
  - Program ID: `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht`
  - Setup instructions: `yarn install && yarn dev`
  - Devnet requirements (SOL, wallet, faucet link)
  - Feature status (core vs. stubbed)
- [ ] All `.ts`/`.tsx` files compile without errors (run `yarn build`)
- [ ] `yarn dev` starts without warnings
- [ ] `.gitignore` is in place (no secrets, node_modules, etc.)

### Demo Video (Optional but recommended)
- [ ] 1–2 minute walkthrough of create → pay → proof flow
- [ ] Clear audio explaining each step
- [ ] No background noise or glitches
- [ ] Uploaded to YouTube (unlisted) and link in README

### Documentation
- [ ] DEVNET_DEPLOYMENT_RUNBOOK.md created (this file)
- [ ] Architecture overview in docs/ folder
- [ ] Contract addresses in README
- [ ] API endpoints listed (even if stubbed)

### Code Quality
- [ ] No console.error logs left in code
- [ ] No hardcoded API keys (use env vars)
- [ ] Wallet connection guards in place
- [ ] Error messages are user-friendly
- [ ] All routes tested locally

---

## **GO LIVE!**

✅ **You're ready.** Follow the script above, emphasize the on-chain proof, and let the explorer links do the heavy lifting.

**Questions? See:**  
- DEVNET_DEPLOYMENT_RUNBOOK.md (this file)
- Misthos_Architecture.md (technical deep-dive)
- src/lib/misthos.ts (SDK reference)

---

**Good luck with your demo! 🚀**
