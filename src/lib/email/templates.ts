type InvoiceEmailParams = {
  invoiceId: string;
  creatorName: string;
  payerEmail: string;
  payerName?: string;
  amount: number;
  currency: string;
  dueDate: string;
  description: string;
  paymentLink: string;
};

export function generateInvoiceEmailHTML(params: InvoiceEmailParams): string {
  const {
    invoiceId,
    creatorName,
    payerEmail,
    payerName,
    amount,
    currency,
    dueDate,
    description,
    paymentLink,
  } = params;

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9fafb; padding: 40px 20px; border-radius: 0 0 8px 8px; }
          .invoice-details { background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; color: #666; }
          .detail-value { color: #333; }
          .amount { font-size: 24px; font-weight: 700; color: #667eea; }
          .cta-button { background: #667eea; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; font-weight: 600; }
          .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice from ${creatorName}</h1>
          </div>
          <div class="content">
            <div class="invoice-details">
              <div class="detail-row">
                <span class="detail-label">Invoice ID</span>
                <span class="detail-value">${invoiceId}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Bill To</span>
                <span class="detail-value">${payerName || payerEmail}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Description</span>
                <span class="detail-value">${description}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Due Date</span>
                <span class="detail-value">${dueDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Amount</span>
                <span class="detail-value amount">${amount.toFixed(2)} ${currency}</span>
              </div>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${paymentLink}" class="cta-button">Pay Invoice</a>
            </p>

            <p style="color: #666; font-size: 14px;">
              Click the button above to pay this invoice securely. We accept multiple payment methods including credit cards, cryptocurrency, and cross-chain payments.
            </p>
          </div>

          <div class="footer">
            <p>© 2026 Misthos. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendInvoiceEmail(
  params: InvoiceEmailParams,
  apiBaseUrl: string = 'http://localhost:3000'
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const emailHTML = generateInvoiceEmailHTML(params);

    const response = await fetch(`${apiBaseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: params.payerEmail,
        subject: `Invoice ${params.invoiceId} from ${params.creatorName}`,
        html: emailHTML,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send email',
      };
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}
