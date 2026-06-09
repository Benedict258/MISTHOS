import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.API_PORT || 3001;

// HMAC secret for share links
const HMAC_SECRET = process.env.HMAC_SECRET || crypto.randomBytes(32).toString('hex');

// --- Rate limiting (simple in-memory) ---
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// --- AI Draft Endpoint ---
app.post('/api/ai/draft', async (req, res) => {
  if (!rateLimit(`ai-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    
    const message = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an invoice drafting assistant. Based on the following description, create a structured invoice with client name, description, line items (each with description, quantity, rate), and due date. Return ONLY valid JSON with this structure: { "clientName": string, "description": string, "lineItems": [{ "description": string, "quantity": number, "rate": number }], "dueDate": string (YYYY-MM-DD) }\n\nDescription: ${prompt}`
      }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(500).json({ error: 'Could not parse AI response' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI drafting failed' });
  }
});

// --- Email Send Endpoint ---
app.post('/api/email/send', async (req, res) => {
  if (!rateLimit(`email-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing required fields' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Email service not configured' });

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'MISTHOS <noreply@misthos.app>',
      to,
      subject,
      html,
    });

    res.json({ success: true, id: result.data?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Email send failed' });
  }
});

// --- Voice Transcription (Mock) ---
app.post('/api/voice/transcribe', async (req, res) => {
  if (!rateLimit(`voice-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
  // Mock transcription for MVP
  res.json({
    transcript: 'Invoice Acme for 10 hours at $120/hr, due in 14 days.',
    source: 'mock',
  });
});

// --- Analytics Dashboard ---
app.get('/api/analytics/dashboard', async (req, res) => {
  if (!rateLimit(`analytics-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
  // Mock analytics for now - in production, compute from Supabase data
  res.json({
    totalRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    averagePaymentTime: 0,
    topClients: [],
    recentActivity: [],
  });
});

// --- PDF Generation ---
app.post('/api/pdf/generate', async (req, res) => {
  if (!rateLimit(`pdf-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
  const { invoice } = req.body;
  if (!invoice) return res.status(400).json({ error: 'Invoice data required' });

  // Generate HTML for PDF - client will use html2pdf.js to convert
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f8f9fa; }
        .total { font-size: 1.2em; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Invoice</h1>
      <p><strong>Client:</strong> ${invoice.clientName || 'N/A'}</p>
      <p><strong>Description:</strong> ${invoice.description || 'N/A'}</p>
      <p><strong>Due Date:</strong> ${invoice.dueDate || 'N/A'}</p>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          ${(invoice.lineItems || []).map((item: any) => 
            `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${item.rate}</td><td>${item.quantity * item.rate}</td></tr>`
          ).join('')}
        </tbody>
      </table>
      <p class="total">Total: ${invoice.totalAmount || 0} ${invoice.currency || 'SOL'}</p>
    </body>
    </html>
  `;
  
  res.json({ html, success: true });
});

// --- HMAC Sign Endpoint ---
app.post('/api/share/sign', async (req, res) => {
  const { payload } = req.body;
  if (!payload) return res.status(400).json({ error: 'Payload required' });

  const signature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  res.json({ signature, payload });
});

// --- HMAC Verify Endpoint ---
app.post('/api/share/verify', async (req, res) => {
  const { payload, signature } = req.body;
  if (!payload || !signature) return res.status(400).json({ error: 'Payload and signature required' });

  const expected = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));

  if (!isValid) return res.status(403).json({ error: 'Invalid signature', valid: false });

  res.json({ valid: true, payload });
});

// --- Health check ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`MISTHOS API server running on port ${PORT}`);
});
