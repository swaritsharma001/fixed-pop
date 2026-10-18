const famapp = require('./famapp');
const { parseGenericPaymentEmail } = require('./customEmail');

const parsersBySender = new Map([
  ['no-reply@famapp.in', famapp.parseFamAppEmail],
]);

function parserForSender(sender) {
  const normalized = String(sender || '').trim().toLowerCase();
  if (parsersBySender.has(normalized)) {
    return parsersBySender.get(normalized);
  }
  if (normalized.endsWith('@famapp.in')) {
    return famapp.parseFamAppEmail;
  }
  return null;
}

module.exports = { parserForSender, parsersBySender };
