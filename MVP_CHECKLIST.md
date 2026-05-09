MVP checklist (local test-first) — target: complete within 19 hours

Phase 3 — Integration

- [x] Confirm Devnet program ID in `src/lib/configAddress.ts` (keep current ID for local testing)
- [ ] Verify IDL `src/idl/workspace.json` matches program (addresses and accounts)
- [ ] Ensure Anchor/solana toolchain available locally only if you want to build later; skip deploy for now
- [ ] Wire `CreateInvoice` and `PayInvoice` flows to `MisthosSDK` (already wired)
- [ ] Verify token mints and decimals mapping in `CreateInvoice.tsx` and `PayInvoice.tsx`
- [ ] Test in browser: connect Phantom accounts, create invoice, simulate payer and pay

Phase 4 — QA & polish

- [ ] Add error boundaries and friendly toast messages for RPC/network failures
- [ ] Add loading states for tx submissions and confirmations
- [ ] Verify email sending (Resend) and AI draft (Claude) if keys provided
- [ ] Verify analytics endpoints return expected structures
- [ ] Smoke test: create -> pay -> release escrow -> fetch records

Local test runbook

- [ ] Use existing Devnet program ID from `src/lib/configAddress.ts`
- [ ] Run frontend locally with `npm run dev`
- [ ] Test wallet-only invoice flow end-to-end
- [ ] Only deploy later if you explicitly choose to publish a new program version

Acceptance criteria

- Wallet-only flow works end-to-end locally against the existing Devnet program (create invoice, payer pays, creator can release escrow)
- UI shows clear success/failure states and tx signatures for verification
- Docs updated with runbook (RELEASE_NOTES_DEVNET.md)

If you confirm the program ID and pick payment flow priority, I'll start executing the remaining steps and prepare the precise commands for local testing.
