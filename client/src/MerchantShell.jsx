import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  Check,
  CircleHelp,
  Clipboard,
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
  if (!value) throw new Error('useMerchant must be used inside the merchant area');
  return value;
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
      { to: '/integration', label: 'Developer API', icon: Code2 },
    ],
  },
];

function BrandMark({ light = false }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 group" aria-label="PopPay home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" aria-hidden="true">
          <path d="M5 7.5h14M5 12h14M5 16.5h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="18" cy="17" r="3" fill="#a7f3d0" />
        </svg>
      </span>
      <div className="flex items-center gap-1.5">
        <span className={`font-[var(--font-display)] text-[22px] font-bold tracking-[-1.2px] ${light ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          poppay
        </span>
        <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
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
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#6e8a7f]">{group.label}</p>
          <nav className="space-y-1" aria-label={group.label}>
            {group.links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) => `sidebar-link flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399] font-bold'
                    : 'text-[#9cb3a8] hover:bg-white/[.07] hover:text-white'
                }`}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
                <span className="truncate">{label}</span>
                {label === 'Needs matching' && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                )}
                {label === 'Universal Admin' && (
                  <span className="ml-auto rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
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
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#102d27]/65 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="credentials-title" className="max-h-[92dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[26px] bg-[#fffefa] p-5 shadow-2xl sm:rounded-[26px] sm:p-7">
        <div className="mb-5 flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fbefdc] text-[#8b672d]"><KeyRound className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9a712d]">Save these now</p>
            <h2 id="credentials-title" className="mt-1 font-[var(--font-display)] text-[23px] font-semibold tracking-[-.8px] text-[#142e2b]">Your credentials appear once</h2>
          </div>
        </div>
        <div className="mb-5 rounded-xl border border-[#f0d7ac] bg-[#fff8e8] px-4 py-3 text-xs leading-5 text-[#7b602e]">
          Keep these values private. PopPay will not show the secret key, signing secret, or webhook secret again. This copy is held only in this browser tab until you dismiss it.
        </div>
        <div className="space-y-2.5">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[#e3eae2] bg-[#f8faf5] p-3">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#87968d]">{label}</span>
                <button type="button" onClick={() => copyValue(label, value)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-[#126b58] hover:bg-[#e9f3e8]">
                  {copied === label ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  {copied === label ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code className="block break-all font-mono text-xs leading-5 text-[#31564b]">{value}</code>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#126b58] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0b4f42]">
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
    return localStorage.getItem('poppay_theme') || 'light';
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
        <div className="max-w-md rounded-[24px] border border-[#e1e8e1] dark:border-[#1c2e29] bg-[#fffefa] dark:bg-[#111a18] p-7 text-center panel-shadow">
          <CircleHelp className="mx-auto mb-4 h-8 w-8 text-[#b64c3c]" />
          <h1 className="font-[var(--font-display)] text-xl font-semibold text-[#142e2b] dark:text-[#eaf3ee]">We couldn’t load your workspace</h1>
          <p className="mt-2 text-sm leading-6 text-[#71817b] dark:text-[#8ea299]">{loadError}</p>
          <button type="button" onClick={() => { clearSession(); navigate('/login', { replace: true }); }} className="mt-5 rounded-xl bg-[#126b58] px-5 py-3 text-sm font-bold text-white">Back to sign in</button>
        </div>
      </div>
    );
  }
  if (!merchant) return <Navigate to="/login" replace />;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <MerchantContext.Provider value={contextValue}>
        <div className="merchant-shell min-h-[100dvh]">
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col justify-between overflow-y-auto bg-[#091310] border-r border-[#152721] px-4 pb-6 pt-5 custom-scrollbar overscroll-contain lg:flex">
            <div className="flex flex-col">
              <div className="px-2 pt-1"><BrandMark light /></div>
              
              {/* Merchant Workspace Profile Card */}
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3 transition-colors hover:bg-white/[.07]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-[var(--font-display)] text-sm font-bold shadow-xs">
                  {merchant.name ? merchant.name.trim().charAt(0).toUpperCase() : 'M'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-white">{merchant.name}</p>
                  </div>
                  <p className="truncate text-[10px] text-[#8ca499]">{merchant.email || 'Verified Merchant'}</p>
                </div>
              </div>

              <div className="mt-6"><NavItems /></div>
            </div>

            <div className="mt-8 shrink-0 border-t border-white/10 pt-4 space-y-1">
              <button
                type="button"
                onClick={toggleTheme}
                className="sidebar-link flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[#a0b6ac] hover:bg-white/[.07] hover:text-white"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[#fbbf24]" /> : <Moon className="h-4 w-4 text-[#34d399]" />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <Link to="/privacy" className="sidebar-link flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[#a0b6ac] hover:bg-white/[.07] hover:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Privacy & compliance</span>
              </Link>
              <button type="button" onClick={signOut} className="sidebar-link flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[#a0b6ac] transition-colors hover:bg-red-500/10 hover:text-red-400">
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>

          {/* Mobile Top Header */}
          <header className="sticky top-0 z-30 flex h-[62px] items-center justify-between border-b border-slate-200 dark:border-[#1a2d26] bg-white/95 dark:bg-[#091310]/95 px-4 backdrop-blur lg:hidden">
            <BrandMark />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>LIVE</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-700 dark:text-[#cbe3d7] hover:bg-slate-100 dark:hover:bg-white/10"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[#fbbf24]" /> : <Moon className="h-4 w-4 text-emerald-700" />}
              </button>
              <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} className="grid h-9 w-9 place-items-center rounded-xl text-slate-700 dark:text-[#cbe3d7] hover:bg-slate-100 dark:hover:bg-white/10">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 bg-[#06100d]/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
              <div className="h-full w-[min(300px,84vw)] flex flex-col justify-between overflow-y-auto bg-[#091310] border-r border-[#152721] px-4 pb-8 pt-6 shadow-2xl custom-scrollbar overscroll-contain" onClick={(event) => event.stopPropagation()}>
                <div>
                  <div className="mb-6 flex items-center justify-between px-2">
                    <BrandMark light />
                    <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" className="grid h-8 w-8 place-items-center rounded-lg text-white hover:bg-white/10">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-[var(--font-display)] text-xs font-bold">
                      {merchant.name ? merchant.name.trim().charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{merchant.name}</p>
                      <p className="truncate text-[10px] text-[#8ca499]">{merchant.email || 'Verified Merchant'}</p>
                    </div>
                  </div>
                  <NavItems onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="mt-8 shrink-0 border-t border-white/10 pt-4 space-y-1">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="sidebar-link flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[#a0b6ac] hover:bg-white/[.07] hover:text-white"
                  >
                    {theme === 'dark' ? <Sun className="h-4 w-4 text-[#fbbf24]" /> : <Moon className="h-4 w-4 text-[#34d399]" />}
                    <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                  </button>
                  <Link to="/privacy" onClick={() => setMobileOpen(false)} className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[#a0b6ac] hover:bg-white/[.07] hover:text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />Privacy & compliance
                  </Link>
                  <button type="button" onClick={signOut} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold text-[#a0b6ac] transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <LogOut className="h-4 w-4" />Sign out
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="min-h-[calc(100dvh-62px)] lg:pl-[260px] lg:min-h-[100dvh]">
            {/* Desktop Topbar with Realtime Sync Status & Quick Actions */}
            <div className="hidden h-[62px] items-center justify-between border-b border-slate-200/90 dark:border-[#172b24] bg-white/85 dark:bg-[#091310]/85 px-8 backdrop-blur-md lg:flex">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <span>FamApp Bank Sync Active</span>
                </div>
                <span className="text-slate-300 dark:text-[#1c3029]">|</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#7f978c]">Instant UPI listener active</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/payment-links"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-2xs transition active:scale-95"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Create Link</span>
                </Link>
                <Link
                  to="/integration"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#cbe3d7] transition hover:bg-slate-50 dark:hover:bg-white/10"
                >
                  <Code2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>API Docs</span>
                </Link>
                <button
                  type="button"
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[.06] text-slate-700 dark:text-[#cbe3d7] transition hover:bg-slate-50 dark:hover:bg-white/10 shadow-2xs"
                >
                  {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-[#fbbf24]" /> : <Moon className="h-3.5 w-3.5 text-emerald-700" />}
                </button>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-6 sm:px-7 sm:pt-8 lg:px-9 lg:pt-8">
              <Outlet />
            </div>
          </main>

          {/* Clean Mobile Bottom Navigation */}
          <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[64px] items-center justify-around border-t border-slate-200/90 dark:border-[#172b24] bg-white/95 dark:bg-[#091310]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Primary navigation">
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
                className={({ isActive }) => `flex shrink-0 min-w-[56px] flex-col items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold transition-all ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-[#82998e] hover:text-emerald-600'
                }`}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={2} />
                <span className="whitespace-nowrap">{label}</span>
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
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-emerald-600 dark:text-emerald-400">{eyebrow}</p>}
        <h1 className="font-[var(--font-display)] text-[28px] sm:text-[34px] font-bold leading-tight tracking-[-1.3px] text-slate-900 dark:text-white">{title}</h1>
        {detail && <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-[#9bb2a8]">{detail}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <section className={`rounded-[22px] border border-slate-200/90 dark:border-[#1a2d26] bg-white dark:bg-[#0e1714] panel-shadow overflow-hidden transition-colors ${className}`}>{children}</section>;
}

