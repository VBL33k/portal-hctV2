import { useState, useEffect, useMemo, useCallback } from 'react'
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

function fmtDateShort(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return null }
}

function timeAgo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  if (h < 24) return `il y a ${h} h`
  if (d < 30) return `il y a ${d} j`
  return fmtDateShort(iso)
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

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name[0].toUpperCase()
}

function getLevelColor(level) {
  if (level >= 13) return '#f97316'  // Full admin — orange
  if (level >= 11) return '#a78bfa'  // SPV / HDP — violet
  if (level >= 7)  return '#4e9bff'  // EMT — bleu
  return 'rgba(255,255,255,0.5)'     // Interne → Professeur — gris
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)
const IconSort = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/>
  </svg>
)
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconAlertTriangle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({ member, onClick }) {
  const initials = getInitials(member.userName)
  const levelColor = getLevelColor(member.userLevel)

  return (
    <div className="personnel-card" onClick={() => onClick(member.userId)}>
      <div className="personnel-card-avatar" style={{ borderColor: levelColor }}>
        <span>{initials}</span>
        {member.online && <span className="personnel-online-dot" />}
      </div>

      <div className="personnel-card-info">
        <div className="personnel-card-name">{member.userName}</div>
        <div className="personnel-card-poste">{member.userPoste}</div>
      </div>

      <div className="personnel-card-meta">
        {member.lastLogin ? (
          <span className="personnel-card-lastlogin">
            <IconClock /> {timeAgo(member.lastLogin)}
          </span>
        ) : (
          <span className="personnel-card-lastlogin personnel-card-lastlogin--never">Jamais connecté</span>
        )}
        {member.online && (
          <span className="personnel-card-online-badge">EN LIGNE</span>
        )}
      </div>
    </div>
  )
}

// ─── Member Modal ─────────────────────────────────────────────────────────────

