import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Send, Banknote, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    icon: FileText,
    step: '01',
    title: 'Create Invoice',
    description: 'Fill the form or let AI draft it from plain English. Each invoice becomes a Solana program account with PDA escrow.',
  },
  {
    icon: Send,
    step: '02',
    title: 'Send to Client',
    description: 'Your client receives a branded email with a professional invoice link. No account or wallet required to view.',
  },
  {
    icon: Banknote,
    step: '03',
    title: 'Client Pays',
    description: 'Wallet, cross-chain, fiat card, or x402 link — the payer picks their preferred method. Funds lock into the escrow vault.',
  },
  {
    icon: CheckCircle2,
    step: '04',
    title: 'Release & Settle',
    description: 'Confirm delivery and release the escrow. Funds transfer to your wallet. On-chain proof and PDF receipt generated.',
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
          >
            Workflow
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          >
            Four steps. Fully on-chain.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="glass-card glass-card-hover p-6 h-full">
                <span className="text-xs font-mono font-bold text-primary/40 mb-4 block">{step.step}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
