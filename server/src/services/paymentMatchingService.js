const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const ProcessedEmail = require('../models/ProcessedEmail');
const UnmatchedPayment = require('../models/UnmatchedPayment');
const { parseRupeesToPaise, paiseToRupees } = require('../utils/money');
const { paymentExpirySearchLowerBound } = require('../utils/paymentWindow');
const { settleOrderFromVerifiedAlert } = require('./paymentSettlementService');

function chooseMatchingOrder(candidates, utr, amountDecimal = null) {
  const reportedUtrMatches = candidates.filter((order) => order.reportedUtr === utr);
  if (reportedUtrMatches.length === 1) return reportedUtrMatches[0];
  if (amountDecimal) {
    const exactPayable = candidates.filter(
      (order) => order.payableAmount && order.payableAmount.toString() === amountDecimal.toString(),
    );
    if (exactPayable.length === 1) return exactPayable[0];
  }
  if (candidates.length === 1) return candidates[0];
  return null;
}

async function isDuplicateMessageOrUtr(gmailMessageId, utr) {
  // Only consider exact gmailMessageId as hard duplicate – prevents double-processing the
  // same raw email object even if the worker loop re-queues it.
  // UTR conflicts are checked inside the transaction to allow the same UTR to appear in a
  // legitimately re-sent payment notification email with a different gmailMessageId.
  const [processed, payment, unmatched] = await Promise.all([
    ProcessedEmail.exists({ gmailMessageId }),
    Payment.exists({ gmailMessageId }),
    UnmatchedPayment.exists({ gmailMessageId }),
  ]);
  return Boolean(processed || payment || unmatched);
}

async function matchIncomingPayment({
  merchantId,
  gmailMessageId,
  amount,
  utr,
  receivedAt,
}) {
  const amountPaise = parseRupeesToPaise(amount);
  const utrString = String(utr || '').trim();
  if (!utrString) {
    throw new TypeError('UTR or transaction reference is required');
  }
  if (!(receivedAt instanceof Date) || Number.isNaN(receivedAt.getTime())) {
    throw new TypeError('Payment time must be a valid date');
  }
  if (await isDuplicateMessageOrUtr(gmailMessageId, utrString)) {
    return { matched: false, duplicate: true };
  }

  const amountDecimal = mongoose.Types.Decimal128.fromString(
    paiseToRupees(amountPaise),
  );
  const session = await mongoose.startSession();
  let matchResult = null;

  try {
    await session.withTransaction(async () => {
      const alreadyProcessed = await ProcessedEmail.findOne({ gmailMessageId }).session(session);
      const alreadyPaid = await Payment.findOne({ gmailMessageId }).session(session);
      const alreadyUnmatched = await UnmatchedPayment.findOne({ gmailMessageId }).session(session);
      if (alreadyProcessed || alreadyPaid || alreadyUnmatched) {
        matchResult = { matched: false, duplicate: true };
        return;
      }
      await ProcessedEmail.create(
        [{ merchantId, gmailMessageId, utr: utrString, receivedAt }],
        { session },
      );

      const minuteTolerance = (receivedAt.getSeconds() === 0 && receivedAt.getMilliseconds() === 0) ? 59999 : 0;
      let candidates = await Order.find({
        merchantId,
        status: { $in: ['PENDING', 'EXPIRED'] },
        payableAmount: amountDecimal,
        createdAt: { $lte: new Date(receivedAt.getTime() + minuteTolerance) },
        expiresAt: { $gte: paymentExpirySearchLowerBound(receivedAt) },
      }).session(session);

      if (!candidates.length) {
        // Fallback 1: match by baseAmount if order used a unique paise suffix (e.g. ₹3.00 base, ₹3.02 payable)
        candidates = await Order.find({
          merchantId,
          status: { $in: ['PENDING', 'EXPIRED'] },
          baseAmount: amountDecimal,
          createdAt: { $lte: new Date(receivedAt.getTime() + minuteTolerance) },
          expiresAt: { $gte: paymentExpirySearchLowerBound(receivedAt) },
        }).session(session);
      }

      if (!candidates.length) {
        // Fallback 2: match order active when alert was received by system (by payableAmount or baseAmount)
        candidates = await Order.find({
          merchantId,
          status: { $in: ['PENDING', 'EXPIRED'] },
          $or: [
            { payableAmount: amountDecimal },
            { baseAmount: amountDecimal },
          ],
          createdAt: { $lte: new Date(Date.now() + 59999) },
          expiresAt: { $gte: paymentExpirySearchLowerBound(new Date()) },
        }).session(session);
      }

      if (!candidates.length && utrString) {
        // Fallback 3: if customer explicitly reported this UTR or transaction ID on checkout
        const reportedOrder = await Order.findOne({
          merchantId,
          status: { $in: ['PENDING', 'EXPIRED'] },
          reportedUtr: utrString,
          expiresAt: { $gte: paymentExpirySearchLowerBound(receivedAt) },
        }).session(session);
        if (reportedOrder) {
          candidates = [reportedOrder];
        }
      }

      const order = chooseMatchingOrder(candidates, utrString, amountDecimal);

      if (!order) {
        await UnmatchedPayment.create(
          [
            {
              merchantId,
              utr: utrString,
              amount: amountDecimal,
              gmailMessageId,
              receivedAt,
              status: 'UNMATCHED',
            },
          ],
          { session },
        );
        matchResult = { matched: false, unmatched: true };
        return;
      }

      const payment = await settleOrderFromVerifiedAlert({
        session,
        merchantId,
        order,
        utr: utrString,
        amount: amountDecimal,
        gmailMessageId,
        receivedAt,
      });

      matchResult = { matched: true, orderId: order.orderId, paymentId: payment.id };
    });
  } catch (error) {
    if (error.code === 11000) return { matched: false, duplicate: true };
    throw error;
  } finally {
    await session.endSession();
  }

  // After the DB transaction commits, push instant SSE update to any connected checkout browser.
  if (matchResult?.matched) {
    try {
      const { notifyOrderUpdate } = require('./sseService');
      notifyOrderUpdate(matchResult.orderId, { status: 'PAID', payment_id: matchResult.paymentId });
    } catch {
      // Best-effort; browser falls back to polling on next interval.
    }
  }

  return matchResult || { matched: false, duplicate: true };
}

