import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Bot, Mic, MicOff, Plus, Trash2, Send, Sparkles, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { MisthosSDK } from '@/lib/misthos';
import { formatErrorMessage, withRetry } from '@/lib/qa-utils';

const TOKEN_MINTS: Record<string, string> = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  USDT: 'Es9vMFrzaCERmJfrF4H2wF7v4YfLhM1cBh73PvvrLpzT',
  SOL: 'So11111111111111111111111111111111111111112',
};

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  SOL: 9,
};

const encodeSharePayload = (payload: unknown) =>
  encodeURIComponent(window.btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));

interface LineItem {
  description: string;
  quantity: string;
  rate: string;
}

/** Simple NLP parser that extracts invoice details from a natural language prompt */
function parseInvoicePrompt(prompt: string): {
  clientName?: string;
  hours?: string;
  rate?: string;
  description?: string;
  dueDate?: string;
  total?: number;
} {
  const result: ReturnType<typeof parseInvoicePrompt> = {};

  // Extract client name: "Invoice [name] for..."
  const nameMatch = prompt.match(/invoice\s+(\w+(?:\s+\w+)?)\s+for/i);
  if (nameMatch) result.clientName = nameMatch[1];

  // Extract hours/quantity: "20 hours" or "3 weeks"
  const hoursMatch = prompt.match(/(\d+)\s*(?:hours?|hrs?)/i);
  const weeksMatch = prompt.match(/(\d+)\s*weeks?/i);
  if (hoursMatch) result.hours = hoursMatch[1];
  else if (weeksMatch) result.hours = weeksMatch[1];

  // Extract rate: "$150/hr" or "at $2,500" or "$120/hr"
  const rateMatch = prompt.match(/\$[\d,]+(?:\/\w+)?/g);
  if (rateMatch) {
    const cleaned = rateMatch[0].replace(/[$,]/g, '').replace(/\/\w+/, '');
    result.rate = cleaned;
  }

  // Extract description from context
  const descMatch = prompt.match(/(?:of|for)\s+(.+?)(?:\s+at\s+|\s+for\s+\$|\s*,\s*due|\s*$)/i);
  if (descMatch) result.description = descMatch[1].trim();

  // Extract due date: "due in 14 days" or "due in 7 days"
  const dueMatch = prompt.match(/due\s+in\s+(\d+)\s*days?/i);
  if (dueMatch) {
    const days = parseInt(dueMatch[1]);
    const date = new Date();
    date.setDate(date.getDate() + days);
    result.dueDate = date.toISOString().split('T')[0];
  }

  // Calculate total
  if (result.hours && result.rate) {
    result.total = parseFloat(result.hours) * parseFloat(result.rate);
  }

  return result;
}

