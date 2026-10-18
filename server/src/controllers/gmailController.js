const Merchant = require('../models/Merchant');
const { validationError } = require('./authController');
const {
  createConnectUrl,
  completeOAuth,
  disconnectGmail,
} = require('../services/gmailOAuthService');
const { fetchLatestPaymentAlerts } = require('../services/gmailWorkerService');
const {
  allowedSendersSchema,
  callbackQuerySchema,
} = require('../validators/gmailSchemas');

function connect(req, res, next) {
  try {
    return res.json({ url: createConnectUrl(req.merchantId) });
  } catch (error) {
    return next(error);
  }
}

async function callback(req, res) {
  if (req.query.error) {
    return res.status(400).send('Gmail authorization was not completed.');
  }
  const parsed = callbackQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);

  try {
    await completeOAuth(parsed.data.code, parsed.data.state);
    const frontendBase = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://poppay.tech' : '');
    const redirectUrl = frontendBase
      ? `${frontendBase.replace(/\/+$/, '')}/dashboard?gmail=connected`
      : '/dashboard?gmail=connected';
    return res.redirect(303, redirectUrl);
  } catch (error) {
    const providerError = error?.response?.data?.error;
    console.error('Gmail OAuth callback failed', {
      stage: error?.oauthStage || 'callback',
      name:
        typeof error?.name === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(error.name)
          ? error.name
          : 'Error',
      status: Number.isInteger(error?.response?.status)
        ? error.response.status
        : undefined,
      providerError:
        typeof providerError === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(providerError)
          ? providerError
          : undefined,
    });
    return res.status(400).send(
      'Could not connect Gmail. Return to PopPay and try connecting again.',
    );
  }
}

async function disconnect(req, res, next) {
  try {
    const result = await disconnectGmail(req.merchantId);
    if (!result.disconnected) {
      return res.status(404).json({ error: 'Merchant account not found' });
    }
    return res.json({
      disconnected: true,
      providerRevoked: result.revoked,
      message: 'The stored Gmail token was deleted.',
    });
  } catch (error) {
    return next(error);
  }
}

async function updateAllowedSenders(req, res, next) {
  const parsed = allowedSendersSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  try {
    const merchant = await Merchant.findById(req.merchantId);
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });
    merchant.allowedSenders = parsed.data.allowedSenders;
    await merchant.save();
    return res.json({ allowedSenders: merchant.allowedSenders });
  } catch (error) {
    return next(error);
  }
}

async function fetchLatest(req, res, next) {
  try {
    const merchant = await Merchant.findById(req.merchantId)
      .select('+gmail.encryptedRefreshToken');
    if (!merchant) return res.status(404).json({ error: 'Merchant account not found' });
    const result = await fetchLatestPaymentAlerts(merchant);
    return res.json(result);
  } catch (error) {
    if ([401, 403].includes(error?.response?.status)) {
      return res.status(409).json({
        error: 'Gmail authorization expired. Disconnect and reconnect Gmail, then try again.',
      });
    }
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

module.exports = { connect, callback, disconnect, updateAllowedSenders, fetchLatest };
