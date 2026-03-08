const express = require('express')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join }  = require('path')
const { requireAuth } = require('../middleware/auth.js')

const router      = express.Router()
const DATA_DIR    = join(__dirname, '..', 'data')
const BIPPER_FILE = join(DATA_DIR, 'bipper-requests.json')

const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

const UNITS = [
  { id: 'nfd',         label: 'NFD',                    roleId: '816032347790114856' },
  { id: 'dsco',        label: 'DSCO',                   roleId: '88013481852286979'  },
  { id: 'paramedical', label: 'Dept. Paramédical',      roleId: '805481706450714624' },
  { id: 'urgences',    label: "Médecine d'Urgence",     roleId: '805481782748643348' },
  { id: 'generale',    label: 'Médecine Générale',      roleId: '805481783591960626' },
  { id: 'psychiatrie', label: 'Médecine Psychiatrique', roleId: '805485022618452045' },
  { id: 'legale',      label: 'Médecine Légale',        roleId: '805485018926940160' },
  { id: 'chirurgie',   label: 'Chirurgie polyvalente',  roleId: '805486452963672094' },
  { id: 'securite',    label: 'Sécurité hospitalière',  roleId: '1071147009215565875' },
]

// Pour l'instant tout va dans le canal de test
const HOSPITALS = [
  { id: 'tmc', label: 'TMC', channelId: '1480261168777007156' },
  { id: 'nmh', label: 'NMH', channelId: '1480261168777007156' },
]

function loadRequests() {
  if (!existsSync(BIPPER_FILE)) return []
  try { return JSON.parse(readFileSync(BIPPER_FILE, 'utf8')) } catch { return [] }
}

function saveRequests(requests) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(BIPPER_FILE, JSON.stringify(requests, null, 2))
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

// GET /api/bipper/units — liste des unités + état du cooldown
router.get('/units', requireAuth, (req, res) => {
  const requests = loadRequests()
  const now      = Date.now()

  const units = UNITS.map(unit => {
    const lastSent = requests
      .filter(r => r.unitId === unit.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

    const cooldownUntil = lastSent
      ? new Date(lastSent.createdAt).getTime() + COOLDOWN_MS
      : 0

    return {
      ...unit,
      onCooldown:    now < cooldownUntil,
      cooldownUntil: cooldownUntil > now ? cooldownUntil : null,
    }
  })

  res.json({ units, hospitals: HOSPITALS })
})

// GET /api/bipper — 30 dernières demandes
router.get('/', requireAuth, (req, res) => {
  const requests = loadRequests()
  const sorted   = requests
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30)
  res.json({ requests: sorted })
})

// POST /api/bipper — créer une demande
router.post('/', requireAuth, (req, res) => {
  const { unitId, hospital, location, interventionType, urgency, info } = req.body || {}

  if (!unitId || !hospital || !location || !interventionType || !urgency)
    return res.status(400).json({ error: 'Champs requis manquants' })

  const unit = UNITS.find(u => u.id === unitId)
  if (!unit) return res.status(400).json({ error: 'Unité inconnue' })

  const hosp = HOSPITALS.find(h => h.id === hospital)
  if (!hosp) return res.status(400).json({ error: 'Hôpital inconnu' })

  const requests = loadRequests()
  const now      = Date.now()

  // Vérification du cooldown
  const lastSent = requests
    .filter(r => r.unitId === unitId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]

  if (lastSent) {
    const cooldownUntil = new Date(lastSent.createdAt).getTime() + COOLDOWN_MS
    if (now < cooldownUntil) {
      const remaining = Math.ceil((cooldownUntil - now) / 1000 / 60)
      return res.status(429).json({
        error: `Cooldown actif. Réessayez dans ${remaining} min.`,
        cooldownUntil,
      })
    }
  }

  const newRequest = {
    id:               generateId(),
    unitId,
    unitRoleId:       unit.roleId,
    unitLabel:        unit.label,
    hospital:         hosp.id,
    hospitalLabel:    hosp.label,
    channelId:        hosp.channelId,
    location:         location.trim(),
    interventionType: interventionType.trim(),
    urgency,
    info:             info?.trim() || null,
    requestedByName:  req.user.name,
    requestedById:    req.user.discordId,
    status:           'pending',
    discordSent:      false,
    discordMessageId: null,
    discordChannelId: hosp.channelId,
    acceptedBy:       null,
    acceptedByName:   null,
    acceptedAt:       null,
    createdAt:        new Date().toISOString(),
    updatedAt:        new Date().toISOString(),
  }

  requests.push(newRequest)
  saveRequests(requests)

  res.json({ success: true, request: newRequest })
})

// PATCH /api/bipper/:id — mise à jour du statut
router.patch('/:id', requireAuth, (req, res) => {
  const { status } = req.body || {}
  const valid = ['pending', 'accepted', 'in_progress', 'completed']

  if (!valid.includes(status))
    return res.status(400).json({ error: 'Statut invalide' })

  const requests = loadRequests()
  const idx = requests.findIndex(r => r.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Demande introuvable' })

  requests[idx].status    = status
  requests[idx].updatedAt = new Date().toISOString()

  if (status === 'accepted' && !requests[idx].acceptedBy) {
    requests[idx].acceptedBy     = req.user.discordId
    requests[idx].acceptedByName = req.user.name
    requests[idx].acceptedAt     = new Date().toISOString()
  }

  saveRequests(requests)
  res.json({ success: true, request: requests[idx] })
})

module.exports = router
module.exports.UNITS     = UNITS
module.exports.HOSPITALS = HOSPITALS
