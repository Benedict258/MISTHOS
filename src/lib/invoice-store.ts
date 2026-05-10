import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Invoice, InvoiceStatus, LineItem } from './constants';

export type InvoicePaymentState = 'not_paid' | 'in_escrow' | 'paid' | 'verified' | 'disputed' | 'refunded';

export type InvoiceEvent = {
  id: string;
  publicId: string;
  status: InvoiceStatus;
  paymentState: InvoicePaymentState;
  note?: string;
  txSignature?: string;
  explorerUrl?: string;
  createdAt: string;
};

export type StoredInvoice = Invoice & {
  publicId: string;
  invoiceId: string;
  title: string;
  invoiceAddress?: string;
  companyName?: string;
  billingAddress?: string;
  issueDate: string;
  paymentTerms?: string;
  creatorWalletAddress: string;
  payoutWalletAddress: string;
  tax?: number;
  discount?: number;
  paymentState: InvoicePaymentState;
  paymentMethod?: 'wallet' | 'crosschain' | 'card' | 'x402';
  receiptUrl?: string;
  receiptName?: string;
  receiptMessage?: string;
  explorerUrl?: string;
  shareUrl?: string;
  paymentReference?: string;
  payerEmail?: string;
  verifiedAt?: string;
  footer_note?: string;
  metadata?: Record<string, unknown>;
  updatedAt: string;
};

const STORAGE_KEY = 'misthos:invoices:v1';
const EVENTS_KEY = 'misthos:invoice-events:v1';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const RECEIPTS_BUCKET = import.meta.env.VITE_SUPABASE_RECEIPTS_BUCKET || 'receipts';

let supabaseClient: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
};

const nowIso = () => new Date().toISOString();

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const readLocalInvoices = (): StoredInvoice[] => {
  if (typeof window === 'undefined') return [];
  return safeParse<StoredInvoice[]>(window.localStorage.getItem(STORAGE_KEY), []);
};

