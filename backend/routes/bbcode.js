const express    = require('express')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join }   = require('path')
const { randomUUID } = require('crypto')
const { requireAuth }  = require('../middleware/auth.js')
const { isManager, isSupervisor } = require('../config/roles.js')
const { log } = require('../utils/logger.js')

const router   = express.Router()
const DATA_DIR = join(__dirname, '..', 'data')
const TPLFILE  = join(DATA_DIR, 'bbcode-templates.json')

// ─── Catégories avec logos ────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'emt',        label: 'EMT',               icon: 'https://zupimages.net/up/24/16/127a.png' },
  { id: 'mers',       label: 'MERS',              icon: 'https://zupimages.net/up/24/16/u8bk.png' },
  { id: 'med-gen',    label: 'Médecine Générale', icon: 'https://zupimages.net/up/23/35/br9g.png' },
  { id: 'psy',        label: 'Psychiatrie',       icon: 'https://zupimages.net/up/24/16/rn70.png' },
  { id: 'chirurgie',  label: 'Chirurgie',         icon: 'https://zupimages.net/up/24/16/aghk.png' },
  { id: 'med-legale', label: 'Médecine Légale',   icon: 'https://zupimages.net/up/23/30/x0x4.png' },
  { id: 'rh',         label: 'RH',                icon: 'https://zupimages.net/up/25/45/s9h6.png' },
  { id: 'autres',     label: 'Autres',            icon: 'https://i.ibb.co/Zzzf4jmv/5895032.png' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadTemplates() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(TPLFILE)) { writeFileSync(TPLFILE, '[]'); return [] }
  try { return JSON.parse(readFileSync(TPLFILE, 'utf8')) } catch { return [] }
}

function saveTemplates(t) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(TPLFILE, JSON.stringify(t, null, 2))
}

function shortId() {
  return randomUUID().replace(/-/g, '').slice(0, 8)
}

// Re-calcule les tokens à partir des IDs (source de vérité = sectionId + fieldId)
function ensureTokens(sections = []) {
  return sections.map(sec => {
    const secId = sec.id || `sec-${shortId()}`
    return {
      ...sec,
      id: secId,
      fields: (sec.fields || []).map(f => {
        const fldId = f.id || `fld-${shortId()}`
        return {
          ...f,
          id:    fldId,
          token: `{{${secId}.${fldId}}}`,
        }
      }),
    }
  })
}

