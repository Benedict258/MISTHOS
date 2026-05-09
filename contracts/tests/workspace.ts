import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Workspace } from "../target/types/workspace";
import { expect } from "chai";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("workspace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.workspace as Program<Workspace>;

  let authority: Keypair;
  let creator: Keypair;
  let payerUser: Keypair;
  let mintKeypair: Keypair;
  let configPDA: PublicKey;
  let invoicePDA: PublicKey;
  let escrowVaultPDA: PublicKey;
  let escrowAuthorityPDA: PublicKey;
  let paymentRecordPDA: PublicKey;
  let creatorTokenAccount: PublicKey;
  let payerTokenAccount: PublicKey;

  const invoiceId = "inv-001-test-uuid-format-12345";
  const invoiceAmount = new BN(1_000_000); // 1 token (6 decimals)
  const metadataHash = Array(32).fill(1);
  const reserveKeypair = Keypair.generate();

  before(async () => {
    authority = Keypair.generate();
    creator = Keypair.generate();
    payerUser = Keypair.generate();
    mintKeypair = Keypair.generate();

    // Fund all accounts
    const airdropAuth = await provider.connection.requestAirdrop(
      authority.publicKey,
      100 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropAuth);

    const airdropCreator = await provider.connection.requestAirdrop(
      creator.publicKey,
      100 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropPayer = await provider.connection.requestAirdrop(
      payerUser.publicKey,
      100 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropPayer);

    // Derive PDAs
    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );

    [invoicePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(invoiceId),
      ],
      program.programId
    );

    [escrowVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), invoicePDA.toBuffer()],
      program.programId
    );

    [escrowAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), invoicePDA.toBuffer()],
      program.programId
    );

    [paymentRecordPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), invoicePDA.toBuffer()],
      program.programId
    );

    // Create SPL token mint
    const lamports = await getMinimumBalanceForRentExemptMint(
      provider.connection
    );
    const createMintTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: creator.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        6,
        creator.publicKey,
        null
      )
    );
    await provider.sendAndConfirm(createMintTx, [creator, mintKeypair]);

    // Create associated token accounts
    creatorTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      creator.publicKey
    );
    payerTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      payerUser.publicKey
    );

    const createAtaTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        creator.publicKey,
        creatorTokenAccount,
        creator.publicKey,
        mintKeypair.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        creator.publicKey,
        payerTokenAccount,
        payerUser.publicKey,
        mintKeypair.publicKey
      )
    );
    await provider.sendAndConfirm(createAtaTx, [creator]);

    // Mint tokens to payer
    const mintToTx = new Transaction().add(
      createMintToInstruction(
        mintKeypair.publicKey,
        payerTokenAccount,
        creator.publicKey,
        10_000_000 // 10 tokens
      )
    );
    await provider.sendAndConfirm(mintToTx, [creator]);
  });

  // ============================================================
  // INITIAL / CORE TESTS (MUST PASS)
  // ============================================================

  it("Initialize Config", async () => {
    await program.methods
      .initializeConfig(250, reserveKeypair.publicKey)
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.isActive).to.be.true;
    expect(config.isPaused).to.be.false;
    expect(config.feeBps).to.equal(250);
    expect(config.reserve.toBase58()).to.equal(
      reserveKeypair.publicKey.toBase58()
    );
    expect(config.version).to.equal(1);
  });

  it("Create Invoice", async () => {
    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    await program.methods
      .createInvoice(
        invoiceId,
        payerUser.publicKey,
        invoiceAmount,
        futureDate,
        metadataHash
      )
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA,
        tokenMint: mintKeypair.publicKey,
        escrowVault: escrowVaultPDA,
        escrowAuthority: escrowAuthorityPDA,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA);
    expect(invoice.creator.toBase58()).to.equal(
      creator.publicKey.toBase58()
    );
    expect(invoice.payer.toBase58()).to.equal(
      payerUser.publicKey.toBase58()
    );
    expect(Number(invoice.amount.toString())).to.equal(1_000_000);
    expect(invoice.invoiceId).to.equal(invoiceId);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ draft: {} })
    );
    expect(Number(invoice.createdAt.toString())).to.be.greaterThan(0);
    expect(Number(invoice.paidAt.toString())).to.equal(0);
  });

  it("Send Invoice", async () => {
    await program.methods
      .sendInvoice()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA,
      })
      .signers([creator])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ sent: {} })
    );
  });

  it("Pay Invoice", async () => {
    await program.methods
      .payInvoice(0) // Wallet payment method
      .accounts({
        payer: payerUser.publicKey,
        invoiceAccount: invoicePDA,
        payerTokenAccount: payerTokenAccount,
        escrowVault: escrowVaultPDA,
        paymentRecord: paymentRecordPDA,
        tokenMint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payerUser])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ paid: {} })
    );
    expect(Number(invoice.paidAt.toString())).to.be.greaterThan(0);

    // Verify escrow received tokens
    const escrowData = await getAccount(
      provider.connection,
      escrowVaultPDA
    );
    expect(Number(escrowData.amount)).to.equal(1_000_000);

    // Verify payment record
    const payment = await program.account.paymentRecord.fetch(
      paymentRecordPDA
    );
    expect(payment.payer.toBase58()).to.equal(
      payerUser.publicKey.toBase58()
    );
    expect(Number(payment.amount.toString())).to.equal(1_000_000);
    expect(JSON.stringify(payment.paymentMethod)).to.equal(
      JSON.stringify({ wallet: {} })
    );
  });

  it("Release Escrow", async () => {
    const creatorBefore = await getAccount(
      provider.connection,
      creatorTokenAccount
    );

    await program.methods
      .releaseEscrow()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA,
        escrowVault: escrowVaultPDA,
        creatorTokenAccount: creatorTokenAccount,
        escrowAuthority: escrowAuthorityPDA,
        tokenMint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([creator])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ settled: {} })
    );

    // Verify creator received tokens
    const creatorAfter = await getAccount(
      provider.connection,
      creatorTokenAccount
    );
    expect(Number(creatorAfter.amount) - Number(creatorBefore.amount)).to.equal(
      1_000_000
    );

    // Verify escrow is empty
    const escrowData = await getAccount(
      provider.connection,
      escrowVaultPDA
    );
    expect(Number(escrowData.amount)).to.equal(0);
  });

  // ============================================================
  // DISPUTE & REFUND FLOW
  // ============================================================

  let invoicePDA2: PublicKey;
  let escrowVaultPDA2: PublicKey;
  let escrowAuthorityPDA2: PublicKey;
  let paymentRecordPDA2: PublicKey;
  const invoiceId2 = "inv-002-dispute-refund-test";

  it("Create and pay second invoice for dispute flow", async () => {
    [invoicePDA2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(invoiceId2),
      ],
      program.programId
    );
    [escrowVaultPDA2] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), invoicePDA2.toBuffer()],
      program.programId
    );
    [escrowAuthorityPDA2] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), invoicePDA2.toBuffer()],
      program.programId
    );
    [paymentRecordPDA2] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), invoicePDA2.toBuffer()],
      program.programId
    );

    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    await program.methods
      .createInvoice(
        invoiceId2,
        payerUser.publicKey,
        invoiceAmount,
        futureDate,
        metadataHash
      )
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA2,
        tokenMint: mintKeypair.publicKey,
        escrowVault: escrowVaultPDA2,
        escrowAuthority: escrowAuthorityPDA2,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .sendInvoice()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA2,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .payInvoice(1) // CrossChain
      .accounts({
        payer: payerUser.publicKey,
        invoiceAccount: invoicePDA2,
        payerTokenAccount: payerTokenAccount,
        escrowVault: escrowVaultPDA2,
        paymentRecord: paymentRecordPDA2,
        tokenMint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payerUser])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA2);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ paid: {} })
    );
  });

  it("Dispute Invoice (by creator)", async () => {
    await program.methods
      .disputeInvoice()
      .accounts({
        caller: creator.publicKey,
        invoiceAccount: invoicePDA2,
      })
      .signers([creator])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA2);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ disputed: {} })
    );
  });

  it("Refund Invoice", async () => {
    const payerBefore = await getAccount(
      provider.connection,
      payerTokenAccount
    );

    await program.methods
      .refundInvoice()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA2,
        escrowVault: escrowVaultPDA2,
        payerTokenAccount: payerTokenAccount,
        escrowAuthority: escrowAuthorityPDA2,
        tokenMint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([creator])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA2);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ refunded: {} })
    );

    // Verify payer received refund
    const payerAfter = await getAccount(
      provider.connection,
      payerTokenAccount
    );
    expect(Number(payerAfter.amount) - Number(payerBefore.amount)).to.equal(
      1_000_000
    );
  });

  // ============================================================
  // X402 PAYMENT FLOW
  // ============================================================

  let invoicePDA3: PublicKey;
  let escrowVaultPDA3: PublicKey;
  let escrowAuthorityPDA3: PublicKey;
  let paymentRecordPDA3: PublicKey;
  const invoiceId3 = "inv-003-x402-payment-test";

  it("Pay via X402 protocol", async () => {
    [invoicePDA3] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(invoiceId3),
      ],
      program.programId
    );
    [escrowVaultPDA3] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), invoicePDA3.toBuffer()],
      program.programId
    );
    [escrowAuthorityPDA3] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), invoicePDA3.toBuffer()],
      program.programId
    );
    [paymentRecordPDA3] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), invoicePDA3.toBuffer()],
      program.programId
    );

    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    await program.methods
      .createInvoice(
        invoiceId3,
        payerUser.publicKey,
        invoiceAmount,
        futureDate,
        metadataHash
      )
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA3,
        tokenMint: mintKeypair.publicKey,
        escrowVault: escrowVaultPDA3,
        escrowAuthority: escrowAuthorityPDA3,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .sendInvoice()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA3,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .payX402(3) // X402 payment method
      .accounts({
        payer: payerUser.publicKey,
        invoiceAccount: invoicePDA3,
        payerTokenAccount: payerTokenAccount,
        escrowVault: escrowVaultPDA3,
        paymentRecord: paymentRecordPDA3,
        tokenMint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payerUser])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA3);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ paid: {} })
    );

    const payment = await program.account.paymentRecord.fetch(
      paymentRecordPDA3
    );
    expect(JSON.stringify(payment.paymentMethod)).to.equal(
      JSON.stringify({ x402: {} })
    );
  });

  // ============================================================
  // DISPUTE BY PAYER
  // ============================================================

  let invoicePDA4: PublicKey;
  let escrowVaultPDA4: PublicKey;
  let escrowAuthorityPDA4: PublicKey;
  let paymentRecordPDA4: PublicKey;
  const invoiceId4 = "inv-004-payer-dispute-test";

  it("Dispute Invoice (by payer)", async () => {
    [invoicePDA4] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(invoiceId4),
      ],
      program.programId
    );
    [escrowVaultPDA4] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), invoicePDA4.toBuffer()],
      program.programId
    );
    [escrowAuthorityPDA4] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), invoicePDA4.toBuffer()],
      program.programId
    );
    [paymentRecordPDA4] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), invoicePDA4.toBuffer()],
      program.programId
    );

    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    await program.methods
      .createInvoice(
        invoiceId4,
        payerUser.publicKey,
        invoiceAmount,
        futureDate,
        metadataHash
      )
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA4,
        tokenMint: mintKeypair.publicKey,
        escrowVault: escrowVaultPDA4,
        escrowAuthority: escrowAuthorityPDA4,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .sendInvoice()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: invoicePDA4,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .payInvoice(0)
      .accounts({
        payer: payerUser.publicKey,
        invoiceAccount: invoicePDA4,
        payerTokenAccount: payerTokenAccount,
        escrowVault: escrowVaultPDA4,
        paymentRecord: paymentRecordPDA4,
        tokenMint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payerUser])
      .rpc();

    // Payer disputes
    await program.methods
      .disputeInvoice()
      .accounts({
        caller: payerUser.publicKey,
        invoiceAccount: invoicePDA4,
      })
      .signers([payerUser])
      .rpc();

    const invoice = await program.account.invoiceAccount.fetch(invoicePDA4);
    expect(JSON.stringify(invoice.status)).to.equal(
      JSON.stringify({ disputed: {} })
    );
  });

  // ============================================================
  // ERROR / VALIDATION TESTS
  // ============================================================

  it("Fails to create invoice with zero amount", async () => {
    const badInvoiceId = "inv-bad-zero-amount";
    const [badInvoicePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(badInvoiceId),
      ],
      program.programId
    );
    const [badEscrowVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), badInvoicePDA.toBuffer()],
      program.programId
    );
    const [badEscrowAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), badInvoicePDA.toBuffer()],
      program.programId
    );

    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400);

    try {
      await program.methods
        .createInvoice(
          badInvoiceId,
          payerUser.publicKey,
          new BN(0),
          futureDate,
          metadataHash
        )
        .accounts({
          creator: creator.publicKey,
          invoiceAccount: badInvoicePDA,
          tokenMint: mintKeypair.publicKey,
          escrowVault: badEscrowVault,
          escrowAuthority: badEscrowAuth,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("InvalidAmount");
    }
  });

  it("Fails to create invoice with past due date", async () => {
    const badInvoiceId = "inv-bad-past-date";
    const [badInvoicePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(badInvoiceId),
      ],
      program.programId
    );
    const [badEscrowVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), badInvoicePDA.toBuffer()],
      program.programId
    );
    const [badEscrowAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), badInvoicePDA.toBuffer()],
      program.programId
    );

    const pastDate = new BN(1000);

    try {
      await program.methods
        .createInvoice(
          badInvoiceId,
          payerUser.publicKey,
          invoiceAmount,
          pastDate,
          metadataHash
        )
        .accounts({
          creator: creator.publicKey,
          invoiceAccount: badInvoicePDA,
          tokenMint: mintKeypair.publicKey,
          escrowVault: badEscrowVault,
          escrowAuthority: badEscrowAuth,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("InvalidDueDate");
    }
  });

  it("Fails to create invoice where payer == creator", async () => {
    const badInvoiceId = "inv-bad-self-pay";
    const [badInvoicePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(badInvoiceId),
      ],
      program.programId
    );
    const [badEscrowVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), badInvoicePDA.toBuffer()],
      program.programId
    );
    const [badEscrowAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), badInvoicePDA.toBuffer()],
      program.programId
    );

    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400);

    try {
      await program.methods
        .createInvoice(
          badInvoiceId,
          creator.publicKey, // payer == creator
          invoiceAmount,
          futureDate,
          metadataHash
        )
        .accounts({
          creator: creator.publicKey,
          invoiceAccount: badInvoicePDA,
          tokenMint: mintKeypair.publicKey,
          escrowVault: badEscrowVault,
          escrowAuthority: badEscrowAuth,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("PayerCannotBeCreator");
    }
  });

  it("Fails to send invoice that is not in Draft status", async () => {
    // invoicePDA is already Settled
    try {
      await program.methods
        .sendInvoice()
        .accounts({
          creator: creator.publicKey,
          invoiceAccount: invoicePDA,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("InvalidStatus");
    }
  });

  it("Fails to pay invoice by unauthorized payer", async () => {
    // Create a fresh invoice for this test
    const badPayInvoiceId = "inv-bad-unauth-pay";
    const [badPayInvoicePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(badPayInvoiceId),
      ],
      program.programId
    );
    const [badPayEscrowVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), badPayInvoicePDA.toBuffer()],
      program.programId
    );
    const [badPayEscrowAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), badPayInvoicePDA.toBuffer()],
      program.programId
    );
    const [badPayPaymentRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), badPayInvoicePDA.toBuffer()],
      program.programId
    );

    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    await program.methods
      .createInvoice(
        badPayInvoiceId,
        payerUser.publicKey,
        invoiceAmount,
        futureDate,
        metadataHash
      )
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: badPayInvoicePDA,
        tokenMint: mintKeypair.publicKey,
        escrowVault: badPayEscrowVault,
        escrowAuthority: badPayEscrowAuth,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .sendInvoice()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: badPayInvoicePDA,
      })
      .signers([creator])
      .rpc();

    // Creator tries to pay (should fail - not the designated payer)
    try {
      await program.methods
        .payInvoice(0)
        .accounts({
          payer: creator.publicKey,
          invoiceAccount: badPayInvoicePDA,
          payerTokenAccount: creatorTokenAccount,
          escrowVault: badPayEscrowVault,
          paymentRecord: badPayPaymentRecord,
          tokenMint: mintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("Unauthorized");
    }
  });

  it("Fails to dispute invoice that is not Paid", async () => {
    // invoicePDA is Settled, not Paid
    try {
      await program.methods
        .disputeInvoice()
        .accounts({
          caller: creator.publicKey,
          invoiceAccount: invoicePDA,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("InvalidStatus");
    }
  });

  it("Fails to dispute invoice by unauthorized third party", async () => {
    // Create a fresh paid invoice
    const thirdPartyInvoiceId = "inv-third-party-dispute";
    const [tpInvoicePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invoice"),
        creator.publicKey.toBuffer(),
        Buffer.from(thirdPartyInvoiceId),
      ],
      program.programId
    );
    const [tpEscrowVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), tpInvoicePDA.toBuffer()],
      program.programId
    );
    const [tpEscrowAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_auth"), tpInvoicePDA.toBuffer()],
      program.programId
    );
    const [tpPaymentRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment"), tpInvoicePDA.toBuffer()],
      program.programId
    );

    const futureDate = new BN(Math.floor(Date.now() / 1000) + 86400 * 30);

    await program.methods
      .createInvoice(
        thirdPartyInvoiceId,
        payerUser.publicKey,
        invoiceAmount,
        futureDate,
        metadataHash
      )
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: tpInvoicePDA,
        tokenMint: mintKeypair.publicKey,
        escrowVault: tpEscrowVault,
        escrowAuthority: tpEscrowAuth,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .sendInvoice()
      .accounts({
        creator: creator.publicKey,
        invoiceAccount: tpInvoicePDA,
      })
      .signers([creator])
      .rpc();

    await program.methods
      .payInvoice(0)
      .accounts({
        payer: payerUser.publicKey,
        invoiceAccount: tpInvoicePDA,
        payerTokenAccount: payerTokenAccount,
        escrowVault: tpEscrowVault,
        paymentRecord: tpPaymentRecord,
        tokenMint: mintKeypair.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payerUser])
      .rpc();

    // Third party tries to dispute
    const thirdParty = Keypair.generate();
    const airdropTp = await provider.connection.requestAirdrop(
      thirdParty.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTp);

    try {
      await program.methods
        .disputeInvoice()
        .accounts({
          caller: thirdParty.publicKey,
          invoiceAccount: tpInvoicePDA,
        })
        .signers([thirdParty])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("Unauthorized");
    }
  });

  it("Fails to release escrow when not Paid status", async () => {
    // invoicePDA is Settled
    try {
      await program.methods
        .releaseEscrow()
        .accounts({
          creator: creator.publicKey,
          invoiceAccount: invoicePDA,
          escrowVault: escrowVaultPDA,
          creatorTokenAccount: creatorTokenAccount,
          escrowAuthority: escrowAuthorityPDA,
          tokenMint: mintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("InvalidStatus");
    }
  });

  it("Fails to refund invoice that is not Disputed", async () => {
    // invoicePDA is Settled, not Disputed
    try {
      await program.methods
        .refundInvoice()
        .accounts({
          creator: creator.publicKey,
          invoiceAccount: invoicePDA,
          escrowVault: escrowVaultPDA,
          payerTokenAccount: payerTokenAccount,
          escrowAuthority: escrowAuthorityPDA,
          tokenMint: mintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error.message).to.include("InvalidStatus");
    }
  });
});
