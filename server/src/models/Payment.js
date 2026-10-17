const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    orderId: { type: String, required: true, index: true },
    utr: { type: String, required: true, unique: true, trim: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    gmailMessageId: { type: String, required: true, unique: true, trim: true },
    receivedAt: { type: Date, required: true },
    verificationMethod: {
      type: String,
      enum: ['FAMAPP_EMAIL', 'MERCHANT_MANUAL'],
      default: 'FAMAPP_EMAIL',
      required: true,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ merchantId: 1, receivedAt: -1 });

module.exports =
  mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
