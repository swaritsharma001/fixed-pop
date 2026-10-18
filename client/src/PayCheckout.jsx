import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  buildApiUrl,
  getCheckoutStatus,
  getPublicCheckout,
  submitCheckoutUtr,
} from './api.js';

function Icon({ name, className = '' }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (name === 'lock') {
    return <svg {...common}><rect x="4.5" y="10" width="15" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>;
  }
  if (name === 'copy') {
    return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
  }
  if (name === 'arrow') {
    return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  }
  if (name === 'check') {
    return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  }
  if (name === 'clock') {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  }
  if (name === 'refresh') {
    return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.7 9a7 7 0 0 1 11.6-2L20 12M4 12l2.7 5a7 7 0 0 0 11.6-2" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>;
}

function outcomeFromStatus(status) {
  const value = String(status || '').toLowerCase();
  if (/paid|success|complete|captured/.test(value)) return 'success';
  if (/expired|timeout/.test(value)) return 'expired';
  if (/failed|declined|cancelled|canceled/.test(value)) return 'failed';
  return 'waiting';
}

function getParentOrigin() {
  if (window.parent === window) return null;
  try {
    const referrer = new URL(document.referrer);
    if (referrer.protocol !== 'https:' && referrer.protocol !== 'http:') return null;
    if (referrer.origin === 'null') return null;
    return referrer.origin;
  } catch {
    return null;
  }
}

function formatAmount(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return String(amount ?? '—');
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function getUpiId(upiLink) {
  try {
    return new URL(upiLink).searchParams.get('pa') || '';
  } catch {
    return '';
  }
}

function PaymentLoader({ checkoutDark }) {
  return (
    <main className={`checkout-shell min-h-[100dvh] px-4 py-6 sm:px-6 sm:py-10 ${checkoutDark ? 'bg-[#080e0c]' : ''}`}>
      <div className="mx-auto max-w-[920px]">
        <div className="mb-7 flex items-center justify-between">
          <div className={`h-8 w-28 animate-pulse rounded-lg ${checkoutDark ? 'bg-[#152520]' : 'bg-[#dce5dc]'}`} />
          <div className={`h-8 w-24 animate-pulse rounded-full ${checkoutDark ? 'bg-[#152520]' : 'bg-[#e4ebe3]'}`} />
        </div>
        <div className={`grid overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(25,61,48,.08)] md:grid-cols-[1fr_360px] ${
          checkoutDark ? 'border-[#1e332c] bg-[#111a18]' : 'border-[#e1e8e1] bg-[#fffefa]'
        }`}>
          <div className="space-y-5 p-6 sm:p-10">
            <div className={`h-4 w-32 animate-pulse rounded ${checkoutDark ? 'bg-[#182b25]' : 'bg-[#e4ebe3]'}`} />
            <div className={`h-10 w-52 animate-pulse rounded ${checkoutDark ? 'bg-[#182b25]' : 'bg-[#e4ebe3]'}`} />
            <div className={`h-24 w-full animate-pulse rounded-2xl ${checkoutDark ? 'bg-[#14231f]' : 'bg-[#f0f3ed]'}`} />
            <div className={`h-14 w-full animate-pulse rounded-xl ${checkoutDark ? 'bg-[#182b25]' : 'bg-[#e4ebe3]'}`} />
          </div>
          <div className={`flex min-h-[360px] items-center justify-center p-8 ${checkoutDark ? 'bg-[#0d1614]' : 'bg-[#f6f8f2]'}`}>
            <div className={`h-56 w-56 animate-pulse rounded-2xl ${checkoutDark ? 'bg-[#152520]' : 'bg-[#e4ebe3]'}`} />
          </div>
        </div>
      </div>
    </main>
  );
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (delightful fintech chord)
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + index * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.08 + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.7);
    });
  } catch {}
}

