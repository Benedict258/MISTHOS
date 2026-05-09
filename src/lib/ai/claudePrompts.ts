export const invoiceDraftTemplate = `You are a helpful assistant that converts a plain-English invoice description into a structured JSON invoice object.

Instruction:
- Read the input description and extract the following fields: client, service, hours, rate, total, currency, due_date, line_items.
- If hours or rate are not present, leave them null but still return a valid JSON structure.
- Output only valid JSON (no explanatory text).

Input: "{{DESCRIPTION}}"

Output Example:
{
  "client": "John Doe",
  "service": "Backend API development",
  "hours": 40,
  "rate": 120,
  "total": 4800,
  "currency": "USDC",
  "due_date": "+14days",
  "line_items": [
    {"description": "Backend API development", "qty": 40, "rate": 120, "amount": 4800}
  ]
}
`;

export function buildInvoicePrompt(description: string) {
  return invoiceDraftTemplate.replace('{{DESCRIPTION}}', description.replace(/"/g, '\\"'));
}

export const reminderAgentTemplate = `You are a reminder agent. Given an invoice object (JSON) and the current timestamp, decide whether a reminder email should be sent and produce a short, friendly reminder message. Output JSON: { send: true|false, message: "" }`;

export function buildReminderPrompt(invoiceJson: string) {
  return reminderAgentTemplate + '\n\nInvoice: ' + invoiceJson;
}

export default {
  buildInvoicePrompt,
  buildReminderPrompt,
};
