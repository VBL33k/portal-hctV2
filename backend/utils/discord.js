const fetch      = require('node-fetch')
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join }   = require('path')
const { getPosteName, getUserLevel } = require('../config/roles.js')

const GUILD_ID  = process.env.DISCORD_GUILD_ID || '1435626232749232181'
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

// ─── Cache persistant (JSON sur disque) ──────────────────────────────────────
// Survit aux redémarrages — contient les membres passés qui ont quitté le serveur
const DATA_DIR   = join(__dirname, '..', 'data')
const CACHE_FILE = join(DATA_DIR, 'member-cache.json')

function loadPersistentCache() {
  if (!existsSync(CACHE_FILE)) return {}
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')) } catch { return {} }
}

function savePersistentCache(cache) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
  } catch {}
}

// Enregistre / met à jour un membre dans le cache persistant
function cacheUser(userId, userName, userPoste, userLevel = -1) {
  if (!userId || !userName) return
  const cache = loadPersistentCache()
  const existing = cache[userId] || {}
  cache[userId] = {
    userName,
    userPoste:  userPoste  || existing.userPoste  || '',
    userLevel:  userLevel  >= 0 ? userLevel : (existing.userLevel ?? -1),
    updatedAt:  new Date().toISOString(),
  }
  savePersistentCache(cache)
}

// Retourne le cache persistant complet (pour le module Personnel)
function getCachedMembers() {
  return loadPersistentCache()
}

// ─── Cache API en mémoire (TTL 10 min) ────────────────────────────────────────
const _apiCache = new Map()  // userId → { data, cachedAt }
const CACHE_TTL = 10 * 60 * 1000

// ─── Fetch individuel d'un membre Discord ─────────────────────────────────────
// force = true → bypass le cache en mémoire (utilisé à la connexion pour avoir les rôles frais)
async function fetchGuildMember(userId, force = false) {
  if (!BOT_TOKEN) return null

  if (!force) {
    const cached = _apiCache.get(userId)
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.data
  }

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    )
    const data = res.ok ? await res.json() : null
    // Mettre à jour le cache même en mode force
    _apiCache.set(userId, { data, cachedAt: Date.now() })
    return data
  } catch {
    return null
  }
}

// ─── Fetch bulk : tous les membres du serveur ─────────────────────────────────
// Nécessite l'intent GUILD_MEMBERS activé dans le portail Discord Developer
async function fetchAllGuildMembers() {
  if (!BOT_TOKEN) return []
  const members = []
  let after = '0'
  try {
    while (true) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.warn('[Discord] Bulk members fetch failed:', res.status, err?.message || '')
        break
      }
      const batch = await res.json()
      if (!Array.isArray(batch) || batch.length === 0) break
      members.push(...batch)
      after = batch[batch.length - 1].user.id
      if (batch.length < 1000) break
    }
  } catch (e) {
    console.warn('[Discord] Bulk members fetch error:', e.message)
  }
  return members
}

// ─── Warmup au démarrage ──────────────────────────────────────────────────────
// Charge tous les membres actuels du serveur et met à jour le cache persistant
async function warmupMemberCache() {
  if (!BOT_TOKEN) return
  console.log('[Discord] Warmup cache membres...')
  const members = await fetchAllGuildMembers()
  if (!members.length) {
    console.log('[Discord] Aucun membre récupéré (intent GUILD_MEMBERS désactivé ?)')
    return
  }
  const cache = loadPersistentCache()
  for (const member of members) {
    const userId    = member.user?.id
    const userName  = member.nick || member.user?.global_name || member.user?.username
    const userPoste = getPosteName(member.roles || [])
    const userLevel = getUserLevel(member.roles || [])
    if (userId && userName) {
      cache[userId] = { userName, userPoste, userLevel, updatedAt: new Date().toISOString() }
    }
  }
  savePersistentCache(cache)
  console.log(`[Discord] Cache persistant mis à jour : ${members.length} membres`)
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

// Résout userId → { userName, userPoste }
// Priorité : API Discord (membre actuel) > cache persistant (ancien membre) > null
async function resolveMember(userId) {
  // 1. API Discord (membre encore dans le serveur)
  const member = await fetchGuildMember(userId)
  if (member) {
    const userName  = member.nick || member.user?.global_name || member.user?.username || null
    const userPoste = getPosteName(member.roles || [])
    const userLevel = getUserLevel(member.roles || [])
    if (userName) cacheUser(userId, userName, userPoste, userLevel)  // met à jour le cache
    return { userName, userPoste, userLevel }
  }

  // 2. Cache persistant (a quitté le serveur mais connu de v2 ou du warmup)
  const diskCache = loadPersistentCache()
  const cached    = diskCache[userId]
  if (cached) return { userName: cached.userName, userPoste: cached.userPoste }

  // 3. Inconnu
  return { userName: null, userPoste: '' }
}

module.exports = { fetchGuildMember, parseNickname, resolveMember, cacheUser, getCachedMembers, warmupMemberCache }
