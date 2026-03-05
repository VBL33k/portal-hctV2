const { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } = require('fs')
const { join } = require('path')

const DATA_DIR = join(__dirname, '..', 'data')
const LOG_FILE = join(DATA_DIR, 'activity-logs.ndjson')  // Newline-delimited JSON (1 entry / ligne)

// ─── Écriture (append) ────────────────────────────────────────────────────────

function log(userId, userName, action, details = '') {
  if (!userId) return
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    const entry = JSON.stringify({
      userId,
      userName: userName || 'Inconnu',
      action,
      details: details || '',
      timestamp: new Date().toISOString(),
    })
    appendFileSync(LOG_FILE, entry + '\n', 'utf8')
  } catch (err) {
    console.error('[Logger] Erreur écriture log:', err.message)
  }
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

function readAllLogs() {
  if (!existsSync(LOG_FILE)) return []
  try {
    const lines = readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean)
    return lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  } catch {
    return []
  }
}

function getLogsForUser(userId) {
  return readAllLogs().filter(l => l.userId === userId).reverse()
}

function getAllLogs() {
  return readAllLogs()
}

module.exports = { log, getLogsForUser, getAllLogs }
