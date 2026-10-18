export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (
      hostname === 'poppay.tech' ||
      hostname === 'www.poppay.tech' ||
      hostname.endsWith('.vercel.app')
    ) {
      return 'https://api.poppay.tech';
    }
  }
  return '';
}

export const API_BASE_URL = getApiBaseUrl();

export function buildApiUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function getToken() {
  try {
    return (
      sessionStorage.getItem('poppay:token') ||
      localStorage.getItem('poppay:token') ||
      null
    );
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const { auth = true, ...fetchOptions } = options;
  const headers = {
    ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
    ...fetchOptions.headers,
  };
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(buildApiUrl(path), {
    ...fetchOptions,
    headers,
  });
  if (response.status === 401 && auth) {
    clearSession();
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export function getPublicCheckout(orderId) {
  return request(`/api/v1/checkout/${encodeURIComponent(orderId)}`, { auth: false });
}

export function getCheckoutStatus(orderId) {
  return request(`/api/v1/checkout/${encodeURIComponent(orderId)}/status`, { auth: false });
}

export function submitCheckoutUtr(orderId, utr) {
  return request(
    `/api/v1/checkout/${encodeURIComponent(orderId)}/utr`,
    { ...jsonPost({ utr }), auth: false },
  );
}

function jsonPost(body, method = 'POST') {
  return { method, body: JSON.stringify(body) };
}

export function signup(body) {
  return request('/api/v1/auth/signup', jsonPost(body));
}

export function login(body) {
  return request('/api/v1/auth/login', jsonPost(body));
}

export function getMe() {
  return request('/api/v1/me');
}

export function updateUpi(upiId) {
  return request('/api/v1/merchant/upi', jsonPost({ upiId }, 'PUT'));
}

export function getGmailConnectUrl() {
  return request('/api/v1/merchant/gmail/connect');
}

export function disconnectGmail() {
  return request('/api/v1/merchant/gmail/disconnect', jsonPost({}));
}

export function fetchLatestGmailEmails() {
  return request('/api/v1/merchant/gmail/fetch-latest', jsonPost({}));
}

export function updateAllowedSenders(allowedSenders) {
  return request(
    '/api/v1/merchant/gmail/allowed-senders',
    jsonPost({ allowedSenders }, 'PUT'),
  );
}

export function updateWebhook(webhookUrl) {
  return request('/api/v1/merchant/webhook', jsonPost({ webhookUrl }, 'PUT'));
}

export function updateBranding(data) {
  return request('/api/v1/merchant/branding', jsonPost(data, 'PUT'));
}

export function regenerateKeys() {
  return request('/api/v1/merchant/keys/regenerate', jsonPost({}));
}

export function getDashboardStats() {
  return request('/api/v1/dashboard/stats');
}

export function getDashboardOrders(params = {}) {
  return request(`/api/v1/dashboard/orders${toQuery(params)}`);
}

export function getPayments(params = {}) {
  return request(`/api/v1/payments${toQuery(params)}`);
}

export function getUnmatched(params = {}) {
  return request(`/api/v1/unmatched${toQuery(params)}`);
}

export function claimUnmatched(id, orderId) {
  return request(
    `/api/v1/unmatched/${encodeURIComponent(id)}/claim`,
    jsonPost({ order_id: orderId }),
  );
}

export function confirmReportedUtr(orderId, confirmation) {
  return request(
    `/api/v1/reported-utr/${encodeURIComponent(orderId)}/confirm`,
    jsonPost(confirmation),
  );
}

export function clearReportedUtr(orderId) {
  return request(
    `/api/v1/reported-utr/${encodeURIComponent(orderId)}`,
    { method: 'DELETE' },
  );
}
export function getWebhookLogs() {
  return request('/api/v1/webhooks/logs');
}

export function retryWebhook(id) {
  return request(`/api/v1/webhooks/${encodeURIComponent(id)}/retry`, jsonPost({}));
}

export function updateProfile(data) {
  return request('/api/v1/merchant/profile', jsonPost(data, 'PUT'));
}

export function changePassword(data) {
  return request('/api/v1/merchant/change-password', jsonPost(data, 'PUT'));
}

export function createPaymentLink(data) {
  return request('/api/v1/merchant/payment-links', jsonPost(data));
}

export function getPaymentLinks() {
  return request('/api/v1/merchant/payment-links');
}

// Universal Admin API calls
export function getAdminStats() {
  return request('/api/v1/admin/stats');
}

export function getAdminMerchants() {
  return request('/api/v1/admin/merchants');
}

export function toggleBanMerchant(id, data = {}) {
  return request(`/api/v1/admin/merchants/${encodeURIComponent(id)}/ban`, jsonPost(data));
}

export function updateMerchantByAdmin(id, data) {
  return request(`/api/v1/admin/merchants/${encodeURIComponent(id)}`, jsonPost(data, 'PUT'));
}

export function getAdminPayments(params = {}) {
  return request(`/api/v1/admin/payments${toQuery(params)}`);
}

export function getAdminOrders(params = {}) {
  return request(`/api/v1/admin/orders${toQuery(params)}`);
}

export function updateAdminProfile(data) {
  return request('/api/v1/admin/profile', jsonPost(data, 'PUT'));
}

function toQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export function saveSession(token) {
  try {
    sessionStorage.setItem('poppay:token', token);
    localStorage.setItem('poppay:token', token);
  } catch {}
}

export function clearSession() {
  try {
    sessionStorage.removeItem('poppay:token');
    localStorage.removeItem('poppay:token');
  } catch {}
}

export function hasSession() {
  return Boolean(getToken());
}

export { request };
