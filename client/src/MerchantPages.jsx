import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  FileCode2,
  Flame,
  Image,
  KeyRound,
  LayoutTemplate,
  Link2,
  Lock,
  Mail,
  Monitor,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Undo2,
  Webhook,
  WalletCards,
  X,
} from 'lucide-react';
import {
  claimUnmatched,
  clearReportedUtr,
  confirmReportedUtr,
  disconnectGmail,
  fetchLatestGmailEmails,
  getDashboardOrders,
  getDashboardStats,
  getGmailConnectUrl,
  getPayments,
  getUnmatched,
  getWebhookLogs,
  regenerateKeys,
  retryWebhook,
  updateAllowedSenders,
  updateBranding,
  updateUpi,
  updateWebhook,
  updateProfile,
  changePassword,
} from './api.js';
import {
  EmptyState,
  ErrorState,
  formatDate,
  formatMoney,
  Notice,
  PageHeading,
  Pagination,
  Panel,
  PanelTitle,
  queueCredentials,
  StatusBadge,
  useMerchant,
} from './MerchantShell.jsx';

function Spinner({ small = false }) {
  return <span className={`${small ? 'h-4 w-4 border-2' : 'h-5 w-5 border-[2.5px]'} inline-block animate-spin rounded-full border-[#c9d7cd] border-t-[#126b58]`} aria-label="Loading" />;
}

function TableLoading({ columns = 4 }) {
  return (
    <div className="space-y-3 p-5 sm:p-6" aria-label="Loading records">
      {Array.from({ length: 5 }, (_, row) => <div key={row} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }, (_, col) => <div key={col} className="skeleton h-9 rounded-lg" />)}
      </div>)}
    </div>
  );
}

