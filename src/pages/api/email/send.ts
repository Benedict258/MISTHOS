import type { NextApiRequest, NextApiResponse } from 'next';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com/emails';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
};

type SendEmailResponse = {
  id?: string;
  error?: string;
  details?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendEmailResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, from = 'noreply@misthos.dev', cc, bcc } = req.body as EmailPayload;

  if (!to || !subject || !html) {
    return res.status(400).json({
      error: 'Missing required fields',
      details: 'to, subject, and html are required',
    });
  }

  if (!RESEND_API_KEY) {
    return res.status(500).json({
      error: 'Email service not configured',
      details: 'RESEND_API_KEY is not set',
    });
  }

  try {
    const payload = {
      from,
      to,
      subject,
      html,
      ...(cc && { cc }),
      ...(bcc && { bcc }),
    };

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(response.status).json({
        error: 'Failed to send email',
        details: data.message || 'Unknown error',
      });
    }

    return res.status(200).json({ id: data.id });
  } catch (error: any) {
    console.error('Email send error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
}
