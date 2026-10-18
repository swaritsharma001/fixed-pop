import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Clock3,
  Code2,
  Gauge,
  KeyRound,
  Link2,
  LogOut,
  Menu,
  Moon,
  Palette,
  Settings2,
  Shield,
  ShieldCheck,
  Store,
  Sun,
  WalletCards,
  X,
} from 'lucide-react';
import { clearSession, getMe, hasSession } from './api.js';

export const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

const MerchantContext = createContext(null);
const CREDENTIALS_KEY = 'poppay:onboarding-credentials';

export function queueCredentials(credentials) {
  sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
  window.dispatchEvent(new Event('poppay:credentials-updated'));
}

function clearCredentials() {
  sessionStorage.removeItem(CREDENTIALS_KEY);
  window.dispatchEvent(new Event('poppay:credentials-updated'));
}

function readCredentials() {
  try {
    const raw = sessionStorage.getItem(CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    sessionStorage.removeItem(CREDENTIALS_KEY);
    return null;
  }
}

export function useMerchant() {
  const value = useContext(MerchantContext);
  return value || { merchant: null, setMerchant: () => {}, refreshMerchant: () => Promise.resolve(null) };
}

const navGroups = [
  {
    label: 'Overview',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: Gauge, end: true },
      { to: '/payment-links', label: 'Payment Links', icon: Link2 },
    ],
  },
  {
    label: 'Ledger & Finance',
    links: [
      { to: '/orders', label: 'Orders', icon: Clipboard },
      { to: '/payments', label: 'Payments', icon: WalletCards },
      { to: '/unmatched', label: 'Needs matching', icon: Activity },
    ],
  },
  {
    label: 'Store & Developer',
    links: [
      { to: '/branding', label: 'Checkout & Branding', icon: Palette },
      { to: '/settings', label: 'Settings', icon: Settings2 },
      { to: '/docs', label: 'Docs', icon: Code2 },
    ],
  },
];

function BrandMark({ light = false }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 group" aria-label="PopPay home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--pulse-gradient)] text-white shadow-sm transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden="true">
          <path d="M5 7.5h14M5 12h14M5 16.5h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="18" cy="17" r="3" fill="#ffffff" />
        </svg>
      </span>
      <div className="flex items-center gap-1.5">
        <span className="font-[var(--font-display)] text-[22px] font-extrabold tracking-[-0.03em] text-[var(--pulse-ink)]">
          poppay
        </span>
        <span className="rounded-full bg-[var(--pulse-panel-2)] border border-[var(--pulse-line)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--pulse-mint)]">
          PRO
        </span>
      </div>
    </Link>
  );
}

