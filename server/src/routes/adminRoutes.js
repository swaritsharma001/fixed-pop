const express = require('express');
const { requireAdmin } = require('../middleware/requireAuth');
const {
  getAdminStats,
  listAllMerchants,
  toggleBanMerchant,
  updateMerchantByAdmin,
  listAllPayments,
  listAllOrders,
  updateAdminProfile,
} = require('../controllers/adminController');

const router = express.Router();

router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/merchants', listAllMerchants);
router.post('/merchants/:id/ban', toggleBanMerchant);
router.put('/merchants/:id', updateMerchantByAdmin);
router.get('/payments', listAllPayments);
router.get('/orders', listAllOrders);
router.put('/profile', updateAdminProfile);

module.exports = router;
