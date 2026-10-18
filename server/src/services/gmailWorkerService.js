const { google } = require('googleapis');
const Merchant = require('../models/Merchant');
const Order = require('../models/Order');
const ParserFailure = require('../models/ParserFailure');
const Payment = require('../models/Payment');
const UnmatchedPayment = require('../models/UnmatchedPayment');
const { getRequiredEnv } = require('../config');
const { decryptText } = require('../utils/encryption');
const { parserForSender } = require('../parsers');
const { matchIncomingPayment, isDuplicateMessageOrUtr } = require('./paymentMatchingService');

function headerValue(headers, name) {
  return (headers || []).find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value || '';
}

function parseSender(value) {
  const angle = String(value || '').match(/<([^>]+)>/);
  const email = (angle ? angle[1] : value).trim().toLowerCase();
  return email.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() || '';
}

function dkimPassForFamApp(authenticationResults) {
  const value = String(authenticationResults || '').toLowerCase();
  return /dkim\s*=\s*pass[^;]*(?:header\.d|header\.i)\s*=\s*@?famapp\.in(?:\s|;|$)/i.test(value);
}

function dkimPassForSender(authenticationResults, sender) {
  const value = String(authenticationResults || '').toLowerCase();
  const domain = String(sender || '').split('@')[1]?.toLowerCase();
  if (!domain) return false;
  if (domain === 'famapp.in') {
    return dkimPassForFamApp(authenticationResults);
  }
  const escapedDomain = domain.replace(/\./g, '\\.');
  const domainRegex = new RegExp(
    `dkim\\s*=\\s*pass[^;]*(?:header\\.d|header\\.i)\\s*=\\s*@?${escapedDomain}(?:\\s|;|$)`,
    'i',
  );
  return domainRegex.test(value);
}

function decodePayloadData(data) {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function collectMessageBodies(payload, parts = []) {
  if (!payload) return parts;
  const mimeType = (payload.mimeType || '').toLowerCase();
  if (payload.body?.data) {
    parts.push({ mimeType, value: decodePayloadData(payload.body.data) });
  }
  for (const part of payload.parts || []) collectMessageBodies(part, parts);
  return parts;
}

function messageBody(payload) {
  const parts = collectMessageBodies(payload);
  return parts.find((part) => part.mimeType === 'text/html')?.value
    || parts.find((part) => part.mimeType === 'text/plain')?.value
    || parts[0]?.value
    || '';
}

async function recordParserFailure(merchantId, sender, gmailMessageId, reason) {
  await ParserFailure.updateOne(
    { merchantId, gmailMessageId },
    { $setOnInsert: { merchantId, sender, gmailMessageId, reason } },
    { upsert: true },
  );
}

function statusCode(error) {
  return error?.code || error?.response?.status || error?.status;
}

async function historyMessageIds(gmail, historyId, allowedSenders) {
  if (historyId) {
    const historyIds = new Set();
    let pageToken;
    let latestHistoryId = historyId;
    try {
      do {
        const response = await gmail.users.history.list({
          userId: 'me',
          startHistoryId: historyId,
          historyTypes: ['messageAdded'],
          maxResults: 100,
          pageToken,
        });
        latestHistoryId = response.data.historyId || latestHistoryId;
        for (const item of response.data.history || []) {
          for (const added of item.messagesAdded || []) {
            if (added.message?.id) historyIds.add(added.message.id);
          }
        }
        pageToken = response.data.nextPageToken;
      } while (pageToken);
      if (!historyIds.size) return { messageIds: [], latestHistoryId };

      // Gmail's search query returns IDs only; intersect it with history changes so
      // metadata/body requests are made only for allowed sender addresses.
      const senderQuery = allowedSenders.map((sender) => `from:${sender}`).join(' ');
      const query = `{${senderQuery}}`;
      const allowedIds = new Set();
      let allowedPageToken;
      let allowedPages = 0;
      do {
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 500,
          pageToken: allowedPageToken,
        });
        for (const message of response.data.messages || []) {
          if (message.id && historyIds.has(message.id)) allowedIds.add(message.id);
        }
        allowedPageToken = response.data.nextPageToken;
        allowedPages += 1;
      } while (
        allowedPageToken &&
        allowedPages < 20 &&
        allowedIds.size < historyIds.size
      );
      return { messageIds: [...allowedIds], latestHistoryId };
    } catch (error) {
      if (statusCode(error) !== 404) throw error;
    }
  }

  const senderQuery = allowedSenders.map((sender) => `from:${sender}`).join(' ');
  const query = `newer_than:1d {${senderQuery}}`;
  const messageIds = new Set();
  let pageToken;
  let latestHistoryId = historyId || null;
  let pages = 0;
  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
      pageToken,
    });
    for (const message of response.data.messages || []) {
      if (message.id) messageIds.add(message.id);
    }
    latestHistoryId = response.data.historyId || latestHistoryId;
    pageToken = response.data.nextPageToken;
    pages += 1;
  } while (pageToken && pages < 5);
  return { messageIds: [...messageIds], latestHistoryId };
}

