---
name: UPI UTR verification
description: Safety rule for UTRs submitted by checkout customers.
---

A UTR entered by the customer is a reference for reconciliation, not evidence that funds reached the merchant. Do not mark an order paid or send `payment.success` based only on customer input.

**Why:** UTRs are user-controlled and can be mistyped, replayed, or fabricated; false payment confirmation can trigger fulfillment and merchant webhooks.

**How to apply:** Match the submitted UTR against trusted merchant-side evidence, while also validating merchant, amount, time window, and duplicate use. Any manual verification flow must require an authenticated merchant action and keep an audit trail.
