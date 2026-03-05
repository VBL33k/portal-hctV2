import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const API       = import.meta.env.VITE_API_URL || ''
const LOGO_ICON = 'https://www.zupimages.net/up/23/09/6yf5.png'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  return (
    <div className="login-page">
      <div className="login-bg-grid" />

      <div className="login-card">

        {/* ── Brand ── */}
        <div className="login-brand">
          <span className="login-eyebrow">PORTAIL INTERNE</span>

          <div className="login-logo-wrap">
            <div className="login-logo-glow" />
            <img
              src={LOGO_ICON}
              alt="HCT"
              className="login-logo-img"
              onError={e => e.target.style.display = 'none'}
            />
          </div>

          <h1 className="login-org-name">HCT Healthcare</h1>
          <p className="login-org-sub">Healthcare Center of Thémis</p>

          <div className="login-brand-bar" />

          <p className="login-brand-desc">
            Système de gestion interne réservé au personnel médical autorisé du centre de santé.
          </p>
        </div>

        <div className="login-sep" />

        {/* ── Auth ── */}
        <div className="login-auth">
          <div className="login-status">
            <span className="status-dot" />
            SYSTÈME EN LIGNE
          </div>

          <h2 className="login-auth-title">Connexion</h2>
          <p className="login-auth-desc">
            Authentifiez-vous via votre compte Discord associé au serveur HCT pour accéder au portail.
          </p>

          <button
            className="discord-btn-hct"
            onClick={() => { window.location.href = `${API}/api/auth/discord` }}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.11 18.1.128 18.117a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            Se connecter avec Discord
          </button>

          <p className="login-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5L12 1z"/>
            </svg>
            Accès réservé au personnel autorisé
          </p>
        </div>
      </div>

      <div className="login-version">Portail HCT · v2.0.0</div>
    </div>
  )
}
