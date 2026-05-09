/**
 * Misthos SDK — On-Chain Invoice Program Client
 *
 * Program ID: 7WDrepbu71dCMPpDeHrafhV3gVGrSPaMgFXp4cUHWyiR
 * Network: Solana Devnet
 *
 * Instructions: create_invoice, send_invoice, pay_invoice, release_escrow,
 *               pay_x402, dispute_invoice, refund_invoice
 */

import { BN, Program, Provider } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import IDL from "../idl/workspace.json";
import { configAddress } from "./configAddress";

// ── Type Definitions ────────────────────────────────────────────────────────

export interface ConfigData {
  bump: number;
  authority: PublicKey;
  isActive: boolean;
  isPaused: boolean;
  feeBps: number;
  reserve: PublicKey;
  version: number;
}

export interface InvoiceAccountData {
  creator: PublicKey;
  payer: PublicKey;
  amount: BN;
  tokenMint: PublicKey;
  dueDate: BN;
  status: InvoiceStatusType;
  invoiceId: string;
  metadataHash: number[];
  createdAt: BN;
  paidAt: BN;
  bump: number;
}

export interface PaymentRecordData {
  invoice: PublicKey;
  payer: PublicKey;
  amount: BN;
  tokenMint: PublicKey;
  paidAt: BN;
  paymentMethod: PaymentMethodType;
  bump: number;
}

export type InvoiceStatusType =
  | { draft: Record<string, never> }
  | { sent: Record<string, never> }
  | { viewed: Record<string, never> }
  | { paid: Record<string, never> }
  | { settled: Record<string, never> }
  | { disputed: Record<string, never> }
  | { refunded: Record<string, never> };

export type PaymentMethodType =
  | { wallet: Record<string, never> }
  | { crossChain: Record<string, never> }
  | { fiatCard: Record<string, never> }
  | { x402: Record<string, never> };

export interface CreateInvoiceParams {
  invoiceId: string;
  payer: PublicKey;
  amount: number;
  tokenMint: PublicKey;
  dueDate: number;
  metadataHash: number[];
}

export interface PayInvoiceParams {
  invoiceAddress: PublicKey;
  paymentMethod: number; // 0=Wallet, 1=CrossChain, 2=FiatCard, 3=X402
}

export interface SDKResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Helper to get status string ─────────────────────────────────────────────

export function getInvoiceStatusString(status: InvoiceStatusType): string {
  if ("draft" in status) return "draft";
  if ("sent" in status) return "sent";
  if ("viewed" in status) return "viewed";
  if ("paid" in status) return "paid";
  if ("settled" in status) return "settled";
  if ("disputed" in status) return "disputed";
  if ("refunded" in status) return "refunded";
  return "unknown";
}

export function getPaymentMethodString(method: PaymentMethodType): string {
  if ("wallet" in method) return "wallet";
  if ("crossChain" in method) return "crosschain";
  if ("fiatCard" in method) return "card";
  if ("x402" in method) return "x402";
  return "unknown";
}

// ── SDK Class ───────────────────────────────────────────────────────────────

export class MisthosSDK {
  private readonly provider: Provider;
  private readonly program: Program<any>;
  private readonly configAddress: PublicKey;

  constructor(provider: Provider) {
    this.provider = provider;
    this.program = new Program(IDL as any, this.provider);
    this.configAddress = new PublicKey(configAddress);
  }

  // ── BN Helpers ──────────────────────────────────────────────────────────

  private safeBN(value: any, defaultValue: number | string = 0): BN {
    if (value === null || value === undefined) return new BN(defaultValue);
    if (value instanceof BN) return value;
    if (typeof value === "number") {
      if (isNaN(value) || !isFinite(value)) return new BN(defaultValue);
      return new BN(Math.floor(value).toString());
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      const num = parseFloat(trimmed);
      if (isNaN(num)) return new BN(defaultValue);
      return new BN(Math.floor(num).toString());
    }
    return new BN(defaultValue);
  }

  private safeBNToNumber(value: any, defaultValue: number = 0): number {
    try {
      return value && typeof value.toNumber === "function"
        ? value.toNumber()
        : defaultValue;
    } catch {
      if (value && typeof value.toString === "function") {
        const parsed = parseInt(value.toString());
        if (!isNaN(parsed)) return parsed;
      }
      return defaultValue;
    }
  }

  // ── PDA Helpers ─────────────────────────────────────────────────────────

  private getPDA(
    seeds: (string | PublicKey | Buffer | Uint8Array)[]
  ): [PublicKey, number] {
    const seedBuffers = seeds.map((seed) => {
      if (typeof seed === "string") return Buffer.from(seed, "utf8");
      if (seed instanceof PublicKey) return seed.toBuffer();
      if (seed instanceof Uint8Array) return Buffer.from(seed);
      return seed;
    });
    return PublicKey.findProgramAddressSync(seedBuffers, this.program.programId);
  }

  /** Derive Invoice PDA */
  getInvoicePDA(creator: PublicKey, invoiceId: string): [PublicKey, number] {
    return this.getPDA(["invoice", creator, Buffer.from(invoiceId)]);
  }

