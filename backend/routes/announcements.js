const express  = require('express')
const fetch    = require('node-fetch')
const router   = express.Router()

const CHANNEL_ID = '805493091380887642'
const BOT_TOKEN  = process.env.DISCORD_BOT_TOKEN

// ─── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' })
  next()
}

// ─── In-memory cache (2 minutes) ──────────────────────────────────────────────
let cachedMessages = null
let cacheExpiry    = 0

async function fetchDiscordMessages() {
  const now = Date.now()
  if (cachedMessages && now < cacheExpiry) return cachedMessages

  if (!BOT_TOKEN) throw new Error('BOT_TOKEN manquant')

  const r = await fetch(
    `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=50`,
    { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
  )

  if (!r.ok) {
    const err = await r.text()
    throw new Error(`Discord API ${r.status}: ${err}`)
  }

  const raw = await r.json()

  // Format messages
  const messages = raw
    .filter(m => m.type === 0 || m.type === 19) // normal + reply
    .map(m => ({
      id:        m.id,
      content:   m.content || '',
      timestamp: m.timestamp,
      editedAt:  m.edited_timestamp || null,
      pinned:    m.pinned || false,
      author: {
        id:            m.author.id,
        username:      m.author.username,
        globalName:    m.author.global_name || m.author.username,
        avatar:        m.author.avatar
          ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.webp?size=64`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(m.author.id) % 5}.png`,
        bot:           m.author.bot || false,
      },
      attachments: (m.attachments || []).map(a => ({
        id:          a.id,
        url:         a.url,
        proxyUrl:    a.proxy_url,
        filename:    a.filename,
        contentType: a.content_type || '',
        width:       a.width || null,
        height:      a.height || null,
        size:        a.size,
      })),
      embeds: (m.embeds || []).map(e => ({
        title:       e.title || null,
        description: e.description || null,
        url:         e.url || null,
        color:       e.color || null,
        image:       e.image?.url || null,
        thumbnail:   e.thumbnail?.url || null,
        footer:      e.footer?.text || null,
        fields:      (e.fields || []).map(f => ({ name: f.name, value: f.value, inline: f.inline })),
      })),
      reactions: (m.reactions || []).map(rx => ({
        emoji: rx.emoji.id
          ? `https://cdn.discordapp.com/emojis/${rx.emoji.id}.${rx.emoji.animated ? 'gif' : 'webp'}?size=32`
          : rx.emoji.name,
        isCustom: !!rx.emoji.id,
        count: rx.count,
      })),
      referencedMessage: m.referenced_message ? m.referenced_message.id : null,
    }))

  // Sort chronologically DESC (most recent first)
  messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  cachedMessages = messages
  cacheExpiry    = now + 2 * 60 * 1000  // 2 minutes
  return messages
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/announcements — list of messages
router.get('/', requireAuth, async (req, res) => {
  try {
    const messages = await fetchDiscordMessages()
    res.json({ messages, cachedAt: new Date(cacheExpiry - 2 * 60 * 1000).toISOString() })
  } catch (err) {
    console.error('[Announcements] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/announcements/refresh — force cache refresh
router.post('/refresh', requireAuth, async (req, res) => {
  cachedMessages = null
  cacheExpiry    = 0
  try {
    const messages = await fetchDiscordMessages()
    res.json({ messages, cachedAt: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
