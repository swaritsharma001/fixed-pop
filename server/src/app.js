require('./config');

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes');

const app = express();
app.set('trust proxy', 1);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication requests. Try again later.' },
});

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

function isAllowedOrigin(origin, req) {
  if (!origin) return true;
  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsedOrigin.protocol)) return false;
  if (parsedOrigin.username || parsedOrigin.password) return false;

  const originHost = parsedOrigin.host.toLowerCase();
  const reqHost = (req.get('host') || '').toLowerCase();

  // Same host as API
  if (originHost === reqHost) return true;

  // PopPay domains
  if (
    originHost === 'poppay.tech' ||
    originHost === 'www.poppay.tech' ||
    originHost === 'api.poppay.tech' ||
    originHost.endsWith('.poppay.tech')
  ) {
    return true;
  }

  // Vercel preview and production deployments
  if (originHost.endsWith('.vercel.app')) {
    return true;
  }

  // Local development
  if (
    originHost === 'localhost' ||
    originHost.startsWith('localhost:') ||
    originHost === '127.0.0.1' ||
    originHost.startsWith('127.0.0.1:')
  ) {
    return true;
  }

  // Configured custom origins from env
  const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);

  if (envOrigins.includes(origin.toLowerCase()) || envOrigins.includes(originHost)) {
    return true;
  }

  // Public checkout and payment routes allow any web origin so merchants can embed checkout or integrate from their sites
  const reqPath = req.path || '';
  if (
    reqPath.startsWith('/api/v1/checkout') ||
    reqPath.startsWith('/checkout') ||
    reqPath.startsWith('/pay')
  ) {
    return true;
  }

  return false;
}

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (!origin) return next();

  if (!isAllowedOrigin(origin, req)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.vary('Origin');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Requested-With,Accept,Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
app.use(express.json({ limit: '32kb' }));
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', apiRoutes);
app.use('/checkout.js', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/pay', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  next();
});
const clientDist = path.resolve(__dirname, '../../client/dist');
const docsPath = path.resolve(__dirname, '../../client/public/docs.html');
const distDocsPath = path.resolve(__dirname, '../../client/dist/docs.html');

app.get(['/docs', '/docs.html', '/developer', '/guide', '/api/docs'], (req, res) => {
  const fs = require('fs');
  if (fs.existsSync(distDocsPath)) {
    return res.sendFile(distDocsPath);
  }
  if (fs.existsSync(docsPath)) {
    return res.sendFile(docsPath);
  }
  return res.redirect('/');
});

app.use(express.static(clientDist));
app.get(/^\/(?!api\/|checkout\.js).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.get('/checkout.js', (req, res) => {
  res.type('application/javascript').sendFile(
    path.resolve(__dirname, '../../sdk/checkout.js'),
  );
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({
    error: status >= 500 ? 'Internal server error' : error.message,
  });
});

module.exports = app;
