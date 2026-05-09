export const APP_NAME = 'Misthos';
export const APP_TAGLINE = 'Every invoice is a contract. Every payment is proof.';
export const APP_DESCRIPTION = 'On-chain professional invoicing & payment platform built on Solana. Programmable, transparent, instant.';

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'settled' | 'disputed' | 'overdue' | 'refunded';

export interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  clientName: string;
  clientEmail: string;
  description: string;
  lineItems: LineItem[];
  amount: number;
  token: string;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  txHash?: string;
  creator: string;
  payer?: string;
}

// Demo invoices for dashboard
export const DEMO_INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    clientName: 'Sarah Chen',
    clientEmail: 'sarah@designco.io',
    description: 'UI/UX Design — Dashboard Redesign',
    lineItems: [{ description: 'UI/UX Design — Dashboard Redesign', quantity: 3, rate: 2500, amount: 7500 }],
    amount: 7500,
    token: 'USDC',
    status: 'paid',
    dueDate: '2026-05-15',
    createdAt: '2026-05-01',
    paidAt: '2026-05-03',
    txHash: '4zKj...9xRm',
    creator: '9PJ8...3555',
  },
  {
    id: 'INV-002',
    clientName: 'David Park',
    clientEmail: 'david@techstartup.xyz',
    description: 'Backend API Development',
    lineItems: [{ description: 'Backend API Development', quantity: 40, rate: 120, amount: 4800 }],
    amount: 4800,
    token: 'USDC',
    status: 'sent',
    dueDate: '2026-05-22',
    createdAt: '2026-05-06',
    creator: '9PJ8...3555',
  },
  {
    id: 'INV-003',
    clientName: 'Lena Morales',
    clientEmail: 'lena@agencywork.co',
    description: 'Smart Contract Audit',
    lineItems: [{ description: 'Smart Contract Audit', quantity: 1, rate: 3200, amount: 3200 }],
    amount: 3200,
    token: 'SOL',
    status: 'overdue',
    dueDate: '2026-04-28',
    createdAt: '2026-04-14',
    creator: '9PJ8...3555',
  },
  {
    id: 'INV-004',
    clientName: 'Marcus Webb',
    clientEmail: 'marcus@web3co.dev',
    description: 'Full-Stack DApp Development',
    lineItems: [{ description: 'Full-Stack DApp Development', quantity: 60, rate: 150, amount: 9000 }],
    amount: 9000,
    token: 'USDC',
    status: 'draft',
    dueDate: '2026-06-01',
    createdAt: '2026-05-08',
    creator: '9PJ8...3555',
  },
  {
    id: 'INV-005',
    clientName: 'Yuki Tanaka',
    clientEmail: 'yuki@nftlabs.io',
    description: 'NFT Marketplace Integration',
    lineItems: [{ description: 'NFT Marketplace Integration', quantity: 1, rate: 5500, amount: 5500 }],
    amount: 5500,
    token: 'USDC',
    status: 'settled',
    dueDate: '2026-04-20',
    createdAt: '2026-04-05',
    paidAt: '2026-04-18',
    txHash: '7mXp...2kLn',
    creator: '9PJ8...3555',
  },
];

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  settled: 'Settled',
  disputed: 'Disputed',
  overdue: 'Overdue',
  refunded: 'Refunded',
};
