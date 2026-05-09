# MISTHOS Mainnet Deployment Guide

_Last Updated: May 2026_

---

## ✅ Pre-Deployment Checklist

### Program Status

- [x] Anchor program compiles successfully
- [x] All 19 tests passing locally
- [x] Anchor CLI version matches dependencies (0.31.1)
- [x] Program deployed and tested on Devnet
- [ ] **Security audit completed** (TODO)
- [ ] **Frontend integration tested on devnet** (TODO)
- [ ] **Mainnet-Beta staging** (TODO)

### Environment Setup

- [ ] Solana CLI installed (`solana --version`)
- [ ] Rust installed and updated (`rustup update`)
- [ ] Anchor CLI installed (`anchor --version` ≥ 0.31.1)
- [ ] Devnet SOL airdrop available
- [ ] Mainnet keypair secured (encrypted, backed up)

---

## 🔒 Security Audit Pre-Flight

Before deploying to mainnet, run a comprehensive security review:

```bash
# 1. Check for common vulnerabilities
cd contracts
cargo clippy --all-targets --all-features -- -D warnings

# 2. Run security checks
cargo audit

# 3. Review account derivation and PDAs
# Verify all PDAs use consistent seeds:
# - invoice: [b"invoice", creator, invoice_id]
# - escrow_vault: [b"vault", invoice]
# - dispute_escrow: [b"dispute", invoice]
```

### Key Security Areas to Audit

1. **Account Validation**: Ensure all mutable accounts are writable and verified
2. **PDA Correctness**: Seeds must be deterministic and collision-proof
3. **Authority Checks**: Only authorized parties can modify state
4. **Arithmetic Overflow**: Check amount calculations (especially in escrow)
5. **Reentrancy**: Verify no cross-instruction exploits
6. **Token Transfers**: Validate SPL token mint and decimals

---

## 📋 Step 1: Prepare New Keypair for Mainnet

```bash
# Generate a NEW keypair for mainnet deployment (not devnet)
solana-keygen new --outfile ~/mainnet-deployer.json

# Set it as default (temporarily)
solana config set --keypair ~/mainnet-deployer.json
solana config set --url https://api.mainnet-beta.solana.com

# Verify (should show mainnet endpoint and new keypair)
solana config get
```

**⚠️ IMPORTANT**:

- Back up `~/mainnet-deployer.json` to encrypted storage
- Keep filename descriptive: `misthos-mainnet-deployer.json`
- Never commit keypair to version control
- Test with small amount of SOL first

---

## 🚀 Step 2: Deploy Program to Mainnet-Beta (Staging)

Mainnet-Beta is a staging environment that mimics mainnet but allows free airdrops.

```bash
# 1. Set cluster to mainnet-beta
solana config set --url https://api.mainnet-beta.solana.com

# 2. Fund deployer account (request airdrop or transfer SOL)
solana airdrop 5  # 5 SOL for gas

# 3. Build optimized program
cd contracts
anchor build --release

# 4. Deploy to mainnet-beta
anchor deploy --provider.cluster mainnet-beta

# 5. Copy the new program ID from output
# Example output: "Program deployed successfully! Program ID: <NEW_ID>"
```

**Store the new Program ID:**

```bash
# Update Anchor.toml [programs.mainnet-beta] section
# Update environment variables in frontend
# Update IDL in src/idl/workspace.json
```

---

## 💾 Step 3: Update Frontend & IDL for Mainnet

### 3a. Update Program ID in Frontend

```typescript
// src/lib/constants.ts
export const PROGRAM_ID = new PublicKey(
  "4NEW_MAINNET_PROGRAM_ID_HERE", // from step 2
);

export const NETWORK = "mainnet-beta"; // or "mainnet" for production

export const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
// Later: "https://api.mainnet-beta.solana.com" for production mainnet
```

### 3b. Regenerate IDL from Program

```bash
# Anchor automatically updates IDL, but ensure frontend has latest
cp contracts/target/idl/workspace.json src/idl/workspace.json

# Verify IDL structure
cat src/idl/workspace.json | jq '.address'  # Should match new Program ID
```

### 3c. Test Frontend Wallet Connection on Mainnet-Beta

```bash
# Update Solana network in Phantom wallet to "Mainnet Beta"
# Click "Switch Network" in your wallet

# In frontend, verify:
# 1. Wallet connects to mainnet-beta
# 2. Create Invoice instruction executes
# 3. Invoice account appears on chain
# 4. Dashboard reflects new invoice
```

---

## 🔍 Step 4: Verify Mainnet-Beta Deployment

