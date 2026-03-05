import { useAuth } from '../context/AuthContext.jsx'

const LOGO_ICON = 'https://www.zupimages.net/up/23/09/6yf5.png'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6)  return 'BONNE NUIT'
  if (h < 12) return 'BONJOUR'
  if (h < 18) return 'BON APRÈS-MIDI'
  return 'BONSOIR'
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
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
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
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

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV = [
  { icon: <IconGrid />,     label: 'Tableau de bord', active: true },
  { icon: <IconHeart />,    label: 'Prise de service', active: false },
  { icon: <IconCalendar />, label: 'Planning',         active: false },
  { icon: <IconBell />,     label: 'Annonces',         active: false },
  { icon: <IconUsers />,    label: 'Personnel',        active: false },
  { icon: <IconBook />,     label: 'Formations',       active: false },
  { icon: <IconChart />,    label: 'Statistiques',     active: false },
  { icon: <IconSettings />, label: 'Paramètres',       active: false },
]

const MODULES = [
  { icon: <IconHeart />,    title: 'Prise de service', desc: 'Déclarez vos prises et fins de service au sein du centre médical.', soon: false },
  { icon: <IconCalendar />, title: 'Planning',          desc: 'Consultez et gérez les plannings de permanence du personnel.',       soon: false },
  { icon: <IconBell />,     title: 'Annonces',          desc: "Retrouvez toutes les communications officielles de la direction.",   soon: false },
  { icon: <IconUsers />,    title: 'Personnel',         desc: 'Annuaire complet des membres et de leurs fonctions au HCT.',         soon: true  },
  { icon: <IconBook />,     title: 'Formations',        desc: 'Accédez aux modules de formation continue du centre médical.',       soon: true  },
  { icon: <IconChart />,    title: 'Statistiques',      desc: "Tableaux de bord et métriques d'activité du centre.",                soon: true  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuth()

  const initials = (user?.prenom?.[0] || user?.username?.[0] || '?').toUpperCase()
  const greeting = getGreeting()

  return (
    <div className="dashboard">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img
              src={LOGO_ICON}
              alt="HCT"
              onError={e => e.target.style.display = 'none'}
            />
            <div>
              <div className="sidebar-brand-name">HCT Healthcare</div>
              <div className="sidebar-brand-label">PORTAIL</div>
            </div>
          </div>
          <div className="sidebar-bar" />
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section">NAVIGATION</span>
          {NAV.map((item, i) => (
            <div key={i} className={`nav-item${item.active ? ' active' : ''}`}>
              {item.icon}
              {item.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">v2.0.0 · HCT Healthcare</div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <span className="topbar-left">Tableau de bord</span>

          <div className="topbar-right">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="topbar-avatar" />
              : <div className="topbar-initials">{initials}</div>
            }
            <span className="topbar-name">{user?.name || user?.username}</span>
            {user?.poste && <span className="topbar-badge">{user.poste}</span>}
            <div className="topbar-sep" />
            <button className="logout-btn" onClick={logout}>
              <IconLogout />
              Déconnexion
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="page-content">

          {/* Welcome */}
          <div className="welcome-card">
            <div>
              <div className="welcome-greeting">{greeting}</div>
              <div className="welcome-name">{user?.prenom || user?.username || 'Personnel'}</div>
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
                <div className="stat-val">—</div>
                <div className="stat-label">Votre dernier service</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><IconShield /></div>
              <div>
                <div className="stat-val">{user?.poste ? '✓' : '—'}</div>
                <div className="stat-label">Accréditation</div>
              </div>
            </div>
          </div>

          {/* Modules */}
          <div className="section-label">MODULES</div>
          <div className="modules-grid">
            {MODULES.map((m, i) => (
              <div key={i} className="module-card">
                <div className="module-icon">{m.icon}</div>
                <div className="module-title">{m.title}</div>
                <div className="module-desc">{m.desc}</div>
                {m.soon && <span className="module-soon">BIENTÔT</span>}
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}
