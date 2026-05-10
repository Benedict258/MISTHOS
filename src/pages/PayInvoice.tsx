import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Zap, Wallet, Globe, CreditCard, Link2, CheckCircle2, Shield, Clock, Download, ExternalLink, ArrowRight, Copy, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { DEMO_INVOICES, type Invoice, type InvoiceStatus } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { MisthosSDK, getInvoiceStatusString } from '@/lib/misthos';
import { formatErrorMessage, getTxExplorerLink, withRetry } from '@/lib/qa-utils';

type PaymentMethod = 'wallet' | 'crosschain' | 'card' | 'x402';
type PaymentStage = 'select' | 'details' | 'processing' | 'confirming' | 'confirmed';

const paymentMethods = [
  { id: 'wallet' as const, label: 'Solana Wallet', icon: Wallet, desc: 'Pay with SOL or SPL tokens directly' },
  { id: 'crosschain' as const, label: 'Cross-Chain (LI.FI)', icon: Globe, desc: 'Pay from ETH, Base, Polygon, 60+ chains' },
  { id: 'card' as const, label: 'Card Payment', icon: CreditCard, desc: 'Visa/Mastercard — no wallet needed' },
  { id: 'x402' as const, label: 'x402 Link', icon: Link2, desc: 'HTTP-native one-click payment' },
];