```bash
# 1. Check program exists
solana program show 4NEW_MAINNET_PROGRAM_ID_HERE

# 2. Verify program authority
solana program show --programs | grep 4NEW_MAINNET_PROGRAM_ID_HERE

# 3. Query recent instructions (should see create_invoice calls)
solana logs 4NEW_MAINNET_PROGRAM_ID_HERE --until-slot <LATEST_SLOT>

# 4. Test specific transaction
# Create invoice via frontend, then:
solana confirm <TX_HASH>  # Should show: "Confirmed"
```

---

## 🌐 Step 5: Deploy to Production Mainnet

**After successful mainnet-beta testing:**

```bash
# 1. Update Solana config to production mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. Ensure you have sufficient SOL (≈5 SOL minimum)
solana balance

# 3. Deploy to production
anchor deploy --provider.cluster mainnet

# 4. Update constants again
# src/lib/constants.ts NETWORK = "mainnet"
# src/lib/constants.ts RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"

# 5. Verify deployment
solana program show <PRODUCTION_PROGRAM_ID>
```

**Store Final Production Values:**

```typescript
// .env.production
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_PROGRAM_ID=<PRODUCTION_ID>
NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
```

---

## 📊 Step 6: Monitor Mainnet Deployment

### Health Checks

```bash
# 1. Program status
solana program show <PROGRAM_ID>

# 2. Recent errors in logs
solana logs <PROGRAM_ID> | grep -i "error"

# 3. Check for failed transactions
solana program show <PROGRAM_ID> --lamports  # Verify program rent is paid

# 4. Monitor instruction usage
# (Use SolanaFM or Solscan explorer)
```

### Real-Time Monitoring

- **Solscan**: https://solscan.io/account/<PROGRAM_ID>
- **SolanaFM**: https://solana.fm/address/<PROGRAM_ID>
- **Anchor Logs**: Set up custom logging in program

---

## 🔄 Step 7: CI/CD Pipeline (Optional but Recommended)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Mainnet
on:
  workflow_dispatch: # Manual trigger only

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Set up Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install Solana CLI
        run: sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

      - name: Build & Deploy
        env:
          SOLANA_KEYPAIR: ${{ secrets.MAINNET_DEPLOYER }}
        run: |
          cd contracts
          anchor deploy --provider.cluster mainnet
```

---

## 🚨 Rollback Plan

If issues occur post-deployment:

1. **Program Bug Found**:
   - Deploy new version with bug fix
   - Old invoices reference old program ID (no data loss)
   - Users migrate to new program gradually

2. **Security Issue**:
   - Immediately notify users via Discord/Twitter
   - Deploy patched version
   - Provide migration instructions

3. **Cannot Revert Program**:
   - Solana programs are immutable after deployment
   - Next version must be new Program ID
   - Use program upgrade authority if configured

---

## 📱 Frontend Mainnet Integration Checklist

- [ ] RPC endpoint points to mainnet
- [ ] Program ID updated
- [ ] Wallet connects to mainnet by default
- [ ] All transactions target mainnet program
- [ ] Error messages are production-ready
- [ ] Analytics track mainnet transactions
- [ ] Email notifications configured for mainnet
- [ ] PDF receipts reference mainnet transactions
- [ ] Rate limiting / throttling in place
- [ ] Gas estimation updated for mainnet pricing

---

## 🎯 Launch Day Checklist

**24 Hours Before:**

- [ ] All tests passing
- [ ] Frontend tested on mainnet-beta
- [ ] Deployer keypair secured
- [ ] Monitoring dashboards ready
- [ ] Communication channels ready (Discord, Twitter)

**Hour 0 (Deployment):**

- [ ] Set RPC to mainnet
- [ ] Deploy program
- [ ] Update environment variables
- [ ] Deploy frontend to Vercel
- [ ] Verify on-chain program ID
- [ ] Test wallet connection
- [ ] Create first testInvoice manually

**Post-Launch:**

- [ ] Monitor logs for errors
- [ ] Watch transaction success rate
- [ ] Check Solscan for program activity
- [ ] Notify community of deployment
- [ ] Track analytics for 24 hours

---

## 📞 Support & Troubleshooting

### Common Issues

| Issue                     | Solution                                   |
| ------------------------- | ------------------------------------------ |
| "Insufficient funds"      | Ensure deployer has ≥5 SOL                 |
| "Program not found"       | Check Program ID format, network selection |
| "Invalid signature"       | Keypair path incorrect or corrupted        |
| "Anchor version mismatch" | Run `anchor --version`, update if needed   |
| "Transaction timeout"     | Try alternative RPC, check network status  |

### Resources

- [Solana Docs: Program Deployment](https://docs.solana.com/cli/deploy-a-program)
- [Anchor Book: Deployment](https://book.anchor-lang.com/anchor_bpf/deployment.html)
- [Solana Status](https://status.solana.com/)

---

**Next**: Schedule deployment with full team, prepare communication, and execute checklist.
