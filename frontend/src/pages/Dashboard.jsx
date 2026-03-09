import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

const API = import.meta.env.VITE_API_URL || ''

// SPV+ role IDs — pour afficher le module Créateur de templates (HDP inclus)
const SPV_ROLE_IDS = new Set([
  '1140657047126425660', // SHIFT_SPV
  '809086773326118952',  // HDP
  '805518674806046733',  // DEPUTY_CHIEF
  '805481782119104522',  // CHIEF
  '805551419905015818',  // DEO
  '805508029151313921',  // CEO
  '1377632925939666974', // DRH
  '1407313203326877696', // RH_SIMPLE
])
// Shift SPV+ role IDs — pour la note de service (HDP exclu)
const SHIFT_SPV_ROLE_IDS = new Set([
  '1140657047126425660', // SHIFT_SPV
  '805518674806046733',  // DEPUTY_CHIEF
  '805481782119104522',  // CHIEF
  '805551419905015818',  // DEO
  '805508029151313921',  // CEO
  '1377632925939666974', // DRH
])
// Full admin role IDs — accès complet (Deputy Chief et supérieurs)
const FULL_ADMIN_ROLE_IDS = new Set([
  '805518674806046733',  // DEPUTY_CHIEF
  '805481782119104522',  // CHIEF
  '805551419905015818',  // DEO
  '805508029151313921',  // CEO
  '1377632925939666974', // DRH
])
function isSupervisor(user) {
  return (user?.roles || []).some(r => SPV_ROLE_IDS.has(r))
}
function isShiftSupervisor(user) {
  return (user?.roles || []).some(r => SHIFT_SPV_ROLE_IDS.has(r))
}
function isFullAdmin(user) {
  return (user?.roles || []).some(r => FULL_ADMIN_ROLE_IDS.has(r))
}

function formatLastShift(shift) {
  if (!shift) return '—'
  // Use startLocal (e.g. "2024-03-01 14:30") if available, fallback to ISO
  const raw = shift.startLocal || shift.startAt
  const date = new Date(shift.startAt)
  if (isNaN(date)) return '—'
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 3600)   return `il y a ${Math.max(1, Math.floor(diff / 60))} min`
  if (diff < 86400)  return `il y a ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  if (days === 1)    return 'Hier'
  if (days < 7)      return `il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6)  return 'BONNE NUIT'
  if (h < 12) return 'BONJOUR'
  if (h < 18) return 'BON APRÈS-MIDI'
  return 'BONSOIR'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconReceipt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/>
    <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
  </svg>
)

// Icône superviseur : coche dans un cercle vert
const IconSpvBadge = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#22c55e" opacity="0.15"/>
    <circle cx="12" cy="12" r="11" stroke="#22c55e" strokeWidth="1.5"/>
    <polyline points="7 12.5 10.5 16 17 9" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
// Icône non-superviseur : croix rouge
const IconNoSpv = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)
const IconMegaphone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z"/>
  </svg>
)
const IconPencil = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconTrash2 = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconFileCode = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <polyline points="10 13 8 15 10 17"/><polyline points="14 13 16 15 14 17"/>
  </svg>
)
const IconRadio = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
)
const IconTemplate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="9" x2="9" y2="21"/>
  </svg>
)

// ─── ServiceNote component ────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}

