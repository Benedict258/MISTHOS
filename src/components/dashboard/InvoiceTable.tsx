import React, { useState } from 'react';
import type { Invoice } from '@/lib/constants';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Search, Filter, Plus } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { DEMO_INVOICES, type InvoiceStatus } from '@/lib/constants';

const DEVNET_EXPLORER = 'https://explorer.solana.com';

const filterOptions: (InvoiceStatus | 'all')[] = ['all', 'draft', 'sent', 'paid', 'settled', 'overdue', 'disputed'];

const getPaymentState = (status: InvoiceStatus) => {
  if (status === 'paid') return { label: 'In Escrow', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  if (status === 'settled') return { label: 'Verified', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
  if (status === 'disputed') return { label: 'Verifying', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
  if (status === 'refunded') return { label: 'Refunded', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
  return { label: 'Not Paid', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
};

const InvoiceTable: React.FC<{ invoices?: Invoice[] }> = ({ invoices }) => {
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const source = invoices && invoices.length ? invoices : DEMO_INVOICES;

  const filtered = source.filter((inv) => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (search && !inv.clientName.toLowerCase().includes(search.toLowerCase()) && !inv.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
          <Link
            to="/invoice/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by client or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  filter === opt
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-secondary border border-transparent'
                }`}
              >
                {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Invoice</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Client</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden sm:table-cell">Amount</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Due Date</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Payment State</th>
              <th className="text-center text-xs font-medium text-muted-foreground px-5 py-3">Proof</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, i) => (
              <motion.tr
                key={inv.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
              >
                <td className="px-5 py-3.5">
                  <Link to={`/invoice/${inv.id}`} className="text-sm font-mono font-medium text-foreground hover:text-primary transition-colors">
                    {inv.id}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.clientName}</p>
                    <p className="text-xs text-muted-foreground hidden lg:block">{inv.description}</p>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden sm:table-cell">
                  <span className="text-sm font-semibold text-foreground">
                    {inv.amount.toLocaleString()} {inv.token}
                  </span>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">{inv.dueDate}</span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${getPaymentState(inv.status).className}`}>
                    {getPaymentState(inv.status).label}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {inv.txHash ? (
                    <a
                      href={`${DEVNET_EXPLORER}/tx/${inv.txHash}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                      title="View on Devnet Explorer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">On-Chain</span>
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    to={`/invoice/${inv.id}`}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </Link>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;
