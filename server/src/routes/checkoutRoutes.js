const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  publicCheckout,
  checkoutStatus,
  checkoutEvents,
  submitCheckoutUtr,
} = require('../controllers/orderController');

const router = express.Router();
const utrReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many UTR submissions. Please try again later.' },
});

router.get('/:orderId', publicCheckout);
router.get('/:orderId/status', checkoutStatus);
// SSE endpoint – browser subscribes once, server pushes payment.success event
router.get('/:orderId/events', checkoutEvents);
router.post('/:orderId/utr', utrReportLimiter, submitCheckoutUtr);

module.exports = router;
