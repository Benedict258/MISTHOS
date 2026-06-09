import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [];
app.use(cors({
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : false,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.API_PORT || 3001;

// HMAC secret - required in production
const HMAC_SECRET = process.env.HMAC_SECRET;
if (!HMAC_SECRET) {
  console.error('HMAC_SECRET environment variable is required');
  process.exit(1);
}

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

// --- HTML escaping for PDF generation ---
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// --- Sanitize prompt for AI input ---
function sanitizePrompt(input: string): string {
  return input.replace(/[{}<>]/g, '').slice(0, 2000);
}

// --- AI Draft Endpoint ---
app.post('/api/ai/draft', async (req, res) => {
  if (!rateLimit(`ai-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Prompt is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    
    const sanitizedPrompt = sanitizePrompt(prompt);
    const message = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an invoice drafting assistant. Based on the following description, create a structured invoice with client name, description, line items (each with description, quantity, rate), and due date. Return ONLY valid JSON with this structure: { "clientName": string, "description": string, "lineItems": [{ "description": string, "quantity": number, "rate": number }], "dueDate": string (YYYY-MM-DD) }\n\nDescription: ${sanitizedPrompt}`
      }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.status(500).json({ error: 'Could not parse AI response' });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI drafting failed';
    res.status(500).json({ error: message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Email send failed';
    res.status(500).json({ error: message });
  }
});

// --- Voice Transcription (Mock) ---
app.post('/api/voice/transcribe', async (req, res) => {
  if (!rateLimit(`voice-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
  res.json({
    transcript: 'Invoice Acme for 10 hours at $120/hr, due in 14 days.',
    source: 'mock',
  });
});

// --- Analytics Dashboard ---
app.get('/api/analytics/dashboard', async (req, res) => {
  if (!rateLimit(`analytics-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });
  
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
      <p><strong>Client:</strong> ${escapeHtml(invoice.clientName || 'N/A')}</p>
      <p><strong>Description:</strong> ${escapeHtml(invoice.description || 'N/A')}</p>
      <p><strong>Due Date:</strong> ${escapeHtml(invoice.dueDate || 'N/A')}</p>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          ${(invoice.lineItems || []).map((item: { description?: string; quantity?: number | string; rate?: number | string }) => 
            `<tr><td>${escapeHtml(String(item.description || ''))}</td><td>${escapeHtml(String(item.quantity || ''))}</td><td>${escapeHtml(String(item.rate || ''))}</td><td>${Number(item.quantity || 0) * Number(item.rate || 0)}</td></tr>`
          ).join('')}
        </tbody>
      </table>
      <p class="total">Total: ${escapeHtml(String(invoice.totalAmount || 0))} ${escapeHtml(invoice.currency || 'SOL')}</p>
    </body>
    </html>
  `;
  
  res.json({ html, success: true });
});

// --- HMAC Sign Endpoint ---
app.post('/api/share/sign', async (req, res) => {
  if (!rateLimit(`sign-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });

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
  if (!rateLimit(`verify-${req.ip}`)) return res.status(429).json({ error: 'Rate limit exceeded' });

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
