import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  QrCode,
  Share2,
  Sparkles,
} from 'lucide-react';
import { createPaymentLink, getPaymentLinks } from './api.js';
import {
  EmptyState,
  ErrorState,
  formatDate,
  formatMoney,
  Notice,
  PageHeading,
  Panel,
  PanelTitle,
} from './MerchantShell.jsx';

export function PaymentLinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(null);

  // Form State
  const [createOpen, setCreateOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Newly Created Link Modal
  const [newLink, setNewLink] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  async function loadLinks() {
    setLoading(true);
    setError('');
    try {
      const res = await getPaymentLinks();
      setLinks(res.paymentLinks || []);
    } catch (err) {
      setError(err.message || 'Could not load payment links');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLinks();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!amount || Number(amount) < 1) {
      setMessage({ tone: 'error', text: 'Enter an amount of at least ₹1.00' });
      return;
    }
    if (!receipt.trim()) {
      setMessage({ tone: 'error', text: 'Please enter a purpose or receipt label.' });
      return;
    }

    setCreating(true);
    setMessage(null);
    try {
      const payload = {
        amount: String(amount).trim(),
        receipt: receipt.trim(),
      };
      if (redirectUrl.trim()) {
        payload.redirectUrl = redirectUrl.trim();
      }

      const created = await createPaymentLink(payload);
      const fullUrl = `${window.location.origin}${created.checkoutUrl}`;

      // Generate QR Code for sharing
      try {
        const qr = await QRCode.toDataURL(fullUrl, { width: 220, margin: 1 });
        setQrDataUrl(qr);
      } catch {
        setQrDataUrl('');
      }

      setNewLink({ ...created, fullUrl });
      setAmount('');
      setReceipt('');
      setRedirectUrl('');
      setCreateOpen(false);
      setMessage({ tone: 'success', text: `Payment link created for ₹${created.payableAmount}!` });
      loadLinks();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Failed to create payment link' });
    } finally {
      setCreating(false);
    }
  }

  async function copyToClipboard(text, id) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          badge="Direct UPI"
          title="Payment Links"
          description="Create and share instant payment links. Collect directly into your UPI account without any code."
        />
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true);
            setMessage(null);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#126b58] px-5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0e5243] active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create Payment Link
        </button>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {/* Creation Modal / Drawer */}
      {createOpen && (
        <Panel className="border-2 border-[#126b58]/30 bg-gradient-to-br from-white to-[#f7faf5]">
          <div className="flex items-center justify-between border-b border-[#e1e8e1] pb-4">
            <PanelTitle
              icon={Link2}
              title="New Payment Link"
              subtitle="Generate a unique checkout URL for your customer"
            />
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg p-1 text-[#6b7b74] hover:bg-[#edf2eb] hover:text-[#142e2b]"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4d665b]">
                  Amount (₹) *
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#6a8074]">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5.00"
                    className="h-11 w-full rounded-xl border border-[#d6dfd5] bg-white pl-8 pr-4 text-sm font-semibold text-[#142e2b] outline-none focus:border-[#126b58] focus:ring-4 focus:ring-[#126b58]/10"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[#788a80]">Exact amount the customer will pay.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4d665b]">
                  Purpose / Item Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  placeholder="e.g. Website Consulting / Order #101"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#d6dfd5] bg-white px-3.5 text-sm font-semibold text-[#142e2b] outline-none focus:border-[#126b58] focus:ring-4 focus:ring-[#126b58]/10"
                />
                <p className="mt-1 text-[11px] text-[#788a80]">Visible to customer on the payment screen.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4d665b]">
                Success Redirect URL (Optional)
              </label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yourwebsite.com/thank-you"
                className="mt-1.5 h-11 w-full rounded-xl border border-[#d6dfd5] bg-white px-3.5 text-sm text-[#142e2b] outline-none focus:border-[#126b58] focus:ring-4 focus:ring-[#126b58]/10"
              />
              <p className="mt-1 text-[11px] text-[#788a80]">Customer will be redirected here after successful payment.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-[#dce5dc] px-4 py-2.5 text-xs font-semibold text-[#5a6e64] hover:bg-[#edf2ea]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#126b58] px-5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0e5243] disabled:opacity-50"
              >
                {creating ? 'Generating…' : 'Generate Payment Link'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Newly Created Share Modal */}
      {newLink && (
        <Panel className="border-2 border-[#126b58] bg-[#f5fbf7]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#cbe9b7] text-[#126b58]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-[var(--font-display)] text-lg font-bold text-[#142e2b]">
                  Payment Link Ready!
                </h3>
                <p className="text-xs text-[#526a5f]">
                  Share this link with your customer via WhatsApp, Email, or SMS.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewLink(null)}
              className="text-[#64796f] hover:text-[#142e2b]"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1fr_200px]">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5a7266]">
                  Payable Link
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#ccdccf] bg-white p-2">
                  <input
                    type="text"
                    readOnly
                    value={newLink.fullUrl}
                    className="flex-1 select-all bg-transparent font-mono text-xs text-[#1e463a] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newLink.fullUrl, 'modal')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf5eb] px-3 py-1.5 text-xs font-bold text-[#126b58] hover:bg-[#dfeddc]"
                  >
                    {copiedId === 'modal' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === 'modal' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Please pay ₹${newLink.payableAmount} for ${newLink.receipt}: ${newLink.fullUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#25d366] px-4 py-2 text-xs font-bold text-white hover:brightness-105"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share on WhatsApp
                </a>
                <a
                  href={newLink.fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#ccdccf] bg-white px-4 py-2 text-xs font-bold text-[#1e463a] hover:bg-[#edf5eb]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Checkout
                </a>
              </div>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#d6e5d8] bg-white p-3">
                <img src={qrDataUrl} alt="QR Code" className="h-32 w-32" />
                <span className="mt-1 text-[10px] font-semibold text-[#5a7266]">Scan to Test</span>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Links List */}
      <Panel>
        <div className="flex items-center justify-between border-b border-[#e1e8e1] pb-4">
          <PanelTitle
            icon={Link2}
            title="All Payment Links"
            subtitle="History of generated payment links and their status"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[#71857a]">Loading payment links…</div>
        ) : error ? (
          <ErrorState message={error} onRetry={loadLinks} />
        ) : links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No payment links yet"
            description="Create your first payment link to collect money directly to your UPI."
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#126b58] px-4 text-xs font-bold text-white hover:bg-[#0e5243]"
              >
                <Plus className="h-3.5 w-3.5" /> Create Link
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e3ebe2] text-[11px] font-bold uppercase tracking-wider text-[#73887d]">
                  <th className="py-3 pl-1 pr-3">Item / Purpose</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">UTR</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="py-3 pl-3 pr-1 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf3eb]">
                {links.map((item) => {
                  const fullUrl = `${window.location.origin}${item.checkoutUrl}`;
                  return (
                    <tr key={item.orderId} className="hover:bg-[#f9fbf8]">
                      <td className="py-3.5 pl-1 pr-3 font-semibold text-[#183930]">
                        <div>{item.receipt}</div>
                        <div className="font-mono text-[10px] text-[#7f9389]">{item.orderId}</div>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-[#142e2b]">
                        ₹{item.payableAmount}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            item.status === 'PAID'
                              ? 'bg-[#dff3e9] text-[#126b58]'
                              : item.status === 'PENDING'
                              ? 'bg-[#fef3c7] text-[#92400e]'
                              : 'bg-[#f1f5f2] text-[#71857b]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[#436458]">
                        {item.utr || '—'}
                      </td>
                      <td className="px-3 py-3.5 text-[#6c8276]">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3.5 pl-3 pr-1 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(fullUrl, item.orderId)}
                            title="Copy link"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d6e3d7] bg-white px-2 text-[11px] font-semibold text-[#126b58] hover:bg-[#edf5eb]"
                          >
                            {copiedId === item.orderId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copiedId === item.orderId ? 'Copied' : 'Copy'}
                          </button>
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open link"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d6e3d7] bg-white text-[#126b58] hover:bg-[#edf5eb]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
