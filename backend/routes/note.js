const express  = require('express')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join }  = require('path')
const { requireAuth } = require('../middleware/auth.js')
const { isShiftSupervisor } = require('../config/roles.js')

const router   = express.Router()
const DATA_DIR = join(__dirname, '..', 'data')
const NOTE_FILE = join(DATA_DIR, 'service-note.json')

function loadNote() {
  if (!existsSync(NOTE_FILE)) return null
  try { return JSON.parse(readFileSync(NOTE_FILE, 'utf8')) } catch { return null }
}

function saveNote(note) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(NOTE_FILE, JSON.stringify(note, null, 2))
}

// GET /api/note — tous les membres authentifiés
router.get('/', requireAuth, (req, res) => {
  res.json({ note: loadNote() })
})

// POST /api/note — Shift SPV+
router.post('/', requireAuth, (req, res) => {
  if (!isShiftSupervisor(req.user?.roles || []))
    return res.status(403).json({ error: 'Réservé aux Shift Supervisors et supérieurs' })

  const { content } = req.body || {}
  if (!content?.trim())
    return res.status(400).json({ error: 'Contenu requis' })
  if (content.trim().length > 500)
    return res.status(400).json({ error: 'Maximum 500 caractères' })

  const note = {
    content:    content.trim(),
    author:     req.user.name,
    authorId:   req.user.discordId,
    updatedAt:  new Date().toISOString(),
  }
  saveNote(note)
  res.json({ success: true, note })
})

// DELETE /api/note — Shift SPV+
router.delete('/', requireAuth, (req, res) => {
  if (!isShiftSupervisor(req.user?.roles || []))
    return res.status(403).json({ error: 'Réservé aux Shift Supervisors et supérieurs' })

  if (existsSync(NOTE_FILE)) {
    const { unlinkSync } = require('fs')
    unlinkSync(NOTE_FILE)
  }
  res.json({ success: true })
})

module.exports = router
