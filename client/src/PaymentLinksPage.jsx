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
  const [expiresInMins, setExpiresInMins] = useState(null); // null = standard backend default (not forced)
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
      if (expiresInMins) {
        payload.expiresInMins = Number(expiresInMins);
      }

      let created;
      try {
        created = await createPaymentLink(payload);
      } catch (err) {
        // If the backend has not yet been updated and rejects unknown fields, cleanly retry with standard payload
        if (payload.expiresInMins) {
          const fallbackPayload = {
            amount: payload.amount,
            receipt: payload.receipt,
          };
          if (payload.redirectUrl) fallbackPayload.redirectUrl = payload.redirectUrl;
          created = await createPaymentLink(fallbackPayload);
        } else {
          throw err;
        }
      }

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
      setExpiresInMins(null);
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
            className="btn-primary-pulse inline-flex min-h-[44px] sm:min-h-0 sm:h-10 items-center justify-center gap-2 px-5 text-xs font-bold w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Payment Link</span>
          </button>
        }
      />

      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      {/* Creation Modal */}
      {createOpen && (
        <Panel className="border border-[var(--pulse-line)] bg-[var(--pulse-panel)]">
          <div className="flex items-center justify-between border-b border-[var(--pulse-line)] px-5 sm:px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--pulse-ink)]">Create New Payment Link</h2>
              <p className="mt-0.5 text-xs text-[var(--pulse-muted)]">Generate a unique direct-UPI checkout URL for your customer</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)] hover:bg-[var(--pulse-panel-2)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="pulse-eyebrow block text-[10px]">
                  Amount (₹) *
                </label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[var(--pulse-muted)]">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 499.00"
                    className="h-11 w-full rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] pl-8 pr-4 text-sm font-semibold text-[var(--pulse-ink)] outline-none focus:border-[var(--pulse-mint)] focus:ring-2 focus:ring-[var(--pulse-mint)]/20"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[var(--pulse-muted)]">Exact amount customer will transfer.</p>
              </div>

              <div>
                <label className="pulse-eyebrow block text-[10px]">
                  Purpose / Item Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  placeholder="e.g. Website Consulting / Order #101"
                  className="mt-1.5 h-11 w-full rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] px-3.5 text-sm font-semibold text-[var(--pulse-ink)] outline-none focus:border-[var(--pulse-mint)] focus:ring-2 focus:ring-[var(--pulse-mint)]/20"
                />
                <p className="mt-1 text-[11px] text-[var(--pulse-muted)]">Shown to customer on checkout screen.</p>
              </div>
            </div>

            <div>
              <label className="pulse-eyebrow block text-[10px]">
                Link Validity / Expiry Duration
              </label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { mins: null, label: 'Default', badge: 'Standard', detail: 'Normal window' },
                  { mins: 1440, label: '24 Hours', badge: 'Extended', detail: 'Best for WhatsApp' },
                  { mins: 4320, label: '3 Days', badge: null, detail: 'Long invoice' },
                  { mins: 60, label: '1 Hour', badge: null, detail: 'Short window' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setExpiresInMins(opt.mins)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition active:scale-95 ${
                      expiresInMins === opt.mins
                        ? 'pulse-toggle-active font-bold'
                        : 'border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)]'
                    }`}
                  >
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] opacity-80">{opt.badge || opt.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="pulse-eyebrow block text-[10px]">
                Success Redirect URL (Optional)
              </label>
              <input
                type="url"
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="https://yourwebsite.com/thank-you"
                className="mt-1.5 h-11 w-full rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] px-3.5 text-sm text-[var(--pulse-ink)] outline-none focus:border-[var(--pulse-mint)] focus:ring-2 focus:ring-[var(--pulse-mint)]/20"
              />
              <p className="mt-1 text-[11px] text-[var(--pulse-muted)]">Auto-redirects customer upon payment confirmation.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="btn-secondary-pulse px-4 py-2.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary-pulse inline-flex min-h-[42px] items-center justify-center gap-2 px-5 text-xs font-bold disabled:opacity-50"
              >
                {creating ? 'Generating…' : 'Generate Payment Link'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Newly Created Share Modal */}
      {newLink && (
        <Panel hero className="border border-[var(--pulse-line)] bg-[var(--pulse-panel)]">
          <div className="flex items-start justify-between border-b border-[var(--pulse-line)] px-5 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--pulse-gradient)] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-[var(--font-display)] text-base sm:text-lg font-bold text-[var(--pulse-ink)]">
                  Payment Link Ready!
                </h3>
                <p className="text-xs text-[var(--pulse-muted)]">
                  Share this link via WhatsApp, SMS, or QR code to collect payment instantly.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewLink(null)}
              className="rounded-lg p-1 text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)] hover:bg-[var(--pulse-panel-2)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 grid gap-5 md:grid-cols-[1fr_200px]">
            <div className="space-y-4">
              <div>
                <span className="pulse-eyebrow text-[10px]">
                  Checkout URL
                </span>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-2">
                  <input
                    type="text"
                    readOnly
                    value={newLink.fullUrl}
                    className="flex-1 select-all bg-transparent font-mono text-xs text-[var(--pulse-ink)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(newLink.fullUrl, 'modal')}
                    className="btn-primary-pulse inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#25d366] hover:brightness-105 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Share on WhatsApp</span>
                </a>
                <a
                  href={newLink.fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary-pulse inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Checkout</span>
                </a>
              </div>
            </div>

            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--pulse-line)] bg-white p-3 shadow-sm">
                <img src={qrDataUrl} alt="QR Code" className="h-32 w-32" />
                <span className="mt-1 text-[10px] font-bold text-slate-800 uppercase tracking-wider">UPI QR Code</span>
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
                className="btn-primary-pulse inline-flex min-h-[42px] items-center gap-2 px-4 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create First Link</span>
              </button>
            }
          />
        ) : (
          <>
            {/* Mobile Card View (< sm screens) */}
            <div className="divide-y divide-[var(--pulse-line)] sm:hidden">
              {links.map((item) => {
                const fullUrl = item.checkoutUrl?.startsWith('http')
                  ? item.checkoutUrl
                  : `${window.location.origin}${item.checkoutUrl?.startsWith('/') ? '' : '/'}${item.checkoutUrl}`;
                return (
                  <div key={item.orderId} className="p-4 space-y-3 hover:bg-[var(--pulse-panel-2)] transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--pulse-ink)] truncate">{item.receipt}</p>
                        <p className="font-mono text-[11px] text-[var(--pulse-muted)] truncate">{item.orderId}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-[var(--pulse-panel-2)] border border-[var(--pulse-line)] p-2.5">
                      <div>
                        <p className="pulse-eyebrow text-[10px]">Amount</p>
                        <p className="font-[var(--font-display)] text-base font-extrabold text-[var(--pulse-ink)] tabular-nums">
                          ₹{item.payableAmount}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="pulse-eyebrow text-[10px]">UTR</p>
                        <p className="font-mono text-xs font-semibold text-[var(--pulse-mint)]">
                          {item.utr || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-[var(--pulse-muted)]">
                        {formatDate(item.createdAt)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(fullUrl, item.orderId)}
                          className="btn-secondary-pulse inline-flex h-8 items-center gap-1 px-2.5 text-[11px] font-semibold"
                        >
                          {copiedId === item.orderId ? <Check className="h-3 w-3 text-[var(--pulse-mint)]" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedId === item.orderId ? 'Copied' : 'Copy'}</span>
                        </button>
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary-pulse inline-flex h-8 w-8 items-center justify-center"
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
                  <tr className="border-b border-[var(--pulse-line)] bg-[var(--pulse-panel)] text-[10px] font-bold uppercase tracking-wider text-[var(--pulse-muted)]">
                    <th className="py-3.5 px-6">Item / Purpose</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Bank UTR</th>
                    <th className="py-3.5 px-4">Created</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pulse-line)]">
                  {links.map((item) => {
                    const fullUrl = item.checkoutUrl?.startsWith('http')
                      ? item.checkoutUrl
                      : `${window.location.origin}${item.checkoutUrl?.startsWith('/') ? '' : '/'}${item.checkoutUrl}`;
                    return (
                      <tr key={item.orderId} className="hover:bg-[var(--pulse-panel-2)] transition">
                        <td className="py-4 px-6 font-semibold text-[var(--pulse-ink)]">
                          <div>{item.receipt}</div>
                          <div className="font-mono text-[10px] text-[var(--pulse-muted)]">{item.orderId}</div>
                        </td>
                        <td className="py-4 px-4 font-extrabold text-[var(--pulse-ink)] tabular-nums">
                          ₹{item.payableAmount}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="py-4 px-4 font-mono text-[var(--pulse-mint)] font-semibold">
                          {item.utr || '—'}
                        </td>
                        <td className="py-4 px-4 text-[var(--pulse-muted)]">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fullUrl, item.orderId)}
                              title="Copy checkout link"
                              className="btn-secondary-pulse inline-flex h-8 items-center gap-1 px-2.5 text-[11px] font-semibold"
                            >
                              {copiedId === item.orderId ? <Check className="h-3 w-3 text-[var(--pulse-mint)]" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedId === item.orderId ? 'Copied' : 'Copy'}</span>
                            </button>
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open link"
                              className="btn-secondary-pulse inline-flex h-8 w-8 items-center justify-center"
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
