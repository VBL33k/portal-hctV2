const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs')
const { join } = require('path')

const DATA_DIR = join(__dirname, '..', 'data')
const FILE     = join(DATA_DIR, 'user-settings.json')

function load() {
  if (!existsSync(FILE)) return {}
  try { return JSON.parse(readFileSync(FILE, 'utf8')) } catch { return {} }
}

function save(data) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function getSettings(userId) {
  return load()[userId] || {}
}

function updateSettings(userId, fields) {
  const all = load()
  all[userId] = {
    ...(all[userId] || {}),
    ...fields,
    updatedAt: new Date().toISOString(),
  }
  save(all)
  return all[userId]
}

module.exports = { getSettings, updateSettings }