function MemberModal({ userId, onClose }) {
  const [detail, setDetail]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [demoting, setDemoting] = useState(false)
  const [demoted, setDemoted]   = useState(false)
  const [demoteErr, setDemoteErr] = useState(null)
  const [confirmDemote, setConfirmDemote] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDetail(null)
    setDemoted(false)
    setDemoteErr(null)
    setConfirmDemote(false)

    fetch(`${API}/api/admin/members/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) setError(data.error)
        else setDetail(data)
      })
      .catch(() => { if (!cancelled) setError('Erreur de chargement') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [userId])

  async function handleDemote() {
    if (!confirmDemote) { setConfirmDemote(true); return }
    setDemoting(true)
    setDemoteErr(null)
    try {
      const r = await fetch(`${API}/api/admin/members/${userId}/demote`, {
        method: 'POST', credentials: 'include',
      })
      const data = await r.json()
      if (!r.ok) { setDemoteErr(data.error || 'Erreur inconnue'); return }
      setDemoted(true)
      setConfirmDemote(false)
    } catch {
      setDemoteErr('Erreur réseau')
    } finally {
      setDemoting(false)
    }
  }

  const canDemote = detail && detail.userLevel >= 1 && detail.userLevel <= 12 && !demoted

  const initials   = detail ? getInitials(detail.userName) : '?'
  const levelColor = detail ? getLevelColor(detail.userLevel) : 'rgba(255,255,255,0.3)'

  return (
    <div className="personnel-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="personnel-modal">

        {/* ── Header ── */}
        <div className="personnel-modal-header">
          <div className="personnel-modal-avatar" style={{ borderColor: levelColor }}>
            {detail?.avatarUrl
              ? <img src={detail.avatarUrl} alt={detail.userName} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
              : null
            }
            <span style={detail?.avatarUrl ? { display: 'none' } : {}}>{initials}</span>
            {detail?.online && <span className="personnel-online-dot personnel-online-dot--lg" />}
          </div>

          <div className="personnel-modal-identity">
            {loading
              ? <div className="personnel-modal-skeleton" style={{ width: 160, height: 22 }} />
              : <div className="personnel-modal-name">{detail?.userName || '—'}</div>
            }
            {loading
              ? <div className="personnel-modal-skeleton" style={{ width: 110, height: 16, marginTop: 6 }} />
              : <div className="personnel-modal-poste" style={{ color: levelColor }}>{detail?.userPoste || '—'}</div>
            }
            {detail?.online && <span className="personnel-modal-online-badge">● EN LIGNE</span>}
          </div>

          <button className="personnel-modal-close" onClick={onClose}><IconClose /></button>
        </div>

        {/* ── Body ── */}
        {error && (
          <div className="personnel-modal-error">
            <IconAlertTriangle /> {error}
          </div>
        )}

        {!error && (
          <div className="personnel-modal-body">

            {/* Dernière connexion */}
            <div className="personnel-modal-section">
              <div className="personnel-section-label">DERNIÈRE CONNEXION</div>
              {loading
                ? <div className="personnel-modal-skeleton" style={{ width: 200, height: 18 }} />
                : <div className="personnel-modal-lastlogin">
                    {detail?.logs?.find(l => l.action === 'LOGIN')
                      ? fmtDate(detail.logs.find(l => l.action === 'LOGIN').timestamp)
                      : 'Aucune connexion enregistrée'
                    }
                  </div>
              }
            </div>

            {/* Logs */}
            <div className="personnel-modal-section">
              <div className="personnel-section-label" style={{ marginBottom: 12 }}>
                ACTIVITÉ  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                  {!loading && detail && `— ${detail.logs?.length || 0} entrées`}
                </span>
              </div>

              {loading ? (
                <div className="personnel-logs-skeleton">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="personnel-logs-skeleton-row">
                      <div className="personnel-modal-skeleton" style={{ width: 10, height: 10, borderRadius: '50%' }} />
                      <div>
                        <div className="personnel-modal-skeleton" style={{ width: 130, height: 13 }} />
                        <div className="personnel-modal-skeleton" style={{ width: 90, height: 11, marginTop: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : detail?.logs?.length ? (
                <div className="personnel-logs">
                  {detail.logs.map((entry, i) => (
                    <div key={i} className="personnel-log-entry">
                      <div
                        className="personnel-log-dot"
                        style={{ background: ACTION_COLORS[entry.action] || 'rgba(255,255,255,0.3)' }}
                      />
                      <div className="personnel-log-content">
                        <div className="personnel-log-action">
                          {ACTION_LABELS[entry.action] || entry.action}
                          {entry.details && <span className="personnel-log-details"> — {entry.details}</span>}
                        </div>
                        <div className="personnel-log-time">{fmtDate(entry.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="personnel-logs-empty">Aucune activité enregistrée</div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer / Demote ── */}
        {!error && !loading && canDemote && (
          <div className="personnel-modal-footer">
            {demoted ? (
              <div className="personnel-demote-success">✓ Membre rétrogradé avec succès</div>
            ) : (
              <>
                {demoteErr && (
                  <div className="personnel-demote-error"><IconAlertTriangle /> {demoteErr}</div>
                )}
                {confirmDemote ? (
                  <div className="personnel-demote-confirm-row">
                    <span className="personnel-demote-confirm-msg">
                      <IconAlertTriangle /> Confirmer la rétrogradation de <strong>{detail.userName}</strong> ?
                    </span>
                    <div className="personnel-demote-confirm-btns">
                      <button
                        className="personnel-demote-cancel"
                        onClick={() => { setConfirmDemote(false); setDemoteErr(null) }}
                      >
                        Annuler
                      </button>
                      <button
                        className="personnel-demote-confirm"
                        onClick={handleDemote}
                        disabled={demoting}
                      >
                        {demoting ? 'En cours…' : 'Confirmer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="personnel-demote-btn" onClick={handleDemote}>
                    <IconShield /> Rétrograder le membre
                  </button>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'name_asc',   label: 'Nom A → Z' },
  { value: 'login_desc', label: 'Connexion récente' },
  { value: 'login_asc',  label: 'Connexion ancienne' },
  { value: 'level_desc', label: 'Grade (élevé → bas)' },
]

export default function PersonnelPage() {
  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
  const [sortBy, setSortBy]       = useState('name_asc')
  const [selectedId, setSelectedId] = useState(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r    = await fetch(`${API}/api/admin/members`, { credentials: 'include' })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Erreur de chargement'); return }
      setMembers(data.members || [])
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMembers() }, [loadMembers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = members
    if (q) {
      list = list.filter(m =>
        m.userName?.toLowerCase().includes(q) ||
        m.userPoste?.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.userName || '').localeCompare(b.userName || '', 'fr')
        case 'login_desc':
          if (!a.lastLogin && !b.lastLogin) return 0
          if (!a.lastLogin) return 1
          if (!b.lastLogin) return -1
          return new Date(b.lastLogin) - new Date(a.lastLogin)
        case 'login_asc':
          if (!a.lastLogin && !b.lastLogin) return 0
          if (!a.lastLogin) return 1
          if (!b.lastLogin) return -1
          return new Date(a.lastLogin) - new Date(b.lastLogin)
        case 'level_desc':
          return (b.userLevel ?? 0) - (a.userLevel ?? 0)
        default:
          return 0
      }
    })
  }, [members, search, sortBy])

  const onlineCount = useMemo(() => members.filter(m => m.online).length, [members])

  return (
    <Layout title="Personnel">
      <div className="personnel-page">

        {/* ── Stats bar ── */}
        <div className="personnel-stats">
          <div className="personnel-stat">
            <IconUsers />
            <span className="personnel-stat-val">{loading ? '…' : members.length}</span>
            <span className="personnel-stat-label">membres HCT</span>
          </div>
          <div className="personnel-stat">
            <span className="personnel-online-dot" style={{ position: 'static', flexShrink: 0 }} />
            <span className="personnel-stat-val">{onlineCount}</span>
            <span className="personnel-stat-label">en ligne</span>
          </div>
          <button
            className="personnel-refresh-btn"
            onClick={loadMembers}
            disabled={loading}
            title="Actualiser"
          >
            <IconRefresh /> Actualiser
          </button>
        </div>

        {/* ── Search / Sort bar ── */}
        <div className="personnel-toolbar">
          <div className="personnel-search-wrap">
            <IconSearch />
            <input
              className="personnel-search"
              type="text"
              placeholder="Rechercher par nom ou grade…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="personnel-search-clear" onClick={() => setSearch('')}>
                <IconClose />
              </button>
            )}
          </div>

          <div className="personnel-sort-wrap">
            <IconSort />
            <select
              className="personnel-sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Content ── */}
        {error && (
          <div className="personnel-error">
            <IconAlertTriangle /> {error}
          </div>
        )}

        {!error && loading && (
          <div className="personnel-list">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="personnel-card personnel-card--loading">
                <div className="personnel-modal-skeleton" style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="personnel-modal-skeleton" style={{ width: '55%', height: 15 }} />
                  <div className="personnel-modal-skeleton" style={{ width: '35%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!error && !loading && filtered.length === 0 && (
          <div className="personnel-empty">
            {search ? `Aucun membre correspondant à « ${search} »` : 'Aucun membre trouvé'}
          </div>
        )}

        {!error && !loading && filtered.length > 0 && (
          <>
            <div className="personnel-count">
              {filtered.length !== members.length
                ? `${filtered.length} / ${members.length} membres`
                : `${members.length} membres`
              }
            </div>
            <div className="personnel-list">
              {filtered.map(m => (
                <MemberCard key={m.userId} member={m} onClick={setSelectedId} />
              ))}
            </div>
          </>
        )}

      </div>

      {/* ── Member Modal ── */}
      {selectedId && (
        <MemberModal userId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </Layout>
  )
}
