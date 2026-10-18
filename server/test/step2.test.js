const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { signupSchema, loginSchema } = require('../src/validators/authSchemas');
const {
  upiIdSchema,
  webhookUrlSchema,
} = require('../src/validators/merchantSchemas');
const { callbackQuerySchema } = require('../src/validators/gmailSchemas');
const { submitCheckoutUtrSchema } = require('../src/validators/orderSchemas');
const { generateMerchantCredentials } = require('../src/services/credentialService');
const { encryptText, decryptText } = require('../src/utils/encryption');
const { signWebhookBody, retryDelayMs, MAX_ATTEMPTS } = require('../src/services/webhookService');
const app = require('../src/app');
const {
  parseRupeesToPaise,
  paiseToRupees,
  pickUniquePayablePaise,
} = require('../src/utils/money');

test('signup and login validate and normalize email addresses', () => {
  const signup = signupSchema.parse({
    name: '  PopPay Shop ',
    email: ' Owner@Example.com ',
    password: 'correct-horse-battery',
    });
  assert.equal(signup.name, 'PopPay Shop');
  assert.equal(signup.email, 'owner@example.com');
  assert.equal(loginSchema.safeParse({ email: 'bad', password: '' }).success, false);
});

test('UPI IDs accept expected handles and reject malformed values', () => {
  assert.equal(upiIdSchema.safeParse('shop.name@okaxis').success, true);
  assert.equal(upiIdSchema.safeParse('not-a-upi-id').success, false);
});

test('webhook URLs require HTTPS', () => {
  assert.equal(webhookUrlSchema.safeParse('https://merchant.example/hook').success, true);
  assert.equal(webhookUrlSchema.safeParse('http://merchant.example/hook').success, false);
  assert.equal(webhookUrlSchema.safeParse('https://user:pass@merchant.example/hook').success, false);
});

test('customer UTR reports accept exactly 12 digits and reject transaction IDs', () => {
  assert.equal(submitCheckoutUtrSchema.parse({ utr: ' 123456789012 ' }).utr, '123456789012');
  assert.equal(submitCheckoutUtrSchema.safeParse({ utr: '12345' }).success, false);
  assert.equal(submitCheckoutUtrSchema.safeParse({ utr: 'FMPIB-123456' }).success, false);
});

test('Gmail OAuth callback accepts Google response parameters but rejects unknown fields', () => {
  const result = callbackQuerySchema.safeParse({
    code: 'authorization-code',
    state: 'signed-state',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    authuser: '0',
    prompt: 'consent',
    iss: 'https://accounts.google.com',
  });
  assert.equal(result.success, true);
  assert.equal(callbackQuerySchema.safeParse({
    code: 'authorization-code',
    state: 'signed-state',
    unexpected: 'value',
  }).success, false);
});

test('generated credentials have PopPay prefixes and only a SHA-256 digest is stored', async () => {
  const credentials = await generateMerchantCredentials();
  assert.match(credentials.publicKey, /^pp_live_[a-f0-9]{36}$/);
  assert.match(credentials.secretKey, /^pp_secret_[a-f0-9]{64}$/);
  assert.match(credentials.webhookSecret, /^whsec_[a-f0-9]{64}$/);
  const expectedHash = crypto.createHash('sha256').update(credentials.secretKey).digest('hex');
  assert.equal(credentials.secretKeyHash, expectedHash);
  assert.notEqual(credentials.secretKeyHash, credentials.secretKey);
});

test('money conversion uses integer paise and payable suffixes never collide', () => {
  assert.equal(parseRupeesToPaise('499.00'), 49900);
  assert.equal(parseRupeesToPaise(1.5), 150);
  assert.equal(paiseToRupees(49937), '499.37');
  assert.throws(() => parseRupeesToPaise('1.001'));
  assert.throws(() => parseRupeesToPaise('0.99'));

  const basePaise = 49900;
  const used = new Set(Array.from({ length: 98 }, (_, i) => basePaise + i + 1));
  assert.equal(pickUniquePayablePaise(basePaise, used), basePaise + 99);
  used.add(basePaise + 99);
  assert.equal(pickUniquePayablePaise(basePaise, used), null);
});

test('AES-256-GCM encryption round-trips tokens without storing plaintext', () => {
  const previous = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  try {
    const token = `refresh-${crypto.randomBytes(16).toString('hex')}`;
    const encrypted = encryptText(token);
    assert.notEqual(encrypted, token);
    assert.equal(decryptText(encrypted), token);
  } finally {
    if (previous === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = previous;
  }
});

test('webhook signatures use HMAC-SHA256 and retries back off up to six attempts', () => {
  const payload = JSON.stringify({ event: 'payment.success', order_id: 'order_test' });
  const secret = 'test-webhook-secret';
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(signWebhookBody(payload, secret), expected);
  assert.equal(retryDelayMs(1), 1000);
  assert.equal(retryDelayMs(6), 32000);
  assert.equal(MAX_ATTEMPTS, 6);
});

test('auth and merchant routes enforce validation and bearer authentication', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
    const signup = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '198.51.100.24',
      },
      body: JSON.stringify({}),
    });
    assert.equal(signup.status, 400);

    const login = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: '' }),
    });
    assert.equal(login.status, 400);

    const invalidUtr = await fetch(`${baseUrl}/checkout/order_abcdefghijkl/utr`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ utr: 'FMPIB-123456' }),
    });
    assert.equal(invalidUtr.status, 400);

    const profile = await fetch(`${baseUrl}/me`);
    assert.equal(profile.status, 401);

    for (const [path, method, body] of [
      ['/merchant/upi', 'PUT', { upiId: 'shop@bank' }],
      ['/merchant/keys/regenerate', 'POST', undefined],
      ['/merchant/webhook', 'PUT', { webhookUrl: 'https://merchant.example/hook' }],
      ['/merchant/gmail/connect', 'GET', undefined],
      ['/merchant/gmail/disconnect', 'POST', {}],
      ['/merchant/gmail/fetch-latest', 'POST', {}],
      ['/dashboard/stats', 'GET', undefined],
      ['/dashboard/orders', 'GET', undefined],
      ['/payments', 'GET', undefined],
      ['/unmatched', 'GET', undefined],
      ['/reported-utr/order_abcdefghijkl/confirm', 'POST', {
        amount: '25.00',
        received_at: '2026-10-17T12:00:00.000Z',
        verified_in_bank: true,
      }],
      ['/reported-utr/order_abcdefghijkl', 'DELETE', undefined],
      ['/webhooks/logs', 'GET', undefined],
      ['/dev/simulate-payment', 'POST', {}],
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(response.status, 401, `${method} ${path} should require a JWT`);
    }

    const sameOrigin = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Origin: new URL(baseUrl).origin },
    });
    assert.equal(sameOrigin.headers.get('access-control-allow-origin'), new URL(baseUrl).origin);

    const deniedOrigin = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Origin: 'https://untrusted.example' },
    });
    assert.equal(deniedOrigin.status, 403);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
