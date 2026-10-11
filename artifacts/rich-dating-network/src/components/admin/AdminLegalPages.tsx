import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { ExternalLink, FileText, Save, Search, ShieldAlert } from "lucide-react"
import { authFetch } from "../../lib/auth"
import { DEFAULT_LEGAL_PAGES, type LegalPageDocument, type LegalPageSlug } from "../../lib/legal-pages"

const PAGE_ORDER: LegalPageSlug[] = ["terms", "privacy"]

function toEditablePage(slug: LegalPageSlug, saved?: Partial<LegalPageDocument>): LegalPageDocument {
  const defaults = DEFAULT_LEGAL_PAGES[slug]
  return {
    ...defaults,
    ...saved,
    slug,
    title: saved?.title || defaults.title,
    content: saved?.content || defaults.content,
    noIndex: saved?.noIndex === true,
    updatedAt: saved?.updatedAt || null,
  }
}

export default function AdminLegalPages() {
  const [selectedSlug, setSelectedSlug] = useState<LegalPageSlug>("terms")
  const [pages, setPages] = useState<Record<LegalPageSlug, LegalPageDocument>>({
    terms: toEditablePage("terms"),
    privacy: toEditablePage("privacy"),
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirtyPages, setDirtyPages] = useState<Record<LegalPageSlug, boolean>>({ terms: false, privacy: false })
  const dirty = dirtyPages[selectedSlug]
  const page = pages[selectedSlug]

  useEffect(() => {
    let active = true
    authFetch("/api/legal-pages/admin")
      .then(async response => {
        if (!response.ok) throw new Error("Could not load legal pages")
        return response.json()
      })
      .then((savedPages: Partial<LegalPageDocument>[]) => {
        if (!active) return
        const next = { ...pages }
        for (const slug of PAGE_ORDER) {
          const saved = Array.isArray(savedPages) ? savedPages.find(item => item.slug === slug) : undefined
          next[slug] = toEditablePage(slug, saved)
        }
        setPages(next)
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setLoading(false)
          toast.error("Legal pages could not be loaded. You can still review the starter text.")
        }
      })
    return () => { active = false }
  }, [])

  const updatePage = (updates: Partial<LegalPageDocument>) => {
    setPages(current => ({ ...current, [selectedSlug]: { ...current[selectedSlug], ...updates } }))
    setDirtyPages(current => ({ ...current, [selectedSlug]: true }))
  }

  const savePage = async () => {
    setSaving(true)
    try {
      const response = await authFetch(`/api/legal-pages/admin/${selectedSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.title,
          content: page.content,
          noIndex: page.noIndex,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Could not save this page")
      setPages(current => ({
        ...current,
        [selectedSlug]: toEditablePage(selectedSlug, result),
      }))
      setDirtyPages(current => ({ ...current, [selectedSlug]: false }))
      toast.success(`${page.title} saved`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this page")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Loading legal pages…</div>
  }

  return (
    <div style={{ maxWidth: "68rem", margin: "0 auto", color: "#1e293b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
        <FileText size={21} color="#e11d48" />
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>Legal Pages</h2>
      </div>
      <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0 0 1rem" }}>
        Edit the public Terms of Service and Privacy Policy pages.
      </p>

      <div style={{
        display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.9rem 1rem",
        marginBottom: "1.25rem", border: "1px solid #fdba74", background: "#fff7ed",
        color: "#9a3412", borderRadius: "0.75rem", fontSize: "0.82rem", lineHeight: 1.55,
      }}>
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Legal review required.</strong> The starter wording is not legal advice and cannot guarantee
          legal protection. Confirm every statement against your real data and service practices, your operator's
          legal details, and the laws that apply before publishing.
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1rem" }}>
        {PAGE_ORDER.map(slug => (
          <button
            key={slug}
            type="button"
            onClick={() => setSelectedSlug(slug)}
            style={{
              border: 0,
              borderBottom: selectedSlug === slug ? "2px solid #e11d48" : "2px solid transparent",
              background: "transparent",
              color: selectedSlug === slug ? "#be123c" : "#64748b",
              cursor: "pointer",
              padding: "0.65rem 0.85rem",
              font: "inherit",
              fontWeight: 700,
            }}
          >
            {slug === "terms" ? "Terms of Service" : "Privacy Policy"}
          </button>
        ))}
      </div>

      <section style={{
        background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.9rem",
        padding: "clamp(1rem, 3vw, 1.5rem)", boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 750, margin: "0 0 0.25rem" }}>{page.title}</h3>
            <p style={{ color: "#64748b", fontSize: "0.78rem", margin: 0 }}>
              Public page: <code>/{selectedSlug}</code>
              {page.updatedAt && ` · Last saved ${new Date(page.updatedAt).toLocaleString()}`}
            </p>
          </div>
          <a
            href={`/${selectedSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#be123c", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}
          >
            View published page <ExternalLink size={15} />
          </a>
        </div>

        <label htmlFor="legal-page-title" style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Page title
        </label>
        <input
          id="legal-page-title"
          value={page.title}
          maxLength={120}
          onChange={event => updatePage({ title: event.target.value })}
          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: "0.55rem", padding: "0.7rem 0.8rem", font: "inherit", marginBottom: "1rem" }}
        />

        <label htmlFor="legal-page-content" style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.4rem" }}>
          Page content
        </label>
        <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 0.45rem" }}>
          Plain text with simple Markdown: use <code>## Heading</code> for sections, <code>- item</code> for bullets,
          and <code>**bold text**</code> for emphasis.
        </p>
        <textarea
          id="legal-page-content"
          value={page.content}
          onChange={event => updatePage({ content: event.target.value })}
          rows={26}
          maxLength={60000}
          spellCheck
          style={{
            display: "block", width: "100%", boxSizing: "border-box", resize: "vertical",
            border: "1px solid #cbd5e1", borderRadius: "0.55rem", padding: "0.8rem",
            font: "0.82rem/1.6 ui-monospace, SFMono-Regular, Menlo, monospace", color: "#0f172a",
          }}
        />
        <div style={{ color: "#94a3b8", fontSize: "0.7rem", textAlign: "right", marginTop: "0.25rem" }}>
          {page.content.length.toLocaleString()} / 60,000 characters
        </div>

        <label style={{
          display: "flex", alignItems: "flex-start", gap: "0.65rem", marginTop: "1.1rem",
          border: "1px solid #e2e8f0", borderRadius: "0.65rem", padding: "0.8rem",
          cursor: "pointer",
        }}>
          <input
            type="checkbox"
            checked={page.noIndex}
            onChange={event => updatePage({ noIndex: event.target.checked })}
            style={{ marginTop: "0.2rem", accentColor: "#e11d48" }}
          />
          <span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 700 }}>
              <Search size={15} /> Prevent search engines from indexing this page
            </span>
            <span style={{ display: "block", color: "#64748b", fontSize: "0.74rem", lineHeight: 1.5, marginTop: "0.2rem" }}>
              This keeps the page available by direct link, but asks search engines not to show it in results.
              Removal from existing results can take time. Leaving legal pages indexable is usually better for
              transparency; this setting is optional.
            </span>
          </span>
        </label>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.25rem" }}>
          <span style={{ color: dirty ? "#b45309" : "#64748b", fontSize: "0.78rem" }}>
            {dirty ? "Unsaved changes" : "Changes are saved"}
          </span>
          <button
            type="button"
            onClick={savePage}
            disabled={saving || !dirty}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: saving || !dirty ? "#cbd5e1" : "#e11d48", color: "#fff",
              border: 0, borderRadius: "0.6rem", padding: "0.7rem 1rem",
              cursor: saving || !dirty ? "not-allowed" : "pointer",
              font: "inherit", fontSize: "0.82rem", fontWeight: 750,
            }}
          >
            <Save size={16} /> {saving ? "Saving…" : "Save page"}
          </button>
        </div>
      </section>
    </div>
  )
}
