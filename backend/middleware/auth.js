const { isManager, isAdmin } = require('../config/roles.js')

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next()
  res.status(401).json({ error: 'Non authentifié' })
}

function requireManager(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  const roles = req.user?.roles || []
  if (!isManager(roles)) {
    return res.status(403).json({ error: 'Accès refusé - Niveau insuffisant' })
  }
  next()
}

function requireAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Non authentifié' })
  }
  const roles = req.user?.roles || []
  if (!isAdmin(roles)) {
    return res.status(403).json({ error: 'Accès refusé - Réservé aux admins' })
  }
  next()
}

module.exports = { requireAuth, requireManager, requireAdmin }
