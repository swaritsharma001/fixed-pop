/**
 * Server-Sent Events (SSE) service for real-time payment status push.
 *
 * When a browser opens /api/v1/checkout/:orderId/events, it receives a
 * persistent text/event-stream connection.  The worker loop calls
 * notifyOrderUpdate() after every successful payment settlement so the
 * browser instantly receives a "status" event without polling.
 *
 * Multiple concurrent clients for the same orderId are supported via a
 * simple Map of Sets.
 */

/** @type {Map<string, Set<import('http').ServerResponse>>} */
const subscribers = new Map();

/**
 * Register an SSE response for a given orderId.
 * @param {string} orderId
 * @param {import('http').ServerResponse} res
 */
function subscribe(orderId, res) {
  if (!subscribers.has(orderId)) subscribers.set(orderId, new Set());
  subscribers.get(orderId).add(res);

  res.on('close', () => {
    const set = subscribers.get(orderId);
    if (set) {
      set.delete(res);
      if (set.size === 0) subscribers.delete(orderId);
    }
  });
}

/**
 * Push a payment status update to all SSE clients watching this orderId.
 * @param {string} orderId
 * @param {{ status: string, payment_id?: string, utr?: string, signature?: string, redirectUrl?: string }} data
 */
function notifyOrderUpdate(orderId, data) {
  const set = subscribers.get(orderId);
  if (!set || set.size === 0) return;
  const payload = JSON.stringify({ orderId, ...data });
  for (const res of set) {
    try {
      res.write(`event: status\ndata: ${payload}\n\n`);
    } catch {
      // Connection already gone; close handler will clean up.
    }
  }
}

/**
 * Total number of active SSE connections (useful for diagnostics).
 */
function activeConnectionCount() {
  let count = 0;
  for (const set of subscribers.values()) count += set.size;
  return count;
}

module.exports = { subscribe, notifyOrderUpdate, activeConnectionCount };
