import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

const API = import.meta.env.VITE_API_URL || ''

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '—' }
}

const ACTION_LABELS = {
  LOGIN:            'Connexion',
  SERVICE_CREATED:  'Service enregistré',
  SERVICE_DELETED:  'Service supprimé',
  TEMPLATE_CREATED: 'Template créée',
  TEMPLATE_UPDATED: 'Template modifiée',
  TEMPLATE_DELETED: 'Template supprimée',
  MEMBER_DEMOTED:   'Membre rétrogradé',
}
const ACTION_COLORS = {
  LOGIN:            '#4e9bff',
  SERVICE_CREATED:  '#3ecf8e',
  SERVICE_DELETED:  '#ff6b6b',
  TEMPLATE_CREATED: '#a78bfa',
  TEMPLATE_UPDATED: '#fbbf24',
  TEMPLATE_DELETED: '#ff6b6b',
  MEMBER_DEMOTED:   '#f97316',
}

function getInitials(prenom, nom) {
  const p = prenom?.[0]?.toUpperCase() || ''
  const n = nom?.[0]?.toUpperCase() || ''
  return (p + n) || '?'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const IconActivity = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
)
const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
)
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconAlertTriangle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconDiscord = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.022.014.043.03.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
  </svg>
)

// ─── Section component ─────────────────────────────────────────────────────────

