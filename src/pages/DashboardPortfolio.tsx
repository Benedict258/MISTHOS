import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowUpRight, Copy, ExternalLink, FileText, Loader2, Plus, Shield, Wallet, CheckCircle2, Clock3 } from 'lucide-react';

import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { buildExplorerUrl, getActivityFeed, getInvoiceStats, getTopClients, isFullSignature, listInvoiceRecords, type StoredInvoice } from '@/lib/invoice-store';

const paymentTone = (state: StoredInvoice['paymentState']) => {
  switch (state) {
    case 'verified':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'paid':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'in_escrow':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'disputed':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'refunded':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    default:
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  }
};

const DashboardPortfolio: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getInvoiceStats>> | null>(null);
  const [topClients, setTopClients] = useState<Awaited<ReturnType<typeof getTopClients>>>([]);
  const [activity, setActivity] = useState<Awaited<ReturnType<typeof getActivityFeed>>>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [invoiceRows, statRows, clientRows, feedRows] = await Promise.all([
        listInvoiceRecords(),
        getInvoiceStats(),
        getTopClients(),
        getActivityFeed(),
      ]);
      setInvoices(invoiceRows);
      setStats(statRows);
      setTopClients(clientRows);
      setActivity(feedRows);
    } catch (error) {
      toast({ title: 'Dashboard sync failed', description: error instanceof Error ? error.message : 'Unable to load invoices.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const blankState = !loading && invoices.length === 0;
  const explorerable = (signature?: string) => isFullSignature(signature);

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: 'Copied', description: value });
  };

  const summaryCards = useMemo(() => [
    { label: 'Total invoices', value: stats?.totalInvoices ?? 0, icon: FileText, helper: 'All records in Supabase' },
    { label: 'Paid / verified', value: stats ? `${stats.verifiedInvoices}/${stats.paidInvoices}` : '0/0', icon: CheckCircle2, helper: 'Payments confirmed on platform' },
    { label: 'Awaiting review', value: stats?.inEscrowInvoices ?? 0, icon: Wallet, helper: 'Payment proofs pending' },
    { label: 'Awaiting payment', value: stats?.pendingInvoices ?? 0, icon: Clock3, helper: 'Unpaid invoices' },
  ], [stats]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar variant="app" />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="rounded-full px-3 py-1">Portfolio invoice dashboard</Badge>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">All invoices, receipts, and proof in one view.</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Fresh accounts stay blank until invoices are created. Once invoices are sent or paid, Supabase becomes the source of truth for fetching and activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/invoice/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <Plus className="h-4 w-4" />
              New invoice
            </Link>
            <Button variant="outline" onClick={() => void refresh()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </motion.div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card, index) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{card.helper}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Invoice records</h2>
                <p className="text-sm text-muted-foreground">Paid, unpaid, submitted, and verified states are shown here.</p>
              </div>
              <Badge variant="outline" className="rounded-full">{invoices.length} records</Badge>
            </div>

            {blankState ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">Blank account</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create the first invoice and it will appear here with a full public link, status badge, and explorer proof once payment lands.</p>
                <Link to="/invoice/new" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  Create invoice
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-background/60 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-5 py-3">Client</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Payment state</th>
                      <th className="px-5 py-3">Explorer</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.publicId} className="border-t border-border/50 hover:bg-background/40">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-foreground">{invoice.invoiceId}</p>
                            <p className="text-xs text-muted-foreground">{invoice.title}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-foreground">{invoice.clientName}</p>
                            <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium">{invoice.amount.toLocaleString()} {invoice.token}</td>
                        <td className="px-5 py-4"><StatusBadge status={invoice.status} /></td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${paymentTone(invoice.paymentState)}`}>
                            {invoice.paymentState.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {explorerable(invoice.txHash) ? (
                            <a href={invoice.explorerUrl || buildExplorerUrl(invoice.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => void copyText(`${window.location.origin}/pay/${invoice.publicId}`)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-background/60">
                              <Copy className="h-3.5 w-3.5" />
                              Link
                            </button>
                            <Link to={`/pay/${invoice.publicId}`} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                              Pay / view
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold">Recent activity</h2>
              <div className="mt-4 space-y-3">
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoice activity yet.</p>
                ) : activity.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.invoiceId}</p>
                        <p className="text-xs text-muted-foreground">{item.client} - {item.amount.toLocaleString()} {item.token}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${paymentTone(item.type === 'settled' ? 'verified' : item.type === 'paid' ? 'paid' : item.type === 'overdue' ? 'disputed' : 'not_paid')}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{item.time}{item.note ? ` - ${item.note}` : ''}</p>
                    {isFullSignature(item.txSignature) ? (
                      <a href={item.explorerUrl || buildExplorerUrl(item.txSignature)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        {item.txSignature}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold">Top clients</h2>
              <div className="mt-4 space-y-3">
                {topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No client data yet.</p>
                ) : topClients.map((client) => (
                  <div key={client.name} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.total.toLocaleString()} {client.token}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{client.invoices} invoices</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPortfolio;
