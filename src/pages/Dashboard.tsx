import React, { useEffect, useMemo, useState } from 'react';
import { useConnection, useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AnalyticsCards from '@/components/dashboard/AnalyticsCards';
import InvoiceTable from '@/components/dashboard/InvoiceTable';
import RecentActivity from '@/components/dashboard/RecentActivity';
import TopClients from '@/components/dashboard/TopClients';
import PaymentVelocityChart from '@/components/dashboard/PaymentVelocityChart';
import Footer from '@/components/Footer';
import { type Invoice } from '@/lib/constants';
import { MisthosSDK, getInvoiceStatusString } from '@/lib/misthos';

const Dashboard: React.FC = () => {
  const { connected } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  const sdk = useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    return new MisthosSDK(provider);
  }, [connection, anchorWallet]);

  useEffect(() => {
    const loadInvoices = async () => {
      if (!sdk || !anchorWallet?.publicKey) return;

      setLoading(true);
      try {
        const result = await sdk.fetchInvoicesByCreator(anchorWallet.publicKey);
        if (!result.success || !result.data) return;

        const mapped = result.data.map(({ publicKey, account }) => {
          const statusRaw = getInvoiceStatusString(account.status);
          const status = statusRaw === 'draft' || statusRaw === 'sent' || statusRaw === 'viewed' || statusRaw === 'paid' || statusRaw === 'settled' || statusRaw === 'disputed' || statusRaw === 'refunded'
            ? statusRaw
            : 'sent';
          const decimals = account.tokenMint.toString() === 'So11111111111111111111111111111111111111112' ? 9 : 6;
          const amount = Number(account.amount.toString()) / Math.pow(10, decimals);

          return {
            id: publicKey.toString(),
            clientName: account.payer.toString().slice(0, 8) + '...' + account.payer.toString().slice(-4),
            clientEmail: 'onchain@payer.local',
            description: account.invoiceId,
            lineItems: [
              {
                description: account.invoiceId,
                quantity: 1,
                rate: amount,
                amount,
              },
            ],
            amount,
            token: account.tokenMint.toString() === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'USDC',
            status,
            dueDate: new Date(Number(account.dueDate.toString()) * 1000).toISOString().slice(0, 10),
            createdAt: new Date(Number(account.createdAt.toString()) * 1000).toISOString().slice(0, 10),
            paidAt: Number(account.paidAt.toString()) > 0 ? new Date(Number(account.paidAt.toString()) * 1000).toISOString().slice(0, 10) : undefined,
            creator: account.creator.toString(),
            payer: account.payer.toString(),
          } as Invoice;
        });

        setInvoices(mapped);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [sdk, anchorWallet?.publicKey]);

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="app" />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center max-w-md w-full"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your Solana wallet to access the creator dashboard, manage invoices, and track payments.
            </p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your invoicing activity on Solana.</p>
          {loading && <p className="text-xs text-muted-foreground mt-2">Loading on-chain invoice records...</p>}
        </motion.div>

        <div className="space-y-6">
          {/* Analytics Cards */}
          <AnalyticsCards />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentVelocityChart />
            <TopClients />
          </div>

          {/* Invoice Table */}
          <InvoiceTable invoices={invoices} />

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