function NavItems({ onNavigate }) {
  const { merchant } = useMerchant();

  const groups = merchant?.role === 'admin'
    ? [
        ...navGroups,
        {
          label: 'Administration',
          links: [
            { to: '/admin', label: 'Universal Admin', icon: ShieldCheck },
          ],
        },
      ]
    : navGroups;

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="pulse-eyebrow mb-2 px-3 text-[10px] font-bold">{group.label}</p>
          <nav className="space-y-1" aria-label={group.label}>
            {group.links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) => `sidebar-link flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-[var(--pulse-panel-2)] text-[var(--pulse-ink)] shadow-[inset_3px_0_0_var(--pulse-pink)] font-bold'
                    : 'text-[var(--pulse-muted)] hover:bg-[var(--pulse-panel-2)] hover:text-[var(--pulse-ink)]'
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
                <span className="truncate">{label}</span>
                {label === 'Needs matching' && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-[var(--pulse-warning)] animate-pulse" />
                )}
                {label === 'Universal Admin' && (
                  <span className="ml-auto rounded-full bg-[var(--pulse-violet)]/15 border border-[var(--pulse-violet)]/25 px-2 py-0.5 text-[9px] font-bold text-[var(--pulse-violet)]">
                    ADMIN
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </div>
  );
}

function CredentialDialog({ credentials, onClose }) {
  const [copied, setCopied] = useState('');
  if (!credentials) return null;
  const fields = [
    ['Public key', credentials.publicKey],
    ['Secret key', credentials.secretKey],
    ['Signing secret', credentials.signingSecret],
    ['Webhook secret', credentials.webhookSecret],
  ].filter(([, value]) => value);

  async function copyValue(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setCopied('');
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="credentials-title" className="max-h-[92dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[22px] bg-[var(--pulse-panel)] border border-[var(--pulse-line)] p-5 shadow-2xl sm:rounded-[22px] sm:p-7">
        <div className="mb-5 flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--pulse-warning)]/15 text-[var(--pulse-warning)]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="pulse-eyebrow text-[10px] text-[var(--pulse-warning)]">Save these now</p>
            <h2 id="credentials-title" className="mt-1 font-[var(--font-display)] text-[22px] font-bold tracking-[-0.02em] text-[var(--pulse-ink)]">Your credentials appear once</h2>
          </div>
        </div>
        <div className="mb-5 rounded-xl border border-[var(--pulse-warning)]/20 bg-[var(--pulse-warning)]/10 px-4 py-3 text-xs leading-5 text-[var(--pulse-warning)] font-medium">
          Keep these values private. PopPay will not show the secret key, signing secret, or webhook secret again. This copy is held only in this browser tab until you dismiss it.
        </div>
        <div className="space-y-2.5">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="pulse-eyebrow text-[10px]">{label}</span>
                <button type="button" onClick={() => copyValue(label, value)} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-[var(--pulse-mint)] hover:bg-[var(--pulse-mint)]/10">
                  {copied === label ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  <span>{copied === label ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="block break-all font-mono text-xs leading-5 text-[var(--pulse-ink)]">{value}</code>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="btn-primary-pulse mt-5 flex min-h-12 w-full items-center justify-center px-5 text-sm">
          I’ve saved my credentials
        </button>
      </section>
    </div>
  );
}

export function PrivateArea() {
  const location = useLocation();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [credentials, setCredentials] = useState(readCredentials);

  async function refreshMerchant() {
    setLoadError('');
    try {
      const result = await getMe();
      setMerchant(result.merchant || result);
      return result.merchant || result;
    } catch (error) {
      setLoadError(error.message || 'Could not load your merchant profile.');
      throw error;
    }
  }

  useEffect(() => {
    let active = true;
    if (!hasSession()) {
      setLoading(false);
      return () => { active = false; };
    }
    getMe()
      .then((result) => {
        if (active) setMerchant(result.merchant || result);
      })
      .catch((error) => {
        if (!active) return;
        clearSession();
        setLoadError(error.message || 'Your session has ended. Please sign in again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const sync = () => setCredentials(readCredentials());
    window.addEventListener('poppay:credentials-updated', sync);
    return () => window.removeEventListener('poppay:credentials-updated', sync);
  }, []);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('poppay_theme') || 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('poppay_theme', theme);
  }, [theme]);

  const contextValue = useMemo(() => ({ merchant, setMerchant, refreshMerchant }), [merchant]);

  function signOut() {
    clearSession();
    clearCredentials();
    navigate('/login', { replace: true });
  }

  if (!hasSession()) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (loading) {
    return (
      <div className="merchant-shell min-h-[100dvh] p-5 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between"><div className="skeleton h-9 w-32 rounded-xl" /><div className="skeleton h-9 w-36 rounded-xl" /></div>
          <div className="skeleton mb-6 h-36 rounded-[24px]" />
          <div className="grid gap-4 md:grid-cols-3"><div className="skeleton h-36 rounded-[22px]" /><div className="skeleton h-36 rounded-[22px]" /><div className="skeleton h-36 rounded-[22px]" /></div>
        </div>
      </div>
    );
  }
  if (loadError && !merchant) {
    return (
      <div className="merchant-shell grid min-h-[100dvh] place-items-center p-6">
        <div className="max-w-md rounded-[22px] border border-[var(--pulse-critical)]/20 bg-[var(--pulse-panel)] p-7 text-center panel-shadow">
          <CircleHelp className="mx-auto mb-4 h-8 w-8 text-[var(--pulse-critical)]" />
          <h1 className="font-[var(--font-display)] text-xl font-bold text-[var(--pulse-ink)]">We couldn’t load your workspace</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--pulse-muted)]">{loadError}</p>
          <button type="button" onClick={() => { clearSession(); navigate('/login', { replace: true }); }} className="btn-primary-pulse mt-5 px-5 py-3 text-sm font-bold">Back to sign in</button>
        </div>
      </div>
    );
  }
  if (!merchant) return <Navigate to="/login" replace />;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <MerchantContext.Provider value={contextValue}>
        <div className="merchant-shell min-h-[100dvh]">
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col justify-between overflow-y-auto bg-[var(--pulse-panel)] border-r border-[var(--pulse-line)] px-4 pb-6 pt-5 custom-scrollbar overscroll-contain lg:flex">
            <div className="flex flex-col">
              <div className="px-2 pt-1"><BrandMark light /></div>
              
              {/* Merchant Workspace Profile Card */}
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-3 transition-colors">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--pulse-gradient)] text-white font-[var(--font-display)] text-sm font-bold shadow-xs">
                  {merchant.name ? merchant.name.trim().charAt(0).toUpperCase() : 'M'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-[var(--pulse-ink)]">{merchant.name}</p>
                  </div>
                  <p className="truncate text-[10px] text-[var(--pulse-muted)]">{merchant.email || 'Verified Merchant'}</p>
                </div>
              </div>

              <div className="mt-6"><NavItems /></div>
            </div>

            <div className="mt-8 shrink-0 border-t border-[var(--pulse-line)] pt-4 space-y-1">
              <button
                type="button"
                onClick={toggleTheme}
                className="sidebar-link flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[var(--pulse-muted)] hover:bg-[var(--pulse-panel-2)] hover:text-[var(--pulse-ink)]"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[var(--pulse-amber)]" /> : <Moon className="h-4 w-4 text-[var(--pulse-violet)]" />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <Link to="/privacy" className="sidebar-link flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[var(--pulse-muted)] hover:bg-[var(--pulse-panel-2)] hover:text-[var(--pulse-ink)]">
                <ShieldCheck className="h-4 w-4 text-[var(--pulse-mint)]" />
                <span>Privacy & compliance</span>
              </Link>
              <button type="button" onClick={signOut} className="sidebar-link flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[var(--pulse-muted)] transition-colors hover:bg-[var(--pulse-critical)]/10 hover:text-[var(--pulse-critical)]">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>

          {/* Mobile Top Header */}
          <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-[var(--pulse-line)] bg-[var(--pulse-panel)]/95 px-4 backdrop-blur lg:hidden">
            <BrandMark />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-[var(--pulse-mint)]/25 bg-[var(--pulse-mint)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--pulse-mint)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--pulse-mint)] animate-ping" />
                <span>LIVE</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="grid h-9 w-9 place-items-center rounded-xl text-[var(--pulse-ink)] hover:bg-[var(--pulse-panel-2)]"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[var(--pulse-amber)]" /> : <Moon className="h-4 w-4 text-[var(--pulse-violet)]" />}
              </button>
              <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} className="grid h-9 w-9 place-items-center rounded-xl text-[var(--pulse-ink)] hover:bg-[var(--pulse-panel-2)]">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
              <div className="h-full w-[min(300px,84vw)] flex flex-col justify-between overflow-y-auto bg-[var(--pulse-panel)] border-r border-[var(--pulse-line)] px-4 pb-8 pt-6 shadow-2xl custom-scrollbar overscroll-contain" onClick={(event) => event.stopPropagation()}>
                <div>
                  <div className="mb-6 flex items-center justify-between px-2">
                    <BrandMark light />
                    <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--pulse-ink)] hover:bg-[var(--pulse-panel-2)]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--pulse-line)] bg-[var(--pulse-panel-2)] p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--pulse-gradient)] text-white font-[var(--font-display)] text-xs font-bold">
                      {merchant.name ? merchant.name.trim().charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[var(--pulse-ink)]">{merchant.name}</p>
                      <p className="truncate text-[10px] text-[var(--pulse-muted)]">{merchant.email || 'Verified Merchant'}</p>
                    </div>
                  </div>
                  <NavItems onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="mt-8 shrink-0 border-t border-[var(--pulse-line)] pt-4 space-y-1">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="sidebar-link flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[var(--pulse-muted)] hover:bg-[var(--pulse-panel-2)] hover:text-[var(--pulse-ink)]"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 text-[var(--pulse-amber)]" /> : <Moon className="h-4 w-4 text-[var(--pulse-violet)]" />}
                    <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                  </button>
                  <Link to="/privacy" onClick={() => setMobileOpen(false)} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[var(--pulse-muted)] hover:bg-[var(--pulse-panel-2)] hover:text-[var(--pulse-ink)]">
                    <ShieldCheck className="h-4 w-4 text-[var(--pulse-mint)]" />Privacy & compliance
                  </Link>
                  <button type="button" onClick={signOut} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[var(--pulse-muted)] transition-colors hover:bg-[var(--pulse-critical)]/10 hover:text-[var(--pulse-critical)]">
                    <LogOut className="h-4 w-4" />Sign out
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="min-h-[calc(100dvh-62px)] lg:pl-[260px] lg:min-h-[100dvh]">
            {/* Desktop Topbar with Realtime Sync Status & Quick Actions */}
            <div className="hidden h-[62px] items-center justify-between border-b border-[var(--pulse-line)] bg-[var(--pulse-panel)]/80 px-8 backdrop-blur-md lg:flex">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-[var(--pulse-positive)]/25 bg-[var(--pulse-positive)]/10 px-3 py-1 text-xs font-semibold text-[var(--pulse-positive)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pulse-mint)] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--pulse-mint)]"></span>
                  </span>
                  <span>FamApp Bank Sync Active</span>
                </div>
                <span className="text-[var(--pulse-muted)] opacity-40">|</span>
                <span className="text-[11px] font-medium text-[var(--pulse-muted)]">Instant UPI listener active</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/payment-links"
                  className="btn-primary-pulse inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Create Link</span>
                </Link>
                <Link
                  to="/docs"
                  className="btn-secondary-pulse inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                >
                  <Code2 className="h-3.5 w-3.5 text-[var(--pulse-mint)]" />
                  <span>Docs</span>
                </Link>
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
                  className="btn-secondary-pulse grid h-8 w-8 place-items-center"
                >
                  {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-[var(--pulse-amber)]" /> : <Moon className="h-3.5 w-3.5 text-[var(--pulse-violet)]" />}
                </button>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-7 sm:pt-8 sm:pb-16 lg:px-9 lg:pt-8 lg:pb-12">
              <Outlet />
            </div>
          </main>

          {/* Clean Mobile Bottom Navigation with Clear Active Indicator */}
          <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[66px] items-center justify-around border-t border-[var(--pulse-line)] bg-[var(--pulse-panel)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md shadow-lg lg:hidden" aria-label="Primary navigation">
            {[
              ['/dashboard', 'Home', Gauge],
              ['/payment-links', 'Links', Link2],
              ['/orders', 'Orders', Clipboard],
              ['/payments', 'Paid', WalletCards],
              ['/settings', 'Settings', Settings2],
            ].map(([to, label, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) => `relative flex shrink-0 min-w-[62px] flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                  isActive
                    ? 'text-[var(--pulse-pink)] bg-[var(--pulse-panel-2)] border border-[var(--pulse-pink)]/20 shadow-xs'
                    : 'text-[var(--pulse-muted)] hover:text-[var(--pulse-ink)]'
                }`}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-[20px] w-[20px]" strokeWidth={isActive ? 2.5 : 1.9} />
                    <span className="whitespace-nowrap">{label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-[var(--pulse-gradient)] shadow-xs" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <CredentialDialog credentials={credentials} onClose={clearCredentials} />
        </div>
      </MerchantContext.Provider>
    </ThemeContext.Provider>
  );
}

export function PageHeading({ eyebrow, title, detail, action }) {
  return (
    <div className="pulse-entrance-header mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="pulse-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-[var(--font-display)] text-[28px] sm:text-[34px] font-extrabold leading-tight tracking-[-0.03em] text-[var(--pulse-ink)]">{title}</h1>
        {detail && <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-[var(--pulse-ink-2)] font-normal">{detail}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({ children, className = '', hero = false }) {
  return <section className={`${hero ? 'pulse-card-hero' : 'pulse-card'} overflow-hidden transition-colors ${className}`}>{children}</section>;
}

export function PanelTitle({ title, detail, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--pulse-line)] px-5 sm:px-6 py-4">
      <div>
        <h2 className="text-sm font-bold text-[var(--pulse-ink)]">{title}</h2>
        {detail && <p className="mt-0.5 text-xs text-[var(--pulse-muted)]">{detail}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'success', children, onClose }) {
  const tones = {
    success: 'border-[var(--pulse-positive)]/25 bg-[var(--pulse-positive)]/10 text-[var(--pulse-positive)]',
    error: 'border-[var(--pulse-critical)]/25 bg-[var(--pulse-critical)]/10 text-[var(--pulse-critical)]',
    warning: 'border-[var(--pulse-warning)]/25 bg-[var(--pulse-warning)]/10 text-[var(--pulse-warning)]',
    info: 'border-[var(--pulse-sky)]/25 bg-[var(--pulse-sky)]/10 text-[var(--pulse-sky)]',
  };
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs leading-5 font-medium ${tones[tone]}`}>
      <span className="min-w-0 flex-1">{children}</span>
      {onClose && <button type="button" onClick={onClose} aria-label="Dismiss message" className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Store, title, detail, action }) {
  return (
    <div className="px-5 py-12 text-center sm:py-16">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--pulse-panel-2)] text-[var(--pulse-pink)] shadow-xs">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h3 className="font-[var(--font-display)] text-lg font-bold tracking-[-0.02em] text-[var(--pulse-ink)]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--pulse-muted)]">{detail}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-[22px] border border-[var(--pulse-critical)]/25 bg-[var(--pulse-critical)]/10 p-5">
      <p className="text-sm font-bold text-[var(--pulse-critical)]">We couldn’t load this data</p>
      <p className="mt-1 text-xs leading-5 text-[var(--pulse-ink-2)]">{message || 'Please try again.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--pulse-critical)] hover:underline">
          <Activity className="h-3.5 w-3.5" />Try again
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const value = String(status || 'unknown').toUpperCase();
  const isPositive = ['PAID', 'SUCCESS', 'ACTIVE', 'SETTLED', 'DELIVERED', 'COMPLETED', 'CONFIRMED'].includes(value);
  const isWarning = ['PENDING', 'CREATED', 'PROCESSING', 'QUEUED'].includes(value);
  const isCritical = ['EXPIRED', 'FAILED', 'REJECTED', 'CANCELLED', 'ERROR'].includes(value);

  const config = isPositive
    ? {
        tone: 'bg-[var(--pulse-positive)]/10 text-[var(--pulse-positive)] border border-[var(--pulse-positive)]/25',
        Icon: ArrowUpRight,
      }
    : isWarning
      ? {
          tone: 'bg-[var(--pulse-warning)]/10 text-[var(--pulse-warning)] border border-[var(--pulse-warning)]/25',
          Icon: Clock3,
        }
      : isCritical
        ? {
            tone: 'bg-[var(--pulse-critical)]/10 text-[var(--pulse-critical)] border border-[var(--pulse-critical)]/25',
            Icon: X,
          }
        : {
            tone: 'bg-[var(--pulse-panel-2)] text-[var(--pulse-muted)] border border-[var(--pulse-line)]',
            Icon: Clock3,
          };

  const { tone, Icon } = config;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide transition-colors ${tone}`}>
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
      <span>{value}</span>
    </span>
  );
}

export function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
}

export function formatDate(value, options = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: options.dateStyle || 'medium', ...(options.time ? { timeStyle: 'short' } : {}) }).format(date);
}

export function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages < 2) {
    return (
      <div className="border-t border-[var(--pulse-line)] px-5 py-3 text-xs text-[var(--pulse-muted)] font-medium">
        {total ?? 0} {total === 1 ? 'record' : 'records'} total
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pulse-line)] px-5 sm:px-6 py-3.5">
      <p className="text-xs text-[var(--pulse-muted)] font-medium">
        Showing <span className="font-bold text-[var(--pulse-ink)]">{total}</span> records · Page <span className="font-bold text-[var(--pulse-ink)]">{page}</span> of {pages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="btn-secondary-pulse inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="btn-secondary-pulse inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ScreenReaderNavText({ children }) {
  return <span className="sr-only">{children}</span>;
}
