import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCopy, Download, ExternalLink, FileText, Shield, Wallet } from 'lucide-react';

import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateInvoiceReceiptHtml } from '@/lib/local-services';
import { buildExplorerUrl, getInvoiceRecord, type InvoicePaymentState, type StoredInvoice } from '@/lib/invoice-store';

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

const decodeSharePayload = (value: string) => {
  try {
    return JSON.parse(decodeURIComponent(escape(window.atob(decodeURIComponent(value)))));
  } catch {
    return null;
  }
};

const InvoiceDetailPortfolio: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<StoredInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  const sharedInvoice = useMemo<StoredInvoice | null>(() => {
    const encoded = new URLSearchParams(location.search).get('d');
    if (!encoded) return null;
    const parsed = decodeSharePayload(encoded);
    if (!parsed) return null;
    return {
      publicId: parsed.publicId || parsed.invoiceAddress || id || `inv-${Date.now()}`,
      id: parsed.invoiceId || id || 'INV',
      invoiceId: parsed.invoiceId || id || 'INV',
      invoiceAddress: parsed.invoiceAddress,
      clientName: parsed.clientName || 'Client',
      clientEmail: parsed.clientEmail || 'client@example.com',
      companyName: parsed.companyName,
      billingAddress: parsed.billingAddress,
      title: parsed.title || 'Invoice',
      description: parsed.description || 'Invoice details',
      lineItems: parsed.lineItems || [],
      amount: Number(parsed.amount || 0),
      tax: Number(parsed.tax || 0),
      discount: Number(parsed.discount || 0),
      token: parsed.token || 'USDC',
      status: 'sent',
      dueDate: parsed.dueDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creator: parsed.payoutWalletAddress || 'Creator wallet',
      issueDate: new Date().toISOString().slice(0, 10),
      creatorWalletAddress: parsed.payoutWalletAddress || '',
      payoutWalletAddress: parsed.payoutWalletAddress || '',
      paymentState: 'not_paid',
      paymentTerms: parsed.paymentTerms,
      paymentReference: parsed.paymentReference,
      footer_note: parsed.footerNote,
    };
  }, [id, location.search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const stored = await getInvoiceRecord(id);
        if (!cancelled) setInvoice(stored || sharedInvoice);
      } catch {
        if (!cancelled) setInvoice(sharedInvoice);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, sharedInvoice]);

  const current = invoice || sharedInvoice;

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: 'Copied', description: value });
  };

  const downloadPdf = () => {
    if (!current) return;
    const html = generateInvoiceReceiptHtml({
      invoiceId: current.invoiceId,
      creatorName: current.creatorWalletAddress || current.creator,
      payerName: current.clientName,
      amount: current.amount,
      currency: current.token,
      dueDate: current.dueDate,
      description: current.description,
      status: current.status,
      paymentDate: current.paidAt,
    });

    const w = window.open('', '_blank', 'width=980,height=780');
    if (!w) {
      toast({ title: 'PDF export blocked', description: 'Allow popups and try again.', variant: 'destructive' });
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 250);
  };

  if (loading) return <div className="min-h-screen bg-background" />;

  if (!current) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar variant="app" />
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4">
          <div className="glass-card p-8 text-center">
            <h1 className="text-2xl font-semibold">Invoice not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">Create a new invoice or open the public payment link.</p>
            <Link to="/invoice/new" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create invoice</Link>
          </div>
        </div>
      </div>
    );
  }

  const txLink = current.txHash ? buildExplorerUrl(current.txHash) : '';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar variant="app" />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Invoice proof</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{current.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{current.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={current.status} size="md" />
              <Badge variant="outline" className={`rounded-full ${paymentStateTone[current.paymentState]}`}>{paymentStateLabel[current.paymentState]}</Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Client" value={current.clientName} helper={current.clientEmail} />
            <Card label="Amount" value={formatCurrency(current.amount, current.token)} helper={current.token} />
            <Card label="Creator wallet" value={current.creatorWalletAddress ? `${current.creatorWalletAddress.slice(0, 6)}...${current.creatorWalletAddress.slice(-4)}` : 'Pending'} helper="Payout destination" />
            <Card label="Due date" value={current.dueDate} helper={current.paymentTerms || 'Net 14'} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Line items</h2>
                </div>
                <div className="space-y-2">
                  {current.lineItems.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatCurrency(item.amount, current.token)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Payment trail</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Status</span><span>{current.status}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Payment state</span><span>{paymentStateLabel[current.paymentState]}</span></div>
                  {current.paymentReference ? <div className="flex items-center justify-between"><span className="text-muted-foreground">Reference</span><span>{current.paymentReference}</span></div> : null}
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Receipt</span><span>{current.receiptUrl ? 'Stored' : 'Pending'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Explorer</span><span>{txLink ? 'Available' : 'Pending'}</span></div>
                </div>
                {current.receiptUrl ? (
                  <a href={current.receiptUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <ExternalLink className="h-4 w-4" />
                    Open stored receipt
                  </a>
                ) : null}
                {current.receiptMessage ? <p className="mt-3 text-sm text-muted-foreground">{current.receiptMessage}</p> : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <h2 className="text-sm font-semibold">Actions</h2>
                <p className="mt-2 text-sm text-muted-foreground">This page can be shared with anyone. They see the full invoice, then pay from the payment page.</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button onClick={downloadPdf}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
                  {txLink ? (
                    <a href={txLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm hover:bg-background/60">
                      <ExternalLink className="mr-2 h-4 w-4" />Open explorer
                    </a>
                  ) : null}
                  <Button variant="outline" onClick={() => void copy(window.location.href)}><ClipboardCopy className="mr-2 h-4 w-4" />Copy share link</Button>
                </div>
              </div>

              {current.payoutWalletAddress ? (
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4 text-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Creator wallet</h2>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground break-all">{current.payoutWalletAddress}</p>
                </div>
              ) : null}
              {current.footer_note ? (
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
                  {current.footer_note}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Card = ({ label, value, helper }: { label: string; value: string; helper?: string }) => (
  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    <p className="mt-2 break-all text-lg font-semibold">{value}</p>
    {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
  </div>
);

export default InvoiceDetailPortfolio;