async function reconcileUnmatchedPayments() {
  const unmatchedList = await UnmatchedPayment.find({ status: 'UNMATCHED' });
  if (!unmatchedList.length) return;

  for (const unmatched of unmatchedList) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await UnmatchedPayment.findOne({
          _id: unmatched._id,
          status: 'UNMATCHED',
        }).session(session);
        if (!current) return;

        const minuteTolerance =
          unmatched.receivedAt.getSeconds() === 0 &&
          unmatched.receivedAt.getMilliseconds() === 0
            ? 59999
            : 0;

        let candidates = await Order.find({
          merchantId: unmatched.merchantId,
          status: { $in: ['PENDING', 'EXPIRED'] },
          payableAmount: unmatched.amount,
          createdAt: { $lte: new Date(unmatched.receivedAt.getTime() + minuteTolerance) },
          expiresAt: { $gte: paymentExpirySearchLowerBound(unmatched.receivedAt) },
        }).session(session);

        if (!candidates.length && unmatched.createdAt) {
          candidates = await Order.find({
            merchantId: unmatched.merchantId,
            status: { $in: ['PENDING', 'EXPIRED'] },
            payableAmount: unmatched.amount,
            createdAt: { $lte: new Date(unmatched.createdAt.getTime() + 59999) },
            expiresAt: { $gte: paymentExpirySearchLowerBound(unmatched.createdAt) },
          }).session(session);
        }

        const order = chooseMatchingOrder(candidates, unmatched.utr);
        if (!order) return;

        await settleOrderFromVerifiedAlert({
          session,
          merchantId: order.merchantId,
          order,
          utr: unmatched.utr,
          amount: unmatched.amount,
          gmailMessageId: unmatched.gmailMessageId,
          receivedAt: unmatched.receivedAt,
          unmatchedPayment: current,
        });
      });
    } catch {
      // Ignore concurrent lock conflicts; will retry next cycle
    } finally {
      await session.endSession();
    }
  }
}

module.exports = {
  matchIncomingPayment,
  isDuplicateMessageOrUtr,
  chooseMatchingOrder,
  reconcileUnmatchedPayments,
};
