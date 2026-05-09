import React from 'react';
import { type InvoiceStatus, STATUS_LABELS } from '@/lib/constants';

interface StatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'md';
}

const statusClassMap: Record<InvoiceStatus, string> = {
  draft: 'badge-draft',
  sent: 'badge-sent',
  viewed: 'badge-sent',
  paid: 'badge-paid',
  settled: 'badge-settled',
  disputed: 'badge-disputed',
  overdue: 'badge-overdue',
  refunded: 'badge-draft',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${statusClassMap[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
};

export default StatusBadge;
