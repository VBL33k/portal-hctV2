import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ServicePage from './pages/ServicePage.jsx'
import BBCodeFillPage from './pages/BBCodeFillPage.jsx'
import BBCodeBuilderPage from './pages/BBCodeBuilderPage.jsx'
import PersonnelPage from './pages/PersonnelPage.jsx'
import AnnouncementsPage from './pages/AnnouncementsPage.jsx'
import AuthCallback from './pages/AuthCallback.jsx'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/services" element={<PrivateRoute><ServicePage /></PrivateRoute>} />
        <Route path="/bbcode" element={<Navigate to="/bbcode/fill" replace />} />
        <Route path="/bbcode/fill" element={<PrivateRoute><BBCodeFillPage /></PrivateRoute>} />
        <Route path="/bbcode/builder" element={<PrivateRoute><BBCodeBuilderPage /></PrivateRoute>} />
        <Route path="/personnel"      element={<PrivateRoute><PersonnelPage /></PrivateRoute>} />
        <Route path="/annonces"       element={<PrivateRoute><AnnouncementsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
