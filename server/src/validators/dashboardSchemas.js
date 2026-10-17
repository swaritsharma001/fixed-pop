const { z } = require('zod');
const { parseRupeesToPaise } = require('../utils/money');

const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

const claimUnmatchedSchema = z
  .object({
    order_id: z.string().regex(/^order_[A-Za-z0-9_-]{12}$/),
  })
  .strict();

const claimUnmatchedParamsSchema = z
  .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
  .strict();

const reportedUtrParamsSchema = z
  .object({ orderId: z.string().regex(/^order_[A-Za-z0-9_-]{12}$/) })
  .strict();

const reportedUtrConfirmationSchema = z
  .object({
    amount: z
      .string()
      .trim()
      .regex(/^\d+(?:\.\d{1,2})?$/, 'Amount must have at most two decimal places')
      .refine((value) => {
        try {
          parseRupeesToPaise(value);
          return true;
        } catch {
          return false;
        }
      }, 'Enter a valid transfer amount')
      .transform(parseRupeesToPaise),
    received_at: z.string().datetime().transform((value) => new Date(value)),
    verified_in_bank: z.literal(true),
  })
  .strict();

module.exports = {
  paginationQuerySchema,
  claimUnmatchedSchema,
  claimUnmatchedParamsSchema,
  reportedUtrParamsSchema,
  reportedUtrConfirmationSchema,
};
