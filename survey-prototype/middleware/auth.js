function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  return res.status(401).json({ error: 'Потрібна авторизація.' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({ error: 'Доступ заборонено. Потрібні права адміністратора.' });
}

module.exports = { requireAuth, requireAdmin };
