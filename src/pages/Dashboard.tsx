import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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

const Dashboard: React.FC = () => {
  const { connected } = useWallet();

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
          <InvoiceTable />

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
