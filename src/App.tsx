import React, { useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import Landing from './pages/Landing';
import Dashboard from './pages/DashboardPortfolio';
import CreateInvoice from './pages/CreateInvoicePortfolio';
import InvoiceDetail from './pages/InvoiceDetailPortfolio';
import PayInvoice from './pages/PayInvoicePortfolio';
import NotFound from './pages/NotFound';

import '@solana/wallet-adapter-react-ui/styles.css';

const App = () => {
    const network = WalletAdapterNetwork.Devnet;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    const wallets = useMemo(() => [new SolflareWalletAdapter({ network }), new PhantomWalletAdapter()], [network]);

    React.useEffect(() => {
        const stored = window.localStorage.getItem('misthos:theme');
        document.documentElement.classList.toggle('dark', stored !== 'light');
    }, []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/invoice/new" element={<CreateInvoice />} />
                        <Route path="/invoice/:id" element={<InvoiceDetail />} />
                        <Route path="/pay/:invoiceId" element={<PayInvoice />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                    <Toaster />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;
