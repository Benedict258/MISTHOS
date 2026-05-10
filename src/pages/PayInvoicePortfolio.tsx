import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { ArrowLeft, CheckCircle2, ClipboardCopy, Download, ExternalLink, Globe2, Loader2, Wallet, CreditCard, Link2, Sparkles, FileText } from 'lucide-react';

import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateInvoiceReceiptHtml } from '@/lib/local-services';
import { buildExplorerUrl, getInvoiceRecord, recordInvoiceEvent, updateInvoiceRecord, uploadInvoiceReceipt, type InvoicePaymentState, type StoredInvoice } from '@/lib/invoice-store';
import { formatErrorMessage } from '@/lib/qa-utils';
import { type InvoiceStatus, type LineItem } from '@/lib/constants';

const TOKEN_MINTS: Record<string, string> = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  USDT: 'Es9vMFrzaCERmJfrF4H2wF7v4YfLhM1cBh73PvvrLpzT',
  SOL: 'So11111111111111111111111111111111111111112',
};

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  SOL: 9,
};

type PaymentMethod = 'wallet' | 'crosschain' | 'card' | 'x402';
type Stage = 'select' | 'details' | 'processing' | 'confirming' | 'confirmed';

type SharedInvoicePayload = {
  publicId?: string;
  invoiceId?: string;
  invoiceAddress?: string;
  clientName?: string;
  clientEmail?: string;
  companyName?: string;
  billingAddress?: string;
  title?: string;
  description?: string;
  lineItems?: LineItem[];
  amount?: number;
  tax?: number;
  discount?: number;
  token?: string;
  dueDate?: string;
  payoutWalletAddress?: string;
  paymentTerms?: string;
  paymentReference?: string;
  footerNote?: string;
};

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}> = [
  { id: 'wallet', label: 'Solana Wallet', icon: Wallet, desc: 'Pay directly from Phantom, Solflare, or any supported wallet.' },
  { id: 'crosschain', label: 'Cross-Chain (LI.FI)', icon: Globe2, desc: 'Clickable architecture shell for multi-chain routing.' },
  { id: 'card', label: 'Card Payment', icon: CreditCard, desc: 'Clickable architecture shell for card checkout.' },
  { id: 'x402', label: 'x402 Link', icon: Link2, desc: 'Clickable HTTP-native invoice settlement flow.' },
];

const decodeSharePayload = (value: string) => {
  try {
    return JSON.parse(decodeURIComponent(escape(window.atob(decodeURIComponent(value)))));
  } catch {
    return null;
  }
};

const tokenLabel = (token?: string) => token || 'USDC';

const paymentStateLabel: Record<InvoicePaymentState, string> = {
  not_paid: 'Not paid',
  in_escrow: 'Awaiting verification',
  paid: 'Paid',
  verified: 'Verified',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

const paymentStateTone: Record<InvoicePaymentState, string> = {
  not_paid: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  in_escrow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  paid: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  disputed: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  refunded: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value || 0);
  } catch {
    return `${value || 0} ${currency || 'USD'}`;
  }
};

const getFullName = (invoice?: StoredInvoice | null) => invoice?.clientName || 'Client';

