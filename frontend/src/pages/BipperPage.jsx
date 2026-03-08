import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

const API = import.meta.env.VITE_API_URL || ''

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  pending:     'En attente',
  accepted:    'Acceptée',
  in_progress: 'En cours',
  completed:   'Terminée',
}
const STATUS_CLASS = {
  pending:     'bip-status--pending',
  accepted:    'bip-status--accepted',
  in_progress: 'bip-status--inprogress',
  completed:   'bip-status--completed',
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
const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function BipperPage() {
  const { user } = useAuth()

  // Form state
  const [units,    setUnits]    = useState([])
  const [hospitals, setHospitals] = useState([])
  const [form, setForm] = useState({
    unitId:           '',
    hospital:         '',
    location:         '',
    interventionType: '',
    urgency:          '',
    info:             '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Requests panel
  const [requests, setRequests] = useState([])
  const [loadingReqs, setLoadingReqs] = useState(true)

  // Cooldown timer
  const [now, setNow] = useState(Date.now())

  // ─── Fetch units + hospitals ────────────────────────────────────────────────
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
    // Polling toutes les 5s
    const interval = setInterval(() => {
      fetchRequests()
      fetchUnits()
      setNow(Date.now())
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchUnits, fetchRequests])

  // Update "now" every second for cooldown display
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

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
        fetchUnits()
        setTimeout(() => setSubmitSuccess(false), 4000)
      } else {
        setSubmitError(data.error || 'Erreur lors de l\'envoi.')
      }
    } catch {
      setSubmitError('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Status update from portal ──────────────────────────────────────────────
  async function updateStatus(id, status) {
    try {
      const r = await fetch(`${API}/api/bipper/${id}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ status }),
      })
      if (r.ok) fetchRequests()
    } catch {}
  }

  function formatCooldown(cooldownUntil) {
    if (!cooldownUntil) return ''
    const remaining = Math.max(0, cooldownUntil - now)
    const m = Math.floor(remaining / 60000)
    const s = Math.floor((remaining % 60000) / 1000)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const selectedUnit = units.find(u => u.id === form.unitId)
  const unitOnCooldown = selectedUnit?.onCooldown

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
                      const selected   = form.unitId === unit.id
                      const onCooldown = unit.onCooldown
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          className={`bip-unit-btn${selected ? ' bip-unit-btn--selected' : ''}${onCooldown ? ' bip-unit-btn--cooldown' : ''}`}
                          onClick={() => !onCooldown && setForm(f => ({ ...f, unitId: selected ? '' : unit.id }))}
                          disabled={onCooldown}
                          title={onCooldown ? `Cooldown : ${formatCooldown(unit.cooldownUntil)}` : unit.label}
                        >
                          <span className="bip-unit-name">{unit.label}</span>
                          {onCooldown && (
                            <span className="bip-unit-cooldown">
                              <IconClock /> {formatCooldown(unit.cooldownUntil)}
                            </span>
                          )}
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
                {unitOnCooldown && (
                  <div className="bip-alert bip-alert--warning">
                    Cette unité est en cooldown. Sélectionnez une autre unité.
                  </div>
                )}

                <button
                  type="submit"
                  className="bip-submit-btn"
                  disabled={submitting || unitOnCooldown || !form.unitId || !form.hospital || !form.location || !form.interventionType || !form.urgency}
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
                  {requests.map(req => (
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
                        <span className="bip-req-detail-item">📍 {req.location}</span>
                        <span className="bip-req-detail-item">🏷️ {req.interventionType}</span>
                      </div>

                      {req.info && (
                        <div className="bip-req-info">💬 {req.info}</div>
                      )}

                      <div className="bip-req-footer">
                        <div className="bip-req-meta">
                          <span>Par {req.requestedByName}</span>
                          <span className="bip-req-dot">·</span>
                          <span>{timeAgo(req.createdAt)}</span>
                          {req.acceptedByName && (
                            <>
                              <span className="bip-req-dot">·</span>
                              <span className="bip-req-accepted">✅ {req.acceptedByName}</span>
                            </>
                          )}
                        </div>

                        {/* Actions de statut */}
                        {req.status === 'accepted' && (
                          <button
                            className="bip-action-btn bip-action-btn--inprogress"
                            onClick={() => updateStatus(req.id, 'in_progress')}
                          >
                            En cours
                          </button>
                        )}
                        {req.status === 'in_progress' && (
                          <button
                            className="bip-action-btn bip-action-btn--done"
                            onClick={() => updateStatus(req.id, 'completed')}
                          >
                            Terminée
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}
