import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

const API = import.meta.env.VITE_API_URL || ''

const FULL_ADMIN_ROLE_IDS = new Set([
  '805518674806046733',  // DEPUTY_CHIEF
  '805481782119104522',  // CHIEF
  '805551419905015818',  // DEO
  '805508029151313921',  // CEO
  '1377632925939666974', // DRH
  '1407313203326877696', // RH_SIMPLE
])
function isFullAdmin(user) {
  return (user?.roles || []).some(r => FULL_ADMIN_ROLE_IDS.has(r))
}

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  pending:   'En attente',
  accepted:  'Acceptée',
  completed: 'Terminée',
}
const STATUS_CLASS = {
  pending:   'bip-status--pending',
  accepted:  'bip-status--accepted',
  completed: 'bip-status--completed',
}
const URGENCY_CLASS = {
  'Faible':   'bip-urg--low',
  'Modérée':  'bip-urg--medium',
  'Élevée':   'bip-urg--high',
  'Critique': 'bip-urg--critical',
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconRadio = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const IconTag = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const IconUser = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconUsers = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconFlag = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
)
const IconMessage = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

// ─── Component ────────────────────────────────────────────────────────────────
export default function BipperPage() {
  const { user } = useAuth()

  // Form state
  const [units,     setUnits]     = useState([])
  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState({
    unitId:           '',
    hospital:         '',
    location:         '',
    interventionType: '',
    urgency:          '',
    info:             '',
  })
  const [submitting,     setSubmitting]     = useState(false)
  const [submitError,    setSubmitError]    = useState('')
  const [submitSuccess,  setSubmitSuccess]  = useState(false)

  // Requests panel
  const [requests,    setRequests]    = useState([])
  const [loadingReqs, setLoadingReqs] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null) // id du bipper à supprimer
  const canAdmin = isFullAdmin(user)

  // ─── Fetch units ────────────────────────────────────────────────────────────
  const fetchUnits = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/bipper/units`, { credentials: 'include' })
      if (r.ok) {
        const data = await r.json()
        setUnits(data.units || [])
        setHospitals(data.hospitals || [])
      }
    } catch {}
  }, [])

  // ─── Fetch requests ─────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/bipper`, { credentials: 'include' })
      if (r.ok) {
        const data = await r.json()
        setRequests(data.requests || [])
      }
    } catch {}
    setLoadingReqs(false)
  }, [])

  useEffect(() => {
    fetchUnits()
    fetchRequests()
    const interval = setInterval(() => {
      fetchRequests()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchUnits, fetchRequests])

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.unitId || !form.hospital || !form.location || !form.interventionType || !form.urgency) {
      setSubmitError('Veuillez remplir tous les champs obligatoires.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const r = await fetch(`${API}/api/bipper`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(form),
      })
      const data = await r.json()
      if (r.ok) {
        setSubmitSuccess(true)
        setForm({ unitId: '', hospital: '', location: '', interventionType: '', urgency: '', info: '' })
        fetchRequests()
        setTimeout(() => setSubmitSuccess(false), 4000)
      } else {
        setSubmitError(data.error || "Erreur lors de l'envoi.")
      }
    } catch {
      setSubmitError('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Mark as completed ──────────────────────────────────────────────────────
  async function markCompleted(id) {
    try {
      const r = await fetch(`${API}/api/bipper/${id}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ status: 'completed' }),
      })
      if (r.ok) fetchRequests()
    } catch {}
  }

  // ─── Delete bipper ──────────────────────────────────────────────────────────
  async function deleteBipper(id) {
    try {
      const r = await fetch(`${API}/api/bipper/${id}`, {
        method:      'DELETE',
        credentials: 'include',
      })
      if (r.ok) {
        setConfirmDelete(null)
        fetchRequests()
      }
    } catch {}
  }

  return (
    <Layout title="Bipper — Demandes de renfort">
      <div className="bip-page">

        {/* ── Header ── */}
        <div className="bip-page-header">
          <div className="bip-header-left">
            <div className="bip-header-icon"><IconRadio /></div>
            <div>
              <div className="bip-header-title">Bipper</div>
              <div className="bip-header-sub">Demandes de renfort centralisées</div>
            </div>
          </div>
          <button className="bip-refresh-btn" onClick={() => { fetchRequests(); fetchUnits() }} title="Actualiser">
            <IconRefresh /> Actualiser
          </button>
        </div>

        <div className="bip-layout">

          {/* ════════════════ FORM ════════════════ */}
          <div className="bip-form-col">
            <div className="bip-card">
              <div className="bip-card-title">Nouvelle demande</div>

              <form onSubmit={handleSubmit} className="bip-form">

                {/* Sélection d'unité */}
                <div className="bip-field">
                  <label className="bip-label">Unité à bipper <span className="bip-required">*</span></label>
                  <div className="bip-units-grid">
                    {units.map(unit => {
                      const selected = form.unitId === unit.id
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          className={`bip-unit-btn${selected ? ' bip-unit-btn--selected' : ''}`}
                          onClick={() => setForm(f => ({ ...f, unitId: selected ? '' : unit.id }))}
                        >
                          <span className="bip-unit-name">{unit.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Hôpital */}
                <div className="bip-field">
                  <label className="bip-label">Hôpital <span className="bip-required">*</span></label>
                  <div className="bip-hosp-row">
                    {hospitals.map(h => (
                      <button
                        key={h.id}
                        type="button"
                        className={`bip-hosp-btn bip-hosp-btn--${h.id}${form.hospital === h.id ? ' bip-hosp-btn--selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, hospital: f.hospital === h.id ? '' : h.id }))}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Localisation */}
                <div className="bip-field">
                  <label className="bip-label">Localisation <span className="bip-required">*</span></label>
                  <input
                    className="bip-input"
                    type="text"
                    placeholder="Ex : Bloc B, Salle 3, Couloir principal…"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    maxLength={120}
                  />
                </div>

                {/* Type d'intervention */}
                <div className="bip-field">
                  <label className="bip-label">Type d'intervention <span className="bip-required">*</span></label>
                  <input
                    className="bip-input"
                    type="text"
                    placeholder="Ex : Soutien code rouge, Transfert patient, Contrôle…"
                    value={form.interventionType}
                    onChange={e => setForm(f => ({ ...f, interventionType: e.target.value }))}
                    maxLength={120}
                  />
                </div>

                {/* Urgence */}
                <div className="bip-field">
                  <label className="bip-label">Niveau d'urgence <span className="bip-required">*</span></label>
                  <div className="bip-urgency-row">
                    {['Faible', 'Modérée', 'Élevée', 'Critique'].map(urg => (
                      <button
                        key={urg}
                        type="button"
                        className={`bip-urgency-btn ${URGENCY_CLASS[urg]}${form.urgency === urg ? ' bip-urgency-btn--selected' : ''}`}
                        onClick={() => setForm(f => ({ ...f, urgency: f.urgency === urg ? '' : urg }))}
                      >
                        {urg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infos complémentaires */}
                <div className="bip-field">
                  <label className="bip-label">Infos complémentaires <span className="bip-optional">(optionnel)</span></label>
                  <textarea
                    className="bip-textarea"
                    placeholder="Précisions utiles pour l'unité…"
                    value={form.info}
                    onChange={e => setForm(f => ({ ...f, info: e.target.value.slice(0, 300) }))}
                    rows={3}
                  />
                  <div className="bip-char-count">{form.info.length}/300</div>
                </div>

                {/* Error / success */}
                {submitError   && <div className="bip-alert bip-alert--error">{submitError}</div>}
                {submitSuccess && (
                  <div className="bip-alert bip-alert--success">
                    <IconCheck /> Demande envoyée ! Le bot Discord va transmettre dans quelques secondes.
                  </div>
                )}

                <button
                  type="submit"
                  className="bip-submit-btn"
                  disabled={submitting || !form.unitId || !form.hospital || !form.location || !form.interventionType || !form.urgency}
                >
                  <IconSend />
                  {submitting ? 'Envoi en cours…' : 'Envoyer la demande'}
                </button>

              </form>
            </div>
          </div>

          {/* ════════════════ REQUESTS ════════════════ */}
          <div className="bip-requests-col">
            <div className="bip-card">
              <div className="bip-card-title">Demandes récentes</div>

              {loadingReqs ? (
                <div className="bip-loading">Chargement…</div>
              ) : requests.length === 0 ? (
                <div className="bip-empty">
                  <div className="bip-empty-icon">📻</div>
                  <div className="bip-empty-text">Aucune demande pour l'instant.</div>
                </div>
              ) : (
                <div className="bip-req-list">
                  {requests.map(req => {
                    // Compat ancien format string / nouveau format array
                    const acceptedNames = Array.isArray(req.acceptedByNames) && req.acceptedByNames.length
                      ? req.acceptedByNames.join(', ')
                      : (req.acceptedByName || null)
                    const acceptCount = Array.isArray(req.acceptedByNames) ? req.acceptedByNames.length : (req.acceptedByName ? 1 : 0)

                    return (
                      <div key={req.id} className={`bip-req-card bip-req-card--${req.status}`}>
                        <div className="bip-req-top">
                          <div className="bip-req-unit">{req.unitLabel}</div>
                          <div className="bip-req-badges">
                            <span className={`bip-hosp-pill bip-hosp-pill--${req.hospital}`}>{req.hospitalLabel}</span>
                            <span className={`bip-urg-pill ${URGENCY_CLASS[req.urgency]}`}>{req.urgency}</span>
                            <span className={`bip-status-pill ${STATUS_CLASS[req.status]}`}>{STATUS_LABEL[req.status]}</span>
                          </div>
                        </div>

                        <div className="bip-req-details">
                          <span className="bip-req-detail-item"><IconPin /> {req.location}</span>
                          <span className="bip-req-detail-item"><IconTag /> {req.interventionType}</span>
                        </div>

                        {req.info && (
                          <div className="bip-req-info"><IconMessage /> {req.info}</div>
                        )}

                        <div className="bip-req-footer">
                          <div className="bip-req-meta">
                            <span className="bip-req-meta-item"><IconUser /> {req.requestedByName}</span>
                            <span className="bip-req-dot">·</span>
                            <span className="bip-req-meta-item"><IconClock /> {timeAgo(req.createdAt)}</span>
                            {acceptedNames && (
                              <>
                                <span className="bip-req-dot">·</span>
                                <span className="bip-req-accepted">
                                  <IconUsers /> {acceptCount > 1 ? `${acceptedNames} (${acceptCount})` : acceptedNames}
                                </span>
                              </>
                            )}
                            {req.completedByName && (
                              <>
                                <span className="bip-req-dot">·</span>
                                <span className="bip-req-completed"><IconFlag /> {req.completedByName}</span>
                              </>
                            )}
                          </div>

                          <div className="bip-req-btns">
                            {/* Seul bouton de transition disponible après acceptation */}
                            {req.status === 'accepted' && (
                              <button
                                className="bip-action-btn bip-action-btn--done"
                                onClick={() => markCompleted(req.id)}
                              >
                                <IconCheck /> Terminer
                              </button>
                            )}
                            {/* Bouton supprimer — Deputy Chief+ uniquement */}
                            {canAdmin && confirmDelete !== req.id && (
                              <button
                                className="bip-action-btn bip-action-btn--delete"
                                onClick={() => setConfirmDelete(req.id)}
                                title="Supprimer"
                              >
                                <IconTrash />
                              </button>
                            )}
                            {canAdmin && confirmDelete === req.id && (
                              <div className="bip-confirm-del">
                                <span>Supprimer ?</span>
                                <button className="bip-action-btn bip-action-btn--delete" onClick={() => deleteBipper(req.id)}>Oui</button>
                                <button className="bip-action-btn" onClick={() => setConfirmDelete(null)}>Non</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
