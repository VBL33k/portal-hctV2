import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

// SPV+ role IDs — pour afficher le module Créateur de templates
const SPV_ROLE_IDS = new Set([
  '1140657047126425660', // SHIFT_SPV
  '809086773326118952',  // HDP
  '805518674806046733',  // DEPUTY_CHIEF
  '805481782119104522',  // CHIEF
  '805551419905015818',  // DEO
  '805508029151313921',  // CEO
  '1377632925939666974', // DRH
  '1407313203326877696', // RH_SIMPLE
])
// Full admin role IDs — accès complet (Deputy Chief et supérieurs)
const FULL_ADMIN_ROLE_IDS = new Set([
  '805518674806046733',  // DEPUTY_CHIEF
  '805481782119104522',  // CHIEF
  '805551419905015818',  // DEO
  '805508029151313921',  // CEO
  '1377632925939666974', // DRH
  '1407313203326877696', // RH_SIMPLE
])
function isSupervisor(user) {
  return (user?.roles || []).some(r => SPV_ROLE_IDS.has(r))
}
function isFullAdmin(user) {
  return (user?.roles || []).some(r => FULL_ADMIN_ROLE_IDS.has(r))
}

function formatLastShift(shift) {
  if (!shift) return '—'
  // Use startLocal (e.g. "2024-03-01 14:30") if available, fallback to ISO
  const raw = shift.startLocal || shift.startAt
  const date = new Date(shift.startAt)
  if (isNaN(date)) return '—'
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 3600)   return `il y a ${Math.max(1, Math.floor(diff / 60))} min`
  if (diff < 86400)  return `il y a ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  if (days === 1)    return 'Hier'
  if (days < 7)      return `il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6)  return 'BONNE NUIT'
  if (h < 12) return 'BONJOUR'
  if (h < 18) return 'BON APRÈS-MIDI'
  return 'BONSOIR'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const IconFileCode = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <polyline points="10 13 8 15 10 17"/><polyline points="14 13 16 15 14 17"/>
  </svg>
)

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODULES_BASE = [
  { icon: <IconHeart />,    title: 'Prise de service',     desc: 'Déclarez vos prises et fins de service au sein du centre médical.', soon: false, to: '/services' },
  { icon: <IconFileCode />, title: 'BBCode / Rapports',    desc: 'Remplissez vos rapports depuis les templates BBCode disponibles.',  soon: false, to: '/bbcode/fill' },
  { icon: <IconCalendar />, title: 'Planning',             desc: 'Consultez et gérez les plannings de permanence du personnel.',       soon: true,  to: null },
  { icon: <IconBell />,     title: 'Annonces',             desc: "Retrouvez toutes les communications officielles de la direction.",   soon: false, to: '/annonces' },
  { icon: <IconUsers />,    title: 'Personnel',            desc: 'Annuaire complet des membres, logs d\'activité et gestion RH.',      soon: true,  to: null },
  { icon: <IconBook />,     title: 'Formations',           desc: 'Accédez aux modules de formation continue du centre médical.',       soon: true,  to: null },
  { icon: <IconChart />,    title: 'Statistiques',         desc: "Tableaux de bord et métriques d'activité du centre.",                soon: true,  to: null },
]

const MODULES_SPV = [
  { icon: <IconBook />, title: 'Créateur de templates', desc: 'Créez et gérez les templates BBCode pour votre équipe.', soon: false, to: '/bbcode/builder' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const greeting  = getGreeting()

  const [lastShift, setLastShift] = useState(null)
  useEffect(() => {
    fetch('/api/shifts/mine', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.stats?.lastShift) setLastShift(data.stats.lastShift) })
      .catch(() => {})
  }, [])

  // Personnel est actif pour les full admins — remplace la tuile "soon"
  const MODULES = isFullAdmin(user)
    ? MODULES_BASE.map(m => m.title === 'Personnel' ? { ...m, soon: false, to: '/personnel' } : m)
    : MODULES_BASE

  const allModules = isSupervisor(user)
    ? [...MODULES, ...MODULES_SPV]
    : MODULES

  return (
    <Layout title="Tableau de bord">

      {/* Welcome */}
      <div className="welcome-card">
        <div>
          <div className="welcome-greeting">{greeting}</div>
          <div className="welcome-name">
            {[user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.username || 'Personnel'}
          </div>
          <div className="welcome-role">
            {user?.poste || 'Membre du personnel'} · HCT Healthcare
          </div>
        </div>
        <div className="welcome-emblem">🏥</div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><IconUsers /></div>
          <div>
            <div className="stat-val">736</div>
            <div className="stat-label">Membres actifs</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><IconClock /></div>
          <div>
            <div className="stat-val">{formatLastShift(lastShift)}</div>
            <div className="stat-label">Votre dernier service</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><IconShield /></div>
          <div>
            <div className="stat-val">{isSupervisor(user) ? '✓' : '—'}</div>
            <div className="stat-label">Vue superviseur</div>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="section-label">MODULES</div>
      <div className="modules-grid">
        {allModules.map((m, i) => (
          <div
            key={i}
            className={`module-card${m.soon ? ' module-card--soon' : ''}`}
            onClick={() => m.to && navigate(m.to)}
            style={m.to ? { cursor: 'pointer' } : { cursor: 'default' }}
          >
            <div className="module-icon">{m.icon}</div>
            <div className="module-title">{m.title}</div>
            <div className="module-desc">{m.desc}</div>
            {m.soon
              ? <span className="module-soon">BIENTÔT</span>
              : <span className="module-open"><IconArrow /></span>
            }
          </div>
        ))}
      </div>

    </Layout>
  )
}
