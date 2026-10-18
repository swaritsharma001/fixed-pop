const PAYMENT_VERIFICATION_GRACE_MS = 10 * 60 * 1000;

function isWithinPaymentWindow({ createdAt, expiresAt, receivedAt }) {
  if (
    !(createdAt instanceof Date)
    || !(expiresAt instanceof Date)
    || !(receivedAt instanceof Date)
    || Number.isNaN(createdAt.getTime())
    || Number.isNaN(expiresAt.getTime())
    || Number.isNaN(receivedAt.getTime())
  ) {
    return false;
  }

  return receivedAt >= createdAt
    && receivedAt.getTime() <= expiresAt.getTime() + PAYMENT_VERIFICATION_GRACE_MS;
}

function paymentExpirySearchLowerBound(receivedAt) {
  return new Date(receivedAt.getTime() - PAYMENT_VERIFICATION_GRACE_MS);
}

module.exports = {
  PAYMENT_VERIFICATION_GRACE_MS,
  isWithinPaymentWindow,
  paymentExpirySearchLowerBound,
};
