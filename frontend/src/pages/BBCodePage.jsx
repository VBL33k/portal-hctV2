import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  FileText,
  Settings2,
  Search,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignCenter,
  AlignRight,
  Minus,
  Link,
  Image,
  ChevronDown,
  X,
  Palette,
  Type,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL || ''

const CATEGORIES = [
  'Médecine légale',
  'Psychiatrie',
  'Urgences',
  'Chirurgie',
  'Pédiatrie',
  'Rapport général',
  'Soins intensifs',
  'Autre',
]

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

const FIELD_TYPES = ['text', 'textarea', 'date', 'number', 'select']

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
// Helpers
// ---------------------------------------------------------------------------

function isSupervisor(user) {
  return (user?.roles || []).some((r) => SPV_ROLE_IDS.has(r))
}

function bbcodeToHtml(text) {
  if (!text) return ''
  let h = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
    .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
    .replace(
      /\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi,
      '<span style="color:$1">$2</span>',
    )
    .replace(
      /\[size=(\d+)\]([\s\S]*?)\[\/size\]/gi,
      '<span style="font-size:$1px;line-height:1.4">$2</span>',
    )
    .replace(
      /\[center\]([\s\S]*?)\[\/center\]/gi,
      '<div style="text-align:center">$1</div>',
    )
    .replace(
      /\[right\]([\s\S]*?)\[\/right\]/gi,
      '<div style="text-align:right">$1</div>',
    )
    .replace(
      /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
      '<a href="$1" target="_blank" style="color:#E25528">$2</a>',
    )
    .replace(
      /\[url\]([\s\S]*?)\[\/url\]/gi,
      '<a href="$1" target="_blank" style="color:#E25528">$1</a>',
    )
    .replace(
      /\[img\]([\s\S]*?)\[\/img\]/gi,
      '<img src="$1" style="max-width:100%;border-radius:4px">',
    )
    .replace(
      /\[hr\]/gi,
      '<hr style="border-color:rgba(255,255,255,0.1)">',
    )
    .replace(
      /\[spoiler=([\s\S]*?)\]([\s\S]*?)\[\/spoiler\]/gi,
      '<details><summary>$1</summary>$2</details>',
    )
    .replace(
      /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi,
      '<details><summary>Spoiler</summary>$1</details>',
    )
    .replace(
      /\{([^}]+)\}/g,
      '<mark class="bb-unfilled">{$1}</mark>',
    )
  return h
}

function extractPlaceholders(content) {
  const matches = content.matchAll(/\{([^}]+)\}/g)
  const seen = new Set()
  const result = []
  for (const m of matches) {
    const key = m[1].trim()
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(key)
    }
  }
  return result
}

