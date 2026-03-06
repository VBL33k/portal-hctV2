import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// SPV+ role IDs (Shift Supervisor et supérieurs)
const SPV_ROLE_IDS = new Set([
  '1140657047126425660', // SHIFT_SPV
  '809086773326118952',  // HDP
  '805518674806046733',  // DEPUTY_CHIEF
  '805481782119104522',  // CHIEF
  '805551419905015818',  // DEO
  '805508029151313921',  // CEO
  '1377632925939666974', // DRH
  '1407313203326877696', // RH_SIMPLE (level 13 same as deputy)
])

// Full admin role IDs (Deputy Chief et supérieurs)
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

const LOGO_ICON = 'https://www.zupimages.net/up/23/09/6yf5.png'

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconGrid = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const IconHeart = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconBell = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IconUsers = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconFileCode = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <polyline points="10 13 8 15 10 17"/><polyline points="14 13 16 15 14 17"/>
  </svg>
)
const IconBook = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)
const IconChart = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconReceipt = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/>
    <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
  </svg>
)
const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: '/',               icon: <IconGrid />,     label: 'Tableau de bord', end: true },
  { to: '/services',       icon: <IconHeart />,    label: 'Prise de service' },
  { to: '/bbcode/fill',    icon: <IconFileCode />, label: 'BBCode' },
  { to: '/annonces',       icon: <IconBell />,     label: 'Annonces' },
]

const NAV_LINKS_SPV = [
  { to: '/bbcode/builder', icon: <IconBook />,     label: 'Créateur de templates' },
]

const NAV_LINKS_ADMIN = [
  { to: '/personnel', icon: <IconUsers />, label: 'Personnel' },
]

const NAV_DISABLED = [
  { icon: <IconChart />,    label: 'Statistiques' },
  { icon: <IconReceipt />,  label: 'Facturation' },
]

const NAV_LINKS_ALL = [
  { to: '/parametres', icon: <IconSettings />, label: 'Paramètres' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Layout({ title, children }) {
  const { user, logout } = useAuth()
  const initials    = (user?.prenom?.[0] || user?.username?.[0] || '?').toUpperCase()
  const canBuild    = isSupervisor(user)
  const canSeeAdmin = isFullAdmin(user)

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

          {NAV_LINKS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {canBuild && NAV_LINKS_SPV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {canSeeAdmin && NAV_LINKS_ADMIN.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {NAV_DISABLED.map((item, i) => (
            <div key={i} className="nav-item nav-item--disabled">
              {item.icon}
              {item.label}
              <span className="nav-soon">BIENTÔT</span>
            </div>
          ))}

          {NAV_LINKS_ALL.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">v2.0.0 · HCT Healthcare</div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <span className="topbar-left">{title}</span>

          <div className="topbar-right">
            <div className="topbar-initials">{initials}</div>
            <span className="topbar-name">{user?.name || user?.username}</span>
            {user?.poste && <span className="topbar-badge">{user.poste}</span>}
            <div className="topbar-sep" />
            <button className="logout-btn" onClick={logout}>
              <IconLogout />
              Déconnexion
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
