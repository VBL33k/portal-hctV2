const express    = require('express')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join }   = require('path')
const { randomUUID } = require('crypto')
const { requireAuth } = require('../middleware/auth.js')
const { isManager }   = require('../config/roles.js')

const router    = express.Router()
const DATA_DIR  = join(__dirname, '..', 'data')
const DATA_FILE = join(DATA_DIR, 'service-shifts.json')
const HOSPITALS = ['TMC', 'NMH']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadShifts() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) { writeFileSync(DATA_FILE, '[]'); return [] }
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}

function saveShifts(shifts) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(shifts, null, 2))
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0 h'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const parts = []
  if (h) parts.push(`${h} h`)
  if (m) parts.push(`${m} min`)
  return parts.length ? parts.join(' ') : '0 h'
}

function computeStats(shifts) {
  const done   = shifts.filter(s => s && s.endAt)
  const sorted = [...done].sort((a, b) => new Date(b.startAt) - new Date(a.startAt))
  const total  = done.reduce((acc, s) => acc + (s.durationMs || 0), 0)
  const avg    = done.length ? Math.round(total / done.length) : 0
  const now    = Date.now()
  const d7     = done.filter(s => new Date(s.endAt) >= now - 7  * 86_400_000)
  const d30    = done.filter(s => new Date(s.endAt) >= now - 30 * 86_400_000)
  const dur7   = d7.reduce( (a, s) => a + (s.durationMs || 0), 0)
  const dur30  = d30.reduce((a, s) => a + (s.durationMs || 0), 0)
  const breakdown = {}
  for (const h of HOSPITALS) {
    const hs = done.filter(s => s.hospital === h)
    const hd = hs.reduce((a, s) => a + (s.durationMs || 0), 0)
    breakdown[h] = { count: hs.length, durationFormatted: formatDuration(hd) }
  }
  return {
    totalShifts: done.length,
    totalDurationFormatted: formatDuration(total),
    averageDurationFormatted: formatDuration(avg),
    last7DurationFormatted:  formatDuration(dur7),
    last30DaysCount: d30.length,
    last30DurationFormatted: formatDuration(dur30),
    hospitalBreakdown: breakdown,
    lastShift: sorted[0] || null,
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/shifts/mine
router.get('/mine', requireAuth, (req, res) => {
  const shifts = loadShifts()
  const mine   = shifts.filter(s => s.userId === req.user.discordId)
  res.json({ stats: computeStats(mine), shifts: [...mine].sort((a, b) => new Date(b.startAt) - new Date(a.startAt)) })
})

// GET /api/shifts/overview  (HDP+)
router.get('/overview', requireAuth, (req, res) => {
  if (!isManager(req.user?.roles || [])) return res.status(403).json({ error: 'Accès refusé' })
  const shifts = loadShifts()
  const { userId } = req.query
  if (userId) {
    const us = shifts.filter(s => s.userId === userId)
    return res.json({ userId, stats: computeStats(us), shifts: [...us].sort((a, b) => new Date(b.startAt) - new Date(a.startAt)) })
  }
  const uids    = [...new Set(shifts.map(s => s.userId))]
  const members = uids.map(uid => {
    const us = shifts.filter(s => s.userId === uid)
    const st = computeStats(us)
    // Include stored user info from most recent shift
    const last = [...us].sort((a, b) => new Date(b.startAt) - new Date(a.startAt))[0]
    return { userId: uid, userName: last?.userName || uid, userPoste: last?.userPoste || '', stats: st }
  }).sort((a, b) => b.stats.totalShifts - a.stats.totalShifts)
  res.json({ globalStats: computeStats(shifts), members })
})

// POST /api/shifts/record
router.post('/record', requireAuth, (req, res) => {
  const body     = req.body || {}
  const hospital = (body.hospital || '').toUpperCase()
  if (!HOSPITALS.includes(hospital)) return res.status(400).json({ error: 'Hôpital invalide' })
  if (!body.startAt || !body.endAt)  return res.status(400).json({ error: 'Heures requises' })

  const startDate = new Date(body.startAt)
  const endDate   = new Date(body.endAt)
  if (isNaN(startDate) || isNaN(endDate)) return res.status(400).json({ error: 'Format de date invalide' })
  if (endDate <= startDate) return res.status(400).json({ error: "L'heure de fin doit être après le début" })

  const roles = req.user?.roles || []
  let targetUserId = req.user.discordId
  let targetName   = req.user.name || req.user.username
  let targetPoste  = req.user.poste || ''

  if (body.userId && body.userId !== targetUserId) {
    if (!isManager(roles)) return res.status(403).json({ error: 'Seuls les HDP+ peuvent enregistrer pour autrui' })
    targetUserId = body.userId
    targetName   = body.userName   || body.userId
    targetPoste  = body.userPoste  || ''
  }

  const shift = {
    id:         randomUUID(),
    userId:     targetUserId,
    userName:   targetName,
    userPoste:  targetPoste,
    hospital,
    startAt:    startDate.toISOString(),
    endAt:      endDate.toISOString(),
    startLocal: body.startLocal || null,
    endLocal:   body.endLocal   || null,
    durationMs: endDate - startDate,
    note:       typeof body.note === 'string' ? body.note.trim() || null : null,
    createdBy:  req.user.discordId,
    createdAt:  new Date().toISOString(),
  }

  const shifts = loadShifts()
  shifts.push(shift)
  saveShifts(shifts)
  res.json({ success: true, shift })
})

// DELETE /api/shifts/:id
router.delete('/:id', requireAuth, (req, res) => {
  const roles        = req.user?.roles || []
  const targetUserId = (req.query.userId && isManager(roles)) ? req.query.userId : req.user.discordId
  const shifts       = loadShifts()
  const idx          = shifts.findIndex(s => s.id === req.params.id && s.userId === targetUserId)
  if (idx === -1) return res.status(404).json({ error: 'Service non trouvé' })
  shifts.splice(idx, 1)
  saveShifts(shifts)
  res.json({ success: true })
})

module.exports = router
