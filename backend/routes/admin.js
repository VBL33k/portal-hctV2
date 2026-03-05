const express    = require('express')
const fetch      = require('node-fetch')
const { requireAuth } = require('../middleware/auth.js')
const { isFullAdmin, getUserLevel } = require('../config/roles.js')
const { getCachedMembers, fetchGuildMember } = require('../utils/discord.js')
const { getLogsForUser, getAllLogs, log } = require('../utils/logger.js')
const { isOnline } = require('../utils/onlineTracker.js')

const router    = express.Router()
const GUILD_ID  = process.env.DISCORD_GUILD_ID || '1435626232749232181'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

// Roles citoyens attribués après rétrogradation
const CITIZEN_ROLES = [
  '892443120573239357',
  '807004742198493264',
  '807004846548713512',
  '914933795348692992',
  '805480237059407883',
]

// ─── Middleware ────────────────────────────────────────────────────────────────

function requireFullAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated())
    return res.status(401).json({ error: 'Non authentifié' })
  if (!isFullAdmin(req.user?.roles || []))
    return res.status(403).json({ error: 'Accès refusé — réservé aux directeurs et responsables' })
  next()
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/admin/members — liste tous les membres HCT (Interne+)
router.get('/members', requireAuth, requireFullAdmin, (req, res) => {
  const cache = getCachedMembers()

  // Construit une map userId → dernière date de connexion en une passe
  const allLogs = getAllLogs()
  const lastLoginMap = {}
  for (const entry of allLogs) {
    if (entry.action === 'LOGIN') {
      if (!lastLoginMap[entry.userId] || entry.timestamp > lastLoginMap[entry.userId]) {
        lastLoginMap[entry.userId] = entry.timestamp
      }
    }
  }

  const members = Object.entries(cache)
    .filter(([, m]) => (m.userLevel ?? -1) >= 1)   // Interne+ uniquement
    .map(([userId, m]) => ({
      userId,
      userName:  m.userName,
      userPoste: m.userPoste,
      userLevel: m.userLevel ?? 1,
      online:    isOnline(userId),
      lastLogin: lastLoginMap[userId] || null,
      updatedAt: m.updatedAt,
    }))

  res.json({ members })
})

// GET /api/admin/members/:id — détail d'un membre (avatar frais + logs)
router.get('/members/:id', requireAuth, requireFullAdmin, async (req, res) => {
  const { id } = req.params
  const cache   = getCachedMembers()
  const m       = cache[id]
  if (!m) return res.status(404).json({ error: 'Membre introuvable' })

  // Récupère données fraîches Discord pour l'avatar et le niveau actuel
  let avatarUrl    = null
  let currentLevel = m.userLevel ?? -1

  try {
    const member = await fetchGuildMember(id)
    if (member) {
      avatarUrl    = member.user?.avatar
        ? `https://cdn.discordapp.com/avatars/${id}/${member.user.avatar}.png`
        : null
      currentLevel = getUserLevel(member.roles || [])
    }
  } catch {}

  const logs = getLogsForUser(id)

  res.json({
    userId:      id,
    userName:    m.userName,
    userPoste:   m.userPoste,
    userLevel:   currentLevel,
    avatarUrl,
    online:      isOnline(id),
    updatedAt:   m.updatedAt,
    logs,
  })
})

// POST /api/admin/members/:id/demote — rétrograde un membre (HDP ou moins)
router.post('/members/:id/demote', requireAuth, requireFullAdmin, async (req, res) => {
  const { id } = req.params
  const cache   = getCachedMembers()
  if (!cache[id]) return res.status(404).json({ error: 'Membre introuvable' })
  if (!BOT_TOKEN) return res.status(503).json({ error: 'Bot token manquant' })

  // Vérifie le niveau actuel en temps réel (évite de se baser sur un cache périmé)
  let currentLevel = -1
  try {
    const member = await fetchGuildMember(id, true)
    currentLevel = getUserLevel(member?.roles || [])
  } catch {
    return res.status(500).json({ error: 'Impossible de vérifier les rôles actuels du membre' })
  }

  if (currentLevel > 12) {
    return res.status(403).json({ error: 'Impossible — le membre a un grade supérieur à HDP' })
  }

  // PATCH Discord API — remplace tous les rôles par les rôles citoyens
  let discordRes
  try {
    discordRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${id}`,
      {
        method:  'PATCH',
        headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ roles: CITIZEN_ROLES }),
      }
    )
  } catch (err) {
    console.error('[ADMIN] Demote network error:', err.message)
    return res.status(500).json({ error: 'Erreur réseau lors de la rétrogradation' })
  }

  if (!discordRes.ok) {
    const err = await discordRes.json().catch(() => ({}))
    console.error('[ADMIN] Demote failed:', discordRes.status, err)
    return res.status(500).json({ error: `Erreur Discord API (${discordRes.status})` })
  }

  const targetName = cache[id].userName
  log(
    req.user.discordId,
    req.user.name,
    'MEMBER_DEMOTED',
    `${targetName} (${id}) rétrogradé par ${req.user.name}`,
  )

  res.json({ success: true })
})

module.exports = router
