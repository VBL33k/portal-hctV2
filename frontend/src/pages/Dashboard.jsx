import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Portail HCT</h1>
        <div className="user-info">
          {user?.avatar && <img src={user.avatar} alt={user.name} className="avatar" />}
          <span>{user?.name || user?.username}</span>
          <span className="badge">{user?.poste || 'Non défini'}</span>
          <button onClick={logout} className="logout-btn">Déconnexion</button>
        </div>
      </header>
      <main className="dashboard-main">
        <p>Bienvenue, <strong>{user?.prenom || user?.username}</strong> !</p>
        <p>Le nouveau portail est en cours de construction.</p>
      </main>
    </div>
  )
}
