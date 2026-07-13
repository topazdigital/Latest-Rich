import { useState, useEffect, useMemo } from "react"
import { authFetch } from "../../lib/auth"
import { formatDate, timeAgo } from "../../lib/utils"
import toast from "react-hot-toast"
import { Mail, MailOpen, Send, Trash2, X, Search } from "lucide-react"

interface ContactMessage {
  id: number
  name: string
  email: string
  subject: string
  message: string
  emailSent: number
  replied: number
  repliedAt: number
  replyMessage: string
  createdAt: number
}

const REPLY_TEMPLATES = [
  { name: "Blank", html: "" },
  {
    name: "Thank you / General reply",
    html: `<p style="margin:0 0 16px">Thank you for reaching out to us! We appreciate you taking the time to contact Rich Dating Network.</p>
<p style="margin:0 0 16px">[Write your reply here]</p>
<p style="margin:0">If you have any further questions, just reply to this email — we're happy to help.</p>`,
  },
  {
    name: "Payment / Credits clarification",
    html: `<p style="margin:0 0 16px">Thanks for your payment! I want to clear up how <strong>Premium</strong> and <strong>Credits</strong> work on Rich Dating Network:</p>
<ul style="padding-left:18px;margin:0 0 16px">
  <li><strong>Premium</strong> unlocks sharing contact details, seeing profile visitors, priority placement and a VIP badge.</li>
  <li><strong>Credits</strong> are a separate balance used to send chat messages — every message costs a small number of credits.</li>
</ul>
<p style="margin:0 0 16px">You can top up credits from the Credits page in your account. Let us know if you need help.</p>`,
  },
  {
    name: "Issue resolved",
    html: `<p style="margin:0 0 16px">Good news — we've looked into this and resolved the issue on your account.</p>
<p style="margin:0">Please try again and let us know if anything still looks off. Thanks again for flagging it!</p>`,
  },
]

export default function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ContactMessage | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch("/api/admin/contact-messages")
      const d = await r.json()
      setMessages(Array.isArray(d) ? d : [])
    } catch {
      toast.error("Failed to load contact messages")
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return messages.filter(m => {
      if (filter === "pending" && m.replied) return false
      if (filter === "replied" && !m.replied) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!m.name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q) && !m.message.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [messages, filter, search])

  const pendingCount = messages.filter(m => !m.replied).length

  async function deleteMessage(id: number) {
    if (!confirm("Delete this message permanently?")) return
    await authFetch(`/api/admin/contact-messages/${id}`, { method: "DELETE" })
    toast.success("Message deleted")
    setSelected(null)
    load()
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "pending", "replied"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "7px 16px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, textTransform: "capitalize",
              background: filter === f ? "linear-gradient(135deg,#FF192C,#ff5f6b)" : "#fff",
              color: filter === f ? "#fff" : "#475569",
              boxShadow: filter === f ? "0 3px 8px rgba(255,25,44,0.25)" : "0 1px 2px rgba(0,0,0,0.06)",
            }}>
              {f}{f === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: 10, color: "#94a3b8" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, message…"
            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", background: "#fff", borderRadius: 14 }}>
          <Mail size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div>No contact messages{filter !== "all" ? ` (${filter})` : ""}.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {filtered.map((m, i) => (
            <button key={m.id} onClick={() => setSelected(m)} style={{
              width: "100%", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 12,
              padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer",
              borderTop: i === 0 ? "none" : "1px solid #f1f5f9", fontFamily: "inherit",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <div style={{ marginTop: 2, flexShrink: 0 }}>
                {m.replied ? <MailOpen size={17} style={{ color: "#94a3b8" }} /> : <Mail size={17} style={{ color: "#FF192C" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: "#1e293b" }}>{m.name}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{m.email}</span>
                  {!m.replied && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#FF192C", background: "#fef2f2", padding: "2px 7px", borderRadius: 999 }}>PENDING</span>
                  )}
                  {m.replied === 1 && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#16a34a", background: "#f0fdf4", padding: "2px 7px", borderRadius: 999 }}>REPLIED</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#334155", fontWeight: 600, marginTop: 3 }}>{m.subject || "(no subject)"}</div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.message}</div>
              </div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", flexShrink: 0, marginTop: 2 }}>{timeAgo(m.createdAt)}</div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <MessageDetailModal
          message={selected}
          onClose={() => setSelected(null)}
          onDelete={() => deleteMessage(selected.id)}
          onSent={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}

function MessageDetailModal({ message, onClose, onDelete, onSent }: {
  message: ContactMessage
  onClose: () => void
  onDelete: () => void
  onSent: () => void
}) {
  const [subject, setSubject] = useState(`Re: ${message.subject?.trim() || "Your message to us"}`)
  const [body, setBody] = useState(message.replyMessage || REPLY_TEMPLATES[1].html)
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)

  async function send() {
    if (!body.trim()) { toast.error("Write a reply first"); return }
    setSending(true)
    try {
      const r = await authFetch(`/api/admin/contact-messages/${message.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, html: body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Failed to send")
      toast.success(`Reply sent to ${message.email}`)
      onSent()
    } catch (e: any) {
      toast.error(e.message || "Failed to send reply")
    } finally { setSending(false) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 780, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>{message.subject || "(no subject)"}</div>
            <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4 }}>
              From <strong style={{ color: "#1e293b" }}>{message.name}</strong> · <a href={`mailto:${message.email}`} style={{ color: "#FF192C" }}>{message.email}</a> · {formatDate(message.createdAt)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Original message */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: 8 }}>ORIGINAL MESSAGE</div>
            <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{message.message}</div>
          </div>

          {message.replied === 1 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", letterSpacing: "0.05em", marginBottom: 8 }}>
                ✓ ALREADY REPLIED · {formatDate(message.repliedAt)}
              </div>
              <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: message.replyMessage }} />
            </div>
          )}

          {/* Reply composer */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em", marginBottom: 8 }}>
              {message.replied ? "SEND ANOTHER REPLY" : "COMPOSE REPLY"}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {REPLY_TEMPLATES.map(t => (
                <button key={t.name} onClick={() => setBody(t.html)}
                  style={{ padding: "5px 12px", borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {t.name}
                </button>
              ))}
            </div>

            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13.5, marginBottom: 8, boxSizing: "border-box" }} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
              <button onClick={() => setPreview(!preview)} style={{ fontSize: 12, color: "#FF192C", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                {preview ? "Edit HTML" : "Preview"}
              </button>
            </div>

            {preview ? (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f1f5f9" }}>
                <iframe title="preview" srcDoc={`<div style="font-family:Arial,sans-serif;padding:16px;font-size:14px;color:#374151">${body}</div>`}
                  style={{ width: "100%", height: 220, border: "none", background: "#fff" }} />
              </div>
            ) : (
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={9}
                placeholder="Write your reply (HTML allowed)…"
                style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13.5, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onDelete} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={send} disabled={sending} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 999, border: "none",
            background: "linear-gradient(135deg,#FF192C,#ff5f6b)", color: "#fff", fontWeight: 700, fontSize: 13.5,
            cursor: "pointer", opacity: sending ? 0.6 : 1, boxShadow: "0 3px 10px rgba(255,25,44,0.3)",
          }}>
            <Send size={14} /> {sending ? "Sending…" : "Send Reply"}
          </button>
        </div>
      </div>
    </div>
  )
}
