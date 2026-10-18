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

const webhookUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Webhook URL must use HTTPS and must not include credentials');

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
