const express = require('express')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy
const fetch = require('node-fetch')
const { randomUUID } = require('crypto')
const { getPosteName } = require('../config/roles.js')

const router = express.Router()

const GUILD_ID = process.env.DISCORD_GUILD_ID || '1435626232749232181'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

// Tokens éphémères (60s) pour contourner le problème Set-Cookie sur redirects Cloudflare
const pendingTokens = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [token, data] of pendingTokens) {
    if (data.expires < now) pendingTokens.delete(token)
  }
}, 30_000)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNickname(nickname) {
  if (!nickname) return { prenom: null, nom: null }
  const parts = nickname.trim().split(/\s+/)
  if (parts.length >= 2) {
    return { prenom: parts[0], nom: parts.slice(1).join(' ').split('-')[0].trim() }
  }
  return { prenom: parts[0] || null, nom: null }
}

async function fetchGuildMember(userId) {
  if (!BOT_TOKEN) return null
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    )
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

// ─── Passport ─────────────────────────────────────────────────────────────────

passport.use(new DiscordStrategy(
  {
    clientID:     process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL:  process.env.DISCORD_CALLBACK_URL,
    scope:        ['identify', 'guilds'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const member = await fetchGuildMember(profile.id)

      const nickname = member?.nick || profile.global_name || profile.username
      const { prenom, nom } = parseNickname(nickname)
      const roles = member?.roles || []
      const poste = getPosteName(roles)

      const user = {
        discordId:  profile.id,
        username:   profile.username,
        name:       nickname,
        prenom,
        nom,
        poste,
        roles,
        avatar: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
      }

      return done(null, user)
    } catch (err) {
      return done(err, null)
    }
  }
))

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

// ─── Routes ───────────────────────────────────────────────────────────────────

// Démarre le flow OAuth Discord
router.get('/discord', passport.authenticate('discord'))

// Callback après auth Discord
router.get('/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login?error=auth' }),
  (req, res) => {
    // Générer un token éphémère et stocker l'utilisateur
    const token = randomUUID()
    pendingTokens.set(token, { user: req.user, expires: Date.now() + 60_000 })

    // Rediriger le frontend avec le token dans l'URL (pas de Set-Cookie ici)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
  }
)

// Échange du token contre une session (appelé par le frontend via fetch)
router.get('/exchange', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token manquant' })

  const entry = pendingTokens.get(token)
  if (!entry || entry.expires < Date.now()) {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }

  pendingTokens.delete(token)

  req.login(entry.user, (err) => {
    if (err) return res.status(500).json({ error: 'Erreur login' })
    req.session.save((err2) => {
      if (err2) return res.status(500).json({ error: 'Erreur session' })
      res.json({ user: entry.user })
    })
  })
})

// Infos de l'utilisateur connecté
router.get('/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ user: null })
  }
  res.json({ user: req.user })
})

// Déconnexion
router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy()
    res.json({ ok: true })
  })
})

module.exports = router