// Formate une valeur selon le type du champ
function formatValue(value, type, defaultVal = '') {
  const v = value === null || value === undefined ? '' : String(value).trim()
  if (!v) return defaultVal
  if (type === 'datetime') {
    const clean = v.replace(/\s*\|\s*/, 'T').replace(' ', 'T')
    try {
      const d = new Date(clean)
      if (!isNaN(d)) {
        const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
        return `${date} à ${time.replace(':', 'h')}`
      }
    } catch {}
  }
  if (type === 'date') {
    try {
      const d = new Date(v)
      if (!isNaN(d)) return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {}
  }
  return v
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/bbcode/categories
router.get('/categories', requireAuth, (req, res) => {
  const templates = loadTemplates()
  const cats = CATEGORIES.map(c => ({
    ...c,
    count: templates.filter(t => t.categoryId === c.id).length,
  }))
  res.json({ categories: cats })
})

// GET /api/bbcode/templates
router.get('/templates', requireAuth, (req, res) => {
  const { categoryId } = req.query
  let t = loadTemplates()
  if (categoryId) t = t.filter(x => x.categoryId === categoryId)
  res.json({ templates: t, categories: CATEGORIES })
})

// GET /api/bbcode/templates/:id
router.get('/templates/:id', requireAuth, (req, res) => {
  const t = loadTemplates().find(x => x.id === req.params.id)
  if (!t) return res.status(404).json({ error: 'Template introuvable' })
  res.json({ template: t })
})

// POST /api/bbcode/templates  (Shift SPV+)
router.post('/templates', requireAuth, (req, res) => {
  if (!isSupervisor(req.user?.roles || []))
    return res.status(403).json({ error: 'Réservé aux Shift Supervisors et supérieurs' })

  const { title, categoryId, description, bbcode, sections } = req.body || {}
  if (!title?.trim())  return res.status(400).json({ error: 'Titre requis' })
  if (!bbcode?.trim()) return res.status(400).json({ error: 'Contenu BBCode requis' })
  if (!CATEGORIES.find(c => c.id === categoryId))
    return res.status(400).json({ error: 'Catégorie invalide' })

  const tpl = {
    id:            randomUUID(),
    categoryId,
    title:         title.trim(),
    description:   description?.trim() || '',
    bbcode,
    sections:      ensureTokens(sections || []),
    createdBy:     req.user.discordId,
    createdByName: req.user.name,
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
  }
  const all = loadTemplates()
  all.push(tpl)
  saveTemplates(all)
  log(req.user.discordId, req.user.name, 'TEMPLATE_CREATED', `« ${tpl.title} » (${categoryId})`)
  res.json({ success: true, template: tpl })
})

// PUT /api/bbcode/templates/:id
router.put('/templates/:id', requireAuth, (req, res) => {
  if (!isSupervisor(req.user?.roles || []))
    return res.status(403).json({ error: 'Accès refusé' })
  const all = loadTemplates()
  const idx = all.findIndex(x => x.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Template introuvable' })
  const t = all[idx]
  if (t.createdBy !== req.user.discordId && !isManager(req.user?.roles || []))
    return res.status(403).json({ error: 'Seul le créateur ou un manager peut modifier cette template' })

  const { title, categoryId, description, bbcode, sections } = req.body || {}
  all[idx] = {
    ...t,
    title:       title?.trim()                              ?? t.title,
    categoryId:  CATEGORIES.find(c => c.id === categoryId) ? categoryId : t.categoryId,
    description: description?.trim()                       ?? t.description,
    bbcode:      bbcode                                     ?? t.bbcode,
    sections:    ensureTokens(sections                      ?? t.sections),
    updatedAt:   new Date().toISOString(),
  }
  saveTemplates(all)
  log(req.user.discordId, req.user.name, 'TEMPLATE_UPDATED', `« ${all[idx].title} »`)
  res.json({ success: true, template: all[idx] })
})

// DELETE /api/bbcode/templates/:id
router.delete('/templates/:id', requireAuth, (req, res) => {
  if (!isSupervisor(req.user?.roles || []))
    return res.status(403).json({ error: 'Accès refusé' })
  const all = loadTemplates()
  const idx = all.findIndex(x => x.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Template introuvable' })
  const t = all[idx]
  if (t.createdBy !== req.user.discordId && !isManager(req.user?.roles || []))
    return res.status(403).json({ error: 'Seul le créateur ou un manager peut supprimer' })
  all.splice(idx, 1)
  saveTemplates(all)
  log(req.user.discordId, req.user.name, 'TEMPLATE_DELETED', `« ${t.title} »`)
  res.json({ success: true })
})

// POST /api/bbcode/templates/:id/render — Génère le BBCode avec les valeurs remplies
router.post('/templates/:id/render', requireAuth, (req, res) => {
  const tpl = loadTemplates().find(x => x.id === req.params.id)
  if (!tpl) return res.status(404).json({ error: 'Template introuvable' })

  const { values = {} } = req.body || {}
  const missing = []
  const replacements = {}

  for (const sec of tpl.sections || []) {
    for (const field of sec.fields || []) {
      const key   = `${sec.id}.${field.id}`
      const token = field.token || `{{${sec.id}.${field.id}}}`
      const raw   = values[key]

      if ((raw === undefined || raw === null || String(raw).trim() === '') && field.required) {
        missing.push(field.label || key)
        continue
      }
      replacements[token] = formatValue(raw, field.type, field.defaultValue || '')
    }
  }

  if (missing.length) {
    return res.status(400).json({ error: `Champs obligatoires manquants : ${missing.join(', ')}` })
  }

  // Remplacement global des tokens
  let output = tpl.bbcode
  for (const [token, value] of Object.entries(replacements)) {
    // Split + join = remplacement global sans regex (gère les caractères spéciaux)
    output = output.split(token).join(value)
  }

  res.json({ bbcode: output, replacements })
})

module.exports = router