async function latestAllowedMessageIds(gmail, allowedSenders, max = 2) {
  if (!allowedSenders?.length) return [];
  const senderQuery = allowedSenders.map((sender) => `from:${sender}`).join(' ');
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `{${senderQuery}}`,
    maxResults: max,
  });
  return (response.data.messages || [])
    .map((message) => message.id)
    .filter(Boolean)
    .slice(0, max);
}

function gmailApiForMerchant(merchant) {
  const oauth = new google.auth.OAuth2(
    getRequiredEnv('GMAIL_CLIENT_ID'),
    getRequiredEnv('GMAIL_CLIENT_SECRET'),
    getRequiredEnv('GMAIL_REDIRECT_URI'),
  );
  oauth.setCredentials({
    refresh_token: decryptText(merchant.gmail.encryptedRefreshToken),
  });
  return google.gmail({ version: 'v1', auth: oauth });
}

async function handleMessage(gmail, merchant, messageId) {
  const [paid, unmatched, failed] = await Promise.all([
    Payment.exists({ gmailMessageId: messageId }),
    UnmatchedPayment.exists({ gmailMessageId: messageId }),
    ParserFailure.exists({ merchantId: merchant.id, gmailMessageId: messageId }),
  ]);
  if (paid || unmatched || failed) return { status: 'already_processed' };

  const metadata = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['From', 'Authentication-Results'],
  });
  const headers = metadata.data.payload?.headers || [];
  const sender = parseSender(headerValue(headers, 'From'));
  if (!merchant.allowedSenders.includes(sender)) return { status: 'ignored_sender' };

  const parse = parserForSender(sender);
  if (!parse) {
    await recordParserFailure(merchant.id, sender, messageId, 'No parser configured for allowed sender');
    return { status: 'parser_failure' };
  }
  if (!dkimPassForSender(headerValue(headers, 'Authentication-Results'), sender)) {
    await recordParserFailure(merchant.id, sender, messageId, `DKIM verification failed for ${sender}`);
    return { status: 'parser_failure' };
  }

  const full = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  const parsed = parse(messageBody(full.data.payload));
  if (!parsed) {
    await recordParserFailure(merchant.id, sender, messageId, 'Email did not match the FamApp parser');
    return { status: 'parser_failure' };
  }
  if (parsed.type !== 'credit') return { status: 'ignored_non_credit' };

  const internalMs = Number(full.data.internalDate);
  const emailDate =
    Number.isFinite(internalMs) && internalMs > 0
      ? new Date(internalMs)
      : new Date(headerValue(headers, 'Date') || Date.now());

  let paymentTime = parsed.paidAt;
  if (
    !paymentTime ||
    Number.isNaN(paymentTime.getTime()) ||
    Math.abs(paymentTime.getTime() - emailDate.getTime()) > 10 * 60 * 1000
  ) {
    paymentTime = emailDate;
  }

  const duplicate = await isDuplicateMessageOrUtr(messageId, parsed.utr);
  if (duplicate) return { status: 'duplicate' };
  const match = await matchIncomingPayment({
    merchantId: merchant.id,
    gmailMessageId: messageId,
    amount: parsed.amount,
    utr: parsed.utr,
    receivedAt: paymentTime,
  });
  if (match.matched) return { status: 'matched' };
  if (match.unmatched) return { status: 'unmatched' };
  return { status: 'duplicate' };
}

