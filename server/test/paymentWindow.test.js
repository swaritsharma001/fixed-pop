const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PAYMENT_VERIFICATION_GRACE_MS,
  isWithinPaymentWindow,
  paymentExpirySearchLowerBound,
} = require('../src/utils/paymentWindow');
const { chooseMatchingOrder } = require('../src/services/paymentMatchingService');

test('bank timestamp may fall through the 10-minute verification grace, inclusively', () => {
  const createdAt = new Date('2026-10-17T00:30:00.000Z');
  const expiresAt = new Date('2026-10-17T00:40:00.000Z');
  const lastAllowedTime = new Date(expiresAt.getTime() + PAYMENT_VERIFICATION_GRACE_MS);

  assert.equal(isWithinPaymentWindow({ createdAt, expiresAt, receivedAt: createdAt }), true);
  assert.equal(isWithinPaymentWindow({ createdAt, expiresAt, receivedAt: lastAllowedTime }), true);
  assert.equal(isWithinPaymentWindow({
    createdAt,
    expiresAt,
    receivedAt: new Date(lastAllowedTime.getTime() + 1),
  }), false);
  assert.equal(isWithinPaymentWindow({
    createdAt,
    expiresAt,
    receivedAt: new Date(createdAt.getTime() - 1),
  }), false);
});

test('payment lookup applies the same grace window to indexed expiry checks', () => {
  const receivedAt = new Date('2026-10-17T00:50:00.000Z');
  assert.equal(
    paymentExpirySearchLowerBound(receivedAt).toISOString(),
    '2026-10-17T00:40:00.000Z',
  );
});

test('automatic matching does not guess when same-amount order windows overlap', () => {
  const orders = [
    { orderId: 'older-order', reportedUtr: null },
    { orderId: 'newer-order', reportedUtr: null },
  ];
  assert.equal(chooseMatchingOrder(orders, '123456789012'), null);
});

test('a trusted email UTR may disambiguate overlapping order windows', () => {
  const orders = [
    { orderId: 'older-order', reportedUtr: null },
    { orderId: 'reported-order', reportedUtr: '123456789012' },
  ];
  assert.equal(chooseMatchingOrder(orders, '123456789012'), orders[1]);
});
