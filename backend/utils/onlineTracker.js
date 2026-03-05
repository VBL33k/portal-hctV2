// ─── Online tracker (en mémoire) ─────────────────────────────────────────────
// Garde une map userId → lastSeenAt mis à jour à chaque requête authentifiée.
// Un membre est considéré "en ligne" s'il a fait une requête dans les 5 dernières minutes.

const _online = new Map()
const ONLINE_TTL = 5 * 60 * 1000 // 5 minutes

/** Met à jour le timestamp "vu" d'un utilisateur. */
function touch(userId) {
  if (userId) _online.set(userId, Date.now())
}

/** Retourne true si l'utilisateur est en ligne (activité récente < 5 min). */
function isOnline(userId) {
  const t = _online.get(userId)
  return !!(t && Date.now() - t < ONLINE_TTL)
}

/** Retourne la liste des userIds actuellement en ligne. */
function getOnlineIds() {
  const now = Date.now()
  const ids = []
  for (const [id, t] of _online) {
    if (now - t < ONLINE_TTL) ids.push(id)
  }
  return ids
}

/** Nettoie les entrées expirées (appelé périodiquement). */
function cleanup() {
  const now = Date.now()
  for (const [id, t] of _online) {
    if (now - t >= ONLINE_TTL) _online.delete(id)
  }
}

// Nettoyage toutes les 10 minutes
setInterval(cleanup, 10 * 60 * 1000)

module.exports = { touch, isOnline, getOnlineIds }
