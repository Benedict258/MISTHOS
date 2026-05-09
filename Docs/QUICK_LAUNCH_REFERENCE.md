# MISTHOS Mainnet Launch — Quick Reference Guide

_For Team Members: 10-minute briefing on deployment steps_

---

## 🎯 Mission: Go Mainnet with MISTHOS

**Status**: Program builds ✅ | Tests pass ✅ | Ready for deployment 🚀

---

## 📋 Quick Checklist Format

### Before Launch

- [ ] Security audit completed (see [SECURITY_AUDIT.md](./SECURITY_AUDIT.md))
- [ ] Frontend tested on devnet
- [ ] Mainnet keypair created and backed up
- [ ] 5 SOL allocated for gas
- [ ] Team notified of deployment time
- [ ] Monitoring dashboards open

### Deployment (45 minutes)

1. **Deploy to Mainnet-Beta** (staging) — 15 min
2. **Test all flows** on beta — 20 min
3. **Deploy to Mainnet** (production) — 10 min

### Post-Launch

- [ ] Monitor logs for 1 hour
- [ ] Verify first 3 invoices on Solscan
- [ ] Announce on social media
- [ ] Enable analytics/monitoring

---

## 🚀 Deployment Commands (Copy-Paste)

### Step 1: Setup

```bash
# Switch to mainnet-beta for staging
solana config set --url https://api.mainnet-beta.solana.com
solana config set --keypair ~/mainnet-deployer.json

# Fund account
solana airdrop 5  # mainnet-beta has free airdrops

# Verify
solana balance
solana config get
```

### Step 2: Build & Deploy to Mainnet-Beta

```bash
cd contracts
anchor build --release
anchor deploy --provider.cluster mainnet-beta

# ✅ Note the Program ID from output
# Example: "Program deployed to: 7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### Step 3: Update Constants

```typescript
// File: src/lib/constants.ts
export const PROGRAM_ID = new PublicKey("PASTE_NEW_PROGRAM_ID_HERE");
export const NETWORK = "mainnet-beta";
export const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
```

### Step 4: Test on Mainnet-Beta (UI + Wallet)

1. Open frontend in browser
2. Switch Phantom wallet to "Mainnet Beta"
3. Click "Create Invoice" → Pay your first test invoice
4. Verify on **Solscan**: https://solscan.io/account/<PROGRAM_ID>

### Step 5: Deploy to Production Mainnet

```bash
anchor deploy --provider.cluster mainnet

# ✅ Note the new Program ID (usually same, but verify)
```

### Step 6: Final Update

```typescript
// File: src/lib/constants.ts
export const NETWORK = "mainnet";
export const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"; // Mainnet RPC
export const PROGRAM_ID = new PublicKey("<MAINNET_PROGRAM_ID>");
```

### Step 7: Monitor (Run Continuously)

```bash
solana logs <PROGRAM_ID> --url mainnet

# Or visit: https://solscan.io/account/<PROGRAM_ID>
```

---

## ⚠️ Critical Gotchas

| Gotcha                        | Solution                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| **"Insufficient funds"**      | Ensure 5+ SOL in deployer wallet                            |
| **"Anchor version mismatch"** | Run `anchor --version` ≥ 0.31.1                             |
| **"Cannot find program"**     | Verify Program ID in constants, check network               |
| **"Wrong RPC endpoint"**      | Use `https://api.mainnet-beta.solana.com` (not `localhost`) |
| **"Wallet on wrong network"** | Switch Phantom to "Mainnet Beta" or "Mainnet"               |
| **"Old IDL data"**            | Clear browser cache, regenerate from contract               |

---

## 📱 Verification Steps

**After each deployment, verify**:

```bash
# 1. Program exists on-chain
solana program show <PROGRAM_ID> --url <NETWORK>

# 2. Program size (should be ~100-200 KB)
solana program show <PROGRAM_ID> --url <NETWORK> --output json | jq '.executable'

# 3. Recent transactions
solana confirm <TX_HASH>  # Should print: "Confirmed"

# 4. Create test invoice
# (Use frontend UI, then check):
solana account <INVOICE_ACCOUNT_ADDRESS> --url <NETWORK>
```

---

## 📊 Real-Time Monitoring URLs

Bookmark these:

- **Solscan**: https://solscan.io/account/<PROGRAM_ID>
- **SolanaFM**: https://solana.fm/address/<PROGRAM_ID>
- **Anchor IDL**: https://solscan.io/tx/<TX_HASH>

---

## 🔄 Rollback (If Needed)

If bug found:

1. **Fix code** in program
2. **Rebuild**: `anchor build --release`
3. **Redeploy**: `anchor deploy --provider.cluster mainnet`
4. **Update frontend** with new Program ID
5. (**Note**: Old invoices reference old program — no data loss)

---

## 📞 Emergency Contacts

- **Solana Status**: https://status.solana.com/
- **Anchor Issues**: https://github.com/coral-xyz/anchor/issues
- **Team Slack**: #misthos-launch

---

## ⏱️ Expected Timeline

| Task                      | Time   | Owner                 |
| ------------------------- | ------ | --------------------- |
| Security audit            | 30 min | Rust Dev              |
| Deploy to mainnet-beta    | 15 min | Rust Dev              |
| Test on beta (UI, wallet) | 20 min | Full-Stack + Frontend |
| Deploy to mainnet         | 10 min | Rust Dev              |
| Post-launch monitoring    | 1 hour | All                   |

**Total**: ~2 hours for full cycle

---

## ✅ Go/No-Go Decision

**GO MAINNET if**:

- [ ] All tests passing
- [ ] Security audit complete
- [ ] Mainnet-beta deployment verified
- [ ] Frontend tested end-to-end
- [ ] Keypairs backed up
- [ ] Team ready

**NO-GO if**:

- [ ] Any tests failing
- [ ] Security issues unresolved
- [ ] Mainnet-beta staging failed
- [ ] Wallet integration not working

---

**Questions?** See detailed docs:

- [DEPLOYMENT_MAINNET.md](./DEPLOYMENT_MAINNET.md) — Full step-by-step
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) — Security checklist
- [Misthos_Architecture.md](./Misthos_Architecture.md) — Design overview

**Ready to launch?** Follow the copy-paste commands above. Total time: 45 minutes.

🚀 **Let's ship MISTHOS!**
