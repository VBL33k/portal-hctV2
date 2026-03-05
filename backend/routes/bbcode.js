const express    = require('express')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join }   = require('path')
const { randomUUID } = require('crypto')
const { requireAuth } = require('../middleware/auth.js')
const { isManager, isSupervisor } = require('../config/roles.js')

const router    = express.Router()
const DATA_DIR  = join(__dirname, '..', 'data')
const DATA_FILE = join(DATA_DIR, 'bbcode-templates.json')

const CATEGORIES = [
  'Médecine légale',
  'Psychiatrie',
  'Urgences',
  'Chirurgie',
  'Pédiatrie',
  'Rapport général',
  'Soins intensifs',
  'Autre',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadTemplates() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) { writeFileSync(DATA_FILE, '[]'); return [] }
  try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')) } catch { return [] }
}

function saveTemplates(templates) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(templates, null, 2))
}

// Extrait automatiquement les variables {placeholder} du contenu BBCode
function extractFields(content) {
  const raw = [...new Set((content.match(/\{([^}]+)\}/g) || []))]
  return raw.map(m => {
    const id = m.slice(1, -1).trim()
    return {
      id,
      label: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type:  'text',
    }
  })
}

// Fusionne les définitions custom avec les champs auto-détectés
function mergeFields(content, customFields = []) {
  const auto = extractFields(content)
  return auto.map(af => {
    const custom = customFields.find(f => f.id === af.id)
    return custom ? { ...af, ...custom } : af
  })
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/bbcode/templates — liste toutes les templates (avec filtre catégorie)
router.get('/templates', requireAuth, (req, res) => {
  const templates = loadTemplates()
  const { category } = req.query
  const result = category
    ? templates.filter(t => t.category === category)
    : templates
  res.json({ templates: result, categories: CATEGORIES })
})

// GET /api/bbcode/templates/:id — détail d'une template
router.get('/templates/:id', requireAuth, (req, res) => {
  const template = loadTemplates().find(t => t.id === req.params.id)
  if (!template) return res.status(404).json({ error: 'Template introuvable' })
  res.json({ template })
})

// POST /api/bbcode/templates — créer une template (Shift SPV+)
router.post('/templates', requireAuth, (req, res) => {
  if (!isSupervisor(req.user?.roles || [])) {
    return res.status(403).json({ error: 'Réservé aux Shift Supervisors et supérieurs' })
  }

  const { title, category, description, content, fields } = req.body || {}
  if (!title?.trim())   return res.status(400).json({ error: 'Titre requis' })
  if (!content?.trim()) return res.status(400).json({ error: 'Contenu requis' })
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Catégorie invalide' })

  const template = {
    id:            randomUUID(),
    title:         title.trim(),
    category,
    description:   description?.trim() || '',
    content,
    fields:        mergeFields(content, fields),
    createdBy:     req.user.discordId,
    createdByName: req.user.name,
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
  }

  const templates = loadTemplates()
  templates.push(template)
  saveTemplates(templates)
  res.json({ success: true, template })
})

// PUT /api/bbcode/templates/:id — modifier une template
router.put('/templates/:id', requireAuth, (req, res) => {
  if (!isSupervisor(req.user?.roles || [])) {
    return res.status(403).json({ error: 'Accès refusé' })
  }

  const templates = loadTemplates()
  const idx = templates.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Template introuvable' })

  const t = templates[idx]
  if (t.createdBy !== req.user.discordId && !isManager(req.user?.roles || [])) {
    return res.status(403).json({ error: 'Seul le créateur ou un manager peut modifier cette template' })
  }

  const { title, category, description, content, fields } = req.body || {}
  const newContent = content || t.content

  templates[idx] = {
    ...t,
    title:       title?.trim()           || t.title,
    category:    CATEGORIES.includes(category) ? category : t.category,
    description: description?.trim()     ?? t.description,
    content:     newContent,
    fields:      mergeFields(newContent, fields),
    updatedAt:   new Date().toISOString(),
  }
  saveTemplates(templates)
  res.json({ success: true, template: templates[idx] })
})

// DELETE /api/bbcode/templates/:id — supprimer une template
router.delete('/templates/:id', requireAuth, (req, res) => {
  if (!isSupervisor(req.user?.roles || [])) {
    return res.status(403).json({ error: 'Accès refusé' })
  }

  const templates = loadTemplates()
  const idx = templates.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Template introuvable' })

  const t = templates[idx]
  if (t.createdBy !== req.user.discordId && !isManager(req.user?.roles || [])) {
    return res.status(403).json({ error: 'Seul le créateur ou un manager peut supprimer cette template' })
  }

  templates.splice(idx, 1)
  saveTemplates(templates)
  res.json({ success: true })
})

module.exports = router
