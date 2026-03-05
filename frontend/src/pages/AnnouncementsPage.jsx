import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout.jsx'

const API = import.meta.env.VITE_API_URL || ''

// ─── Auto-refresh interval (60s) ──────────────────────────────────────────────
const REFRESH_INTERVAL = 60

// ─── Color palette for author accent colors ────────────────────────────────────
const ACCENT_PALETTE = [
  '#4e9bff', '#a78bfa', '#3ecf8e', '#fbbf24', '#f97316',
  '#ec4899', '#06b6d4', '#84cc16', '#ef4444', '#8b5cf6',
]

function authorAccentColor(userId) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length]
}

// ─── Discord Markdown Parser ───────────────────────────────────────────────────

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseDiscordMarkdown(text) {
  if (!text) return ''

  // Split into blocks (code blocks first — don't parse inside them)
  const codeBlockRe = /```(?:(\w+)\n)?([\s\S]*?)```/g
  const inlineCodeRe = /`([^`]+)`/g

  let result = ''
  let lastIndex = 0
  let match

  // Collect code block positions to exclude from inline parsing
  const blocks = []
  codeBlockRe.lastIndex = 0
  while ((match = codeBlockRe.exec(text)) !== null) {
    blocks.push({ start: match.index, end: match.index + match[0].length, raw: match[0], lang: match[1] || '', code: match[2] })
  }

  // Build output segment by segment
  let pos = 0
  for (const block of blocks) {
    if (pos < block.start) {
      result += parseInline(text.slice(pos, block.start))
    }
    result += `<pre class="ann-code-block"><code>${escapeHtml(block.code.trim())}</code></pre>`
    pos = block.end
  }
  if (pos < text.length) {
    result += parseInline(text.slice(pos))
  }

  return result
}

function parseInline(text) {
  // Line by line — handle blockquotes
  const lines = text.split('\n')
  let html = ''
  let inBlockquote = false

  for (const line of lines) {
    const bq = line.match(/^> ?(.*)/)
    if (bq) {
      if (!inBlockquote) { html += '<blockquote class="ann-blockquote">'; inBlockquote = true }
      html += parseSpans(bq[1]) + '<br>'
    } else {
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false }
      html += parseSpans(line) + '<br>'
    }
  }
  if (inBlockquote) html += '</blockquote>'

  // Remove trailing <br>
  html = html.replace(/<br>$/, '')
  return html
}

function parseSpans(text) {
  // Order matters: bold > italic > underline > strikethrough > inline code > custom emoji > url > mention
  let s = text

  // Inline code (preserve content)
  const codePieces = []
  s = s.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codePieces.length
    codePieces.push(`<code class="ann-code-inline">${escapeHtml(code)}</code>`)
    return `\x00CODE${idx}\x00`
  })

  // Bold italic ***text***
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, (_, t) => `<strong><em>${escapeHtml(t)}</em></strong>`)
  // Bold **text**
  s = s.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${escapeHtml(t)}</strong>`)
  // Italic *text* or _text_
  s = s.replace(/\*(.+?)\*/g, (_, t) => `<em>${escapeHtml(t)}</em>`)
  s = s.replace(/_([^_]+)_/g, (_, t) => `<em>${escapeHtml(t)}</em>`)
  // Underline __text__
  s = s.replace(/__(.+?)__/g, (_, t) => `<span class="ann-underline">${escapeHtml(t)}</span>`)
  // Strikethrough ~~text~~
  s = s.replace(/~~(.+?)~~/g, (_, t) => `<span class="ann-strike">${escapeHtml(t)}</span>`)

  // Custom emoji <:name:id> or <a:name:id>
  s = s.replace(/<(a?):(\w+):(\d+)>/g, (_, animated, name, id) => {
    const ext = animated === 'a' ? 'gif' : 'webp'
    return `<img class="ann-emoji" src="https://cdn.discordapp.com/emojis/${id}.${ext}?size=32" alt=":${name}:" title=":${name}:" />`
  })

  // Unicode emoji — left as-is (browsers render them fine)

  // Mentions <@id> <#id> <@&id> + @everyone / @here
  s = s.replace(/<@!?(\d+)>/g, `<span class="ann-mention">@utilisateur</span>`)
  s = s.replace(/<#(\d+)>/g, `<span class="ann-mention">#salon</span>`)
  s = s.replace(/<@&(\d+)>/g, `<span class="ann-mention">@rôle</span>`)
  s = s.replace(/@(everyone|here)/g, `<span class="ann-mention ann-mention--global">@$1</span>`)

  // URLs — linkify bare URLs (negative lookbehind: skip URLs inside HTML attributes src="..." href="...")
  s = s.replace(/(?<![="'])https?:\/\/[^\s<"']+/g, (url) => {
    const safe = escapeHtml(url)
    return `<a class="ann-link" href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`
  })

  // Markdown links [text](url)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => {
    return `<a class="ann-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`
  })

  // Restore inline code
  s = s.replace(/\x00CODE(\d+)\x00/g, (_, i) => codePieces[+i])

  return s
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  if (h < 24) return `il y a ${h}h`
  if (d < 7)  return `il y a ${d}j`
  return fmtDate(iso)
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)
const IconPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconEdit = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconImage = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

