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
  if (name === 'shield') {
    return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  }
  if (name === 'sparkles') {
    return <svg {...common}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" /></svg>;
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

function PaymentLoader() {
  return (
    <main className="checkout-shell min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8 transition-colors bg-[var(--pulse-bg)] text-[var(--pulse-ink)]">
      <div className="relative mx-auto flex w-full max-w-sm flex-col items-center text-center">
        {/* Glowing Radial Orb */}
        <div className="absolute -top-12 h-44 w-44 rounded-full bg-[var(--pulse-pink)]/15 blur-3xl pointer-events-none" />

        {/* Animated Brand Logo Icon with Ping Ring */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-2xl bg-[var(--pulse-pink)]/20 blur-md animate-pulse" />
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-[var(--pulse-gradient)] text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-8 w-8 animate-bounce" fill="none" aria-hidden="true">
              <path d="M5 7.5h14M5 12h14M5 16.5h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="18" cy="17" r="3" fill="white" />
            </svg>
          </div>
        </div>

        {/* Text and Fintech Progress Bar */}
        <h2 className="font-[var(--font-display)] text-xl font-bold tracking-tight text-[var(--pulse-ink)]">
          Opening Secure Checkout
        </h2>
        <p className="mt-1 text-xs text-[var(--pulse-muted)] font-medium">
          Connecting to direct bank UPI payment gateway…
        </p>

        {/* Progress Bar */}
        <div className="mt-6 h-1.5 w-52 overflow-hidden rounded-full bg-[var(--pulse-panel-2)]">
          <div className="h-full w-full bg-[var(--pulse-gradient)] rounded-full animate-[shimmer-sweep_1.5s_infinite]" />
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-full border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] px-3.5 py-1 text-[11px] font-bold text-[var(--pulse-mint)]">
          <Icon name="lock" className="h-3 w-3" />
          <span>256-BIT ENCRYPTED UPI</span>
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
    // Pulse signature & accent palette
    const colors = ['#FF3D81', '#FF9A3C', '#2EE6C5', '#A47BFF', '#4CC9FF'];
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

function UtrSubmission({ orderId, alreadySubmitted, onConfirmed }) {
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
    <section className="mt-6 rounded-2xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-4 sm:p-5 transition-colors">
      <p className="text-xs font-bold text-[var(--pulse-ink)]">Paid but not confirmed?</p>
      <p className="mt-1 text-[11px] sm:text-xs leading-relaxed text-[var(--pulse-muted)]">
        Enter the 12-digit UTR or FamApp / UPI Transaction ID from your payment receipt. We’ll verify it with the merchant’s payment alert.
      </p>
      {submitted && (
        <p className="mt-3 rounded-xl bg-[var(--pulse-mint)]/10 border border-[var(--pulse-mint)]/20 px-3 py-2 text-[11px] sm:text-xs leading-relaxed text-[var(--pulse-mint)] font-medium" role="status">
          A UTR or Transaction ID has been submitted for this order. You can submit a corrected reference if needed.
        </p>
      )}
      {message && <p className="mt-3 text-[11px] sm:text-xs leading-relaxed text-[var(--pulse-mint)] font-medium" role="status">{message}</p>}
      {error && <p className="mt-3 text-[11px] sm:text-xs leading-relaxed text-[var(--pulse-critical)] font-medium" role="alert">{error}</p>}
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <label className="sr-only" htmlFor={`utr-${orderId}`}>UTR or Transaction ID</label>
        <input
          id={`utr-${orderId}`}
          autoComplete="off"
          maxLength={64}
          value={utr}
          onChange={(event) => setUtr(event.target.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64))}
          placeholder="Enter 12-digit UTR or FamApp Txn ID"
          className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel)] text-[var(--pulse-ink)] placeholder:text-[var(--pulse-muted)] px-3.5 font-mono text-sm outline-none transition focus:border-[var(--pulse-mint)] focus:ring-2 focus:ring-[var(--pulse-mint)]"
        />
        <button
          type="submit"
          disabled={submitting || utr.trim().length < 6}
          className="btn-secondary-pulse inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Checking…' : 'Submit Reference'}
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
  const [showQrModal, setShowQrModal] = useState(false);
  const [showUtrSection, setShowUtrSection] = useState(false);

  useEffect(() => {
    if (checkout?.branding?.checkoutTheme === 'dark') {
      setCheckoutDark(true);
    } else if (checkout?.branding?.checkoutTheme === 'light') {
      setCheckoutDark(false);
    } else if (checkout?.branding?.checkoutLayout === 'banner') {
      setCheckoutDark(true);
    } else if (checkout?.branding?.checkoutTheme === 'auto') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        setCheckoutDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    }
  }, [checkout?.branding?.checkoutTheme, checkout?.branding?.checkoutLayout]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', checkoutDark);
  }, [checkoutDark]);

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

  if (viewState === 'loading') return <PaymentLoader />;

  const totalMinutes = remainingMs === null ? null : Math.floor(remainingMs / 60000);
  const totalHours = totalMinutes === null ? null : Math.floor(totalMinutes / 60);
  const totalDays = totalHours === null ? null : Math.floor(totalHours / 24);

  let formattedExpiry = '—';
  let isUrgent = false;

  if (remainingMs !== null) {
    if (totalDays > 0) {
      const remainingHours = totalHours % 24;
      formattedExpiry = remainingHours > 0 ? `Valid for ${totalDays}d ${remainingHours}h` : `Valid for ${totalDays}d`;
    } else if (totalHours >= 1) {
      const remainingMinutes = totalMinutes % 60;
      formattedExpiry = remainingMinutes > 0 ? `Valid for ${totalHours}h ${remainingMinutes}m` : `Valid for ${totalHours}h`;
    } else if (totalMinutes > 0) {
      const mins = totalMinutes;
      const secs = Math.floor((remainingMs % 60000) / 1000);
      formattedExpiry = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (mins <= 5) isUrgent = true;
    } else {
      formattedExpiry = 'Expiring soon';
      isUrgent = true;
    }
  }

  const branding = checkout?.branding || {};
  const logoUrl = branding?.logoUrl;
  const tagline = branding?.tagline;
  const supportEmail = branding?.supportEmail;
  const merchantName = checkout?.merchantName || branding?.displayName || 'Merchant';

  const checkoutLayout = branding?.checkoutLayout || 'classic';
  const isBannerLayout = checkoutLayout === 'banner';
  const bannerUrl = branding?.bannerUrl;
  const hostedBy = branding?.hostedBy;
  const hostAvatarUrl = branding?.hostAvatarUrl;
  const hostBadge = branding?.hostBadge;
  const enablePromoBanner = branding?.enablePromoBanner;
  const promoBannerUrl = branding?.promoBannerUrl;
  const promoLink = branding?.promoLink;
  const promoClaimText = branding?.promoClaimText || 'CLAIM NOW';
  const guaranteeText = branding?.guaranteeText || 'Instant Verification Guaranteed';
  const trustNotice = branding?.trustNotice;
  const isDark = Boolean(checkoutDark);

  return (
    <main
      className="checkout-shell min-h-[100dvh] px-3.5 py-4 sm:px-6 sm:py-8 transition-colors bg-[var(--pulse-bg)] text-[var(--pulse-ink)] flex flex-col justify-center"
    >
      <div className={`mx-auto w-full transition-all ${isBannerLayout ? 'max-w-[480px]' : 'max-w-[920px]'}`}>
        {!isBannerLayout && (
          <header className="entrance mb-5 flex items-center justify-between px-1 sm:mb-7">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-9 w-9 place-items-center rounded-[12px] bg-[var(--pulse-gradient)] text-white shadow-xs"
              >
                <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden="true">
                  <path d="M5 7.5h14M5 12h14M5 16.5h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="18" cy="17" r="3" fill="white" />
                </svg>
              </span>
              <span className="font-[var(--font-display)] text-[21px] font-bold tracking-tight text-[var(--pulse-ink)]">poppay</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCheckoutDark((d) => !d)}
                title={checkoutDark ? 'Switch to Light checkout' : 'Switch to Dark checkout'}
                className="flex items-center gap-1.5 rounded-full border border-[var(--pulse-line)] bg-[var(--pulse-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--pulse-ink-2)] hover:text-[var(--pulse-ink)] transition"
              >
                {checkoutDark ? (
                  <svg className="h-3.5 w-3.5 text-[var(--pulse-amber)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg className="h-3.5 w-3.5 text-[var(--pulse-mint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--pulse-line)] bg-[var(--pulse-panel)] px-2.5 sm:px-3 py-1.5 text-[11px] font-semibold text-[var(--pulse-muted)]">
                <Icon name="lock" className="h-[13px] w-[13px] text-[var(--pulse-mint)]" />
                <span className="hidden xs:inline">SECURE CHECKOUT</span>
                <span className="xs:hidden">SECURE</span>
              </div>
            </div>
          </header>
        )}

        {viewState === 'error' ? (
          <section className="entrance pulse-card px-6 py-12 text-center sm:px-12">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--pulse-critical)]/10 text-[var(--pulse-critical)]">
              <Icon name="alert" className="h-7 w-7" />
            </div>
            <p className="pulse-eyebrow mb-2 text-[var(--pulse-critical)]">Checkout unavailable</p>
            <h1 className="font-[var(--font-display)] text-[28px] font-bold text-[var(--pulse-ink)]">We couldn’t open this payment</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--pulse-ink-2)]">{loadError || 'Please try again in a moment.'}</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="btn-primary-pulse mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white"
            >
              <Icon name="refresh" className="h-4 w-4" />
              Try again
            </button>
          </section>
        ) : viewState === 'expired' ? (
          <section className="entrance pulse-card px-6 py-12 text-center sm:px-12">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--pulse-warning)]/10 text-[var(--pulse-warning)]">
              <Icon name="clock" className="h-7 w-7" />
            </div>
            <p className="pulse-eyebrow mb-2 text-[var(--pulse-warning)]">Payment window closed</p>
            <h1 className="font-[var(--font-display)] text-[28px] font-bold text-[var(--pulse-ink)]">This request has expired</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--pulse-ink-2)]">No payment was confirmed. Return to {merchantName} to request a fresh payment link.</p>
            <div className="mx-auto mt-7 max-w-sm rounded-2xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] px-5 py-4 text-left">
              <p className="pulse-eyebrow">Order reference</p>
              <p className="mt-1 break-all font-mono text-sm text-[var(--pulse-mint)]">{orderId}</p>
            </div>
            <div className="mx-auto max-w-md">
              <UtrSubmission
                orderId={orderId}
                alreadySubmitted={checkout?.utrSubmitted}
                onConfirmed={applyOutcome}
              />
            </div>
          </section>
        ) : viewState === 'success' ? (
          <section className="entrance pulse-card-hero relative overflow-hidden px-6 py-12 text-center sm:px-12">
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

            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--pulse-mint)]/30 bg-[var(--pulse-mint)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[var(--pulse-mint)] shimmer-badge mb-3">
              <span className="h-2 w-2 rounded-full bg-[var(--pulse-mint)] animate-ping" />
              <span>Payment Confirmed</span>
            </div>
            <h1 className="font-[var(--font-display)] text-[32px] sm:text-[36px] font-bold tracking-tight text-[var(--pulse-ink)]">
              Thank You for Your Support! 🙏
            </h1>
            <p className="mt-2 text-sm text-[var(--pulse-muted)] font-medium">
              Your payment was received directly by <span className="font-bold text-[var(--pulse-ink)]">{merchantName}</span>.
            </p>
            <div className="mt-6 inline-block rounded-2xl bg-[var(--pulse-panel-2)] px-8 py-3.5 border border-[var(--pulse-line)] shadow-xs">
              <span className="pulse-eyebrow text-[var(--pulse-mint)]">Total Paid</span>
              <p className="pulse-hero-num text-[42px] sm:text-[46px] font-bold tracking-tight leading-tight">
                ₹{formatAmount(checkout?.payableAmount)}
              </p>
            </div>
            {payment?.utr && (
              <div className="mx-auto mt-6 max-w-sm rounded-2xl px-5 py-3.5 text-left border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)]">
                <p className="pulse-eyebrow">Bank Reference (UTR)</p>
                <p className="mt-0.5 break-all font-mono text-sm font-bold text-[var(--pulse-mint)]">{payment.utr}</p>
              </div>
            )}
            {payment?.redirectUrl && (
              <p className="mt-6 text-xs text-[var(--pulse-muted)] flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--pulse-mint)] animate-pulse" />
                <span>Redirecting back in <strong className="text-[var(--pulse-ink)] font-bold">{redirectIn}s</strong>…</span>
              </p>
            )}
          </section>
        ) : isBannerLayout ? (
          /* Gaming & Creator Pro Banner Checkout (1:1 with reference_checkout.png) */
          <div className={`entrance overflow-hidden rounded-[26px] sm:rounded-[32px] border shadow-2xl transition-colors ${
            isDark
              ? 'border-white/10 bg-[#0c1412] text-white'
              : 'border-[#d2ded6] bg-white text-[#142e2b]'
          }`}>
            {/* 1. Full Top Hero Graphic Banner with geometric fallback */}
            <div className={`relative h-44 sm:h-52 w-full overflow-hidden ${
              isDark
                ? 'bg-gradient-to-br from-[#0c1412] via-[#162923] to-[#07100e]'
                : 'bg-gradient-to-br from-[#d4ece3] via-[#b6ded0] to-[#e4f2ec]'
            }`}>
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <svg className="h-20 w-20 text-[#2ee6c5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="2" y="6" width="20" height="12" rx="4" />
                  <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <img
                src={bannerUrl || 'https://images.mintgram.live/1792383026477.png'}
                alt=""
                className="absolute inset-0 h-full w-full object-cover select-none"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className={`absolute inset-0 ${
                isDark
                  ? 'bg-gradient-to-t from-[#0c1412] via-[#0c1412]/30 to-transparent'
                  : 'bg-gradient-to-t from-white via-white/20 to-transparent'
              }`} />
              {/* Overlaid Top-Right Hosted by Badge */}
              <div className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1 text-xs text-white shadow-lg">
                <span className="text-[#a1b8ae] text-[11px] font-medium">Hosted by</span>
                {hostAvatarUrl ? (
                  <img
                    src={hostAvatarUrl}
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="h-5 w-5 rounded-full object-cover ring-2 ring-[#2ee6c5]"
                  />
                ) : (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#126b58] font-bold text-[10px] ring-2 ring-[#2ee6c5]">
                    {(hostedBy || merchantName || 'H').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="font-bold text-white max-w-[100px] truncate">{hostedBy || merchantName || 'Host'}</span>
                <span className="rounded bg-[#ff9a3c] px-1.5 py-0.5 text-[10px] font-extrabold text-black tracking-wide">
                  {hostBadge || '65'}
                </span>
              </div>
            </div>

            {/* 2. Sub-App Bar */}
            <div className={`flex items-center justify-between px-5 sm:px-7 pt-4 pb-3 border-b ${
              isDark ? 'border-white/10' : 'border-[#e5ede8]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-[var(--pulse-gradient)] text-white shadow-xs">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M5 7.5h14M5 12h14M5 16.5h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="18" cy="17" r="3" fill="white" />
                  </svg>
                </span>
                <span className={`font-[var(--font-display)] text-[18px] font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-[#142e2b]'
                }`}>poppay</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCheckoutDark((d) => !d)}
                  title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                    isDark
                      ? 'border-white/15 bg-white/5 text-white/80 hover:text-white'
                      : 'border-[#d2ded6] bg-[#f0f7f3] text-[#142e2b] hover:bg-[#e4ede7]'
                  }`}
                >
                  {isDark ? (
                    <svg className="h-3.5 w-3.5 text-[#ff9a3c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                  ) : (
                    <svg className="h-3.5 w-3.5 text-[#007a65]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                </button>
                <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                  isDark
                    ? 'border-[#2ee6c5]/50 bg-[#2ee6c5]/10 text-[#2ee6c5] shadow-[0_0_12px_rgba(46,230,197,0.15)]'
                    : 'border-[#009b80]/40 bg-[#009b80]/10 text-[#007a65]'
                }`}>
                  <Icon name="lock" className={`h-3 w-3 ${isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'}`} />
                  <span>SECURE</span>
                </div>
              </div>
            </div>

            {/* 3. Main Content Container */}
            <div className="p-5 sm:p-7 space-y-5">
              {/* YOU'RE PAYING Section */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-bold uppercase tracking-[.14em] ${
                    isDark ? 'text-[#2ee6c5]' : 'text-[#00826b]'
                  }`}>YOU&apos;RE PAYING</p>
                  <h1 className={`mt-0.5 font-[var(--font-display)] text-[22px] sm:text-[26px] font-bold leading-tight tracking-tight truncate ${
                    isDark ? 'text-white' : 'text-[#142e2b]'
                  }`}>
                    {merchantName}
                  </h1>
                  {tagline && (
                    <p className={`mt-0.5 text-xs truncate ${
                      isDark ? 'text-[#8ca097]' : 'text-[#4b685d]'
                    }`}>{tagline}</p>
                  )}
                </div>
                <div className="relative shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'grid';
                        }
                      }}
                      className={`h-12 w-12 rounded-full object-cover ring-2 ${
                        isDark ? 'ring-[#2ee6c5] shadow-[0_0_15px_rgba(46,230,197,0.3)]' : 'ring-[#009b80]'
                      }`}
                    />
                  ) : null}
                  <div
                    style={{ display: logoUrl ? 'none' : 'grid' }}
                    className={`grid h-12 w-12 place-items-center rounded-full font-[var(--font-display)] text-lg font-bold ring-2 ${
                      isDark
                        ? 'bg-[#132822] ring-[#2ee6c5] text-[#2ee6c5] shadow-[0_0_15px_rgba(46,230,197,0.3)]'
                        : 'bg-[#e2f3ec] ring-[#009b80] text-[#007a65]'
                    }`}
                  >
                    {merchantName.trim().charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* EXACT PAYABLE AMOUNT Card */}
              <div className={`rounded-2xl border p-4 sm:p-5 shadow-inner ${
                isDark
                  ? 'border-[#2ee6c5]/30 bg-[#07120f]'
                  : 'border-[#a5d5c7] bg-[#f0f7f3]'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#8ca097]' : 'text-[#3e5e52]'
                  }`}>EXACT PAYABLE AMOUNT</span>
                  {remainingMs !== null && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums border transition-colors ${
                      isUrgent
                        ? 'border-red-500/40 bg-red-500/10 text-red-400 animate-pulse'
                        : isDark
                          ? 'border-[#2ee6c5]/30 bg-[#2ee6c5]/10 text-[#2ee6c5]'
                          : 'border-[#9ad0c2] bg-[#d8ece4] text-[#006e5a]'
                    }`}>
                      <Icon name="clock" className="h-3 w-3" />
                      {formattedExpiry}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-3">
                  <p className={`font-[var(--font-display)] text-[34px] sm:text-[42px] font-extrabold tracking-tight leading-none ${
                    isDark
                      ? 'text-[#2ee6c5] drop-shadow-[0_0_16px_rgba(46,230,197,0.35)]'
                      : 'text-[#007a65]'
                  }`}>
                    ₹{formatAmount(checkout?.payableAmount)}
                  </p>
                  <button
                    type="button"
                    onClick={copyAmount}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                      isDark
                        ? 'border-[#2ee6c5]/30 bg-[#2ee6c5]/10 text-[#2ee6c5] hover:bg-[#2ee6c5]/20'
                        : 'border-[#9ad0c2] bg-white text-[#007a65] hover:bg-[#f9fdfb]'
                    }`}
                    title="Copy exact amount"
                  >
                    <Icon name={amountCopied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
                    {amountCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className={`mt-3 flex items-center gap-2 text-xs font-bold ${
                  isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                }`}>
                  <Icon name="check" className="h-4 w-4 shrink-0 stroke-[2.5]" />
                  <span>{guaranteeText}</span>
                </div>
              </div>

              {/* Promotional Reward Card (if enabled) */}
              {enablePromoBanner && (
                promoBannerUrl ? (
                  <a
                    href={promoLink || '#'}
                    target={promoLink ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="block rounded-2xl overflow-hidden border border-white/10 shadow-md hover:opacity-95 transition"
                  >
                    <img src={promoBannerUrl} alt="" className="w-full h-auto object-cover max-h-36" />
                  </a>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#9333ea] via-[#ec4899] to-[#f43f5e] p-3.5 sm:p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-yellow-300">
                          <Icon name="sparkles" className="h-3 w-3" />
                          <span>SPECIAL REWARD OFFER</span>
                        </div>
                        <p className="mt-0.5 text-sm sm:text-base font-extrabold leading-snug drop-shadow-sm">
                          GET 50% OFF ON YOUR NEXT ENTRY!
                        </p>
                        <p className="text-[11px] text-white/80 font-medium">Use code GAMER50 on checkout</p>
                      </div>
                      {promoLink ? (
                        <a
                          href={promoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black px-3.5 py-2 text-xs font-extrabold uppercase shadow-md transition active:scale-95"
                        >
                          {promoClaimText}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => alert('Code GAMER50 copied! Use it on your next checkout.')}
                          className="shrink-0 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black px-3.5 py-2 text-xs font-extrabold uppercase shadow-md transition active:scale-95"
                        >
                          {promoClaimText}
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* ONE-CLICK MOBILE UPI */}
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[.14em] mb-2 ${
                  isDark ? 'text-[#8ca097]' : 'text-[#3e5e52]'
                }`}>ONE-CLICK MOBILE UPI</p>
                <a
                  href={checkout?.upiLink || undefined}
                  onClick={(e) => { if (!checkout?.upiLink) e.preventDefault(); }}
                  className="group relative flex min-h-[58px] items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#2ee6c5] via-[#3b82f6] to-[#8b5cf6] px-4 sm:px-5 text-white shadow-[0_4px_20px_rgba(46,230,197,0.3)] hover:brightness-105 active:scale-[0.99] transition"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 shadow-inner group-hover:scale-105 transition-transform">
                      <Icon name="arrow" className="h-5 w-5" />
                    </span>
                    <span className="text-left">
                      <span className="block text-[14px] font-bold leading-tight">Pay with UPI App</span>
                      <span className="block text-[11px] font-normal text-white/85">Tap to open installed UPI app</span>
                    </span>
                  </span>
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm shadow-xs">
                    Tap to open
                  </span>
                </a>

                {/* 4 Fast App Pills */}
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {[
                    { name: 'PhonePe' },
                    { name: 'Google Pay' },
                    { name: 'Paytm' },
                    { name: 'Cred / Other' },
                  ].map((app) => (
                    <a
                      key={app.name}
                      href={checkout?.upiLink || undefined}
                      onClick={(e) => { if (!checkout?.upiLink) e.preventDefault(); }}
                      className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-center transition active:scale-95 shadow-xs ${
                        isDark
                          ? 'border-white/10 bg-[#0e1b17] hover:border-[#2ee6c5]/40 text-[#b4c7be] hover:text-white'
                          : 'border-[#d2e2d8] bg-[#f4f8f5] hover:border-[#009b80] text-[#1a382e] hover:text-black'
                      }`}
                    >
                      <span className="text-[11px] font-bold">{app.name}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <span className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-[#d2ded6]'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-[.14em] ${
                  isDark ? 'text-[#71857c]' : 'text-[#4b685d]'
                }`}>
                  OR MANUAL TRANSFER VIA UPI ID
                </span>
                <span className={`h-px flex-1 ${isDark ? 'bg-white/10' : 'bg-[#d2ded6]'}`} />
              </div>

              {/* Verified UPI ID */}
              <div className={`flex min-h-[58px] items-center gap-3 rounded-2xl border p-3.5 shadow-inner ${
                isDark
                  ? 'border-white/10 bg-[#091512]'
                  : 'border-[#d2e2d8] bg-[#f0f7f3]'
              }`}>
                <div className="min-w-0 flex-1 pl-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#71857c]' : 'text-[#4b685d]'
                  }`}>MERCHANT VERIFIED UPI ID</p>
                  <p className={`mt-0.5 break-all font-mono text-[13px] sm:text-[14px] font-bold select-all ${
                    isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                  }`}>
                    {upiId || checkout?.merchantUpiId || 'UPI ID unavailable'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyUpiId}
                  disabled={!upiId && !checkout?.merchantUpiId}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
                    isDark
                      ? 'border-[#2ee6c5]/30 bg-[#2ee6c5]/10 text-[#2ee6c5] hover:bg-[#2ee6c5]/20'
                      : 'border-[#9ad0c2] bg-white text-[#007a65] hover:bg-[#f9fdfb]'
                  }`}
                >
                  <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Security & Direct Payment Notice */}
              <div className={`flex items-start gap-3 rounded-xl border p-3 ${
                isDark
                  ? 'border-white/10 bg-[#0a1714] text-[#8ca097]'
                  : 'border-[#d2ded6] bg-[#f4f8f5] text-[#3e5e52]'
              }`}>
                <div className={`mt-0.5 shrink-0 ${isDark ? 'text-[#2ee6c5]' : 'text-[#00826b]'}`}>
                  <Icon name="shield" className="h-4 w-4" />
                </div>
                <p className="text-[11px] leading-relaxed">
                  {trustNotice || `Your money goes directly to ${merchantName}. PopPay never holds your funds.`}
                </p>
              </div>

              {/* Quick Action Helpers */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQrModal((s) => !s)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                    isDark
                      ? 'border-white/10 bg-[#0e1b17] text-[#b4c7be] hover:text-[#2ee6c5] hover:border-[#2ee6c5]/30'
                      : 'border-[#d2ded6] bg-[#f0f7f3] text-[#142e2b] hover:text-[#007a65] hover:border-[#009b80]'
                  }`}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM17 17h4v4h-4zM14 20v1M20 14v3"/></svg>
                  <span>{showQrModal ? 'Hide UPI QR' : 'Scan UPI QR Code'}</span>
                </button>

                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      isDark
                        ? 'border-white/10 bg-[#0e1b17] text-[#8ca097] hover:text-white'
                        : 'border-[#d2ded6] bg-[#f0f7f3] text-[#4b685d] hover:text-[#142e2b]'
                    }`}
                  >
                    <span>Need help?</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowUtrSection((s) => !s)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    isDark
                      ? 'border-white/10 bg-[#0e1b17] text-[#8ca097] hover:text-[#2ee6c5] hover:border-[#2ee6c5]/30'
                      : 'border-[#d2ded6] bg-[#f0f7f3] text-[#4b685d] hover:text-[#007a65] hover:border-[#009b80]'
                  }`}
                >
                  <span>Paid but not confirmed?</span>
                </button>
              </div>

              {/* Expandable QR Code Section */}
              {showQrModal && (
                <div className={`entrance mt-3 flex flex-col items-center rounded-2xl border p-5 text-center ${
                  isDark
                    ? 'border-[#2ee6c5]/30 bg-[#07120f]'
                    : 'border-[#a5d5c7] bg-[#f0f7f3]'
                }`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                    isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                  }`}>Scan via PhonePe, GPay or Paytm</p>
                  <div className="qr-frame qr-scanner-box grid aspect-square w-full max-w-[220px] place-items-center rounded-2xl bg-white p-3 shadow-md">
                    {qrImage ? (
                      <>
                        <img src={qrImage} alt="UPI QR code" className="h-full w-full object-contain select-none" />
                        <div className="qr-scanner-line" />
                      </>
                    ) : (
                      <div className="h-8 w-8 rounded-lg border-2 border-slate-300 border-t-[#2ee6c5] animate-spin" />
                    )}
                  </div>
                  <div className={`mt-3 flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${
                    isDark
                      ? 'border-[#2ee6c5]/30 bg-[#2ee6c5]/10 text-[#2ee6c5]'
                      : 'border-[#9ad0c2] bg-[#d8ece4] text-[#006e5a]'
                  }`}>
                    <span className={`h-2 w-2 rounded-full animate-ping ${isDark ? 'bg-[#2ee6c5]' : 'bg-[#007a65]'}`} />
                    <span>Live Bank Alert Listener Active</span>
                  </div>
                </div>
              )}

              {/* Expandable UTR Submission */}
              {(showUtrSection || checkout?.utrSubmitted) && (
                <div className="entrance pt-1">
                  <UtrSubmission
                    orderId={orderId}
                    alreadySubmitted={checkout?.utrSubmitted}
                    onConfirmed={applyOutcome}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Classic Pulse Card Layout */
          <div className="entrance pulse-card overflow-hidden md:grid md:grid-cols-[1fr_360px] p-0">
            {/* Mobile Tab Selector (hidden on desktop) */}
            <div className="md:hidden flex border-b border-[var(--pulse-line)] p-1.5 gap-1.5 bg-[var(--pulse-panel-2)]">
              <button
                type="button"
                onClick={() => setMobileTab('upi')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  mobileTab === 'upi'
                    ? 'pulse-toggle-active text-white'
                    : 'text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)]'
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
                    ? 'pulse-toggle-active text-white'
                    : 'text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)]'
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
                  <p className="pulse-eyebrow">You’re paying</p>
                  <h1 className="mt-1 break-words font-[var(--font-display)] text-[22px] xs:text-[25px] sm:text-[30px] font-bold leading-tight tracking-tight text-[var(--pulse-ink)]">
                    {merchantName}
                  </h1>
                  {tagline && (
                    <p className="mt-1.5 break-words text-xs leading-relaxed text-[var(--pulse-muted)]">{tagline}</p>
                  )}
                </div>
                <div className="relative shrink-0 mt-1">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'grid';
                        }
                      }}
                      className="h-11 w-11 xs:h-12 xs:w-12 rounded-2xl object-cover border border-[var(--pulse-line)] shadow-xs"
                    />
                  ) : null}
                  <div
                    style={{ display: logoUrl ? 'none' : 'grid' }}
                    className="grid h-11 w-11 xs:h-12 xs:w-12 place-items-center rounded-2xl font-[var(--font-display)] text-lg font-bold border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] text-[var(--pulse-ink)] shadow-xs"
                  >
                    {merchantName.trim().charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Exact Payable Amount Card */}
              <div className="rounded-2xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-4 sm:p-5 shadow-xs transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="pulse-eyebrow">Exact payable amount</span>
                  {remainingMs !== null && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums border transition-colors ${
                      isUrgent
                        ? 'border-[var(--pulse-critical)]/30 bg-[var(--pulse-critical)]/10 text-[var(--pulse-critical)] animate-pulse'
                        : 'border-[var(--pulse-mint)]/30 bg-[var(--pulse-mint)]/10 text-[var(--pulse-mint)]'
                    }`}>
                      <Icon name="clock" className="h-3 w-3" />
                      {formattedExpiry}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-3">
                  <p className="break-all font-[var(--font-display)] text-[32px] xs:text-[38px] sm:text-[46px] font-bold leading-none tracking-tight text-[var(--pulse-ink)]">
                    <span className="mr-1 text-[24px] xs:text-[28px] font-semibold text-[var(--pulse-amber)]">₹</span>{formatAmount(checkout?.payableAmount)}
                  </p>
                  <button
                    type="button"
                    onClick={copyAmount}
                    className="btn-secondary-pulse inline-flex items-center gap-1.5 rounded-xl border border-[var(--pulse-line)] px-3 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95"
                    title="Copy exact amount"
                  >
                    <Icon name={amountCopied ? 'check' : 'copy'} className="h-3.5 w-3.5 text-[var(--pulse-mint)]" />
                    {amountCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="mt-3 flex items-start sm:items-center gap-2 rounded-xl px-3 py-2 text-[11px] sm:text-xs font-semibold border border-[var(--pulse-mint)]/20 bg-[var(--pulse-mint)]/10 text-[var(--pulse-mint)]">
                  <span className="mt-0.5 sm:mt-0 h-2 w-2 shrink-0 rounded-full bg-[var(--pulse-mint)] animate-ping" />
                  <span className="leading-snug">Important: Pay exactly ₹{formatAmount(checkout?.payableAmount)} (including paise) for instant verification.</span>
                </div>
              </div>

              {/* 1-Click UPI Payment Button (Signature Gradient Primary Button) */}
              <div className="mt-5 sm:mt-6">
                <p className="pulse-eyebrow mb-2.5">One-click mobile UPI</p>
                <a
                  href={checkout?.upiLink || undefined}
                  onClick={(event) => {
                    if (!checkout?.upiLink) event.preventDefault();
                  }}
                  className={`btn-primary-pulse group relative flex min-h-[58px] items-center justify-between overflow-hidden rounded-2xl px-4 xs:px-5 text-sm font-bold shadow-md transition-all ${
                    checkout?.upiLink
                      ? 'text-white hover:brightness-105 active:scale-[0.99]'
                      : 'cursor-not-allowed bg-[var(--pulse-panel-2)] text-[var(--pulse-muted)]'
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

                {/* Quick-Tap App Shortcuts for Mobile */}
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {[
                    { name: 'PhonePe' },
                    { name: 'Google Pay' },
                    { name: 'Paytm' },
                    { name: 'Cred / Other' },
                  ].map((app) => (
                    <a
                      key={app.name}
                      href={checkout?.upiLink || undefined}
                      onClick={(e) => { if (!checkout?.upiLink) e.preventDefault(); }}
                      className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] text-center transition active:scale-95 hover:border-[var(--pulse-mint)]/40"
                    >
                      <span className="text-[11px] font-bold text-[var(--pulse-ink-2)]">{app.name}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--pulse-line)]" />
                <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--pulse-muted)]">or manual transfer via UPI ID</span>
                <span className="h-px flex-1 bg-[var(--pulse-line)]" />
              </div>

              {/* Verified UPI ID Box */}
              <div className="flex min-h-[58px] items-center gap-2.5 xs:gap-3 rounded-2xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-3 shadow-2xs transition-colors hover:border-[var(--pulse-mint)]/40">
                <div className="min-w-0 flex-1 pl-1">
                  <p className="pulse-eyebrow">Merchant Verified UPI ID</p>
                  <p className="mt-0.5 break-all font-mono text-[13px] sm:text-[14px] font-semibold text-[var(--pulse-mint)] select-all">{upiId || 'UPI ID unavailable'}</p>
                </div>
                <button
                  type="button"
                  onClick={copyUpiId}
                  disabled={!upiId}
                  className="btn-secondary-pulse inline-flex min-h-10 shrink-0 items-center gap-1.5 xs:gap-2 rounded-xl border border-[var(--pulse-line)] px-3 xs:px-3.5 text-xs font-bold shadow-2xs transition active:scale-95 disabled:cursor-not-allowed"
                  aria-label={copied ? 'UPI ID copied' : 'Copy UPI ID'}
                >
                  <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4 text-[var(--pulse-mint)]" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Security & Direct Payment Notice */}
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] px-3.5 py-3 text-[var(--pulse-muted)]">
                <div className="mt-0.5 text-[var(--pulse-mint)] shrink-0">
                  <Icon name="lock" className="h-4 w-4" />
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your money goes directly to <span className="font-semibold text-[var(--pulse-ink)]">{checkout?.merchantName || 'the merchant'}</span>. PopPay never holds your funds.
                </p>
              </div>

              {/* UTR Submission Form */}
              <UtrSubmission
                orderId={orderId}
                alreadySubmitted={checkout?.utrSubmitted}
                onConfirmed={applyOutcome}
              />
            </section>

            {/* QR Code Column */}
            <aside className={`entrance-delay flex flex-col items-center p-5 sm:p-7 md:p-8 bg-[var(--pulse-panel-2)]/40 border-t md:border-t-0 md:border-l border-[var(--pulse-line)] ${
              mobileTab !== 'qr' ? 'hidden md:flex' : 'flex'
            }`}>
              <div className="mb-4 flex w-full items-center justify-between">
                <div>
                  <p className="pulse-eyebrow">Scan to pay</p>
                  <p className="text-[11px] font-semibold text-[var(--pulse-mint)]">₹{formatAmount(checkout?.payableAmount)}</p>
                </div>
                <span className="rounded-full border border-[var(--pulse-line)] bg-[var(--pulse-panel)] px-2.5 py-1 text-[10px] font-bold text-[var(--pulse-muted)]">UPI QR</span>
              </div>

              {/* QR Frame with Laser Scanner Line */}
              <div className="qr-frame qr-scanner-box grid aspect-square w-full max-w-[260px] sm:max-w-[272px] place-items-center rounded-[22px] border border-[var(--pulse-line)] bg-white p-3.5 shadow-sm">
                {qrImage ? (
                  <>
                    <img src={qrImage} alt="UPI payment QR code" className="h-full w-full object-contain select-none" />
                    <div className="qr-scanner-line" />
                  </>
                ) : (
                  <div className="flex flex-col items-center px-5 text-center">
                    <div className="mb-3 h-8 w-8 rounded-lg border-2 border-slate-300 border-t-[var(--pulse-pink)] animate-spin" />
                    <p className="text-xs font-medium text-slate-500">Preparing secure QR code…</p>
                  </div>
                )}
              </div>

              {/* Bank Listener Status */}
              <div className="mt-4 sm:mt-5 flex flex-col items-center gap-1.5 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--pulse-mint)]/30 bg-[var(--pulse-mint)]/10 px-3 py-1 shadow-2xs text-[var(--pulse-mint)]">
                  <span className="radar-sonar h-2.5 w-2.5">
                    <span className="h-2 w-2 rounded-full bg-[var(--pulse-mint)]" />
                  </span>
                  <span className="text-[11px] font-bold">Live Bank Alert Listener Active</span>
                </span>
                <span className="text-[11px] font-medium text-[var(--pulse-muted)]">Scan via PhonePe, GPay, Paytm or BHIM</span>
              </div>

              {/* Mobile QR Helper: Quick UPI ID Copy */}
              <div className="mt-4 md:hidden w-full">
                <div className="flex items-center justify-between rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel)] p-2.5">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="pulse-eyebrow">UPI ID</p>
                    <p className="break-all font-mono text-xs font-semibold text-[var(--pulse-mint)]">{upiId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    className="btn-secondary-pulse inline-flex items-center gap-1 rounded-lg border border-[var(--pulse-line)] px-2.5 py-1 text-[11px] font-bold text-[var(--pulse-mint)]"
                  >
                    <Icon name={copied ? 'check' : 'copy'} className="h-3 w-3" />
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Waiting status footer */}
              <div className="mt-auto w-full border-t border-[var(--pulse-line)] pt-4 mt-4">
                {viewState === 'waiting' ? (
                  <div className="flex items-center justify-center gap-2.5 text-center">
                    <span className="flex items-center gap-1.5">
                      <i className="waiting-dot h-2 w-2 rounded-full bg-[var(--pulse-pink)]" />
                      <i className="waiting-dot h-2 w-2 rounded-full bg-[var(--pulse-amber)]" />
                      <i className="waiting-dot h-2 w-2 rounded-full bg-[var(--pulse-mint)]" />
                    </span>
                    <span className="text-xs font-bold text-[var(--pulse-mint)]">Waiting for bank confirmation…</span>
                  </div>
                ) : null}
                <p className="mt-1.5 text-center text-[10px] leading-4 text-[var(--pulse-muted)]">
                  Funds transfer directly to the merchant. Do not close.
                </p>
              </div>
            </aside>
          </div>
        )}

        <footer className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center text-[10px] font-medium text-[var(--pulse-muted)]">
          <span>Powered by PopPay</span>
          <span aria-hidden="true">·</span>
          <span>Direct UPI to {merchantName}</span>
          {supportEmail && (
            <>
              <span aria-hidden="true">·</span>
              <a href={`mailto:${supportEmail}`} className="underline hover:text-[var(--pulse-mint)]">Support: {supportEmail}</a>
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
        <main className="checkout-shell min-h-[100dvh] px-4 py-8 bg-[var(--pulse-bg)] text-[var(--pulse-ink)] flex items-center justify-center">
          <div className="pulse-card max-w-md w-full p-8 text-center border-[var(--pulse-critical)]/30">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--pulse-critical)]/10 text-[var(--pulse-critical)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <h1 className="font-[var(--font-display)] text-xl font-bold text-[var(--pulse-ink)]">Could not load checkout</h1>
            <p className="mt-2 text-sm text-[var(--pulse-muted)]">
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary-pulse mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg"
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
