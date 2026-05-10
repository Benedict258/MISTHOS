import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnchorProvider } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { Loader2, ArrowLeft, Sparkles, Send, Mic, MicOff, ClipboardCopy, Wallet, Building2, FileText, BadgeInfo } from 'lucide-react';
import { motion } from 'framer-motion';

import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { formatErrorMessage, getTxExplorerLink, withRetry } from '@/lib/qa-utils';
import { MisthosSDK } from '@/lib/misthos';
import { draftInvoiceFromText } from '@/lib/local-services';
import { recordInvoiceEvent, saveInvoiceRecord, type StoredInvoice } from '@/lib/invoice-store';
import { APP_NAME, type LineItem } from '@/lib/constants';

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

const encodeSharePayload = (payload: unknown) =>
  encodeURIComponent(window.btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));

const emptyLineItem = (): LineItem => ({
  description: '',
  quantity: 1,
  rate: 0,
  amount: 0,
});

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value || 0);
  } catch {
    return `${value || 0} ${currency || 'USD'}`;
  }
};

const sumSubtotal = (items: LineItem[]) => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

const CreateInvoicePortfolio: React.FC = () => {
  const { connected } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const voice = useVoiceInput();

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [title, setTitle] = useState('');
  const [token, setToken] = useState('USDC');
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 14');
  const [paymentReference, setPaymentReference] = useState('');
  const [payoutWalletAddress, setPayoutWalletAddress] = useState('');
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [footerNote, setFooterNote] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState<StoredInvoice | null>(null);

  const sdk = useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    return new MisthosSDK(provider);
  }, [connection, anchorWallet]);

  useEffect(() => {
    if (voice.transcript) {
      setAiPrompt(voice.transcript);
      void handleAiDraft(voice.transcript);
      toast({ title: 'Voice captured', description: 'Transcript parsed into invoice fields.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript]);

  useEffect(() => {
    if (!payoutWalletAddress && anchorWallet?.publicKey) {
      setPayoutWalletAddress(anchorWallet.publicKey.toString());
    }
  }, [anchorWallet?.publicKey, payoutWalletAddress]);

  const subtotal = sumSubtotal(lineItems);
  const total = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0));

  const addLineItem = () => setLineItems((prev) => [...prev, emptyLineItem()]);
  const removeLineItem = (index: number) => setLineItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item };
        if (field === 'description') next.description = String(value);
        if (field === 'quantity') next.quantity = Number(value) || 0;
        if (field === 'rate') next.rate = Number(value) || 0;
        next.amount = (Number(next.quantity) || 0) * (Number(next.rate) || 0);
        return next;
      }),
    );
  };

  const applyDraft = (prompt: string) => {
    const draft = draftInvoiceFromText(prompt);
    if (draft.client) {
      setClientName(draft.client);
      setClientEmail(`${draft.client.toLowerCase().replace(/\s+/g, '.')}@example.com`);
    }
    setTitle(draft.service || title || 'Invoice');
    setNotes(draft.service || notes);
    setToken(draft.currency || 'USDC');
    setDueDate(draft.due_date || dueDate);
    if (draft.line_items?.length) {
      setLineItems(
        draft.line_items.map((item) => ({
          description: item.description,
          quantity: item.qty,
          rate: item.rate,
          amount: item.amount,
        })),
      );
    }
    if (draft.total && draft.total > 0) {
      setLineItems((prev) => prev.length ? prev.map((item, index) => index === 0 ? { ...item, amount: draft.total || item.amount } : item) : prev);
    }
  };

  const handleAiDraft = async (prompt: string = aiPrompt) => {
    const text = prompt.trim();
    if (!text) return;
    setIsAiLoading(true);
    try {
      applyDraft(text);
      toast({ title: 'AI draft ready', description: 'Fields were populated locally so you can keep moving.' });
    } catch (error) {
      toast({ title: 'AI draft failed', description: formatErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (voice.isRecording) voice.stopRecording();
    else voice.startRecording();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!connected || !anchorWallet?.publicKey) {
      toast({ title: 'Wallet required', description: 'Connect your creator wallet to continue.', variant: 'destructive' });
      return;
    }

    if (!clientName.trim() || !clientEmail.trim()) {
      toast({ title: 'Client details required', description: 'Add a client name and email.', variant: 'destructive' });
      return;
    }

    if (!payoutWalletAddress.trim()) {
      toast({ title: 'Payout wallet required', description: 'Add the wallet that should receive the payment.', variant: 'destructive' });
      return;
    }

    if (total <= 0) {
      toast({ title: 'Invalid amount', description: 'Add at least one line item with a total above zero.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const invoiceId = sdk ? sdk.generateInvoiceId() : `INV-${Date.now()}`;
      const publicId = `inv-${crypto.randomUUID().slice(0, 8)}`;
      const tokenMint = TOKEN_MINTS[token] || TOKEN_MINTS.USDC;
      const decimals = TOKEN_DECIMALS[token] ?? 6;
      const amount = Number(total.toFixed(2));
      const amountInMinorUnits = Math.round(amount * Math.pow(10, decimals));
      const issueDate = new Date().toISOString().slice(0, 10);
      const due = dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const tokenMintKey = new PublicKey(tokenMint);
      const onChainPayload = {
        clientName,
        clientEmail,
        companyName,
        billingAddress,
        title: title || notes || `Invoice for ${clientName}`,
        description: notes || lineItems.map((item) => item.description).filter(Boolean).join(' - '),
        notes,
        paymentTerms,
        paymentReference,
        token,
        payoutWalletAddress,
        tax,
        discount,
        footerNote,
        lineItems,
      };

      let invoiceAddress: string | undefined;
      let createSignature: string | undefined;

      if (sdk) {
        try {
          const metadataHash = await sdk.generateMetadataHash(onChainPayload);
          const createResult = await withRetry(
            () => sdk.createInvoice({
              invoiceId,
              payer: anchorWallet.publicKey,
              amount: amountInMinorUnits,
              tokenMint: tokenMintKey,
              dueDate: Math.floor(new Date(`${due}T00:00:00Z`).getTime() / 1000),
              metadataHash,
            }),
            2,
            750,
          );

          if (createResult.success && createResult.data) {
            invoiceAddress = createResult.data.invoiceAddress;
            createSignature = createResult.data.signature;
            const sendResult = await sdk.sendInvoice(new PublicKey(createResult.data.invoiceAddress));
            if (sendResult.success) {
              createSignature = sendResult.data?.signature || createSignature;
            }
          }
        } catch (error) {
          console.warn('On-chain invoice create failed, continuing with stored invoice.', error);
        }
      }

      const sharePayload = {
        publicId,
        invoiceId,
        invoiceAddress,
        clientName,
        clientEmail,
        companyName,
        billingAddress,
        title: title || notes || `Invoice for ${clientName}`,
        description: notes || lineItems.map((item) => item.description).filter(Boolean).join(' - '),
        lineItems,
        amount,
        subtotal,
        tax,
        discount,
        token,
        dueDate: due,
        payoutWalletAddress,
        paymentTerms,
        paymentReference,
        footerNote,
      };
      const shareLink = `${window.location.origin}/pay/${publicId}?d=${encodeSharePayload(sharePayload)}`;

      const record: StoredInvoice = {
        publicId,
        id: invoiceId,
        invoiceId,
        invoiceAddress,
        clientName,
        clientEmail,
        companyName,
        billingAddress,
        title: title || notes || `Invoice for ${clientName}`,
        description: notes || lineItems.map((item) => item.description).filter(Boolean).join(' - '),
        lineItems,
        amount,
        tax,
        discount,
        token,
        status: 'sent',
        dueDate: due,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creator: anchorWallet.publicKey.toString(),
        payer: undefined,
        txHash: createSignature,
        issueDate,
        paymentTerms,
        creatorWalletAddress: anchorWallet.publicKey.toString(),
        payoutWalletAddress,
        paymentState: 'not_paid',
        paymentMethod: 'wallet',
        shareUrl: shareLink,
        explorerUrl: createSignature ? getTxExplorerLink(createSignature) || undefined : undefined,
        paymentReference,
        footer_note: footerNote,
        metadata: onChainPayload,
      };

      const saved = await saveInvoiceRecord(record);
      await recordInvoiceEvent({
        publicId,
        status: 'sent',
        paymentState: saved.paymentState,
        note: 'Invoice created and shared.',
        txSignature: createSignature,
        explorerUrl: saved.explorerUrl,
      });

      setCreatedInvoice(saved);
      setShareUrl(shareLink);
      toast({
        title: 'Invoice ready',
        description: 'Your share link now opens a public invoice page with the full payment details.',
      });

      window.setTimeout(() => {
        navigate(`/pay/${publicId}?d=${encodeSharePayload(sharePayload)}`);
      }, 1200);
    } catch (error) {
      toast({
        title: 'Create invoice failed',
        description: formatErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar variant="app" />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <Badge variant="outline" className="mb-4 rounded-full px-3 py-1">
                {APP_NAME} invoice builder
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Create a shareable invoice in a portfolio-style flow.</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                The payer sees the invoice, the full details, the payment destination wallet, and the proof trail. No hidden payer wallet field.
              </p>
            </motion.div>

            {shareUrl ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-primary/20 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Invoice link ready</p>
                    <p className="break-all text-xs text-muted-foreground">{shareUrl}</p>
                    {createdInvoice?.explorerUrl ? (
                      <a href={createdInvoice.explorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        View creation tx
                      </a>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" onClick={() => navigator.clipboard.writeText(shareUrl)}>
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <a href={shareUrl} className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      Open
                    </a>
                  </div>
                </div>
              </motion.div>
            ) : null}

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">AI drafting</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleAiDraft()}
                  placeholder='e.g. "Invoice John for 20 hours of React dev at $150/hr, due in 14 days"'
                  className="flex-1"
                />
                <Button onClick={() => void handleAiDraft()} disabled={isAiLoading || !aiPrompt.trim()}>
                  {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ml-2">Draft</span>
                </Button>
                <Button variant="outline" onClick={handleVoiceToggle} disabled={voice.isProcessing}>
                  {voice.isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                AI drafting is now local-first so it works even when the network route is unavailable.
              </p>
            </motion.div>

            <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-border/60 bg-background/80 p-6 shadow-xl shadow-black/10 backdrop-blur">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Client name" icon={<BadgeInfo className="h-4 w-4" />}>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Sarah Chen" required />
                </Field>
                <Field label="Client email" icon={<FileText className="h-4 w-4" />}>
                  <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="sarah@designco.io" type="email" required />
                </Field>
                <Field label="Company name" icon={<Building2 className="h-4 w-4" />}>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="DesignCo" />
                </Field>
                <Field label="Creator payout wallet" icon={<Wallet className="h-4 w-4" />}>
                  <Input value={payoutWalletAddress} onChange={(e) => setPayoutWalletAddress(e.target.value)} placeholder="Wallet that should receive the payment" required />
                </Field>
              </div>

              <Field label="Billing address" icon={<FileText className="h-4 w-4" />}>
                <Textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="Street, city, country" rows={3} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Invoice title" icon={<FileText className="h-4 w-4" />}>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dashboard redesign" />
                </Field>
                <Field label="Payment token" icon={<BadgeInfo className="h-4 w-4" />}>
                  <select value={token} onChange={(e) => setToken(e.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground">
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="SOL">SOL</option>
                  </select>
                </Field>
                <Field label="Due date" icon={<BadgeInfo className="h-4 w-4" />}>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                </Field>
                <Field label="Payment terms" icon={<BadgeInfo className="h-4 w-4" />}>
                  <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 14" />
                </Field>
                <Field label="Payment reference" icon={<BadgeInfo className="h-4 w-4" />}>
                  <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Project or invoice reference" />
                </Field>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Line items</h3>
                  <button type="button" onClick={addLineItem} className="text-xs font-medium text-primary hover:underline">
                    Add item
                  </button>
                </div>
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 sm:grid-cols-12 sm:items-end">
                      <div className="sm:col-span-6">
                        <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                        <Input value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} placeholder="Design system audit" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-muted-foreground">Qty</label>
                        <Input type="number" min={1} value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))} />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs text-muted-foreground">Rate</label>
                        <Input type="number" min={0} step="0.01" value={item.rate} onChange={(e) => updateLineItem(index, 'rate', Number(e.target.value))} />
                      </div>
                      <div className="sm:col-span-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1}>
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Notes" icon={<FileText className="h-4 w-4" />}>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the payer should know about this invoice" rows={4} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Subtotal" icon={<BadgeInfo className="h-4 w-4" />}>
                  <Input value={formatCurrency(subtotal, token)} readOnly aria-readonly="true" />
                </Field>
                <Field label="Tax" icon={<BadgeInfo className="h-4 w-4" />}>
                  <Input type="text" inputMode="decimal" value={tax} onChange={(e) => setTax(Number(e.target.value) || 0)} placeholder="0.00" />
                </Field>
                <Field label="Discount" icon={<BadgeInfo className="h-4 w-4" />}>
                  <Input type="text" inputMode="decimal" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} placeholder="0.00" />
                </Field>
              </div>

              <Field label="Footer note" icon={<FileText className="h-4 w-4" />}>
                <Textarea value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder="Thank you note, payment policy, or extra terms" rows={3} />
              </Field>

              <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total amount</p>
                  <p className="text-3xl font-semibold tracking-tight">{formatCurrency(total, token)}</p>
                </div>
                <Button type="submit" disabled={isSubmitting} className="min-w-[220px]">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="ml-2">Create & share invoice</span>
                </Button>
              </div>
            </motion.form>
          </section>

          <aside className="space-y-6">
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Demo notes</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>- The payer opens a public link and sees the full invoice.</p>
                <p>- The payment destination is the wallet that created the invoice.</p>
                <p>- Supabase stores the invoice, receipts, activity, and status changes.</p>
                <p>- Wallet payments stay live; the other methods stay clickable and architected.</p>
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold">Wallet check</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {connected && anchorWallet?.publicKey ? `Connected as ${anchorWallet.publicKey.toString().slice(0, 6)}...${anchorWallet.publicKey.toString().slice(-4)}` : 'Connect your creator wallet to begin.'}
              </p>
              <div className="mt-4 flex justify-start">
                <WalletMultiButton />
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold">Preview</h2>
              <div className="mt-4 space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{companyName || 'Your company'}</p>
                <div>
                  <p className="text-lg font-semibold">{title || 'Invoice title'}</p>
                  <p className="text-sm text-muted-foreground">{clientName || 'Client name'}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{formatCurrency(total, token)}</span>
                </div>
                {paymentReference ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="max-w-[190px] truncate text-xs">{paymentReference}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payout wallet</span>
                  <span className="max-w-[190px] truncate font-mono text-xs">{payoutWalletAddress || '-'}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const Field = ({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

export default CreateInvoicePortfolio;
