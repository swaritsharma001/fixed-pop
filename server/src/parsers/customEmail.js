const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { stripHtmlAndNormalize, parseFamAppEmail } = require('./famapp');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

function parseGenericPaymentEmail(input) {
  // First attempt FamApp parser in case it is a direct or forwarded FamApp email
  const famappParsed = parseFamAppEmail(input);
  if (famappParsed) return famappParsed;

  const text = stripHtmlAndNormalize(input);
  if (!text) return null;

  // Extract amount: ₹5.92 or Rs. 5.92 or INR 5.92 or amount: 5.92
  const amountMatch =
    text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(/\bamount\s*[:=]?\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i);

  // Extract 12-digit UTR
  const utrMatch =
    text.match(/UTR\s*[:=]?\s*(\d{12})\b/i) ||
    text.match(/(?:ref(?:erence)?\s*(?:no\.?|id)?)\s*[:=]?\s*(\d{12})\b/i) ||
    text.match(/\b(\d{12})\b/);

  const txnMatch = text.match(/(?:transaction\s*id|txn\s*id)\s*[:=]?\s*([A-Za-z0-9_-]+)/i);
  const utr = utrMatch ? utrMatch[1] : (txnMatch ? txnMatch[1] : null);
  const txnId = txnMatch ? txnMatch[1] : (utr ? `TXN_${utr}` : null);

  if (!amountMatch || !utr) return null;

  const amount = amountMatch[1].replace(/,/g, '');

  let paidAt = new Date();
  const dateMatch = text.match(/Date\s*:\s*(.+?)(?=\s*UTR\s*:|\s*Updated\s*:|$)/i);
  if (dateMatch) {
    const parsedDate = dayjs.tz(dateMatch[1].trim(), 'hh:mm A [IST], D MMMM YYYY', 'Asia/Kolkata');
    if (parsedDate.isValid()) paidAt = parsedDate.toDate();
  }

  const partyMatch = text.match(/\b(?:from|by)\s+(.+?)(?=\s*Transaction\s*ID\s*:|\s*Date\s*:|\s*UTR\s*:|$)/i);
  const counterparty = partyMatch ? partyMatch[1].replace(/[.,;!]+$/, '').trim() || 'Direct Transfer' : 'Direct Transfer';

  return {
    type: 'credit',
    amount,
    utr,
    txnId,
    counterparty,
    paidAt,
  };
}

module.exports = { parseGenericPaymentEmail };
