import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const API = import.meta.env.VITE_API_URL || ''

export default function AuthCallback() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      navigate('/login?error=no_token', { replace: true })
      return
    }

    fetch(`${API}/api/auth/exchange?token=${token}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        setUser(data.user)
        navigate('/', { replace: true })
      })
      .catch(() => {
        navigate('/login?error=exchange_failed', { replace: true })
      })
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <p>Connexion en cours...</p>
    </div>
  )
}
