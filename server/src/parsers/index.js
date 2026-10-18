const famapp = require('./famapp');
const { parseGenericPaymentEmail } = require('./customEmail');

const parsersBySender = new Map([
  ['no-reply@famapp.in', famapp.parseFamAppEmail],
  ['theangstaguy001@gmail.com', parseGenericPaymentEmail],
  ['thegangstaguy001@gmail.com', parseGenericPaymentEmail],
]);

function parserForSender(sender) {
  const normalized = String(sender || '').trim().toLowerCase();
  if (parsersBySender.has(normalized)) {
    return parsersBySender.get(normalized);
  }
  if (normalized.endsWith('@gmail.com') || normalized.endsWith('.in') || normalized.endsWith('.com')) {
    return parseGenericPaymentEmail;
  }
  return null;
}

module.exports = { parserForSender, parsersBySender };
