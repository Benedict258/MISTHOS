import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

const CTASection: React.FC = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/6 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card p-10 sm:p-14"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Start getting paid on-chain
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Connect your wallet, create your first invoice, and experience programmable payments on Solana. No setup fees. No monthly subscriptions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:shadow-amber transition-all hover:opacity-90"
            >
              Launch {APP_NAME}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-6 py-3 text-sm font-medium text-secondary-foreground hover:bg-surface-hover transition-colors"
            >
              Explore Solana
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