const PayInvoice: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [stage, setStage] = useState<PaymentStage>('select');
  const [txHash, setTxHash] = useState('5xKj8mPq...r9WnZ2v');
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [onChainInvoice, setOnChainInvoice] = useState<Invoice | null>(null);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);

  const demoInvoice = DEMO_INVOICES.find((inv) => inv.id === invoiceId) || DEMO_INVOICES[1];

  const sdk = React.useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    return new MisthosSDK(provider);
  }, [connection, anchorWallet]);

  const onChainInvoiceAddress = React.useMemo(() => {
    if (!invoiceId) return null;
    try {
      return new PublicKey(invoiceId);
    } catch {
      return null;
    }
  }, [invoiceId]);

  useEffect(() => {
    const fetchOnChainInvoice = async () => {
      if (!sdk || !onChainInvoiceAddress) return;

      setIsInvoiceLoading(true);
      try {
        const result = await sdk.fetchInvoice(onChainInvoiceAddress);
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Invoice not found on-chain');
        }

        const tokenMint = result.data.tokenMint.toString();
        const decimals = tokenMint === '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' || tokenMint === 'Es9vMFrzaCERmJfrF4H2wF7v4YfLhM1cBh73PvvrLpzT' ? 6 : 9;
        const amount = Number(result.data.amount.toString()) / Math.pow(10, decimals);
        const statusRaw = getInvoiceStatusString(result.data.status);
        const status = (statusRaw === 'draft' || statusRaw === 'sent' || statusRaw === 'viewed' || statusRaw === 'paid' || statusRaw === 'settled' || statusRaw === 'disputed' || statusRaw === 'refunded'
          ? statusRaw
          : 'sent') as InvoiceStatus;

        setOnChainInvoice({
          id: onChainInvoiceAddress.toString(),
          clientName: `Payer ${result.data.payer.toString().slice(0, 6)}...${result.data.payer.toString().slice(-4)}`,
          clientEmail: 'onchain@payer.local',
          description: `On-chain invoice ${result.data.invoiceId}`,
          lineItems: [
            {
              description: `On-chain invoice ${result.data.invoiceId}`,
              quantity: 1,
              rate: amount,
              amount,
            },
          ],
          amount,
          token: tokenMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'USDC',
          status,
          dueDate: new Date(Number(result.data.dueDate.toString()) * 1000).toISOString().slice(0, 10),
          createdAt: new Date(Number(result.data.createdAt.toString()) * 1000).toISOString().slice(0, 10),
          paidAt: Number(result.data.paidAt.toString()) > 0
            ? new Date(Number(result.data.paidAt.toString()) * 1000).toISOString().slice(0, 10)
            : undefined,
          creator: result.data.creator.toString(),
          payer: result.data.payer.toString(),
        });
      } catch (error) {
        const friendlyMsg = formatErrorMessage(error);
        toast({
          title: 'On-Chain Invoice Load Failed',
          description: friendlyMsg,
        });
      } finally {
        setIsInvoiceLoading(false);
      }
    };

    fetchOnChainInvoice();
  }, [sdk, onChainInvoiceAddress, toast]);

  const invoice = onChainInvoice || demoInvoice;

  // Mock wallet connection handler
  const handleWalletConnect = (wallet: string) => {
    setConnectedWallet(wallet);
    toast({ title: 'Wallet Connected', description: `${wallet} connected. Ready to pay.` });
  };

  // Mock LI.FI cross-chain payment handler
  const handleCrossChainPay = () => {
    setStage('processing');
    toast({ title: 'LI.FI Transaction Initiated', description: 'Bridging tokens to Solana...' });
    setTimeout(() => setStage('confirming'), 1500);
    setTimeout(() => {
      setStage('confirmed');
      toast({ title: 'Payment Confirmed', description: `${invoice.amount.toLocaleString()} ${invoice.token} bridged and sent to escrow on Solana.` });
    }, 3200);
  };

  // Mock Coinflow card payment handler
  const handleCoinflowPay = () => {
    setStage('processing');
    toast({ title: 'Processing Card Payment', description: 'Verifying card details...' });
    setTimeout(() => setStage('confirming'), 2000);
    setTimeout(() => {
      setStage('confirmed');
      toast({ title: 'Payment Confirmed', description: `Card charged and ${invoice.amount.toLocaleString()} ${invoice.token} received in escrow.` });
    }, 3500);
  };

  // Mock x402 payment handler
  const handleX402Pay = () => {
    setStage('processing');
    toast({ title: 'x402 Payment Initiated', description: 'Waiting for wallet confirmation...' });
    setTimeout(() => setStage('confirming'), 1800);
    setTimeout(() => {
      setStage('confirmed');
      toast({ title: 'Payment Confirmed', description: `x402 transaction confirmed. ${invoice.amount.toLocaleString()} ${invoice.token} in escrow.` });
    }, 3200);
  };

  const handlePay = async () => {
    if (!selectedMethod) return;

    if (onChainInvoiceAddress && sdk) {
      setIsPaying(true);
      setStage('processing');
      try {
        const paymentMethodMap: Record<PaymentMethod, number> = {
          wallet: 0,
          crosschain: 1,
          card: 2,
          x402: 3,
        };

        const payResult = selectedMethod === 'x402'
          ? await withRetry(
              () => sdk.payX402(onChainInvoiceAddress, 3),
              3,
              1000
            )
          : await withRetry(
              () => sdk.payInvoice({
                invoiceAddress: onChainInvoiceAddress,
                paymentMethod: paymentMethodMap[selectedMethod],
              }),
              3,
              1000
            );

        if (!payResult.success || !payResult.data) {
          throw new Error(payResult.error || 'Payment failed on-chain');
        }

        setStage('confirming');
        setTimeout(() => {
          setTxHash(payResult.data!.signature);
          setStage('confirmed');
          const explorerLink = getTxExplorerLink(payResult.data!.signature);
          toast({
            title: 'On-Chain Payment Confirmed',
            description: `Confirmed. View Tx: ${payResult.data!.signature.slice(0, 12)}...`,
          });
        }, 900);
        return;
      } catch (error) {
        const friendlyMsg = formatErrorMessage(error);
        setStage('details');
        toast({
          title: 'On-Chain Payment Failed',
          description: friendlyMsg,
        });
        return;
      } finally {
        setIsPaying(false);
      }
    }
    
    // Route to method-specific handlers
    switch (selectedMethod) {
      case 'crosschain':
        handleCrossChainPay();
        break;
      case 'card':
        handleCoinflowPay();
        break;
      case 'x402':
        handleX402Pay();
        break;
      case 'wallet':
        if (connectedWallet) {
          setStage('processing');
          setTimeout(() => setStage('confirming'), 1200);
          setTimeout(() => {
            setStage('confirmed');
            toast({ title: 'Payment Confirmed', description: `${invoice.amount.toLocaleString()} ${invoice.token} sent to escrow on Solana.` });
          }, 2800);
        } else {
          toast({ title: 'Error', description: 'Please connect a wallet first.' });
        }
        break;
      default:
        break;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const handleDownloadReceipt = () => {
    toast({ title: 'Receipt Downloaded', description: 'PDF proof receipt with on-chain data saved.' });
  };

  // Payment method detail panels
  const renderMethodDetails = () => {
    if (!selectedMethod || stage !== 'details') return null;

    switch (selectedMethod) {
      case 'wallet':
        return (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card p-5 mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Connect Solana Wallet</h4>
            <p className="text-xs text-muted-foreground mb-4">Connect your Phantom, Backpack, or Solflare wallet to pay directly in {invoice.token}.</p>
            {connectedWallet ? (
              <div className="p-4 rounded-lg bg-status-paid/10 border border-status-paid/30 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-status-paid" />
                  <span className="text-sm font-medium text-status-paid">{connectedWallet} Connected</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Phantom</p>
                      <p className="text-xs text-muted-foreground">Recommended</p>
                    </div>
                  </div>
                  <button onClick={() => handleWalletConnect('Phantom')} className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Connect</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Backpack</p>
                      <p className="text-xs text-muted-foreground">Multi-chain</p>
                    </div>
                  </div>
                  <button onClick={() => handleWalletConnect('Backpack')} className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-muted-foreground border border-border hover:bg-surface-hover transition-colors">Connect</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Solflare</p>
                      <p className="text-xs text-muted-foreground">Hardware support</p>
                    </div>
                  </div>
                  <button onClick={() => handleWalletConnect('Solflare')} className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-muted-foreground border border-border hover:bg-surface-hover transition-colors">Connect</button>
                </div>
              </div>
            )}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground">Transfer: <span className="font-mono font-medium text-foreground">{invoice.amount.toLocaleString()} {invoice.token}</span> to escrow vault PDA</p>
            </div>
          </motion.div>
        );
      case 'crosschain':
        return (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card p-5 mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-1">Cross-Chain Payment via LI.FI</h4>
            <p className="text-xs text-muted-foreground mb-4">Pay from any chain. LI.FI routes and bridges to Solana automatically.</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Source Chain</label>
                <select className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option>Ethereum</option>
                  <option>Base</option>
                  <option>Polygon</option>
                  <option>Arbitrum</option>
                  <option>Optimism</option>
                  <option>Avalanche</option>
                  <option>BSC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Pay With</label>
                <select className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                  <option>ETH</option>
                  <option>USDC</option>
                  <option>USDT</option>
                  <option>MATIC</option>
                  <option>DAI</option>
                </select>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Route</span>
                <span className="text-foreground font-medium">Ethereum → Solana (via Wormhole)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Est. fees</span>
                <span className="text-foreground font-medium">~$2.40</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Slippage</span>
                <span className="text-foreground font-medium">0.3%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Est. arrival</span>
                <span className="text-foreground font-medium">~2 min</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Powered by LI.FI — 60+ chains, 20+ bridges
            </p>
          </motion.div>
        );
      case 'card':
        return (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card p-5 mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-1">Card Payment via Coinflow</h4>
            <p className="text-xs text-muted-foreground mb-4">Pay with Visa or Mastercard. No wallet needed. Coinflow converts to {invoice.token} on Solana.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Card Number</label>
                <input type="text" placeholder="4242 4242 4242 4242" className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Expiry</label>
                  <input type="text" placeholder="MM/YY" className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">CVC</label>
                  <input type="text" placeholder="123" className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Billing Email</label>
                <input type="email" placeholder="you@company.com" className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">You pay</span>
                <span className="text-foreground font-medium">${invoice.amount.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">Receives</span>
                <span className="text-foreground font-medium">{invoice.amount.toLocaleString()} {invoice.token} on Solana</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <Shield className="h-3 w-3" /> KYC/AML handled by Coinflow. PCI compliant. Misthos never sees your card data.
            </p>
          </motion.div>
        );
      case 'x402':
        return (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card p-5 mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-1">x402 HTTP-Native Payment</h4>
            <p className="text-xs text-muted-foreground mb-4">One-click payment via the x402 protocol. Compatible wallets auto-detect the payment header.</p>
            <div className="p-4 rounded-lg bg-secondary border border-border">
              <p className="text-xs text-muted-foreground mb-2">Payment URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-foreground bg-muted/50 px-3 py-2 rounded-md border border-border overflow-hidden text-ellipsis">
                  misthos.app/pay/x402/{invoice.id}
                </code>
                <button onClick={() => handleCopy(`misthos.app/pay/x402/${invoice.id}`)} className="p-2 rounded-md border border-border text-muted-foreground hover:bg-surface-hover transition-colors flex-shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Program</span>
                <span className="font-mono text-foreground text-[10px]">MsTH...k9Xp</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Escrow Vault</span>
                <span className="font-mono text-foreground text-[10px]">Esc7...mR2v</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-foreground font-medium">{invoice.amount.toLocaleString()} {invoice.token}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Token Mint</span>
                <span className="font-mono text-foreground text-[10px]">EPjF...4zCq</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
              <Link2 className="h-3 w-3" /> x402 protocol — HTTP-native payment standard on Solana
            </p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal navbar for payer */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">Misthos</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Escrow-Protected Payment
          </div>
        </div>
      </nav>

      <main className="py-10 px-4 sm:px-6 mx-auto max-w-3xl">
        {isInvoiceLoading && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading on-chain invoice data...
          </div>
        )}
        {stage === 'confirmed' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 text-center"
          >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-status-paid/10 flex items-center justify-center mb-5">
              <CheckCircle2 className="h-8 w-8 text-status-paid" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Payment Confirmed</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {invoice.amount.toLocaleString()} {invoice.token} has been sent to the escrow vault on Solana.
            </p>

            {/* Tx details */}
            <div className="glass-card p-4 text-left mb-6 mx-auto max-w-sm">
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className="flex items-center gap-1.5 text-status-paid font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-paid animate-pulse" />
                    Confirmed
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tx Hash</span>
                  <a href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="font-mono text-primary hover:underline flex items-center gap-1">
                    {txHash.length > 20 ? `${txHash.slice(0, 8)}...${txHash.slice(-8)}` : txHash} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium text-foreground">{invoice.amount.toLocaleString()} {invoice.token}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Finality</span>
                  <span className="font-medium text-foreground">~400ms</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Next</span>
                  <span className="text-muted-foreground">Awaiting creator escrow release</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:opacity-90 transition-opacity"
              >
                <Download className="h-4 w-4" />
                Download PDF Receipt
              </button>
              <a
                href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View on Solana Explorer
              </a>
            </div>
          </motion.div>
        ) : stage === 'processing' || stage === 'confirming' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-10 text-center"
          >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {stage === 'processing' ? 'Processing Payment...' : 'Confirming on Solana...'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {stage === 'processing'
                ? 'Submitting transaction to the Solana network.'
                : 'Waiting for block confirmation. This takes ~400ms.'}
            </p>
            {/* Real-time status steps */}
            <div className="mx-auto max-w-xs space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-status-paid" />
                <span className="text-xs text-foreground">Payment initiated</span>
              </div>
              <div className="flex items-center gap-3">
                {stage === 'confirming' ? (
                  <CheckCircle2 className="h-4 w-4 text-status-paid" />
                ) : (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                )}
                <span className="text-xs text-foreground">Transaction submitted</span>
              </div>
              <div className="flex items-center gap-3">
                {stage === 'confirming' ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border" />
                )}
                <span className={`text-xs ${stage === 'confirming' ? 'text-foreground' : 'text-muted-foreground'}`}>Block confirmation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border border-border" />
                <span className="text-xs text-muted-foreground">Escrow locked</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Invoice Preview */}
            <div className="glass-card p-6 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">{invoice.id}</p>
                  <h2 className="text-lg font-bold text-foreground mt-0.5">{invoice.description}</h2>
                </div>
                <StatusBadge status="sent" size="md" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">Creator</p>
                  <p className="text-xs text-muted-foreground font-mono">{invoice.creator}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount Due</p>
                  <p className="text-lg font-bold text-primary mt-0.5">{invoice.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{invoice.token}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{invoice.dueDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{invoice.clientName}</p>
                </div>
              </div>

              {/* Line items */}
              <div className="border-t border-border pt-4">
                {invoice.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5">
                    <span className="text-muted-foreground">{item.description} ({item.quantity}x)</span>
                    <span className="font-medium text-foreground">${item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-3 mt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary">${invoice.amount.toLocaleString()} {invoice.token}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {stage === 'details' ? 'Payment Details' : 'Select Payment Method'}
              </h3>

              {stage === 'select' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setStage('details');
                      }}
                      className="p-4 rounded-lg border border-border bg-secondary hover:bg-surface-hover hover:border-primary/20 text-left transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-muted group-hover:bg-primary/10 transition-colors">
                          <method.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-secondary-foreground group-hover:text-foreground transition-colors">{method.label}</p>
                          <p className="text-xs text-muted-foreground">{method.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {stage === 'details' && (
                <>
                  {/* Back to method selection */}
                  <button onClick={() => { setStage('select'); setSelectedMethod(null); }} className="text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                    &larr; Change payment method
                  </button>

                  <AnimatePresence mode="wait">
                    {renderMethodDetails()}
                  </AnimatePresence>

                  <button
                    onClick={handlePay}
                    disabled={isPaying}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:shadow-amber hover:opacity-90 transition-all"
                  >
                    {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isPaying ? 'Submitting Transaction...' : `Pay ${invoice.amount.toLocaleString()} ${invoice.token}`}
                  </button>
                </>
              )}

              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Escrow-protected</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~400ms finality</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> On Solana</span>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default PayInvoice;
