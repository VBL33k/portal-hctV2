const express = require('express')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy
const { randomUUID } = require('crypto')
const { getPosteName, getUserLevel } = require('../config/roles.js')
const { fetchGuildMember, parseNickname, cacheUser } = require('../utils/discord.js')
const { log } = require('../utils/logger.js')

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
      // force=true → toujours appel API frais à la connexion, jamais de cache rôles périmé
      const member = await fetchGuildMember(profile.id, true)

      const nickname = member?.nick || profile.global_name || profile.username
      const { prenom, nom } = parseNickname(nickname)
      const roles = member?.roles || []
      const poste = getPosteName(roles)

      // Bloquer les utilisateurs sans rôle reconnu (pas sur le serveur ou simple citoyen)
      if (getUserLevel(roles) < 0) {
        console.warn(`[AUTH] Accès refusé pour ${profile.username} — aucun rôle HCT reconnu`)
        return done(null, false, { message: 'access' })
      }

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

  passport.authenticate('discord', (err, user, info) => {
    if (err || !user) {
      // info.message === 'access' → l'utilisateur est authentifié mais sans rôle HCT
      const errorCode = (!user && info?.message === 'access') ? 'access' : 'auth'
      console.error('[AUTH CALLBACK] Erreur:', err?.message || `no user (${errorCode})`)
      return res.redirect(`${frontendUrl}/login?error=${errorCode}`)
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
      // Persist user name + level so it's available even s'il quitte le serveur plus tard
      const lvl = getUserLevel(entry.user.roles || [])
      cacheUser(entry.user.discordId, entry.user.name, entry.user.poste, lvl)
      log(entry.user.discordId, entry.user.name, 'LOGIN', `Connexion via Discord OAuth`)
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