// ─── Attachment renderer ───────────────────────────────────────────────────────

function Attachment({ att, onLightbox }) {
  const isImage = att.contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.filename)
  const isVideo = att.contentType.startsWith('video/')

  if (isImage) {
    return (
      <img
        className="ann-attachment-img"
        src={att.proxyUrl || att.url}
        alt={att.filename}
        loading="lazy"
        onClick={() => onLightbox(att.proxyUrl || att.url)}
        title={att.filename}
      />
    )
  }
  if (isVideo) {
    return (
      <video className="ann-attachment-video" controls preload="none">
        <source src={att.url} type={att.contentType} />
      </video>
    )
  }
  return (
    <a className="ann-attachment-file" href={att.url} target="_blank" rel="noopener noreferrer">
      <IconImage /> {att.filename}
    </a>
  )
}

// ─── Embed renderer ───────────────────────────────────────────────────────────

function Embed({ embed }) {
  const borderColor = embed.color
    ? `#${embed.color.toString(16).padStart(6, '0')}`
    : '#4e9bff'

  return (
    <div className="ann-embed" style={{ borderLeftColor: borderColor }}>
      {embed.title && (
        <div className="ann-embed-title">
          {embed.url
            ? <a href={embed.url} target="_blank" rel="noopener noreferrer">{embed.title}</a>
            : embed.title
          }
        </div>
      )}
      {embed.description && (
        <div
          className="ann-embed-desc"
          dangerouslySetInnerHTML={{ __html: parseDiscordMarkdown(embed.description) }}
        />
      )}
      {embed.fields?.length > 0 && (
        <div className="ann-embed-fields">
          {embed.fields.map((f, i) => (
            <div key={i} className={`ann-embed-field${f.inline ? ' ann-embed-field--inline' : ''}`}>
              <div className="ann-embed-field-name">{f.name}</div>
              <div
                className="ann-embed-field-value"
                dangerouslySetInnerHTML={{ __html: parseDiscordMarkdown(f.value) }}
              />
            </div>
          ))}
        </div>
      )}
      {embed.image && (
        <img className="ann-embed-image" src={embed.image} alt="" loading="lazy" />
      )}
      {embed.thumbnail && !embed.image && (
        <img className="ann-embed-thumb" src={embed.thumbnail} alt="" loading="lazy" />
      )}
      {embed.footer && (
        <div className="ann-embed-footer">{embed.footer}</div>
      )}
    </div>
  )
}

// ─── Single message card ───────────────────────────────────────────────────────

