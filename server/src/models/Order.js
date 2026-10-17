const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    orderId: { type: String, required: true, unique: true, index: true },
    receipt: { type: String, required: true, trim: true, maxlength: 120 },
    baseAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    payableAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    status: {
      type: String,
      enum: ['CREATED', 'PENDING', 'PAID', 'EXPIRED'],
      default: 'CREATED',
      required: true,
    },
    redirectUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    utr: { type: String, default: null, trim: true, maxlength: 32 },
    reportedUtr: { type: String, trim: true, minlength: 12, maxlength: 12 },
    reportedUtrAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index(
  { reportedUtr: 1 },
  { unique: true, partialFilterExpression: { reportedUtr: { $type: 'string' } } },
);
orderSchema.index(
  { merchantId: 1, payableAmount: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } },
);
orderSchema.index({ merchantId: 1, status: 1, expiresAt: 1 });
orderSchema.index({ merchantId: 1, createdAt: -1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
