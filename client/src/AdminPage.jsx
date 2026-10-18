import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  getAdminMerchants,
  getAdminOrders,
  getAdminPayments,
  getAdminStats,
  toggleBanMerchant,
  updateAdminProfile,
  updateMerchantByAdmin,
} from './api.js';
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

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('merchants'); // 'merchants' | 'payments' | 'orders' | 'profile'
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Merchants State
  const [merchants, setMerchants] = useState([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [editingMerchant, setEditingMerchant] = useState(null);

  // Platform Payments State
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Platform Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Admin Profile State
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  async function loadStats() {
    setStatsLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadMerchants() {
    setMerchantsLoading(true);
    try {
      const data = await getAdminMerchants();
      setMerchants(data.merchants || []);
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Failed to load merchants' });
    } finally {
      setMerchantsLoading(false);
    }
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    try {
      const data = await getAdminPayments();
      setPayments(data.payments || []);
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Failed to load payments' });
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const data = await getAdminOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Failed to load orders' });
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    loadMerchants();
  }, []);

  useEffect(() => {
    if (activeTab === 'payments' && !payments.length) loadPayments();
    if (activeTab === 'orders' && !orders.length) loadOrders();
  }, [activeTab]);

  async function handleBanToggle(merchant) {
    const action = merchant.isBanned ? 'unban' : 'ban';
    let reason = '';
    if (!merchant.isBanned) {
      reason = window.prompt(`Enter reason for banning ${merchant.name}:`, 'Terms of service violation');
      if (reason === null) return; // user cancelled
    } else {
      if (!window.confirm(`Are you sure you want to unban ${merchant.name}?`)) return;
    }

    try {
      const res = await toggleBanMerchant(merchant.id, {
        isBanned: !merchant.isBanned,
        reason: reason || undefined,
      });
      setMessage({ tone: 'success', text: res.message });
      loadMerchants();
      loadStats();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || `Failed to ${action} merchant` });
    }
  }

  async function handleSaveMerchantEdit(e) {
    e.preventDefault();
    if (!editingMerchant) return;
    try {
      await updateMerchantByAdmin(editingMerchant.id, editingMerchant);
      setMessage({ tone: 'success', text: `Updated merchant ${editingMerchant.name}` });
      setEditingMerchant(null);
      loadMerchants();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Failed to update merchant' });
    }
  }

  async function handleUpdateAdminProfile(e) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ tone: 'error', text: 'New passwords do not match' });
      return;
    }
    setSavingProfile(true);
    setMessage(null);
    try {
      const payload = {};
      if (adminName.trim()) payload.name = adminName.trim();
      if (adminEmail.trim()) payload.email = adminEmail.trim();
      if (currentPassword && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await updateAdminProfile(payload);
      setMessage({ tone: 'success', text: res.message || 'Admin profile updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ tone: 'error', text: err.message || 'Failed to update admin profile' });
    } finally {
      setSavingProfile(false);
    }
  }

  const filteredMerchants = merchants.filter((m) => {
    const q = merchantSearch.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.upiId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          badge="SUPER ADMIN"
          title="Universal Admin Control"
          description="Platform-wide monitoring, all merchant accounts management, user moderation, and full transaction visibility."
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadStats();
              loadMerchants();
              if (activeTab === 'payments') loadPayments();
              if (activeTab === 'orders') loadOrders();
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d6dfd5] bg-white px-3.5 text-xs font-bold text-[#142e2b] shadow-xs hover:bg-[#f6f9f5]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Data
          </button>
        </div>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {/* KPI Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#e2eae1] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b8075]">Total Platform Volume</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dff3e9] text-[#126b58]">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#142e2b]">
            ₹{statsLoading ? '…' : stats?.totalVolume || '0.00'}
          </p>
          <span className="mt-1 block text-[11px] font-medium text-[#7a8f84]">
            Past 24h: ₹{statsLoading ? '…' : stats?.volume24h || '0.00'}
          </span>
        </div>

        <div className="rounded-2xl border border-[#e2eae1] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b8075]">Completed Payments</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e4eef6] text-[#2563eb]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#142e2b]">
            {statsLoading ? '…' : stats?.totalPayments || 0}
          </p>
          <span className="mt-1 block text-[11px] font-medium text-[#7a8f84]">Settled successfully</span>
        </div>

        <div className="rounded-2xl border border-[#e2eae1] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b8075]">Active Merchants</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fbf0df] text-[#b45309]">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#142e2b]">
            {statsLoading ? '…' : stats?.totalMerchants || 0}
          </p>
          <span className="mt-1 block text-[11px] font-medium text-[#7a8f84]">Registered on platform</span>
        </div>

        <div className="rounded-2xl border border-[#e2eae1] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b8075]">Total Orders</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f3e8ff] text-[#7e22ce]">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#142e2b]">
            {statsLoading ? '…' : stats?.totalOrders || 0}
          </p>
          <span className="mt-1 block text-[11px] font-medium text-[#7a8f84]">
            Unmatched: {statsLoading ? '…' : stats?.unmatchedPayments || 0}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e2ebe1] pb-3">
        {[
          { id: 'merchants', label: 'All Merchants & Users', icon: Users },
          { id: 'payments', label: 'Platform Payments', icon: CheckCircle2 },
          { id: 'orders', label: 'Platform Orders', icon: TrendingUp },
          { id: 'profile', label: 'Admin Security & Profile', icon: Shield },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveTab(id);
              setMessage(null);
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === id
                ? 'bg-[#126b58] text-white shadow-xs'
                : 'bg-white text-[#526a5f] hover:bg-[#edf5eb] hover:text-[#142e2b] border border-[#e2ebe1]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: MERCHANTS MANAGEMENT */}
      {activeTab === 'merchants' && (
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#e1e8e1] pb-4">
            <PanelTitle
              icon={Users}
              title="All Registered Merchants"
              subtitle="View, edit, or ban merchant accounts"
            />
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#73887d]" />
              <input
                type="text"
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
                placeholder="Search name, email, UPI…"
                className="h-9 w-full rounded-xl border border-[#d6dfd5] bg-white pl-8 pr-3 text-xs text-[#142e2b] outline-none focus:border-[#126b58]"
              />
            </div>
          </div>

          {merchantsLoading ? (
            <div className="py-12 text-center text-xs text-[#71857a]">Loading all merchants…</div>
          ) : filteredMerchants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No merchants found"
              description="No registered accounts match your search filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e3ebe2] text-[11px] font-bold uppercase tracking-wider text-[#73887d]">
                    <th className="py-3 pl-1 pr-3">Merchant / Store</th>
                    <th className="px-3 py-3">Email Address</th>
                    <th className="px-3 py-3">UPI ID</th>
                    <th className="px-3 py-3">Total Volume</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Registered</th>
                    <th className="py-3 pl-3 pr-1 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3eb]">
                  {filteredMerchants.map((m) => (
                    <tr key={m.id} className="hover:bg-[#f9fbf8]">
                      <td className="py-3.5 pl-1 pr-3">
                        <div className="font-bold text-[#142e2b]">{m.name}</div>
                        <div className="text-[10px] text-[#71877c]">{m.displayName || 'No display name'}</div>
                        {m.role === 'admin' && (
                          <span className="mt-0.5 inline-block rounded-md bg-[#e4efff] px-1.5 py-0.5 text-[9px] font-bold text-[#1d4ed8]">
                            ADMIN
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[#324f44]">{m.email}</td>
                      <td className="px-3 py-3.5 font-mono text-[#436458]">{m.upiId}</td>
                      <td className="px-3 py-3.5">
                        <span className="font-bold text-[#142e2b]">₹{m.totalVolume}</span>
                        <div className="text-[10px] text-[#71877c]">{m.paidCount} payments</div>
                      </td>
                      <td className="px-3 py-3.5">
                        {m.isBanned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fde8e8] px-2.5 py-0.5 text-[11px] font-bold text-[#9b1c1c]">
                            <Ban className="h-3 w-3" /> BANNED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#dff3e9] px-2.5 py-0.5 text-[11px] font-bold text-[#126b58]">
                            <Check className="h-3 w-3" /> ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-[#6c8276]">{formatDate(m.createdAt)}</td>
                      <td className="py-3.5 pl-3 pr-1 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingMerchant({ ...m, password: '' })}
                            title="Edit details"
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d6e3d7] bg-white px-2.5 text-[11px] font-semibold text-[#142e2b] hover:bg-[#edf5eb]"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          {m.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleBanToggle(m)}
                              className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold transition ${
                                m.isBanned
                                  ? 'bg-[#dff3e9] text-[#126b58] hover:bg-[#c7ecd7]'
                                  : 'bg-[#fde8e8] text-[#9b1c1c] hover:bg-[#fbd5d5]'
                              }`}
                            >
                              {m.isBanned ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                              {m.isBanned ? 'Unban' : 'Ban User'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* Edit Merchant Modal */}
      {editingMerchant && (
        <Panel className="border-2 border-[#126b58] bg-[#f9fbf8]">
          <div className="flex items-center justify-between border-b border-[#e1e8e1] pb-3">
            <h3 className="font-[var(--font-display)] text-base font-bold text-[#142e2b]">
              Edit Merchant: {editingMerchant.name}
            </h3>
            <button
              type="button"
              onClick={() => setEditingMerchant(null)}
              className="text-[#64796f] hover:text-[#142e2b]"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSaveMerchantEdit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#4d665b]">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingMerchant.name}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-xs text-[#142e2b]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4d665b]">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingMerchant.email}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, email: e.target.value })}
                  className="mt-1 h-10 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-xs text-[#142e2b]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4d665b]">Receiving UPI ID</label>
                <input
                  type="text"
                  value={editingMerchant.upiId || ''}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, upiId: e.target.value })}
                  placeholder="e.g. store@okaxis"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-xs text-[#142e2b]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4d665b]">Reset Password (optional)</label>
                <input
                  type="password"
                  value={editingMerchant.password || ''}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, password: e.target.value })}
                  placeholder="Leave empty to keep unchanged"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-xs text-[#142e2b]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingMerchant(null)}
                className="rounded-xl border border-[#dce5dc] px-4 py-2 text-xs font-semibold text-[#5a6e64]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#126b58] px-4 py-2 text-xs font-bold text-white hover:bg-[#0e5243]"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* TAB 2: PLATFORM PAYMENTS */}
      {activeTab === 'payments' && (
        <Panel>
          <div className="border-b border-[#e1e8e1] pb-4">
            <PanelTitle
              icon={CheckCircle2}
              title="All Platform Payments"
              subtitle="Every verified bank credit transaction processed across all merchants"
            />
          </div>
          {paymentsLoading ? (
            <div className="py-12 text-center text-xs text-[#71857a]">Loading all platform payments…</div>
          ) : payments.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No payments recorded" description="No successful payments found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e3ebe2] text-[11px] font-bold uppercase tracking-wider text-[#73887d]">
                    <th className="py-3 pl-1 pr-3">Payment ID / Order</th>
                    <th className="px-3 py-3">Merchant</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">12-Digit UTR</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="py-3 pl-3 pr-1">Received Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3eb]">
                  {payments.map((p) => (
                    <tr key={p.paymentId} className="hover:bg-[#f9fbf8]">
                      <td className="py-3.5 pl-1 pr-3 font-mono font-semibold text-[#183930]">
                        <div>{p.orderId}</div>
                        <div className="text-[10px] text-[#7f9389]">{p.paymentId}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="font-bold text-[#142e2b]">{p.merchantName}</div>
                        <div className="font-mono text-[10px] text-[#71877c]">{p.merchantEmail}</div>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-[#126b58]">₹{p.amount}</td>
                      <td className="px-3 py-3.5 font-mono text-[#324f44]">{p.utr}</td>
                      <td className="px-3 py-3.5">
                        <span className="rounded-md bg-[#edf5eb] px-2 py-0.5 text-[10px] font-bold text-[#1e463a]">
                          {p.verificationMethod}
                        </span>
                      </td>
                      <td className="py-3.5 pl-3 pr-1 text-[#6c8276]">{formatDate(p.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* TAB 3: PLATFORM ORDERS */}
      {activeTab === 'orders' && (
        <Panel>
          <div className="border-b border-[#e1e8e1] pb-4">
            <PanelTitle
              icon={TrendingUp}
              title="All Platform Orders"
              subtitle="Every checkout request initiated across all merchants"
            />
          </div>
          {ordersLoading ? (
            <div className="py-12 text-center text-xs text-[#71857a]">Loading all platform orders…</div>
          ) : orders.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No orders found" description="No orders have been created yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e3ebe2] text-[11px] font-bold uppercase tracking-wider text-[#73887d]">
                    <th className="py-3 pl-1 pr-3">Order ID / Item</th>
                    <th className="px-3 py-3">Merchant</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Confirmed UTR</th>
                    <th className="py-3 pl-3 pr-1">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3eb]">
                  {orders.map((o) => (
                    <tr key={o.orderId} className="hover:bg-[#f9fbf8]">
                      <td className="py-3.5 pl-1 pr-3">
                        <div className="font-semibold text-[#142e2b]">{o.receipt}</div>
                        <div className="font-mono text-[10px] text-[#7f9389]">{o.orderId}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="font-bold text-[#142e2b]">{o.merchantName}</div>
                        <div className="font-mono text-[10px] text-[#71877c]">{o.merchantEmail}</div>
                      </td>
                      <td className="px-3 py-3.5 font-bold text-[#142e2b]">₹{o.amount}</td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            o.status === 'PAID'
                              ? 'bg-[#dff3e9] text-[#126b58]'
                              : o.status === 'PENDING'
                              ? 'bg-[#fef3c7] text-[#92400e]'
                              : 'bg-[#f1f5f2] text-[#71857b]'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[#324f44]">{o.utr || '—'}</td>
                      <td className="py-3.5 pl-3 pr-1 text-[#6c8276]">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* TAB 4: ADMIN PROFILE & SECURITY */}
      {activeTab === 'profile' && (
        <Panel>
          <div className="border-b border-[#e1e8e1] pb-4">
            <PanelTitle
              icon={Shield}
              title="Super Admin Profile & Security"
              subtitle="Update your administrator credentials, email, and password"
            />
          </div>
          <form onSubmit={handleUpdateAdminProfile} className="mt-5 max-w-xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#4d665b]">Admin Display Name</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Universal Admin"
                className="mt-1 h-11 w-full rounded-xl border border-[#d6dfd5] bg-white px-3.5 text-xs text-[#142e2b] outline-none focus:border-[#126b58]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4d665b]">Admin Email ID</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@maheshsharma.com"
                className="mt-1 h-11 w-full rounded-xl border border-[#d6dfd5] bg-white px-3.5 text-xs text-[#142e2b] outline-none focus:border-[#126b58]"
              />
            </div>

            <div className="border-t border-[#e3ebe2] pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#526d60]">Change Admin Password</h4>
              <p className="mt-0.5 text-[11px] text-[#7a8f84]">Leave blank if you don't wish to change password.</p>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#4d665b]">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-xs text-[#142e2b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4d665b]">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-xs text-[#142e2b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4d665b]">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-[#d6dfd5] bg-white px-3 text-xs text-[#142e2b]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#126b58] px-6 text-xs font-bold text-white shadow-xs transition hover:bg-[#0e5243] disabled:opacity-50"
              >
                {savingProfile ? 'Updating…' : 'Save Admin Settings'}
              </button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}