function MessageCard({ msg, onLightbox }) {
  const accent = authorAccentColor(msg.author.id)
  const hasContent = msg.content.trim().length > 0
  const hasAttachments = msg.attachments.length > 0
  const hasEmbeds = msg.embeds.length > 0

  return (
    <article
      className={`ann-card${msg.pinned ? ' ann-card--pinned' : ''}`}
      style={{ '--accent': accent }}
    >
      {/* Accent bar */}
      <div className="ann-card-bar" />

      {/* Header */}
      <div className="ann-card-header">
        <img
          className="ann-author-avatar"
          src={msg.author.avatar}
          alt={msg.author.globalName}
          onError={e => e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`}
        />
        <div className="ann-author-info">
          <span className="ann-author-name">{msg.author.globalName}</span>
          {msg.author.bot && <span className="ann-bot-badge">BOT</span>}
          {msg.pinned && (
            <span className="ann-pin-badge">
              <IconPin /> Épinglé
            </span>
          )}
        </div>
        <div className="ann-card-meta">
          {msg.editedAt && (
            <span className="ann-edited" title={`Modifié le ${fmtDate(msg.editedAt)}`}>
              <IconEdit /> modifié
            </span>
          )}
          <time className="ann-timestamp" dateTime={msg.timestamp} title={fmtDate(msg.timestamp)}>
            {timeAgo(msg.timestamp)}
          </time>
        </div>
      </div>

      {/* Content */}
      {hasContent && (
        <div
          className="ann-content"
          dangerouslySetInnerHTML={{ __html: parseDiscordMarkdown(msg.content) }}
        />
      )}

      {/* Attachments */}
      {hasAttachments && (
        <div className={`ann-attachments ann-attachments--${Math.min(msg.attachments.length, 3)}`}>
          {msg.attachments.map(att => (
            <Attachment key={att.id} att={att} onLightbox={onLightbox} />
          ))}
        </div>
      )}

      {/* Embeds */}
      {hasEmbeds && (
        <div className="ann-embeds">
          {msg.embeds.map((e, i) => <Embed key={i} embed={e} />)}
        </div>
      )}

      {/* Reactions */}
      {msg.reactions.length > 0 && (
        <div className="ann-reactions">
          {msg.reactions.map((rx, i) => (
            <span key={i} className="ann-reaction">
              {rx.isCustom
                ? <img src={rx.emoji} alt="" className="ann-reaction-emoji" />
                : <span className="ann-reaction-unicode">{rx.emoji}</span>
              }
              <span className="ann-reaction-count">{rx.count}</span>
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div className="ann-lightbox" onClick={e => e.target === e.currentTarget && onClose()}>
      <button className="ann-lightbox-close" onClick={onClose}><IconClose /></button>
      <img className="ann-lightbox-img" src={src} alt="" />
    </div>
  )
}

// ─── Loading skeletons ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="ann-card ann-card--skeleton">
      <div className="ann-card-bar" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="ann-card-header">
        <div className="ann-skeleton ann-skeleton--avatar" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="ann-skeleton" style={{ width: 120, height: 13 }} />
          <div className="ann-skeleton" style={{ width: 70, height: 11 }} />
        </div>
        <div className="ann-skeleton" style={{ width: 55, height: 11 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <div className="ann-skeleton" style={{ width: '90%', height: 13 }} />
        <div className="ann-skeleton" style={{ width: '75%', height: 13 }} />
        <div className="ann-skeleton" style={{ width: '55%', height: 13 }} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const [messages, setMessages]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [countdown, setCountdown]   = useState(REFRESH_INTERVAL)
  const [lightbox, setLightbox]     = useState(null)
  const intervalRef = useRef(null)
  const countdownRef = useRef(null)

  const loadMessages = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const endpoint = force ? `${API}/api/announcements/refresh` : `${API}/api/announcements`
      const method   = force ? 'POST' : 'GET'
      const r = await fetch(endpoint, { method, credentials: 'include' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Erreur de chargement')
      setMessages(data.messages || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setCountdown(REFRESH_INTERVAL)
    }
  }, [])

  // Initial load
  useEffect(() => { loadMessages() }, [loadMessages])

  // Auto-refresh every REFRESH_INTERVAL seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => loadMessages(false), REFRESH_INTERVAL * 1000)
    countdownRef.current = setInterval(() => {
      setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL)
    }, 1000)
    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
  }, [loadMessages])

  const pinned   = messages.filter(m => m.pinned)
  const regular  = messages.filter(m => !m.pinned)

  return (
    <Layout title="Annonces">
      <div className="ann-page">

        {/* ── Header bar ── */}
        <div className="ann-header">
          <div className="ann-header-left">
            <IconBell />
            <div>
              <div className="ann-header-title">Communications officielles</div>
              <div className="ann-header-sub">Salon #annonces · HCT Healthcare</div>
            </div>
          </div>
          <div className="ann-header-right">
            {!loading && !error && (
              <span className="ann-countdown">
                Actualisation dans {countdown}s
              </span>
            )}
            <button
              className="ann-refresh-btn"
              onClick={() => loadMessages(true)}
              disabled={loading || refreshing}
              title="Forcer l'actualisation"
            >
              <span className={refreshing ? 'ann-spinning' : ''}><IconRefresh /></span>
              Actualiser
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && !loading && (
          <div className="ann-error">
            <span>⚠ {error}</span>
            <button onClick={() => loadMessages()}>Réessayer</button>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && !error && (
          <div className="ann-list">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && (
          <>
            {/* Pinned section */}
            {pinned.length > 0 && (
              <section className="ann-section">
                <div className="ann-section-label">
                  <IconPin /> ÉPINGLÉS
                </div>
                <div className="ann-list">
                  {pinned.map(m => (
                    <MessageCard key={m.id} msg={m} onLightbox={setLightbox} />
                  ))}
                </div>
              </section>
            )}

            {/* Regular messages */}
            {regular.length > 0 && (
              <section className="ann-section">
                {pinned.length > 0 && (
                  <div className="ann-section-label">RÉCENTS</div>
                )}
                <div className="ann-list">
                  {regular.map(m => (
                    <MessageCard key={m.id} msg={m} onLightbox={setLightbox} />
                  ))}
                </div>
              </section>
            )}

            {messages.length === 0 && (
              <div className="ann-empty">
                <IconBell />
                <div>Aucune annonce pour le moment</div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Lightbox */}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </Layout>
  )
}
