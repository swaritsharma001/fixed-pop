const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseFamAppEmail,
  stripHtmlAndNormalize,
} = require('../src/parsers/famapp');
const {
  dkimPassForFamApp,
  historyMessageIds,
  latestAllowedMessageIds,
} = require('../src/services/gmailWorkerService');

const debitSample = `
Hey Mahesh Kumar,
You have successfully paid
₹100.00
to Munni Kumari
Transaction ID :
FMPU01a14a01-
335b-7488-
916c-160083a6400a
Date :
06:45 PM IST, 17 October 2026
UTR :
665670259123
`;

test('FamApp debit fixture parses all fields but is identified as debit', () => {
  const parsed = parseFamAppEmail(debitSample);
  assert.ok(parsed);
  assert.equal(parsed.type, 'debit');
  assert.equal(parsed.amount, '100.00');
  assert.equal(parsed.utr, '665670259123');
  assert.equal(parsed.txnId, 'FMPU01a14a01-335b-7488-916c-160083a6400a');
  assert.equal(parsed.counterparty, 'Munni Kumari');
  assert.equal(parsed.paidAt.toISOString(), '2026-10-17T13:15:00.000Z');
});

test('FamApp credit HTML fixture is parsed as credit after stripping markup', () => {
  const html = `
    <html><body><p>You have received</p><h2>₹250.75</h2>
    <div>from Example Store</div><p>Transaction ID : FMPUABC-001</p>
    <p>Date : 06:45 PM IST, 17 October 2026</p><p>UTR : 123456789012</p>
    </body></html>
  `;
  assert.match(stripHtmlAndNormalize(html), /₹250\.75 from Example Store/);
  const parsed = parseFamAppEmail(html);
  assert.ok(parsed);
  assert.equal(parsed.type, 'credit');
  assert.equal(parsed.amount, '250.75');
  assert.equal(parsed.utr, '123456789012');
  assert.equal(parsed.counterparty, 'Example Store');
});

test('FamApp received-credit receipt text with an amount below ten rupees parses correctly', () => {
  const sample = `
    Hey Customer,
    You have successfully received
    ₹5.88
    from Example Sender
    Transaction ID : FMP-TEST-001
    Date : 09:51 PM IST, 17 October 2026
    UTR : 123456789012
  `;
  const parsed = parseFamAppEmail(sample);
  assert.ok(parsed);
  assert.equal(parsed.type, 'credit');
  assert.equal(parsed.amount, '5.88');
  assert.equal(parsed.utr, '123456789012');
  assert.equal(parsed.txnId, 'FMP-TEST-001');
  assert.equal(parsed.paidAt.toISOString(), '2026-10-17T16:21:00.000Z');
});

test('FamApp email without UTR line falls back to Transaction ID and parses amounts like 2.0', () => {
  const sample = `
    Hey Merchant,
    You have received
    ₹2.0
    from Rohit Kumar
    Transaction ID : FMPU01a14a01-335b-7488-916c-160083a6400a
    Date : 07:15 PM IST, 18 October 2026
  `;
  const parsed = parseFamAppEmail(sample);
  assert.ok(parsed);
  assert.equal(parsed.type, 'credit');
  assert.equal(parsed.amount, '2.0');
  assert.equal(parsed.utr, 'FMPU01a14a01-335b-7488-916c-160083a6400a');
  assert.equal(parsed.txnId, 'FMPU01a14a01-335b-7488-916c-160083a6400a');
  assert.equal(parsed.counterparty, 'Rohit Kumar');
});

test('FamApp email with paise suffix like 3.02 parses accurately', () => {
  const sample = `
    Hey Merchant,
    You have received
    ₹3.02
    from Customer
    Transaction ID : FMP-302-XYZ
    Date : 07:15 PM IST, 18 October 2026
    UTR : 987654321098
  `;
  const parsed = parseFamAppEmail(sample);
  assert.ok(parsed);
  assert.equal(parsed.type, 'credit');
  assert.equal(parsed.amount, '3.02');
  assert.equal(parsed.utr, '987654321098');
});

test('FamApp parser rejects unrecognised messages and only trusts FamApp DKIM pass', () => {
  assert.equal(parseFamAppEmail('Your balance is now ₹100.00'), null);
  assert.equal(dkimPassForFamApp('mx.google.com; dkim=pass header.i=@famapp.in'), true);
  assert.equal(dkimPassForFamApp('mx.google.com; dkim=pass header.d=other.example'), false);
  assert.equal(dkimPassForFamApp('mx.google.com; spf=pass header.i=@famapp.in'), false);
});

test('Gmail history results are filtered through allowed-sender search before message fetch', async () => {
  const gmail = {
    users: {
      history: {
        list: async () => ({
          data: {
            historyId: 'history-2',
            history: [{
              messagesAdded: [
                { message: { id: 'allowed-message' } },
                { message: { id: 'other-message' } },
              ],
            }],
          },
        }),
      },
      messages: {
        list: async ({ q }) => {
          assert.equal(q, '{from:no-reply@famapp.in}');
          return { data: { messages: [{ id: 'allowed-message' }] } };
        },
      },
    },
  };
  const result = await historyMessageIds(gmail, 'history-1', ['no-reply@famapp.in']);
  assert.deepEqual(result.messageIds, ['allowed-message']);
  assert.equal(result.latestHistoryId, 'history-2');
});

test('manual Gmail fetch requests at most the two newest allowed-sender messages', async () => {
  let request;
  const gmail = {
    users: {
      messages: {
        list: async (params) => {
          request = params;
          return {
            data: {
              messages: [
                { id: 'latest-message' },
                { id: 'second-message' },
                { id: 'older-message' },
              ],
            },
          };
        },
      },
    },
  };
  const ids = await latestAllowedMessageIds(gmail, ['alerts@famapp.in', 'settlements@famapp.in']);
  assert.equal(request.userId, 'me');
  assert.equal(request.q, '{from:alerts@famapp.in from:settlements@famapp.in}');
  assert.equal(request.maxResults, 2);
  assert.deepEqual(ids, ['latest-message', 'second-message']);
});
