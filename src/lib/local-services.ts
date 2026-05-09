import { buildInvoicePrompt } from '@/lib/ai/claudePrompts';
import type { Invoice } from '@/lib/constants';

export type DraftInvoiceLineItem = {
  description: string;
  qty: number;
  rate: number;
  amount: number;
};

export type DraftInvoice = {
  client: string | null;
  service: string;
  hours: number | null;
  rate: number | null;
  total: number | null;
  currency: string;
  due_date: string;
  line_items: DraftInvoiceLineItem[];
};

export type AnalyticsData = {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  averageInvoiceValue: number;
  currency: string;
  lastUpdated: string;
};

export type EmailSendParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export type PdfReceiptParams = {
  invoiceId: string;
  creatorName: string;
  payerName: string;
  amount: number;
  currency: string;
  dueDate: string;
  description: string;
  status: string;
  paymentDate?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ');

export function draftInvoiceFromText(text: string): DraftInvoice {
  const prompt = buildInvoicePrompt(text);
  const hoursMatch = text.match(/(\d+)\s*hours?/i);
  const rateMatch = text.match(/\$?([\d,]+(?:\.\d+)?)(?:\s*(?:per hour|\/hr|hr))?/i);
  const clientMatch = text.match(/invoice\s+([^,]+?)\s+for/i);
  const dueMatch = text.match(/due\s+in\s+(\d+)\s*days?/i);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : null;
  const rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, '')) : null;
  const total = hours != null && rate != null ? Math.round(hours * rate * 100) / 100 : null;
  const dueOffset = dueMatch ? parseInt(dueMatch[1], 10) : 14;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueOffset);

  const service = text;
  const client = clientMatch ? cleanText(clientMatch[1]) : null;

  return {
    client,
    service,
    hours,
    rate,
    total,
    currency: 'USDC',
    due_date: dueDate.toISOString().slice(0, 10),
    line_items: [
      {
        description: cleanText(text),
        qty: hours || 1,
        rate: rate || 0,
        amount: total || 0,
      },
    ],
  };
}

export async function transcribeAudio(audioBase64?: string): Promise<{ transcript: string; source: 'mock' }> {
  await wait(600);
  return {
    transcript: audioBase64
      ? 'Invoice Acme for 10 hours at $120/hr, due in 14 days.'
      : 'Invoice Acme for 10 hours at $120/hr, due in 14 days.',
    source: 'mock',
  };
}

export async function sendInvoiceEmail(params: EmailSendParams): Promise<{ success: boolean; id?: string; error?: string }> {
  await wait(500);
  if (!params.to || !params.subject || !params.html) {
    return { success: false, error: 'Missing email fields' };
  }

  return {
    success: true,
    id: `mock-email-${Date.now()}`,
  };
}

export function generateInvoiceReceiptHtml(params: PdfReceiptParams): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${params.invoiceId}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; padding: 32px; color: #111827; }
  .card { max-width: 720px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 20px; padding: 24px; }
  .muted { color: #6b7280; }
  .amount { font-size: 32px; font-weight: 800; margin: 24px 0; }
  .row { display: flex; justify-content: space-between; margin: 8px 0; }
</style>
</head>
<body>
  <div class="card">
    <div class="muted">Misthos Receipt</div>
    <h1>Invoice ${params.invoiceId}</h1>
    <p>${params.description}</p>
    <div class="amount">${params.amount.toFixed(2)} ${params.currency}</div>
    <div class="row"><span class="muted">Creator</span><span>${params.creatorName}</span></div>
    <div class="row"><span class="muted">Payer</span><span>${params.payerName}</span></div>
    <div class="row"><span class="muted">Due Date</span><span>${params.dueDate}</span></div>
    <div class="row"><span class="muted">Status</span><span>${params.status}</span></div>
    ${params.paymentDate ? `<div class="row"><span class="muted">Payment Date</span><span>${params.paymentDate}</span></div>` : ''}
  </div>
</body>
</html>`;
}

export async function getDashboardAnalytics(): Promise<AnalyticsData> {
  await wait(400);
  return {
    totalRevenue: 15420.5,
    totalInvoices: 8,
    paidInvoices: 5,
    pendingInvoices: 2,
    averageInvoiceValue: 1927.56,
    currency: 'USDC',
    lastUpdated: new Date().toISOString(),
  };
}

export async function saveReceiptToBrowser(params: PdfReceiptParams): Promise<void> {
  const html = generateInvoiceReceiptHtml(params);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `misthos-invoice-${params.invoiceId}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function invoiceFromOnChainLikeData(invoice: Invoice): PdfReceiptParams {
  return {
    invoiceId: invoice.id,
    creatorName: invoice.creator,
    payerName: invoice.clientName,
    amount: invoice.amount,
    currency: invoice.token,
    dueDate: invoice.dueDate,
    description: invoice.description,
    status: invoice.status,
    paymentDate: invoice.paidAt,
  };
}
