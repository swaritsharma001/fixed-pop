const test = require('node:test');
const assert = require('node:assert/strict');
const {
  reportedUtrConfirmationSchema,
  reportedUtrParamsSchema,
} = require('../src/validators/dashboardSchemas');

test('manual UTR confirmation requires an explicit bank verification and parses exact amounts', () => {
  const parsed = reportedUtrConfirmationSchema.safeParse({
    amount: '1234.56',
    received_at: '2026-10-17T12:30:00.000Z',
    verified_in_bank: true,
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.amount, 123456);
  assert.equal(parsed.data.received_at.toISOString(), '2026-10-17T12:30:00.000Z');
});

test('manual UTR confirmation rejects unchecked, invalid amount, and timezone-less details', () => {
  const confirmation = {
    amount: '1234.56',
    received_at: '2026-10-17T12:30:00.000Z',
    verified_in_bank: true,
  };

  assert.equal(
    reportedUtrConfirmationSchema.safeParse({ ...confirmation, verified_in_bank: false }).success,
    false,
  );
  assert.equal(
    reportedUtrConfirmationSchema.safeParse({ ...confirmation, amount: '1234.567' }).success,
    false,
  );
  assert.equal(
    reportedUtrConfirmationSchema.safeParse({
      ...confirmation,
      received_at: '2026-10-17T12:30',
    }).success,
    false,
  );
});

test('manual UTR confirmation accepts only valid merchant order IDs', () => {
  assert.equal(reportedUtrParamsSchema.safeParse({ orderId: 'order_abcdefghijkl' }).success, true);
  assert.equal(reportedUtrParamsSchema.safeParse({ orderId: 'order_invalid' }).success, false);
});
