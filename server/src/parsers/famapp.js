const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

function stripHtmlAndNormalize(input) {
  return String(input || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(?:p|div|tr|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#(?:x20b9|8377);/gi, '₹')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseFamAppEmail(input) {
  const text = stripHtmlAndNormalize(input);
  if (!text) return null;

  const debit = /\byou have successfully paid\b|\bsuccessfully paid\b/i.test(text);
  const credit =
    /\byou\s+(?:have\s+)?received\b|\breceived\s+₹|\bcredited\b|\bmoney received\b|\bhas sent you\b|\bsent you\s+₹|\bpayment received\b|\btransfer received\b/i.test(
      text,
    );
  if (!debit && !credit) return null;

  const amountMatch =
    text.match(/₹\s*([\d,]+(?:\.\d{1,2})?)/) ||
    text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(/\b(?:received|paid|credited|amount)\s+(?:of\s+)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:₹|rs\.?|inr|\brupees?\b)/i);

  const transactionMatch =
    text.match(/Transaction\s*ID\s*:\s*(.+?)(?=\s*Date\s*:|\s*UTR\s*:|$)/i) ||
    text.match(/(?:transaction\s*id|txn\s*id)\s*[:=]?\s*([A-Za-z0-9_-]+)/i) ||
    text.match(/\b(FMP[A-Za-z0-9_-]+)\b/i);

  if (!amountMatch || !transactionMatch) return null;

  const amount = amountMatch[1].replace(/,/g, '');
  const txnId = transactionMatch[1].replace(/\s+/g, '');
  if (!txnId) return null;

  const utrMatch =
    text.match(/UTR\s*:\s*(\d{12})\b/i) ||
    text.match(/(?:upi\s*ref(?:erence)?(?:\s*no\.?|\s*id)?|ref\s*no\.?)\s*[:=]?\s*(\d{12})\b/i) ||
    text.match(/\b(\d{12})\b/);

  // If FamApp email does not include a 12-digit UTR, use the unique FamApp transaction ID
  const utr = utrMatch ? utrMatch[1] : txnId;

  const dateMatch = text.match(/Date\s*:\s*(.+?)(?=\s*UTR\s*:|$)/i);
  let paidAt = new Date();
  if (dateMatch) {
    const dateText = dateMatch[1].trim();
    const parsedDate = dayjs.tz(
      dateText,
      'hh:mm A [IST], D MMMM YYYY',
      'Asia/Kolkata',
    );
    if (parsedDate.isValid()) paidAt = parsedDate.toDate();
  }

  const partyMatch = text.match(
    /\b(?:to|from|by)\s+(.+?)(?=\s*Transaction\s*ID\s*:|\s*Date\s*:|\s*UTR\s*:|$)/i,
  );
  const counterparty = partyMatch
    ? partyMatch[1].replace(/[.,;!]+$/, '').trim() || null
    : null;

  return {
    type: debit ? 'debit' : 'credit',
    amount,
    utr,
    txnId,
    counterparty,
    paidAt,
  };
}

module.exports = { parseFamAppEmail, stripHtmlAndNormalize };
