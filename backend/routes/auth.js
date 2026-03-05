const express = require('express')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy
const { randomUUID } = require('crypto')
const { getPosteName } = require('../config/roles.js')
const { fetchGuildMember, parseNickname } = require('../utils/discord.js')

const router = express.Router()

// Tokens éphémères (60s) pour contourner le problème Set-Cookie sur redirects Cloudflare
const pendingTokens = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [token, data] of pendingTokens) {
    if (data.expires < now) pendingTokens.delete(token)
  }
}, 30_000)

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
router.get('/discord/callback', (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  passport.authenticate('discord', (err, user) => {
    if (err || !user) {
      console.error('[AUTH CALLBACK] Erreur:', err?.message || 'no user')
      return res.redirect(`${frontendUrl}/login?error=auth`)
    }

    const token = randomUUID()
    pendingTokens.set(token, { user, expires: Date.now() + 60_000 })
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
  })(req, res, next)
})

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
