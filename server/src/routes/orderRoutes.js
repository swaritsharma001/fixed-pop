const express = require('express');
const rateLimit = require('express-rate-limit');
const requireSecretKey = require('../middleware/requireSecretKey');
const {
  createOrder,
  getOrder,
  listOrders,
} = require('../controllers/orderController');

const orderCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many order requests. Please slow down.' },
});

const router = express.Router();
router.use(requireSecretKey);
router.post('/', orderCreateLimiter, createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);

module.exports = router;