const PayInvoicePortfolio: React.FC = () => {
  const { invoiceId = '' } = useParams<{ invoiceId: string }>();
  const location = useLocation();
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { toast } = useToast();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [stage, setStage] = useState<Stage>('select');
  const [invoice, setInvoice] = useState<StoredInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [txSignature, setTxSignature] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState('');

  const sharedInvoice = useMemo<StoredInvoice | null>(() => {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('d');
    if (!encoded) return null;

    const parsed = decodeSharePayload(encoded) as SharedInvoicePayload | null;
    if (!parsed) return null;

    const amount = Number(parsed.amount || 0);
    const items = parsed.lineItems?.length
      ? parsed.lineItems
      : [{ description: parsed.description || 'Invoice payment', quantity: 1, rate: amount, amount }];

    return {
      publicId: parsed.publicId || parsed.invoiceAddress || invoiceId || `inv-${Date.now()}`,
      id: parsed.invoiceId || invoiceId || 'INV',
      invoiceId: parsed.invoiceId || invoiceId || 'INV',
      invoiceAddress: parsed.invoiceAddress,
      clientName: parsed.clientName || 'Client',
      clientEmail: parsed.clientEmail || 'client@example.com',
      companyName: parsed.companyName,
      billingAddress: parsed.billingAddress,
      title: parsed.title || 'Invoice',
      description: parsed.description || items[0]?.description || 'Invoice payment',
      lineItems: items,
      amount,
      tax: Number(parsed.tax || 0),
      discount: Number(parsed.discount || 0),
      token: parsed.token || 'USDC',
      status: 'sent' as InvoiceStatus,
      dueDate: parsed.dueDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creator: parsed.payoutWalletAddress || 'Creator wallet',
      payer: undefined,
      issueDate: new Date().toISOString().slice(0, 10),
      creatorWalletAddress: parsed.payoutWalletAddress || '',
      payoutWalletAddress: parsed.payoutWalletAddress || '',
      paymentState: 'not_paid',
      paymentTerms: parsed.paymentTerms,
      paymentReference: parsed.paymentReference,
      footer_note: parsed.footerNote,
    };
  }, [invoiceId, location.search]);

  useEffect(() => {
    let cancelled = false;

    const loadInvoice = async () => {
      setLoading(true);
      try {
        const localInvoice = await getInvoiceRecord(invoiceId);
        const next = localInvoice || sharedInvoice;
        if (!cancelled) {
          setInvoice(next);
          if (next?.clientEmail) setPayerEmail(next.clientEmail);
        }
      } catch (error) {
        if (!cancelled) {
          toast({ title: 'Invoice load failed', description: formatErrorMessage(error), variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [invoiceId, sharedInvoice, toast]);

  const currentInvoice = invoice || sharedInvoice;

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: 'Copied', description: value });
  };

  const renderLineItems = (items: LineItem[]) => (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-background/60">
          <tr className="border-b border-border/60">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.description}-${index}`} className="border-b border-border/40 last:border-b-0">
              <td className="px-4 py-3 text-foreground">{item.description}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">{item.quantity}</td>
              <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(item.rate, currentInvoice?.token || 'USDC')}</td>
              <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(item.amount, currentInvoice?.token || 'USDC')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const downloadReceipt = () => {
    if (!currentInvoice) return;
    const html = generateInvoiceReceiptHtml({
      invoiceId: currentInvoice.invoiceId,
      creatorName: currentInvoice.creatorWalletAddress || currentInvoice.creator,
      payerName: currentInvoice.clientName,
      amount: currentInvoice.amount,
      currency: currentInvoice.token,
      dueDate: currentInvoice.dueDate,
      description: currentInvoice.description,
      status: currentInvoice.status,
      paymentDate: currentInvoice.paidAt,
    });

    const printWindow = window.open('', '_blank', 'width=980,height=780');
    if (!printWindow) {
      toast({ title: 'PDF export blocked', description: 'Allow popups and try again.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const payWithWallet = async () => {
    if (!currentInvoice) throw new Error('Invoice not loaded');
    if (!connected || !publicKey || !sendTransaction) throw new Error('Connect a wallet to pay this invoice');

    const recipient = new PublicKey(currentInvoice.payoutWalletAddress || currentInvoice.creatorWalletAddress || currentInvoice.creator);
    const currency = tokenLabel(currentInvoice.token);
    const decimals = TOKEN_DECIMALS[currency] || 6;
    const amountMinor = Math.round(currentInvoice.amount * Math.pow(10, decimals));
    const tx = new Transaction();

    if (currency === 'SOL') {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports: Math.round(currentInvoice.amount * LAMPORTS_PER_SOL),
        }),
      );
    } else {
      const tokenMint = new PublicKey(TOKEN_MINTS[currency] || TOKEN_MINTS.USDC);
      const senderAta = getAssociatedTokenAddressSync(tokenMint, publicKey);
      const recipientAta = getAssociatedTokenAddressSync(tokenMint, recipient);
      const recipientInfo = await connection.getAccountInfo(recipientAta);
      if (!recipientInfo) {
        tx.add(createAssociatedTokenAccountInstruction(publicKey, recipientAta, recipient, tokenMint));
      }
      tx.add(createTransferCheckedInstruction(senderAta, tokenMint, recipientAta, publicKey, amountMinor, decimals));
    }

    const signature = await sendTransaction(tx, connection);
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  };

  const simulateClickthroughPayment = async () => {
    if (!currentInvoice) throw new Error('Invoice not loaded');
    if (!receiptFile) throw new Error('Upload a receipt or payment proof for this payment method');
    const receipt = await uploadInvoiceReceipt(currentInvoice.publicId, receiptFile);
    await updateInvoiceRecord(currentInvoice.publicId, {
      status: 'paid',
      paymentState: 'paid',
      paymentMethod: selectedMethod || 'wallet',
      paymentReference,
      payerEmail,
      receiptUrl: receipt.url,
      receiptName: receipt.name,
      receiptMessage: paymentNote || paymentReference,
      paidAt: new Date().toISOString(),
    });
    await recordInvoiceEvent({
      publicId: currentInvoice.publicId,
      status: 'paid',
      paymentState: 'paid',
      note: `${selectedMethod?.toUpperCase()} payment proof submitted${paymentNote ? `: ${paymentNote}` : '.'}`,
    });
    setSummaryMessage('Payment proof was stored and the invoice is marked paid pending final review.');
    return '';
  };

  const handleContinue = async () => {
    if (!currentInvoice || !selectedMethod) return;
    setIsSubmitting(true);
    setStage('processing');
    try {
      if (selectedMethod === 'wallet') {
        const signature = await payWithWallet();
        const explorerUrl = buildExplorerUrl(signature);
        await updateInvoiceRecord(currentInvoice.publicId, {
          status: 'settled',
          paymentState: 'verified',
          txHash: signature,
          explorerUrl,
          paymentMethod: 'wallet',
          paymentReference,
          payerEmail,
          payer: publicKey?.toString(),
          paidAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        });
        await recordInvoiceEvent({
          publicId: currentInvoice.publicId,
          status: 'settled',
          paymentState: 'verified',
          note: 'Wallet payment confirmed and received by creator wallet.',
          txSignature: signature,
          explorerUrl,
        });
        setTxSignature(signature);
        setSummaryMessage('Direct wallet transfer confirmed and verified on the platform.');
      } else {
        await simulateClickthroughPayment();
        setSummaryMessage(`The ${selectedMethod} flow is clickable and tracked. The invoice is now visible as paid.`);
      }

      setStage('confirmed');
      toast({ title: 'Payment updated', description: 'Invoice status has been updated on the platform.' });
      const refreshed = await getInvoiceRecord(invoiceId);
      if (refreshed) setInvoice(refreshed);
    } catch (error) {
      setStage('details');
      toast({ title: 'Payment failed', description: formatErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentState = currentInvoice?.paymentState || 'not_paid';
  const txLink = currentInvoice?.txHash ? buildExplorerUrl(currentInvoice.txHash) : txSignature ? buildExplorerUrl(txSignature) : '';

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!currentInvoice) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar variant="app" />
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 text-center">
          <div className="glass-card p-8">
            <h1 className="text-2xl font-semibold">Invoice not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">The share link may be missing invoice data. Create a new invoice or check the public ID.</p>
            <Link to="/invoice/new" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create invoice</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar variant="app" />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <section className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Public invoice</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">{currentInvoice.title}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{currentInvoice.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={currentInvoice.status} size="md" />
                  <Badge variant="outline" className={`rounded-full ${paymentStateTone[paymentState]}`}>
                    {paymentStateLabel[paymentState]}
                  </Badge>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard label="Client" value={getFullName(currentInvoice)} helper={currentInvoice.clientEmail} />
                <InfoCard label="Amount" value={formatCurrency(currentInvoice.amount, currentInvoice.token)} helper={currentInvoice.token} accent />
                <InfoCard label="Due" value={currentInvoice.dueDate} helper={currentInvoice.paymentTerms || 'Net 14'} />
                <InfoCard label="Payout wallet" value={currentInvoice.payoutWalletAddress ? `${currentInvoice.payoutWalletAddress.slice(0, 6)}...${currentInvoice.payoutWalletAddress.slice(-4)}` : '-'} helper="Creator wallet" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Invoice details</h2>
              </div>
              {renderLineItems(currentInvoice.lineItems)}
              <div className="mt-4 space-y-2 rounded-2xl border border-border/60 bg-background/40 p-4 text-sm">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(currentInvoice.amount, currentInvoice.token)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Issue date</span><span>{currentInvoice.issueDate || currentInvoice.createdAt.slice(0, 10)}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Payment terms</span><span>{currentInvoice.paymentTerms || 'Net 14'}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><span>{paymentStateLabel[paymentState]}</span></div>
              </div>
            </motion.div>
          </section>

          <aside className="space-y-6">
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold">Payment actions</h2>
              <p className="mt-2 text-sm text-muted-foreground">The wallet route moves funds to the creator wallet. The other methods are clickable and tracked for the demo.</p>

              {stage === 'confirmed' ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="font-medium text-foreground">Payment confirmed</p>
                      <p className="text-xs text-muted-foreground">{summaryMessage}</p>
                    </div>
                  </div>
                  {txLink ? (
                    <a href={txLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                      <ExternalLink className="h-4 w-4" />
                      Open transaction on Solana Explorer
                    </a>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={downloadReceipt}>
                      <Download className="mr-2 h-4 w-4" />
                      Download receipt
                    </Button>
                    <Button variant="outline" onClick={() => copyToClipboard(window.location.href)}>
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      Copy page link
                    </Button>
                  </div>
                </div>
              ) : stage === 'processing' || stage === 'confirming' ? (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-5 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm font-medium">{stage === 'processing' ? 'Processing payment...' : 'Confirming on Solana...'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">The invoice is being updated and verified.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setSelectedMethod(method.id);
                          setStage('details');
                        }}
                        className={`rounded-2xl border p-4 text-left transition-colors ${selectedMethod === method.id ? 'border-primary/30 bg-primary/10' : 'border-border/60 bg-background/40 hover:border-border'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/60">
                            <method.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{method.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{method.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {stage === 'details' && selectedMethod ? (
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{selectedMethod}</p>
                      {selectedMethod === 'wallet' ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-muted-foreground">Connect your wallet and sign the transfer. The payment goes to the creator payout wallet.</p>
                          <div className="rounded-2xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">No payer wallet address field is required. The connected wallet is used when the transfer is signed.</div>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Payment reference (optional)" />
                            <Input value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="Payer email (optional)" />
                          </div>
                          <div className="flex justify-start">
                            <WalletMultiButton />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3">
                          <p className="text-sm text-muted-foreground">This button now opens an architecture shell and marks the invoice flow in Supabase so the UI is never empty.</p>
                          <Textarea value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} rows={3} placeholder="Optional note for the invoice activity log" />
                          <Input type="file" accept="image/*,application/pdf" onChange={(event) => setReceiptFile(event.target.files?.[0] || null)} />
                          <div className="rounded-2xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">LI.FI, card and x402 can be wired later without changing the invoice record model.</div>
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <Button onClick={() => void handleContinue()} disabled={isSubmitting} className="flex-1">
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          <span className="ml-2">Continue</span>
                        </Button>
                        <Button variant="outline" onClick={() => setStage('select')} disabled={isSubmitting}>Back</Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold">Invoice trail</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span>{currentInvoice.status}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground">Payment state</span>
                  <span>{paymentStateLabel[paymentState]}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground">Wallet destination</span>
                  <span className="max-w-[170px] truncate font-mono text-xs">{currentInvoice.payoutWalletAddress || currentInvoice.creatorWalletAddress}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground">Explorer</span>
                  <span className="text-xs">{txLink ? 'Available' : 'Pending'}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const InfoCard = ({ label, value, helper, accent = false }: { label: string; value: string; helper?: string; accent?: boolean }) => (
  <div className={`rounded-2xl border p-4 ${accent ? 'border-primary/20 bg-primary/10' : 'border-border/60 bg-background/40'}`}>
    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    <p className="mt-2 break-all text-lg font-semibold">{value}</p>
    {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
  </div>
);

export default PayInvoicePortfolio;
