require('dotenv').config()

const express   = require('express')
const session   = require('express-session')
const passport  = require('passport')

const app = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// ─── Trust proxy (Nginx devant) ───────────────────────────────────────────────
app.set('trust proxy', 1)

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin
  const allowed = [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
  ]
  if (!origin || allowed.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// ─── Anti-cache (empêche Cloudflare de cacher les réponses API) ───────────────
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

// ─── Body & Session ───────────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const isProd = process.env.NODE_ENV === 'production'

app.use(session({
  secret: process.env.SESSION_SECRET || 'hct-dev-secret',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure:   isProd,
    httpOnly: true,
    maxAge:   24 * 60 * 60 * 1000, // 24h
    sameSite: isProd ? 'none' : 'lax',
  },
}))

// ─── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize())
app.use(passport.session())

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',  require('./routes/auth.js'))
app.use('/api/users', require('./routes/users.js'))

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV }))

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 HCT Backend V2 démarré sur le port ${PORT}`)
  console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Frontend URL  : ${FRONTEND_URL}`)
  console.log(`   Callback URL  : ${process.env.DISCORD_CALLBACK_URL || '(non défini)'}`)
})
