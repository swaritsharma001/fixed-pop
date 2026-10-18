const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const {
  decimalToPaise,
  paiseToRupees,
  pickUniquePayablePaise,
} = require('../utils/money');

function createOrderId() {
  return `order_${crypto.randomBytes(9).toString('base64url')}`;
}

async function createPendingOrder({ merchantId, amountPaise, receipt, redirectUrl, expiresInMins }) {
  await Order.updateMany(
    { merchantId, status: 'PENDING', expiresAt: { $lte: new Date() } },
    { $set: { status: 'EXPIRED' } },
  );
  const baseAmount = paiseToRupees(amountPaise);
  const durationMs = Number.isInteger(expiresInMins) && expiresInMins > 0
    ? expiresInMins * 60 * 1000
    : 10 * 60 * 1000;
  const expiresAt = new Date(Date.now() + durationMs);

  // 1. Prioritize exact amount so ₹5.00 stays exactly ₹5.00
  const exactOccupied = await Order.exists({
    merchantId,
    status: 'PENDING',
    payableAmount: mongoose.Types.Decimal128.fromString(baseAmount),
  });

  if (!exactOccupied) {
    const order = new Order({
      merchantId,
      orderId: createOrderId(),
      receipt,
      baseAmount,
      payableAmount: baseAmount,
      status: 'PENDING',
      redirectUrl: redirectUrl || null,
      expiresAt,
    });

    try {
      await order.save();
      return order;
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Concurrent race occupied exact amount; fallback to offset below
    }
  }

  // 2. Only if exact amount is already occupied by a simultaneous active order, use unique paise suffix
  const minPayable = mongoose.Types.Decimal128.fromString(
    paiseToRupees(amountPaise + 1),
  );
  const maxPayable = mongoose.Types.Decimal128.fromString(
    paiseToRupees(amountPaise + 99),
  );
  const occupied = await Order.find({
    merchantId,
    status: 'PENDING',
    payableAmount: { $gte: minPayable, $lte: maxPayable },
  }).select('payableAmount');
  const usedPaise = new Set(occupied.map((order) => decimalToPaise(order.payableAmount)));
  const startingOffset = crypto.randomInt(0, 99);
  const attemptedPaise = new Set();

  for (let attempt = 0; attempt < 99; attempt += 1) {
    const payablePaise = pickUniquePayablePaise(
      amountPaise,
      new Set([...usedPaise, ...attemptedPaise]),
      (startingOffset + attempt) % 99,
    );
    if (payablePaise === null) break;
    attemptedPaise.add(payablePaise);

    const order = new Order({
      merchantId,
      orderId: createOrderId(),
      receipt,
      baseAmount,
      payableAmount: paiseToRupees(payablePaise),
      status: 'PENDING',
      redirectUrl: redirectUrl || null,
      expiresAt,
    });

    try {
      await order.save();
      return order;
    } catch (error) {
      // The partial unique index is the final authority when concurrent creates race.
      if (error.code === 11000) {
        usedPaise.add(payablePaise);
        continue;
      }
      throw error;
    }
  }

  const refreshed = await Order.find({
    merchantId,
    status: 'PENDING',
    payableAmount: { $gte: minPayable, $lte: maxPayable },
  }).select('payableAmount');
  const allUsed = new Set(refreshed.map((order) => decimalToPaise(order.payableAmount)));
  if (allUsed.size >= 99) {
    const firstCandidate = amountPaise + 1;
    if (Array.from({ length: 99 }, (_, i) => firstCandidate + i).every((n) => allUsed.has(n))) {
      const error = new Error('All unique payable amounts are currently in use');
      error.status = 429;
      throw error;
    }
  }

  const error = new Error('Could not reserve a unique payable amount; please retry');
  error.status = 429;
  throw error;
}

module.exports = { createOrderId, createPendingOrder };
