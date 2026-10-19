const mongoose = require('mongoose');

const gmailSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true, default: null },
    encryptedRefreshToken: { type: String, default: null, select: false },
    historyId: { type: String, default: null },
  },
  { _id: false },
);

const keysSchema = new mongoose.Schema(
  {
    publicKey: { type: String, default: null },
    secretKeyHash: { type: String, default: null, select: false },
    signingSecretEncrypted: { type: String, default: null, select: false },
  },
  { _id: false },
);

const brandingSchema = new mongoose.Schema(
  {
    displayName: { type: String, default: null, trim: true, maxlength: 120 },
    brandColor: { type: String, default: '#126b58', trim: true, maxlength: 20 },
    checkoutTheme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
    checkoutLayout: { type: String, enum: ['classic', 'banner'], default: 'classic' },
    bannerUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    hostedBy: { type: String, default: null, trim: true, maxlength: 120 },
    hostAvatarUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    hostBadge: { type: String, default: null, trim: true, maxlength: 30 },
    enablePromoBanner: { type: Boolean, default: false },
    promoBannerUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    promoLink: { type: String, default: null, trim: true, maxlength: 2048 },
    promoClaimText: { type: String, default: 'CLAIM NOW', trim: true, maxlength: 50 },
    guaranteeText: { type: String, default: 'Instant Verification Guaranteed', trim: true, maxlength: 120 },
    trustNotice: { type: String, default: null, trim: true, maxlength: 250 },
    logoUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    tagline: { type: String, default: null, trim: true, maxlength: 200 },
    supportEmail: { type: String, default: null, trim: true, maxlength: 254 },
  },
  { _id: false },
);

const merchantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    upiId: { type: String, default: null, trim: true, maxlength: 120 },
    gmail: { type: gmailSchema, default: () => ({}) },
    allowedSenders: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: ['no-reply@famapp.in'],
    },
    keys: { type: keysSchema, default: () => ({}) },
    webhookUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    webhookSecret: { type: String, default: null, select: false },
    branding: { type: brandingSchema, default: () => ({}) },
    role: { type: String, enum: ['merchant', 'admin'], default: 'merchant' },
    isBanned: { type: Boolean, default: false },
    bannedReason: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

merchantSchema.index({ 'keys.publicKey': 1 }, { unique: true, sparse: true });
merchantSchema.index(
  { 'keys.secretKeyHash': 1 },
  { unique: true, sparse: true },
);

module.exports =
  mongoose.models.Merchant || mongoose.model('Merchant', merchantSchema);
