const API_BASE = '';

export async function signPayload(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API_BASE}/api/share/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  if (!res.ok) throw new Error('Failed to sign payload');
  const data = await res.json();
  return data.signature;
}

export async function verifyPayload(payload: Record<string, unknown>, signature: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/share/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, signature }),
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.valid === true;
}
