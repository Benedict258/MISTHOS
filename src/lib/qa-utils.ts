/**
 * Utility functions for Phase 4 QA & Polish
 * Handles Devnet explorer links, error formatting, and RPC retries
 */

export const DEVNET_EXPLORER = 'https://explorer.solana.com';

/**
 * Generate Devnet explorer link for transaction
 */
export function getTxExplorerLink(txSignature: string): string {
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(txSignature) || txSignature.startsWith('demo-')) return '';
  return `${DEVNET_EXPLORER}/tx/${txSignature}?cluster=devnet`;
}

/**
 * Format user-friendly error messages from SDK/RPC errors
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    // Common RPC errors
    if (msg.includes('insufficient lamports')) return 'Wallet balance too low. Need SOL for transaction fees.';
    if (msg.includes('Account does not exist')) return 'Invoice not found on-chain. Check the address.';
    if (msg.includes('timeout')) return 'Network timeout. Check your connection and try again.';
    if (msg.includes('Invalid account')) return 'Invalid wallet account. Reconnect and try again.';
    if (msg.includes('Blockhash not found')) return 'Network busy. Please try again.';
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) return 'Network connection error. Check your internet and Devnet RPC.';
    // Generic but clean fallback
    return msg.length > 100 ? msg.slice(0, 100) + '...' : msg;
  }
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Friendly message for wallet connection errors
 */
export function getWalletErrorMessage(error: unknown): string {
  const msg = formatErrorMessage(error);
  if (msg.includes('Wallet not connected')) return 'Please connect your Solflare wallet to continue.';
  if (msg.includes('denied') || msg.includes('rejected')) return 'Transaction was rejected. Please approve in your wallet.';
  return msg;
}

/**
 * Format transaction signature for display (shortened with ellipsis)
 */
export function formatTxSignature(sig: string): string {
  if (sig.length <= 16) return sig;
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
}

/**
 * Retry logic for RPC calls (exponential backoff, max 3 attempts)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxAttempts - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}
