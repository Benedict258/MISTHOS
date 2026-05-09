import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, FileText, TrendingUp } from 'lucide-react';

import { useAnalytics } from '@/hooks/useAnalytics';

const AnalyticsCards: React.FC = () => {
  const { data, loading } = useAnalytics();

  const stats = [
    {
      label: 'Total Earned',
      value: loading ? '...' : `$${(data?.totalRevenue || 0).toFixed(2)}`,
      change: `+${(data?.paidInvoices || 0)} paid invoices`,
      icon: DollarSign,
      accent: true,
    },
    {
      label: 'Pending',
      value: loading ? '...' : `${data?.pendingInvoices || 0}`,
      change: `${data?.pendingInvoices === 1 ? '1 invoice' : `${data?.pendingInvoices} invoices`} outstanding`,
      icon: Clock,
    },
    {
      label: 'Invoices Created',
      value: loading ? '...' : `${data?.totalInvoices || 0}`,
      change: `${data?.paidInvoices || 0} paid`,
      icon: FileText,
    },
    {
      label: 'Avg Invoice',
      value: loading ? '...' : `$${(data?.averageInvoiceValue || 0).toFixed(2)}`,
      change: 'Payment value per invoice',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`glass-card p-5 ${stat.accent ? 'border-primary/20' : ''}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.accent ? 'bg-primary/10' : 'bg-secondary'}`}>
              <stat.icon className={`h-4 w-4 ${stat.accent ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default AnalyticsCards;