const writeLocalInvoices = (invoices: StoredInvoice[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
};

const readLocalEvents = (): InvoiceEvent[] => {
  if (typeof window === 'undefined') return [];
  return safeParse<InvoiceEvent[]>(window.localStorage.getItem(EVENTS_KEY), []);
};

const writeLocalEvents = (events: InvoiceEvent[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
};

const sortByDateDesc = <T extends { updatedAt?: string; createdAt?: string }>(rows: T[]) =>
  [...rows].sort((a, b) => {
    const left = new Date((a.updatedAt || a.createdAt || nowIso())).getTime();
    const right = new Date((b.updatedAt || b.createdAt || nowIso())).getTime();
    return right - left;
  });

const mapLineItems = (items: LineItem[]) =>
  items.map((item, index) => ({
    id: crypto.randomUUID(),
    item_name: item.description || `Item ${index + 1}`,
    quantity: item.quantity,
    unit_price: item.rate,
    subtotal: item.amount,
  }));

const computePaymentState = (invoice: Partial<StoredInvoice>): InvoicePaymentState => {
  if (invoice.status === 'refunded') return 'refunded';
  if (invoice.status === 'disputed') return 'disputed';
  if (invoice.status === 'settled') return 'verified';
  if (invoice.status === 'paid') return 'paid';
  if (invoice.txHash && isFullSignature(invoice.txHash)) return 'paid';
  return 'not_paid';
};

const normalizeInvoice = (invoice: StoredInvoice): StoredInvoice => ({
  ...invoice,
  txHash: isFullSignature(invoice.txHash) ? invoice.txHash : undefined,
  explorerUrl: invoice.explorerUrl && isFullSignature(invoice.txHash) ? invoice.explorerUrl : undefined,
  paymentState: invoice.paymentState || computePaymentState(invoice),
  updatedAt: invoice.updatedAt || invoice.createdAt || nowIso(),
  metadata: invoice.metadata || {},
});

const upsertLocalInvoice = (invoice: StoredInvoice) => {
  const normalized = normalizeInvoice(invoice);
  const current = readLocalInvoices();
  const next = sortByDateDesc([
    ...current.filter((row) => row.publicId !== normalized.publicId),
    normalized,
  ]);
  writeLocalInvoices(next);
  return normalized;
};

const addLocalEvent = (event: InvoiceEvent) => {
  const current = readLocalEvents();
  const next = sortByDateDesc([...current, event]);
  writeLocalEvents(next);
};

const supabaseUpsert = async (invoice: StoredInvoice) => {
  const client = getSupabaseClient();
  if (!client) return null;

  const payload = {
    public_id: invoice.publicId,
    invoice_id: invoice.invoiceId,
    invoice_address: invoice.invoiceAddress || null,
    creator_wallet_address: invoice.creatorWalletAddress,
    payout_wallet_address: invoice.payoutWalletAddress,
    client_name: invoice.clientName,
    client_email: invoice.clientEmail,
    company_name: invoice.companyName || null,
    billing_address: invoice.billingAddress || null,
    title: invoice.title,
    description: invoice.description,
    currency: invoice.token,
    subtotal: invoice.lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    tax: invoice.tax || 0,
    discount: invoice.discount || 0,
    total: invoice.amount,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    payment_terms: invoice.paymentTerms || null,
    status: invoice.status,
    payment_state: invoice.paymentState,
    payment_method: invoice.paymentMethod || null,
    tx_signature: invoice.txHash || null,
    explorer_url: invoice.explorerUrl || null,
    receipt_url: invoice.receiptUrl || null,
    receipt_name: invoice.receiptName || null,
    receipt_message: invoice.receiptMessage || null,
    payment_reference: invoice.paymentReference || null,
    payer_wallet_address: invoice.payer || null,
    footer_note: invoice.footer_note || null,
    share_url: invoice.shareUrl || null,
    metadata: invoice.metadata || {},
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
    paid_at: invoice.paidAt || null,
    verified_at: invoice.verifiedAt || null,
  };

  const { error: invoiceError } = await client.from('invoices').upsert(payload, { onConflict: 'public_id' });
  if (invoiceError) throw invoiceError;

  await client.from('invoice_items').delete().eq('invoice_public_id', invoice.publicId);
  const lineItems = mapLineItems(invoice.lineItems).map((item) => ({
    invoice_public_id: invoice.publicId,
    item_name: item.item_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
  }));
  if (lineItems.length) {
    const { error: itemError } = await client.from('invoice_items').insert(lineItems);
    if (itemError) throw itemError;
  }

  await client.from('invoice_events').insert({
    invoice_public_id: invoice.publicId,
    status: invoice.status,
    payment_state: invoice.paymentState,
    note: `Synced invoice ${invoice.invoiceId}`,
    tx_signature: invoice.txHash || null,
    explorer_url: invoice.explorerUrl || null,
  });

  return invoice;
};

export const saveInvoiceRecord = async (invoice: StoredInvoice) => {
  const normalized = normalizeInvoice(invoice);
  try {
    await supabaseUpsert(normalized);
  } catch (error) {
    console.warn('Supabase invoice save failed, using local fallback.', error);
  }
  return upsertLocalInvoice(normalized);
};

export const recordInvoiceEvent = async (event: Omit<InvoiceEvent, 'id' | 'createdAt'>) => {
  const payload: InvoiceEvent = {
    ...event,
    id: crypto.randomUUID(),
    createdAt: nowIso(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('invoice_events').insert({
        invoice_public_id: payload.publicId,
        status: payload.status,
        payment_state: payload.paymentState,
        note: payload.note || null,
        tx_signature: payload.txSignature || null,
        explorer_url: payload.explorerUrl || null,
      });
    } catch (error) {
      console.warn('Supabase event sync failed, using local fallback.', error);
    }
  }

  addLocalEvent(payload);
  return payload;
};

export const updateInvoiceRecord = async (publicId: string, patch: Partial<StoredInvoice>) => {
  const invoices = await listInvoiceRecords();
  const current = invoices.find((item) => item.publicId === publicId);
  if (!current) throw new Error('Invoice not found');

  const next = normalizeInvoice({
    ...current,
    ...patch,
    publicId,
    updatedAt: nowIso(),
    paymentState: patch.paymentState || computePaymentState({ ...current, ...patch }),
  });

  return saveInvoiceRecord(next);
};

export const uploadInvoiceReceipt = async (
  publicId: string,
  file: File,
): Promise<{ url: string; name: string }> => {
  const client = getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');

  if (client) {
    const path = `${publicId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await client.storage.from(RECEIPTS_BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });
    if (!error) {
      const { data } = client.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, name: file.name };
    }
    console.warn('Supabase receipt upload failed, using browser fallback.', error);
  }

  return {
    url: URL.createObjectURL(file),
    name: file.name,
  };
};

export const listInvoiceRecords = async (): Promise<StoredInvoice[]> => {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('invoices')
        .select('*, invoice_items(*), invoice_events(*)')
        .order('updated_at', { ascending: false });
      if (!error && data) {
        return data.map((row: any) => normalizeInvoice({
          publicId: row.public_id,
          id: row.invoice_id,
          invoiceId: row.invoice_id,
          invoiceAddress: row.invoice_address || undefined,
          creatorWalletAddress: row.creator_wallet_address,
          payoutWalletAddress: row.payout_wallet_address || row.creator_wallet_address,
          clientName: row.client_name,
          clientEmail: row.client_email,
          companyName: row.company_name || undefined,
          billingAddress: row.billing_address || undefined,
          title: row.title,
          description: row.description || '',
          lineItems: (row.invoice_items || []).map((item: any) => ({
            description: item.item_name,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.unit_price) || 0,
            amount: Number(item.subtotal) || 0,
          })),
          amount: Number(row.total) || 0,
          tax: Number(row.tax) || 0,
          discount: Number(row.discount) || 0,
          token: row.currency || 'USDC',
          status: row.status || 'draft',
          dueDate: row.due_date || new Date().toISOString().slice(0, 10),
          createdAt: row.created_at || nowIso(),
          updatedAt: row.updated_at || row.created_at || nowIso(),
          paidAt: row.paid_at || undefined,
          txHash: isFullSignature(row.tx_signature) ? row.tx_signature : undefined,
          creator: row.creator_wallet_address,
          payer: row.payer_wallet_address || undefined,
          issueDate: row.issue_date || row.created_at?.slice?.(0, 10) || new Date().toISOString().slice(0, 10),
          paymentTerms: row.payment_terms || undefined,
          paymentState: row.payment_state || computePaymentState({ status: row.status, txHash: row.tx_signature, paidAt: row.paid_at }),
          paymentMethod: row.payment_method || undefined,
          receiptUrl: row.receipt_url || undefined,
          receiptName: row.receipt_name || undefined,
          receiptMessage: row.receipt_message || undefined,
          explorerUrl: row.explorer_url && isFullSignature(row.tx_signature) ? row.explorer_url : undefined,
          shareUrl: row.share_url || undefined,
          paymentReference: row.payment_reference || undefined,
          verifiedAt: row.verified_at || undefined,
          footer_note: row.footer_note || undefined,
          metadata: row.metadata || {},
        }));
      }
    } catch (error) {
      console.warn('Supabase invoice load failed, using local fallback.', error);
    }
  }

  return sortByDateDesc(readLocalInvoices());
};

export const getInvoiceRecord = async (publicId: string) => {
  const invoices = await listInvoiceRecords();
  return invoices.find((invoice) => invoice.publicId === publicId || invoice.invoiceAddress === publicId || invoice.id === publicId) || null;
};

export const listInvoiceEvents = async (publicId?: string) => {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('invoice_events').select('*').order('created_at', { ascending: false });
      if (publicId) query = query.eq('invoice_public_id', publicId);
      const { data, error } = await query;
      if (!error && data) {
        return data.map((event: any) => ({
          id: event.id,
          publicId: event.invoice_public_id,
          status: event.status,
          paymentState: event.payment_state || 'not_paid',
          note: event.note || undefined,
          txSignature: event.tx_signature || undefined,
          explorerUrl: event.explorer_url || undefined,
          createdAt: event.created_at,
        })) as InvoiceEvent[];
      }
    } catch (error) {
      console.warn('Supabase events load failed, using local fallback.', error);
    }
  }

  const events = readLocalEvents();
  return publicId ? events.filter((event) => event.publicId === publicId) : events;
};

export const getInvoiceStats = async () => {
  const invoices = await listInvoiceRecords();
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((invoice) => invoice.paymentState === 'paid' || invoice.paymentState === 'verified' || invoice.status === 'settled').length;
  const inEscrowInvoices = invoices.filter((invoice) => invoice.paymentState === 'in_escrow').length;
  const pendingInvoices = invoices.filter((invoice) => invoice.paymentState === 'not_paid' || invoice.status === 'draft' || invoice.status === 'sent').length;
  const verifiedInvoices = invoices.filter((invoice) => invoice.paymentState === 'verified' || invoice.status === 'settled').length;
  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const averageInvoiceValue = totalInvoices ? totalRevenue / totalInvoices : 0;
  const lastUpdated = invoices[0]?.updatedAt || new Date().toISOString();

  return {
    totalRevenue,
    totalInvoices,
    paidInvoices,
    pendingInvoices,
    inEscrowInvoices,
    verifiedInvoices,
    averageInvoiceValue,
    currency: invoices[0]?.token || 'USDC',
    lastUpdated,
  };
};

export const getTopClients = async () => {
  const invoices = await listInvoiceRecords();
  const byClient = new Map<string, { name: string; total: number; invoices: number; token: string }>();

  invoices.forEach((invoice) => {
    const key = invoice.clientName;
    const current = byClient.get(key) || { name: invoice.clientName, total: 0, invoices: 0, token: invoice.token };
    current.total += invoice.amount || 0;
    current.invoices += 1;
    current.token = invoice.token;
    byClient.set(key, current);
  });

  return [...byClient.values()].sort((a, b) => b.total - a.total).slice(0, 5);
};

export const getActivityFeed = async () => {
  const invoices = await listInvoiceRecords();
  const events = await listInvoiceEvents();
  const eventMap = new Map(events.map((event) => [event.publicId, event]));

  return invoices.slice(0, 10).map((invoice) => {
    const event = eventMap.get(invoice.publicId);
    return {
      id: invoice.publicId,
      type: (invoice.paymentState === 'verified' || invoice.status === 'settled'
        ? 'settled'
        : invoice.paymentState === 'paid' || invoice.status === 'paid'
          ? 'paid'
          : invoice.paymentState === 'in_escrow'
            ? 'in_escrow'
            : invoice.paymentState === 'disputed'
              ? 'disputed'
              : invoice.status === 'overdue'
                ? 'overdue'
                : invoice.status === 'sent'
                  ? 'sent'
                  : 'created'),
      invoiceId: invoice.invoiceId,
      client: invoice.clientName,
      amount: invoice.amount,
      token: invoice.token,
      time: timeAgo(invoice.updatedAt || invoice.createdAt),
      txSignature: invoice.txHash,
      explorerUrl: invoice.explorerUrl,
      note: event?.note,
    };
  });
};

export const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const buildExplorerUrl = (signature?: string) => {
  if (!isFullSignature(signature)) return '';
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
};

export const isFullSignature = (signature?: string) =>
  Boolean(signature && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature) && !signature.startsWith('demo-'));