function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition active:scale-95 ${
        copied
          ? 'bg-[var(--pulse-mint)]/15 text-[var(--pulse-mint)] font-bold'
          : 'text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)] hover:bg-[var(--pulse-panel-2)]'
      } ${className}`}
      title={copied ? 'Copied to clipboard!' : `Copy ${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-[var(--pulse-mint)]" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

function StatTile({ label, value, caption, icon: Icon, accent = false, progress = null, badge = null, tooltip = null }) {
  return (
    <div
      title={tooltip || label}
      className={`pulse-entrance-card relative overflow-hidden transition-all ${
        accent
          ? 'pulse-card-hero'
          : 'pulse-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="pulse-eyebrow text-[11px]">
              {label}
            </p>
            {badge && (
              <span className="rounded-full bg-[var(--pulse-panel-2)] border border-[var(--pulse-line)] px-2 py-0.5 text-[9px] font-bold text-[var(--pulse-mint)]">
                {badge}
              </span>
            )}
          </div>
          <p className={`mt-2 tabular-nums break-words sm:break-normal ${
            accent
              ? 'pulse-hero-num text-[24px] xs:text-[27px] sm:text-[32px]'
              : 'font-[var(--font-display)] text-[22px] xs:text-[25px] sm:text-[28px] font-bold tracking-[-0.02em] text-[var(--pulse-ink)]'
          }`}>
            {value}
          </p>
        </div>
        <span
          title={tooltip || label}
          aria-label={tooltip || label}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-xs ${
            accent
              ? 'bg-[var(--pulse-gradient)] text-white'
              : 'bg-[var(--pulse-panel-2)] text-[var(--pulse-mint)] border border-[var(--pulse-line)]'
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
      </div>

      {progress !== null && (
        <div className="mt-3.5 w-full bg-[var(--pulse-panel-2)] h-1.5 rounded-full overflow-hidden border border-[var(--pulse-line)]">
          <div
            className="bg-[var(--pulse-mint)] h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      <p className="mt-3.5 text-xs font-normal leading-relaxed text-[var(--pulse-muted)]">
        {caption}
      </p>
    </div>
  );
}


function OnboardingCard({ merchant }) {
  const tasks = [
    { label: 'Add receiving UPI ID', detail: 'Set UPI handle to receive direct bank credits', done: Boolean(merchant.upiId), to: '/settings', icon: Store },
    { label: 'Connect FamApp inbox', detail: 'Real-time bank credit alert synchronization', done: Boolean(merchant.gmail?.connected), to: '/settings', icon: Mail },
    { label: 'Configure allowed sender', detail: 'Whitelist bank notifications for instant matching', done: Boolean(merchant.allowedSenders?.length), to: '/settings', icon: ShieldCheck },
  ];
  const complete = tasks.filter((task) => task.done).length;
  if (complete === tasks.length) return null;
  const percentage = Math.round((complete / tasks.length) * 100);

  return (
    <Panel className="border-[var(--pulse-line)] bg-[var(--pulse-panel)]">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_360px] lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--pulse-mint)]/15 text-[var(--pulse-mint)]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <p className="pulse-eyebrow text-[10px] text-[var(--pulse-mint)]">
              Setup Guide · {complete} of {tasks.length} Completed ({percentage}%)
            </p>
          </div>
          <h2 className="mt-2.5 font-[var(--font-display)] text-[20px] font-bold tracking-[-0.02em] text-[var(--pulse-ink)]">
            Get your instant UPI collection engine ready
          </h2>
          <p className="mt-1 text-xs text-[var(--pulse-ink-2)] leading-relaxed">
            Complete these essential steps so incoming customer payments match and settle directly to your bank account with zero delay.
          </p>
          <div className="mt-3.5 max-w-xs w-full bg-[var(--pulse-panel-2)] border border-[var(--pulse-line)] h-2 rounded-full overflow-hidden">
            <div className="bg-[var(--pulse-gradient)] h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {tasks.map(({ label, detail, done, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className={`group flex items-center gap-3 rounded-xl border p-2.5 transition ${
                done
                  ? 'border-[var(--pulse-line)] bg-[var(--pulse-panel-2)]/60'
                  : 'border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] hover:border-[var(--pulse-pink)]/40 shadow-xs'
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                done ? 'bg-[var(--pulse-mint)] text-white' : 'bg-[var(--pulse-panel)] text-[var(--pulse-muted)]'
              }`}>
                {done ? <Check className="h-4 w-4 stroke-[2.5]" /> : <Icon className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold ${done ? 'text-[var(--pulse-muted)] line-through' : 'text-[var(--pulse-ink)]'}`}>
                  {label}
                </p>
                <p className="text-[10px] text-[var(--pulse-muted)] leading-snug">{detail}</p>
              </div>
              {!done && (
                <ArrowRight className="h-4 w-4 text-[var(--pulse-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--pulse-mint)]" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function DashboardPage() {
  const { merchant } = useMerchant();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const connected = searchParams.get('gmail') === 'connected';

  function refresh() {
    setRefreshing(true);
    setRetryKey((k) => k + 1);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getDashboardStats()
      .then((result) => { if (active) setStats(result); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Dashboard statistics could not be loaded.'); })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => { active = false; };
  }, [retryKey]);

  useEffect(() => {
    document.title = 'Dashboard · PopPay';
  }, []);

  useEffect(() => {
    if (!connected) return;
    const next = new URLSearchParams(searchParams);
    next.delete('gmail');
    setSearchParams(next, { replace: true });
  }, [connected, searchParams, setSearchParams]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), []);
  const recent = stats?.recentPayments || [];
  const successRate = Number(stats?.successRate || 0);

  function copyUpi() {
    if (!merchant?.upiId) return;
    navigator.clipboard.writeText(merchant.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  }

  function copyPublicKey() {
    if (!merchant?.publicKey) return;
    navigator.clipboard.writeText(merchant.publicKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  return (
    <div className="page-enter space-y-6">
      {connected && (
        <Notice>
          FamApp payment inbox successfully linked. Real-time bank notification listener is active.
        </Notice>
      )}

      {/* Top Greeting & Action Header */}
      <PageHeading
        eyebrow={dateLabel}
        title={`Good day, ${merchant.name.split(' ')[0]} 👋`}
        detail="Direct UPI collection desk, bank verification stream, and live transaction ledger."
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="btn-secondary-pulse inline-flex min-h-[48px] sm:min-h-0 sm:h-10 items-center justify-center gap-2 px-5 text-sm sm:text-xs font-semibold disabled:opacity-60"
              title="Refresh dashboard stats"
            >
              <RefreshCw className={`h-4 w-4 sm:h-3.5 sm:w-3.5 text-[var(--pulse-mint)] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <Link
              to="/payment-links"
              className="btn-primary-pulse inline-flex min-h-[48px] sm:min-h-0 sm:h-10 items-center justify-center gap-2 px-5 text-sm sm:text-xs font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Create Payment Link</span>
            </Link>
          </div>
        }
      />

      {/* Setup Guide */}
      <OnboardingCard merchant={merchant} />

      {/* 4 Financial KPI Stat Tiles */}
      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pulse-skeleton h-[145px] rounded-[22px]" />
          <div className="pulse-skeleton h-[145px] rounded-[22px]" />
          <div className="pulse-skeleton h-[145px] rounded-[22px]" />
          <div className="pulse-skeleton h-[145px] rounded-[22px]" />
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            accent
            label="Collected Today"
            value={formatMoney(stats.todayCollection)}
            caption={`${Number(stats.todayPaymentCount || 0)} confirmed ${Number(stats.todayPaymentCount || 0) === 1 ? 'payment' : 'payments'} today`}
            icon={WalletCards}
            tooltip="Total funds received directly in your bank account today"
          />
          <StatTile
            label="Success Rate"
            value={`${successRate.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`}
            caption={
              Number(stats.todayOrderCount || 0) > 0
                ? `${Number(stats.todayPaidOrderCount || stats.todayPaymentCount || 0)} paid of ${Number(stats.todayOrderCount)} total ${Number(stats.todayOrderCount) === 1 ? 'attempt' : 'attempts'} today`
                : 'No checkout attempts created yet today'
            }
            icon={Activity}
            progress={successRate}
            tooltip={`Order conversion rate: ${Number(stats.todayPaidOrderCount || stats.todayPaymentCount || 0)} paid out of ${Number(stats.todayOrderCount || 0)} orders created today`}
          />
          <StatTile
            label="Verified Payments"
            value={String(Number(stats.todayPaymentCount || 0))}
            caption={`${Number(stats.todayPaymentCount || 0)} automated bank credit alerts`}
            icon={CheckCircle2}
            tooltip="Instant real-time bank credit alerts matched with DKIM cryptographic validation"
          />
          <StatTile
            label="Receiving UPI Handle"
            value={merchant.upiId || 'Not Configured'}
            caption="Direct instant bank settlement"
            icon={Smartphone}
            tooltip="Your active UPI VPA handle where customers transfer funds directly"
          />
        </div>
      ) : null}

      {/* Quick Action & Snapshot Cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Instant Tools Card */}
        <Panel className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="pulse-eyebrow text-[11px] text-[var(--pulse-mint)]">
                Direct UPI Collection
              </span>
              <span className="rounded-full bg-[var(--pulse-panel-2)] border border-[var(--pulse-line)] px-2 py-0.5 text-[10px] font-bold text-[var(--pulse-mint)]">
                0% Gateway Fee
              </span>
            </div>
            <h3 className="mt-2 font-[var(--font-display)] text-lg font-bold text-[var(--pulse-ink)]">
              Instant Payment Links & QR
            </h3>
            <p className="mt-1 text-xs text-[var(--pulse-ink-2)] leading-relaxed">
              Generate customizable payment links with exact amounts and dynamic QR codes for 1-tap mobile UPI checkout.
            </p>
            {merchant.upiId && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-3">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="pulse-eyebrow text-[10px]">Your Active UPI Handle</p>
                  <p className="break-all font-mono text-xs font-bold text-[var(--pulse-mint)] select-all">{merchant.upiId}</p>
                </div>
                <button
                  type="button"
                  onClick={copyUpi}
                  className="btn-secondary-pulse inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
                >
                  {copiedUpi ? <Check className="h-3.5 w-3.5 text-[var(--pulse-mint)]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/payment-links"
              className="btn-secondary-pulse inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs font-bold"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Create Payment Link</span>
            </Link>
            <Link
              to="/branding"
              className="btn-secondary-pulse inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 text-xs font-bold"
            >
              <Palette className="h-3.5 w-3.5 text-[var(--pulse-pink)]" />
              <span>Brand Checkout</span>
            </Link>
          </div>
        </Panel>

        {/* Developer & Listener Snapshot */}
        <Panel className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="pulse-eyebrow text-[11px] text-[var(--pulse-violet)]">
                Developer Docs
              </span>
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--pulse-mint)]/20 bg-[var(--pulse-mint)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--pulse-mint)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--pulse-mint)] animate-pulse" />
                <span>API Ready</span>
              </div>
            </div>
            <h3 className="mt-2 font-[var(--font-display)] text-lg font-bold text-[var(--pulse-ink)]">
              REST API & Webhooks
            </h3>
            <p className="mt-1 text-xs text-[var(--pulse-ink-2)] leading-relaxed">
              Integrate PopPay into your website, app, or server with simple JSON endpoints and signed webhook notifications.
            </p>
            {merchant.publicKey && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-3">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="pulse-eyebrow text-[10px]">Public API Key</p>
                  <p className="break-all font-mono text-xs font-bold text-[var(--pulse-ink)] select-all">{merchant.publicKey}</p>
                </div>
                <button
                  type="button"
                  onClick={copyPublicKey}
                  className="btn-secondary-pulse inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-[var(--pulse-mint)]" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to="/docs"
              className="btn-secondary-pulse inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
            >
              <FileCode2 className="h-3.5 w-3.5 text-[var(--pulse-sky)]" />
              <span>View API Documentation</span>
            </Link>
            <Link
              to="/settings"
              className="btn-secondary-pulse inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
            >
              <Webhook className="h-3.5 w-3.5 text-[var(--pulse-violet)]" />
              <span>Configure Webhook</span>
            </Link>
          </div>
        </Panel>
      </div>

      {/* Recent Payments Feed */}
      <Panel className="overflow-hidden">
        <PanelTitle
          title="Recent Payments"
          detail="Live ledger of verified customer transfers directly to your UPI ID"
          action={
            <Link
              to="/payments"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--pulse-mint)] hover:underline"
            >
              <span>View all payments</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {loading ? (
          <TableLoading columns={4} />
        ) : error ? (
          <div className="p-5">
            <p className="text-xs text-[var(--pulse-muted)]">Recent payments unavailable until dashboard refresh succeeds.</p>
          </div>
        ) : recent.length ? (
          <div className="divide-y divide-[var(--pulse-line)]">
            {recent.map((payment) => (
              <div
                key={payment.payment_id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4 sm:px-6 hover:bg-[var(--pulse-panel-2)] transition"
              >
                <div className="flex items-center gap-3.5 min-w-[200px]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--pulse-gradient)] text-white font-bold text-xs shadow-xs">
                    ₹
                  </span>
                  <div>
                    <p className="font-mono text-xs font-bold text-[var(--pulse-ink)]">
                      {payment.order_id}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--pulse-muted)]">
                      UTR: <span className="font-mono font-semibold text-[var(--pulse-ink)]">{payment.utr || '—'}</span> · {formatDate(payment.receivedAt, { time: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    payment.verificationMethod === 'MERCHANT_MANUAL'
                      ? 'bg-[var(--pulse-warning)]/10 text-[var(--pulse-warning)] border border-[var(--pulse-warning)]/20'
                      : 'bg-[var(--pulse-positive)]/10 text-[var(--pulse-positive)] border border-[var(--pulse-positive)]/20'
                  }`}>
                    {payment.verificationMethod === 'MERCHANT_MANUAL' ? (
                      <>
                        <Clock3 className="h-3 w-3" />
                        <span>Merchant Verified</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-3 w-3" />
                        <span>FamApp Credit Alert</span>
                      </>
                    )}
                  </span>
                  <p className="font-[var(--font-display)] text-base font-extrabold tabular-nums text-[var(--pulse-ink)] text-right">
                    +{formatMoney(payment.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={WalletCards}
            title="No payments confirmed yet"
            detail="When a customer pays your UPI ID, PopPay’s real-time bank listener matches the transaction and records it here instantly."
            action={
              <Link
                to="/payment-links"
                className="btn-primary-pulse inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create your first payment link</span>
              </Link>
            }
          />
        )}
      </Panel>
    </div>
  );
}

const ORDER_FILTERS = [
  ['ALL', 'All orders'],
  ['CREATED', 'Created'],
  ['PENDING', 'Pending'],
  ['PAID', 'Paid'],
  ['EXPIRED', 'Expired'],
];

export function OrdersPage() {
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getDashboardOrders({ page, limit: 25, status: filter === 'ALL' ? '' : filter })
      .then((value) => { if (active) setResult(value); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Orders could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, page, retryKey]);

  function changeFilter(value) { setFilter(value); setPage(1); }
  const orders = result?.orders || [];

  return (
    <div className="page-enter space-y-6">
      <PageHeading
        eyebrow="Collection activity"
        title="Orders"
        detail="A live, synchronized ledger of customer payment requests generated across all integrations."
        action={
          <Link
            to="/payment-links"
            className="btn-primary-pulse inline-flex min-h-[44px] sm:min-h-0 sm:h-10 items-center justify-center gap-2 px-4 text-xs font-bold w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>New Payment Link</span>
          </Link>
        }
      />
      <Panel className="overflow-hidden">
        <PanelTitle
          title="Order ledger"
          detail={result ? `${result.total} ${result.total === 1 ? 'order' : 'orders'} in this view` : 'Most recent payment requests'}
        />
        {/* Filter Pills with Horizontal Scroll on Mobile */}
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--pulse-line)] px-4 py-3 sm:px-6 custom-scrollbar">
          {ORDER_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeFilter(value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                filter === value
                  ? 'pulse-toggle-active'
                  : 'bg-[var(--pulse-panel-2)] text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <TableLoading columns={5} />
        ) : error ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />
          </div>
        ) : !orders.length ? (
          <EmptyState
            icon={Clipboard}
            title={filter === 'ALL' ? 'No orders yet' : `No ${filter.toLowerCase()} orders`}
            detail={
              filter === 'ALL'
                ? 'Orders created through the API or your payment links will appear here instantly.'
                : 'No orders match this status filter. Select "All orders" or create a new checkout.'
            }
          />
        ) : (
          <>
            {/* Mobile Card View (< sm screens) */}
            <div className="divide-y divide-[var(--pulse-line)] sm:hidden">
              {orders.map((order) => (
                <div key={order.order_id} className="p-4 space-y-3 hover:bg-[var(--pulse-panel-2)] transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[var(--pulse-ink)] truncate">
                          {order.order_id}
                        </span>
                        <CopyButton text={order.order_id} label="" />
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--pulse-muted)] truncate">
                        {order.receipt ? `Receipt: ${order.receipt}` : 'No receipt reference'}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="flex items-baseline justify-between rounded-xl bg-[var(--pulse-panel-2)] border border-[var(--pulse-line)] p-2.5">
                    <div>
                      <p className="pulse-eyebrow text-[10px]">Payable</p>
                      <p className="font-[var(--font-display)] text-base font-extrabold text-[var(--pulse-ink)] tabular-nums">
                        {formatMoney(order.payableAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="pulse-eyebrow text-[10px]">Base Amount</p>
                      <p className="text-xs font-semibold text-[var(--pulse-muted)] tabular-nums">
                        {formatMoney(order.baseAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--pulse-muted)] pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3 text-[var(--pulse-muted)]" />
                      Expires: {formatDate(order.expiresAt, { time: true })}
                    </span>
                    {order.redirectUrl && (
                      <span className="text-[10px] text-[var(--pulse-mint)] font-semibold truncate max-w-[140px]">
                        Redirect configured
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-[var(--pulse-panel)] text-[10px] font-bold uppercase tracking-wider text-[var(--pulse-muted)] border-b border-[var(--pulse-line)]">
                    <th className="px-6 py-3.5">Order / receipt</th>
                    <th className="px-4 py-3.5">Base amount</th>
                    <th className="px-4 py-3.5">Payable amount</th>
                    <th className="px-4 py-3.5">Expires</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pulse-line)]">
                  {orders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-[var(--pulse-panel-2)] transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--pulse-ink)]">{order.order_id}</span>
                          <CopyButton text={order.order_id} label="" />
                        </div>
                        <p className="mt-0.5 break-words text-[11px] text-[var(--pulse-muted)]">
                          {order.receipt || 'No receipt reference'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs tabular-nums text-[var(--pulse-muted)]">{formatMoney(order.baseAmount)}</td>
                      <td className="px-4 py-4 text-xs font-extrabold tabular-nums text-[var(--pulse-ink)]">{formatMoney(order.payableAmount)}</td>
                      <td className="px-4 py-4 text-xs text-[var(--pulse-muted)]">{formatDate(order.expiresAt, { time: true })}</td>
                      <td className="px-6 py-4 text-right"><StatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!loading && !error && result && <Pagination page={result.page || page} pages={result.pages} total={result.total} onChange={setPage} />}
      </Panel>
    </div>
  );
}

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getPayments({ page, limit: 25 })
      .then((value) => { if (active) setResult(value); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Payments could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, retryKey]);

  const payments = result?.payments || [];
  return (
    <div className="page-enter space-y-6">
      <PageHeading
        eyebrow="Confirmed transfers"
        title="Payments"
        detail="Direct bank credits reconciled automatically via cryptographically verified UPI push alerts."
      />
      <Panel className="overflow-hidden">
        <PanelTitle
          title="Payment history"
          detail={result ? `${result.total} confirmed ${result.total === 1 ? 'payment' : 'payments'}` : 'Most recent first'}
        />
        {loading ? (
          <TableLoading columns={4} />
        ) : error ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />
          </div>
        ) : !payments.length ? (
          <EmptyState
            icon={WalletCards}
            title="No confirmed payments yet"
            detail="Payments will appear here the moment customer UPI transfers match your active orders in real time."
          />
        ) : (
          <>
            {/* Mobile Card View (< sm screens) */}
            <div className="divide-y divide-[var(--pulse-line)] sm:hidden">
              {payments.map((payment) => (
                <div key={payment.payment_id} className="p-4 space-y-3 hover:bg-[var(--pulse-panel-2)] transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-[var(--font-display)] text-lg font-bold text-[var(--pulse-positive)] tabular-nums">
                        +{formatMoney(payment.amount)}
                      </p>
                      <p className="text-[11px] text-[var(--pulse-muted)] mt-0.5">
                        {formatDate(payment.receivedAt, { time: true })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        payment.verificationMethod === 'MERCHANT_MANUAL'
                          ? 'bg-[var(--pulse-warning)]/10 text-[var(--pulse-warning)] border border-[var(--pulse-warning)]/20'
                          : 'bg-[var(--pulse-positive)]/10 text-[var(--pulse-positive)] border border-[var(--pulse-positive)]/20'
                      }`}
                    >
                      {payment.verificationMethod === 'MERCHANT_MANUAL' ? (
                        <>
                          <Clock3 className="h-3 w-3" />
                          <span>Merchant Verified</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="h-3 w-3" />
                          <span>FamApp Credit</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="space-y-1.5 rounded-xl bg-[var(--pulse-panel-2)] border border-[var(--pulse-line)] p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="pulse-eyebrow text-[10px]">Order</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-[var(--pulse-ink)]">{payment.order_id}</span>
                        <CopyButton text={payment.order_id} label="" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="pulse-eyebrow text-[10px]">UTR / Ref</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold text-[var(--pulse-mint)]">{payment.utr || '—'}</span>
                        {payment.utr && <CopyButton text={payment.utr} label="" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse text-left">
                <thead>
                  <tr className="bg-[var(--pulse-panel)] text-[10px] font-bold uppercase tracking-wider text-[var(--pulse-muted)] border-b border-[var(--pulse-line)]">
                    <th className="px-6 py-3.5">Payment ID</th>
                    <th className="px-4 py-3.5">Matched Order</th>
                    <th className="px-4 py-3.5">Bank UTR</th>
                    <th className="px-4 py-3.5">Verification</th>
                    <th className="px-4 py-3.5">Received</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pulse-line)]">
                  {payments.map((payment) => (
                    <tr key={payment.payment_id} className="hover:bg-[var(--pulse-panel-2)] transition">
                      <td className="px-6 py-4 font-mono text-[11px] text-[var(--pulse-muted)]">
                        <div className="flex items-center gap-1">
                          <span>{payment.payment_id}</span>
                          <CopyButton text={payment.payment_id} label="" />
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs font-bold text-[var(--pulse-ink)]">
                        <div className="flex items-center gap-1">
                          <span>{payment.order_id}</span>
                          <CopyButton text={payment.order_id} label="" />
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs font-semibold text-[var(--pulse-mint)]">
                        <div className="flex items-center gap-1">
                          <span>{payment.utr || '—'}</span>
                          {payment.utr && <CopyButton text={payment.utr} label="" />}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            payment.verificationMethod === 'MERCHANT_MANUAL'
                              ? 'bg-[var(--pulse-warning)]/10 text-[var(--pulse-warning)] border border-[var(--pulse-warning)]/20'
                              : 'bg-[var(--pulse-positive)]/10 text-[var(--pulse-positive)] border border-[var(--pulse-positive)]/20'
                          }`}
                        >
                          {payment.verificationMethod === 'MERCHANT_MANUAL' ? (
                            <>
                              <Clock3 className="h-3 w-3" />
                              <span>Merchant Verified</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              <span>FamApp Credit Alert</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-[var(--pulse-muted)]">{formatDate(payment.receivedAt, { time: true })}</td>
                      <td className="px-6 py-4 text-right text-sm font-extrabold tabular-nums text-[var(--pulse-positive)]">
                        +{formatMoney(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {!loading && !error && result && <Pagination page={result.page || page} pages={result.pages} total={result.total} onChange={setPage} />}
      </Panel>
    </div>
  );
}

function orderFitsPayment(order, payment, verificationGraceMs = 10 * 60 * 1000) {
  const sameAmount = Number(order.payableAmount) === Number(payment.amount);
  const receivedAt = new Date(payment.receivedAt).getTime();
  const createdAt = new Date(order.createdAt).getTime();
  const expiresAt = new Date(order.expiresAt).getTime();
  const graceMs = Number.isFinite(Number(verificationGraceMs))
    ? Number(verificationGraceMs)
    : 10 * 60 * 1000;
  return sameAmount
    && Number.isFinite(receivedAt)
    && Number.isFinite(createdAt)
    && Number.isFinite(expiresAt)
    && receivedAt >= createdAt
    && receivedAt <= expiresAt + graceMs;
}

export function UnmatchedPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [selections, setSelections] = useState({});
  const [claiming, setClaiming] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState('');
  const [bankConfirmations, setBankConfirmations] = useState({});
  const [confirmingUtr, setConfirmingUtr] = useState('');
  const [clearingUtr, setClearingUtr] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getUnmatched({ page: 1, limit: 100 })
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unmatched payments could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);

  async function claim(payment) {
    const orderId = selections[payment.id];
    if (!orderId) return;
    setClaiming(payment.id);
    setClaimError('');
    setClaimSuccess('');
    try {
      await claimUnmatched(payment.id, orderId);
      setClaimSuccess(`Payment ${payment.utr || payment.id} has been matched to ${orderId}.`);
      setData((current) => current ? {
        ...current,
        payments: current.payments.filter((item) => item.id !== payment.id),
        pendingOrders: current.pendingOrders.filter((item) => item.order_id !== orderId),
        total: Math.max(0, Number(current.total || 0) - 1),
      } : current);
      setSelections((current) => { const next = { ...current }; delete next[payment.id]; return next; });
      try {
        const latest = await getUnmatched({ page: 1, limit: 100 });
        setData(latest);
      } catch {
        // The successful claim remains reflected locally if refreshing the list fails.
      }
    } catch (requestError) {
      setClaimError(requestError.message || 'This payment could not be matched to that order.');
    } finally {
      setClaiming('');
    }
  }

  function updateBankConfirmation(orderId, patch) {
    setBankConfirmations((current) => ({
      ...current,
      [orderId]: { ...current[orderId], ...patch },
    }));
  }

  async function confirmReportedPayment(order) {
    const confirmation = bankConfirmations[order.order_id];
    if (!confirmation?.amount || !confirmation?.receivedAt || !confirmation?.verified) return;

    setConfirmingUtr(order.order_id);
    setClaimError('');
    setClaimSuccess('');
    try {
      const istDateTime = confirmation.receivedAt.length === 16
        ? `${confirmation.receivedAt}:00+05:30`
        : `${confirmation.receivedAt}+05:30`;
      const receivedAt = new Date(istDateTime);
      if (!Number.isFinite(receivedAt.getTime())) {
        throw new Error('Enter a valid transfer date and time.');
      }
      await confirmReportedUtr(order.order_id, {
        amount: confirmation.amount.trim(),
        received_at: receivedAt.toISOString(),
        verified_in_bank: true,
      });
      setClaimSuccess(`UTR ${order.reportedUtr} was confirmed as a bank-app-verified payment for ${order.order_id}.`);
      setData((current) => current ? {
        ...current,
        pendingOrders: current.pendingOrders.filter((item) => item.order_id !== order.order_id),
      } : current);
      setBankConfirmations((current) => {
        const next = { ...current };
        delete next[order.order_id];
        return next;
      });
      try {
        setData(await getUnmatched({ page: 1, limit: 100 }));
      } catch {
        // Keep the successful confirmation reflected locally if refresh fails.
      }
    } catch (requestError) {
      setClaimError(requestError.message || 'This reported UTR could not be confirmed.');
    } finally {
      setConfirmingUtr('');
    }
  }

  async function clearReportedPayment(order) {
    const confirmed = window.confirm(
      `Remove the reported UTR for ${order.order_id}? The order will remain unpaid.`,
    );
    if (!confirmed) return;
    setClearingUtr(order.order_id);
    setClaimError('');
    setClaimSuccess('');
    try {
      await clearReportedUtr(order.order_id);
      setClaimSuccess(`UTR report cleared for ${order.order_id}. The order is still unpaid.`);
      setData((current) => current ? {
        ...current,
        pendingOrders: current.pendingOrders.map((item) => (
          item.order_id === order.order_id
            ? { ...item, reportedUtr: null, reportedUtrAt: null }
            : item
        )),
      } : current);
      setBankConfirmations((current) => {
        const next = { ...current };
        delete next[order.order_id];
        return next;
      });
    } catch (requestError) {
      setClaimError(requestError.message || 'This UTR report could not be cleared.');
    } finally {
      setClearingUtr('');
    }
  }

  const payments = data?.payments || [];
  const pendingOrders = data?.pendingOrders || [];
  const utrReports = pendingOrders.filter((order) => order.reportedUtr);

  return (
    <div className="page-enter space-y-6">
      <PageHeading
        eyebrow="Payment reconciliation"
        title="Needs matching"
        detail="Match incoming bank transfers by amount and payment window, or verify a reported customer UTR."
      />
      {claimSuccess && <Notice onClose={() => setClaimSuccess('')}>{claimSuccess}</Notice>}
      {claimError && <Notice tone="error" onClose={() => setClaimError('')}>{claimError}</Notice>}

      <Panel className="overflow-hidden">
        <PanelTitle
          title="Unmatched transfers"
          detail={data ? `${data.total} waiting for a matching order` : 'Review each transfer before matching'}
        />
        {loading ? (
          <TableLoading columns={4} />
        ) : error ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={() => setRetryKey((key) => key + 1)} />
          </div>
        ) : !payments.length ? (
          <EmptyState
            icon={CheckCircle2}
            title={utrReports.length ? 'No unmatched FamApp transfers' : 'All transfers matched'}
            detail={
              utrReports.length
                ? 'Customer UTR reports are listed below for direct bank account verification.'
                : 'All incoming customer transfers have been automatically matched and settled.'
            }
          />
        ) : (
          <div className="divide-y divide-[var(--pulse-line)]">
            {payments.map((payment) => {
              const candidates = pendingOrders.filter((order) => (
                orderFitsPayment(order, payment, data?.verificationGraceMs)
              ));
              const selected = selections[payment.id] || '';
              return (
                <article
                  key={payment.id}
                  className="grid gap-4 p-5 sm:p-6 sm:grid-cols-[minmax(180px,1fr)_minmax(280px,1.2fr)_auto] sm:items-center hover:bg-[var(--pulse-panel-2)] transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--pulse-warning)]/15 text-[var(--pulse-warning)]">
                        <ArrowDownRight className="h-4 w-4" />
                      </span>
                      <span className="font-[var(--font-display)] text-xl font-extrabold tracking-tight text-[var(--pulse-ink)] tabular-nums">
                        {formatMoney(payment.amount)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-[var(--pulse-mint)]">
                        UTR: {payment.utr || '—'}
                      </span>
                      {payment.utr && <CopyButton text={payment.utr} label="" />}
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--pulse-muted)]">
                      Received {formatDate(payment.receivedAt, { time: true })}
                    </p>
                  </div>

                  <div>
                    <label htmlFor={`match-${payment.id}`} className="pulse-eyebrow mb-1.5 block text-[10px]">
                      Choose matching order
                    </label>
                    <select
                      id={`match-${payment.id}`}
                      value={selected}
                      onChange={(event) => setSelections((current) => ({ ...current, [payment.id]: event.target.value }))}
                      className="h-11 w-full rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] px-3.5 text-xs text-[var(--pulse-ink)] outline-none focus:border-[var(--pulse-mint)] focus:ring-2 focus:ring-[var(--pulse-mint)]/20"
                    >
                      <option value="">{candidates.length ? 'Select an order to match' : 'No amount/time match found'}</option>
                      {candidates.map((order) => (
                        <option key={order.order_id} value={order.order_id}>
                          {order.receipt || order.order_id} · {formatMoney(order.payableAmount)}
                        </option>
                      ))}
                    </select>
                    {candidates.length === 0 && (
                      <p className="mt-1.5 text-[11px] leading-4 text-[var(--pulse-warning)]">
                        Order amount and IST transaction time must match within the 10-minute grace window.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!selected || claiming === payment.id}
                    onClick={() => claim(payment)}
                    className="btn-primary-pulse inline-flex min-h-[44px] items-center justify-center gap-2 px-5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {claiming === payment.id ? <Spinner small /> : <Link2 className="h-4 w-4" />}
                    <span>Match Payment</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      {utrReports.length > 0 && (
        <Panel className="overflow-hidden">
          <PanelTitle
            title="Customer UTR reports"
            detail={`${utrReports.length} reference${utrReports.length === 1 ? '' : 's'} awaiting bank verification or FamApp alert`}
          />
          <div className="divide-y divide-[var(--pulse-line)]">
            {utrReports.map((order) => (
              <article key={order.order_id} className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1.2fr)] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-[var(--font-display)] text-lg font-bold text-[var(--pulse-ink)]">
                      {formatMoney(order.payableAmount)}
                    </span>
                    <span className="text-xs text-[var(--pulse-muted)] font-medium">
                      ({order.receipt || 'No receipt reference'})
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[var(--pulse-mint)]">
                      Reported UTR: {order.reportedUtr}
                    </span>
                    <CopyButton text={order.reportedUtr} label="" />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-[var(--pulse-muted)]">
                      {order.order_id}
                    </span>
                    <CopyButton text={order.order_id} label="" />
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--pulse-muted)]">
                    Submitted {order.reportedUtrAt ? formatDate(order.reportedUtrAt, { time: true }) : 'recently'} · Pending verification
                  </p>
                </div>

                <form
                  className="space-y-3.5 rounded-2xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-4 sm:p-5"
                  onSubmit={(event) => { event.preventDefault(); confirmReportedPayment(order); }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--pulse-muted)]">
                      Amount shown in bank (₹)
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        maxLength={18}
                        required
                        value={bankConfirmations[order.order_id]?.amount || ''}
                        onChange={(event) => updateBankConfirmation(order.order_id, { amount: event.target.value })}
                        placeholder="0.00"
                        className="mt-1.5 h-10 w-full rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel)] px-3 text-xs text-[var(--pulse-ink)] outline-none focus:border-[var(--pulse-mint)] focus:ring-2 focus:ring-[var(--pulse-mint)]/20"
                      />
                    </label>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--pulse-muted)]">
                      Transfer time (IST)
                      <input
                        type="datetime-local"
                        step="60"
                        required
                        value={bankConfirmations[order.order_id]?.receivedAt || ''}
                        onChange={(event) => updateBankConfirmation(order.order_id, { receivedAt: event.target.value })}
                        className="mt-1.5 h-10 w-full rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel)] px-3 text-xs text-[var(--pulse-ink)] outline-none focus:border-[var(--pulse-mint)] focus:ring-2 focus:ring-[var(--pulse-mint)]/20"
                      />
                    </label>
                  </div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-[var(--pulse-ink-2)]">
                    <input
                      type="checkbox"
                      required
                      checked={Boolean(bankConfirmations[order.order_id]?.verified)}
                      onChange={(event) => updateBankConfirmation(order.order_id, { verified: event.target.checked })}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--pulse-mint)]"
                    />
                    <span>I personally verified this exact UTR and credited amount in my bank account.</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={confirmingUtr === order.order_id}
                      className="btn-primary-pulse inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 px-4 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {confirmingUtr === order.order_id ? <Spinner small /> : <ShieldCheck className="h-4 w-4" />}
                      <span>Confirm Bank Payment</span>
                    </button>
                    <button
                      type="button"
                      disabled={clearingUtr === order.order_id}
                      onClick={() => clearReportedPayment(order)}
                      className="min-h-[42px] rounded-xl border border-[var(--pulse-critical)]/30 bg-transparent px-4 text-xs font-bold text-[var(--pulse-critical)] hover:bg-[var(--pulse-critical)]/10 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {clearingUtr === order.order_id ? 'Clearing…' : 'Clear UTR'}
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
          <div className="border-t border-[var(--pulse-line)] px-5 sm:px-6 py-3.5 text-xs text-[var(--pulse-muted)] leading-relaxed">
            Confirm only after checking the UTR, exact amount, and transfer time in your bank or UPI account. PopPay records this as merchant-verified.
          </div>
        </Panel>
      )}
      {data && data.payments?.length > 0 && (
        <p className="flex items-center gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span>A successful match confirms the order and triggers your configured webhook.</span>
        </p>
      )}
    </div>
  );
}

function SettingsCard({ title, detail, icon: Icon, children }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 dark:border-white/10 px-5 sm:px-6 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{detail}</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </Panel>
  );
}

function WebhookLogList({ logs, loading, error, retryLog, retrying }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((item) => <div key={item} className="skeleton h-16 rounded-xl" />)}
      </div>
    );
  }
  if (error) return <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>;
  if (!logs.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        No webhook deliveries have been recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {logs.map((log) => {
        const logId = log._id || log.id;
        const succeeded = Number(log.responseStatus) >= 200 && Number(log.responseStatus) < 300;
        return (
          <details key={logId} className="group rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[.02] overflow-hidden">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-3.5 hover:bg-slate-100/60 dark:hover:bg-white/[.04] transition">
              <span className={`h-2 w-2 rounded-full ${succeeded ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="min-w-[120px] flex-1 font-mono text-xs font-bold text-slate-900 dark:text-white">{log.orderId}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(log.updatedAt || log.createdAt, { time: true })}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                succeeded
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
              }`}>
                {log.responseStatus || 'QUEUED'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{log.attempts ?? 0} attempts</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold group-open:hidden">Details</span>
            </summary>
            <div className="border-t border-slate-200/80 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-[#12201b]/50">
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Next retry</p>
                  <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{formatDate(log.nextRetryAt, { time: true })}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Attempts recorded</p>
                  <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{log.attemptHistory?.length || 0}</p>
                </div>
              </div>
              {log.attemptHistory?.length > 0 && (
                <div className="space-y-1 rounded-xl bg-slate-50 dark:bg-white/[.02] p-2.5 text-[11px]">
                  {log.attemptHistory.map((attempt, index) => (
                    <p key={`${attempt.attemptedAt}-${index}`} className="text-slate-600 dark:text-slate-300">
                      {formatDate(attempt.attemptedAt, { time: true })} · Status {attempt.responseStatus || 'No response'}
                    </p>
                  ))}
                </div>
              )}
              <pre className="max-h-44 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
              <button
                type="button"
                disabled={retrying === logId}
                onClick={() => retryLog(logId)}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                {retrying === logId ? <Spinner small /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>Retry Delivery</span>
              </button>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export function SettingsPage() {
  const { merchant, setMerchant, refreshMerchant } = useMerchant();
  const [upiId, setUpiId] = useState(merchant.upiId || '');
  const [senders, setSenders] = useState(merchant.allowedSenders || []);
  const [senderInput, setSenderInput] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(merchant.webhookUrl || '');
  const [busy, setBusy] = useState('');
  const [fetchingGmail, setFetchingGmail] = useState(false);
  const [gmailFetchResult, setGmailFetchResult] = useState(null);
  const [message, setMessage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [retrying, setRetrying] = useState('');
  const [rotateOpen, setRotateOpen] = useState(false);

  const [profileName, setProfileName] = useState(merchant.name || '');
  const [currPassword, setCurrPassword] = useState('');
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');

  useEffect(() => {
    setProfileName(merchant.name || '');
    setUpiId(merchant.upiId || '');
    setSenders(merchant.allowedSenders || []);
    setWebhookUrl(merchant.webhookUrl || '');
  }, [merchant]);

  async function saveProfile(event) {
    event.preventDefault();
    setBusy('profile'); setMessage(null);
    try {
      const result = await updateProfile({ name: profileName.trim() });
      setMerchant((current) => ({ ...current, name: result.name }));
      setMessage({ tone: 'success', text: 'Merchant profile name updated.' });
    } catch (error) {
      setMessage({ tone: 'error', text: error.message || 'Could not update profile.' });
    } finally {
      setBusy('');
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    if (newPasswordVal.length < 8) {
      setMessage({ tone: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setMessage({ tone: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setBusy('password'); setMessage(null);
    try {
      await changePassword({ currentPassword: currPassword, newPassword: newPasswordVal });
      setMessage({ tone: 'success', text: 'Password changed successfully.' });
      setCurrPassword('');
      setNewPasswordVal('');
      setConfirmPasswordVal('');
    } catch (error) {
      setMessage({ tone: 'error', text: error.message || 'Could not change password.' });
    } finally {
      setBusy('');
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    setLogsError('');
    try {
      const result = await getWebhookLogs();
      setLogs(result.logs || []);
    } catch (error) {
      setLogsError(error.message || 'Webhook history could not be loaded.');
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, []);

  async function saveUpi(event) {
    event.preventDefault();
    setBusy('upi'); setMessage(null);
    try {
      const result = await updateUpi(upiId.trim());
      setMerchant((current) => ({ ...current, upiId: result.upiId }));
      setMessage({ tone: 'success', text: 'Receiving UPI ID updated.' });
    } catch (error) { setMessage({ tone: 'error', text: error.message || 'Could not update your UPI ID.' }); }
    finally { setBusy(''); }
  }

  async function connectGmail() {
    setBusy('gmail'); setMessage(null);
    try {
      const result = await getGmailConnectUrl();
      const destination = new URL(result.url, window.location.origin);
      if (destination.protocol !== 'https:' && destination.origin !== window.location.origin) throw new Error('The Gmail connection URL was not secure.');
      window.location.assign(destination.href);
    } catch (error) { setMessage({ tone: 'error', text: error.message || 'Could not start Gmail connection.' }); setBusy(''); }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect Gmail? PopPay will stop checking payment notifications from this inbox.')) return;
    setBusy('gmail'); setMessage(null);
    try {
      await disconnectGmail();
      await refreshMerchant();
      setMessage({ tone: 'success', text: 'Gmail disconnected. The stored authorization token has been removed.' });
    } catch (error) { setMessage({ tone: 'error', text: error.message || 'Could not disconnect Gmail.' }); }
    finally { setBusy(''); }
  }

  async function fetchLatestEmails() {
    setFetchingGmail(true);
    setGmailFetchResult(null);
    setMessage(null);
    try {
      const result = await fetchLatestGmailEmails();
      setGmailFetchResult(result);
      setMessage({
        tone: result.failed ? 'warning' : 'success',
        text: `Checked ${result.fetched} ${result.fetched === 1 ? 'email' : 'emails'}: ${result.matched} confirmed, ${result.unmatched} need matching, ${result.skipped} skipped${result.failed ? `, ${result.failed} need retry` : ''}.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: error.message || 'Could not fetch Gmail payment emails.' });
    } finally {
      setFetchingGmail(false);
    }
  }

  function addSender(event) {
    event.preventDefault();
    const value = senderInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setMessage({ tone: 'error', text: 'Enter a valid sender email address.' });
      return;
    }
    if (senders.includes(value)) {
      setMessage({ tone: 'warning', text: 'That sender is already on the list.' });
      return;
    }
    if (senders.length >= 10) {
      setMessage({ tone: 'warning', text: 'You can allow up to 10 sender addresses.' });
      return;
    }
    setSenders((current) => [...current, value]);
    setSenderInput('');
    setMessage(null);
  }

  async function saveSenders() {
    if (!senders.length) {
      setMessage({ tone: 'error', text: 'Keep at least one allowed sender.' });
      return;
    }
    setBusy('senders'); setMessage(null);
    try {
      const result = await updateAllowedSenders(senders);
      setSenders(result.allowedSenders);
      setMerchant((current) => ({ ...current, allowedSenders: result.allowedSenders }));
      setMessage({ tone: 'success', text: 'Allowed sender list saved.' });
    } catch (error) { setMessage({ tone: 'error', text: error.message || 'Could not save allowed senders.' }); }
    finally { setBusy(''); }
  }

  async function saveWebhook(event) {
    event.preventDefault();
    setBusy('webhook'); setMessage(null);
    try {
      const result = await updateWebhook(webhookUrl.trim());
      setWebhookUrl(result.webhookUrl || '');
      setMerchant((current) => ({ ...current, webhookUrl: result.webhookUrl }));
      setMessage({ tone: 'success', text: 'Webhook destination saved.' });
    } catch (error) { setMessage({ tone: 'error', text: error.message || 'Could not save webhook destination.' }); }
    finally { setBusy(''); }
  }

  async function rotateKeys() {
    setBusy('rotate'); setMessage(null);
    try {
      const result = await regenerateKeys();
      queueCredentials(result.credentials);
      await refreshMerchant();
      setMessage({ tone: 'success', text: 'New credentials are ready. Save them from the one-time credentials window.' });
      setRotateOpen(false);
    } catch (error) { setMessage({ tone: 'error', text: error.message || 'Could not rotate credentials.' }); }
    finally { setBusy(''); }
  }

  async function retryLog(id) {
    setRetrying(id);
    setMessage(null);
    try {
      await retryWebhook(id);
      await loadLogs();
      setMessage({ tone: 'success', text: 'Webhook delivery queued for retry.' });
    } catch (error) { setMessage({ tone: 'error', text: error.message || 'Could not queue webhook retry.' }); }
    finally { setRetrying(''); }
  }

  return (
    <div className="page-enter space-y-6">
      <PageHeading
        eyebrow="Merchant controls"
        title="Settings"
        detail="Manage settlement UPI handles, Gmail listener synchronization, webhooks, and cryptographic keys."
      />
      {message && <Notice tone={message.tone} onClose={() => setMessage(null)}>{message.text}</Notice>}

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard title="Merchant Profile" detail="Update your merchant account display name and details." icon={Store}>
          <form onSubmit={saveProfile} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Display Name</span>
              <input
                required
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Business or Store Name"
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{merchant.email}</p>
                {merchant.role === 'admin' && (
                  <span className="mt-1 inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    SUPER ADMIN
                  </span>
                )}
              </div>
              <button
                disabled={busy === 'profile'}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                {busy === 'profile' ? <Spinner small /> : <Check className="h-4 w-4" />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard title="Security & Password" detail="Change your merchant account login password." icon={KeyRound}>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="password"
                required
                value={currPassword}
                onChange={(e) => setCurrPassword(e.target.value)}
                placeholder="Current Password"
                className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <input
                type="password"
                required
                minLength="8"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                placeholder="New (min 8 chars)"
                className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <input
                type="password"
                required
                minLength="8"
                value={confirmPasswordVal}
                onChange={(e) => setConfirmPasswordVal(e.target.value)}
                placeholder="Confirm New"
                className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div className="flex items-center justify-end pt-1">
              <button
                disabled={busy === 'password'}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                {busy === 'password' ? <Spinner small /> : <Check className="h-4 w-4" />}
                <span>Change Password</span>
              </button>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard title="Receiving account" detail="Direct bank settlements occur instantly to this UPI VPA." icon={Store}>
          <form onSubmit={saveUpi} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Merchant UPI ID (VPA)</span>
              <input
                required
                minLength="4"
                maxLength="320"
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                placeholder="business@fam / merchant@okhdfcbank"
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3.5 font-mono text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">All customer QR codes and payment intents route funds here.</p>
              <button
                disabled={busy === 'upi'}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                {busy === 'upi' ? <Spinner small /> : <Check className="h-4 w-4" />}
                <span>Save UPI ID</span>
              </button>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard title="Storefront branding" detail="Customize your shop name, logo, and checkout theme color." icon={Palette}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{merchant.branding?.displayName || merchant.name}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{merchant.branding?.tagline || 'Direct UPI checkout active'}</p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: merchant.branding?.brandColor || '#10b981' }} />
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">{merchant.branding?.brandColor || '#10b981'}</span>
              </div>
            </div>
            <Link
              to="/branding"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white transition active:scale-95 shadow-2xs"
            >
              <Palette className="h-4 w-4" />
              <span>Customize Checkout</span>
            </Link>
          </div>
        </SettingsCard>

        <SettingsCard title="Gmail payment inbox" detail="Listen for verified FamApp bank notifications for instant order clearance." icon={Mail}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
              merchant.gmail?.connected
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-100 dark:bg-white/[.04] text-slate-400'
            }`}>
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {merchant.gmail?.connected ? 'Inbox Connected' : 'Not Connected'}
                </p>
                {merchant.gmail?.connected && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">
                {merchant.gmail?.email || 'Connect the Google inbox that receives FamApp credit alerts.'}
              </p>
            </div>
            {merchant.gmail?.connected ? (
              <button
                type="button"
                disabled={busy === 'gmail'}
                onClick={disconnect}
                className="min-h-[42px] rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-transparent px-4 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition active:scale-95 disabled:opacity-50"
              >
                {busy === 'gmail' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy === 'gmail'}
                onClick={connectGmail}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white transition active:scale-95 shadow-2xs disabled:opacity-50"
              >
                {busy === 'gmail' ? <Spinner small /> : <ExternalLink className="h-4 w-4" />}
                <span>Connect Gmail</span>
              </button>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[.02] p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            PopPay inspects DKIM signatures cryptographically. Only bank transfer notifications from whitelisted senders are processed.
          </div>
          {merchant.gmail?.connected && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Fetch and test-verify the 2 latest credit alert emails right now.
                </p>
                <button
                  type="button"
                  onClick={fetchLatestEmails}
                  disabled={fetchingGmail || !merchant.allowedSenders?.length}
                  className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-2xs"
                >
                  {fetchingGmail ? <Spinner small /> : <RefreshCw className={`h-3.5 w-3.5 ${fetchingGmail ? 'animate-spin' : ''}`} />}
                  <span>{fetchingGmail ? 'Syncing…' : 'Sync Latest Emails'}</span>
                </button>
              </div>
              {!merchant.allowedSenders?.length && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Add and save an allowed FamApp sender below to enable synchronization.
                </p>
              )}
              {gmailFetchResult?.unmatched > 0 && (
                <Link to="/unmatched" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                  <span>Review unmatched transfers ({gmailFetchResult.unmatched})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          )}
        </SettingsCard>

        <SettingsCard title="Allowed Senders" detail="Cryptographic whitelist: only notifications from these addresses trigger automated matching." icon={ShieldCheck}>
          <div className="mb-4 flex flex-wrap gap-2">
            {senders.map((sender) => (
              <span key={sender} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[.04] py-1.5 pl-3 pr-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                <span className="truncate max-w-[220px]">{sender}</span>
                <button
                  type="button"
                  onClick={() => setSenders((current) => current.filter((value) => value !== sender))}
                  aria-label={`Remove ${sender}`}
                  className="grid h-5 w-5 place-items-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {!senders.length && (
              <p className="text-xs text-amber-600 dark:text-amber-400">No senders added yet. Add at least one before saving.</p>
            )}
          </div>
          <form onSubmit={addSender} className="flex flex-col gap-2.5 sm:flex-row">
            <input
              type="email"
              value={senderInput}
              onChange={(event) => setSenderInput(event.target.value)}
              maxLength="254"
              placeholder="alerts@famapp.in"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3.5 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="submit"
              disabled={!senderInput.trim() || senders.length >= 10}
              className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.04] px-4 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[.08] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              <span>Add Sender</span>
            </button>
          </form>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={saveSenders}
              disabled={busy === 'senders'}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-2xs"
            >
              {busy === 'senders' ? <Spinner small /> : <Check className="h-4 w-4" />}
              <span>Save Allowed Senders</span>
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title="Webhook destination" detail="Receive signed payment.success HTTP POST notifications when an order is verified." icon={Webhook}>
          <form onSubmit={saveWebhook} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">HTTPS Webhook Endpoint</span>
              <input
                type="url"
                required
                pattern="https://.*"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://yourdomain.com/api/poppay/webhook"
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-3.5 font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Payloads are signed with HMAC-SHA256 in the x-poppay-signature header.</p>
              <button
                disabled={busy === 'webhook'}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                {busy === 'webhook' ? <Spinner small /> : <Check className="h-4 w-4" />}
                <span>Save Webhook</span>
              </button>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard title="API credentials" detail="Your public key identifies your business. Secret values are never retrievable." icon={KeyRound}>
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[.02] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Public Key</p>
              <CopyButton text={merchant.publicKey} label="Copy" />
            </div>
            <code className="mt-2 block break-all font-mono text-xs font-bold text-slate-900 dark:text-emerald-300">
              {merchant.publicKey || 'Not available'}
            </code>
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Rotate all credentials</p>
              <p className="mt-0.5 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Invalidates your current Secret Key, Webhook Secret, and Signing Secret immediately.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRotateOpen(true)}
              className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 text-xs font-bold text-amber-800 dark:text-amber-300 transition active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Rotate Keys</span>
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title="Webhook attempts" detail="Recent deliveries, response codes, and automatic exponential backoff retries." icon={Activity}>
          <WebhookLogList logs={logs} loading={logsLoading} error={logsError} retryLog={retryLog} retrying={retrying} />
          {!logsLoading && !logsError && (
            <button
              type="button"
              onClick={loadLogs}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh attempts ledger</span>
            </button>
          )}
        </SettingsCard>
      </div>

      {rotateOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="rotate-title" className="w-full max-w-[480px] rounded-t-[26px] bg-white dark:bg-[#0e1714] border border-slate-200 dark:border-white/10 p-6 shadow-2xl sm:rounded-[26px]">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 id="rotate-title" className="font-[var(--font-display)] text-xl font-bold text-slate-900 dark:text-white">
              Rotate All API Credentials?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Your existing Secret Key, Webhook Secret, and Signing Secret will be permanently revoked. You will be given one-time access to copy the new set.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRotateOpen(false)}
                className="min-h-[42px] rounded-xl border border-slate-200 dark:border-white/10 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === 'rotate'}
                onClick={rotateKeys}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 text-xs font-bold text-white shadow-2xs transition active:scale-95 disabled:opacity-50"
              >
                {busy === 'rotate' ? <Spinner small /> : <RefreshCw className="h-4 w-4" />}
                <span>Confirm & Revoke Old Keys</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const BRAND_PALETTES = [
  { label: 'Forest Emerald', hex: '#126b58' },
  { label: 'Razorpay Navy', hex: '#0c2340' },
  { label: 'Electric Blue', hex: '#2563eb' },
  { label: 'Royal Purple', hex: '#7c3aed' },
  { label: 'Mint Green', hex: '#059669' },
  { label: 'Tangerine Sun', hex: '#ea580c' },
  { label: 'Vibrant Crimson', hex: '#e11d48' },
  { label: 'Midnight Slate', hex: '#1e293b' },
  { label: 'Cyber Pink', hex: '#db2777' },
  { label: 'Neon Teal', hex: '#0d9488' },
  { label: 'Sunset Gold', hex: '#d97706' },
  { label: 'Indigo Glow', hex: '#4f46e5' },
  { label: 'Obsidian Dark', hex: '#18181b' },
  { label: 'Coral Rose', hex: '#f43f5e' },
  { label: 'Deep Cyan', hex: '#0891b2' },
  { label: 'Violet Night', hex: '#6d28d9' },
];

export function BrandingPage() {
  const { merchant, refreshMerchant, setMerchant } = useMerchant();
  const [displayName, setDisplayName] = useState(merchant?.branding?.displayName || merchant?.name || '');
  const [brandColor, setBrandColor] = useState(merchant?.branding?.brandColor || '#126b58');
  const [checkoutTheme, setCheckoutTheme] = useState(merchant?.branding?.checkoutTheme || 'light');
  const [checkoutLayout, setCheckoutLayout] = useState(merchant?.branding?.checkoutLayout || 'classic');
  const [bannerUrl, setBannerUrl] = useState(merchant?.branding?.bannerUrl || '');
  const [hostedBy, setHostedBy] = useState(merchant?.branding?.hostedBy || '');
  const [hostAvatarUrl, setHostAvatarUrl] = useState(merchant?.branding?.hostAvatarUrl || '');
  const [hostBadge, setHostBadge] = useState(merchant?.branding?.hostBadge || '');
  const [enablePromoBanner, setEnablePromoBanner] = useState(Boolean(merchant?.branding?.enablePromoBanner));
  const [promoBannerUrl, setPromoBannerUrl] = useState(merchant?.branding?.promoBannerUrl || '');
  const [promoLink, setPromoLink] = useState(merchant?.branding?.promoLink || '');
  const [promoClaimText, setPromoClaimText] = useState(merchant?.branding?.promoClaimText || 'CLAIM NOW');
  const [guaranteeText, setGuaranteeText] = useState(merchant?.branding?.guaranteeText || 'Instant Verification Guaranteed');
  const [trustNotice, setTrustNotice] = useState(merchant?.branding?.trustNotice || '');
  const [logoUrl, setLogoUrl] = useState(merchant?.branding?.logoUrl || '');
  const [tagline, setTagline] = useState(merchant?.branding?.tagline || '');
  const [supportEmail, setSupportEmail] = useState(merchant?.branding?.supportEmail || '');
  const [previewDevice, setPreviewDevice] = useState('mobile');
  const [previewTheme, setPreviewTheme] = useState(merchant?.branding?.checkoutTheme === 'dark' ? 'dark' : 'light');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (merchant) {
      setDisplayName(merchant.branding?.displayName || merchant.name || '');
      setBrandColor(merchant.branding?.brandColor || '#126b58');
      setCheckoutTheme(merchant.branding?.checkoutTheme || 'light');
      setPreviewTheme(merchant.branding?.checkoutTheme === 'dark' ? 'dark' : 'light');
      setCheckoutLayout(merchant.branding?.checkoutLayout || 'classic');
      setBannerUrl(merchant.branding?.bannerUrl || '');
      setHostedBy(merchant.branding?.hostedBy || '');
      setHostAvatarUrl(merchant.branding?.hostAvatarUrl || '');
      setHostBadge(merchant.branding?.hostBadge || '');
      setEnablePromoBanner(Boolean(merchant.branding?.enablePromoBanner));
      setPromoBannerUrl(merchant.branding?.promoBannerUrl || '');
      setPromoLink(merchant.branding?.promoLink || '');
      setPromoClaimText(merchant.branding?.promoClaimText || 'CLAIM NOW');
      setGuaranteeText(merchant.branding?.guaranteeText || 'Instant Verification Guaranteed');
      setTrustNotice(merchant.branding?.trustNotice || '');
      setLogoUrl(merchant.branding?.logoUrl || '');
      setTagline(merchant.branding?.tagline || '');
      setSupportEmail(merchant.branding?.supportEmail || '');
    }
  }, [merchant]);

  function randomizeColor() {
    const randomHex = BRAND_PALETTES[Math.floor(Math.random() * BRAND_PALETTES.length)].hex;
    setBrandColor(randomHex);
  }

  async function saveBranding(e) {
    e?.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        name: displayName.trim() || merchant.name,
        displayName: displayName.trim() || merchant.name,
        brandColor,
        checkoutTheme,
        checkoutLayout,
        bannerUrl: bannerUrl.trim() || null,
        hostedBy: hostedBy.trim() || null,
        hostAvatarUrl: hostAvatarUrl.trim() || null,
        hostBadge: hostBadge.trim() || null,
        enablePromoBanner,
        promoBannerUrl: promoBannerUrl.trim() || null,
        promoLink: promoLink.trim() || null,
        promoClaimText: promoClaimText.trim() || 'CLAIM NOW',
        guaranteeText: guaranteeText.trim() || 'Instant Verification Guaranteed',
        trustNotice: trustNotice.trim() || null,
        logoUrl: logoUrl.trim() || null,
        tagline: tagline.trim() || null,
        supportEmail: supportEmail.trim() || null,
      };
      const res = await updateBranding(payload);
      if (refreshMerchant) await refreshMerchant();
      else if (setMerchant) setMerchant((curr) => ({ ...curr, ...res }));
      setMessage({ tone: 'success', text: 'Checkout look, layout and branding successfully saved!' });
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Could not save branding settings.' });
    } finally {
      setBusy(false);
    }
  }

  function resetDefaults() {
    setDisplayName(merchant?.name || 'My Store');
    setBrandColor('#126b58');
    setCheckoutLayout('classic');
    setBannerUrl('');
    setHostedBy('');
    setHostAvatarUrl('');
    setHostBadge('');
    setEnablePromoBanner(false);
    setPromoBannerUrl('');
    setPromoLink('');
    setPromoClaimText('CLAIM NOW');
    setGuaranteeText('Instant Verification Guaranteed');
    setTrustNotice('');
    setLogoUrl('');
    setTagline('Direct & Secure UPI Transfer');
    setSupportEmail('');
    setMessage({ tone: 'info', text: 'Reset to standard defaults. Click Save changes to apply.' });
  }

  const effectiveShopName = displayName.trim() || merchant?.name || 'Your Brand';
  const initialLetter = effectiveShopName.trim().charAt(0).toUpperCase() || 'M';
  const isDark = previewTheme === 'dark';

  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Customization · Razorpay Style"
        title="Checkout & Branding"
        detail="Personalize your storefront name, brand color, logo, and checkout look. Preview your changes in real-time exactly as customers will experience them."
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.04] px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition hover:bg-slate-50 dark:hover:bg-white/[.08]"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Reset defaults</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={saveBranding}
              style={{ backgroundColor: brandColor }}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl px-5 text-xs font-bold text-white shadow-2xs transition hover:opacity-95 active:scale-95 disabled:opacity-50"
            >
              {busy ? <Spinner small /> : <Check className="h-3.5 w-3.5" />}
              <span>{busy ? 'Saving…' : 'Save changes'}</span>
            </button>
          </div>
        }
      />

      {message && (
        <div className="mb-6">
          <Notice tone={message.tone} onClose={() => setMessage(null)}>
            {message.text}
          </Notice>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px]">
        {/* Left Column: Customizer Form */}
        <div className="space-y-6">
          <Panel>
            <PanelTitle
              title="Storefront identity"
              detail="This name and logo appear at the top of your checkout and UPI payment prompts."
            />
            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#436458]">
                  Shop / Business Name
                </label>
                <div className="relative mt-2">
                  <input
                    type="text"
                    required
                    maxLength="120"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Acme Studio, Sharma Collections"
                    className="h-11 w-full rounded-xl border border-[#dce5dc] bg-white px-3.5 text-sm font-semibold text-[#142e2b] outline-none transition focus:border-[#5b9b7b] focus:ring-4 focus:ring-[#126b58]/10"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#7d8e85]">
                  Shown on customer order receipts, pay page, and UPI payee title.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#436458]">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  maxLength="200"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Instant & Secure UPI Payment, Official Store"
                  className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] bg-white px-3.5 text-sm text-[#142e2b] outline-none transition focus:border-[#5b9b7b] focus:ring-4 focus:ring-[#126b58]/10"
                />
                <p className="mt-1.5 text-[11px] text-[#7d8e85]">
                  A short reassurance badge displayed directly beneath your store name.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#436458]">
                  Store Logo URL
                </label>
                <div className="mt-2 flex gap-3">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://yourdomain.com/logo.png"
                    className="h-11 flex-1 rounded-xl border border-[#dce5dc] bg-white px-3.5 font-mono text-xs text-[#294b40] outline-none transition focus:border-[#5b9b7b] focus:ring-4 focus:ring-[#126b58]/10"
                  />
                  {logoUrl ? (
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#dce5dc] bg-white p-1">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-[var(--font-display)] text-sm font-bold border border-black/5"
                    >
                      {initialLetter}
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-[#7d8e85]">
                  Leave empty to automatically display a stylish monogram avatar using your shop initials.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#436458]">
                  Customer Support Email
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="e.g. support@mystore.com"
                  className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] bg-white px-3.5 text-sm text-[#142e2b] outline-none transition focus:border-[#5b9b7b] focus:ring-4 focus:ring-[#126b58]/10"
                />
                <p className="mt-1.5 text-[11px] text-[#7d8e85]">
                  Optional email link displayed in the checkout footer for customer inquiries.
                </p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              title="Brand theme color & appearance"
              detail="Select a signature color for buttons, highlights, and configure your checkout theme appearance."
            />
            <div className="space-y-6 p-5 sm:p-6">
              {/* Checkout Theme Appearance Selector */}
              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                  Checkout Theme Appearance
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'light', label: 'Light Theme', icon: Sun, detail: 'Clean ivory & white' },
                    { id: 'dark', label: 'Dark Theme', icon: Moon, detail: 'OLED obsidian & neon' },
                    { id: 'auto', label: 'Auto (System)', icon: Sparkles, detail: 'Matches device' },
                  ].map((mode) => {
                    const active = checkoutTheme === mode.id;
                    const ModeIcon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setCheckoutTheme(mode.id);
                          if (mode.id !== 'auto') setPreviewTheme(mode.id);
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
                          active
                            ? 'border-[#126b58] bg-[#f0f6f2] dark:bg-[#152e25] dark:border-[#34d399] shadow-sm ring-2 ring-[#126b58]/20'
                            : 'border-[#e2e8e0] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] text-[#697f74] hover:border-[#ccd7cb]'
                        }`}
                      >
                        <ModeIcon className={`h-4 w-4 ${active ? 'text-[#126b58] dark:text-[#34d399]' : 'text-[#82968c]'}`} />
                        <span className={`text-xs font-bold ${active ? 'text-[#142e2b] dark:text-[#eaf3ee]' : 'text-[#697f74] dark:text-[#8ea299]'}`}>
                          {mode.label}
                        </span>
                        <span className="text-[10px] text-[#84968c] dark:text-[#71857c] hidden sm:inline">{mode.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preset Palettes */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                    Preset Palettes
                  </p>
                  <button
                    type="button"
                    onClick={randomizeColor}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-2.5 py-1 text-[11px] font-bold text-[#126b58] dark:text-[#34d399] hover:bg-[#edf4ec] transition shadow-2xs"
                  >
                    <Sparkles className="h-3 w-3" />
                    Shuffle Color
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {BRAND_PALETTES.map((palette) => {
                    const active = brandColor.toLowerCase() === palette.hex.toLowerCase();
                    return (
                      <button
                        key={palette.hex}
                        type="button"
                        onClick={() => setBrandColor(palette.hex)}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition ${
                          active
                            ? 'border-[#126b58] bg-[#f0f6f2] dark:bg-[#152e25] dark:border-[#34d399] shadow-sm ring-2 ring-[#126b58]/20'
                            : 'border-[#e2e8e0] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] hover:border-[#ccd7cb]'
                        }`}
                      >
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border border-black/15 shadow-xs"
                          style={{ backgroundColor: palette.hex }}
                        />
                        <span className="truncate text-xs font-semibold text-[#1e3b33] dark:text-[#dce7e1]">{palette.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Freedom */}
              <div className="pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                  Any Custom Brand Color (Hex / Color Picker)
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="relative flex h-11 items-center gap-2.5 rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3 shadow-xs">
                    <input
                      type="color"
                      value={brandColor.startsWith('#') && brandColor.length === 7 ? brandColor : '#126b58'}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      maxLength="7"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-24 font-mono text-sm font-bold uppercase text-[#1c3831] dark:text-[#eaf3ee] outline-none bg-transparent"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px] rounded-xl bg-[#f7f9f5] dark:bg-[#13201d] px-3.5 py-2.5 text-[11px] text-[#697f74] dark:text-[#8ea299] border border-[#e5ebe2] dark:border-[#1c2e29]">
                    Choose ANY custom color hex code. Your checkout buttons, highlights and QR glows will dynamically adopt this color.
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveBranding}
                  style={{ backgroundColor: brandColor }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-95 disabled:opacity-50"
                >
                  {busy ? <Spinner small /> : <Check className="h-4 w-4" />}
                  {busy ? 'Saving changes…' : 'Save branding'}
                </button>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              title="Checkout UI Style & Creator Mode"
              detail="Choose between Classic Pulse or the Gaming & Creator Banner UI with top tournament graphics, creator badges, and promo cards."
            />
            <div className="space-y-6 p-5 sm:p-6">
              {/* Layout Switcher */}
              <div>
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                  Checkout Layout Style
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutLayout('classic')}
                    className={`flex flex-col items-start p-4 rounded-xl border text-left transition ${
                      checkoutLayout === 'classic'
                        ? 'border-[#126b58] bg-[#f0f6f2] dark:bg-[#152e25] dark:border-[#34d399] shadow-sm ring-2 ring-[#126b58]/20'
                        : 'border-[#e2e8e0] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] text-[#697f74] hover:border-[#ccd7cb]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-[#142e2b] dark:text-[#eaf3ee]">
                      <LayoutTemplate className="h-4 w-4 text-[#126b58] dark:text-[#34d399]" />
                      <span>Classic Pulse (Normal)</span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#71857c] dark:text-[#8ea299]">
                      Clean, minimalist fintech card. Best for standard SaaS, eCommerce, and general invoices.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCheckoutLayout('banner')}
                    className={`flex flex-col items-start p-4 rounded-xl border text-left transition ${
                      checkoutLayout === 'banner'
                        ? 'border-[#126b58] bg-[#f0f6f2] dark:bg-[#152e25] dark:border-[#34d399] shadow-sm ring-2 ring-[#126b58]/20'
                        : 'border-[#e2e8e0] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] text-[#697f74] hover:border-[#ccd7cb]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-[#142e2b] dark:text-[#eaf3ee]">
                      <Flame className="h-4 w-4 text-[#ff3d81]" />
                      <span>Gaming & Creator Pro (Banner UI)</span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#71857c] dark:text-[#8ea299]">
                      Top game/tournament hero banner, "Hosted by" badge, promo reward card & fast UPI app pills.
                    </p>
                  </button>
                </div>
              </div>

              {/* Creator & Banner Customization Options */}
              {checkoutLayout === 'banner' && (
                <div className="space-y-5 rounded-2xl border border-[#dce6dc] dark:border-[#1d2f2a] bg-[#f7faf6] dark:bg-[#111e1a] p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#126b58] dark:text-[#34d399] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Banner & Host Customization
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBannerUrl('https://images.mintgram.live/1792383026477.png');
                        setHostedBy('Ujjwal Gaming');
                        setHostBadge('65');
                        setEnablePromoBanner(true);
                        setPromoClaimText('CLAIM NOW');
                      }}
                      className="text-[11px] font-bold text-[#126b58] dark:text-[#34d399] hover:underline"
                    >
                      Fill Minecraft Preset
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                      Top Hero Banner Image URL
                    </label>
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://example.com/banner.png or leave empty for default banner"
                      className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3.5 text-xs font-mono text-[#294b40] dark:text-[#eaf3ee] outline-none transition focus:border-[#5b9b7b] focus:ring-4 focus:ring-[#126b58]/10"
                    />
                    <p className="mt-1.5 text-[11px] text-[#7d8e85]">
                      High-impact header banner (e.g. tournament, product or game graphic).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                        Hosted By Name
                      </label>
                      <input
                        type="text"
                        maxLength="120"
                        value={hostedBy}
                        onChange={(e) => setHostedBy(e.target.value)}
                        placeholder="e.g. Ujjwal Gaming"
                        className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3.5 text-xs text-[#294b40] dark:text-[#eaf3ee] outline-none transition focus:border-[#5b9b7b]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                        Host Avatar URL
                      </label>
                      <input
                        type="url"
                        value={hostAvatarUrl}
                        onChange={(e) => setHostAvatarUrl(e.target.value)}
                        placeholder="https://.../avatar.png"
                        className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3.5 text-xs font-mono text-[#294b40] dark:text-[#eaf3ee] outline-none transition focus:border-[#5b9b7b]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                        Host Level / Badge
                      </label>
                      <input
                        type="text"
                        maxLength="30"
                        value={hostBadge}
                        onChange={(e) => setHostBadge(e.target.value)}
                        placeholder="e.g. 65 or PRO"
                        className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3.5 text-xs text-[#294b40] dark:text-[#eaf3ee] outline-none transition focus:border-[#5b9b7b]"
                      />
                    </div>
                  </div>

                  {/* Promo Banner Card Toggle */}
                  <div className="pt-2 border-t border-[#dce5dc] dark:border-[#1d2f2a]">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enablePromoBanner}
                        onChange={(e) => setEnablePromoBanner(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#126b58] focus:ring-[#126b58]"
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                        Enable Promotional Reward / Offer Banner
                      </span>
                    </label>

                    {enablePromoBanner && (
                      <div className="mt-3.5 space-y-3 pl-6">
                        <div>
                          <label className="block text-[11px] font-bold text-[#5a7167] dark:text-[#a1b8ae]">
                            Promo Banner Artwork URL (Optional)
                          </label>
                          <input
                            type="url"
                            value={promoBannerUrl}
                            onChange={(e) => setPromoBannerUrl(e.target.value)}
                            placeholder="Leave empty to use built-in 50% Off reward card"
                            className="mt-1 h-10 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3 text-xs font-mono text-[#294b40] dark:text-[#eaf3ee] outline-none focus:border-[#5b9b7b]"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#5a7167] dark:text-[#a1b8ae]">
                              Promo Target URL
                            </label>
                            <input
                              type="url"
                              value={promoLink}
                              onChange={(e) => setPromoLink(e.target.value)}
                              placeholder="https://myshop.com/offer"
                              className="mt-1 h-10 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3 text-xs text-[#294b40] dark:text-[#eaf3ee] outline-none focus:border-[#5b9b7b]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5a7167] dark:text-[#a1b8ae]">
                              Claim Button Text
                            </label>
                            <input
                              type="text"
                              maxLength="50"
                              value={promoClaimText}
                              onChange={(e) => setPromoClaimText(e.target.value)}
                              placeholder="CLAIM NOW"
                              className="mt-1 h-10 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3 text-xs text-[#294b40] dark:text-[#eaf3ee] outline-none focus:border-[#5b9b7b]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trust and Guarantee Text */}
                  <div className="pt-2 border-t border-[#dce5dc] dark:border-[#1d2f2a] grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                        Verification Guarantee Badge Text
                      </label>
                      <input
                        type="text"
                        maxLength="120"
                        value={guaranteeText}
                        onChange={(e) => setGuaranteeText(e.target.value)}
                        placeholder="Instant Verification Guaranteed"
                        className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3.5 text-xs text-[#294b40] dark:text-[#eaf3ee] outline-none transition focus:border-[#5b9b7b]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#436458] dark:text-[#a1b8ae]">
                        Custom Trust Notice
                      </label>
                      <input
                        type="text"
                        maxLength="250"
                        value={trustNotice}
                        onChange={(e) => setTrustNotice(e.target.value)}
                        placeholder="Leave empty for default direct-to-merchant text"
                        className="mt-2 h-11 w-full rounded-xl border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] px-3.5 text-xs text-[#294b40] dark:text-[#eaf3ee] outline-none transition focus:border-[#5b9b7b]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveBranding}
                  style={{ backgroundColor: brandColor }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-95 disabled:opacity-50"
                >
                  {busy ? <Spinner small /> : <Check className="h-4 w-4" />}
                  {busy ? 'Saving changes…' : 'Save layout & branding'}
                </button>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right Column: Razorpay-Style Live Device Mockup with Light/Dark Theme Switcher */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#527466] dark:text-[#4ade80]">
              <Eye className="h-4 w-4 text-[#126b58] dark:text-[#34d399]" />
              Live Checkout Preview
            </span>
            <div className="flex items-center gap-2">
              {/* Preview Theme Switcher (Light / Dark) */}
              <div className="flex items-center rounded-lg border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewTheme('light')}
                  title="Preview in Light theme"
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                    previewTheme === 'light'
                      ? 'bg-[#126b58] text-white shadow-xs'
                      : 'text-[#647c71] hover:text-[#126b58]'
                  }`}
                >
                  <Sun className="h-3 w-3" />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme('dark')}
                  title="Preview in Dark theme"
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                    previewTheme === 'dark'
                      ? 'bg-[#126b58] text-white shadow-xs'
                      : 'text-[#647c71] hover:text-[#126b58]'
                  }`}
                >
                  <Moon className="h-3 w-3" />
                  Dark
                </button>
              </div>

              {/* Device Switcher (Mobile / Desktop) */}
              <div className="flex items-center rounded-lg border border-[#dce5dc] dark:border-[#1d2f2a] bg-white dark:bg-[#15221f] p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                    previewDevice === 'mobile'
                      ? 'bg-[#126b58] text-white shadow-xs'
                      : 'text-[#647c71] hover:text-[#126b58]'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition ${
                    previewDevice === 'desktop'
                      ? 'bg-[#126b58] text-white shadow-xs'
                      : 'text-[#647c71] hover:text-[#126b58]'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Desktop
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Mockup Container */}
          <div className="relative rounded-[28px] border border-[#dce6dc] dark:border-[#1d2f2a] bg-[#eef3eb] dark:bg-[#0c1613] p-4 shadow-xl sm:p-6 flex flex-col items-center">
            {previewDevice === 'mobile' ? (
              /* Mobile Phone Bezel Mockup */
              <div className={`w-full max-w-[340px] rounded-[38px] border-[7px] border-[#1e2a27] p-3 shadow-2xl overflow-hidden transition-colors ${
                previewTheme === 'dark' ? 'bg-[#080e0c]' : 'bg-[#f3f5ef]'
              }`}>
                {/* Phone Speaker Notch */}
                <div className="mx-auto mb-3 flex h-4 w-28 items-center justify-center rounded-full bg-[#1e2a27]">
                  <div className="h-2 w-2 rounded-full bg-[#121c1a]" />
                  <div className="ml-2 h-1.5 w-8 rounded-full bg-[#273834]" />
                </div>

                {/* Mobile Screen Content */}
                {checkoutLayout === 'banner' ? (
                  /* Gaming & Creator Pro Mobile Mockup */
                  <div className={`rounded-[24px] overflow-hidden shadow-md border transition-all ${
                    isDark
                      ? 'bg-[#0c1412] border-[#1e332c] text-[#eaf3ee]'
                      : 'bg-white border-[#d2ded6] text-[#142e2b]'
                  }`}>
                    {/* Top Hero Banner Graphic with geometric fallback */}
                    <div className={`relative h-28 w-full overflow-hidden ${
                      isDark
                        ? 'bg-gradient-to-br from-[#0c1412] via-[#162923] to-[#07100e]'
                        : 'bg-gradient-to-br from-[#d4ece3] via-[#b6ded0] to-[#e4f2ec]'
                    }`}>
                      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                        <svg className="h-16 w-16 text-[#2ee6c5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
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
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[9px] text-white shadow-md">
                        <span className="text-[#a1b8ae] text-[8px] font-medium">Hosted by</span>
                        {hostAvatarUrl ? (
                          <img
                            src={hostAvatarUrl}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="h-4 w-4 rounded-full object-cover ring-1 ring-[#2ee6c5]"
                          />
                        ) : (
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#126b58] font-bold text-[8px] ring-1 ring-[#2ee6c5]">
                            {(hostedBy || effectiveShopName || 'H').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="font-bold text-white max-w-[65px] truncate">{hostedBy || 'Host'}</span>
                        <span className="rounded bg-[#ff9a3c] px-1 py-0.2 text-[8px] font-extrabold text-black">
                          {hostBadge || '65'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2.5">
                      {/* Brand Sub-Bar */}
                      <div className={`flex items-center justify-between border-b pb-2 ${
                        isDark ? 'border-white/10' : 'border-[#e5ede8]'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--pulse-gradient)] text-white text-[10px] font-bold shadow-xs">
                            P
                          </span>
                          <span className={`font-[var(--font-display)] text-xs font-bold tracking-tight ${
                            isDark ? 'text-white' : 'text-[#142e2b]'
                          }`}>poppay</span>
                        </div>
                        <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold ${
                          isDark
                            ? 'border-[#2ee6c5]/50 bg-[#2ee6c5]/10 text-[#2ee6c5]'
                            : 'border-[#009b80]/40 bg-[#009b80]/10 text-[#007a65]'
                        }`}>
                          <Lock className="h-2.5 w-2.5" />
                          <span>SECURE</span>
                        </div>
                      </div>

                      {/* YOU'RE PAYING */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="min-w-0 flex-1">
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${
                            isDark ? 'text-[#2ee6c5]' : 'text-[#00826b]'
                          }`}>YOU&apos;RE PAYING</p>
                          <h4 className={`font-[var(--font-display)] text-[15px] font-bold truncate leading-tight ${
                            isDark ? 'text-white' : 'text-[#142e2b]'
                          }`}>
                            {effectiveShopName}
                          </h4>
                          {tagline && (
                            <p className={`text-[9px] truncate mt-0.5 ${
                              isDark ? 'text-[#9bb3a8]' : 'text-[#4b685d]'
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
                              className={`h-8 w-8 rounded-full object-cover ring-2 ${
                                isDark ? 'ring-[#2ee6c5]' : 'ring-[#009b80]'
                              }`}
                            />
                          ) : null}
                          <div
                            style={{ display: logoUrl ? 'none' : 'grid' }}
                            className={`grid h-8 w-8 place-items-center rounded-full font-[var(--font-display)] text-xs font-bold ring-2 ${
                              isDark
                                ? 'bg-[#152e25] ring-[#2ee6c5] text-[#2ee6c5]'
                                : 'bg-[#e2f3ec] ring-[#009b80] text-[#007a65]'
                            }`}
                          >
                            {initialLetter}
                          </div>
                        </div>
                      </div>

                      {/* Exact Payable Amount Card */}
                      <div className={`rounded-xl border p-2.5 shadow-inner ${
                        isDark
                          ? 'border-[#2ee6c5]/25 bg-[#07120f]'
                          : 'border-[#a5d5c7] bg-[#f0f7f3]'
                      }`}>
                        <div className={`flex items-center justify-between text-[9px] font-bold ${
                          isDark ? 'text-[#8ca097]' : 'text-[#3e5e52]'
                        }`}>
                          <span>EXACT PAYABLE AMOUNT</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[8px] flex items-center gap-1 font-mono border ${
                            isDark
                              ? 'bg-[#1b352c] text-[#2ee6c5] border-[#2ee6c5]/30'
                              : 'bg-[#d8ece4] text-[#006e5a] border-[#9ad0c2]'
                          }`}>
                            <Clock3 className="h-2.5 w-2.5" />
                            09:28
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <p className={`font-[var(--font-display)] text-[22px] font-extrabold tracking-tight ${
                            isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                          }`}>
                            ₹499.24
                          </p>
                          <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold ${
                            isDark
                              ? 'border-[#2ee6c5]/30 bg-[#2ee6c5]/10 text-[#2ee6c5]'
                              : 'border-[#9ad0c2] bg-white text-[#007a65]'
                          }`}>
                            Copy
                          </span>
                        </div>
                        <p className={`mt-1 flex items-center gap-1 text-[8px] font-semibold ${
                          isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                        }`}>
                          <Check className="h-2.5 w-2.5" />
                          <span>{guaranteeText || 'Instant Verification Guaranteed'}</span>
                        </p>
                      </div>

                      {/* Optional Promo Banner */}
                      {enablePromoBanner && (
                        <div className="rounded-xl bg-gradient-to-r from-[#9333ea] via-[#ec4899] to-[#f43f5e] p-2 text-white shadow-sm flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black leading-tight">GET 50% OFF NEXT ENTRY!</p>
                            <p className="text-[7.5px] text-white/80">Use code GAMER50 on checkout</p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-yellow-400 px-2 py-1 text-[8px] font-extrabold text-black uppercase shadow-xs">
                            {promoClaimText || 'CLAIM NOW'}
                          </span>
                        </div>
                      )}

                      {/* One-Click Mobile UPI */}
                      <div>
                        <p className={`text-[8px] font-bold uppercase tracking-wider mb-1 ${
                          isDark ? 'text-[#8ca097]' : 'text-[#3e5e52]'
                        }`}>ONE-CLICK MOBILE UPI</p>
                        <div className="rounded-xl bg-gradient-to-r from-[#2ee6c5] via-[#3b82f6] to-[#8b5cf6] p-2 text-white flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-lg bg-white/20">
                              <ArrowRight className="h-3 w-3" />
                            </span>
                            <div className="text-left">
                              <p className="text-[10px] font-bold leading-tight">Pay with UPI App</p>
                              <p className="text-[8px] text-white/80">Tap to open installed app</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-bold backdrop-blur-xs">
                            Tap to open
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-4 gap-1">
                          {['PhonePe', 'Google Pay', 'Paytm', 'Cred / Other'].map((name) => (
                            <div
                              key={name}
                              className={`rounded-lg border py-1 text-center text-[8px] font-bold ${
                                isDark
                                  ? 'border-[#1f332c] bg-[#14221f] text-[#b4c7be]'
                                  : 'border-[#d2e2d8] bg-[#f4f8f5] text-[#1a382e]'
                              }`}
                            >
                              {name}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Manual UPI ID */}
                      <div className={`rounded-lg border p-2 flex items-center justify-between ${
                        isDark
                          ? 'border-[#1f332c] bg-[#0c1513]'
                          : 'border-[#d2e2d8] bg-[#f0f7f3]'
                      }`}>
                        <div className="min-w-0 pr-1">
                          <p className={`text-[7.5px] font-bold uppercase ${
                            isDark ? 'text-[#71857c]' : 'text-[#4b685d]'
                          }`}>MERCHANT VERIFIED UPI ID</p>
                          <p className={`font-mono text-[9px] font-bold truncate ${
                            isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                          }`}>{merchant?.upiId || 'merchant@bank'}</p>
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold border ${
                          isDark
                            ? 'border-[#2ee6c5]/30 bg-[#1b352c] text-[#2ee6c5]'
                            : 'border-[#9ad0c2] bg-white text-[#007a65]'
                        }`}>
                          Copy
                        </span>
                      </div>

                      {/* Trust Notice */}
                      <div className={`flex items-center gap-1.5 rounded-lg p-1.5 text-[7.5px] border ${
                        isDark
                          ? 'border-white/5 bg-[#14221f]/50 text-[#8ca097]'
                          : 'border-[#d2e2d8] bg-[#f4f8f5] text-[#3e5e52]'
                      }`}>
                        <ShieldCheck className={`h-3 w-3 shrink-0 ${isDark ? 'text-[#2ee6c5]' : 'text-[#00826b]'}`} />
                        <span className="truncate">{trustNotice || `Your money goes directly to ${effectiveShopName}. PopPay never holds your funds.`}</span>
                      </div>

                      {/* Bottom Help Pills */}
                      <div className={`flex items-center justify-center gap-2 pt-1 border-t ${
                        isDark ? 'border-white/5' : 'border-[#e5ede8]'
                      }`}>
                        <span className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold ${
                          isDark
                            ? 'border-[#1f332c] bg-[#14221f] text-[#8ca097]'
                            : 'border-[#d2e2d8] bg-[#f4f8f5] text-[#3e5e52]'
                        }`}>
                          Need help?
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold ${
                          isDark
                            ? 'border-[#1f332c] bg-[#14221f] text-[#8ca097]'
                            : 'border-[#d2e2d8] bg-[#f4f8f5] text-[#3e5e52]'
                        }`}>
                          Paid but not confirmed?
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Classic Screen Content */
                  <div className={`rounded-[24px] p-4 shadow-sm border transition-colors ${
                    previewTheme === 'dark'
                      ? 'bg-[#111a18] border-[#1d2f29] text-[#eaf3ee]'
                      : 'bg-[#fffefa] border-[#e4ece2] text-[#142e2b]'
                  }`}>
                    {/* Shop Header */}
                    <div className={`mb-4 flex items-start justify-between gap-2.5 border-b pb-3 ${
                      previewTheme === 'dark' ? 'border-[#1b2b26]' : 'border-[#edf2ea]'
                    }`}>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${
                          previewTheme === 'dark' ? 'text-[#8ca097]' : 'text-[#829289]'
                        }`}>Paying to</p>
                        <h4 className={`truncate font-[var(--font-display)] text-[16px] font-bold ${
                          previewTheme === 'dark' ? 'text-[#f0f7f3]' : 'text-[#142e2b]'
                        }`}>
                          {effectiveShopName}
                        </h4>
                        {tagline && (
                          <p className={`truncate text-[10px] ${
                            previewTheme === 'dark' ? 'text-[#85978f]' : 'text-[#6d7f76]'
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
                            className="h-9 w-9 rounded-xl object-cover border border-[#e2eae2]"
                          />
                        ) : null}
                        <div
                          style={{
                            display: logoUrl ? 'none' : 'grid',
                            backgroundColor: `${brandColor}20`,
                            color: brandColor,
                          }}
                          className="grid h-9 w-9 place-items-center rounded-xl font-[var(--font-display)] text-sm font-bold border border-black/5"
                        >
                          {initialLetter}
                        </div>
                      </div>
                    </div>

                    {/* Amount Card */}
                    <div className={`rounded-xl border p-3 ${
                      previewTheme === 'dark'
                        ? 'border-[#1f332c] bg-[#14221f]'
                        : 'border-[#e5ebe2] bg-[#f8faf6]'
                    }`}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#71857c]">
                        <span>EXACT AMOUNT</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] ${
                          previewTheme === 'dark' ? 'bg-[#1b352c] text-[#4ade80]' : 'bg-[#edf3eb] text-[#3e6858]'
                        }`}>
                          ⏱ 09:48
                        </span>
                      </div>
                      <p className={`mt-1 font-[var(--font-display)] text-[26px] font-bold ${
                        previewTheme === 'dark' ? 'text-[#ffffff]' : 'text-[#142e2b]'
                      }`}>
                        <span style={{ color: brandColor }} className="mr-0.5 text-[18px]">₹</span>499.24
                      </p>
                      <p className="mt-1 text-[9px] font-semibold" style={{ color: brandColor }}>
                        Includes 24p unique verification suffix
                      </p>
                    </div>

                    {/* Primary CTA Button */}
                    <div className="mt-3.5">
                      <button
                        type="button"
                        style={{
                          backgroundColor: brandColor,
                          boxShadow: `0 4px 14px ${brandColor}40`,
                        }}
                        className="w-full rounded-xl py-2.5 text-center text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span>Pay via UPI App</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                      <p className="mt-1 text-center text-[8px] text-[#829288]">
                        GPay · PhonePe · Paytm · BHIM · Cred
                      </p>
                    </div>

                    {/* Merchant UPI ID display */}
                    <div className={`mt-3 rounded-lg border p-2 text-left ${
                      previewTheme === 'dark'
                        ? 'border-[#1f332c] bg-[#14221f]'
                        : 'border-[#e4ebe2] bg-white'
                    }`}>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-[#8b9c92]">Verified UPI ID</p>
                      <p className={`font-mono text-[11px] font-semibold truncate ${
                        previewTheme === 'dark' ? 'text-[#4ade80]' : 'text-[#234b3f]'
                      }`}>
                        {merchant?.upiId || 'merchant@bank'}
                      </p>
                    </div>

                    {/* Micro QR Mockup */}
                    <div className={`mt-3 flex items-center gap-3 rounded-xl border p-2 ${
                      previewTheme === 'dark'
                        ? 'border-[#1f332c] bg-[#14221f]'
                        : 'border-[#e8eee6] bg-[#f7faf5]'
                    }`}>
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white border border-[#dbe4d9] font-mono text-[8px] font-bold text-[#142e2b]">
                        [ QR ]
                      </div>
                      <div className="min-w-0 text-left">
                        <p className={`text-[10px] font-bold ${previewTheme === 'dark' ? 'text-[#eaf3ee]' : 'text-[#234b3f]'}`}>
                          Instant Bank Sync
                        </p>
                        <p className="text-[9px] text-[#788a81]">Auto-detected within 3 seconds</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={`mt-3 border-t pt-2 text-center text-[8px] ${
                      previewTheme === 'dark' ? 'border-[#1b2b26] text-[#70847b]' : 'border-[#edf2ea] text-[#8b9c92]'
                    }`}>
                      Direct UPI to {effectiveShopName}
                      {supportEmail && ` · ${supportEmail}`}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop Card Mockup */
              <div className={`w-full max-w-[430px] rounded-2xl border shadow-xl overflow-hidden transition-colors ${
                previewTheme === 'dark'
                  ? 'bg-[#111a18] border-[#1d2f29]'
                  : 'bg-white border-[#d6e0d4]'
              }`}>
                {/* Browser Tab Bar */}
                <div className={`flex items-center gap-1.5 border-b px-3 py-2 ${
                  previewTheme === 'dark' ? 'border-[#1c2e29] bg-[#0c1514]' : 'border-[#e5ebe3] bg-[#f4f7f2]'
                }`}>
                  <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
                  <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                  <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
                  <span className={`ml-2 flex-1 rounded px-2 py-0.5 font-mono text-[9px] truncate ${
                    previewTheme === 'dark' ? 'bg-[#15221f] text-[#8ea299]' : 'bg-white text-[#70847b]'
                  }`}>
                    https://checkout.poppay.in/pay/order_demo
                  </span>
                </div>

                {checkoutLayout === 'banner' ? (
                  /* Gaming Desktop Mockup */
                  <div className={`transition-colors ${isDark ? 'text-[#eaf3ee]' : 'text-[#142e2b]'}`}>
                    {/* Top Hero Graphic Banner with geometric fallback */}
                    <div className={`relative h-32 w-full overflow-hidden ${
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
                          ? 'bg-gradient-to-t from-[#111a18] via-[#111a18]/30 to-transparent'
                          : 'bg-gradient-to-t from-white via-white/20 to-transparent'
                      }`} />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[9px] text-white shadow-md">
                        <span className="text-[#a1b8ae] text-[8px] font-medium">Hosted by</span>
                        {hostAvatarUrl ? (
                          <img
                            src={hostAvatarUrl}
                            alt=""
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            className="h-4 w-4 rounded-full object-cover ring-1 ring-[#2ee6c5]"
                          />
                        ) : (
                          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#126b58] font-bold text-[8px] ring-1 ring-[#2ee6c5]">
                            {(hostedBy || effectiveShopName || 'H').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="font-bold text-white max-w-[80px] truncate">{hostedBy || 'Host'}</span>
                        <span className="rounded bg-[#ff9a3c] px-1 py-0.2 text-[8px] font-extrabold text-black">{hostBadge || '65'}</span>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Brand Sub-Bar */}
                      <div className={`flex items-center justify-between border-b pb-2 ${
                        isDark ? 'border-white/10' : 'border-[#e5ede8]'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--pulse-gradient)] text-white text-[10px] font-bold shadow-xs">
                            P
                          </span>
                          <span className={`font-[var(--font-display)] text-xs font-bold tracking-tight ${
                            isDark ? 'text-white' : 'text-[#142e2b]'
                          }`}>poppay</span>
                        </div>
                        <div className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold ${
                          isDark
                            ? 'border-[#2ee6c5]/50 bg-[#2ee6c5]/10 text-[#2ee6c5]'
                            : 'border-[#009b80]/40 bg-[#009b80]/10 text-[#007a65]'
                        }`}>
                          <Lock className="h-2.5 w-2.5" />
                          <span>SECURE</span>
                        </div>
                      </div>

                      {/* YOU'RE PAYING */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-[8px] font-bold uppercase tracking-wider ${
                            isDark ? 'text-[#2ee6c5]' : 'text-[#00826b]'
                          }`}>YOU&apos;RE PAYING</p>
                          <h4 className={`font-[var(--font-display)] text-[17px] font-bold truncate leading-tight ${
                            isDark ? 'text-white' : 'text-[#142e2b]'
                          }`}>
                            {effectiveShopName}
                          </h4>
                          {tagline && (
                            <p className={`text-[10px] truncate mt-0.5 ${
                              isDark ? 'text-[#9bb3a8]' : 'text-[#4b685d]'
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
                              className={`h-9 w-9 rounded-full object-cover ring-2 ${
                                isDark ? 'ring-[#2ee6c5]' : 'ring-[#009b80]'
                              }`}
                            />
                          ) : null}
                          <div
                            style={{ display: logoUrl ? 'none' : 'grid' }}
                            className={`grid h-9 w-9 place-items-center rounded-full font-[var(--font-display)] text-xs font-bold ring-2 ${
                              isDark
                                ? 'bg-[#152e25] ring-[#2ee6c5] text-[#2ee6c5]'
                                : 'bg-[#e2f3ec] ring-[#009b80] text-[#007a65]'
                            }`}
                          >
                            {initialLetter}
                          </div>
                        </div>
                      </div>

                      {/* Exact Payable Amount */}
                      <div className={`rounded-xl border p-3 shadow-inner ${
                        isDark
                          ? 'border-[#2ee6c5]/25 bg-[#07120f]'
                          : 'border-[#a5d5c7] bg-[#f0f7f3]'
                      }`}>
                        <div className={`flex items-center justify-between text-[9px] font-bold ${
                          isDark ? 'text-[#8ca097]' : 'text-[#3e5e52]'
                        }`}>
                          <span>EXACT PAYABLE AMOUNT</span>
                          <span className={`rounded-full px-2 py-0.5 text-[8px] flex items-center gap-1 font-mono border ${
                            isDark
                              ? 'bg-[#1b352c] text-[#2ee6c5] border-[#2ee6c5]/30'
                              : 'bg-[#d8ece4] text-[#006e5a] border-[#9ad0c2]'
                          }`}>
                            <Clock3 className="h-2.5 w-2.5" />
                            09:28
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <p className={`font-[var(--font-display)] text-[28px] font-extrabold tracking-tight ${
                            isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                          }`}>
                            ₹499.24
                          </p>
                          <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-bold ${
                            isDark
                              ? 'border-[#2ee6c5]/30 bg-[#2ee6c5]/10 text-[#2ee6c5]'
                              : 'border-[#9ad0c2] bg-white text-[#007a65]'
                          }`}>
                            Copy
                          </span>
                        </div>
                        <p className={`mt-1 flex items-center gap-1 text-[8.5px] font-semibold ${
                          isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                        }`}>
                          <Check className="h-2.5 w-2.5" />
                          <span>{guaranteeText || 'Instant Verification Guaranteed'}</span>
                        </p>
                      </div>

                      {/* Promo Banner if enabled */}
                      {enablePromoBanner && (
                        <div className="rounded-xl bg-gradient-to-r from-[#9333ea] via-[#ec4899] to-[#f43f5e] p-2.5 text-white shadow-sm flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black leading-tight">GET 50% OFF NEXT ENTRY!</p>
                            <p className="text-[8px] text-white/80">Use code GAMER50 on checkout</p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-yellow-400 px-2 py-1 text-[8.5px] font-extrabold text-black uppercase shadow-xs">
                            {promoClaimText || 'CLAIM NOW'}
                          </span>
                        </div>
                      )}

                      {/* One Click UPI */}
                      <button
                        type="button"
                        className="w-full rounded-xl bg-gradient-to-r from-[#2ee6c5] via-[#3b82f6] to-[#8b5cf6] py-2.5 text-center text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span>Pay with UPI App</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>

                      {/* App Pills */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {['PhonePe', 'Google Pay', 'Paytm', 'Cred / Other'].map((name) => (
                          <div
                            key={name}
                            className={`rounded-lg border py-1 text-center text-[8.5px] font-bold ${
                              isDark
                                ? 'border-[#1f332c] bg-[#14221f] text-[#b4c7be]'
                                : 'border-[#d2e2d8] bg-[#f4f8f5] text-[#1a382e]'
                            }`}
                          >
                            {name}
                          </div>
                        ))}
                      </div>

                      {/* Verified UPI ID */}
                      <div className={`rounded-lg border p-2 flex items-center justify-between ${
                        isDark
                          ? 'border-[#1f332c] bg-[#0c1513]'
                          : 'border-[#d2e2d8] bg-[#f0f7f3]'
                      }`}>
                        <div className="min-w-0 pr-1">
                          <p className={`text-[8px] font-bold uppercase ${
                            isDark ? 'text-[#71857c]' : 'text-[#4b685d]'
                          }`}>MERCHANT VERIFIED UPI ID</p>
                          <p className={`font-mono text-[10px] font-bold truncate ${
                            isDark ? 'text-[#2ee6c5]' : 'text-[#007a65]'
                          }`}>{merchant?.upiId || 'merchant@bank'}</p>
                        </div>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[8.5px] font-bold border ${
                          isDark
                            ? 'border-[#2ee6c5]/30 bg-[#1b352c] text-[#2ee6c5]'
                            : 'border-[#9ad0c2] bg-white text-[#007a65]'
                        }`}>
                          Copy
                        </span>
                      </div>

                      {/* Direct UPI Notice */}
                      <div className={`text-center text-[9px] ${
                        isDark ? 'text-[#70847b]' : 'text-[#556960]'
                      }`}>
                        Direct UPI to {effectiveShopName}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Classic Desktop Mockup */
                  <div className="p-4 sm:p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${
                          previewTheme === 'dark' ? 'text-[#8ca097]' : 'text-[#829289]'
                        }`}>Paying to</p>
                        <h4 className={`font-[var(--font-display)] text-[18px] font-bold ${
                          previewTheme === 'dark' ? 'text-[#f0f7f3]' : 'text-[#142e2b]'
                        }`}>
                          {effectiveShopName}
                        </h4>
                        {tagline && <p className={`text-[10px] ${
                          previewTheme === 'dark' ? 'text-[#85978f]' : 'text-[#6d7f76]'
                        }`}>{tagline}</p>}
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
                            className="h-10 w-10 rounded-xl object-cover border border-[#e2eae2]"
                          />
                        ) : null}
                        <div
                          style={{
                            display: logoUrl ? 'none' : 'grid',
                            backgroundColor: `${brandColor}20`,
                            color: brandColor,
                          }}
                          className="grid h-10 w-10 place-items-center rounded-xl font-[var(--font-display)] text-sm font-bold border border-black/5"
                        >
                          {initialLetter}
                        </div>
                      </div>
                    </div>

                    <div className={`rounded-xl border p-3 ${
                      previewTheme === 'dark' ? 'border-[#1f332c] bg-[#14221f]' : 'border-[#e5ebe2] bg-[#f8faf6]'
                    }`}>
                      <p className="text-[10px] font-bold text-[#71857c]">EXACT PAYABLE AMOUNT</p>
                      <p className={`mt-1 font-[var(--font-display)] text-[28px] font-bold ${
                        previewTheme === 'dark' ? 'text-white' : 'text-[#142e2b]'
                      }`}>
                        <span style={{ color: brandColor }} className="mr-0.5 text-[20px]">₹</span>499.24
                      </p>
                    </div>

                    <div className="mt-3.5">
                      <button
                        type="button"
                        style={{
                          backgroundColor: brandColor,
                          boxShadow: `0 4px 14px ${brandColor}40`,
                        }}
                        className="w-full rounded-xl py-2.5 text-center text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span>Pay with UPI App</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>

                    <div className={`mt-3 text-center text-[9px] ${
                      previewTheme === 'dark' ? 'text-[#70847b]' : 'text-[#86998f]'
                    }`}>
                      Powered by PopPay · Direct UPI to {effectiveShopName}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-center text-xs text-[#527466] dark:text-[#34d399]">
              <Sparkles className="h-3.5 w-3.5 text-[#126b58] dark:text-[#34d399]" />
              <span>Real-time instant rendering preview ({previewTheme.toUpperCase()} MODE)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const NODE_SNIPPET = `// Production API Base URL: https://poppay.tech
const response = await fetch("https://poppay.tech/api/v1/orders", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.POPPAY_SECRET_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: "248.00",
    receipt: "counter-order-1042",
    redirectUrl: "https://shop.example/thanks",
  }),
});

if (!response.ok) throw new Error(await response.text());
const order = await response.json();

// Redirect customer to PopPay hosted UPI checkout:
console.log("Customer Checkout URL:", order.checkoutUrl);`;

const CURL_SNIPPET = `curl -X POST "https://poppay.tech/api/v1/orders" \\
  -H "Authorization: Bearer $POPPAY_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "248.00",
    "receipt": "counter-order-1042",
    "redirectUrl": "https://shop.example/thanks"
  }'`;

const PYTHON_SNIPPET = `import os
import requests

# Production API Base URL: https://poppay.tech
response = requests.post(
    "https://poppay.tech/api/v1/orders",
    headers={
        "Authorization": f"Bearer {os.environ['POPPAY_SECRET_KEY']}",
        "Content-Type": "application/json"
    },
    json={
        "amount": "248.00",
        "receipt": "counter-order-1042",
        "redirectUrl": "https://shop.example/thanks"
    }
)
response.raise_for_status()
order = response.json()
print("Customer Checkout URL:", order["checkoutUrl"])`;

const PHP_SNIPPET = `<?php
// Production API Base URL: https://poppay.tech
$ch = curl_init('https://poppay.tech/api/v1/orders');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . getenv('POPPAY_SECRET_KEY'),
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'amount' => '248.00',
        'receipt' => 'counter-order-1042',
        'redirectUrl' => 'https://shop.example/thanks'
    ])
]);
$order = json_decode(curl_exec($ch), true);
curl_close($ch);
echo "Customer Checkout URL: " . $order['checkoutUrl'];`;

const POLL_SNIPPET = `const response = await fetch(
  \`https://poppay.tech/api/v1/checkout/\${orderId}/status\`
);
if (!response.ok) throw new Error(await response.text());
const payment = await response.json();

if (payment.status === "PAID") {
  // Verify payment.signature on your server before fulfillment.
  // Do not trust a browser redirect or postMessage as proof.
}
`;

const CHECKOUT_MODAL_SNIPPET = `<!-- 1. Include PopPay SDK in your HTML -->
<script src="https://poppay.tech/checkout.js"></script>

<script>
// 2. Open popup modal using your Public Key and order_id
const pop = new PopPay({
  key: "pp_live_YOUR_PUBLIC_KEY",  // Public key from Merchant Settings
  order_id: order.order_id,          // Order ID from POST /api/v1/orders
  name: "My Store",
  handler: function (response) {
    // Called when payment is confirmed!
    console.log("Payment Confirmed!", response);
    // response: { order_id, payment_id, utr, signature }
    window.location.href = "/success?order_id=" + response.order_id;
  },
  onDismiss: function () {
    console.log("Customer closed the checkout modal");
  }
});

pop.open();
</script>`;

const VERIFY_SNIPPET = `import { createHmac, timingSafeEqual } from "node:crypto";

function verifyPopPayPayment(orderId, paymentId, signature) {
  if (!/^[a-f0-9]{64}$/i.test(signature || "")) return false;
  const expected = createHmac(
    "sha256",
    process.env.POPPAY_SIGNING_SECRET
  )
    .update(\`\${orderId}|\${paymentId}\`, "utf8")
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length &&
    timingSafeEqual(received, expected);
}

// Use orderId from the status URL you requested.`;

const WEBHOOK_SNIPPET = `import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

// Mount this route before express.json() consumes the body.
app.post(
  "/webhooks/poppay",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.get("X-PopPay-Signature") || "";
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return res.sendStatus(401);
    }

    const expected = createHmac(
      "sha256",
      process.env.POPPAY_WEBHOOK_SECRET
    ).update(req.body).digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length ||
        !timingSafeEqual(received, expected)) {
      return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event === "payment.success") {
      // Idempotently record event.order_id / event.payment_id.
    }
    return res.sendStatus(200);
  }
);`;

function GuideSection({ id, number, eyebrow, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3.5 flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-500/15 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{number}</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
          <h2 className="mt-0.5 font-[var(--font-display)] text-xl font-bold tracking-[-.5px] text-slate-900 dark:text-white sm:text-2xl">{title}</h2>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function GuideCode({ label, code, copied, onCopy, compact = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-[#060b09]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 bg-white/[.03]">
        <p className="text-[10px] font-bold uppercase tracking-[.11em] text-emerald-400">{label}</p>
        <button type="button" onClick={onCopy} className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[.07] px-2.5 text-[10px] font-bold text-slate-200 transition hover:bg-white/[.14]" aria-label={`Copy ${label} example`}>
          {copied ? <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className={`max-w-full overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-200 ${compact ? 'max-h-[360px]' : ''}`}><code>{code}</code></pre>
    </div>
  );
}

const GUIDE_NAV = [
  ['start', 'Start here'],
  ['authentication', 'Authentication'],
  ['create-order', 'Create an order'],
  ['hosted-checkout', 'Hosted checkout'],
  ['verify-payment', 'Verify payment'],
  ['webhooks', 'Webhooks'],
  ['security', 'Security'],
  ['troubleshooting', 'Troubleshooting'],
];

export function IntegrationPage({ isPublic = false }) {
  const { merchant } = useMerchant();
  const [language, setLanguage] = useState('node');
  const [copied, setCopied] = useState('');
  const code = language === 'node' ? NODE_SNIPPET : language === 'python' ? PYTHON_SNIPPET : language === 'php' ? PHP_SNIPPET : CURL_SNIPPET;
  const publicKey = merchant?.publicKey || 'pop_pub_live_your_key_here';

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  }

  return (
    <div className="page-enter pb-16">
      {/* Standalone HTML Announcement Pill */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-white font-bold text-xs">
            AI
          </span>
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              Public Standalone HTML Documentation Available
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Directly shareable with AI agents (Cursor, Claude, ChatGPT) and public crawlers without login.
            </p>
          </div>
        </div>
        <a
          href="/docs.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs transition"
        >
          <span>Open Plain HTML Docs</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <PageHeading
        eyebrow="PopPay API · v1.0"
        title="Developer Guide & REST API"
        detail="A practical path from your first order request to a verified UPI payment. Base URL: https://poppay.tech"
        action={
          merchant ? (
            <Link to="/settings" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12201b] px-4 text-xs font-bold text-slate-800 dark:text-white shadow-2xs transition hover:bg-slate-50">
              <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Credentials & Webhooks</span>
            </Link>
          ) : (
            <Link to="/login" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-bold text-white shadow-2xs transition">
              <span>Sign In to Get Keys</span>
            </Link>
          )
        }
      />

      <section className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-600/30 bg-gradient-to-br from-[#0c2f24] via-[#09221a] to-[#061410] p-5 text-white shadow-md sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-4 -top-12 h-44 w-44 rounded-full border border-white/[.08]" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.7fr)] lg:items-end">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[.19em] text-emerald-300">Base URL: https://poppay.tech</p>
            <h2 className="mt-2 max-w-2xl font-[var(--font-display)] text-[24px] font-bold leading-tight tracking-[-1px] sm:text-[30px]">One server request. A hosted UPI checkout. Instant bank reconciliation.</h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-300">Create orders with your server credential, let PopPay handle the payment screen, then verify every success independently.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/[.07] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-300">Current merchant public key</p>
              <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.1em] text-emerald-300">Public</span>
            </div>
            <code className="mt-2 block break-all font-mono text-[11px] leading-5 text-white">{publicKey}</code>
            <p className="mt-2 text-[10px] leading-4 text-slate-300">This key identifies your merchant profile in frontend checkout instances.</p>
          </div>
        </div>
        <div className="relative mt-6 grid gap-2 border-t border-white/15 pt-4 sm:grid-cols-4">
          {[
            ['01', 'Create', 'POST /api/v1/orders'],
            ['02', 'Checkout', 'Hosted UPI page'],
            ['03', 'Verify', 'Signed status'],
            ['04', 'Fulfil', 'Webhook + idempotency'],
          ].map(([number, label, detail]) => (
            <div key={number} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="font-mono text-[11px] font-bold text-emerald-400">{number}</span>
              <div><p className="text-xs font-bold text-white">{label}</p><p className="mt-0.5 text-[10px] text-slate-300">{detail}</p></div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Developer guide sections">
        {GUIDE_NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-[#dce6dc] bg-[#fffefa] px-3 py-2 text-[10px] font-bold text-[#4f7161] hover:border-[#9cbda4] hover:text-[#126b58]">{label}</a>)}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="sticky top-[78px] hidden max-h-[calc(100vh-100px)] overflow-y-auto rounded-[18px] border border-[#e1e8e1] bg-[#fffefa] p-3 panel-shadow custom-scrollbar-light lg:block">
          <p className="px-2 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[.15em] text-[#87968d]">On this page</p>
          <nav className="space-y-1" aria-label="Developer guide sections">
            {GUIDE_NAV.map(([id, label], index) => <a key={id} href={`#${id}`} className="flex min-h-9 items-center gap-2.5 rounded-lg px-2 text-[10px] font-semibold text-[#62786d] transition-colors hover:bg-[#f0f5ee] hover:text-[#126b58]"><span className="font-mono text-[9px] text-[#9aaa9f]">{String(index + 1).padStart(2, '0')}</span>{label}</a>)}
          </nav>
          <div className="mt-3 border-t border-[#edf0eb] px-2 pt-3">
            <Link to="/settings" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#126b58] hover:underline">Open settings <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </aside>

        <div className="min-w-0 space-y-9">
          <GuideSection id="start" number="01" eyebrow="Before you build" title="Start with the right keys">
            <Panel className="overflow-hidden">
              <PanelTitle title="One identifier, three private credentials" detail="Put server-only values in your deployment environment, not source code." />
              <div className="grid gap-0 divide-y divide-[#edf0eb] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="p-5">
                  <p className="flex items-center gap-2 text-xs font-bold text-[#315f4e]"><CheckCircle2 className="h-4 w-4 text-[#4d8a67]" />Public key</p>
                  <p className="mt-2 text-[11px] leading-5 text-[#73847a]">Safe to use in client configuration as a merchant identifier. Current value comes from <code className="rounded bg-[#f0f4ee] px-1 py-0.5 font-mono text-[10px]">merchant.publicKey</code>.</p>
                  <GuideCode label="Current account · client-safe" code={publicKeySnippet} copied={copied === 'public-key'} onCopy={() => copy(publicKeySnippet, 'public-key')} compact />
                </div>
                <div className="p-5">
                  <p className="flex items-center gap-2 text-xs font-bold text-[#785e30]"><KeyRound className="h-4 w-4" />Server credentials</p>
                  <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-[#73847a]">
                    <li><code className="font-mono text-[10px] text-[#355a4d]">POPPAY_SECRET_KEY</code> — order API authentication.</li>
                    <li><code className="font-mono text-[10px] text-[#355a4d]">POPPAY_SIGNING_SECRET</code> — signed payment-status verification.</li>
                    <li><code className="font-mono text-[10px] text-[#355a4d]">POPPAY_WEBHOOK_SECRET</code> — incoming webhook HMAC verification.</li>
                  </ul>
                  <p className="mt-2 rounded-lg border border-[#f0dfb7] bg-[#fff8e8] px-3 py-2 text-[10px] leading-4 text-[#80612d]">These secret values are shown once during account onboarding or after credential rotation in Settings. They cannot be recovered from the normal profile. If any are lost, rotate credentials and replace the environment values.</p>
                </div>
              </div>
              <div className="border-t border-[#edf0eb] bg-[#f8faf6] px-5 py-3 text-[10px] leading-5 text-[#73847a]">
                Set <code className="rounded bg-white px-1 py-0.5 font-mono">POPPAY_API_BASE_URL</code> to the PopPay deployment origin. Add the three secret variables to your server’s secret manager; never prefix them as frontend/build variables.
              </div>
            </Panel>
          </GuideSection>

          <GuideSection id="authentication" number="02" eyebrow="Server to server" title="Authenticate with a bearer secret">
            <div className="grid gap-4 xl:grid-cols-[1fr_.72fr]">
              <Panel className="overflow-hidden">
                <PanelTitle title="API authentication" detail="All /api/v1/orders calls are authenticated server-side." />
                <div className="space-y-3 p-5">
                  <div className="rounded-xl border border-[#dce8dc] bg-[#f4f8f1] p-3.5">
                    <p className="font-mono text-[11px] font-bold text-[#355a4d]">Authorization: Bearer $POPPAY_SECRET_KEY</p>
                    <p className="mt-1.5 text-[10px] leading-4 text-[#74877c]">PopPay hashes the bearer key to identify the merchant. Missing, malformed, or invalid keys receive HTTP 401.</p>
                  </div>
                  <p className="text-[11px] leading-5 text-[#74847b]">The public key is not a substitute for this credential. Keep the secret key only in trusted server runtime memory and send it over HTTPS.</p>
                </div>
              </Panel>
              <div className="rounded-[18px] border border-[#e8dfc6] bg-[#fff8e8] p-5">
                <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#9a712d]"><ShieldCheck className="h-4 w-4" /></span><div><h3 className="text-xs font-bold text-[#735c33]">Keep credentials out of builds</h3><p className="mt-1.5 text-[11px] leading-5 text-[#8b754d]">Never put secrets in browser code, public repositories, logs, analytics, mobile bundles, or customer-visible errors. Rotate immediately if exposed.</p></div></div>
              </div>
            </div>
          </GuideSection>

          <GuideSection id="create-order" number="03" eyebrow="First API call" title="Create an order on your server">
            <Panel className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0eb] px-5 py-4 sm:px-6">
                <div><h3 className="text-sm font-bold text-[#203d36]">POST /api/v1/orders</h3><p className="mt-1 text-xs text-[#84928a]">Accepts JSON; amount is INR with up to two decimal places.</p></div>
                <div className="flex rounded-lg bg-[#f0f3ed] p-1 gap-1" role="tablist" aria-label="Request example language">
                  <button type="button" role="tab" aria-selected={language === 'node'} onClick={() => setLanguage('node')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${language === 'node' ? 'bg-white text-[#275a46] shadow-sm' : 'text-[#84928a] hover:text-[#275a46]'}`}>Node.js</button>
                  <button type="button" role="tab" aria-selected={language === 'python'} onClick={() => setLanguage('python')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${language === 'python' ? 'bg-white text-[#275a46] shadow-sm' : 'text-[#84928a] hover:text-[#275a46]'}`}>Python</button>
                  <button type="button" role="tab" aria-selected={language === 'php'} onClick={() => setLanguage('php')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${language === 'php' ? 'bg-white text-[#275a46] shadow-sm' : 'text-[#84928a] hover:text-[#275a46]'}`}>PHP</button>
                  <button type="button" role="tab" aria-selected={language === 'curl'} onClick={() => setLanguage('curl')} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${language === 'curl' ? 'bg-white text-[#275a46] shadow-sm' : 'text-[#84928a] hover:text-[#275a46]'}`}>cURL</button>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <GuideCode label={`${language.toUpperCase()} · create an order`} code={code} copied={copied === 'create-order'} onCopy={() => copy(code, 'create-order')} compact />
              </div>
              <div className="grid gap-0 border-t border-[#edf0eb] sm:grid-cols-3 sm:divide-x sm:divide-[#edf0eb]">
                <div className="p-4 sm:px-5"><p className="font-mono text-[9px] font-bold text-[#739483]">REQUEST</p><p className="mt-1 text-[10px] leading-4 text-[#718279]"><code>amount</code> is required (minimum ₹1.00); <code>receipt</code> is required (up to 120 characters); optional <code>redirectUrl</code> must be HTTPS.</p></div>
                <div className="border-t border-[#edf0eb] p-4 sm:border-t-0 sm:px-5"><p className="font-mono text-[9px] font-bold text-[#739483]">RESPONSE · 201</p><p className="mt-1 text-[10px] leading-4 text-[#718279]"><code>order_id</code>, <code>baseAmount</code>, <code>payableAmount</code>, <code>status</code>, <code>expiresAt</code>, and <code>checkoutUrl</code>.</p></div>
                <div className="border-t border-[#edf0eb] p-4 sm:border-t-0 sm:px-5"><p className="font-mono text-[9px] font-bold text-[#739483]">IMPORTANT</p><p className="mt-1 text-[10px] leading-4 text-[#718279]">PopPay reserves a unique payable amount by adding paise to the base amount. Charge/display the returned <code>payableAmount</code>, not the requested base.</p></div>
              </div>
              <div className="border-t border-[#edf0eb] px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#819087]">Illustrative 201 response</p>
                <pre className="overflow-x-auto rounded-xl bg-[#f4f7f1] p-3.5 font-mono text-[10px] leading-5 text-[#426554]"><code>{`{
  "order_id": "order_example12345",
  "baseAmount": "248.00",
  "payableAmount": "248.37",
  "status": "PENDING",
  "expiresAt": "<ISO-8601 expiry>",
  "checkoutUrl": "/pay/order_example12345"
}`}</code></pre>
                <p className="mt-2 text-[9px] leading-4 text-[#87958c]">The sample values are illustrative; the real order ID, payable amount, expiry and checkout path come from PopPay.</p>
              </div>
            </Panel>
            <div className="rounded-xl border border-[#dce8dc] bg-[#edf5eb] px-4 py-3 text-[10px] leading-5 text-[#557866]"><strong className="font-bold text-[#315f4e]">Example response shape:</strong> <code className="break-all font-mono">{"{ order_id, baseAmount, payableAmount, status: 'PENDING', expiresAt, checkoutUrl }"}</code>. The checkout URL is returned as a path (for example <code className="font-mono">/pay/order_…</code>); resolve it against the PopPay origin before redirecting.</div>
          </GuideSection>

          <GuideSection id="hosted-checkout" number="04" eyebrow="Customer experience" title="Customer Checkout (Modal SDK & Hosted Link)">
            <Panel className="overflow-hidden">
              <PanelTitle title="Two flexible checkout options" detail="Popup modal using checkout.js SDK or direct hosted URL redirection." />
              <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
                <div className="rounded-xl bg-[#f5f8f2] p-3.5"><p className="text-[10px] font-bold text-[#355a4d]">1 · Create on server</p><p className="mt-1 text-[10px] leading-4 text-[#7b8b82]">POST /api/v1/orders with your secret key.</p></div>
                <ArrowRight className="hidden h-4 w-4 text-[#90a99a] sm:block" />
                <div className="rounded-xl bg-[#f5f8f2] p-3.5"><p className="text-[10px] font-bold text-[#355a4d]">2 · Modal or Redirect</p><p className="mt-1 text-[10px] leading-4 text-[#7b8b82]">Open checkout.js modal with Public Key OR redirect to checkoutUrl.</p></div>
                <ArrowRight className="hidden h-4 w-4 text-[#90a99a] sm:block" />
                <div className="rounded-xl bg-[#f5f8f2] p-3.5"><p className="text-[10px] font-bold text-[#355a4d]">3 · Customer pays</p><p className="mt-1 text-[10px] leading-4 text-[#7b8b82]">1-click UPI app switch on phone or QR code on desktop.</p></div>
              </div>
              <div className="border-t border-[#edf0eb] p-5">
                <p className="mb-2 text-xs font-bold text-[#2d5848]">Option A: In-Page Checkout Modal (Recommended)</p>
                <GuideCode label="Frontend HTML / JS · checkout.js SDK" code={CHECKOUT_MODAL_SNIPPET} copied={copied === 'modal'} onCopy={() => copy(CHECKOUT_MODAL_SNIPPET, 'modal')} compact />
              </div>
              <div className="border-t border-[#edf0eb] px-5 py-4 text-[11px] leading-5 text-[#718279]">
                <strong className="text-[#355a4d]">Option B: Hosted Redirect</strong> — You can also directly redirect the customer's browser to <code className="rounded bg-[#f0f4ee] px-1 py-0.5 font-mono text-[10px]">https://poppay.tech/pay/order_...</code>. PopPay manages the 10-minute dynamic UPI collection window and automatically triggers bank reconciliation.
              </div>
            </Panel>
          </GuideSection>

          <GuideSection id="verify-payment" number="05" eyebrow="Trust, not redirects" title="Poll status and verify the signature">
            <div className="rounded-[18px] border border-[#e8dfc6] bg-[#fff8e8] p-4 sm:p-5">
              <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#9a712d]"><Clock3 className="h-4 w-4" /></span><div><h3 className="text-xs font-bold text-[#735c33]">Keep a 10-minute verification grace</h3><p className="mt-1.5 text-[11px] leading-5 text-[#806b43]">Checkout stays open for 10 minutes. A trusted FamApp transfer timestamp is accepted through the following 10-minute verification grace. The email’s Date line is parsed explicitly as Asia/Kolkata (IST) and compared as UTC; server timezone and email delivery delay do not shift that transaction timestamp. Keep your own order awaiting verification through the grace, and fulfil only after a server-verified signed status is <code className="font-mono text-[10px]">PAID</code>.</p></div></div>
            </div>
            <Panel className="overflow-hidden">
              <PanelTitle title="GET /api/v1/checkout/:orderId/status" detail="Public status endpoint; no merchant secret is sent to the customer’s browser." />
              <div className="grid gap-4 p-5 xl:grid-cols-[.85fr_1fr]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#819087]">Response changes by state</p>
                  <ul className="mt-2 space-y-2 text-[11px] leading-5 text-[#718279]">
                    <li><code className="font-mono text-[#355a4d]">PENDING</code> — keep waiting; includes <code>expiresAt</code> and <code>utrSubmitted</code>.</li>
                    <li><code className="font-mono text-[#355a4d]">EXPIRED</code> — checkout window ended; do not infer a failed transfer from this alone.</li>
                    <li><code className="font-mono text-[#355a4d]">PAID</code> — includes <code>payment_id</code>, <code>utr</code>, and <code>signature</code>; verify before fulfilment.</li>
                  </ul>
                  <p className="mt-3 text-[10px] leading-4 text-[#84928a]">The hosted checkout polls every 3 seconds. Your server may poll at a measured interval and stop after PAID or after your verification grace and reconciliation policy.</p>
                </div>
                <GuideCode label="Poll status · server-side" code={POLL_SNIPPET} copied={copied === 'poll'} onCopy={() => copy(POLL_SNIPPET, 'poll')} compact />
              </div>
              <div className="border-t border-[#edf0eb] p-5">
                <div className="mb-3">
                  <h3 className="text-xs font-bold text-[#294b40]">Verify the paid response (Why Signing Secret is needed)</h3>
                  <p className="mt-1 text-[10px] leading-4 text-[#84928a]">
                    Frontend DevTools (<kbd className="font-mono text-[9px] bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded">F12</kbd>) allow users to tamper with JavaScript callbacks or trigger fake redirect URLs. PopPay prevents client-side bypass by generating an unforgeable HMAC-SHA256 signature using your private <code className="font-mono text-[#355a4d]">POPPAY_SIGNING_SECRET</code> over <code className="font-mono text-[#355a4d]">order_id|payment_id</code>. Your backend must recalculate and compare this signature before releasing digital goods.
                  </p>
                </div>
                <GuideCode label="HMAC-SHA256 · signing secret stays in env" code={VERIFY_SNIPPET} copied={copied === 'verify'} onCopy={() => copy(VERIFY_SNIPPET, 'verify')} compact />
              </div>
            </Panel>
            <div className="rounded-xl border border-[#dce8dc] bg-[#edf5eb] px-4 py-3 text-[10px] leading-5 text-[#557866]"><strong className="font-bold text-[#315f4e]">UTR verification path:</strong> the hosted page submits <code className="font-mono">POST /api/v1/checkout/:orderId/utr</code> with <code className="font-mono">{"{ \"utr\": \"12 digits\" }"}</code>. A new report is accepted for review (HTTP 202); a matching verified transfer can return confirmed/PAID. Keep polling status—never fulfil based on the UTR string alone.</div>
          </GuideSection>

          <GuideSection id="webhooks" number="06" eyebrow="Event delivery" title="Set up a signed webhook">
            <Panel className="overflow-hidden">
              <PanelTitle title="payment.success" detail="Configure your HTTPS endpoint in Settings → Webhook destination." action={<Link to="/settings" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#dce5dc] px-3 text-[10px] font-bold text-[#39725a] hover:bg-[#f2f6ef]">Open settings <ExternalLink className="h-3.5 w-3.5" /></Link>} />
              <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#819087]">Payload shape</p>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-[#f4f7f1] p-3.5 font-mono text-[10px] leading-5 text-[#426554]"><code>{`{
  "event": "payment.success",
  "order_id": "order_…",
  "payment_id": "…",
  "utr": "12-digit reference",
  "amount": "248.37",
  "paid_at": "ISO-8601 timestamp"
}`}</code></pre>
                  <ul className="mt-3 space-y-1.5 text-[10px] leading-5 text-[#74847b]">
                    <li>PopPay sends a POST with <code className="font-mono text-[#355a4d]">X-PopPay-Signature</code> (hex HMAC-SHA256).</li>
                    <li>Sign the exact raw request bytes using <code className="font-mono text-[#355a4d]">POPPAY_WEBHOOK_SECRET</code>; do not parse and re-serialize before checking.</li>
                    <li>Return a 2xx promptly. Make event processing idempotent using <code className="font-mono text-[#355a4d]">payment_id</code> or <code className="font-mono text-[#355a4d]">order_id</code>.</li>
                  </ul>
                </div>
                <GuideCode label="Express raw-body HMAC verification" code={WEBHOOK_SNIPPET} copied={copied === 'webhook'} onCopy={() => copy(WEBHOOK_SNIPPET, 'webhook')} compact />
              </div>
              <div className="border-t border-[#edf0eb] bg-[#f8faf6] px-5 py-3 text-[10px] leading-5 text-[#73847a]">Non-2xx responses and timeouts are retried with increasing backoff, up to six delivery attempts. Check Settings → Webhook attempts for response codes and retry history. Status polling remains the reliable reconciliation fallback.</div>
            </Panel>
          </GuideSection>

          <GuideSection id="security" number="07" eyebrow="Production checklist" title="Ship with these safeguards">
            <Panel className="overflow-hidden">
              <div className="divide-y divide-[#edf0eb]">
                {[
                  ['Secrets live only on the server', 'Use a secret manager or protected deployment variables. Never log auth headers, webhook secrets, or signing material.'],
                  ['Verify before fulfilment', 'Confirm PAID using the signed status response or a valid webhook HMAC. Never trust a redirect, query string, iframe message, or UTR report on its own.'],
                  ['Make events idempotent', 'A webhook can be delivered more than once. Store processed payment IDs and make repeated events safe.'],
                  ['Use HTTPS everywhere', 'The API base, customer redirect URL, and webhook receiver should use HTTPS.'],
                  ['Rotate safely', 'Lost or exposed credentials cannot be read back from your profile. Rotate in Settings, replace all three secret environment values, and redeploy; old credentials stop working immediately.'],
                ].map(([title, detail], index) => (
                  <div key={title} className="flex gap-3 px-5 py-4">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#e8f1e5] text-[#4d8060]"><Check className="h-3.5 w-3.5" /></span>
                    <div><h3 className="text-[11px] font-bold text-[#355a4d]">{title}</h3><p className="mt-1 text-[10px] leading-5 text-[#7b8b82]">{detail}</p></div>
                    <span className="ml-auto hidden font-mono text-[9px] text-[#9baa9f] sm:block">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </GuideSection>

          <GuideSection id="troubleshooting" number="08" eyebrow="When something goes wrong" title="Troubleshooting">
            <Panel className="overflow-hidden">
              <div className="divide-y divide-[#edf0eb]">
                {[
                  ['401 · Secret key authentication required', 'Check the Authorization: Bearer header and confirm the server environment contains the current POPPAY_SECRET_KEY. Never send the public key as bearer auth.'],
                  ['409 · Merchant payment details are not ready', 'Add and save a receiving UPI ID in Settings, then retry checkout.'],
                  ['429 · Could not reserve a unique payable amount', 'There may be too many simultaneous pending orders sharing the same base amount. Retry with backoff; do not create repeated checkout links rapidly.'],
                  ['410 · Payment request is too old to verify', 'The verification/report window has closed. Reconcile the transfer against your bank account and contact the merchant before issuing a replacement request.'],
                  ['Webhook signature mismatch', 'Use the exact raw bytes, the current POPPAY_WEBHOOK_SECRET, the X-PopPay-Signature header, and HMAC-SHA256. Check middleware order and avoid JSON re-serialization.'],
                  ['Customer returned, but status is not PAID', 'Keep the order unfulfilled. Poll the status endpoint through the verification grace, then inspect your payments and unmatched transfers in PopPay.'],
                ].map(([title, detail]) => (
                  <details key={title} className="group px-5 py-3.5">
                    <summary className="flex min-h-8 cursor-pointer list-none items-center gap-3 text-[11px] font-bold text-[#355a4d] marker:hidden">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#f1f5ee] text-[#668775] transition-transform group-open:rotate-90"><ArrowRight className="h-3 w-3" /></span>
                      {title}
                    </summary>
                    <p className="ml-8 mt-1.5 max-w-3xl text-[10px] leading-5 text-[#7b8b82]">{detail}</p>
                  </details>
                ))}
              </div>
            </Panel>
          </GuideSection>

          <div className="flex flex-col gap-3 rounded-[18px] border border-[#dce8dc] bg-[#edf5eb] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-bold text-[#355a4d]">Ready to configure your live integration?</p><p className="mt-1 text-[10px] leading-4 text-[#73877b]">Set your HTTPS webhook URL and manage credentials in merchant settings.</p></div>
            <Link to="/settings" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#174e41] px-4 text-[11px] font-bold text-white transition hover:bg-[#0b4f42]">Open settings <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