function SettingsSection({ icon, title, children }) {
  return (
    <div className="sett-section">
      <div className="sett-section-header">
        <span className="sett-section-icon">{icon}</span>
        <div className="sett-section-title">{title}</div>
      </div>
      <div className="sett-section-body">{children}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth()

  // Data from server
  const [serverData, setServerData]   = useState(null)
  const [loadingData, setLoadingData] = useState(true)

  // Photo
  const [photoPreview, setPhotoPreview]   = useState(null)
  const [photoFile, setPhotoFile]         = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoMsg, setPhotoMsg]           = useState(null)
  const fileInputRef = useRef(null)

  // Identity
  const [prenom, setPrenom] = useState('')
  const [nom, setNom]       = useState('')
  const [savingId, setSavingId]   = useState(false)
  const [idMsg, setIdMsg]         = useState(null)

  // Address
  const [adresse, setAdresse]     = useState('')
  const [savingAddr, setSavingAddr] = useState(false)
  const [addrMsg, setAddrMsg]     = useState(null)

  // Contract
  const [downloading, setDownloading] = useState(false)
  const [contractErr, setContractErr] = useState(null)

  // Load settings from server
  const loadSettings = useCallback(async () => {
    setLoadingData(true)
    try {
      const r = await fetch(`${API}/api/settings/me`, { credentials: 'include' })
      const data = await r.json()
      setServerData(data)
      setPrenom(data.prenom || '')
      setNom(data.nom || '')
      setAdresse(data.adresse || '')
    } catch {}
    finally { setLoadingData(false) }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  // ── Photo ───────────────────────────────────────────────────────────────────

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoMsg(null)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handlePhotoUpload() {
    if (!photoFile) return
    setUploadingPhoto(true)
    setPhotoMsg(null)
    const form = new FormData()
    form.append('photo', photoFile)
    try {
      const r = await fetch(`${API}/api/settings/me/photo`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Erreur upload')
      setPhotoMsg({ type: 'ok', text: 'Photo mise à jour ✓' })
      setPhotoFile(null)
      setServerData(prev => ({ ...prev, photoUrl: data.photoUrl }))
    } catch (err) {
      setPhotoMsg({ type: 'err', text: err.message })
    } finally {
      setUploadingPhoto(false)
    }
  }

  // ── Identity ────────────────────────────────────────────────────────────────

  async function handleSaveIdentity(e) {
    e.preventDefault()
    setSavingId(true)
    setIdMsg(null)
    try {
      const r = await fetch(`${API}/api/settings/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: nom.trim(), prenom: prenom.trim() }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Erreur sauvegarde')
      setPrenom(data.prenom || '')
      setNom(data.nom || '')
      setIdMsg({ type: 'ok', text: 'Identité mise à jour. Pseudo Discord modifié.' })
    } catch (err) {
      setIdMsg({ type: 'err', text: err.message })
    } finally {
      setSavingId(false)
    }
  }

  // ── Address ─────────────────────────────────────────────────────────────────

  async function handleSaveAddress(e) {
    e.preventDefault()
    setSavingAddr(true)
    setAddrMsg(null)
    try {
      const r = await fetch(`${API}/api/settings/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adresse: adresse.trim() }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Erreur sauvegarde')
      setAdresse(data.adresse || '')
      setAddrMsg({ type: 'ok', text: 'Adresse sauvegardée ✓' })
      setServerData(prev => ({ ...prev, adresse: data.adresse }))
      setContractErr(null)
    } catch (err) {
      setAddrMsg({ type: 'err', text: err.message })
    } finally {
      setSavingAddr(false)
    }
  }

  // ── Contract ────────────────────────────────────────────────────────────────

  async function handleDownloadContract() {
    setDownloading(true)
    setContractErr(null)
    try {
      const r = await fetch(`${API}/api/settings/me/contract`, { credentials: 'include' })
      if (!r.ok) {
        const data = await r.json()
        throw new Error(data.error || 'Erreur génération')
      }
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `contrat-travail-hct.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setContractErr(err.message)
    } finally {
      setDownloading(false)
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const currentPhoto = photoPreview || serverData?.photoUrl || user?.avatar
  const hasAddress   = !!(serverData?.adresse?.trim())
  const hasIdentity  = !!(serverData?.nom?.trim() && serverData?.prenom?.trim())

  const initials = getInitials(
    serverData?.prenom || user?.prenom,
    serverData?.nom    || user?.nom,
  )

  return (
    <Layout title="Paramètres">
      <div className="sett-page">

        {/* ── Photo de profil ── */}
        <SettingsSection icon={<IconCamera />} title="Photo de profil">
          <div className="sett-photo-row">
            <div className="sett-avatar-wrap">
              {currentPhoto
                ? <img className="sett-avatar-img" src={currentPhoto} alt="Photo de profil" />
                : <div className="sett-avatar-initials">{initials}</div>
              }
              <button
                className="sett-avatar-overlay"
                onClick={() => fileInputRef.current?.click()}
                title="Changer la photo"
              >
                <IconCamera />
              </button>
            </div>

            <div className="sett-photo-info">
              <div className="sett-photo-hint">JPG, PNG ou WebP · max 3 Mo</div>
              {photoFile && (
                <div className="sett-photo-file">
                  {photoFile.name}
                </div>
              )}
              <div className="sett-photo-actions">
                <button
                  className="sett-btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choisir une photo
                </button>
                {photoFile && (
                  <button
                    className="sett-btn-primary"
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? 'Upload…' : 'Enregistrer'}
                  </button>
                )}
              </div>
              {photoMsg && (
                <div className={`sett-msg sett-msg--${photoMsg.type}`}>
                  {photoMsg.type === 'ok' ? <IconCheck /> : <IconAlertTriangle />}
                  {photoMsg.text}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </div>
          </div>
        </SettingsSection>

        {/* ── Identité ── */}
        <SettingsSection icon={<IconUser />} title="Identité">
          <form className="sett-form" onSubmit={handleSaveIdentity}>
            <div className="sett-fields-row">
              <div className="sett-field">
                <label className="sett-label">Prénom</label>
                <input
                  className="sett-input"
                  type="text"
                  value={prenom}
                  onChange={e => { setPrenom(e.target.value); setIdMsg(null) }}
                  placeholder="Jean"
                  disabled={loadingData}
                />
              </div>
              <div className="sett-field">
                <label className="sett-label">Nom</label>
                <input
                  className="sett-input"
                  type="text"
                  value={nom}
                  onChange={e => { setNom(e.target.value.toUpperCase()); setIdMsg(null) }}
                  placeholder="DUPONT"
                  disabled={loadingData}
                />
              </div>
            </div>
            <div className="sett-discord-note">
              <IconDiscord />
              Ce changement modifie ton pseudo sur le serveur Discord
            </div>
            {idMsg && (
              <div className={`sett-msg sett-msg--${idMsg.type}`}>
                {idMsg.type === 'ok' ? <IconCheck /> : <IconAlertTriangle />}
                {idMsg.text}
              </div>
            )}
            <div className="sett-form-footer">
              <button
                type="submit"
                className="sett-btn-primary"
                disabled={savingId || loadingData || !prenom.trim() || !nom.trim()}
              >
                <IconSave /> {savingId ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </SettingsSection>

        {/* ── Adresse ── */}
        <SettingsSection icon={<IconHome />} title="Adresse postale">
          <form className="sett-form" onSubmit={handleSaveAddress}>
            <div className="sett-field">
              <label className="sett-label">Adresse complète</label>
              <textarea
                className="sett-input sett-textarea"
                value={adresse}
                onChange={e => { setAdresse(e.target.value); setAddrMsg(null) }}
                placeholder="123 rue de la Paix, 75001 Paris"
                rows={3}
                disabled={loadingData}
              />
              <div className="sett-field-hint">
                Nécessaire pour le téléchargement du contrat de travail
              </div>
            </div>
            {addrMsg && (
              <div className={`sett-msg sett-msg--${addrMsg.type}`}>
                {addrMsg.type === 'ok' ? <IconCheck /> : <IconAlertTriangle />}
                {addrMsg.text}
              </div>
            )}
            <div className="sett-form-footer">
              <button
                type="submit"
                className="sett-btn-primary"
                disabled={savingAddr || loadingData}
              >
                <IconSave /> {savingAddr ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </SettingsSection>

        {/* ── Contrat de travail ── */}
        <SettingsSection icon={<IconFile />} title="Contrat de travail">
          <div className="sett-contract">
            <div className="sett-contract-info">
              <div className="sett-contract-title">Contrat d'engagement HCT Healthcare</div>
              <div className="sett-contract-desc">
                Téléchargez votre contrat de travail pré-rempli avec vos informations.
                {!hasAddress && (
                  <span className="sett-contract-warn">
                    {' '}<IconAlertTriangle /> Renseignez votre adresse pour débloquer le téléchargement.
                  </span>
                )}
                {hasAddress && !hasIdentity && (
                  <span className="sett-contract-warn">
                    {' '}<IconAlertTriangle /> Renseignez votre nom et prénom pour débloquer.
                  </span>
                )}
              </div>
            </div>
            {contractErr && (
              <div className="sett-msg sett-msg--err" style={{ marginBottom: 12 }}>
                <IconAlertTriangle /> {contractErr}
              </div>
            )}
            <button
              className={`sett-btn-contract${hasAddress && hasIdentity ? '' : ' sett-btn-contract--locked'}`}
              onClick={handleDownloadContract}
              disabled={!hasAddress || !hasIdentity || downloading}
              title={!hasAddress ? 'Renseignez votre adresse pour débloquer' : !hasIdentity ? 'Renseignez votre nom et prénom' : 'Télécharger votre contrat'}
            >
              <IconDownload />
              {downloading ? 'Génération…' : 'Télécharger le contrat (.docx)'}
            </button>
          </div>
        </SettingsSection>

        {/* ── Mon activité ── */}
        <SettingsSection icon={<IconActivity />} title="Mon activité">
          {loadingData ? (
            <div className="sett-logs-skeleton">
              {[1,2,3,4].map(i => (
                <div key={i} className="sett-log-skeleton-row">
                  <div className="sett-skeleton" style={{ width: 9, height: 9, borderRadius: '50%' }} />
                  <div>
                    <div className="sett-skeleton" style={{ width: 160, height: 13 }} />
                    <div className="sett-skeleton" style={{ width: 110, height: 11, marginTop: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : serverData?.logs?.length ? (
            <div className="sett-logs">
              {serverData.logs.map((entry, i) => (
                <div key={i} className="sett-log-entry">
                  <div
                    className="sett-log-dot"
                    style={{ background: ACTION_COLORS[entry.action] || 'rgba(255,255,255,0.3)' }}
                  />
                  <div className="sett-log-content">
                    <div className="sett-log-action">
                      {ACTION_LABELS[entry.action] || entry.action}
                      {entry.details && (
                        <span className="sett-log-details"> — {entry.details}</span>
                      )}
                    </div>
                    <div className="sett-log-time">{fmtDate(entry.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="sett-logs-empty">Aucune activité enregistrée</div>
          )}
        </SettingsSection>

      </div>
    </Layout>
  )
}
