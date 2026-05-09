import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Wallet, Globe, Bot, Mic, CreditCard } from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: 'PDA Escrow Vaults',
    description: 'Every payment flows through a program-controlled escrow. No admin keys, no intermediaries — only smart contract logic can release funds.',
  },
  {
    icon: Wallet,
    title: 'Multi-Payment Options',
    description: 'Pay with any connected Solana wallet, cross-chain via LI.FI, fiat card onramp, or x402 HTTP-native links. Your payers choose what works for them.',
  },
  {
    icon: Globe,
    title: 'Cross-Chain via LI.FI',
    description: 'Payers on Ethereum, Base, Polygon, or 60+ chains can pay directly. LI.FI routes and bridges to Solana automatically.',
  },
  {
    icon: CreditCard,
    title: 'Fiat Card Payments',
    description: 'Non-crypto payers pay by Visa or Mastercard. The onramp converts to USDC and routes directly to the on-chain escrow. No wallet needed.',
  },
  {
    icon: Bot,
    title: 'AI Invoice Drafting',
    description: 'Describe work in plain English — the AI agent structures your invoice automatically. "Invoice John for 20 hours of React dev at $150/hr."',
  },
  {
    icon: Mic,
    title: 'Voice Input & Alerts',
    description: 'Speak your invoice details. ElevenLabs transcribes, the agent populates your form. Audio notifications for payments received and overdue invoices.',
  },
];

const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-surface/30 to-background pointer-events-none" />
      
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold uppercase tracking-widest text-primary mb-3"
          >
            Core Capabilities
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-foreground"
          >
            Built for how professionals get paid
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card glass-card-hover p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
