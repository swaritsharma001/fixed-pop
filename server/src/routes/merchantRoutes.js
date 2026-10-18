const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  updateUpi,
  regenerateKeys,
  updateWebhook,
  updateBranding,
  updateProfile,
  changePassword,
  createPaymentLink,
  listPaymentLinks,
} = require('../controllers/merchantController');

const router = express.Router();

router.use(requireAuth);
router.put('/upi', updateUpi);
router.post('/keys/regenerate', regenerateKeys);
router.put('/webhook', updateWebhook);
router.put('/branding', updateBranding);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/payment-links', createPaymentLink);
router.get('/payment-links', listPaymentLinks);

module.exports = router;