async function pollMerchant(merchant) {
  if (!merchant.gmail?.encryptedRefreshToken || !merchant.allowedSenders?.length) return;
  const gmail = gmailApiForMerchant(merchant);
  const candidateIds = new Set();

  // 1. Direct search for newest messages from allowed senders (bypasses historyId skipping)
  try {
    const directIds = await latestAllowedMessageIds(gmail, merchant.allowedSenders, 5);
    for (const id of directIds) {
      if (id) candidateIds.add(id);
    }
  } catch (err) {
    console.warn('[Gmail Poll] Direct allowed messages list warning:', err.message || err);
  }

  // 2. Also check history changes
  let currentHistoryId = merchant.gmail?.historyId;
  try {
    const historyResult = await historyMessageIds(
      gmail,
      merchant.gmail.historyId,
      merchant.allowedSenders,
    );
    for (const id of historyResult.messageIds || []) {
      if (id) candidateIds.add(id);
    }
    if (historyResult.latestHistoryId) {
      currentHistoryId = historyResult.latestHistoryId;
    }
  } catch (err) {
    console.warn('[Gmail Poll] History list query warning:', err.message || err);
  }

  // 3. Process candidate messages (handleMessage fast-deduplicates against DB)
  for (const messageId of candidateIds) {
    const result = await handleMessage(gmail, merchant, messageId);
    if (result?.status === 'matched') {
      console.log(`[Gmail Poll] Auto-detected and matched payment email ${messageId} for merchant ${merchant.email || merchant.id}`);
    }
  }

  // 4. Update historyId
  if (!currentHistoryId || currentHistoryId === merchant.gmail.historyId) {
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      currentHistoryId = profile.data.historyId || currentHistoryId;
    } catch {
      // keep current
    }
  }
  if (currentHistoryId && currentHistoryId !== merchant.gmail.historyId) {
    await Merchant.updateOne(
      { _id: merchant._id },
      { $set: { 'gmail.historyId': currentHistoryId } },
    );
  }
}

async function fetchLatestPaymentAlerts(merchant) {
  if (!merchant.gmail?.encryptedRefreshToken) {
    const error = new Error('Connect Gmail before fetching payment emails');
    error.status = 409;
    throw error;
  }
  if (!merchant.allowedSenders?.length) {
    const error = new Error('Save an allowed FamApp sender before fetching emails');
    error.status = 409;
    throw error;
  }

  const gmail = gmailApiForMerchant(merchant);
  const messageIds = await latestAllowedMessageIds(gmail, merchant.allowedSenders, 5);
  if (messageIds.length) {
    await ParserFailure.deleteMany({
      merchantId: merchant.id,
      gmailMessageId: { $in: messageIds },
    });
  }

  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  let failed = 0;
  for (const messageId of messageIds) {
    try {
      const result = await handleMessage(gmail, merchant, messageId);
      if (result?.status === 'matched') matched += 1;
      else if (result?.status === 'unmatched') unmatched += 1;
      else if (result?.status === 'parser_failure') failed += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      console.error('Manual Gmail fetch failed:', error.name || 'Error');
    }
  }

  return { fetched: messageIds.length, matched, unmatched, skipped, failed };
}

async function pollPendingMerchants() {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const activeMerchantIds = await Order.distinct('merchantId', {
    $or: [
      { status: 'PENDING' },
      { status: 'EXPIRED', expiresAt: { $gt: twoHoursAgo } },
      { createdAt: { $gt: twoHoursAgo }, status: { $in: ['PENDING', 'EXPIRED'] } },
    ],
  });
  if (!activeMerchantIds.length) return;
  const merchants = await Merchant.find({
    _id: { $in: activeMerchantIds },
    'gmail.encryptedRefreshToken': { $ne: null },
  }).select('+gmail.encryptedRefreshToken');

  for (const merchant of merchants) {
    try {
      await pollMerchant(merchant);
    } catch (error) {
      console.error(`Gmail polling failed for merchant ${merchant.email || merchant.id}:`, error.message || error);
    }
  }
}

module.exports = {
  dkimPassForFamApp,
  parseSender,
  messageBody,
  historyMessageIds,
  latestAllowedMessageIds,
  handleMessage,
  pollMerchant,
  fetchLatestPaymentAlerts,
  pollPendingMerchants,
  recordParserFailure,
};
