const express = require('express')
const passport = require('passport')
const DiscordStrategy = require('passport-discord').Strategy
const fetch = require('node-fetch')
const { getPosteName } = require('../config/roles.js')

const router = express.Router()

const GUILD_ID = process.env.DISCORD_GUILD_ID || '1435626232749232181'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/auth/callback`)
  }
)

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
