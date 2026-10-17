const Merchant = require('../models/Merchant');
const Payment = require('../models/Payment');
const WebhookLog = require('../models/WebhookLog');
const { decimalToPaise, paiseToRupees } = require('../utils/money');

async function settleOrderFromVerifiedAlert({
  session,
  merchantId,
  order,
  utr,
  amount,
  gmailMessageId,
  receivedAt,
  unmatchedPayment,
  verificationMethod = 'FAMAPP_EMAIL',
}) {
  const [payment] = await Payment.create(
    [
      {
        merchantId,
        orderId: order.orderId,
        utr,
        amount,
        // Keep the existing globally unique message key populated for manual
        // records; verificationMethod is the audit source of truth.
        gmailMessageId: gmailMessageId || `merchant-manual:${utr}`,
        receivedAt,
        verificationMethod,
      },
    ],
    { session },
  );

  order.status = 'PAID';
  order.paidAt = receivedAt;
  order.utr = utr;
  order.reportedUtr = undefined;
  order.reportedUtrAt = null;
  await order.save({ session });

  if (unmatchedPayment) {
    unmatchedPayment.status = 'CLAIMED';
    await unmatchedPayment.save({ session });
  }

  const merchant = await Merchant.findById(merchantId)
    .select('+webhookSecret')
    .session(session);
  if (merchant?.webhookUrl && merchant.webhookSecret) {
    await WebhookLog.create(
      [
        {
          merchantId,
          orderId: order.orderId,
          payload: {
            event: 'payment.success',
            order_id: order.orderId,
            payment_id: payment.id,
            utr,
            amount: paiseToRupees(decimalToPaise(amount)),
            paid_at: receivedAt.toISOString(),
          },
          attempts: 0,
          nextRetryAt: new Date(),
        },
      ],
      { session },
    );
  }

  return payment;
}

module.exports = { settleOrderFromVerifiedAlert };