function applyBBCode(textarea, open, close) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selected = value.slice(start, end)
  const newValue =
    value.slice(0, start) + open + selected + close + value.slice(end)
  return {
    newValue,
    newStart: start + open.length,
    newEnd: end + open.length,
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// --- BBCode Toolbar ---------------------------------------------------------

function BBToolbar({ textareaRef, onChange }) {
  const [colorOpen, setColorOpen] = useState(false)
  const [sizeOpen, setSizeOpen] = useState(false)
  const colorRef = useRef(null)
  const sizeRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (colorRef.current && !colorRef.current.contains(e.target)) {
        setColorOpen(false)
      }
      if (sizeRef.current && !sizeRef.current.contains(e.target)) {
        setSizeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function wrap(open, close) {
    const ta = textareaRef.current
    if (!ta) return
    const { newValue, newStart, newEnd } = applyBBCode(ta, open, close)
    onChange(newValue)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newStart, newEnd)
    })
  }

  function insertAtCursor(text) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = ta.value
    const newValue = value.slice(0, start) + text + value.slice(end)
    onChange(newValue)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + text.length, start + text.length)
    })
  }

  function insertVar() {
    const name = window.prompt('Nom du champ (ex: nom_patient) :')
    if (name && name.trim()) {
      insertAtCursor(`{${name.trim()}}`)
    }
  }

  return (
    <div className="bb-toolbar">
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Gras"
        onClick={() => wrap('[b]', '[/b]')}
      >
        <Bold size={13} /> B
      </button>
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Italique"
        onClick={() => wrap('[i]', '[/i]')}
      >
        <Italic size={13} /> I
      </button>
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Souligné"
        onClick={() => wrap('[u]', '[/u]')}
      >
        <Underline size={13} /> U
      </button>
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Barré"
        onClick={() => wrap('[s]', '[/s]')}
      >
        <Strikethrough size={13} /> S
      </button>

      <span className="bb-toolbar-sep" />

      {/* Color picker */}
      <div style={{ position: 'relative' }} ref={colorRef}>
        <button
          type="button"
          className="bb-toolbar-btn"
          title="Couleur"
          onClick={() => {
            setColorOpen((v) => !v)
            setSizeOpen(false)
          }}
        >
          <Palette size={13} /> Couleur
        </button>
        {colorOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 100,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 8px',
              display: 'flex',
              gap: 4,
              marginTop: 2,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {TOOLBAR_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => {
                  wrap(`[color=${c.value}]`, '[/color]')
                  setColorOpen(false)
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: c.value,
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Size picker */}
      <div style={{ position: 'relative' }} ref={sizeRef}>
        <button
          type="button"
          className="bb-toolbar-btn"
          title="Taille"
          onClick={() => {
            setSizeOpen((v) => !v)
            setColorOpen(false)
          }}
        >
          <Type size={13} /> Taille <ChevronDown size={10} />
        </button>
        {sizeOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 100,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '4px 0',
              minWidth: 70,
              marginTop: 2,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {TOOLBAR_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  wrap(`[size=${s}]`, '[/size]')
                  setSizeOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '4px 12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--white)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {s}px
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="bb-toolbar-sep" />

      <button
        type="button"
        className="bb-toolbar-btn"
        title="Centrer"
        onClick={() => wrap('[center]', '[/center]')}
      >
        <AlignCenter size={13} /> Centre
      </button>
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Aligner à droite"
        onClick={() => wrap('[right]', '[/right]')}
      >
        <AlignRight size={13} /> Droite
      </button>
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Ligne horizontale"
        onClick={() => insertAtCursor('[hr]')}
      >
        <Minus size={13} /> HR
      </button>

      <span className="bb-toolbar-sep" />

      <button
        type="button"
        className="bb-toolbar-btn"
        title="Lien URL"
        onClick={() => {
          const url = window.prompt('URL :')
          if (url) wrap(`[url=${url}]`, '[/url]')
        }}
      >
        <Link size={13} /> URL
      </button>
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Image"
        onClick={() => wrap('[img]', '[/img]')}
      >
        <Image size={13} /> IMG
      </button>
      <button
        type="button"
        className="bb-toolbar-btn"
        title="Spoiler"
        onClick={() => {
          const label = window.prompt('Titre du spoiler (optionnel) :') || ''
          if (label) {
            wrap(`[spoiler=${label}]`, '[/spoiler]')
          } else {
            wrap('[spoiler]', '[/spoiler]')
          }
        }}
      >
        Spoiler
      </button>

      <span className="bb-toolbar-sep" />

      <button
        type="button"
        className="bb-toolbar-btn"
        title="Insérer une variable"
        onClick={insertVar}
        style={{ color: 'var(--orange)', fontWeight: 700 }}
      >
        {'{}'} Var
      </button>
    </div>
  )
}

// --- Template Card (sidebar) ------------------------------------------------

function TemplateCard({ template, selected, onSelect, onEdit, onDelete, showActions }) {
  return (
    <div
      className={`bb-tpl-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect(template)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(template)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <span className="bb-tpl-title">{template.title}</span>
        {showActions && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              className="bb-icon-btn"
              title="Modifier"
              onClick={(e) => { e.stopPropagation(); onEdit(template) }}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              className="bb-icon-btn bb-icon-btn--danger"
              title="Supprimer"
              onClick={(e) => { e.stopPropagation(); onDelete(template) }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
      <span className="bb-tpl-badge">{template.category}</span>
      {template.description && (
        <p className="bb-tpl-desc">{template.description}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template Filler (Utiliser tab right panel)
// ---------------------------------------------------------------------------

function TemplateFiller({ template }) {
  const [values, setValues] = useState(() => {
    const init = {}
    ;(template.fields || []).forEach((f) => { init[f.id] = '' })
    return init
  })
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)

  // When template changes, reset values
  useEffect(() => {
    const init = {}
    ;(template.fields || []).forEach((f) => { init[f.id] = '' })
    setValues(init)
    setShowRaw(false)
    setCopied(false)
  }, [template.id])

  const finalBBCode = useMemo(() => {
    let content = template.content || ''
    ;(template.fields || []).forEach((f) => {
      const val = values[f.id] || ''
      content = content.replace(new RegExp(`\\{${f.id}\\}`, 'g'), val)
    })
    return content
  }, [template, values])

  function handleChange(id, val) {
    setValues((prev) => ({ ...prev, [id]: val }))
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(finalBBCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = finalBBCode
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function renderField(field) {
    const sharedProps = {
      id: `fill-${field.id}`,
      className: 'bb-input',
      value: values[field.id] ?? '',
      onChange: (e) => handleChange(field.id, e.target.value),
    }

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...sharedProps}
            rows={4}
            style={{ resize: 'vertical' }}
          />
        )
      case 'date':
        return <input {...sharedProps} type="date" />
      case 'number':
        return <input {...sharedProps} type="number" />
      case 'select':
        // select treated as text input per spec
        return <input {...sharedProps} type="text" />
      default:
        return <input {...sharedProps} type="text" />
    }
  }

  return (
    <div className="bb-filler">
      <div className="bb-filler-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{template.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className="bb-tpl-badge">{template.category}</span>
            {template.description && (
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{template.description}</span>
            )}
          </div>
        </div>
      </div>

      {(template.fields || []).length > 0 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {(template.fields || []).map((field) => (
              <div key={field.id} className="bb-field-row">
                <label htmlFor={`fill-${field.id}`} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {field.label || field.id}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bb-preview-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {showRaw ? 'BBCode brut' : 'Aperçu rendu'}
          </span>
          <div className="bb-actions">
            <button
              type="button"
              className="bb-btn bb-btn--ghost"
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? <Eye size={14} /> : <EyeOff size={14} />}
              {showRaw ? 'Voir aperçu' : 'Voir BBCode brut'}
            </button>
            <button
              type="button"
              className="bb-btn bb-btn--primary"
              onClick={handleCopy}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copié !' : 'Copier le BBCode'}
            </button>
          </div>
        </div>

        {showRaw ? (
          <textarea
            className="bb-raw bb-input"
            value={finalBBCode}
            readOnly
            rows={16}
            style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        ) : (
          <div
            className="bb-preview"
            dangerouslySetInnerHTML={{ __html: bbcodeToHtml(finalBBCode) }}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template Editor (Gérer tab)
// ---------------------------------------------------------------------------

function TemplateEditor({ initial, onSave, onCancel }) {
  const isNew = !initial?.id

  const [title, setTitle] = useState(initial?.title || '')
  const [category, setCategory] = useState(initial?.category || CATEGORIES[0])
  const [description, setDescription] = useState(initial?.description || '')
  const [content, setContent] = useState(initial?.content || '')
  const [fieldMeta, setFieldMeta] = useState(() => {
    const meta = {}
    ;(initial?.fields || []).forEach((f) => {
      meta[f.id] = { label: f.label || f.id, type: f.type || 'text' }
    })
    return meta
  })
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)

  const detectedPlaceholders = useMemo(() => extractPlaceholders(content), [content])

  // Sync fieldMeta when placeholders change
  useEffect(() => {
    setFieldMeta((prev) => {
      const next = {}
      detectedPlaceholders.forEach((key) => {
        next[key] = prev[key] || { label: key, type: 'text' }
      })
      return next
    })
  }, [detectedPlaceholders.join(',')])

  function updateFieldMeta(key, prop, value) {
    setFieldMeta((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { label: key, type: 'text' }), [prop]: value },
    }))
  }

  async function handleSave() {
    if (!title.trim()) { setError('Le titre est requis.'); return }
    if (!content.trim()) { setError('Le contenu BBCode est requis.'); return }

    const fields = detectedPlaceholders.map((key) => ({
      id: key,
      label: fieldMeta[key]?.label || key,
      type: fieldMeta[key]?.type || 'text',
    }))

    const payload = {
      title: title.trim(),
      category,
      description: description.trim(),
      content,
      fields,
    }

    setSaving(true)
    setError(null)
    try {
      const url = isNew
        ? `${API_URL}/api/bbcode/templates`
        : `${API_URL}/api/bbcode/templates/${initial.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erreur ${res.status}`)
      }
      const data = await res.json()
      onSave(data.template || { ...payload, id: initial?.id || generateId() })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bb-editor">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          {isNew ? 'Nouveau template' : 'Modifier le template'}
        </h2>
        <div className="bb-actions">
          {!isNew && (
            <button type="button" className="bb-btn bb-btn--ghost" onClick={onCancel}>
              Annuler
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(226,85,40,0.15)', border: '1px solid var(--orange)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--orange)', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label className="bb-editor-label">Titre</label>
          <input
            type="text"
            className="bb-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du template"
          />
        </div>
        <div>
          <label className="bb-editor-label">Catégorie</label>
          <select
            className="bb-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label className="bb-editor-label">Description <span style={{ color: 'var(--muted)' }}>(optionnel)</span></label>
        <input
          type="text"
          className="bb-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brève description du template"
        />
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label className="bb-editor-label" style={{ margin: 0 }}>Contenu BBCode</label>
          <button
            type="button"
            className="bb-btn bb-btn--ghost"
            style={{ fontSize: 12, padding: '3px 10px' }}
            onClick={() => setShowPreview((v) => !v)}
          >
            <Eye size={13} style={{ marginRight: 4 }} />
            {showPreview ? 'Masquer aperçu' : 'Aperçu split'}
          </button>
        </div>
        <BBToolbar textareaRef={textareaRef} onChange={setContent} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 12 }}>
        <textarea
          ref={textareaRef}
          className="bb-editor-area bb-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          placeholder="Écris ton BBCode ici. Utilise {nom_champ} pour les variables."
          style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
        />
        {showPreview && (
          <div
            className="bb-preview"
            style={{ minHeight: 200 }}
            dangerouslySetInnerHTML={{ __html: bbcodeToHtml(content) }}
          />
        )}
      </div>

      {/* Detected fields */}
      {detectedPlaceholders.length > 0 && (
        <div className="bb-fields-detected">
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Champs détectés ({detectedPlaceholders.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {detectedPlaceholders.map((key) => {
              const meta = fieldMeta[key] || { label: key, type: 'text' }
              return (
                <div key={key} className="bb-field-config">
                  <span className="bb-field-chip">{'{'}  {key}  {'}'}</span>
                  <input
                    type="text"
                    className="bb-input"
                    value={meta.label}
                    onChange={(e) => updateFieldMeta(key, 'label', e.target.value)}
                    placeholder="Label affiché"
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <select
                    className="bb-input"
                    value={meta.type}
                    onChange={(e) => updateFieldMeta(key, 'type', e.target.value)}
                    style={{ width: 110 }}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bb-actions" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        {!isNew && (
          <button type="button" className="bb-btn bb-btn--ghost" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button
          type="button"
          className="bb-btn bb-btn--primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : isNew ? 'Créer le template' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BBCodePage() {
  const { user } = useAuth()
  const supervisor = isSupervisor(user)

  // Tab: 'use' | 'manage'
  const [activeTab, setActiveTab] = useState('use')

  // Common state
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  // Use tab state
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('Toutes')

  // Manage tab state
  const [editingTemplate, setEditingTemplate] = useState(null) // null = no editor, 'new' = new, template obj = editing
  const [manageSelected, setManageSelected] = useState(null)

  // Load templates
  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`${API_URL}/api/bbcode/templates`, { credentials: 'include' })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setTemplates(Array.isArray(data.templates) ? data.templates : [])
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filtered templates for left column
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
      const matchCat = filterCategory === 'Toutes' || t.category === filterCategory
      return matchSearch && matchCat
    })
  }, [templates, search, filterCategory])

  // Delete template
  async function handleDelete(template) {
    if (!window.confirm(`Supprimer le template "${template.title}" ?`)) return
    try {
      const res = await fetch(`${API_URL}/api/bbcode/templates/${template.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      setTemplates((prev) => prev.filter((t) => t.id !== template.id))
      if (manageSelected?.id === template.id) setManageSelected(null)
      if (editingTemplate?.id === template.id) setEditingTemplate(null)
      if (selectedTemplate?.id === template.id) setSelectedTemplate(null)
    } catch (err) {
      alert(`Erreur lors de la suppression : ${err.message}`)
    }
  }

  function handleSaved(template) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = template
        return next
      }
      return [template, ...prev]
    })
    setEditingTemplate(null)
    setManageSelected(template)
  }

  // Tab switch
  function switchTab(tab) {
    setActiveTab(tab)
    setSelectedTemplate(null)
    setEditingTemplate(null)
    setManageSelected(null)
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderSidebar(showActions) {
    return (
      <div className="bb-sidebar">
        {showActions && (
          <button
            type="button"
            className="bb-btn bb-btn--primary"
            style={{ width: '100%', marginBottom: 12 }}
            onClick={() => {
              setEditingTemplate('new')
              setManageSelected(null)
            }}
          >
            <Plus size={15} /> Nouveau template
          </button>
        )}

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            className="bb-search bb-input"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>

        <div className="bb-cat-filter">
          {['Toutes', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`bb-cat-pill${filterCategory === cat ? ' active' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="bb-tpl-list">
          {loading && (
            <div className="bb-empty" style={{ padding: '20px 12px', fontSize: 13 }}>
              Chargement...
            </div>
          )}
          {!loading && fetchError && (
            <div className="bb-empty" style={{ padding: '20px 12px', fontSize: 13, color: 'var(--orange)' }}>
              Erreur : {fetchError}
              <br />
              <button type="button" className="bb-btn bb-btn--ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={loadTemplates}>
                Réessayer
              </button>
            </div>
          )}
          {!loading && !fetchError && filteredTemplates.length === 0 && (
            <div className="bb-empty" style={{ padding: '20px 12px', fontSize: 13, color: 'var(--muted)' }}>
              Aucun template trouvé.
            </div>
          )}
          {!loading && !fetchError && filteredTemplates.map((t) => {
            const isSelected = showActions
              ? manageSelected?.id === t.id || editingTemplate?.id === t.id
              : selectedTemplate?.id === t.id
            return (
              <TemplateCard
                key={t.id}
                template={t}
                selected={isSelected}
                showActions={showActions}
                onSelect={(tpl) => {
                  if (showActions) {
                    setManageSelected(tpl)
                    setEditingTemplate(null)
                  } else {
                    setSelectedTemplate(tpl)
                  }
                }}
                onEdit={(tpl) => {
                  setEditingTemplate(tpl)
                  setManageSelected(tpl)
                }}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      </div>
    )
  }

  function renderUseMain() {
    if (!selectedTemplate) {
      return (
        <div className="bb-empty">
          <FileText size={48} style={{ color: 'var(--muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            Sélectionne un template pour commencer
          </p>
        </div>
      )
    }
    return <TemplateFiller key={selectedTemplate.id} template={selectedTemplate} />
  }

  function renderManageMain() {
    if (editingTemplate === 'new') {
      return (
        <TemplateEditor
          initial={null}
          onSave={handleSaved}
          onCancel={() => setEditingTemplate(null)}
        />
      )
    }
    if (editingTemplate && editingTemplate !== 'new') {
      return (
        <TemplateEditor
          key={editingTemplate.id}
          initial={editingTemplate}
          onSave={handleSaved}
          onCancel={() => { setEditingTemplate(null) }}
        />
      )
    }
    return (
      <div className="bb-empty">
        <Settings2 size={48} style={{ color: 'var(--muted)', marginBottom: 12 }} />
        <p style={{ color: 'var(--muted)', fontSize: 15 }}>
          Sélectionne un template à modifier ou crée-en un nouveau.
        </p>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <Layout title="BBCode / Rapports">
      <div className="bbcode-page">
        {/* Tabs */}
        <div className="bbcode-tabs">
          <button
            type="button"
            className={`bbcode-tab${activeTab === 'use' ? ' active' : ''}`}
            onClick={() => switchTab('use')}
          >
            <FileText size={15} /> Utiliser
          </button>
          {supervisor && (
            <button
              type="button"
              className={`bbcode-tab${activeTab === 'manage' ? ' active' : ''}`}
              onClick={() => switchTab('manage')}
            >
              <Settings2 size={15} /> Gérer
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="bbcode-grid">
          {activeTab === 'use' && (
            <>
              {renderSidebar(false)}
              <div className="bb-main">{renderUseMain()}</div>
            </>
          )}
          {activeTab === 'manage' && supervisor && (
            <>
              {renderSidebar(true)}
              <div className="bb-main">{renderManageMain()}</div>
            </>
          )}
        </div>
      </div>

      {/* Inline styles (scoped, no external CSS dependency beyond index.css classes) */}
      <style>{`
        /* ---- Layout ---- */
        .bbcode-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .bbcode-tabs {
          display: flex;
          gap: 4px;
          padding: 0 0 0 0;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0;
          background: var(--surface);
          padding: 8px 16px 0;
        }
        .bbcode-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          background: none;
          border: none;
          border-radius: 6px 6px 0 0;
          color: var(--muted);
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
          font-weight: 500;
        }
        .bbcode-tab:hover {
          color: var(--white);
        }
        .bbcode-tab.active {
          color: var(--white);
          border-bottom-color: var(--orange);
          font-weight: 600;
        }
        .bbcode-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* ---- Sidebar ---- */
        .bb-sidebar {
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 14px 12px;
          gap: 0;
        }
        .bb-search {
          width: 100%;
          box-sizing: border-box;
        }
        .bb-cat-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin: 8px 0;
        }
        .bb-cat-pill {
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-size: 11px;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
          white-space: nowrap;
        }
        .bb-cat-pill:hover {
          border-color: var(--orange);
          color: var(--white);
        }
        .bb-cat-pill.active {
          background: var(--orange);
          border-color: var(--orange);
          color: #fff;
          font-weight: 600;
        }
        .bb-tpl-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-right: 2px;
          margin-top: 4px;
        }
        .bb-tpl-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
          user-select: none;
        }
        .bb-tpl-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(226,85,40,0.4);
        }
        .bb-tpl-card.selected {
          background: rgba(226,85,40,0.08);
          border-color: var(--orange);
        }
        .bb-tpl-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--white);
          display: block;
          margin-bottom: 4px;
        }
        .bb-tpl-badge {
          display: inline-block;
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 999px;
          background: rgba(226,85,40,0.15);
          color: var(--orange);
          border: 1px solid rgba(226,85,40,0.3);
          font-weight: 600;
          margin-bottom: 4px;
        }
        .bb-tpl-desc {
          font-size: 11px;
          color: var(--muted);
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .bb-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 5px;
          background: rgba(255,255,255,0.06);
          color: var(--muted);
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
          padding: 0;
        }
        .bb-icon-btn:hover {
          background: rgba(255,255,255,0.12);
          color: var(--white);
        }
        .bb-icon-btn--danger:hover {
          background: rgba(226,85,40,0.2);
          color: var(--orange);
        }

        /* ---- Main area ---- */
        .bb-main {
          overflow-y: auto;
          min-height: 0;
        }
        .bb-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 300px;
          color: var(--muted);
          gap: 4px;
          text-align: center;
          padding: 32px;
        }

        /* ---- Filler ---- */
        .bb-filler {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .bb-filler-header {
          padding: 16px 20px 14px;
          border-bottom: 1px solid var(--border);
        }
        .bb-field-row {
          display: flex;
          flex-direction: column;
        }
        .bb-preview-wrap {
          flex: 1;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
        }
        .bb-preview {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          color: var(--white);
          font-size: 14px;
          line-height: 1.7;
          overflow-y: auto;
          min-height: 200px;
        }
        .bb-preview mark.bb-unfilled {
          background: rgba(226,85,40,0.25);
          color: var(--orange);
          border-radius: 3px;
          padding: 0 3px;
          font-style: italic;
        }
        .bb-raw {
          width: 100%;
          box-sizing: border-box;
          min-height: 200px;
        }
        .bb-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* ---- Shared Buttons ---- */
        .bb-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 7px;
          font-size: 13px;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.13s, border-color 0.13s, color 0.13s;
          white-space: nowrap;
        }
        .bb-btn--primary {
          background: var(--orange);
          color: #fff;
          border-color: var(--orange);
        }
        .bb-btn--primary:hover:not(:disabled) {
          background: #c9481f;
          border-color: #c9481f;
        }
        .bb-btn--primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .bb-btn--ghost {
          background: rgba(255,255,255,0.06);
          color: var(--white);
          border-color: var(--border);
        }
        .bb-btn--ghost:hover {
          background: rgba(255,255,255,0.11);
        }

        /* ---- Shared Input ---- */
        .bb-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: 7px;
          color: var(--white);
          font-size: 13px;
          font-family: inherit;
          padding: 7px 10px;
          transition: border-color 0.13s;
          width: 100%;
          box-sizing: border-box;
          outline: none;
        }
        .bb-input:focus {
          border-color: var(--orange);
        }
        .bb-input::placeholder {
          color: var(--muted);
        }
        select.bb-input option {
          background: #0d2240;
          color: #fff;
        }

        /* ---- Editor ---- */
        .bb-editor {
          padding: 20px;
          height: 100%;
          box-sizing: border-box;
          overflow-y: auto;
        }
        .bb-editor-label {
          display: block;
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .bb-editor-area {
          width: 100%;
          min-height: 300px;
          box-sizing: border-box;
        }

        /* ---- Toolbar ---- */
        .bb-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-bottom: none;
          border-radius: 7px 7px 0 0;
          padding: 5px 6px;
          align-items: center;
        }
        .bb-toolbar + .bb-editor-area,
        .bb-toolbar + .bb-input {
          border-radius: 0 0 7px 7px;
        }
        .bb-toolbar-btn {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          height: 26px;
          padding: 0 7px;
          border: none;
          border-radius: 5px;
          background: transparent;
          color: var(--muted);
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.11s, color 0.11s;
        }
        .bb-toolbar-btn:hover {
          background: rgba(255,255,255,0.1);
          color: var(--white);
        }
        .bb-toolbar-sep {
          width: 1px;
          height: 18px;
          background: var(--border);
          margin: 0 3px;
          flex-shrink: 0;
        }

        /* ---- Fields detected ---- */
        .bb-fields-detected {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 8px;
        }
        .bb-field-chip {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(226,85,40,0.12);
          color: var(--orange);
          border: 1px solid rgba(226,85,40,0.3);
          font-size: 11px;
          font-family: monospace;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .bb-field-config {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* ---- Scrollbar ---- */
        .bb-tpl-list::-webkit-scrollbar,
        .bb-main::-webkit-scrollbar,
        .bb-editor::-webkit-scrollbar {
          width: 5px;
        }
        .bb-tpl-list::-webkit-scrollbar-track,
        .bb-main::-webkit-scrollbar-track,
        .bb-editor::-webkit-scrollbar-track {
          background: transparent;
        }
        .bb-tpl-list::-webkit-scrollbar-thumb,
        .bb-main::-webkit-scrollbar-thumb,
        .bb-editor::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 3px;
        }
      `}</style>
    </Layout>
  )
}
