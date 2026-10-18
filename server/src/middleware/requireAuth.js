const { verifyAccessToken } = require('../services/tokenService');

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let claims;
  try {
    claims = verifyAccessToken(match[1]);
    if (claims.type !== 'merchant' || !claims.sub) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const Merchant = require('../models/Merchant');
    const merchant = await Merchant.findById(claims.sub).select('role isBanned');
    if (!merchant) {
      return res.status(401).json({ error: 'Account not found' });
    }
    if (merchant.isBanned) {
      return res.status(403).json({ error: 'Your account has been suspended by the administrator.' });
    }
    req.merchantId = claims.sub;
    req.userRole = merchant.role || claims.role || 'merchant';
    return next();
  } catch (err) {
    return next(err);
  }
}

async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const Merchant = require('../models/Merchant');
      const merchant = await Merchant.findById(req.merchantId);
      if (!merchant || merchant.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required' });
      }
      if (merchant.isBanned) {
        return res.status(403).json({ error: 'Account is suspended' });
      }
      req.admin = merchant;
      next();
    } catch (err) {
      next(err);
    }
  });
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.requireAdmin = requireAdmin;