  /** Derive Escrow Vault PDA */
  getEscrowVaultPDA(invoiceAccount: PublicKey): [PublicKey, number] {
    return this.getPDA(["escrow", invoiceAccount]);
  }

  /** Derive Escrow Authority PDA */
  getEscrowAuthorityPDA(invoiceAccount: PublicKey): [PublicKey, number] {
    return this.getPDA(["escrow_auth", invoiceAccount]);
  }

  /** Derive Payment Record PDA */
  getPaymentRecordPDA(invoiceAccount: PublicKey): [PublicKey, number] {
    return this.getPDA(["payment", invoiceAccount]);
  }

  // ── Connection Test ─────────────────────────────────────────────────────

  private async testConnection(): Promise<boolean> {
    try {
      if (!this.provider?.connection) return false;
      const { value } = await this.provider.connection.getLatestBlockhashAndContext("finalized");
      return !!(value && value.blockhash);
    } catch {
      return false;
    }
  }

  // ── Instructions ────────────────────────────────────────────────────────

  /**
   * Create a new invoice on-chain with PDA escrow vault.
   */
  async createInvoice(
    params: CreateInvoiceParams
  ): Promise<SDKResult<{ signature: string; invoiceAddress: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      if (!params.invoiceId || params.invoiceId.length > 36)
        return { success: false, error: "Invoice ID must be 1-36 characters" };
      if (params.amount <= 0)
        return { success: false, error: "Amount must be greater than 0" };

      const creator = this.provider.publicKey;
      const amountBN = this.safeBN(params.amount);
      const dueDateBN = this.safeBN(params.dueDate);
      const metadataHash = params.metadataHash.length === 32
        ? params.metadataHash
        : new Array(32).fill(0);

      const [invoiceAddress] = this.getInvoicePDA(creator, params.invoiceId);
      const [escrowVault] = this.getEscrowVaultPDA(invoiceAddress);
      const [escrowAuthority] = this.getEscrowAuthorityPDA(invoiceAddress);

      const tx = await this.program.methods
        .createInvoice(
          params.invoiceId,
          params.payer,
          amountBN,
          dueDateBN,
          metadataHash
        )
        .accounts({
          creator,
          invoiceAccount: invoiceAddress,
          tokenMint: params.tokenMint,
          escrowVault,
          escrowAuthority,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
        })
        .rpc();

      return {
        success: true,
        data: { signature: tx, invoiceAddress: invoiceAddress.toString() },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create invoice",
      };
    }
  }

  /**
   * Transition invoice from Draft to Sent.
   */
  async sendInvoice(
    invoiceAddress: PublicKey
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const tx = await this.program.methods
        .sendInvoice()
        .accounts({
          creator: this.provider.publicKey,
          invoiceAccount: invoiceAddress,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send invoice",
      };
    }
  }

  /**
   * Payer pays an invoice. Tokens transfer to escrow vault.
   */
  async payInvoice(
    params: PayInvoiceParams
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const invoiceData = await this.program.account.invoiceAccount.fetch(
        params.invoiceAddress
      );

      const payerTokenAccount = getAssociatedTokenAddressSync(
        invoiceData.tokenMint,
        this.provider.publicKey
      );

      const [escrowVault] = this.getEscrowVaultPDA(params.invoiceAddress);
      const [paymentRecord] = this.getPaymentRecordPDA(params.invoiceAddress);

      const tx = await this.program.methods
        .payInvoice(params.paymentMethod)
        .accounts({
          payer: this.provider.publicKey,
          invoiceAccount: params.invoiceAddress,
          payerTokenAccount,
          escrowVault,
          paymentRecord,
          tokenMint: invoiceData.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to pay invoice",
      };
    }
  }

  /**
   * x402 protocol payment — dedicated instruction.
   */
  async payX402(
    invoiceAddress: PublicKey,
    paymentMethodData: number = 3
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const invoiceData = await this.program.account.invoiceAccount.fetch(
        invoiceAddress
      );

      const payerTokenAccount = getAssociatedTokenAddressSync(
        invoiceData.tokenMint,
        this.provider.publicKey
      );

      const [escrowVault] = this.getEscrowVaultPDA(invoiceAddress);
      const [paymentRecord] = this.getPaymentRecordPDA(invoiceAddress);

      const tx = await this.program.methods
        .payX402(paymentMethodData)
        .accounts({
          payer: this.provider.publicKey,
          invoiceAccount: invoiceAddress,
          payerTokenAccount,
          escrowVault,
          paymentRecord,
          tokenMint: invoiceData.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "x402 payment failed",
      };
    }
  }

  /**
   * Creator releases escrow funds to their wallet. Status → Settled.
   */
  async releaseEscrow(
    invoiceAddress: PublicKey
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const invoiceData = await this.program.account.invoiceAccount.fetch(
        invoiceAddress
      );

      const creatorTokenAccount = getAssociatedTokenAddressSync(
        invoiceData.tokenMint,
        this.provider.publicKey
      );

      const [escrowVault] = this.getEscrowVaultPDA(invoiceAddress);
      const [escrowAuthority] = this.getEscrowAuthorityPDA(invoiceAddress);

      const tx = await this.program.methods
        .releaseEscrow()
        .accounts({
          creator: this.provider.publicKey,
          invoiceAccount: invoiceAddress,
          escrowVault,
          creatorTokenAccount,
          escrowAuthority,
          tokenMint: invoiceData.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Escrow release failed",
      };
    }
  }

  /**
   * Dispute a paid invoice. Either creator or payer can call.
   */
  async disputeInvoice(
    invoiceAddress: PublicKey
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const tx = await this.program.methods
        .disputeInvoice()
        .accounts({
          caller: this.provider.publicKey,
          invoiceAccount: invoiceAddress,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Dispute failed",
      };
    }
  }

  /**
   * Refund a disputed invoice. Returns escrow to payer. Creator-only.
   */
  async refundInvoice(
    invoiceAddress: PublicKey
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const invoiceData = await this.program.account.invoiceAccount.fetch(
        invoiceAddress
      );

      const payerTokenAccount = getAssociatedTokenAddressSync(
        invoiceData.tokenMint,
        invoiceData.payer
      );

      const [escrowVault] = this.getEscrowVaultPDA(invoiceAddress);
      const [escrowAuthority] = this.getEscrowAuthorityPDA(invoiceAddress);

      const tx = await this.program.methods
        .refundInvoice()
        .accounts({
          creator: this.provider.publicKey,
          invoiceAccount: invoiceAddress,
          escrowVault,
          payerTokenAccount,
          escrowAuthority,
          tokenMint: invoiceData.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return { success: true, data: { signature: tx } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Refund failed",
      };
    }
  }

  // ── Account Fetchers ────────────────────────────────────────────────────

  /**
   * Fetch a single invoice by its PDA address.
   */
  async fetchInvoice(
    invoiceAddress: PublicKey
  ): Promise<SDKResult<InvoiceAccountData>> {
    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const data = await this.program.account.invoiceAccount.fetch(invoiceAddress);
      return { success: true, data: data as InvoiceAccountData };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Account does not exist")) {
        return { success: false, error: "Invoice not found" };
      }
      return { success: false, error: "Failed to fetch invoice" };
    }
  }

  /**
   * Fetch all invoices created by the connected wallet.
   */
  async fetchInvoicesByCreator(
    creator?: PublicKey
  ): Promise<SDKResult<Array<{ publicKey: PublicKey; account: InvoiceAccountData }>>> {
    const targetCreator = creator || this.provider.publicKey;
    if (!targetCreator)
      return { success: false, error: "No creator address" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000)
      );
      const fetchPromise = this.program.account.invoiceAccount.all();

      let allInvoices: any[];
      try {
        allInvoices = (await Promise.race([fetchPromise, timeout])) as any[];
      } catch (raceError) {
        if (raceError instanceof Error && raceError.message.includes("timeout")) {
          return { success: false, error: "Request timed out" };
        }
        throw raceError;
      }

      if (!allInvoices?.length) return { success: true, data: [] };

      const filtered = allInvoices.filter(
        (inv: any) => inv.account.creator?.toString() === targetCreator.toString()
      );

      return {
        success: true,
        data: filtered.map((inv: any) => ({
          publicKey: inv.publicKey,
          account: inv.account as InvoiceAccountData,
        })),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Account does not exist")) {
        return { success: true, data: [] };
      }
      return { success: false, error: "Failed to fetch invoices" };
    }
  }

  /**
   * Fetch payment record for an invoice.
   */
  async fetchPaymentRecord(
    invoiceAddress: PublicKey
  ): Promise<SDKResult<PaymentRecordData>> {
    try {
      const [paymentRecordAddress] = this.getPaymentRecordPDA(invoiceAddress);
      const data = await this.program.account.paymentRecord.fetch(paymentRecordAddress);
      return { success: true, data: data as PaymentRecordData };
    } catch {
      return { success: false, error: "Payment record not found" };
    }
  }

  // ── Utility Methods ─────────────────────────────────────────────────────

  /** Get SOL balance */
  async fetchSolBalance(account?: PublicKey): Promise<SDKResult<number>> {
    const target = account || this.provider.publicKey;
    if (!target) return { success: false, error: "No account" };
    try {
      const balance = await this.provider.connection.getBalance(target);
      return { success: true, data: balance / LAMPORTS_PER_SOL };
    } catch {
      return { success: false, error: "Failed to fetch SOL balance" };
    }
  }

  /** Generate a unique invoice ID */
  generateInvoiceId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `INV-${ts}-${rand}`.toUpperCase().substring(0, 36);
  }

  /** Generate metadata hash from invoice data */
  async generateMetadataHash(data: {
    clientName: string;
    clientEmail: string;
    description: string;
    lineItems: Array<{ description: string; quantity: number; rate: number }>;
  }): Promise<number[]> {
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(json);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    return Array.from(new Uint8Array(hashBuffer));
  }

  /** Get program ID */
  getProgramId(): PublicKey {
    return this.program.programId;
  }
}

export type {
  CreateInvoiceParams as MisthosCreateParams,
  PayInvoiceParams as MisthosPayParams,
};
