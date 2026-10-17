require('dotenv').config();

const crypto = require('crypto');
const express = require('express');

const a = "pp_live_14b2324b9be017aeadc154d426387b9719ba"
const b = "pp_secret_459cb88fb739e09b67d798c4aee95efac1638ff1a476513cf0c15b17c09a02d6"
const POPPAY_BASE_URL = "https://d4c86a66-f9ee-49ea-972b-c097102dabfd-00-2ilnlopo2bzm9.sisko.replit.dev"
const POPPAY_SIGNING_SECRET = "pp_sign_2d8eef38e8d415aff6ac42b641ba741755fac63e65da964afc3a2b14080a125e"
const hook = "whsec_1ff9a91bb3c5fee39dcb4489418055e28f2f26a49796a51e8c403f1bf7bbfc1e"

const app = express();
app.use(
  express.json({
    limit: '64kb',
    verify(req, res, buffer) {
      req.rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(express.static('public'));
app.get('/config.js', (req, res) => {
  const baseUrl = POPPAY_BASE_URL.replace(/\/$/, '');
  res.type('application/javascript').send(
    `window.POPPAY_PUBLIC_KEY=${a};window.POPPAY_BASE_URL=${JSON.stringify(baseUrl)};`,
  );
});

app.post('/create-order', async (req, res) => {
  try {
    const response = await fetch(`${POPPAY_BASE_URL.replace(/\/$/, '')}/api/v1/orders`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${b}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: '5.00',
        receipt: `example-${Date.now()}`,
        ...(process.env.MERCHANT_REDIRECT_URL
          ? { redirectUrl: process.env.MERCHANT_REDIRECT_URL }
          : {}),
      }),
    });
    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch {
    return res.status(502).json({ error: 'PopPay could not be reached.' });
  }
});

app.post('/verify-payment', (req, res) => {
  const { order_id: orderId, payment_id: paymentId, signature } = req.body || {};
  if (![orderId, paymentId, signature].every((value) => typeof value === 'string')) {
    return res.status(400).json({ verified: false });
  }
  const expected = crypto
    .createHmac('sha256', POPPAY_SIGNING_SECRET)
    .update(`${orderId}|${paymentId}`, 'utf8')
    .digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, 'hex');
  } catch {
    return res.status(400).json({ verified: false });
  }
  const verified = supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  return res.status(verified ? 200 : 400).json({ verified });
});

app.post('/webhook', (req, res) => {
  const signature = req.get('X-PopPay-Signature') || '';
  const expected = crypto
    .createHmac('sha256', hook)
    .update(req.rawBody || Buffer.alloc(0))
    .digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, 'hex');
  } catch {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }
  return res.json({ received: true, event: req.body?.event || null });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Merchant example listening on port ${port}`);
});
