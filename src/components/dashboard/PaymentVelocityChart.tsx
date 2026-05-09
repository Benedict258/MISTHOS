import React from 'react';
import { motion } from 'framer-motion';

const monthlyData = [
  { month: 'Jan', earned: 2400, paid: 2 },
  { month: 'Feb', earned: 5200, paid: 3 },
  { month: 'Mar', earned: 3800, paid: 2 },
  { month: 'Apr', earned: 8700, paid: 4 },
  { month: 'May', earned: 12300, paid: 3 },
];

const maxEarned = Math.max(...monthlyData.map(d => d.earned));

const PaymentVelocityChart: React.FC = () => {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Payment Velocity</h3>
        <span className="text-xs text-muted-foreground">Last 5 months</span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-3 h-32 mb-3">
        {monthlyData.map((d, i) => {
          const height = (d.earned / maxEarned) * 100;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-foreground">${(d.earned / 1000).toFixed(1)}k</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                className="w-full rounded-t-md bg-primary/40 hover:bg-primary/60 transition-colors relative group"
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border rounded px-2 py-0.5 text-[10px] font-medium text-foreground whitespace-nowrap shadow-md z-10">
                  {d.paid} invoices paid
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3">
        {monthlyData.map((d) => (
          <div key={d.month} className="flex-1 text-center">
            <span className="text-[10px] text-muted-foreground">{d.month}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-bold text-foreground">$32.4k</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Invoices</p>
          <p className="text-sm font-bold text-foreground">14</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Time</p>
          <p className="text-sm font-bold text-foreground">1.8 days</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentVelocityChart;
