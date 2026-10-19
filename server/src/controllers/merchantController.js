const bcrypt = require('bcryptjs');
const Merchant = require('../models/Merchant');
const Order = require('../models/Order');
const { generateMerchantCredentials } = require('../services/credentialService');
const { createPendingOrder } = require('../services/orderService');
const { validationError } = require('./authController');
const {
  upiBodySchema,
  webhookBodySchema,
  brandingBodySchema,
  profileBodySchema,
  changePasswordSchema,
} = require('../validators/merchantSchemas');
const { createOrderSchema } = require('../validators/orderSchemas');
const { decimalToPaise, paiseToRupees } = require('../utils/money');
const { encryptText } = require('../utils/encryption');

async function updateUpi(req, res, next) {
  const parsed = upiBodySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });
    merchant.upiId = parsed.data.upiId;
    await merchant.save();
    return res.json({ upiId: merchant.upiId });
  } catch (error) {
    return next(error);
  }
}

async function regenerateKeys(req, res, next) {
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });

    const credentials = await generateMerchantCredentials();
    merchant.keys = {
      publicKey: credentials.publicKey,
      secretKeyHash: credentials.secretKeyHash,
      signingSecretEncrypted: encryptText(credentials.signingSecret),
    };
    merchant.webhookSecret = credentials.webhookSecret;
    await merchant.save();

    return res.json({
      message: 'Credentials replaced. Save these values; the secret key and webhook secret are shown only once.',
      credentials: {
        publicKey: credentials.publicKey,
        secretKey: credentials.secretKey,
        signingSecret: credentials.signingSecret,
        webhookSecret: credentials.webhookSecret,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateWebhook(req, res, next) {
  const parsed = webhookBodySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });
    merchant.webhookUrl = parsed.data.webhookUrl;
    await merchant.save();
    return res.json({ webhookUrl: merchant.webhookUrl });
  } catch (error) {
    return next(error);
  }
}

async function updateBranding(req, res, next) {
  const parsed = brandingBodySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });

    const nameToSet = parsed.data.name || parsed.data.displayName || merchant.name;
    merchant.name = nameToSet;
    merchant.branding = {
      displayName: parsed.data.displayName || nameToSet,
      brandColor: parsed.data.brandColor || merchant.branding?.brandColor || '#126b58',
      checkoutTheme: parsed.data.checkoutTheme || merchant.branding?.checkoutTheme || 'light',
      checkoutLayout: parsed.data.checkoutLayout || merchant.branding?.checkoutLayout || 'classic',
      bannerUrl: parsed.data.bannerUrl !== undefined ? (parsed.data.bannerUrl || null) : (merchant.branding?.bannerUrl || null),
      hostedBy: parsed.data.hostedBy !== undefined ? (parsed.data.hostedBy || null) : (merchant.branding?.hostedBy || null),
      hostAvatarUrl: parsed.data.hostAvatarUrl !== undefined ? (parsed.data.hostAvatarUrl || null) : (merchant.branding?.hostAvatarUrl || null),
      hostBadge: parsed.data.hostBadge !== undefined ? (parsed.data.hostBadge || null) : (merchant.branding?.hostBadge || null),
      enablePromoBanner: parsed.data.enablePromoBanner !== undefined ? Boolean(parsed.data.enablePromoBanner) : Boolean(merchant.branding?.enablePromoBanner),
      promoBannerUrl: parsed.data.promoBannerUrl !== undefined ? (parsed.data.promoBannerUrl || null) : (merchant.branding?.promoBannerUrl || null),
      promoLink: parsed.data.promoLink !== undefined ? (parsed.data.promoLink || null) : (merchant.branding?.promoLink || null),
      promoClaimText: parsed.data.promoClaimText !== undefined ? (parsed.data.promoClaimText || 'CLAIM NOW') : (merchant.branding?.promoClaimText || 'CLAIM NOW'),
      guaranteeText: parsed.data.guaranteeText !== undefined ? (parsed.data.guaranteeText || 'Instant Verification Guaranteed') : (merchant.branding?.guaranteeText || 'Instant Verification Guaranteed'),
      trustNotice: parsed.data.trustNotice !== undefined ? (parsed.data.trustNotice || null) : (merchant.branding?.trustNotice || null),
      logoUrl: parsed.data.logoUrl !== undefined ? (parsed.data.logoUrl || null) : (merchant.branding?.logoUrl || null),
      tagline: parsed.data.tagline !== undefined ? (parsed.data.tagline || null) : (merchant.branding?.tagline || null),
      supportEmail: parsed.data.supportEmail !== undefined ? (parsed.data.supportEmail || null) : (merchant.branding?.supportEmail || null),
    };
    await merchant.save();

    return res.json({
      name: merchant.name,
      branding: merchant.branding,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  const parsed = profileBodySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });

    if (parsed.data.name) merchant.name = parsed.data.name;
    if (parsed.data.upiId) merchant.upiId = parsed.data.upiId;
    await merchant.save();

    return res.json({
      name: merchant.name,
      upiId: merchant.upiId,
      email: merchant.email,
    });
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const merchant = await Merchant.findById(req.merchantId).select('+passwordHash');
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });

    const isMatch = await bcrypt.compare(parsed.data.currentPassword, merchant.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password does not match' });
    }

    merchant.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await merchant.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
}

async function createPaymentLink(req, res, next) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });
    if (!merchant.upiId) {
      return res.status(400).json({ error: 'Please configure your UPI ID before creating payment links' });
    }

    const order = await createPendingOrder({
      merchantId: merchant.id,
      amountPaise: parsed.data.amount,
      receipt: parsed.data.receipt,
      redirectUrl: parsed.data.redirectUrl,
    });

    return res.status(201).json({
      orderId: order.orderId,
      receipt: order.receipt,
      baseAmount: paiseToRupees(decimalToPaise(order.baseAmount)),
      payableAmount: paiseToRupees(decimalToPaise(order.payableAmount)),
      status: order.status,
      expiresAt: order.expiresAt,
      checkoutUrl: `/pay/${order.orderId}`,
    });
  } catch (error) {
    return next(error);
  }
}

async function listPaymentLinks(req, res, next) {
  try {
    const orders = await Order.find({ merchantId: req.merchantId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      paymentLinks: orders.map((order) => ({
        orderId: order.orderId,
        receipt: order.receipt,
        baseAmount: paiseToRupees(decimalToPaise(order.baseAmount)),
        payableAmount: paiseToRupees(decimalToPaise(order.payableAmount)),
        status: order.status,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt,
        utr: order.utr,
        checkoutUrl: `/pay/${order.orderId}`,
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  updateUpi,
  regenerateKeys,
  updateWebhook,
  updateBranding,
  updateProfile,
  changePassword,
  createPaymentLink,
  listPaymentLinks,
};
