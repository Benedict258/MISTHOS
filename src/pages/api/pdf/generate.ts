import type { NextApiRequest, NextApiResponse } from 'next';

type PDFRequest = {
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

function generatePDFHTML(params: PDFRequest): string {
  const {
    invoiceId,
    creatorName,
    payerName,
    amount,
    currency,
    dueDate,
    description,
    status,
    paymentDate,
  } = params;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoiceId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; background: white; }
        .page { width: 210mm; height: 297mm; padding: 20mm; margin: 0 auto; }
        .header { border-bottom: 2px solid #667eea; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #667eea; }
        .subtitle { font-size: 12px; color: #999; margin-top: 5px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .label { font-weight: 600; color: #666; width: 30%; }
        .value { color: #333; width: 70%; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
        .amount-box { background: #f0f4ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .amount { font-size: 36px; font-weight: 700; color: #667eea; }
        .amount-label { font-size: 12px; color: #666; margin-top: 5px; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-settled { background: #dbeafe; color: #0c4a6e; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #999; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="title">INVOICE</div>
          <div class="subtitle">Invoice #${invoiceId}</div>
        </div>

        <div class="section">
          <div class="section-title">INVOICE FROM</div>
          <div class="row">
            <div class="label">Issuer:</div>
            <div class="value">${creatorName}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">BILL TO</div>
          <div class="row">
            <div class="label">Client:</div>
            <div class="value">${payerName}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">INVOICE DETAILS</div>
          <div class="row">
            <div class="label">Description:</div>
            <div class="value">${description}</div>
          </div>
          <div class="row">
            <div class="label">Due Date:</div>
            <div class="value">${dueDate}</div>
          </div>
          <div class="row">
            <div class="label">Status:</div>
            <div class="value">
              <span class="status-badge status-${status.toLowerCase()}">${status.toUpperCase()}</span>
            </div>
          </div>
          ${paymentDate ? `
          <div class="row">
            <div class="label">Payment Date:</div>
            <div class="value">${paymentDate}</div>
          </div>
          ` : ''}
        </div>

        <div class="amount-box">
          <div class="amount">${amount.toFixed(2)}</div>
          <div class="amount-label">${currency}</div>
        </div>

        <div class="section">
          <div class="section-title">POWERED BY</div>
          <p style="font-size: 12px; color: #666;">
            This invoice was created and settled using Misthos, a blockchain-native invoice and payment system built on Solana.
            All transactions are immutable and can be verified on the Solana blockchain.
          </p>
        </div>

        <div class="footer">
          <p>© 2026 Misthos. Generated on ${new Date().toLocaleString()}</p>
          <p>This is an automated document. For inquiries, contact the invoice issuer.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = req.body as PDFRequest;

  if (!params.invoiceId || !params.creatorName || !params.payerName || !params.amount) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'invoiceId, creatorName, payerName, and amount are required',
    });
  }

  try {
    const htmlContent = generatePDFHTML(params);

    // For now, return HTML that can be rendered as PDF on the client side
    // In production, you would use a library like puppeteer or cloud service
    res.status(200).json({
      success: true,
      invoice_id: params.invoiceId,
      html: htmlContent,
      format: 'html',
      note: 'Use client-side html2pdf or send to external PDF service for actual PDF generation',
    });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      details: error.message,
    });
  }
}
