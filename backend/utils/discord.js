const fetch      = require('node-fetch')
const { getPosteName } = require('../config/roles.js')

const GUILD_ID  = process.env.DISCORD_GUILD_ID || '1435626232749232181'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

// ─── Cache en mémoire (TTL 10 min) ────────────────────────────────────────────
const _cache   = new Map()  // userId → { data, cachedAt }
const CACHE_TTL = 10 * 60 * 1000  // 10 minutes

// ─── Fetch d'un membre Discord (avec cache) ───────────────────────────────────
async function fetchGuildMember(userId) {
  if (!BOT_TOKEN) return null

  const cached = _cache.get(userId)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.data

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    )
    const data = res.ok ? await res.json() : null
    _cache.set(userId, { data, cachedAt: Date.now() })
    return data
  } catch {
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNickname(nickname) {
  if (!nickname) return { prenom: null, nom: null }
  const parts = nickname.trim().split(/\s+/)
  if (parts.length >= 2) {
    return { prenom: parts[0], nom: parts.slice(1).join(' ').split('-')[0].trim() }
  }
  return { prenom: parts[0] || null, nom: null }
}

// Résout userId → { userName, userPoste } via l'API Discord
async function resolveMember(userId) {
  const member = await fetchGuildMember(userId)
  if (!member) return { userName: null, userPoste: '' }
  const userName  = member.nick || member.user?.global_name || member.user?.username || null
  const userPoste = getPosteName(member.roles || [])
  return { userName, userPoste }
}

module.exports = { fetchGuildMember, parseNickname, resolveMember }
