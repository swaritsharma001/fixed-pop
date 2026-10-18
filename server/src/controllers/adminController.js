const bcrypt = require('bcryptjs');
const Merchant = require('../models/Merchant');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const UnmatchedPayment = require('../models/UnmatchedPayment');
const { decimalToPaise, paiseToRupees } = require('../utils/money');

async function getAdminStats(req, res, next) {
  try {
    const [
      totalMerchants,
      totalOrders,
      totalPaymentsCount,
      payments,
      unmatchedCount,
    ] = await Promise.all([
      Merchant.countDocuments({ role: { $ne: 'admin' } }),
      Order.countDocuments(),
      Payment.countDocuments(),
      Payment.find().select('amount receivedAt createdAt'),
      UnmatchedPayment.countDocuments({ status: 'UNMATCHED' }),
    ]);

    let totalVolumePaise = 0n;
    let volume24hPaise = 0n;
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    for (const p of payments) {
      const pPaise = BigInt(decimalToPaise(p.amount));
      totalVolumePaise += pPaise;
      const pTime = p.receivedAt ? new Date(p.receivedAt).getTime() : new Date(p.createdAt).getTime();
      if (pTime >= oneDayAgo) {
        volume24hPaise += pPaise;
      }
    }

    return res.json({
      totalMerchants,
      totalOrders,
      totalPayments: totalPaymentsCount,
      totalVolume: paiseToRupees(totalVolumePaise),
      volume24h: paiseToRupees(volume24hPaise),
      unmatchedPayments: unmatchedCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function listAllMerchants(req, res, next) {
  try {
    const merchants = await Merchant.find()
      .select('name email upiId role isBanned bannedReason createdAt branding')
      .sort({ createdAt: -1 });

    const merchantIds = merchants.map((m) => m._id);

    // Aggregate order counts and payment totals per merchant
    const [orderAgg, paymentAgg] = await Promise.all([
      Order.aggregate([
        { $match: { merchantId: { $in: merchantIds } } },
        { $group: { _id: '$merchantId', count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { merchantId: { $in: merchantIds } } },
        { $group: { _id: '$merchantId', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
    ]);

    const orderCountMap = new Map(orderAgg.map((o) => [String(o._id), o.count]));
    const paymentMap = new Map(
      paymentAgg.map((p) => [
        String(p._id),
        { count: p.count, total: p.total ? paiseToRupees(decimalToPaise(p.total)) : '0.00' },
      ]),
    );

    const result = merchants.map((m) => {
      const pData = paymentMap.get(String(m._id)) || { count: 0, total: '0.00' };
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        upiId: m.upiId || 'Not set',
        role: m.role || 'merchant',
        isBanned: Boolean(m.isBanned),
        bannedReason: m.bannedReason || null,
        orderCount: orderCountMap.get(String(m._id)) || 0,
        paidCount: pData.count,
        totalVolume: pData.total,
        displayName: m.branding?.displayName || m.name,
        createdAt: m.createdAt,
      };
    });

    return res.json({ merchants: result });
  } catch (error) {
    return next(error);
  }
}

async function toggleBanMerchant(req, res, next) {
  try {
    const { id } = req.params;
    const { isBanned, reason } = req.body;

    const merchant = await Merchant.findById(id);
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    if (merchant.role === 'admin') {
      return res.status(400).json({ error: 'Cannot ban an admin account' });
    }

    merchant.isBanned = typeof isBanned === 'boolean' ? isBanned : !merchant.isBanned;
    merchant.bannedReason = merchant.isBanned ? (reason || 'Violated terms of service') : null;
    await merchant.save();

    return res.json({
      message: merchant.isBanned ? 'Merchant banned successfully' : 'Merchant unbanned successfully',
      merchantId: merchant.id,
      isBanned: merchant.isBanned,
      bannedReason: merchant.bannedReason,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateMerchantByAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, upiId, password } = req.body;

    const merchant = await Merchant.findById(id).select('+passwordHash');
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    if (name) merchant.name = String(name).trim();
    if (email) merchant.email = String(email).trim().toLowerCase();
    if (upiId !== undefined) merchant.upiId = upiId ? String(upiId).trim() : null;
    if (password && String(password).length >= 8) {
      merchant.passwordHash = await bcrypt.hash(String(password), 12);
    }

    await merchant.save();
    return res.json({
      message: 'Merchant updated successfully',
      merchant: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        upiId: merchant.upiId,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return next(error);
  }
}

async function listAllPayments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const [payments, total] = await Promise.all([
      Payment.find()
        .populate('merchantId', 'name email')
        .sort({ receivedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(),
    ]);

    const result = payments.map((p) => ({
      paymentId: p.id,
      orderId: p.orderId,
      utr: p.utr,
      amount: paiseToRupees(decimalToPaise(p.amount)),
      merchantName: p.merchantId?.name || 'Unknown',
      merchantEmail: p.merchantId?.email || 'Unknown',
      merchantId: p.merchantId?._id || p.merchantId,
      receivedAt: p.receivedAt,
      verificationMethod: p.verificationMethod,
    }));

    return res.json({
      payments: result,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
}

async function listAllOrders(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const status = req.query.status;

    const filter = {};
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('merchantId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    const result = orders.map((o) => ({
      orderId: o.orderId,
      receipt: o.receipt,
      amount: paiseToRupees(decimalToPaise(o.payableAmount)),
      status: o.status,
      utr: o.utr || null,
      reportedUtr: o.reportedUtr || null,
      merchantName: o.merchantId?.name || 'Unknown',
      merchantEmail: o.merchantId?.email || 'Unknown',
      expiresAt: o.expiresAt,
      createdAt: o.createdAt,
    }));

    return res.json({
      orders: result,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAdminProfile(req, res, next) {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const admin = await Merchant.findById(req.merchantId).select('+passwordHash');
    if (!admin) return res.status(404).json({ error: 'Account not found' });

    if (currentPassword && newPassword) {
      const match = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!match) return res.status(400).json({ error: 'Current password does not match' });
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      admin.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (name) admin.name = String(name).trim();
    if (email) admin.email = String(email).trim().toLowerCase();

    await admin.save();

    return res.json({
      message: 'Admin profile updated successfully',
      name: admin.name,
      email: admin.email,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    return next(error);
  }
}

module.exports = {
  getAdminStats,
  listAllMerchants,
  toggleBanMerchant,
  updateMerchantByAdmin,
  listAllPayments,
  listAllOrders,
  updateAdminProfile,
};
