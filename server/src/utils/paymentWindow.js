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

  // Banking alerts often have minute-level resolution (00 seconds, 000 ms).
  // In that case, the payment occurred at some point during [receivedAt, receivedAt + 59999ms].
  const minuteResolution = receivedAt.getSeconds() === 0 && receivedAt.getMilliseconds() === 0;
  const effectiveReceivedAt = minuteResolution
    ? new Date(receivedAt.getTime() + 59999)
    : receivedAt;

  return effectiveReceivedAt >= createdAt
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