function ServiceNote({ canEdit }) {
  const [note, setNote]         = useState(null)
  const [editing, setEditing]   = useState(false)
  const [draft, setDraft]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const noteRef = useRef(null)

  useEffect(() => {
    fetch(`${API}/api/note`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.note) setNote(data.note) })
      .catch(() => {})
  }, [])

  function applyFormat(open, close, isLine = false) {
    const el = noteRef.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const val   = draft
    if (isLine) {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1
      const lineEnd   = val.indexOf('\n', start)
      const lineText  = val.slice(lineStart, lineEnd === -1 ? val.length : lineEnd)
      let newVal
      if (lineText.startsWith('# ')) {
        newVal = val.slice(0, lineStart) + lineText.slice(2) + val.slice(lineEnd === -1 ? val.length : lineEnd)
      } else {
        newVal = val.slice(0, lineStart) + '# ' + lineText + val.slice(lineEnd === -1 ? val.length : lineEnd)
      }
      setDraft(newVal.slice(0, 800))
      setTimeout(() => { el.focus() }, 0)
      return
    }
    const selected = val.slice(start, end)
    const newVal = val.slice(0, start) + open + selected + close + val.slice(end)
    setDraft(newVal.slice(0, 800))
    setTimeout(() => {
      el.focus()
      const newStart = start + open.length
      const newEnd   = newStart + selected.length
      el.setSelectionRange(newStart, newEnd)
    }, 0)
  }

  function parseInline(text) {
    if (!text) return []
    const patterns = [
      { re: /\*\*([^*\n]+?)\*\*/,                         type: 'bold'   },
      { re: /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/,   type: 'italic' },
      { re: /~~([^~\n]+?)~~/,                              type: 'strike' },
      { re: /\[c=(#[0-9a-fA-F]{3,6})\]([^\[]*?)\[\/c\]/,  type: 'color'  },
    ]
    let best = null, bestIdx = Infinity
    for (const p of patterns) {
      const m = p.re.exec(text)
      if (m && m.index < bestIdx) { best = { ...p, match: m }; bestIdx = m.index }
    }
    if (!best) return [text]
    const { match, type } = best
    const result = []
    if (match.index > 0) result.push(text.slice(0, match.index))
    const k     = `${match.index}-${type}`
    const inner = parseInline(type === 'color' ? match[2] : match[1])
    if      (type === 'bold')   result.push(<strong key={k}>{inner}</strong>)
    else if (type === 'italic') result.push(<em     key={k}>{inner}</em>)
    else if (type === 'strike') result.push(<s      key={k}>{inner}</s>)
    else if (type === 'color')  result.push(<span   key={k} style={{ color: match[1] }}>{inner}</span>)
    if (match.index + match[0].length < text.length)
      result.push(...parseInline(text.slice(match.index + match[0].length)))
    return result
  }

  function renderNoteContent(content) {
    return content.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="svc-note-spacer" />
      if (line.startsWith('# ')) return <div key={i} className="svc-note-title">{parseInline(line.slice(2))}</div>
      return <p key={i} className="svc-note-line">{parseInline(line)}</p>
    })
  }

  async function handleSave() {
    if (!draft.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`${API}/api/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: draft }),
      })
      if (r.ok) {
        const data = await r.json()
        setNote(data.note)
        setEditing(false)
      }
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    await fetch(`${API}/api/note`, { method: 'DELETE', credentials: 'include' })
    setNote(null)
    setConfirmDel(false)
    setEditing(false)
  }

  function openEdit() {
    setDraft(note?.content || '')
    setEditing(true)
    setConfirmDel(false)
  }

  // Rien à afficher + pas le droit d'écrire
  if (!note && !canEdit) return null

  return (
    <div className={`svc-note-card${editing ? ' svc-note-card--editing' : ''}`}>
      <div className="svc-note-header">
        <span className="svc-note-badge"><IconMegaphone /> NOTE DE SERVICE</span>
        {canEdit && !editing && (
          <div className="svc-note-actions">
            <button className="svc-note-btn" onClick={openEdit} title="Modifier">
              <IconPencil /> {note ? 'Modifier' : 'Rédiger une note'}
            </button>
            {note && !confirmDel && (
              <button className="svc-note-btn svc-note-btn--danger" onClick={() => setConfirmDel(true)} title="Supprimer">
                <IconTrash2 />
              </button>
            )}
            {confirmDel && (
              <span className="svc-note-confirm">
                Supprimer ?
                <button className="svc-note-btn svc-note-btn--danger" onClick={handleDelete}><IconCheck /> Oui</button>
                <button className="svc-note-btn" onClick={() => setConfirmDel(false)}><IconX /> Non</button>
              </span>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="svc-note-edit">
          <div className="svc-note-toolbar">
            <button type="button" className="svc-note-tool svc-note-tool--bold"    title="Gras"     onMouseDown={e => { e.preventDefault(); applyFormat('**', '**') }}>B</button>
            <button type="button" className="svc-note-tool svc-note-tool--italic"  title="Italique" onMouseDown={e => { e.preventDefault(); applyFormat('*', '*') }}>I</button>
            <button type="button" className="svc-note-tool svc-note-tool--strike"  title="Barré"    onMouseDown={e => { e.preventDefault(); applyFormat('~~', '~~') }}>S</button>
            <span className="svc-note-tool-sep" />
            <button type="button" className="svc-note-tool svc-note-tool--heading" title="Titre (ligne courante)" onMouseDown={e => { e.preventDefault(); applyFormat('', '', true) }}>H1</button>
            <span className="svc-note-tool-sep" />
            {[
              { hex: '#ef4444', label: 'Rouge'  },
              { hex: '#f97316', label: 'Orange' },
              { hex: '#eab308', label: 'Jaune'  },
              { hex: '#22c55e', label: 'Vert'   },
              { hex: '#38bdf8', label: 'Bleu'   },
              { hex: '#a855f7', label: 'Violet' },
              { hex: '#ec4899', label: 'Rose'   },
            ].map(c => (
              <button
                key={c.hex}
                type="button"
                className="svc-note-color"
                title={c.label}
                style={{ background: c.hex }}
                onMouseDown={e => { e.preventDefault(); applyFormat(`[c=${c.hex}]`, '[/c]') }}
              />
            ))}
          </div>
          <textarea
            ref={noteRef}
            className="svc-note-textarea"
            value={draft}
            onChange={e => setDraft(e.target.value.slice(0, 800))}
            placeholder="Rédigez votre note… Sélectionnez du texte, puis B / I / S pour le formater."
            autoFocus
          />
          <div className="svc-note-edit-footer">
            <span className="svc-note-chars">{draft.length}/800</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="svc-note-btn" onClick={() => setEditing(false)}><IconX /> Annuler</button>
              <button className="svc-note-btn svc-note-btn--save" onClick={handleSave} disabled={saving || !draft.trim()}>
                <IconCheck /> {saving ? 'Enregistrement…' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      ) : note ? (
        <div className="svc-note-content">
          <div className="svc-note-body">{renderNoteContent(note.content)}</div>
          <div className="svc-note-meta">
            {note.author} · {timeAgo(note.updatedAt)}
          </div>
        </div>
      ) : (
        <p className="svc-note-empty">Aucune note publiée. Cliquez sur « Rédiger une note » pour en créer une.</p>
      )}
    </div>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MODULES_BASE = [
  { icon: <IconHeart />,    title: 'Prise de service',      desc: 'Déclarez vos prises et fins de service au sein du centre médical.', soon: false, to: '/services' },
  { icon: <IconFileCode />, title: 'BBCode / Rapports',     desc: 'Remplissez vos rapports depuis les templates BBCode disponibles.',  soon: false, to: '/bbcode/fill' },
  { icon: <IconBell />,     title: 'Annonces',              desc: "Retrouvez toutes les communications officielles de la direction.",   soon: false, to: '/annonces' },
  { icon: <IconRadio />,    title: 'Bipper',                desc: 'Envoyez des demandes de renfort aux unités via le canal radio Discord.', soon: false, to: '/bipper' },
  { icon: <IconTemplate />, title: 'Créateur de templates', desc: 'Créez et gérez les templates BBCode pour les rapports du personnel.', soon: false, to: '/bbcode/builder', spvOnly: true },
  { icon: <IconUsers />,    title: 'Personnel',             desc: "Annuaire complet des membres, logs d'activité et gestion RH.",      soon: true,  to: null },
  { icon: <IconChart />,    title: 'Statistiques',          desc: "Tableaux de bord et métriques d'activité du centre.",               soon: true,  to: null },
  { icon: <IconReceipt />,  title: 'Facturation',           desc: 'Gérez les factures et les paiements liés aux services médicaux.',   soon: true,  to: null },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const greeting  = getGreeting()

  const [lastShift, setLastShift] = useState(null)
  useEffect(() => {
    fetch(`${API}/api/shifts/mine`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.stats?.lastShift) setLastShift(data.stats.lastShift) })
      .catch(() => {})
  }, [])

  // Personnel visible + actif uniquement pour les Deputy Chief et supérieurs
  // Créateur de templates visible uniquement pour les superviseurs (HDP inclus)
  const MODULES = MODULES_BASE
    .filter(m => !m.spvOnly || isSupervisor(user))
    .map(m => isFullAdmin(user) && m.title === 'Personnel' ? { ...m, soon: false, to: '/personnel' } : m)
    .filter(m => isFullAdmin(user) || m.title !== 'Personnel')

  const allModules = MODULES
    .sort((a, b) => (a.soon ? 1 : 0) - (b.soon ? 1 : 0))

  return (
    <Layout title="Tableau de bord">

      {/* Welcome */}
      <div className="welcome-card">
        <div>
          <div className="welcome-greeting">{greeting}</div>
          <div className="welcome-name">
            {[user?.prenom, user?.nom].filter(Boolean).join(' ') || user?.username || 'Personnel'}
          </div>
          <div className="welcome-role">
            {user?.poste || 'Membre du personnel'} · HCT Healthcare
          </div>
        </div>
        <div className="welcome-emblem">🏥</div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><IconUsers /></div>
          <div>
            <div className="stat-val">736</div>
            <div className="stat-label">Membres actifs</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><IconClock /></div>
          <div>
            <div className="stat-val">{formatLastShift(lastShift)}</div>
            <div className="stat-label">Votre dernier service</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><IconShield /></div>
          <div>
            <div className="stat-val stat-val--icon">
              {isSupervisor(user) ? <IconSpvBadge /> : <IconNoSpv />}
            </div>
            <div className="stat-label">Vue superviseur</div>
          </div>
        </div>
      </div>

      {/* Note de service */}
      <ServiceNote canEdit={isShiftSupervisor(user)} />

      {/* Modules */}
      <div className="section-label">MODULES</div>
      <div className="modules-grid">
        {allModules.map((m, i) => (
          <div
            key={i}
            className={`module-card${m.soon ? ' module-card--soon' : ''}`}
            onClick={() => m.to && navigate(m.to)}
            style={m.to ? { cursor: 'pointer' } : { cursor: 'default' }}
          >
            <div className="module-icon">{m.icon}</div>
            <div className="module-title">{m.title}</div>
            <div className="module-desc">{m.desc}</div>
            {m.soon
              ? <span className="module-soon">BIENTÔT</span>
              : <span className="module-open"><IconArrow /></span>
            }
          </div>
        ))}
      </div>

    </Layout>
  )
}