export function PanelTitle({ title, detail, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-[#172b24] px-5 sm:px-6 py-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {detail && <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8ba097]">{detail}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'success', children, onClose }) {
  const tones = {
    success: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300',
    error: 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300',
    warning: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300',
    info: 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300',
  };
  return <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs leading-5 font-medium ${tones[tone]}`}>
    <span className="min-w-0 flex-1">{children}</span>
    {onClose && <button type="button" onClick={onClose} aria-label="Dismiss message" className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>}
  </div>;
}

export function EmptyState({ icon: Icon = Store, title, detail, action }) {
  return (
    <div className="px-5 py-12 text-center sm:py-16">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 dark:bg-[#152520] text-emerald-600 dark:text-emerald-400 shadow-2xs">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h3 className="font-[var(--font-display)] text-lg font-semibold tracking-[-.4px] text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-[#8ea299]">{detail}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/20 p-5">
      <p className="text-sm font-bold text-red-700 dark:text-red-400">We couldn’t load this data</p>
      <p className="mt-1 text-xs leading-5 text-red-600/90 dark:text-red-300">{message || 'Please try again.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 hover:underline">
          <Activity className="h-3.5 w-3.5" />Try again
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const value = String(status || 'unknown').toUpperCase();
  const tone = value === 'PAID' || value === 'SUCCESS' 
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
    : value === 'PENDING' || value === 'CREATED' 
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25'
      : value === 'EXPIRED' || value === 'FAILED' 
        ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/25'
        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider ${tone}`}>
      {(value === 'PAID' || value === 'SUCCESS') && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {(value === 'PENDING' || value === 'CREATED') && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {value}
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
  if (!pages || pages < 2) return <div className="border-t border-[#edf0eb] px-5 py-3 text-[11px] text-[#84928a]">{total ?? 0} records</div>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0eb] px-5 py-3">
      <p className="text-[11px] text-[#84928a]">{total} records · Page {page} of {pages}</p>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-[#e1e8e1] px-3 py-2 text-xs font-semibold text-[#426357] disabled:opacity-40">Previous</button>
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="rounded-lg border border-[#e1e8e1] px-3 py-2 text-xs font-semibold text-[#426357] disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

export function ScreenReaderNavText({ children }) {
  return <span className="sr-only">{children}</span>;
}
