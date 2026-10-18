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
  X,
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
  StatusBadge,
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
  const [expiresInMins, setExpiresInMins] = useState(1440); // 24 hours default
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
        expiresInMins: Number(expiresInMins) || 1440,
      };
      if (redirectUrl.trim()) {
        payload.redirectUrl = redirectUrl.trim();
      }

      const created = await createPaymentLink(payload);
      const fullUrl = created.checkoutUrl?.startsWith('http')
        ? created.checkoutUrl
        : `${window.location.origin}${created.checkoutUrl?.startsWith('/') ? '' : '/'}${created.checkoutUrl}`;

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
    <div className="page-enter space-y-6">
      <PageHeading
        eyebrow="Direct UPI checkout"
        title="Payment Links"
        detail="Generate instant branded checkout links and dynamic QR codes. Collect funds straight to your UPI ID without code."
        action={
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setMessage(null);
            }}
            className="inline-flex min-h-[44px] sm:min-h-0 sm:h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-xs font-bold text-white shadow-2xs transition active:scale-95 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Payment Link</span>
          </button>
        }
      />

      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      {/* Creation Modal */}
      {createOpen && (
        <Panel className="border-2 border-emerald-500/30 bg-gradient-to-br from-white to-emerald-50/30 dark:from-[#0e1714] dark:to-[#091512]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 px-5 sm:px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Create New Payment Link</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Generate a unique direct-UPI checkout URL for your customer</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[.06]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Amount (₹) *
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 499.00"
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] pl-8 pr-4 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Exact amount customer will transfer.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Purpose / Item Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  placeholder="e.g. Website Consulting / Order #101"
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Shown to customer on checkout screen.</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Link Validity / Expiry Duration
              </label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { mins: 1440, label: '24 Hours', badge: 'Recommended', detail: 'Best for WhatsApp' },
                  { mins: 4320, label: '3 Days', badge: null, detail: 'Longer invoice' },
                  { mins: 60, label: '1 Hour', badge: null, detail: 'Short window' },
                  { mins: 15, label: '15 Minutes', badge: null, detail: 'Flash sale' },
                ].map((opt) => (
                  <button
                    key={opt.mins}
                    type="button"
                    onClick={() => setExpiresInMins(opt.mins)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition active:scale-95 ${
                      expiresInMins === opt.mins
                        ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs'
                        : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.02] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[.04]'
                    }`}
                  >
                    <span className="text-xs">{opt.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{opt.badge || opt.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Success Redirect URL (Optional)
              </label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yourwebsite.com/thank-you"
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Auto-redirects customer upon payment confirmation.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[.04]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-xs font-bold text-white shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                {creating ? 'Generating…' : 'Generate Payment Link'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Newly Created Share Modal */}
      {newLink && (
        <Panel className="border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/50 via-white to-transparent dark:from-emerald-950/20 dark:via-[#0e1714] dark:to-[#0e1714]">
          <div className="flex items-start justify-between border-b border-emerald-200/60 dark:border-white/10 px-5 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-[var(--font-display)] text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Payment Link Ready!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share this link via WhatsApp, SMS, or QR code to collect payment instantly.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewLink(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[.06]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 grid gap-5 md:grid-cols-[1fr_200px]">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Checkout URL
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#12201b] p-2">
                  <input
                    type="text"
                    readOnly
                    value={newLink.fullUrl}
                    className="flex-1 select-all bg-transparent font-mono text-xs text-slate-900 dark:text-emerald-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newLink.fullUrl, 'modal')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition active:scale-95"
                  >
                    {copiedId === 'modal' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedId === 'modal' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Please pay ₹${newLink.payableAmount} for ${newLink.receipt}: ${newLink.fullUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#25d366] hover:bg-[#20ba5a] px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition active:scale-95"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share on WhatsApp</span>
                </a>
                <a
                  href={newLink.fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.04] px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/[.08] transition shadow-2xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Checkout</span>
                </a>
              </div>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white p-3 shadow-2xs">
                <img src={qrDataUrl} alt="QR Code" className="h-32 w-32" />
                <span className="mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">UPI QR Code</span>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Links List */}
      <Panel className="overflow-hidden">
        <PanelTitle
          title="All Payment Links"
          detail="History of generated links, active payment requests, and settlements"
        />

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">Loading payment links…</div>
        ) : error ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={loadLinks} />
          </div>
        ) : links.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No payment links yet"
            detail="Create your first payment link to collect direct UPI payments from customers."
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white shadow-2xs transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Link</span>
              </button>
            }
          />
        ) : (
          <>
            {/* Mobile Card View (< sm screens) */}
            <div className="divide-y divide-slate-100 dark:divide-white/[.06] sm:hidden">
              {links.map((item) => {
                const fullUrl = item.checkoutUrl?.startsWith('http')
                  ? item.checkoutUrl
                  : `${window.location.origin}${item.checkoutUrl?.startsWith('/') ? '' : '/'}${item.checkoutUrl}`;
                return (
                  <div key={item.orderId} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-white/[.02] transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.receipt}</p>
                        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.orderId}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50/70 dark:bg-white/[.03] p-2.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</p>
                        <p className="font-[var(--font-display)] text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          ₹{item.payableAmount}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">UTR</p>
                        <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {item.utr || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(fullUrl, item.orderId)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.04] px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                        >
                          {copiedId === item.orderId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedId === item.orderId ? 'Copied' : 'Copy'}</span>
                        </button>
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.04] text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-6">Item / Purpose</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Bank UTR</th>
                    <th className="py-3.5 px-4">Created</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {links.map((item) => {
                    const fullUrl = item.checkoutUrl?.startsWith('http')
                      ? item.checkoutUrl
                      : `${window.location.origin}${item.checkoutUrl?.startsWith('/') ? '' : '/'}${item.checkoutUrl}`;
                    return (
                      <tr key={item.orderId} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition">
                        <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                          <div>{item.receipt}</div>
                          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{item.orderId}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-white tabular-nums">
                          ₹{item.payableAmount}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-4 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {item.utr || '—'}
                        </td>
                        <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fullUrl, item.orderId)}
                              title="Copy checkout link"
                              className="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.04] px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[.08] transition shadow-2xs active:scale-95"
                            >
                              {copiedId === item.orderId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedId === item.orderId ? 'Copied' : 'Copy'}</span>
                            </button>
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open link"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.04] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[.08] transition shadow-2xs active:scale-95"
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
          </>
        )}
      </Panel>
    </div>
  );
}
