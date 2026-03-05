import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  FileCode,
  Lock,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignCenter,
  Minus,
  Palette,
  Type,
  Eye,
  EyeOff,
  Check,
  X,
  Copy,
  Save,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = import.meta.env.VITE_API_URL || ''

const SPV_ROLE_IDS = new Set([
  '1140657047126425660',
  '809086773326118952',
  '805518674806046733',
  '1407313203326877696',
  '805481782119104522',
  '805551419905015818',
  '805508029151313921',
  '1377632925939666974',
])

function isSupervisor(user) {
  return (user?.roles || []).some((r) => SPV_ROLE_IDS.has(r))
}

const CATEGORIES_FALLBACK = [
  { id: 'emt', label: 'EMT', icon: 'https://zupimages.net/up/24/16/127a.png' },
  { id: 'mers', label: 'MERS', icon: 'https://zupimages.net/up/24/16/u8bk.png' },
  { id: 'med-gen', label: 'Médecine Générale', icon: 'https://zupimages.net/up/23/35/br9g.png' },
  { id: 'psy', label: 'Psychiatrie', icon: 'https://zupimages.net/up/24/16/rn70.png' },
  { id: 'chirurgie', label: 'Chirurgie', icon: 'https://zupimages.net/up/24/16/aghk.png' },
  { id: 'med-legale', label: 'Médecine Légale', icon: 'https://zupimages.net/up/23/30/x0x4.png' },
  { id: 'rh', label: 'RH', icon: 'https://zupimages.net/up/25/45/s9h6.png' },
  { id: 'autres', label: 'Autres', icon: 'https://i.ibb.co/Zzzf4jmv/5895032.png' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'textarea', label: 'Paragraphe' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Heure' },
  { value: 'datetime', label: 'Date & Heure' },
  { value: 'select', label: 'Liste déroulante' },
]

const TOOLBAR_COLORS = [
  { label: 'Blanc', value: '#ffffff' },
  { label: 'Rouge', value: '#ff4444' },
  { label: 'Orange', value: '#E25528' },
  { label: 'Vert', value: '#44cc44' },
  { label: 'Jaune', value: '#ffcc00' },
  { label: 'Cyan', value: '#44ccff' },
  { label: 'Gris', value: '#aaaaaa' },
]

const TOOLBAR_SIZES = [10, 12, 14, 16, 18, 20, 24]

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

function shortId() {
  return Math.random().toString(36).slice(2, 10)
}

function newSection() {
  return {
    id: `sec-${shortId()}`,
    label: 'Nouvelle section',
    description: '',
    fields: [],
  }
}

function newField(secId) {
  const fldId = `fld-${shortId()}`
  return {
    id: fldId,
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    helpText: '',
    defaultValue: '',
    options: [],
    token: `{{${secId}.${fldId}}}`,
  }
}

function emptyTemplate(user) {
  return {
    id: null,
    categoryId: CATEGORIES_FALLBACK[0].id,
    title: '',
    description: '',
    bbcode: '',
    sections: [],
    createdBy: user?.discordId || '',
    createdByName: user?.name || '',
  }
}

// ---------------------------------------------------------------------------
// BBCode Preview renderer
// ---------------------------------------------------------------------------

function bbcodeToHtml(code) {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  // Bold / Italic / Underline / Strike
  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
  html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
  html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>')
  html = html.replace(/\[color=(.*?)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
  html = html.replace(/\[size=(\d+)\]([\s\S]*?)\[\/size\]/gi, '<span style="font-size:$1px">$2</span>')
  html = html.replace(/\[hr\]/gi, '<hr style="border-color:rgba(255,255,255,0.15);margin:8px 0">')
  html = html.replace(
    /\[spoiler(?:=([^\]]*))?\]([\s\S]*?)\[\/spoiler\]/gi,
    '<details style="background:rgba(255,255,255,0.05);border-radius:6px;padding:6px 10px;margin:4px 0"><summary style="cursor:pointer;color:var(--muted)">$1 (Spoiler)</summary>$2</details>',
  )

  // Highlight tokens {{...}}
  html = html.replace(
    /\{\{([^}]+)\}\}/g,
    '<span style="background:rgba(226,85,40,0.18);color:#E25528;border-radius:4px;padding:1px 5px;font-family:monospace;font-size:12px">{{$1}}</span>',
  )

  return html
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CategoryIcon({ cat }) {
  if (!cat) return null
  return (
    <img
      src={cat.icon}
      alt={cat.label}
      style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: 3 }}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

// BBCode toolbar
function BBCodeToolbar({ textareaRef, onChange }) {
  const [showColors, setShowColors] = useState(false)
  const [showSizes, setShowSizes] = useState(false)
  const colorRef = useRef(null)
  const sizeRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (colorRef.current && !colorRef.current.contains(e.target)) setShowColors(false)
      if (sizeRef.current && !sizeRef.current.contains(e.target)) setShowSizes(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function wrap(open, close) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const val = el.value
    const selected = val.slice(start, end)
    const newVal = val.slice(0, start) + open + selected + close + val.slice(end)
    onChange(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + open.length, start + open.length + selected.length)
    }, 0)
  }

  function insert(text) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const val = el.value
    const newVal = val.slice(0, start) + text + val.slice(start)
    onChange(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  return (
    <div className="bld-toolbar">
      <button className="bld-toolbar-btn" title="Gras" onClick={() => wrap('[b]', '[/b]')}><Bold size={13} /></button>
      <button className="bld-toolbar-btn" title="Italique" onClick={() => wrap('[i]', '[/i]')}><Italic size={13} /></button>
      <button className="bld-toolbar-btn" title="Souligné" onClick={() => wrap('[u]', '[/u]')}><Underline size={13} /></button>
      <button className="bld-toolbar-btn" title="Barré" onClick={() => wrap('[s]', '[/s]')}><Strikethrough size={13} /></button>

      <span className="bld-toolbar-sep" />

      {/* Color picker */}
      <div style={{ position: 'relative' }} ref={colorRef}>
        <button
          className="bld-toolbar-btn"
          title="Couleur"
          onClick={() => { setShowColors((v) => !v); setShowSizes(false) }}
        >
          <Palette size={13} />
        </button>
        {showColors && (
          <div className="bld-toolbar-dropdown">
            {TOOLBAR_COLORS.map((c) => (
              <button
                key={c.value}
                className="bld-toolbar-color-swatch"
                title={c.label}
                style={{ background: c.value }}
                onClick={() => { wrap(`[color=${c.value}]`, '[/color]'); setShowColors(false) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Size picker */}
      <div style={{ position: 'relative' }} ref={sizeRef}>
        <button
          className="bld-toolbar-btn"
          title="Taille"
          onClick={() => { setShowSizes((v) => !v); setShowColors(false) }}
        >
          <Type size={13} />
        </button>
        {showSizes && (
          <div className="bld-toolbar-dropdown" style={{ flexDirection: 'column', gap: 2 }}>
            {TOOLBAR_SIZES.map((s) => (
              <button
                key={s}
                className="bld-toolbar-size-btn"
                onClick={() => { wrap(`[size=${s}]`, '[/size]'); setShowSizes(false) }}
              >
                {s}px
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="bld-toolbar-sep" />

      <button className="bld-toolbar-btn" title="Centrer" onClick={() => wrap('[center]', '[/center]')}><AlignCenter size={13} /></button>
      <button className="bld-toolbar-btn" title="Ligne horizontale" onClick={() => insert('[hr]')}><Minus size={13} /></button>

      <span className="bld-toolbar-sep" />

      <button
        className="bld-toolbar-btn"
        title="Spoiler"
        style={{ fontSize: 11, padding: '3px 7px', fontFamily: 'Cairo, sans-serif' }}
        onClick={() => {
          const label = 'Spoiler'
          wrap(`[spoiler=${label}]`, '[/spoiler]')
        }}
      >
        SPOILER
      </button>
    </div>
  )
}

// Token copy button
function TokenCopyBtn({ token }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button className={`bld-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} title="Copier le token">
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copié !' : 'Copier'}
    </button>
  )
}

// Field card (collapsed + expanded)
function FieldCard({ field, secId, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  const typeMeta = FIELD_TYPES.find((t) => t.value === field.type) || FIELD_TYPES[0]

  function update(patch) {
    onUpdate({ ...field, ...patch })
  }

  return (
    <div className={`bld-field-card${expanded ? ' expanded' : ''}`}>
      {/* Collapsed header */}
      <div className="bld-field-header" onClick={() => setExpanded((v) => !v)}>
        <div className="bld-field-header-left">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="bld-field-label-preview">{field.label || <em style={{ color: 'var(--muted)' }}>Sans nom</em>}</span>
          <span className="bld-badge-type">{typeMeta.label}</span>
          {field.required && <span className="bld-badge-req">Requis</span>}
        </div>
        <div className="bld-field-header-right" onClick={(e) => e.stopPropagation()}>
          <span className="bld-token">{field.token}</span>
          <TokenCopyBtn token={field.token} />
          <button
            className="bld-icon-btn danger"
            title="Supprimer le champ"
            onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="bld-field-body">
          <div className="bld-form-row">
            <label>Label du champ *</label>
            <input
              className="bld-input"
              value={field.label}
              onChange={(e) => update({ label: e.target.value })}
              placeholder="Ex : Nom du patient"
            />
          </div>

          <div className="bld-form-row-2col">
            <div className="bld-form-row">
              <label>Type</label>
              <select
                className="bld-select"
                value={field.type}
                onChange={(e) => update({ type: e.target.value })}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="bld-form-row" style={{ justifyContent: 'center' }}>
              <label>Requis</label>
              <label className="bld-toggle">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => update({ required: e.target.checked })}
                />
                <span className="bld-toggle-slider" />
              </label>
            </div>
          </div>

          <div className="bld-form-row">
            <label>Placeholder</label>
            <input
              className="bld-input"
              value={field.placeholder}
              onChange={(e) => update({ placeholder: e.target.value })}
              placeholder="Texte d'aide dans le champ"
            />
          </div>

          <div className="bld-form-row">
            <label>Texte d'aide</label>
            <input
              className="bld-input"
              value={field.helpText}
              onChange={(e) => update({ helpText: e.target.value })}
              placeholder="Affiché sous le champ"
            />
          </div>

          <div className="bld-form-row">
            <label>Valeur par défaut</label>
            <input
              className="bld-input"
              value={field.defaultValue}
              onChange={(e) => update({ defaultValue: e.target.value })}
            />
          </div>

          {field.type === 'select' && (
            <div className="bld-form-row">
              <label>Options (une par ligne)</label>
              <textarea
                className="bld-input"
                style={{ minHeight: 80, resize: 'vertical', fontFamily: 'monospace' }}
                value={Array.isArray(field.options) ? field.options.join('\n') : ''}
                onChange={(e) => update({ options: e.target.value.split('\n') })}
                placeholder="Option A&#10;Option B&#10;Option C"
              />
            </div>
          )}

          <div className="bld-token-display">
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Token :</span>
            <span className="bld-token">{field.token}</span>
            <TokenCopyBtn token={field.token} />
          </div>
        </div>
      )}
    </div>
  )
}

// Section card
function SectionCard({ section, onUpdate, onDelete, onAddField }) {
  const [showDesc, setShowDesc] = useState(false)

  function updateField(updatedField) {
    onUpdate({
      ...section,
      fields: section.fields.map((f) => (f.id === updatedField.id ? updatedField : f)),
    })
  }

  function deleteField(fieldId) {
    onUpdate({ ...section, fields: section.fields.filter((f) => f.id !== fieldId) })
  }

  return (
    <div className="bld-section-card">
      <div className="bld-section-header">
        <input
          className="bld-input bld-section-label-input"
          value={section.label}
          onChange={(e) => onUpdate({ ...section, label: e.target.value })}
          placeholder="Nom de la section"
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="bld-icon-btn"
            title={showDesc ? 'Masquer description' : 'Ajouter description'}
            onClick={() => setShowDesc((v) => !v)}
          >
            {showDesc ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="bld-icon-btn danger" title="Supprimer la section" onClick={() => onDelete(section.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {showDesc && (
        <input
          className="bld-input"
          style={{ marginTop: 6, fontSize: 13 }}
          value={section.description}
          onChange={(e) => onUpdate({ ...section, description: e.target.value })}
          placeholder="Description de la section (optionnel)"
        />
      )}

      <div className="bld-fields-list">
        {section.fields.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>
            Aucun champ — clique sur «&nbsp;Ajouter un champ&nbsp;» ci-dessous
          </p>
        )}
        {section.fields.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            secId={section.id}
            onUpdate={updateField}
            onDelete={deleteField}
          />
        ))}
      </div>

      <button
        className="bld-btn-small"
        onClick={() => {
          const f = newField(section.id)
          onUpdate({ ...section, fields: [...section.fields, f] })
        }}
      >
        <Plus size={12} /> Ajouter un champ
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BBCodeBuilderPage() {
  const { user } = useAuth()

  const [categories, setCategories] = useState(CATEGORIES_FALLBACK)
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('all')

  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null) // null = no editor open
  const [isNew, setIsNew] = useState(false)

  const [showPreview, setShowPreview] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null) // { type: 'success'|'error', text }
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // template id to confirm

  const textareaRef = useRef(null)

  // Load templates on mount
  useEffect(() => {
    if (!isSupervisor(user)) return
    fetchTemplates()
  }, [user])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/bbcode/templates`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
        if (data.categories?.length) setCategories(data.categories)
      }
    } catch {
      // silently use empty list
    } finally {
      setLoading(false)
    }
  }

  // Derived: filtered templates
  const filteredTemplates = templates.filter(
    (t) => filterCat === 'all' || t.categoryId === filterCat,
  )

  // Helpers to get category meta
  function getCat(id) {
    return categories.find((c) => c.id === id) || null
  }

  // Open editor for existing template
  function openEdit(tpl) {
    setEditing(JSON.parse(JSON.stringify(tpl))) // deep clone
    setIsNew(false)
    setSelectedId(tpl.id)
    setSaveMsg(null)
    setShowPreview(false)
  }

  // Open editor for new template
  function openNew() {
    setEditing(emptyTemplate(user))
    setIsNew(true)
    setSelectedId(null)
    setSaveMsg(null)
    setShowPreview(false)
  }

  function cancelEdit() {
    setEditing(null)
    setIsNew(false)
    setSelectedId(null)
    setSaveMsg(null)
  }

  // Patch editing state helpers
  function patchEditing(patch) {
    setEditing((prev) => ({ ...prev, ...patch }))
  }

  function updateSection(updatedSection) {
    setEditing((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === updatedSection.id ? updatedSection : s)),
    }))
  }

  function deleteSection(sectionId) {
    setEditing((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }))
  }

  function addSection() {
    setEditing((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSection()],
    }))
  }

  // Save
  async function handleSave() {
    if (!editing) return
    if (!editing.title.trim()) {
      setSaveMsg({ type: 'error', text: 'Le titre est obligatoire.' })
      return
    }
    if (!editing.categoryId) {
      setSaveMsg({ type: 'error', text: 'Choisis une catégorie.' })
      return
    }
    setSaving(true)
    setSaveMsg(null)

    const payload = {
      ...editing,
      createdBy: user?.discordId || '',
      createdByName: user?.name || '',
    }

    try {
      let res
      if (isNew || !editing.id) {
        res = await fetch(`${API}/api/bbcode/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API}/api/bbcode/templates/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        const data = await res.json()
        const saved = data.template || { ...payload, id: payload.id || shortId() }
        setTemplates((prev) => {
          const exists = prev.find((t) => t.id === saved.id)
          if (exists) return prev.map((t) => (t.id === saved.id ? saved : t))
          return [...prev, saved]
        })
        setEditing(saved)
        setIsNew(false)
        setSelectedId(saved.id)
        setSaveMsg({ type: 'success', text: 'Template sauvegardé avec succès !' })
      } else {
        const err = await res.json().catch(() => ({}))
        setSaveMsg({ type: 'error', text: err.message || 'Erreur lors de la sauvegarde.' })
      }
    } catch {
      setSaveMsg({ type: 'error', text: 'Impossible de joindre le serveur.' })
    } finally {
      setSaving(false)
    }
  }

  // Delete
  async function handleDelete(id) {
    try {
      await fetch(`${API}/api/bbcode/templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      if (selectedId === id) cancelEdit()
    } catch {
      // ignore
    } finally {
      setConfirmDelete(null)
    }
  }

  // ─── Access denied ──────────────────────────────────────────────────────────
  if (!isSupervisor(user)) {
    return (
      <Layout title="Créateur de templates">
        <div className="bld-access-denied">
          <Lock size={48} style={{ color: 'var(--orange)', marginBottom: 16 }} />
          <h2>Accès restreint</h2>
          <p>Cette page est réservée aux superviseurs et au staff d'encadrement.</p>
        </div>
      </Layout>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout title="Créateur de templates BBCode">
      <div className="bld-container">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="bld-sidebar">
          <button className="bld-btn-primary bld-btn-new" onClick={openNew}>
            <Plus size={15} /> Nouveau template
          </button>

          {/* Category filter pills */}
          <div className="bld-cat-pills">
            <button
              className={`bld-cat-pill${filterCat === 'all' ? ' active' : ''}`}
              onClick={() => setFilterCat('all')}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`bld-cat-pill${filterCat === cat.id ? ' active' : ''}`}
                onClick={() => setFilterCat(cat.id)}
              >
                <CategoryIcon cat={cat} /> {cat.label}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="bld-tpl-list">
            {loading ? (
              <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Chargement…
              </p>
            ) : filteredTemplates.length === 0 ? (
              <div className="bld-empty-list">
                <FileCode size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p>Aucun template</p>
              </div>
            ) : (
              filteredTemplates.map((tpl) => {
                const cat = getCat(tpl.categoryId)
                const isActive = selectedId === tpl.id
                return (
                  <div
                    key={tpl.id}
                    className={`bld-tpl-card${isActive ? ' active' : ''}`}
                    onClick={() => openEdit(tpl)}
                  >
                    <div className="bld-tpl-card-body">
                      <span className="bld-tpl-title">{tpl.title || 'Sans titre'}</span>
                      {cat && (
                        <span className="bld-cat-badge">
                          <CategoryIcon cat={cat} /> {cat.label}
                        </span>
                      )}
                      <span className="bld-tpl-meta">
                        {tpl.createdByName || '—'} &bull;{' '}
                        {tpl.updatedAt
                          ? new Date(tpl.updatedAt).toLocaleDateString('fr-FR')
                          : tpl.createdAt
                          ? new Date(tpl.createdAt).toLocaleDateString('fr-FR')
                          : ''}
                      </span>
                    </div>
                    <div className="bld-tpl-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="bld-icon-btn"
                        title="Éditer"
                        onClick={(e) => { e.stopPropagation(); openEdit(tpl) }}
                      >
                        <Pencil size={13} />
                      </button>
                      {confirmDelete === tpl.id ? (
                        <div className="bld-confirm-delete">
                          <span>Supprimer ?</span>
                          <button className="bld-btn-cancel-sm" onClick={() => setConfirmDelete(null)}>Annuler</button>
                          <button className="bld-btn-danger-sm" onClick={() => handleDelete(tpl.id)}>Supprimer</button>
                        </div>
                      ) : (
                        <button
                          className="bld-icon-btn danger"
                          title="Supprimer"
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(tpl.id) }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* ── RIGHT MAIN ── */}
        <main className="bld-main">
          {!editing ? (
            <div className="bld-empty-state">
              <FileCode size={56} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p>Crée ou sélectionne un template</p>
              <button className="bld-btn-primary" style={{ marginTop: 16 }} onClick={openNew}>
                <Plus size={14} /> Nouveau template
              </button>
            </div>
          ) : (
            <div className="bld-editor">
              {/* ── Meta bar ── */}
              <div className="bld-meta-bar">
                <input
                  className="bld-input bld-title-input"
                  value={editing.title}
                  onChange={(e) => patchEditing({ title: e.target.value.slice(0, 140) })}
                  placeholder="Titre du template (max 140 caractères)"
                  maxLength={140}
                />
                <select
                  className="bld-select"
                  value={editing.categoryId}
                  onChange={(e) => patchEditing({ categoryId: e.target.value })}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                <input
                  className="bld-input bld-desc-input"
                  value={editing.description}
                  onChange={(e) => patchEditing({ description: e.target.value.slice(0, 500) })}
                  placeholder="Description courte (optionnel, max 500 car.)"
                  maxLength={500}
                />
              </div>

              {/* ── Middle split ── */}
              <div className="bld-split">
                {/* BBCode pane */}
                <div className="bld-bbcode-pane">
                  <div className="bld-pane-label">
                    Contenu BBCode
                    <button
                      className="bld-preview-toggle"
                      onClick={() => setShowPreview((v) => !v)}
                      title={showPreview ? 'Masquer aperçu' : 'Afficher aperçu'}
                    >
                      {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showPreview ? 'Masquer aperçu' : 'Aperçu'}
                    </button>
                  </div>

                  <BBCodeToolbar
                    textareaRef={textareaRef}
                    onChange={(v) => patchEditing({ bbcode: v })}
                  />

                  <textarea
                    ref={textareaRef}
                    className="bld-bbcode-area"
                    value={editing.bbcode}
                    onChange={(e) => patchEditing({ bbcode: e.target.value })}
                    placeholder="Écris ton BBCode ici. Colle les tokens {{section.champ}} aux endroits voulus."
                    spellCheck={false}
                  />

                  <div className="bld-bbcode-hint">
                    Copie un token depuis les champs a droite et colle-le dans le BBCode ci-dessus.
                  </div>

                  {showPreview && (
                    <div className="bld-preview-box">
                      <div className="bld-preview-label">Aperçu</div>
                      <div
                        className="bld-preview-content"
                        dangerouslySetInnerHTML={{ __html: bbcodeToHtml(editing.bbcode || '') }}
                      />
                    </div>
                  )}
                </div>

                {/* Fields pane */}
                <div className="bld-fields-pane">
                  <div className="bld-pane-label">
                    Champs &amp; Sections
                    <button className="bld-btn-small" onClick={addSection}>
                      <Plus size={12} /> Ajouter une section
                    </button>
                  </div>

                  {(!editing.sections || editing.sections.length === 0) ? (
                    <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                      Clique sur «&nbsp;Ajouter une section&nbsp;» pour commencer
                    </div>
                  ) : (
                    editing.sections.map((section) => (
                      <SectionCard
                        key={section.id}
                        section={section}
                        onUpdate={updateSection}
                        onDelete={deleteSection}
                        onAddField={addSection}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* ── Bottom action bar ── */}
              <div className="bld-action-bar">
                {saveMsg && (
                  <span className={`bld-save-msg ${saveMsg.type}`}>
                    {saveMsg.type === 'success' ? <Check size={14} /> : <X size={14} />}
                    {saveMsg.text}
                  </span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                  <button className="bld-btn-secondary" onClick={cancelEdit} disabled={saving}>
                    Annuler
                  </button>
                  <button className="bld-btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      'Sauvegarde…'
                    ) : (
                      <><Save size={14} /> Sauvegarder</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        /* ── Layout ── */
        .bld-container {
          display: flex;
          height: calc(100vh - 64px);
          overflow: hidden;
          background: var(--bg, #0B1628);
          font-family: 'Cairo', sans-serif;
        }

        /* ── Sidebar ── */
        .bld-sidebar {
          width: 300px;
          min-width: 260px;
          max-width: 320px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-right: 1px solid rgba(255,255,255,0.07);
          padding: 16px 12px;
          overflow-y: auto;
          background: rgba(255,255,255,0.025);
          flex-shrink: 0;
        }

        .bld-btn-new {
          width: 100%;
          justify-content: center;
        }

        /* Category pills */
        .bld-cat-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .bld-cat-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 20px;
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          background: transparent;
          color: var(--muted, #8CA0B8);
          font-family: 'Cairo', sans-serif;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .bld-cat-pill:hover {
          border-color: var(--orange, #E25528);
          color: var(--white, #F4F6F9);
        }
        .bld-cat-pill.active {
          background: var(--orange, #E25528);
          border-color: var(--orange, #E25528);
          color: #fff;
        }

        /* Template list */
        .bld-tpl-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          overflow-y: auto;
        }

        .bld-tpl-card {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 10px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: all 0.15s;
        }
        .bld-tpl-card:hover {
          border-color: rgba(226,85,40,0.35);
          background: rgba(226,85,40,0.06);
        }
        .bld-tpl-card.active {
          border-color: rgba(226,85,40,0.55);
          background: rgba(226,85,40,0.07);
        }

        .bld-tpl-card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .bld-tpl-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--white, #F4F6F9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bld-cat-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--muted, #8CA0B8);
        }

        .bld-tpl-meta {
          font-size: 11px;
          color: var(--muted, #8CA0B8);
          opacity: 0.7;
        }

        .bld-tpl-card-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .bld-confirm-delete {
          display: flex;
          flex-direction: column;
          gap: 3px;
          align-items: flex-end;
          font-size: 11px;
          color: var(--muted);
        }

        .bld-btn-cancel-sm {
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-family: 'Cairo', sans-serif;
          font-size: 11px;
          cursor: pointer;
        }
        .bld-btn-cancel-sm:hover { color: var(--white); border-color: rgba(255,255,255,0.2); }

        .bld-btn-danger-sm {
          padding: 2px 7px;
          border-radius: 4px;
          border: 1px solid #ff4444;
          background: rgba(255,68,68,0.15);
          color: #ff7777;
          font-family: 'Cairo', sans-serif;
          font-size: 11px;
          cursor: pointer;
        }
        .bld-btn-danger-sm:hover { background: rgba(255,68,68,0.3); }

        /* Empty states */
        .bld-empty-list {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 0;
          color: var(--muted);
          font-size: 13px;
        }

        /* ── Main ── */
        .bld-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .bld-empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--muted, #8CA0B8);
          font-size: 15px;
        }

        /* ── Editor ── */
        .bld-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        /* Meta bar */
        .bld-meta-bar {
          display: flex;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          align-items: center;
          background: var(--surface, #0D2240);
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        .bld-title-input {
          flex: 2;
          min-width: 200px;
          font-size: 15px;
          font-weight: 600;
        }

        .bld-desc-input {
          flex: 2;
          min-width: 200px;
          font-size: 13px;
        }

        /* Split */
        .bld-split {
          display: flex;
          flex: 1;
          overflow: hidden;
          gap: 0;
        }

        .bld-bbcode-pane {
          flex: 55;
          display: flex;
          flex-direction: column;
          padding: 14px 14px 10px 16px;
          border-right: 1px solid var(--border);
          overflow-y: auto;
          gap: 8px;
        }

        .bld-fields-pane {
          flex: 45;
          display: flex;
          flex-direction: column;
          padding: 14px 16px 10px 14px;
          overflow-y: auto;
          gap: 10px;
        }

        .bld-pane-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          margin-bottom: 2px;
        }

        /* Toolbar */
        .bld-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 2px;
          padding: 5px 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .bld-toolbar-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 26px;
          border-radius: 5px;
          border: none;
          background: transparent;
          color: var(--muted, #8CA0B8);
          cursor: pointer;
          transition: background 0.1s, color 0.1s;
        }
        .bld-toolbar-btn:hover {
          background: rgba(226,85,40,0.15);
          color: var(--orange, #E25528);
        }

        .bld-toolbar-sep {
          width: 1px;
          height: 18px;
          background: var(--border);
          margin: 0 3px;
        }

        .bld-toolbar-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px;
          background: #0D2240;
          border: 1px solid var(--border);
          border-radius: 8px;
          z-index: 100;
          min-width: 120px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }

        .bld-toolbar-color-swatch {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          border: 2px solid rgba(255,255,255,0.15);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.1s;
        }
        .bld-toolbar-color-swatch:hover {
          transform: scale(1.15);
          border-color: rgba(255,255,255,0.6);
        }

        .bld-toolbar-size-btn {
          display: block;
          width: 100%;
          padding: 3px 8px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: var(--white);
          font-family: 'Cairo', sans-serif;
          font-size: 12px;
          cursor: pointer;
          text-align: left;
        }
        .bld-toolbar-size-btn:hover { background: rgba(226,85,40,0.2); color: var(--orange); }

        /* BBCode textarea */
        .bld-bbcode-area {
          flex: 1;
          min-height: 400px;
          resize: vertical;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.6;
          padding: 10px 12px;
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--white, #F4F6F9);
          outline: none;
          transition: border-color 0.15s;
          tab-size: 2;
        }
        .bld-bbcode-area:focus {
          border-color: rgba(226,85,40,0.4);
        }

        .bld-bbcode-hint {
          font-size: 11.5px;
          color: var(--muted);
          opacity: 0.7;
          font-style: italic;
        }

        /* Preview */
        .bld-preview-toggle {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-family: 'Cairo', sans-serif;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .bld-preview-toggle:hover {
          border-color: var(--orange);
          color: var(--orange);
        }

        .bld-preview-box {
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .bld-preview-label {
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid var(--border);
        }
        .bld-preview-content {
          padding: 14px 16px;
          font-size: 14px;
          color: var(--white);
          line-height: 1.65;
          background: rgba(0,0,0,0.15);
          min-height: 60px;
        }

        /* Section card */
        .bld-section-card {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          background: rgba(255,255,255,0.02);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bld-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bld-section-label-input {
          font-size: 13px;
          font-weight: 700;
          flex: 1;
          background: transparent;
          border-color: transparent;
          color: var(--white);
        }
        .bld-section-label-input:focus {
          border-color: rgba(226,85,40,0.4);
          background: rgba(0,0,0,0.2);
        }

        .bld-fields-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Field card */
        .bld-field-card {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: rgba(0,0,0,0.15);
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .bld-field-card.expanded {
          border-color: rgba(226,85,40,0.3);
        }

        .bld-field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px;
          cursor: pointer;
          gap: 8px;
          user-select: none;
        }
        .bld-field-header:hover {
          background: rgba(255,255,255,0.03);
        }

        .bld-field-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 0;
          color: var(--muted);
        }

        .bld-field-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .bld-field-label-preview {
          font-size: 13px;
          color: var(--white);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .bld-badge-type {
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.07);
          font-size: 10px;
          color: var(--muted);
          white-space: nowrap;
        }

        .bld-badge-req {
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(226,85,40,0.15);
          font-size: 10px;
          color: var(--orange);
          white-space: nowrap;
        }

        .bld-field-body {
          padding: 10px 12px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Token */
        .bld-token {
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          color: var(--orange, #E25528);
          background: rgba(226,85,40,0.1);
          border-radius: 4px;
          padding: 2px 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 160px;
        }

        .bld-token-display {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0 0;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
        }

        /* Copy btn */
        .bld-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(226,85,40,0.3);
          background: rgba(226,85,40,0.08);
          color: var(--orange, #E25528);
          font-family: 'Cairo', sans-serif;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .bld-copy-btn:hover {
          background: rgba(226,85,40,0.2);
          border-color: var(--orange);
        }
        .bld-copy-btn.copied {
          background: rgba(68,204,68,0.15);
          border-color: #44cc44;
          color: #44cc44;
          animation: pop 0.15s ease;
        }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }

        /* Form elements */
        .bld-form-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bld-form-row label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--muted);
        }

        .bld-form-row-2col {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: end;
        }

        .bld-input {
          padding: 7px 10px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.25);
          color: var(--white, #F4F6F9);
          font-family: 'Cairo', sans-serif;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .bld-input:focus {
          border-color: rgba(226,85,40,0.5);
        }
        .bld-input::placeholder { color: var(--muted); opacity: 0.6; }

        .bld-select {
          padding: 7px 10px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.35);
          color: var(--white, #F4F6F9);
          font-family: 'Cairo', sans-serif;
          font-size: 13px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .bld-select:focus { border-color: rgba(226,85,40,0.5); }

        /* Toggle switch */
        .bld-toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: 40px;
          height: 22px;
          cursor: pointer;
        }
        .bld-toggle input { display: none; }
        .bld-toggle-slider {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          border: 1px solid var(--border);
          transition: background 0.2s;
        }
        .bld-toggle-slider::before {
          content: '';
          position: absolute;
          left: 3px;
          top: 3px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--muted);
          transition: transform 0.2s, background 0.2s;
        }
        .bld-toggle input:checked + .bld-toggle-slider {
          background: rgba(226,85,40,0.25);
          border-color: var(--orange);
        }
        .bld-toggle input:checked + .bld-toggle-slider::before {
          transform: translateX(18px);
          background: var(--orange);
        }

        /* Buttons */
        .bld-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: var(--orange, #E25528);
          color: #fff;
          font-family: 'Cairo', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
        }
        .bld-btn-primary:hover:not(:disabled) { opacity: 0.88; }
        .bld-btn-primary:active:not(:disabled) { transform: scale(0.97); }
        .bld-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .bld-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-family: 'Cairo', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .bld-btn-secondary:hover:not(:disabled) {
          color: var(--white);
          border-color: rgba(255,255,255,0.2);
        }
        .bld-btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

        .bld-btn-small {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px dashed rgba(226,85,40,0.35);
          background: transparent;
          color: var(--orange, #E25528);
          font-family: 'Cairo', sans-serif;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          align-self: flex-start;
        }
        .bld-btn-small:hover {
          background: rgba(226,85,40,0.1);
          border-style: solid;
        }

        .bld-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 5px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .bld-icon-btn:hover { color: var(--white); border-color: rgba(255,255,255,0.2); }
        .bld-icon-btn.danger:hover { color: #ff6666; border-color: rgba(255,68,68,0.4); background: rgba(255,68,68,0.08); }

        /* Action bar */
        .bld-action-bar {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-top: 1px solid var(--border);
          background: var(--surface, #0D2240);
          flex-shrink: 0;
          gap: 10px;
        }

        .bld-save-msg {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          padding: 5px 12px;
          border-radius: 6px;
        }
        .bld-save-msg.success {
          color: #44cc44;
          background: rgba(68,204,68,0.1);
          border: 1px solid rgba(68,204,68,0.25);
        }
        .bld-save-msg.error {
          color: #ff6666;
          background: rgba(255,68,68,0.1);
          border: 1px solid rgba(255,68,68,0.25);
        }

        /* Access denied */
        .bld-access-denied {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          text-align: center;
          color: var(--white);
        }
        .bld-access-denied h2 {
          font-size: 22px;
          margin-bottom: 8px;
        }
        .bld-access-denied p {
          color: var(--muted);
          font-size: 14px;
        }

        /* Scrollbar */
        .bld-sidebar::-webkit-scrollbar,
        .bld-bbcode-pane::-webkit-scrollbar,
        .bld-fields-pane::-webkit-scrollbar,
        .bld-tpl-list::-webkit-scrollbar {
          width: 4px;
        }
        .bld-sidebar::-webkit-scrollbar-thumb,
        .bld-bbcode-pane::-webkit-scrollbar-thumb,
        .bld-fields-pane::-webkit-scrollbar-thumb,
        .bld-tpl-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
      `}</style>
    </Layout>
  )
}
