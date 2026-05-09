Immediate items I need from you to execute the MVP (local test-first):

1. Confirm permission to run the cleanup steps locally (I provided `scripts/cleanup-git.ps1`).
2. Confirm whether to rewrite git history to purge large files (BFG/git-filter-repo). This is destructive and requires backups.
3. Confirm the on-chain program target:
   - For local testing, use the current Devnet program ID already in `src/lib/configAddress.ts`: `DrXPPNGik8nc1Grq4B1dJvodpSvP5LWsfT7qVxfqg6ht`.
   - No new deployment is needed unless you explicitly want a fresh program ID.
4. Wallet handling:
   - You confirmed you will switch accounts manually in Solflare.
   - No wallet public keys are required for the first test pass.
   - If you want me to pre-fill test data later, send creator/payer public keys.
5. Confirm RPC endpoint (default `https://api.devnet.solana.com` is fine) or provide a private RPC URL.
6. If you want full end-to-end with email and Claude, confirm the environment variables exist in `.env.local` (Claude API key, Resend API key). If you prefer mocks, say so.
7. Decide MVP payment flow priority (choose one):
   - A: Wallet-only (on-chain token payments via SPL) — fastest for Devnet testing.
   - B: Wallet + x402 (on-chain specialized flow) — requires confirming x402 instruction readiness.
   - C: Card/Coinflow + LI.FI (requires third-party credentials) — slower.
8. Confirm whether you want me to prepare a local runbook only, or also a deployable archive (`workspace.so` + IDL) for later use.

Once you confirm the above, I will:

- Run (or provide the exact commands to run) the cleanup, install deps, and start the dev server.
- Prepare a short step-by-step runbook for local testing against the existing Devnet program ID and start wiring the frontend SDK to the confirmed endpoint.

If you'd like me to take the next step now, say which of the above (3,4,5,6,7,8) you confirm, and whether I should prepare the local runbook only or also future deploy commands.
