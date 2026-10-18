const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const ProcessedEmail = require('../models/ProcessedEmail');
const UnmatchedPayment = require('../models/UnmatchedPayment');
const { parseRupeesToPaise, paiseToRupees } = require('../utils/money');
const { paymentExpirySearchLowerBound } = require('../utils/paymentWindow');
const { settleOrderFromVerifiedAlert } = require('./paymentSettlementService');

function chooseMatchingOrder(candidates, utr) {
  const reportedUtrMatches = candidates.filter((order) => order.reportedUtr === utr);
  if (reportedUtrMatches.length === 1) return reportedUtrMatches[0];
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
  if (!/^\d{12}$/.test(String(utr))) {
    throw new TypeError('UTR must contain exactly 12 digits');
  }
  if (!(receivedAt instanceof Date) || Number.isNaN(receivedAt.getTime())) {
    throw new TypeError('Payment time must be a valid date');
  }
  if (await isDuplicateMessageOrUtr(gmailMessageId, utr)) {
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
        [{ merchantId, gmailMessageId, utr, receivedAt }],
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
        // Fallback: match order active when alert was received by system
        candidates = await Order.find({
          merchantId,
          status: { $in: ['PENDING', 'EXPIRED'] },
          payableAmount: amountDecimal,
          createdAt: { $lte: new Date(Date.now() + 59999) },
          expiresAt: { $gte: paymentExpirySearchLowerBound(new Date()) },
        }).session(session);
      }
      const order = chooseMatchingOrder(candidates, utr);

      if (!order) {
        await UnmatchedPayment.create(
          [
            {
              merchantId,
              utr,
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
        utr,
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
