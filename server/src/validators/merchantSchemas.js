const { z } = require('zod');

const upiIdSchema = z
  .string()
  .trim()
  .min(4)
  .max(320)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]{1,254}@[A-Za-z0-9][A-Za-z0-9.-]{1,62}$/,
    'Enter a valid UPI ID such as name@bank',
  );

function isPrivateOrLocalHost(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '169.254.169.254'
    ) {
      return true;
    }
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (ipv4) {
      const a = Number(ipv4[1]);
      const b = Number(ipv4[2]);
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}

const webhookUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) {
        return false;
      }
      return !isPrivateOrLocalHost(value);
    } catch {
      return false;
    }
  }, 'Webhook URL must use HTTPS and cannot point to local or private network addresses');

const upiBodySchema = z.object({ upiId: upiIdSchema }).strict();
const webhookBodySchema = z.object({ webhookUrl: webhookUrlSchema }).strict();

const brandingBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    displayName: z.string().trim().min(2).max(120).optional(),
    brandColor: z
      .string()
      .trim()
      .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color code like #126b58')
      .optional(),
    checkoutTheme: z.enum(['light', 'dark', 'auto']).optional(),
    logoUrl: z
      .string()
      .trim()
      .url('Must be a valid URL starting with http:// or https://')
      .max(2048)
      .nullable()
      .optional()
      .or(z.literal('')),
    tagline: z.string().trim().max(200).nullable().optional().or(z.literal('')),
    supportEmail: z.string().trim().email('Invalid support email address').nullable().optional().or(z.literal('')),
  })
  .strict();

const profileBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    upiId: upiIdSchema.optional(),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

module.exports = {
  upiIdSchema,
  webhookUrlSchema,
  upiBodySchema,
  webhookBodySchema,
  brandingBodySchema,
  profileBodySchema,
  changePasswordSchema,
};
