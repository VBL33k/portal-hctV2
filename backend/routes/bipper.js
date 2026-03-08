const express = require('express')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join }  = require('path')
const { requireAuth } = require('../middleware/auth.js')

const router      = express.Router()
const DATA_DIR    = join(__dirname, '..', 'data')
const BIPPER_FILE = join(DATA_DIR, 'bipper-requests.json')

const UNITS = [
  { id: 'nfd',         label: 'NFD',                    roleId: '816032347790114856' },
  { id: 'dcso',        label: 'DCSO',                   roleId: '880134818522869791' },
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

// GET /api/bipper/units — liste des unités
router.get('/units', requireAuth, (req, res) => {
  res.json({ units: UNITS, hospitals: HOSPITALS })
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

  const newRequest = {
    id:                    generateId(),
    unitId,
    unitRoleId:            unit.roleId,
    unitLabel:             unit.label,
    hospital:              hosp.id,
    hospitalLabel:         hosp.label,
    channelId:             hosp.channelId,
    location:              location.trim(),
    interventionType:      interventionType.trim(),
    urgency,
    info:                  info?.trim() || null,
    requestedByName:       req.user.name,
    requestedById:         req.user.discordId,
    status:                'pending',
    discordSent:           false,
    discordMessageId:      null,
    discordChannelId:      hosp.channelId,
    discordCompletionSent: false,
    acceptedBy:            null,
    acceptedByName:        null,
    acceptedAt:            null,
    createdAt:             new Date().toISOString(),
    updatedAt:             new Date().toISOString(),
  }

  requests.push(newRequest)
  saveRequests(requests)

  res.json({ success: true, request: newRequest })
})

// PATCH /api/bipper/:id — mise à jour du statut
router.patch('/:id', requireAuth, (req, res) => {
  const { status } = req.body || {}
  const valid = ['pending', 'accepted', 'completed']

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

  // Quand terminée → le bot doit mettre à jour l'embed
  if (status === 'completed') {
    requests[idx].completedByName = req.user.name
    requests[idx].completedAt     = new Date().toISOString()
    requests[idx].discordCompletionSent = false
  }

  saveRequests(requests)
  res.json({ success: true, request: requests[idx] })
})

module.exports = router
module.exports.UNITS     = UNITS
module.exports.HOSPITALS = HOSPITALS
