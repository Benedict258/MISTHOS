Solflare local setup guide

Goal: test the app locally against the existing Devnet program ID using Solflare.

1. Install and open Solflare

- Install the Solflare browser extension if you do not already have it.
- Create a wallet or import an existing one.
- Keep your seed phrase/private key secure.

2. Switch Solflare to Devnet

- Open Solflare settings.
- Change the network to Devnet.
- Confirm the wallet shows a Devnet balance (you may need a faucet if you want to sign transactions on Devnet).

3. Get the two wallet roles
   For the app, there are two roles:

- Creator wallet: creates the invoice and later releases escrow.
- Payer wallet: opens the invoice payment page and pays.

What to send me:

- No wallet keys are required if you will manually switch accounts in Solflare.
- If you want me to pre-fill test data, you can still send 2 public keys (creator + payer).

4. Start the app locally

- Run the frontend with the local dev server.
- Connect Solflare from the wallet button.
- Make sure the wallet connection shows Devnet and the correct account.

5. Test flow

- Creator: create invoice.
- Payer: open the pay page and send payment.
- Creator: verify the invoice and release escrow if needed.

6. What I already know

- Default Devnet RPC is fine.
- The app is configured to use the existing Devnet program ID in `src/lib/configAddress.ts`.
- Solflare support is now enabled in the app wallet adapter list.

7. Optional next step
   If you want, I can now give you a copy-paste local test checklist with exact clicks and fields to use in the browser.
