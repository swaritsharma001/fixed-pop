const express = require('express');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/requireAuth');
const {
  connect,
  callback,
  disconnect,
  updateAllowedSenders,
  fetchLatest,
} = require('../controllers/gmailController');

const router = express.Router();
router.get('/connect', requireAuth, connect);
router.get('/callback', callback);
router.post('/disconnect', requireAuth, disconnect);
router.put('/allowed-senders', requireAuth, updateAllowedSenders);
router.post(
  '/fetch-latest',
  requireAuth,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 6,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many manual Gmail fetches. Please try again later.' },
  }),
  fetchLatest,
);

module.exports = router;
