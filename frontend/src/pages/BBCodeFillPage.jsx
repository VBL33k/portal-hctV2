import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from '../components/Layout.jsx'

const API = import.meta.env.VITE_API_URL || ''

// ---------------------------------------------------------------------------
// Skeleton loader for category cards
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div className="fill-cat-card fill-cat-card--skeleton">
      <div className="fill-skeleton fill-skeleton--icon" />
      <div className="fill-skeleton fill-skeleton--label" />
      <div className="fill-skeleton fill-skeleton--count" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Category grid
// ---------------------------------------------------------------------------
function CategoryStep({ categories, loading, onSelect }) {
  return (
    <div className="fill-page">
      <div className="fill-hero">
        <h1 className="fill-hero-title">Choisissez une spécialité</h1>
        <p className="fill-hero-subtitle">
          Sélectionne ta spécialité pour accéder aux templates disponibles
        </p>
      </div>

      <div className="fill-cat-grid">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : categories.map(cat => (
              <button
                key={cat.id}
                className={`fill-cat-card${cat.count === 0 ? ' fill-cat-card--empty' : ''}`}
                onClick={() => onSelect(cat)}
                type="button"
              >
                {cat.icon ? (
                  <img
                    src={cat.icon}
                    alt={cat.label}
                    className="fill-cat-icon"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="fill-cat-icon fill-cat-icon--fallback">
                    <FileText size={40} />
                  </div>
                )}
                <span className="fill-cat-label">{cat.label}</span>
                <span className="fill-cat-count">
                  {cat.count} template{cat.count !== 1 ? 's' : ''}
                </span>
              </button>
            ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Template list
// ---------------------------------------------------------------------------
function TemplatesStep({ category, templates, loading, onSelect, onBack }) {
  return (
    <div className="fill-page">
      <div className="fill-breadcrumb">
        <button className="fill-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          Retour
        </button>
        <span className="fill-breadcrumb-sep">/</span>
        <span className="fill-breadcrumb-item fill-breadcrumb-item--muted">Spécialités</span>
        <span className="fill-breadcrumb-sep">/</span>
        <span className="fill-breadcrumb-item">{category.label}</span>
      </div>

      <div className="fill-cat-header">
        {category.icon && (
          <img
            src={category.icon}
            alt={category.label}
            className="fill-cat-header-icon"
            onError={e => { e.target.style.display = 'none' }}
          />
        )}
        <h2 className="fill-cat-header-name">{category.label}</h2>
      </div>

      {loading ? (
        <div className="fill-loading-state">
          <Loader2 size={32} className="fill-spinner" />
          <span>Chargement des templates…</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="fill-empty-state">
          <FileText size={48} opacity={0.3} />
          <p>Aucun template disponible dans cette spécialité.</p>
        </div>
      ) : (
        <div className="fill-tpl-list">
          {templates.map(tpl => {
            const fieldCount = (tpl.sections || []).reduce(
              (acc, s) => acc + (s.fields || []).length,
              0
            )
            return (
              <button
                key={tpl.id}
                className="fill-tpl-card"
                onClick={() => onSelect(tpl)}
                type="button"
              >
                <div className="fill-tpl-card-body">
                  <div className="fill-tpl-card-title">{tpl.title}</div>
                  {tpl.description && (
                    <div className="fill-tpl-card-desc">{tpl.description}</div>
                  )}
                  <div className="fill-tpl-card-meta">
                    <span className="fill-tpl-meta-item">
                      <FileText size={13} />
                      {fieldCount} champ{fieldCount !== 1 ? 's' : ''} à remplir
                    </span>
                    {tpl.createdByName && (
                      <span className="fill-tpl-meta-item">
                        Créé par {tpl.createdByName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="fill-tpl-card-arrow">
                  <ChevronRight size={22} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Fill form
// ---------------------------------------------------------------------------
function FillStep({ category, template, values, onChange, onSubmit, onBack, submitting, error }) {
  function renderField(section, field) {
    const key = `${section.id}.${field.id}`

    if (field.type === 'datetime') {
      const dateKey = `${key}__date`
      const timeKey = `${key}__time`
      return (
        <div className="fill-datetime-row">
          <input
            type="date"
            className="fill-input"
            value={values[dateKey] || ''}
            onChange={e => onChange(dateKey, e.target.value)}
          />
          <input
            type="time"
            className="fill-input"
            value={values[timeKey] || ''}
            onChange={e => onChange(timeKey, e.target.value)}
          />
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          className="fill-input fill-textarea"
          rows={3}
          placeholder={field.placeholder || ''}
          value={values[key] || ''}
          onChange={e => onChange(key, e.target.value)}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <select
          className="fill-input fill-select"
          value={values[key] || ''}
          onChange={e => onChange(key, e.target.value)}
        >
          <option value="">-- Sélectionner --</option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={field.type || 'text'}
        className="fill-input"
        placeholder={field.placeholder || ''}
        value={values[key] || ''}
        onChange={e => onChange(key, e.target.value)}
      />
    )
  }

  const totalFields = (template.sections || []).reduce(
    (acc, s) => acc + (s.fields || []).length, 0
  )

  return (
    <div className="fill-page fill-page--form">
      <div className="fill-breadcrumb">
        <button className="fill-back-btn" onClick={onBack} type="button">
          <ArrowLeft size={16} />
          Retour
        </button>
        <span className="fill-breadcrumb-sep">/</span>
        <span className="fill-breadcrumb-item fill-breadcrumb-item--muted">Spécialités</span>
        <span className="fill-breadcrumb-sep">/</span>
        <span className="fill-breadcrumb-item fill-breadcrumb-item--muted">{category.label}</span>
        <span className="fill-breadcrumb-sep">/</span>
        <span className="fill-breadcrumb-item">{template.title}</span>
      </div>

      <div className="fill-tpl-header">
        <h2 className="fill-tpl-header-title">{template.title}</h2>
        <span className="fill-tpl-header-badge">{category.label}</span>
      </div>

      {template.description && (
        <p className="fill-tpl-header-desc">{template.description}</p>
      )}

      <form
        className="fill-form"
        onSubmit={e => { e.preventDefault(); onSubmit() }}
      >
        {(template.sections || []).map(section => (
          <div key={section.id} className="fill-section">
            <div className="fill-section-header">
              <span className="fill-section-title">{section.label}</span>
            </div>
            {section.description && (
              <p className="fill-section-desc">{section.description}</p>
            )}
            <div className="fill-section-fields">
              {(section.fields || []).map(field => (
                <div key={field.id} className="fill-field">
                  <label className="fill-field-label">
                    {field.label}
                    {field.required && <span className="fill-required"> *</span>}
                  </label>
                  {renderField(section, field)}
                  {field.helpText && (
                    <span className="fill-help">{field.helpText}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {error && (
          <div className="fill-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="fill-action-bar">
          <div className="fill-action-bar-inner">
            <span className="fill-action-bar-info">
              {totalFields} champ{totalFields !== 1 ? 's' : ''} au total
            </span>
            <button
              type="submit"
              className="fill-btn fill-btn--primary fill-btn--large"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="fill-spinner" />
                  Génération…
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Générer le BBCode
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Result
// ---------------------------------------------------------------------------
function ResultStep({ category, template, result, onRestart }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = result
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [result])

  return (
    <div className="fill-page">
      <div className="fill-result-header">
        <div className="fill-result-badge-row">
          <span className="fill-result-check">BBCode généré</span>
          <Check size={20} className="fill-result-check-icon" />
        </div>
        <h2 className="fill-result-title">{template.title}</h2>
        <span className="fill-tpl-header-badge">{category.label}</span>
      </div>

      <div className="fill-result">
        <div className="fill-result-toolbar">
          <span className="fill-result-toolbar-label">Résultat</span>
          <button
            className={`fill-btn ${copied ? 'fill-btn--success' : 'fill-btn--primary'}`}
            onClick={handleCopy}
            type="button"
          >
            {copied ? (
              <>
                <Check size={16} />
                Copié !
              </>
            ) : (
              <>
                <Copy size={16} />
                Copier le BBCode
              </>
            )}
          </button>
        </div>

        <textarea
          className="fill-result-box"
          readOnly
          value={result}
          spellCheck={false}
        />
      </div>

      <div className="fill-result-actions">
        <button
          className="fill-btn fill-btn--ghost"
          onClick={onRestart}
          type="button"
        >
          <RotateCcw size={16} />
          Remplir un autre rapport
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function BBCodeFillPage() {
  const { user } = useAuth()

  const [step, setStep] = useState('categories')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [values, setValues] = useState({})
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  // Load categories on mount
  useEffect(() => {
    async function fetchCategories() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API}/api/bbcode/categories`, { credentials: 'include' })
        if (!res.ok) throw new Error('Erreur lors du chargement des spécialités')
        const data = await res.json()
        setCategories(data.categories || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  // Select category → fetch templates
  async function handleSelectCategory(cat) {
    setSelectedCategory(cat)
    setStep('templates')
    setLoading(true)
    setError(null)
    setTemplates([])
    try {
      const res = await fetch(
        `${API}/api/bbcode/templates?categoryId=${encodeURIComponent(cat.id)}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Erreur lors du chargement des templates')
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Select template → fetch full details
  async function handleSelectTemplate(tpl) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/bbcode/templates/${tpl.id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Erreur lors du chargement du template')
      const data = await res.json()
      const full = data.template || data

      // Pre-fill default values
      const initialValues = {}
      for (const section of full.sections || []) {
        for (const field of section.fields || []) {
          const key = `${section.id}.${field.id}`
          if (field.defaultValue !== undefined && field.defaultValue !== null) {
            if (field.type === 'datetime') {
              const iso = String(field.defaultValue)
              const [datePart, timePart] = iso.split('T')
              if (datePart) initialValues[`${key}__date`] = datePart
              if (timePart) initialValues[`${key}__time`] = timePart.slice(0, 5)
            } else {
              initialValues[key] = String(field.defaultValue)
            }
          }
        }
      }

      setSelectedTemplate(full)
      setValues(initialValues)
      setStep('fill')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleFieldChange(key, value) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  // Build render values (combine datetime parts)
  function buildRenderValues() {
    const out = {}
    const datetimeKeys = new Set()

    for (const section of selectedTemplate.sections || []) {
      for (const field of section.fields || []) {
        const key = `${section.id}.${field.id}`
        if (field.type === 'datetime') {
          datetimeKeys.add(key)
          const datePart = values[`${key}__date`] || ''
          const timePart = values[`${key}__time`] || ''
          out[key] = datePart && timePart ? `${datePart}T${timePart}` : datePart || timePart
        } else {
          out[key] = values[key] || ''
        }
      }
    }
    return out
  }

  // Validate required fields
  function validateRequired() {
    const missing = []
    for (const section of selectedTemplate.sections || []) {
      for (const field of section.fields || []) {
        if (!field.required) continue
        const key = `${section.id}.${field.id}`
        const val =
          field.type === 'datetime'
            ? values[`${key}__date`] || values[`${key}__time`]
            : values[key]
        if (!val || String(val).trim() === '') {
          missing.push(field.label)
        }
      }
    }
    return missing
  }

  async function handleSubmit() {
    setError(null)
    const missing = validateRequired()
    if (missing.length > 0) {
      setError(`Champs requis manquants : ${missing.join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const renderValues = buildRenderValues()
      const res = await fetch(`${API}/api/bbcode/templates/${selectedTemplate.id}/render`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: renderValues }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || body.error || `Erreur ${res.status}`)
      }

      const data = await res.json()
      setResult(data.bbcode || '')
      setStep('result')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleRestart() {
    setStep('categories')
    setSelectedCategory(null)
    setTemplates([])
    setSelectedTemplate(null)
    setValues({})
    setResult('')
    setError(null)
  }

  function handleBackToCategories() {
    setStep('categories')
    setSelectedCategory(null)
    setTemplates([])
    setError(null)
  }

  function handleBackToTemplates() {
    setStep('templates')
    setSelectedTemplate(null)
    setValues({})
    setError(null)
  }

  return (
    <Layout title="BBCode">
      <style>{`
        /* ── Page wrapper ──────────────────────────────────────────────────── */
        .fill-page {
          width: 100%;
          padding: 0 0 120px;
        }
        .fill-page--form {
          /* no max-width — uses full available space */
        }

        /* ── Hero (step 1) ─────────────────────────────────────────────────── */
        .fill-hero {
          margin-bottom: 36px;
          text-align: center;
        }
        .fill-hero-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--white);
          margin: 0 0 10px;
          font-family: Cairo, sans-serif;
        }
        .fill-hero-subtitle {
          font-size: 1rem;
          color: var(--muted);
          margin: 0;
          font-family: Cairo, sans-serif;
        }

        /* ── Category grid ─────────────────────────────────────────────────── */
        .fill-cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
          gap: 18px;
        }

        .fill-cat-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 14px;
          padding: 28px 18px 22px;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
          font-family: Cairo, sans-serif;
          color: var(--white);
          text-align: center;
        }
        .fill-cat-card:hover {
          transform: translateY(-4px);
          border-color: var(--orange, #E25528);
          box-shadow: 0 0 0 2px rgba(226,85,40,0.18), 0 8px 24px rgba(0,0,0,0.35);
        }
        .fill-cat-card--empty {
          opacity: 0.55;
        }
        .fill-cat-card--skeleton {
          pointer-events: none;
          cursor: default;
        }

        .fill-cat-icon {
          width: 80px;
          height: 80px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .fill-cat-icon--fallback {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--muted);
        }
        .fill-cat-label {
          font-size: 0.97rem;
          font-weight: 600;
          color: var(--white);
          line-height: 1.3;
        }
        .fill-cat-count {
          font-size: 0.78rem;
          color: var(--muted);
          background: rgba(255,255,255,0.07);
          padding: 2px 10px;
          border-radius: 20px;
        }

        /* ── Skeleton animations ───────────────────────────────────────────── */
        @keyframes fillShimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .fill-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 800px 100%;
          animation: fillShimmer 1.5s infinite linear;
          border-radius: 8px;
        }
        .fill-skeleton--icon  { width: 80px; height: 80px; border-radius: 12px; }
        .fill-skeleton--label { width: 80%; height: 16px; }
        .fill-skeleton--count { width: 50%; height: 12px; border-radius: 20px; }

        /* ── Breadcrumb & back button ───────────────────────────────────────── */
        .fill-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .fill-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 8px;
          color: var(--white);
          font-family: Cairo, sans-serif;
          font-size: 0.85rem;
          padding: 5px 12px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .fill-back-btn:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.18);
        }
        .fill-breadcrumb-sep {
          color: var(--muted);
          font-size: 0.9rem;
        }
        .fill-breadcrumb-item {
          font-size: 0.88rem;
          color: var(--white);
          font-family: Cairo, sans-serif;
          font-weight: 600;
        }
        .fill-breadcrumb-item--muted {
          color: var(--muted);
          font-weight: 400;
        }

        /* ── Category header (step 2) ──────────────────────────────────────── */
        .fill-cat-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
        }
        .fill-cat-header-icon {
          width: 48px;
          height: 48px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .fill-cat-header-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--white);
          margin: 0;
          font-family: Cairo, sans-serif;
        }

        /* ── Template list ─────────────────────────────────────────────────── */
        .fill-tpl-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .fill-tpl-card {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.025);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 12px;
          padding: 20px 22px;
          cursor: pointer;
          transition: border-color 0.18s, transform 0.15s, box-shadow 0.18s;
          text-align: left;
          width: 100%;
          color: var(--white);
          font-family: Cairo, sans-serif;
          gap: 16px;
        }
        .fill-tpl-card:hover {
          border-color: var(--orange, #E25528);
          transform: translateX(4px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
        }
        .fill-tpl-card:hover .fill-tpl-card-arrow {
          color: var(--orange, #E25528);
          transform: translateX(4px);
        }
        .fill-tpl-card-body {
          flex: 1;
          min-width: 0;
        }
        .fill-tpl-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--white);
          margin-bottom: 6px;
        }
        .fill-tpl-card-desc {
          font-size: 0.88rem;
          color: var(--muted);
          margin-bottom: 10px;
          line-height: 1.5;
        }
        .fill-tpl-card-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .fill-tpl-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.8rem;
          color: var(--muted);
        }
        .fill-tpl-card-arrow {
          flex-shrink: 0;
          color: var(--muted);
          transition: color 0.15s, transform 0.18s;
        }

        /* ── Template form header ──────────────────────────────────────────── */
        .fill-tpl-header {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }
        .fill-tpl-header-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--white);
          margin: 0;
          font-family: Cairo, sans-serif;
        }
        .fill-tpl-header-badge {
          background: rgba(226,85,40,0.15);
          border: 1px solid rgba(226,85,40,0.3);
          color: var(--orange, #E25528);
          font-size: 0.78rem;
          font-weight: 600;
          border-radius: 20px;
          padding: 3px 12px;
          font-family: Cairo, sans-serif;
          white-space: nowrap;
        }
        .fill-tpl-header-desc {
          font-size: 0.9rem;
          color: var(--muted);
          margin: 0 0 28px;
          font-family: Cairo, sans-serif;
          line-height: 1.6;
        }

        /* ── Form & sections ───────────────────────────────────────────────── */
        .fill-form {
          margin-top: 24px;
        }
        .fill-section {
          background: rgba(255,255,255,0.025);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 18px;
        }
        .fill-section-header {
          padding-left: 12px;
          border-left: 3px solid var(--orange, #E25528);
          margin-bottom: 16px;
        }
        .fill-section-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--white);
          font-family: Cairo, sans-serif;
        }
        .fill-section-desc {
          font-size: 0.85rem;
          color: var(--muted);
          font-style: italic;
          margin: 0 0 18px;
          font-family: Cairo, sans-serif;
          line-height: 1.5;
        }
        .fill-section-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Fields ────────────────────────────────────────────────────────── */
        .fill-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fill-field-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--white);
          font-family: Cairo, sans-serif;
        }
        .fill-required {
          color: #e05c5c;
        }
        .fill-help {
          font-size: 0.78rem;
          color: var(--muted);
          font-family: Cairo, sans-serif;
          line-height: 1.4;
        }

        /* ── Inputs ────────────────────────────────────────────────────────── */
        .fill-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 8px;
          color: var(--white, #F4F6F9);
          padding: 10px 12px;
          font-family: Cairo, sans-serif;
          font-size: 0.92rem;
          width: 100%;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none;
          -webkit-appearance: none;
        }
        .fill-input::placeholder {
          color: var(--muted, #8CA0B8);
        }
        .fill-input:focus {
          border-color: var(--orange, #E25528);
          box-shadow: 0 0 0 2px rgba(226,85,40,0.15);
        }
        .fill-textarea {
          resize: vertical;
          min-height: 80px;
        }
        .fill-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238CA0B8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }
        .fill-select option {
          background: #0D2240;
          color: #F4F6F9;
        }
        .fill-datetime-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        input[type="date"].fill-input,
        input[type="time"].fill-input,
        input[type="number"].fill-input {
          color-scheme: dark;
        }

        /* ── Error banner ──────────────────────────────────────────────────── */
        .fill-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(224,92,92,0.12);
          border: 1px solid rgba(224,92,92,0.3);
          border-radius: 8px;
          color: #e05c5c;
          padding: 12px 16px;
          font-size: 0.88rem;
          font-family: Cairo, sans-serif;
          margin-bottom: 16px;
        }

        /* ── Action bar ────────────────────────────────────────────────────── */
        .fill-action-bar {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(0deg, var(--bg, #0B1628) 70%, transparent 100%);
          padding: 20px 0 8px;
          margin-top: 24px;
          z-index: 10;
        }
        .fill-action-bar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: rgba(255,255,255,0.025);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 12px;
          padding: 14px 20px;
        }
        .fill-action-bar-info {
          font-size: 0.85rem;
          color: var(--muted);
          font-family: Cairo, sans-serif;
        }

        /* ── Buttons ───────────────────────────────────────────────────────── */
        .fill-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-family: Cairo, sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 9px 18px;
          transition: background 0.15s, opacity 0.15s, transform 0.12s;
          white-space: nowrap;
        }
        .fill-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none !important;
        }
        .fill-btn--primary {
          background: var(--orange, #E25528);
          color: #fff;
        }
        .fill-btn--primary:not(:disabled):hover {
          background: #c94b20;
          transform: translateY(-1px);
        }
        .fill-btn--large {
          font-size: 1rem;
          padding: 11px 24px;
        }
        .fill-btn--ghost {
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          color: var(--white);
        }
        .fill-btn--ghost:hover {
          background: rgba(255,255,255,0.11);
          transform: translateY(-1px);
        }
        .fill-btn--success {
          background: #27ae60;
          color: #fff;
        }

        /* ── Loading / empty states ────────────────────────────────────────── */
        .fill-loading-state,
        .fill-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 64px 24px;
          color: var(--muted);
          font-family: Cairo, sans-serif;
          font-size: 0.95rem;
        }
        @keyframes fillSpin {
          to { transform: rotate(360deg); }
        }
        .fill-spinner {
          animation: fillSpin 0.9s linear infinite;
          flex-shrink: 0;
        }

        /* ── Result step ───────────────────────────────────────────────────── */
        .fill-result-header {
          margin-bottom: 28px;
        }
        .fill-result-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .fill-result-check {
          font-size: 0.88rem;
          font-weight: 700;
          color: #27ae60;
          font-family: Cairo, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .fill-result-check-icon {
          color: #27ae60;
          flex-shrink: 0;
        }
        .fill-result-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--white);
          margin: 0 0 10px;
          font-family: Cairo, sans-serif;
        }
        .fill-result {
          background: rgba(255,255,255,0.025);
          border: 1px solid var(--border, rgba(255,255,255,0.08));
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .fill-result-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
          gap: 12px;
          flex-wrap: wrap;
        }
        .fill-result-toolbar-label {
          font-size: 0.82rem;
          color: var(--muted);
          font-family: Cairo, sans-serif;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .fill-result-box {
          display: block;
          width: 100%;
          min-height: 300px;
          background: rgba(0,0,0,0.25);
          border: none;
          color: var(--white, #F4F6F9);
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.88rem;
          line-height: 1.6;
          padding: 18px;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
        }
        .fill-result-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* ── Responsive ────────────────────────────────────────────────────── */
        @media (max-width: 640px) {
          .fill-cat-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }
          .fill-hero-title {
            font-size: 1.5rem;
          }
          .fill-datetime-row {
            grid-template-columns: 1fr;
          }
          .fill-action-bar-inner {
            flex-direction: column;
            align-items: stretch;
          }
          .fill-btn--large {
            width: 100%;
            justify-content: center;
          }
        }
        @media (min-width: 1100px) {
          .fill-cat-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>

      {step === 'categories' && (
        <CategoryStep
          categories={categories}
          loading={loading}
          onSelect={handleSelectCategory}
        />
      )}

      {step === 'templates' && selectedCategory && (
        <TemplatesStep
          category={selectedCategory}
          templates={templates}
          loading={loading}
          onSelect={handleSelectTemplate}
          onBack={handleBackToCategories}
        />
      )}

      {step === 'fill' && selectedTemplate && selectedCategory && (
        <FillStep
          category={selectedCategory}
          template={selectedTemplate}
          values={values}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onBack={handleBackToTemplates}
          submitting={submitting}
          error={error}
        />
      )}

      {step === 'result' && selectedTemplate && selectedCategory && (
        <ResultStep
          category={selectedCategory}
          template={selectedTemplate}
          result={result}
          onRestart={handleRestart}
        />
      )}
    </Layout>
  )
}