const CreateInvoice: React.FC = () => {
  const { connected } = useWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { toast } = useToast();
  const navigate = useNavigate();
  const voice = useVoiceInput();

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [token, setToken] = useState('USDC');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: '1', rate: '' },
  ]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const sdk = React.useMemo(() => {
    if (!anchorWallet) return null;
    const provider = new AnchorProvider(connection, anchorWallet, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    return new MisthosSDK(provider);
  }, [connection, anchorWallet]);

  // Process voice transcript when available
  useEffect(() => {
    if (voice.transcript) {
      setAiPrompt(voice.transcript);
      applyAiDraft(voice.transcript);
      toast({ title: 'Voice Captured', description: 'Transcript processed by AI agent.' });
    }
  }, [voice.transcript]);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', rate: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const total = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
  }, 0);

  const applyAiDraft = async (prompt: string) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt }),
      });
      if (!res.ok) throw new Error('AI service error');
      const data = await res.json();
      const invoice = data?.invoice;
      if (invoice) {
        if (invoice.client) setClientName(invoice.client);
        if (invoice.client) setClientEmail(`${invoice.client.toLowerCase().replace(/\s+/g, '.')}@example.com`);
        if (invoice.line_items && invoice.line_items.length) {
          setLineItems(invoice.line_items.map((li: any) => ({
            description: li.description || invoice.service || '',
            quantity: (li.qty || 1).toString(),
            rate: li.rate != null ? String(li.rate) : '',
          })));
        } else if (invoice.service) {
          setLineItems([{ description: invoice.service, quantity: (invoice.hours || 1).toString(), rate: invoice.rate ? String(invoice.rate) : '' }]);
        }
        if (invoice.due_date) setDueDate(invoice.due_date);
        if (invoice.currency) setToken(invoice.currency);
      } else {
        // Fallback to local parser
        const parsed = parseInvoicePrompt(prompt);
        if (parsed.clientName) setClientName(parsed.clientName);
        if (parsed.clientName) setClientEmail(`${parsed.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`);
        if (parsed.description || parsed.clientName) {
          setLineItems([{
            description: parsed.description || `Work for ${parsed.clientName}`,
            quantity: parsed.hours || '1',
            rate: parsed.rate || '',
          }]);
        }
        if (parsed.dueDate) setDueDate(parsed.dueDate);
        setToken('USDC');
      }
      toast({ title: 'AI Draft Complete', description: 'Invoice fields populated from your description.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'AI Error', description: msg });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    await applyAiDraft(aiPrompt);
  };

  const handleVoiceToggle = () => {
    if (voice.isRecording) {
      voice.stopRecording();
    } else {
      voice.startRecording();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sdk) {
      toast({ title: 'Wallet Required', description: 'Connect your Solflare wallet to create an invoice on-chain.' });
      return;
    }

    if (!clientEmail.trim()) {
      toast({ title: 'Email Required', description: 'Enter the client email.' });
      return;
    }

    if (total <= 0) {
      toast({ title: 'Invalid Amount', description: 'Add at least one line item with a rate > 0.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const publicPayer = new PublicKey('11111111111111111111111111111111');
      const tokenMint = new PublicKey(TOKEN_MINTS[token] || TOKEN_MINTS.USDC);
      const decimals = TOKEN_DECIMALS[token] ?? 6;
      const amountInMinorUnits = Math.round(total * Math.pow(10, decimals));
      const dueTimestamp = dueDate
        ? Math.floor(new Date(`${dueDate}T00:00:00Z`).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;

      const invoiceId = sdk.generateInvoiceId();
      const metadataHash = await sdk.generateMetadataHash({
        clientName,
        clientEmail,
        description: notes || lineItems.map((item) => item.description).join(' | '),
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
        })),
      });

      // Retry on RPC failure for robustness
      const createResult = await withRetry(
        () => sdk.createInvoice({
          invoiceId,
          payer: publicPayer,
          amount: amountInMinorUnits,
          tokenMint,
          dueDate: dueTimestamp,
          metadataHash,
        }),
        3,
        1000
      );

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error || 'Failed to create invoice on-chain');
      }

      const invoiceAddress = new PublicKey(createResult.data.invoiceAddress);
      const sendResult = await sdk.sendInvoice(invoiceAddress);
      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Invoice created but failed to send');
      }

      const sharePayload = {
        invoiceAddress: createResult.data.invoiceAddress,
        invoiceId,
        clientName,
        clientEmail,
        description: notes || lineItems.map((item) => item.description).join(' | '),
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
        })),
        amount: total,
        token,
        dueDate: dueDate || new Date(dueTimestamp * 1000).toISOString().slice(0, 10),
      };
      const shareLink = `${window.location.origin}/pay/${createResult.data.invoiceAddress}?d=${encodeSharePayload(sharePayload)}`;

      // Fire-and-forget email (do not block on failure)
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientEmail,
          subject: `Invoice ${invoiceId} from Misthos`,
          html: `
            <p>Hello ${clientName || 'Client'},</p>
            <p>You have a new invoice on Misthos.</p>
            <p><strong>Amount:</strong> ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${token}</p>
            <p><strong>Due Date:</strong> ${dueDate || 'N/A'}</p>
            <p>Pay here: <a href="${shareLink}">${shareLink}</a></p>
            <p>Regards,<br/>Misthos</p>
          `,
        }),
      }).catch(() => undefined);

      setShareUrl(shareLink);
      toast({
        title: 'Invoice Created On-Chain',
        description: `Share link ready: ${shareLink}`,
      });

      // Redirect to payment page after brief delay for user to see toast
      setTimeout(() => navigate(`/pay/${createResult.data.invoiceAddress}?d=${encodeSharePayload(sharePayload)}`), 1200);
    } catch (error) {
      const friendlyMsg = formatErrorMessage(error);
      toast({
        title: 'Create Invoice Failed',
        description: friendlyMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="app" />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 text-center max-w-md w-full"
          >
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your wallet to create invoices on Solana.
            </p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-4xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Create Invoice</h1>
          <p className="text-sm text-muted-foreground mb-8">Fill in the details, use AI to draft from a description, or speak your invoice.</p>
        </motion.div>

        {shareUrl && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 mb-6 border-primary/20"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Invoice link ready</p>
                <p className="text-xs text-muted-foreground break-all">{shareUrl}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={shareUrl}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:opacity-90 transition-opacity"
                >
                  Open Invoice
                </a>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Draft Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Invoice Drafting</h3>
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Powered by Claude</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='e.g., "Invoice John for 20 hours of React dev at $150/hr, due in 14 days"'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiDraft()}
              className="flex-1 px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleAiDraft}
              disabled={isAiLoading || !aiPrompt.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {isAiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Draft
            </button>
            <button
              onClick={handleVoiceToggle}
              disabled={voice.isProcessing}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                voice.isRecording
                  ? 'border-destructive bg-destructive/10 text-destructive animate-pulse'
                  : voice.isProcessing
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
              title={voice.isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {voice.isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : voice.isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
          {voice.isRecording && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              Recording... Speak your invoice details, then click stop.
            </p>
          )}
          {voice.isProcessing && (
            <p className="text-xs text-primary mt-2 flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing with ElevenLabs STT...
            </p>
          )}
          {voice.error && (
            <p className="text-xs text-destructive mt-2">{voice.error}</p>
          )}
        </motion.div>

        {/* Invoice Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-5 sm:p-6 space-y-6"
        >
          {/* Client Details */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Client Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="Sarah Chen"
                  className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Client Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                  placeholder="sarah@designco.io"
                  className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Payment Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Token</label>
                <select
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Line Items</h3>
              <button
                type="button"
                onClick={addLineItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 sm:col-span-6">
                    {i === 0 && <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>}
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                      required
                      placeholder="Service description"
                      className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    {i === 0 && <label className="block text-xs font-medium text-muted-foreground mb-1.5">Qty</label>}
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    {i === 0 && <label className="block text-xs font-medium text-muted-foreground mb-1.5">Rate ($)</label>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateLineItem(i, 'rate', e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLineItem(i)}
                      disabled={lineItems.length === 1}
                      className="w-full flex items-center justify-center py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes / Description */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or description for the payer (optional)..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
          </div>

          {/* Total & Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-foreground">
                {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm text-muted-foreground">{token}</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-amber-sm hover:shadow-amber hover:opacity-90 transition-all w-full sm:w-auto justify-center"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmitting ? 'Submitting On-Chain...' : 'Create & Send Invoice'}
            </button>
          </div>
        </motion.form>
      </main>
    </div>
  );
};

export default CreateInvoice;
