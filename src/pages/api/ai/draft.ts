import type { NextApiRequest, NextApiResponse } from 'next';
import { buildInvoicePrompt } from '../../../lib/ai/claudePrompts';
import Anthropic from '@anthropic-ai/sdk';

type Invoice = {
  client: string | null;
  service: string;
  hours: number | null;
  rate: number | null;
  total: number | null;
  currency: string;
  due_date: string;
  line_items: Array<{ description: string; qty: number; rate: number; amount: number }>;
};

function parseInvoiceFromText(text: string): Invoice {
  const hoursMatch = text.match(/(\d+)\s*hours?/i);
  const rateMatch = text.match(/\$?(\d+(?:\.\d+)?)(?:\s*(?:per hour|\/hr|hr))?/i);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : null;
  const rate = rateMatch ? parseFloat(rateMatch[1]) : null;
  const total = hours != null && rate != null ? Math.round(hours * rate * 100) / 100 : null;
  const invoice: Invoice = {
    client: null,
    service: text,
    hours,
    rate,
    total,
    currency: 'USDC',
    due_date: '+14days',
    line_items: [
      {
        description: text,
        qty: hours || 1,
        rate: rate || 0,
        amount: total || 0,
      },
    ],
  };
  return invoice;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Please provide a `text` field in the POST body.' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const client = new Anthropic({ apiKey });
    const systemPrompt = buildInvoicePrompt(text);

    const message = await client.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nUser input: ${text}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const invoice = parseInvoiceFromText(responseText || text);

    return res.status(200).json({
      prompt: systemPrompt,
      invoice,
      source: 'claude',
      claude_response: responseText,
      model: 'claude-opus-4-1',
      stop_reason: message.stop_reason,
    });
  } catch (error: any) {
    console.error('Claude API error:', error);
    return res.status(500).json({
      error: 'Failed to generate invoice draft',
      details: error.message,
    });
  }
}
