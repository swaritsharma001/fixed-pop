const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Merchant = require('../models/Merchant');
const { generateMerchantCredentials } = require('./credentialService');
const { encryptText } = require('../utils/encryption');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poppay.tech';

async function ensureAdminAccount() {
  try {
    const existing = await Merchant.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log(`[AdminSeed] Upgraded ${ADMIN_EMAIL} to admin role.`);
      }
      return existing;
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword && process.env.NODE_ENV === 'production') {
      console.warn('[AdminSeed] ADMIN_PASSWORD environment variable is not configured. Admin account creation skipped in production.');
      return null;
    }

    const passwordToUse = adminPassword || crypto.randomBytes(16).toString('hex');
    const credentials = await generateMerchantCredentials();
    const admin = new Merchant({
      name: 'Universal Admin',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(passwordToUse, 12),
      role: 'admin',
      keys: {
        publicKey: credentials.publicKey,
        secretKeyHash: credentials.secretKeyHash,
        signingSecretEncrypted: encryptText(credentials.signingSecret),
      },
      webhookSecret: credentials.webhookSecret,
      branding: {
        displayName: 'PopPay Universal Admin',
        brandColor: '#0b4f42',
      },
    });

    await admin.save();
    console.log(`[AdminSeed] Created universal admin account: ${ADMIN_EMAIL}`);
    if (!adminPassword) {
      console.log(`[AdminSeed] Generated temporary password for ${ADMIN_EMAIL}: ${passwordToUse}`);
    }
    return admin;
  } catch (err) {
    console.error('[AdminSeed] Failed to ensure admin account:', err.message || err);
    return null;
  }
}

module.exports = { ensureAdminAccount, ADMIN_EMAIL };
