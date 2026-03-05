import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

// Helper: fetch qui force le re-login sur 401
async function apiFetch(url, options, onUnauth) {
  const res = await fetch(url, { credentials: 'include', ...options })
  if (res.status === 401 && onUnauth) { onUnauth(); return null }
  return res
}

const API = import.meta.env.VITE_API_URL || ''

// Role IDs with level >= 12 (HDP and above) — mirrors backend config/roles.js
const MANAGER_ROLE_IDS = new Set([
  '809086773326118952', // HDP (12)
  '805518674806046733', // DEPUTY_CHIEF (13)
  '1407313203326877696',// RH_SIMPLE (13)
  '805481782119104522', // CHIEF (14)
  '805551419905015818', // DEO (15)
  '805508029151313921', // CEO (16)
  '1377632925939666974',// DRH (17)
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function calcDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  const ms = new Date(endIso) - new Date(startIso)
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const parts = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}min`)
  return parts.join(' ') || '—'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
)

const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShiftCard({ shift, onDelete }) {
  const isNmh = shift.hospital === 'NMH'
  return (
    <div className={`shift-card${isNmh ? ' hospital-nmh' : ''}`}>
      <span className={`shift-hosp-badge ${shift.hospital.toLowerCase()}`}>
        {shift.hospital}
      </span>
      <div className="shift-card-info">
        <div className="shift-date">{formatDate(shift.startAt)}</div>
        <div className="shift-time">
          <IconClock />
          {formatTime(shift.startAt)} → {formatTime(shift.endAt)}
        </div>
        <span className="shift-duration-pill">{calcDuration(shift.startAt, shift.endAt)}</span>
        {shift.note && <div className="shift-note">"{shift.note}"</div>}
      </div>
      {onDelete && (
        <button
          className="shift-delete-btn"
          onClick={() => onDelete(shift.id)}
          title="Supprimer ce service"
        >
          <IconTrash />
        </button>
      )}
    </div>
  )
}

function StatsRow({ stats, loading }) {
  const s = stats || {}
  return (
    <div className="svc-stats-row">
      <div className="svc-stat">
        <div className="svc-stat-val">{loading ? '—' : (s.totalShifts ?? 0)}</div>
        <div className="svc-stat-label">Total services</div>
      </div>
      <div className="svc-stat">
        <div className="svc-stat-val">{loading ? '—' : (s.totalDurationFormatted || '0 h')}</div>
        <div className="svc-stat-label">Heures totales</div>
      </div>
      <div className="svc-stat">
        <div className="svc-stat-val">{loading ? '—' : (s.last7DurationFormatted || '0 h')}</div>
        <div className="svc-stat-label">7 derniers jours</div>
      </div>
      <div className="svc-stat">
        <div className="svc-stat-val">{loading ? '—' : (s.last30DaysCount ?? 0)}</div>
        <div className="svc-stat-label">30 derniers jours</div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ServicePage() {
  const { user, checkAuth } = useAuth()
  const isManager = (user?.roles || []).some(r => MANAGER_ROLE_IDS.has(r))

  // Appelé si le backend répond 401 (session expirée) → force un re-check
  const onUnauth = () => checkAuth()

  // View state
  const [tab, setTab] = useState('mine')
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberSearch, setMemberSearch] = useState('')

  // Form state
  const [hospital, setHospital] = useState('TMC')
  const [date, setDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Data
  const [myData, setMyData] = useState({ stats: null, shifts: [] })
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Live duration preview
  const duration = useMemo(() => {
    if (!startTime || !endTime || !date) return null
    const start = new Date(`${date}T${startTime}`)
    const end   = new Date(`${date}T${endTime}`)
    if (isNaN(start) || isNaN(end) || end <= start) return null
    const ms = end - start
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    const parts = []
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}min`)
    return parts.join(' ') || null
  }, [date, startTime, endTime])

  useEffect(() => { fetchMine() }, [])

  useEffect(() => {
    if (tab === 'team' && !teamData) fetchTeam()
  }, [tab])

  async function fetchMine() {
    setLoading(true)
    try {
      const res = await apiFetch(`${API}/api/shifts/mine`, {}, onUnauth)
      if (res?.ok) setMyData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function fetchTeam() {
    try {
      const res = await apiFetch(`${API}/api/shifts/overview`, {}, onUnauth)
      if (res?.ok) setTeamData(await res.json())
    } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setSuccessMsg('')
    if (!startTime || !endTime) return setFormError('Renseignez les heures de début et de fin.')

    setSubmitting(true)
    try {
      const startAt = new Date(`${date}T${startTime}`).toISOString()
      const endAt   = new Date(`${date}T${endTime}`).toISOString()

      const res = await apiFetch(`${API}/api/shifts/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospital, startAt, endAt, note: note.trim() || null }),
      }, onUnauth)

      if (!res) return // 401 géré par onUnauth
      const data = await res.json()
      if (!res.ok) return setFormError(data.error || "Erreur lors de l'enregistrement.")

      setStartTime('')
      setEndTime('')
      setNote('')
      setTeamData(null)
      setSuccessMsg('Service enregistré avec succès.')
      await fetchMine()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setFormError('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(shiftId) {
    if (!window.confirm('Supprimer ce service définitivement ?')) return
    try {
      const res = await apiFetch(`${API}/api/shifts/${shiftId}`, { method: 'DELETE' }, onUnauth)
      if (res?.ok) {
        setTeamData(null)
        await fetchMine()
      }
    } catch {}
  }

  async function openMember(member) {
    try {
      const res = await apiFetch(`${API}/api/shifts/overview?userId=${member.userId}`, {}, onUnauth)
      if (res?.ok) {
        const d = await res.json()
        setSelectedMember({ ...member, shifts: d.shifts, stats: d.stats })
      }
    } catch {}
  }

  // ── Render ──

  return (
    <Layout title="Prise de service">

      {/* Tab bar (HDP+ only) */}
      {isManager && (
        <div className="service-tabs">
          <button
            className={`svc-tab${tab === 'mine' ? ' active' : ''}`}
            onClick={() => { setTab('mine'); setSelectedMember(null) }}
          >
            MES SERVICES
          </button>
          <button
            className={`svc-tab${tab === 'team' ? ' active' : ''}`}
            onClick={() => setTab('team')}
          >
            ÉQUIPE
          </button>
        </div>
      )}

      {/* ── MINE TAB ── */}
      {tab === 'mine' && (
        <>
          <StatsRow stats={myData.stats} loading={loading} />

          {/* Hospital breakdown */}
          {myData.stats?.hospitalBreakdown && (
            <div className="hosp-breakdown">
              {Object.entries(myData.stats.hospitalBreakdown).map(([h, d]) => (
                <div key={h} className={`hosp-breakdown-card ${h.toLowerCase()}`}>
                  <span className={`shift-hosp-badge ${h.toLowerCase()}`}>{h}</span>
                  <span className="hosp-breakdown-info">
                    <span className="hosp-breakdown-count">{d.count} service{d.count !== 1 ? 's' : ''}</span>
                    <span className="hosp-breakdown-dur">{d.durationFormatted}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Body: form + history */}
          <div className="svc-body">

            {/* ── Form ── */}
            <div className="svc-form-panel">
              <div className="svc-panel-title">Nouveau service</div>

              <form onSubmit={handleSubmit}>
                {/* Hospital toggle */}
                <div className="hospital-toggle">
                  <button
                    type="button"
                    className={`hosp-btn${hospital === 'TMC' ? ' active-tmc' : ''}`}
                    onClick={() => setHospital('TMC')}
                  >
                    TMC
                  </button>
                  <button
                    type="button"
                    className={`hosp-btn${hospital === 'NMH' ? ' active-nmh' : ''}`}
                    onClick={() => setHospital('NMH')}
                  >
                    NMH
                  </button>
                </div>

                <div className="svc-form-group">
                  <label className="svc-form-label">Date</label>
                  <input
                    type="date"
                    className="svc-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    max={todayStr()}
                    required
                  />
                </div>

                <div className="svc-form-group">
                  <label className="svc-form-label">Horaires</label>
                  <div className="svc-time-row">
                    <div className="svc-time-field">
                      <span className="svc-time-label">Début</span>
                      <input
                        type="time"
                        className="svc-input"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="svc-time-field">
                      <span className="svc-time-label">Fin</span>
                      <input
                        type="time"
                        className="svc-input"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Duration preview */}
                <div className={`svc-duration-preview${duration ? ' visible' : ''}`}>
                  <span className="svc-duration-label">Durée calculée</span>
                  <span className="svc-duration-val">{duration || '—'}</span>
                </div>

                <div className="svc-form-group">
                  <label className="svc-form-label">Note (optionnel)</label>
                  <textarea
                    className="svc-input svc-textarea"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="Ex: Bonne garde, équipe au complet…"
                  />
                </div>

                {formError  && <div className="svc-error">{formError}</div>}
                {successMsg && <div className="svc-success">{successMsg}</div>}

                <button
                  type="submit"
                  className="svc-submit-btn"
                  disabled={submitting || !duration}
                >
                  {submitting ? 'Enregistrement…' : 'Enregistrer le service'}
                </button>
              </form>
            </div>

            {/* ── History ── */}
            <div className="svc-history-panel">
              <div className="svc-panel-title">
                Historique
                {!loading && <span className="svc-count-badge">{myData.shifts.length}</span>}
              </div>

              {loading ? (
                <div className="svc-empty">
                  <div className="svc-empty-text">Chargement…</div>
                </div>
              ) : myData.shifts.length === 0 ? (
                <div className="svc-empty">
                  <div className="svc-empty-icon">📋</div>
                  <div className="svc-empty-text">Aucun service enregistré</div>
                  <div className="svc-empty-sub">Utilisez le formulaire pour déclarer votre premier service.</div>
                </div>
              ) : (
                myData.shifts.map(s => (
                  <ShiftCard key={s.id} shift={s} onDelete={handleDelete} />
                ))
              )}
            </div>

          </div>
        </>
      )}

      {/* ── TEAM TAB (manager only) ── */}
      {tab === 'team' && (
        <div className="team-view">

          {selectedMember ? (
            /* Member detail */
            <>
              <button className="back-btn" onClick={() => setSelectedMember(null)}>
                <IconBack />
                Retour à l'équipe
              </button>

              <div className="member-detail-header">
                <div className="team-member-initials large">
                  {(selectedMember.userName?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="member-detail-name">{selectedMember.userName}</div>
                  <div className="member-detail-poste">{selectedMember.userPoste || 'Non défini'}</div>
                </div>
              </div>

              <StatsRow stats={selectedMember.stats} loading={false} />

              <div className="svc-history-panel" style={{ marginTop: 16 }}>
                <div className="svc-panel-title">
                  Services enregistrés
                  <span className="svc-count-badge">{selectedMember.shifts?.length ?? 0}</span>
                </div>
                {!selectedMember.shifts?.length ? (
                  <div className="svc-empty">
                    <div className="svc-empty-icon">📋</div>
                    <div className="svc-empty-text">Aucun service pour ce membre</div>
                  </div>
                ) : (
                  selectedMember.shifts.map(s => (
                    <ShiftCard key={s.id} shift={s} onDelete={null} />
                  ))
                )}
              </div>
            </>

          ) : (
            /* Team list */
            <>
              {teamData ? (
                <>
                  <StatsRow stats={teamData.globalStats} loading={false} />

                  <div className="svc-history-panel" style={{ maxHeight: 'none' }}>
                    <div className="svc-panel-title">
                      Membres actifs
                      <span className="svc-count-badge">{teamData.members?.length ?? 0}</span>
                      <div className="member-search-wrap">
                        <IconSearch />
                        <input
                          type="text"
                          className="member-search-input"
                          placeholder="Rechercher un membre…"
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                        />
                        {memberSearch && (
                          <button className="member-search-clear" onClick={() => setMemberSearch('')}>×</button>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const filtered = (teamData.members || []).filter(m =>
                        !memberSearch || (m.userName || '').toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      if (!filtered.length) return (
                        <div className="svc-empty">
                          <div className="svc-empty-icon">👥</div>
                          <div className="svc-empty-text">
                            {memberSearch ? `Aucun résultat pour "${memberSearch}"` : 'Aucun service enregistré dans l\'équipe'}
                          </div>
                        </div>
                      )
                      return filtered.map(m => (
                        <div
                          key={m.userId}
                          className="team-member-card"
                          onClick={() => openMember(m)}
                        >
                          <div className="team-member-initials">
                            {(m.userName?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="team-member-info">
                            <div className="team-member-name">{m.userName}</div>
                            <div className="team-member-poste">{m.userPoste || 'Non défini'}</div>
                          </div>
                          <div className="team-member-stats">
                            <div className="team-member-count">{m.stats?.totalShifts ?? 0}</div>
                            <div className="team-member-hours">{m.stats?.totalDurationFormatted || '0 h'}</div>
                          </div>
                          <div className="team-member-arrow"><IconChevron /></div>
                        </div>
                      ))
                    })()}
                  </div>
                </>
              ) : (
                <div className="svc-empty">
                  <div className="svc-empty-text">Chargement de l'équipe…</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </Layout>
  )
}
