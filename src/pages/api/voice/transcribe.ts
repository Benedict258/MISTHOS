import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In Phase 1 we accept optional `audio` (base64) but just return a mock transcript.
  const { audio } = req.body || {};

  // Simulate processing delay
  await new Promise((r) => setTimeout(r, 900));

  const transcript = audio ? 'Mock transcript from uploaded audio: Invoice Acme for 10 hours at $120/hr' : 'Mock transcript: Invoice Acme for 10 hours at $120/hr';

  return res.status(200).json({ transcript, source: 'mock' });
}
