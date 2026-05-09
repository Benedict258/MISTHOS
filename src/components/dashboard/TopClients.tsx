import React from 'react';
import { motion } from 'framer-motion';

const clients = [
  { name: 'Marcus Webb', total: 9000, invoices: 1, token: 'USDC' },
  { name: 'Sarah Chen', total: 7500, invoices: 1, token: 'USDC' },
  { name: 'Yuki Tanaka', total: 5500, invoices: 1, token: 'USDC' },
  { name: 'David Park', total: 4800, invoices: 1, token: 'USDC' },
  { name: 'Lena Morales', total: 3200, invoices: 1, token: 'SOL' },
];

const maxTotal = Math.max(...clients.map(c => c.total));

const TopClients: React.FC = () => {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Clients</h3>
      <div className="space-y-3">
        {clients.map((client, i) => (
          <motion.div
            key={client.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-foreground font-medium">{client.name}</span>
              <span className="text-xs font-semibold text-foreground">${client.total.toLocaleString()}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(client.total / maxTotal) * 100}%` }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.5 }}
                className="h-full rounded-full bg-primary/60"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{client.invoices} invoice · {client.token}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TopClients;