function ConfettiShower() {
  const particles = useMemo(() => {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#eab308', '#06b6d4', '#14b8a6'];
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${(i * 2.1 + (i % 7) * 3) % 96}%`,
      delay: `${(i % 14) * 0.07}s`,
      size: `${6 + (i % 5) * 2}px`,
      shape: i % 3 === 0 ? '50%' : i % 3 === 1 ? '2px' : '0',
    }));
  }, []);

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-particle"
          style={{
            backgroundColor: p.color,
            left: p.left,
            top: '-15px',
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function UtrSubmission({ orderId, alreadySubmitted, onConfirmed, checkoutDark }) {
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (alreadySubmitted) setSubmitted(true);
  }, [alreadySubmitted]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const result = await submitCheckoutUtr(orderId, utr);
      setSubmitted(true);
      setUtr('');
      if (result.confirmed) {
        onConfirmed(await getCheckoutStatus(orderId));
      } else {
        setMessage('UTR received. We’ll check it against the merchant’s verified payment alert. This does not confirm payment by itself.');
      }
    } catch (requestError) {
      setError(requestError.message || 'We could not submit this UTR. Please check it and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`mt-6 rounded-2xl border p-4 sm:p-5 transition-colors ${
      checkoutDark ? 'border-[#1e342c] bg-[#14231f]' : 'border-slate-200 bg-slate-50/80'
    }`}>
      <p className={`text-xs font-bold ${checkoutDark ? 'text-white' : 'text-slate-900'}`}>Paid but not confirmed?</p>
      <p className={`mt-1 text-[11px] sm:text-xs leading-relaxed ${checkoutDark ? 'text-[#8ca097]' : 'text-slate-600'}`}>
        Enter the 12-digit UTR from your payment receipt (not the transaction ID). We’ll verify it with the merchant’s payment alert.
      </p>
      {submitted && (
        <p className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[11px] sm:text-xs leading-relaxed text-emerald-600 dark:text-emerald-400 font-medium" role="status">
          A UTR has been submitted for this order. You can submit a corrected UTR if needed.
        </p>
      )}
      {message && <p className="mt-3 text-[11px] sm:text-xs leading-relaxed text-emerald-600 dark:text-emerald-400 font-medium" role="status">{message}</p>}
      {error && <p className="mt-3 text-[11px] sm:text-xs leading-relaxed text-red-500 font-medium" role="alert">{error}</p>}
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <label className="sr-only" htmlFor={`utr-${orderId}`}>12-digit UTR</label>
        <input
          id={`utr-${orderId}`}
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{12}"
          maxLength={12}
          value={utr}
          onChange={(event) => setUtr(event.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="Enter 12-digit UTR"
          className={`h-11 min-w-0 flex-1 rounded-xl border px-3.5 font-mono text-sm outline-none transition ${
            checkoutDark
              ? 'border-[#223932] bg-[#0d1614] text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
              : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10'
          }`}
        />
        <button
          type="submit"
          disabled={submitting || utr.length !== 12}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            checkoutDark
              ? 'bg-[#1ea88a] text-white hover:bg-[#188c73]'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {submitting ? 'Checking…' : 'Submit UTR'}
        </button>
      </form>
    </section>
  );
}

function PayCheckoutInner() {
  const { orderId = '' } = useParams();
  const [checkout, setCheckout] = useState(null);
  const [viewState, setViewState] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [remainingMs, setRemainingMs] = useState(null);
  const [copied, setCopied] = useState(false);
  const [amountCopied, setAmountCopied] = useState(false);
  const [payment, setPayment] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [redirectIn, setRedirectIn] = useState(3);
  const [checkoutDark, setCheckoutDark] = useState(false);
  const [mobileTab, setMobileTab] = useState('upi');

  useEffect(() => {
    if (checkout?.branding?.checkoutTheme === 'dark') {
      setCheckoutDark(true);
    } else if (checkout?.branding?.checkoutTheme === 'light') {
      setCheckoutDark(false);
    } else if (checkout?.branding?.checkoutTheme === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        setCheckoutDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    }
  }, [checkout?.branding?.checkoutTheme]);

  const notifiedRef = useRef(false);
  const copiedTimerRef = useRef(null);
  const amountTimerRef = useRef(null);
  const upiId = useMemo(() => getUpiId(checkout?.upiLink || ''), [checkout?.upiLink]);

  const copyAmount = useCallback(async () => {
    if (!checkout?.payableAmount) return;
    try {
      await navigator.clipboard.writeText(String(checkout.payableAmount));
      setAmountCopied(true);
      if (amountTimerRef.current) window.clearTimeout(amountTimerRef.current);
      amountTimerRef.current = window.setTimeout(() => setAmountCopied(false), 1800);
    } catch {
      setAmountCopied(false);
    }
  }, [checkout?.payableAmount]);

  const notifyParent = useCallback((type, details = {}) => {
    if (notifiedRef.current) return;
    const targetOrigin = getParentOrigin();
    if (!targetOrigin) return;
    const payload = type === 'payment.success'
      ? {
          type,
          order_id: orderId,
          payment_id: details.payment_id ?? null,
          utr: details.utr ?? null,
          signature: details.signature ?? null,
        }
      : { type, order_id: orderId };
    try {
      window.parent.postMessage(payload, targetOrigin);
      notifiedRef.current = true;
    } catch {
      // The checkout remains usable when embedded communication is unavailable.
    }
  }, [orderId]);

  const applyOutcome = useCallback((result) => {
    const outcome = outcomeFromStatus(result?.status);
    if (outcome === 'success') {
      playSuccessChime();
      setPayment(result);
      setViewState('success');
      notifyParent('payment.success', result);
    } else if (outcome === 'expired') {
      setViewState('expired');
      notifyParent('payment.failed');
    } else if (outcome === 'failed') {
      setViewState('error');
      setLoadError('This payment could not be completed. Please contact the merchant before trying again.');
      notifyParent('payment.failed');
    }
  }, [notifyParent]);

  useEffect(() => {
    let active = true;
    setViewState('loading');
    setLoadError('');
    setCheckout(null);
    setQrImage('');
    setRemainingMs(null);
    setPayment(null);
    notifiedRef.current = false;

    getPublicCheckout(orderId)
      .then((result) => {
        if (!active) return;
        setCheckout(result);
        setViewState('waiting');
        if (result.expiresAt) {
          const endTime = new Date(result.expiresAt).getTime();
          if (Number.isFinite(endTime)) setRemainingMs(Math.max(0, endTime - Date.now()));
        }
        const outcome = outcomeFromStatus(result.status);
        if (outcome !== 'waiting') applyOutcome(result);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error?.message || 'We could not load this payment request.');
        setViewState('error');
      });

    return () => {
      active = false;
    };
  }, [orderId, retryCount, applyOutcome]);

  useEffect(() => {
    if (!checkout?.upiLink) return undefined;
    let active = true;
    QRCode.toDataURL(checkout.upiLink, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
      color: { dark: '#123d32', light: '#fffefa' },
    })
      .then((image) => {
        if (active) setQrImage(image);
      })
      .catch(() => {
        if (active) setQrImage('');
      });
    return () => {
      active = false;
    };
  }, [checkout?.upiLink]);

  useEffect(() => {
    if (!checkout?.expiresAt || viewState !== 'waiting') return undefined;
    const endTime = new Date(checkout.expiresAt).getTime();
    if (!Number.isFinite(endTime)) return undefined;
    const updateRemaining = () => setRemainingMs(Math.max(0, endTime - Date.now()));
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [checkout?.expiresAt, viewState]);

  useEffect(() => {
    if (viewState === 'waiting' && remainingMs !== null && remainingMs <= 0) {
      setViewState('expired');
      notifyParent('payment.failed');
    }
  }, [remainingMs, viewState, notifyParent]);

  useEffect(() => {
    if (!checkout || viewState !== 'waiting') return undefined;
    let active = true;
    let pollTimer = null;

    // ── Fallback: light polling every 8 s in case SSE is unavailable ──────────
    // This is a safety net only; in normal operation SSE pushes the status.
    const schedulePollFallback = (delayMs = 8000) => {
      if (!active) return;
      pollTimer = window.setTimeout(async () => {
        if (!active) return;
        try {
          const result = await getCheckoutStatus(orderId);
          if (!active) return;
          if (result?.expiresAt && !checkout.expiresAt) {
            setCheckout((c) => ({ ...c, expiresAt: result.expiresAt }));
          }
          if (result?.utrSubmitted && !checkout.utrSubmitted) {
            setCheckout((c) => ({ ...c, utrSubmitted: true }));
          }
          if (outcomeFromStatus(result?.status) !== 'waiting') {
            applyOutcome(result);
            return; // stop scheduling further polls
          }
        } catch {
          // Network hiccup – just retry next round
        }
        schedulePollFallback(10000); // slow down after first check
      }, delayMs);
    };

    // ── Primary: Server-Sent Events (server pushes; no repeated requests) ────
    let es = null;
    try {
      es = new EventSource(buildApiUrl(`/api/v1/checkout/${encodeURIComponent(orderId)}/events`));

      es.addEventListener('status', (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          if (outcomeFromStatus(data?.status) !== 'waiting') {
            // SSE gave us the result – fetch full status to get signature etc.
            getCheckoutStatus(orderId).then((result) => {
              if (active) applyOutcome(result);
            }).catch(() => {
              if (active) applyOutcome(data);
            });
          }
        } catch {
          // Malformed event; fallback poll will catch up
        }
      });

      es.onerror = () => {
        // SSE failed or was refused (e.g. load-balancer drops long connections).
        // Switch to fallback polling so the user still sees the result.
        es?.close();
        es = null;
        schedulePollFallback(3000);
      };
    } catch {
      // EventSource not supported (very rare) – go straight to fallback poll.
      schedulePollFallback(3000);
    }

    // Tab visibility: trigger immediate status check when user comes back from UPI app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        getCheckoutStatus(orderId).then((result) => {
          if (!active) return;
          if (outcomeFromStatus(result?.status) !== 'waiting') applyOutcome(result);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      es?.close();
      if (pollTimer) window.clearTimeout(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkout, orderId, viewState, applyOutcome]);

  useEffect(() => {
    if (viewState !== 'success' || !payment?.redirectUrl) return undefined;
    let destination;
    try {
      destination = new URL(payment.redirectUrl, window.location.origin);
      if (!['https:', 'http:'].includes(destination.protocol)) return undefined;
    } catch {
      return undefined;
    }

    setRedirectIn(3);
    const countdown = window.setInterval(() => {
      setRedirectIn((value) => Math.max(0, value - 1));
    }, 1000);
    const redirectTimer = window.setTimeout(() => {
      window.location.assign(destination.href);
    }, 3000);
    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(redirectTimer);
    };
  }, [viewState, payment?.redirectUrl]);

  useEffect(() => () => {
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
  }, []);

  async function copyUpiId() {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (viewState === 'loading') return <PaymentLoader checkoutDark={checkoutDark} />;

  const minutes = remainingMs === null ? null : Math.floor(remainingMs / 60000);
  const seconds = remainingMs === null ? null : Math.floor((remainingMs % 60000) / 1000);
  const formattedCountdown = minutes === null
    ? '—'
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const brandColor = checkout?.branding?.brandColor || '#126b58';
  const logoUrl = checkout?.branding?.logoUrl;
  const tagline = checkout?.branding?.tagline;
  const supportEmail = checkout?.branding?.supportEmail;
  const merchantName = checkout?.merchantName || checkout?.branding?.displayName || 'Merchant';

  return (
    <main
      style={checkoutDark ? {
        background: `radial-gradient(ellipse at 50% 0%, ${brandColor}22, transparent 65%), #080e0c`,
      } : undefined}
      className={`checkout-shell min-h-[100dvh] px-4 py-5 sm:px-6 sm:py-9 transition-colors ${checkoutDark ? 'bg-[#080e0c] text-[#eaf3ee]' : ''}`}
    >
      <div className="mx-auto max-w-[920px]">
        <header className="entrance mb-5 flex items-center justify-between px-1 sm:mb-7">
          <div className="flex items-center gap-2.5">
            <span
              style={{ backgroundColor: brandColor, boxShadow: `0 4px 14px ${brandColor}40` }}
              className="grid h-9 w-9 place-items-center rounded-[12px] text-[#eff9e8] shadow-xs"
            >
              <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden="true">
                <path d="M5 7.5h14M5 12h14M5 16.5h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="18" cy="17" r="3" fill="#c7e8a8" />
              </svg>
            </span>
            <span className={`font-[var(--font-display)] text-[21px] font-bold tracking-[-1.2px] ${checkoutDark ? 'text-white' : 'text-[#142e2b]'}`}>poppay</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCheckoutDark((d) => !d)}
              title={checkoutDark ? 'Switch to Light checkout' : 'Switch to Dark checkout'}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                checkoutDark
                  ? 'border-[#1f342d] bg-[#12221d] text-[#c7decb] hover:bg-[#182c26]'
                  : 'border-[#dce7dd] bg-[#f9fbf6] text-[#527169] hover:bg-[#edf5ec]'
              }`}
            >
              {checkoutDark ? (
                <svg className="h-3.5 w-3.5 text-[#fbbf24]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg className="h-3.5 w-3.5 text-[#126b58]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 sm:px-3 py-1.5 text-[11px] font-semibold tracking-[.02em] ${
              checkoutDark
                ? 'border-[#1f342d] bg-[#12221d] text-[#8ca097]'
                : 'border-slate-200 bg-white text-slate-600 shadow-2xs'
            }`}>
              <Icon name="lock" className="h-[13px] w-[13px] text-emerald-500" />
              <span className="hidden xs:inline">SECURE CHECKOUT</span>
              <span className="xs:hidden">SECURE</span>
            </div>
          </div>
        </header>

        {viewState === 'error' ? (
          <section className={`entrance rounded-[28px] border px-6 py-12 text-center shadow-xl sm:px-12 ${
            checkoutDark ? 'border-[#3f1f1a] bg-[#141b18] text-[#eaf3ee]' : 'border-[#e1e8e1] bg-[#fffefa]'
          }`}>
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#faeee9] text-[#b64c3c]">
              <Icon name="alert" className="h-7 w-7" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#a35a47]">Checkout unavailable</p>
            <h1 className={`font-[var(--font-display)] text-[28px] font-semibold tracking-[-1.2px] ${checkoutDark ? 'text-white' : 'text-[#142e2b]'}`}>We couldn’t open this payment</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#71817b]">{loadError || 'Please try again in a moment.'}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              style={{ backgroundColor: brandColor, boxShadow: `0 4px 14px ${brandColor}40` }}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Try again
            </button>
          </section>
        ) : viewState === 'expired' ? (
          <section className={`entrance rounded-[28px] border px-6 py-12 text-center shadow-xl sm:px-12 ${
            checkoutDark ? 'border-[#3f311a] bg-[#141b18] text-[#eaf3ee]' : 'border-[#e1e8e1] bg-[#fffefa]'
          }`}>
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#f8f0df] text-[#9a712d]">
              <Icon name="clock" className="h-7 w-7" />
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-[#9a712d]">Payment window closed</p>
            <h1 className={`font-[var(--font-display)] text-[28px] font-semibold tracking-[-1.2px] ${checkoutDark ? 'text-white' : 'text-[#142e2b]'}`}>This request has expired</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#71817b]">No payment was confirmed. Return to {merchantName} to request a fresh payment link.</p>
            <div className={`mx-auto mt-7 max-w-sm rounded-2xl px-5 py-4 text-left ${checkoutDark ? 'bg-[#152420]' : 'bg-[#f6f8f2]'}`}>
              <p className="text-[11px] font-bold uppercase tracking-[.13em] text-[#84928a]">Order reference</p>
              <p className={`mt-1 break-all font-mono text-sm ${checkoutDark ? 'text-[#34d399]' : 'text-[#33554c]'}`}>{orderId}</p>
            </div>
            <div className="mx-auto max-w-md">
              <UtrSubmission
                orderId={orderId}
                alreadySubmitted={checkout?.utrSubmitted}
                onConfirmed={applyOutcome}
                checkoutDark={checkoutDark}
              />
            </div>
          </section>
        ) : viewState === 'success' ? (
          <section className={`entrance relative overflow-hidden rounded-[28px] border px-6 py-12 text-center shadow-2xl sm:px-12 ${
            checkoutDark ? 'border-[#1b3d30] bg-[#101b17] text-[#eaf3ee]' : 'border-[#dce9dd] bg-[#fffefa]'
          }`}>
            {/* Celebratory confetti burst */}
            <ConfettiShower />

            {/* 3D Golden Rupee Coin Flip */}
            <div className="coin-stage">
              <div className="success-shockwave" />
              <div className="coin">
                {/* Front: Golden Rupee Coin */}
                <div className="coin-face coin-front">
                  <span className="font-[var(--font-display)] text-[44px] font-bold text-[#78350f] drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] select-none">
                    ₹
                  </span>
                </div>
                {/* Back: Verified Green Checkmark */}
                <div className="coin-face coin-back">
                  <Icon name="check" className="h-12 w-12 text-white stroke-[2.8] drop-shadow-md" />
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#16a34a] shimmer-badge mb-3">
              <span className="h-2 w-2 rounded-full bg-[#22c55e] animate-ping" />
              <span>Payment confirmed</span>
            </div>
            <h1 className={`font-[var(--font-display)] text-[32px] font-bold tracking-[-1.3px] ${checkoutDark ? 'text-white' : 'text-[#142e2b]'}`}>You’re all set!</h1>
            <p className="mt-2 text-sm text-[#84928a]">Your payment was sent directly to {merchantName}.</p>
            <div className="mt-6 inline-block rounded-2xl bg-gradient-to-b from-[#10b981]/15 to-transparent px-8 py-3 border border-[#10b981]/25">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#10b981]">Amount Paid</span>
              <p className={`font-[var(--font-display)] text-[42px] font-bold tracking-[-1.8px] leading-tight ${checkoutDark ? 'text-white' : 'text-[#142e2b]'}`}>₹{formatAmount(checkout?.payableAmount)}</p>
            </div>
            {payment?.utr && (
              <div className={`mx-auto mt-6 max-w-sm rounded-2xl px-5 py-4 text-left border ${checkoutDark ? 'bg-[#152420] border-[#1e342c]' : 'bg-[#f6f8f2] border-[#e2eae1]'}`}>
                <p className="text-[11px] font-bold uppercase tracking-[.13em] text-[#84928a]">UPI reference number (UTR)</p>
                <p className={`mt-1 break-all font-mono text-sm font-semibold ${checkoutDark ? 'text-[#34d399]' : 'text-[#126b58]'}`}>{payment.utr}</p>
              </div>
            )}
            {payment?.redirectUrl && <p className="mt-6 text-xs text-[#71817b]">Taking you back in {redirectIn} seconds…</p>}
          </section>
        ) : (
          <div className={`entrance overflow-hidden rounded-[24px] sm:rounded-[28px] border md:grid md:grid-cols-[1fr_360px] ${
            checkoutDark
              ? 'border-[#1d2f29] bg-[#111a18] shadow-[0_24px_70px_rgba(0,0,0,.6)] text-[#eaf3ee]'
              : 'border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,.06)] text-slate-900'
          }`}>
            {/* Mobile Tab Selector (hidden on desktop) */}
            <div className={`md:hidden flex border-b p-1.5 gap-1.5 ${
              checkoutDark ? 'border-[#1e342c] bg-[#0d1614]' : 'border-slate-200 bg-slate-100/80'
            }`}>
              <button
                type="button"
                onClick={() => setMobileTab('upi')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  mobileTab === 'upi'
                    ? (checkoutDark ? 'bg-[#152722] text-[#34d399] shadow-xs' : 'bg-white text-slate-900 shadow-sm border border-slate-200/90')
                    : (checkoutDark ? 'text-[#7e948a] hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                <Icon name="arrow" className="h-3.5 w-3.5" />
                <span>Pay via UPI App</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('qr')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  mobileTab === 'qr'
                    ? (checkoutDark ? 'bg-[#152722] text-[#34d399] shadow-xs' : 'bg-white text-slate-900 shadow-sm border border-slate-200/90')
                    : (checkoutDark ? 'text-[#7e948a] hover:text-white' : 'text-slate-600 hover:text-slate-900')
                }`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 20v1M20 14v3"/></svg>
                <span>Scan QR Code</span>
              </button>
            </div>

            {/* Main UPI & Details Column */}
            <section className={`p-4 xs:p-5 sm:p-8 md:p-9 ${mobileTab !== 'upi' ? 'hidden md:block' : 'block'}`}>
              <div className="mb-6 flex items-start justify-between gap-3.5">
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-bold uppercase tracking-[.14em] ${checkoutDark ? 'text-[#7e948a]' : 'text-slate-500'}`}>You’re paying</p>
                  <h1 className={`mt-1 break-words font-[var(--font-display)] text-[22px] xs:text-[25px] sm:text-[30px] font-semibold leading-tight tracking-[-1px] ${
                    checkoutDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {merchantName}
                  </h1>
                  {tagline && (
                    <p className={`mt-1.5 break-words text-xs leading-relaxed ${checkoutDark ? 'text-[#8ca097]' : 'text-slate-600'}`}>{tagline}</p>
                  )}
                </div>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={merchantName}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className={`mt-1 h-11 w-11 xs:h-12 xs:w-12 shrink-0 rounded-2xl object-cover border shadow-xs ${
                      checkoutDark ? 'border-[#223932]' : 'border-slate-200'
                    }`}
                  />
                ) : (
                  <div
                    style={{ backgroundColor: `${brandColor}22`, color: brandColor }}
                    className={`mt-1 grid h-11 w-11 xs:h-12 xs:w-12 shrink-0 place-items-center rounded-2xl font-[var(--font-display)] text-lg font-bold border shadow-xs ${
                      checkoutDark ? 'border-[#223932]' : 'border-slate-200'
                    }`}
                  >
                    {merchantName.trim().charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Exact Payable Amount Card */}
              <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors ${
                checkoutDark
                  ? 'border-[#1e332c] bg-gradient-to-br from-[#14231f] to-[#0f1a17]'
                  : 'border-slate-200/90 bg-gradient-to-br from-slate-50 to-white'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${checkoutDark ? 'text-[#8ba096]' : 'text-slate-600'}`}>Exact payable amount</span>
                  {remainingMs !== null && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums shadow-2xs transition-colors ${
                      remainingMs < 60000 
                        ? checkoutDark ? 'bg-[#3c1717] text-[#f87171] border border-[#5a2525] animate-pulse' : 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
                        : remainingMs < 180000
                        ? checkoutDark ? 'bg-[#382a12] text-[#fbbf24] border border-[#573f18]' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        : checkoutDark ? 'bg-[#152e25] text-[#34d399] border border-[#1d4336]' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      <Icon name="clock" className="h-3 w-3" />
                      {formattedCountdown}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-3">
                  <p className={`break-all font-[var(--font-display)] text-[32px] xs:text-[38px] sm:text-[46px] font-bold leading-none tracking-[-1.5px] ${
                    checkoutDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span className="mr-1 text-[24px] xs:text-[28px] font-semibold" style={{ color: brandColor }}>₹</span>{formatAmount(checkout?.payableAmount)}
                  </p>
                  <button
                    type="button"
                    onClick={copyAmount}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95 ${
                      checkoutDark
                        ? 'border-[#223932] bg-[#172a24] text-[#34d399] hover:bg-[#1f372f]'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                    title="Copy exact amount"
                  >
                    <Icon name={amountCopied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
                    {amountCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className={`mt-3 flex items-start sm:items-center gap-2 rounded-xl px-3 py-2 text-[11px] sm:text-xs font-semibold border ${
                  checkoutDark
                    ? 'bg-[#152520] border-[#1f382f] text-[#34d399]'
                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
                }`}>
                  <span className="mt-0.5 sm:mt-0 h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-ping" />
                  <span className="leading-snug">Important: Pay exactly ₹{formatAmount(checkout?.payableAmount)} (including paise) for instant verification.</span>
                </div>
              </div>

              {/* 1-Click UPI Payment Button */}
              <div className="mt-5 sm:mt-6">
                <p className={`mb-2.5 text-[11px] font-bold uppercase tracking-[.14em] ${checkoutDark ? 'text-[#7e948a]' : 'text-slate-500'}`}>One-click mobile UPI</p>
                <a
                  href={checkout?.upiLink || undefined}
                  onClick={(event) => {
                    if (!checkout?.upiLink) event.preventDefault();
                  }}
                  style={checkout?.upiLink ? { 
                    backgroundColor: brandColor,
                    boxShadow: `0 8px 24px ${brandColor}40`
                  } : undefined}
                  className={`group relative flex min-h-[58px] items-center justify-between overflow-hidden rounded-2xl px-4 xs:px-5 text-sm font-bold shadow-md transition-all btn-sheen ${
                    checkout?.upiLink
                      ? 'text-white hover:brightness-105 hover:shadow-lg active:scale-[0.99]'
                      : 'cursor-not-allowed bg-slate-300 dark:bg-[#253932] text-white'
                  }`}
                  aria-disabled={!checkout?.upiLink}
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 shadow-inner group-hover:scale-105 transition-transform">
                      <Icon name="arrow" className="h-5 w-5" />
                    </span>
                    <span className="text-left">
                      <span className="block text-[14px]">Pay with UPI App</span>
                      <span className="block text-[11px] font-normal text-white/80">Tap to open installed UPI app</span>
                    </span>
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm whitespace-nowrap">
                    Tap to open
                  </span>
                </a>

                {/* Branded Quick-Tap App Shortcuts for Mobile */}
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {[
                    { name: 'PhonePe', color: 'from-[#5f259f]/10 to-[#5f259f]/5', text: 'text-[#5f259f] dark:text-[#a874e8]', border: 'border-[#5f259f]/20' },
                    { name: 'Google Pay', color: 'from-blue-500/10 to-blue-500/5', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
                    { name: 'Paytm', color: 'from-[#00baf2]/10 to-[#00baf2]/5', text: 'text-[#008cc0] dark:text-[#00baf2]', border: 'border-[#00baf2]/20' },
                    { name: 'Cred / Other', color: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20' },
                  ].map((app) => (
                    <a
                      key={app.name}
                      href={checkout?.upiLink || undefined}
                      onClick={(e) => { if (!checkout?.upiLink) e.preventDefault(); }}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border bg-gradient-to-b ${app.color} ${app.border} text-center transition active:scale-95 hover:brightness-105`}
                    >
                      <span className={`text-[11px] font-bold ${app.text}`}>{app.name}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <span className={`h-px flex-1 ${checkoutDark ? 'bg-[#1d2f29]' : 'bg-slate-200'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-[.14em] ${checkoutDark ? 'text-[#71857b]' : 'text-slate-400'}`}>or manual transfer via UPI ID</span>
                <span className={`h-px flex-1 ${checkoutDark ? 'bg-[#1d2f29]' : 'bg-slate-200'}`} />
              </div>

              {/* Verified UPI ID Box (with break-all, never truncated) */}
              <div className={`flex min-h-[58px] items-center gap-2.5 xs:gap-3 rounded-2xl border p-3 shadow-2xs transition-colors ${
                checkoutDark
                  ? 'border-[#1e332c] bg-[#14221f] hover:border-[#2a473e]'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                <div className="min-w-0 flex-1 pl-1">
                  <p className={`text-[10px] font-bold uppercase tracking-[.12em] ${checkoutDark ? 'text-[#7e948a]' : 'text-slate-500'}`}>Merchant Verified UPI ID</p>
                  <p className={`mt-0.5 break-all font-mono text-[13px] sm:text-[14px] font-semibold select-all ${checkoutDark ? 'text-[#34d399]' : 'text-emerald-800'}`}>{upiId || 'UPI ID unavailable'}</p>
                </div>
                <button
                  type="button"
                  onClick={copyUpiId}
                  disabled={!upiId}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 xs:gap-2 rounded-xl border px-3 xs:px-3.5 text-xs font-bold shadow-2xs transition active:scale-95 disabled:cursor-not-allowed ${
                    checkoutDark
                      ? 'border-[#223932] bg-[#182b25] text-[#34d399] hover:bg-[#203a31] disabled:text-[#52635b]'
                      : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 disabled:text-slate-400'
                  }`}
                  aria-label={copied ? 'UPI ID copied' : 'Copy UPI ID'}
                >
                  <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Security & Direct Payment Notice */}
              <div className={`mt-5 flex items-start gap-3 rounded-xl border px-3.5 py-3 ${
                checkoutDark
                  ? 'border-[#1e342c] bg-[#14221f] text-[#8aa095]'
                  : 'border-slate-200/80 bg-slate-50/90 text-slate-600'
              }`}>
                <div className="mt-0.5 text-emerald-600 dark:text-[#34d399] shrink-0">
                  <Icon name="lock" className="h-4 w-4" />
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your money goes directly to <span className={`font-semibold ${checkoutDark ? 'text-[#34d399]' : 'text-slate-900'}`}>{checkout?.merchantName || 'the merchant'}</span>. PopPay never holds your funds.
                </p>
              </div>

              {/* UTR Submission Form */}
              <UtrSubmission
                orderId={orderId}
                alreadySubmitted={checkout?.utrSubmitted}
                onConfirmed={applyOutcome}
                checkoutDark={checkoutDark}
              />
            </section>

            {/* QR Code Column (Desktop right aside, or Mobile QR Tab) */}
            <aside className={`entrance-delay flex flex-col items-center p-5 sm:p-7 md:p-8 ${
              mobileTab !== 'qr' ? 'hidden md:flex' : 'flex'
            } ${
              checkoutDark ? 'bg-[#0d1614] border-t md:border-t-0 md:border-l border-[#1a2d27]' : 'bg-slate-50/70 border-t md:border-t-0 md:border-l border-slate-200'
            }`}>
              <div className="mb-4 flex w-full items-center justify-between">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-[.14em] ${checkoutDark ? 'text-[#8ca097]' : 'text-slate-600'}`}>Scan to pay</p>
                  <p className={`text-[11px] font-semibold ${checkoutDark ? 'text-[#34d399]' : 'text-emerald-700'}`}>₹{formatAmount(checkout?.payableAmount)}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  checkoutDark ? 'border-[#1f362e] bg-[#13221d] text-[#8ca097]' : 'border-slate-200 bg-white text-slate-600 shadow-2xs'
                }`}>UPI QR</span>
              </div>

              {/* QR Frame with Laser Scanner Line */}
              <div className={`qr-frame qr-scanner-box grid aspect-square w-full max-w-[260px] sm:max-w-[272px] place-items-center rounded-[22px] border p-3.5 ${
                checkoutDark ? 'border-[#1f362e] bg-white' : 'border-slate-200 bg-white shadow-sm'
              }`}>
                {qrImage ? (
                  <>
                    <img src={qrImage} alt="UPI payment QR code" className="h-full w-full object-contain select-none" />
                    <div className="qr-scanner-line" />
                  </>
                ) : (
                  <div className="flex flex-col items-center px-5 text-center">
                    <div className="mb-3 h-8 w-8 rounded-lg border-2 border-slate-300 border-t-emerald-600 animate-spin" />
                    <p className={`text-xs font-medium ${checkoutDark ? 'text-[#72857a]' : 'text-slate-500'}`}>Preparing secure QR code…</p>
                  </div>
                )}
              </div>

              {/* Bank Listener Status */}
              <div className="mt-4 sm:mt-5 flex flex-col items-center gap-1.5 text-center">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 shadow-2xs ${
                  checkoutDark ? 'border-[#1e3a30] bg-[#132620] text-[#34d399]' : 'border-emerald-200 bg-white text-emerald-800'
                }`}>
                  <span className="radar-sonar h-2.5 w-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold">Live Bank Alert Listener Active</span>
                </span>
                <span className={`text-[11px] font-medium ${checkoutDark ? 'text-[#7e9288]' : 'text-slate-500'}`}>Scan via PhonePe, GPay, Paytm or BHIM</span>
              </div>

              {/* Mobile QR Helper: Quick UPI ID Copy */}
              <div className="mt-4 md:hidden w-full">
                <div className={`flex items-center justify-between rounded-xl border p-2.5 ${
                  checkoutDark ? 'border-[#1e342c] bg-[#14221f]' : 'border-slate-200 bg-white'
                }`}>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${checkoutDark ? 'text-[#7e948a]' : 'text-slate-500'}`}>UPI ID</p>
                    <p className={`break-all font-mono text-xs font-semibold ${checkoutDark ? 'text-[#34d399]' : 'text-slate-800'}`}>{upiId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                      checkoutDark ? 'border-[#223932] bg-[#182b25] text-[#34d399]' : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon name={copied ? 'check' : 'copy'} className="h-3 w-3" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Waiting status footer */}
              <div className={`mt-auto w-full border-t pt-4 mt-4 ${checkoutDark ? 'border-[#1a2e28]' : 'border-slate-200'}`}>
                {viewState === 'waiting' ? (
                  <div className="flex items-center justify-center gap-2.5 text-center">
                    <span className="flex items-center gap-1.5">
                      <i className="waiting-dot h-2 w-2 rounded-full" style={{ backgroundColor: brandColor }} />
                      <i className="waiting-dot h-2 w-2 rounded-full" style={{ backgroundColor: brandColor }} />
                      <i className="waiting-dot h-2 w-2 rounded-full" style={{ backgroundColor: brandColor }} />
                    </span>
                    <span className={`text-xs font-bold ${checkoutDark ? 'text-[#34d399]' : 'text-emerald-800'}`}>Waiting for bank confirmation…</span>
                  </div>
                ) : null}
                <p className={`mt-1.5 text-center text-[10px] leading-4 ${checkoutDark ? 'text-[#6e8278]' : 'text-slate-500'}`}>
                  Funds transfer directly to the merchant. Do not close.
                </p>
              </div>
            </aside>
          </div>
        )}

        <footer className={`mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center text-[10px] font-medium ${
          checkoutDark ? 'text-[#6e8278]' : 'text-[#8b9990]'
        }`}>
          <span>Powered by PopPay</span>
          <span aria-hidden="true">·</span>
          <span>Direct UPI to {merchantName}</span>
          {supportEmail && (
            <>
              <span aria-hidden="true">·</span>
              <a href={`mailto:${supportEmail}`} className={`underline ${checkoutDark ? 'hover:text-white' : 'hover:text-[#142e2b]'}`}>Support: {supportEmail}</a>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>Order {orderId.slice(0, 8)}</span>
        </footer>
      </div>
    </main>
  );
}

class CheckoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Checkout error caught by boundary:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <main className="checkout-shell min-h-[100dvh] px-4 py-8 bg-[#090f0e] text-[#eaf3ee] flex items-center justify-center">
          <div className="max-w-md w-full rounded-3xl border border-[#2d1b18] bg-[#141b18] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#3f1f1a] text-[#f87171]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Could not load checkout</h1>
            <p className="mt-2 text-sm text-[#8ca097]">
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1ea88a] px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#188c73]"
            >
              Reload checkout
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function PayCheckout() {
  return (
    <CheckoutErrorBoundary>
      <PayCheckoutInner />
    </CheckoutErrorBoundary>
  );
}
