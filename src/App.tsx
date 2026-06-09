import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { getNetworkConfig } from './lib/network';

import '@solana/wallet-adapter-react-ui/styles.css';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/DashboardPortfolio'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoicePortfolio'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetailPortfolio'));
const PayInvoice = lazy(() => import('./pages/PayInvoicePortfolio'));
const NotFound = lazy(() => import('./pages/NotFound'));

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
    const networkConfig = getNetworkConfig();
    const network = networkConfig.network === 'mainnet-beta'
      ? WalletAdapterNetwork.Mainnet
      : networkConfig.network === 'testnet'
        ? WalletAdapterNetwork.Testnet
        : WalletAdapterNetwork.Devnet;
    const endpoint = networkConfig.rpcUrl;
    const wallets = useMemo(() => [new SolflareWalletAdapter({ network }), new PhantomWalletAdapter()], [network]);

    React.useEffect(() => {
        const stored = window.localStorage.getItem('misthos:theme');
        document.documentElement.classList.toggle('dark', stored !== 'light');
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>
                          <Route path="/" element={<Landing />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/invoice/new" element={<CreateInvoice />} />
                          <Route path="/invoice/:id" element={<InvoiceDetail />} />
                          <Route path="/pay/:invoiceId" element={<PayInvoice />} />
                          <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                    <Toaster />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;
