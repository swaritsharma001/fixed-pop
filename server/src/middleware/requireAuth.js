const { verifyAccessToken } = require('../services/tokenService');

function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const claims = verifyAccessToken(match[1]);
    if (claims.type !== 'merchant' || !claims.sub) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.merchantId = claims.sub;
    req.userRole = claims.role || 'merchant';
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
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

