Devnet deployment & local testing notes

1. Ensure dependencies are installed:

```powershell
npm install
```

2. Clean tracked artifacts (run from repo root):

```powershell
pwsh ./scripts/cleanup-git.ps1
```

3. Build frontend:

```powershell
npm run build
npm run dev    # or npm run start depending on scripts
```

4. Verify program ID in `src/lib/configAddress.ts`. If you need to deploy the on-chain program:

```powershell
# From contracts/ folder
anchor build
# Then deploy (requires solana cli configured to devnet)
solana program deploy target/deploy/workspace.so --url https://api.devnet.solana.com
```

5. Run the app locally and connect Phantom (Devnet). Test flows:
- Create invoice (Create Invoice page)
- Pay invoice (PayInvoice flow) — uses mock payment handlers if on-chain not deployed
- Release escrow (creator action) — verify on-chain status changes

6. If you want to rewrite git history to purge large files, confirm and I'll provide the exact BFG/git filter-repo commands and safety checklist.
