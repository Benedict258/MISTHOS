import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Send, Banknote, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'created' | 'sent' | 'paid' | 'settled' | 'overdue';
  invoiceId: string;
  client: string;
  amount: number;
  token: string;
  time: string;
  txHash?: string;
}

const activityData: ActivityItem[] = [
  { id: '1', type: 'paid', invoiceId: 'INV-001', client: 'Sarah Chen', amount: 7500, token: 'USDC', time: '2 days ago' },
  { id: '2', type: 'sent', invoiceId: 'INV-002', client: 'David Park', amount: 4800, token: 'USDC', time: '2 days ago' },
  { id: '3', type: 'overdue', invoiceId: 'INV-003', client: 'Lena Morales', amount: 3200, token: 'SOL', time: '10 days ago' },
  { id: '4', type: 'created', invoiceId: 'INV-004', client: 'Marcus Webb', amount: 9000, token: 'USDC', time: 'Today' },
  { id: '5', type: 'settled', invoiceId: 'INV-005', client: 'Yuki Tanaka', amount: 5500, token: 'USDC', time: '20 days ago' },
];

const typeConfig = {
  created: { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Invoice created' },
  sent: { icon: Send, color: 'text-status-sent', bg: 'bg-status-sent/10', label: 'Invoice sent' },
  paid: { icon: Banknote, color: 'text-status-paid', bg: 'bg-status-paid/10', label: 'Payment received' },
  settled: { icon: CheckCircle2, color: 'text-status-settled', bg: 'bg-status-settled/10', label: 'Escrow released' },
  overdue: { icon: AlertCircle, color: 'text-status-overdue', bg: 'bg-status-overdue/10', label: 'Invoice overdue' },
};

const RecentActivity: React.FC = () => {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
      </div>
      <div className="divide-y divide-border/50">
        {activityData.map((item, i) => {
          const config = typeConfig[item.type];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="px-5 py-3.5 flex items-center gap-3 hover:bg-surface-hover/50 transition-colors"
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{config.label}</span>{' '}
                  <span className="text-muted-foreground">—</span>{' '}
                  <span className="font-mono text-xs text-muted-foreground">{item.invoiceId}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.client} · {item.amount.toLocaleString()} {item.token}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{item.time}</p>
                {item.txHash && (
                  <a
                    href={`https://explorer.solana.com/tx/${item.txHash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-primary hover:underline flex items-center gap-0.5 justify-end mt-0.5"
                  >
                    {item.txHash} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivity;
