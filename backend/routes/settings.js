const express  = require('express')
const fetch    = require('node-fetch')
const path     = require('path')
const fs       = require('fs')
const os       = require('os')
const { execFile } = require('child_process')
const { requireAuth } = require('../middleware/auth.js')
const { getSettings, updateSettings } = require('../utils/userSettings.js')
const { getLogsForUser } = require('../utils/logger.js')
const { cacheUser } = require('../utils/discord.js')
const { getUserLevel } = require('../config/roles.js')

const router   = express.Router()
const GUILD_ID  = process.env.DISCORD_GUILD_ID || '1435626232749232181'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

// ─── Discord nick update ───────────────────────────────────────────────────────

async function updateDiscordNick(userId, nick) {
  if (!BOT_TOKEN) throw new Error('Bot token manquant')
  const r = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
    {
      method:  'PATCH',
      headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nick }),
    }
  )
  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Discord PATCH nick ${r.status}: ${err}`)
  }
}

// ─── Docx generation ──────────────────────────────────────────────────────────

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateDocx(nom, prenom, adresse) {
  let PizZip, Docxtemplater
  try {
    PizZip = require('pizzip')
    Docxtemplater = require('docxtemplater')
  } catch {
    PizZip = null
  }

  const templatePath = path.join(__dirname, '..', 'data', 'contrat-template.docx')
  if (!fs.existsSync(templatePath)) throw new Error('Template contrat introuvable')

  const content = fs.readFileSync(templatePath, 'binary')

  // Méthode 1 : docxtemplater (gère les runs fragmentés)
  if (PizZip && Docxtemplater) {
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      delimiters: { start: '__', end: '__' },
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    })
    doc.render({
      NOM_MAJ: nom.toUpperCase(),
      PRENOM:  prenom,
      ADRESSE: adresse,
    })
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
  }

  // Méthode 2 : remplacement XML direct (fallback)
  if (!PizZip) PizZip = require('pizzip')
  const zip2 = new PizZip(content)
  const xml  = zip2.files['word/document.xml'].asText()
  const replaced = xml
    .replace(/__NOM_MAJ__/g, escapeXml(nom.toUpperCase()))
    .replace(/__PRENOM__/g,  escapeXml(prenom))
    .replace(/__ADRESSE__/g, escapeXml(adresse))
  zip2.file('word/document.xml', replaced)
  return zip2.generate({ type: 'nodebuffer', compression: 'DEFLATE' })
}

// ─── Docx → PDF via LibreOffice ───────────────────────────────────────────────

function convertToPdf(docxBuffer) {
  return new Promise((resolve, reject) => {
    const tmpId   = `contract-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tmpDocx = path.join(os.tmpdir(), `${tmpId}.docx`)
    const tmpPdf  = path.join(os.tmpdir(), `${tmpId}.pdf`)

    fs.writeFileSync(tmpDocx, docxBuffer)

    // Try libreoffice, fallback to soffice
    const bin = process.platform === 'win32' ? 'soffice' : 'libreoffice'

    execFile(bin, [
      '--headless',
      '--convert-to', 'pdf',
      '--outdir', os.tmpdir(),
      tmpDocx,
    ], { timeout: 30000 }, (err) => {
      try { fs.unlinkSync(tmpDocx) } catch {}

      if (err) {
        try { fs.unlinkSync(tmpPdf) } catch {}
        return reject(new Error(`Conversion PDF échouée: ${err.message}`))
      }

      try {
        const pdfBuf = fs.readFileSync(tmpPdf)
        fs.unlinkSync(tmpPdf)
        resolve(pdfBuf)
      } catch (e) {
        reject(new Error('Fichier PDF introuvable après conversion'))
      }
    })
  })
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/settings/me
router.get('/me', requireAuth, (req, res) => {
  const userId   = req.user.discordId
  const settings = getSettings(userId)
  const logs     = getLogsForUser(userId)

  res.json({
    nom:     settings.nom    ?? req.user.nom    ?? null,
    prenom:  settings.prenom ?? req.user.prenom ?? null,
    adresse: settings.adresse ?? null,
    logs,
  })
})

// PATCH /api/settings/me — nom / prénom / adresse
router.patch('/me', requireAuth, async (req, res) => {
  const userId  = req.user.discordId
  const { nom, prenom, adresse } = req.body

  const fields = {}
  if (nom     !== undefined) fields.nom     = String(nom).trim()
  if (prenom  !== undefined) fields.prenom  = String(prenom).trim()
  if (adresse !== undefined) fields.adresse = String(adresse).trim()

  // Mise à jour pseudo Discord si nom/prénom changés
  if (fields.nom !== undefined || fields.prenom !== undefined) {
    const newNom    = fields.nom    ?? getSettings(userId).nom    ?? req.user.nom    ?? ''
    const newPrenom = fields.prenom ?? getSettings(userId).prenom ?? req.user.prenom ?? ''
    if (newPrenom || newNom) {
      const newNick = [newPrenom, newNom.toUpperCase()].filter(Boolean).join(' ')
      try {
        await updateDiscordNick(userId, newNick)
        cacheUser(userId, newNick, req.user.poste, getUserLevel(req.user.roles || []))
        req.user.nom    = newNom
        req.user.prenom = newPrenom
        req.user.name   = newNick
      } catch (err) {
        console.error('[Settings] Discord nick update failed:', err.message)
        // Non-bloquant
      }
    }
  }

  const saved = updateSettings(userId, fields)

  res.json({
    nom:     saved.nom     ?? req.user.nom    ?? null,
    prenom:  saved.prenom  ?? req.user.prenom ?? null,
    adresse: saved.adresse ?? null,
  })
})

// GET /api/settings/me/contract — télécharger son contrat en PDF
router.get('/me/contract', requireAuth, async (req, res) => {
  const userId   = req.user.discordId
  const settings = getSettings(userId)

  const adresse = settings.adresse?.trim()
  if (!adresse) {
    return res.status(400).json({ error: 'Renseignez votre adresse avant de télécharger votre contrat.' })
  }

  const nom    = (settings.nom    ?? req.user.nom    ?? '').trim()
  const prenom = (settings.prenom ?? req.user.prenom ?? '').trim()

  if (!nom || !prenom) {
    return res.status(400).json({ error: 'Renseignez votre nom et prénom.' })
  }

  try {
    const docxBuf = generateDocx(nom, prenom, adresse)
    const pdfBuf  = await convertToPdf(docxBuf)

    const safeName = `contrat-${nom.toUpperCase()}-${prenom}`
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_]/g, '')

    res.set('Content-Disposition', `attachment; filename="${safeName}.pdf"`)
    res.set('Content-Type', 'application/pdf')
    res.send(pdfBuf)
  } catch (err) {
    console.error('[Settings] Contract error:', err.message)
    res.status(500).json({ error: `Erreur: ${err.message}` })
  }
})

module.exports = router
