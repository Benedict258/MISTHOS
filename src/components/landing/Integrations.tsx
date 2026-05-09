import React from 'react';
import { motion } from 'framer-motion';

const integrations = [
  { name: 'Solana', desc: 'Primary settlement layer — sub-cent fees, 400ms finality' },
  { name: 'LI.FI', desc: 'Cross-chain routing — 60+ chains, bridge + DEX aggregation' },
  { name: 'ElevenLabs', desc: 'Voice I/O — speech-to-invoice and audio confirmations' },
  { name: 'x402', desc: 'HTTP-native payment links — one-click pay from any browser' },
  { name: 'Coinflow', desc: 'Fiat card onramp — Visa/Mastercard to on-chain USDC' },
  { name: 'Claude AI', desc: 'NLP invoice drafting — plain English to structured data' },
];

const Integrations: React.FC = () => {
  return (
    <section id="integrations" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/20 to-background pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
          >
            Ecosystem
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          >
            Powered by best-in-class protocols
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass-card glass-card-hover p-5 flex items-start gap-4"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{item.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Integrations;
