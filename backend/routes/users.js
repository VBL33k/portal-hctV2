const express = require('express')
const fs = require('fs')
const path = require('path')
const { requireAuth, requireManager } = require('../middleware/auth.js')

const router = express.Router()
const DB_PATH = path.join(__dirname, '../data/users-data.json')

function loadUsers() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch {}
  return {}
}

// GET /api/users — liste tous les membres (manager+)
router.get('/', requireManager, (req, res) => {
  const users = loadUsers()
  res.json(Object.values(users))
})

// GET /api/users/me — profil de l'utilisateur connecté
router.get('/me', requireAuth, (req, res) => {
  const users = loadUsers()
  const data = users[req.user.discordId]
  res.json(data || req.user)
})

module.exports = router
