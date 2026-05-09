import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, ExternalLink, Download, Send, Zap, Clock, CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import Footer from '@/components/Footer';
import { DEMO_INVOICES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const invoice = DEMO_INVOICES.find((inv) => inv.id === id) || DEMO_INVOICES[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  const handleSendInvoice = () => {
    setShowEmailPreview(true);
    setTimeout(() => {
      setShowEmailPreview(false);
      toast({ title: 'Invoice Sent', description: `Email sent to ${invoice.clientEmail} with payment link.` });
    }, 2000);
  };

  const handleReleaseEscrow = () => {
    toast({ title: 'Escrow Released', description: `${invoice.amount.toLocaleString()} ${invoice.token} transferred to your wallet.` });
  };

  const handleDownloadPDF = () => {
    toast({ title: 'PDF Downloaded', description: 'Invoice proof receipt with on-chain data saved.' });
  };

  const canRelease = invoice.status === 'paid';
  const canSend = invoice.status === 'draft';
  const isPaid = invoice.status === 'paid' || invoice.status === 'settled';
  const explorerBase = 'https://explorer.solana.com';

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-4xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground font-mono">{invoice.id}</h1>
                <StatusBadge status={invoice.status} size="md" />
              </div>
              <p className="text-sm text-muted-foreground">{invoice.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {canSend && (
                <button
                  onClick={handleSendInvoice}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:opacity-90 transition-opacity"
                >
                  <Send className="h-4 w-4" />
                  Send Invoice
                </button>
              )}
              {canRelease && (
                <button
                  onClick={handleReleaseEscrow}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:opacity-90 transition-opacity"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Release Escrow
                </button>
              )}
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Email Preview Banner */}
          {showEmailPreview && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 glass-card p-4 border-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Sending invoice email...</p>
                  <p className="text-xs text-muted-foreground">To: {invoice.clientEmail} — branded email with payment link</p>
                </div>
                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            </motion.div>
          )}

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client & Payment Info */}
              <div className="glass-card p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Client</p>
                    <p className="text-sm font-medium text-foreground">{invoice.clientName}</p>
                    <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="text-lg font-bold text-foreground">{invoice.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{invoice.token}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                    <p className="text-sm text-foreground">{invoice.createdAt}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                    <p className="text-sm text-foreground">{invoice.dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="glass-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Description</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Qty</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Rate</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="px-5 py-3 text-sm text-foreground">{item.description}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground text-right">{item.quantity}</td>
                        <td className="px-5 py-3 text-sm text-muted-foreground text-right">${item.rate.toLocaleString()}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-foreground text-right">${item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-foreground text-right">Total</td>
                      <td className="px-5 py-3 text-lg font-bold text-primary text-right">${invoice.amount.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* On-chain Info */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  On-Chain Data
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Creator</p>
                    <button onClick={() => handleCopy(invoice.creator)} className="flex items-center gap-1.5 text-xs font-mono text-foreground hover:text-primary transition-colors">
                      {invoice.creator}
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Invoice PDA</p>
                    <button onClick={() => handleCopy(`InvPDA...${invoice.id}`)} className="flex items-center gap-1.5 text-xs font-mono text-foreground hover:text-primary transition-colors">
                      InvPDA...{invoice.id.replace('INV-', '')}
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Escrow Vault</p>
                    <button onClick={() => handleCopy(`Esc7...mR2v`)} className="flex items-center gap-1.5 text-xs font-mono text-foreground hover:text-primary transition-colors">
                      Esc7...mR2v
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  {invoice.txHash && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tx Hash</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-foreground">{invoice.txHash}</span>
                        <a href={`${explorerBase}/tx/${invoice.txHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  {invoice.paidAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Paid At</p>
                      <p className="text-xs text-foreground">{invoice.paidAt}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Invoice created on-chain</p>
                      <p className="text-xs text-muted-foreground">{invoice.createdAt}</p>
                    </div>
                  </div>
                  {invoice.status !== 'draft' && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-1 h-2 w-2 rounded-full bg-status-sent flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground">Invoice sent to {invoice.clientName}</p>
                        <p className="text-xs text-muted-foreground">{invoice.createdAt}</p>
                      </div>
                    </div>
                  )}
                  {invoice.status === 'overdue' && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-1 h-2 w-2 rounded-full bg-status-overdue flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-status-overdue" /> Invoice overdue
                        </p>
                        <p className="text-xs text-muted-foreground">Reminder agent triggered</p>
                      </div>
                    </div>
                  )}
                  {isPaid && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-1 h-2 w-2 rounded-full bg-status-paid flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-foreground">Payment received — escrow locked</p>
                          <p className="text-xs text-muted-foreground">{invoice.paidAt}</p>
                        </div>
                      </div>
                      {invoice.status === 'settled' && (
                        <div className="flex items-start gap-2.5">
                          <div className="mt-1 h-2 w-2 rounded-full bg-status-settled flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">Escrow released — funds settled</p>
                            <p className="text-xs text-muted-foreground">{invoice.paidAt}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Share Link */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Payment Link</h3>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`misthos.app/pay/${invoice.id}`}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-secondary border border-border rounded-lg text-muted-foreground"
                  />
                  <button
                    onClick={() => handleCopy(`misthos.app/pay/${invoice.id}`)}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    readOnly
                    value={`misthos.app/pay/x402/${invoice.id}`}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-secondary border border-border rounded-lg text-muted-foreground"
                  />
                  <button
                    onClick={() => handleCopy(`misthos.app/pay/x402/${invoice.id}`)}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">x402 payment link for HTTP-native wallets</p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default InvoiceDetail;
