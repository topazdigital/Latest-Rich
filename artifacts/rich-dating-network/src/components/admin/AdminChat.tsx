import { useState, useEffect, useRef, useCallback } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"
import { Lock, Send, RefreshCw, MessageSquare, ChevronLeft, ExternalLink } from "lucide-react"
import AdminUserDetail from "./AdminUserDetail"

interface FakeUser { id: number; name: string; photo: string }
interface RealUser { id: number; name: string; photo: string }
interface ConvLock { moderatorId: number; moderatorName: string; lockedAt: number; expiresAt: number }
interface Conversation {
  key: string; fakeUser: FakeUser; realUser: RealUser
  lastMessage: string; lastTime: number; msgCount: number; lock: ConvLock | null
  lastSenderFake: boolean; lastMsgRead: boolean
}
interface Message { id: number; u1: number; u2: number; message: string; time: number; read: number; mediaUrl?: string; mediaType?: string }

function timeLabel(ts: number) {
  if (!ts) return ""
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts * 1000).toLocaleDateString()
}

const S = {
  card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.75rem", overflow: "hidden" } as React.CSSProperties,
  avatar: { width: 36, height: 36, borderRadius: "50%", objectFit: "cover" as const, background: "#1e293b", flexShrink: 0 },
  btn: (color = "#FF192C") => ({ padding: "0.4rem 0.875rem", background: color, color: "#fff", border: "none", borderRadius: "0.5rem", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.3rem" } as React.CSSProperties),
  input: {
    width: "100%",
    background: "#1e293b",
    border: "2px solid #475569",
    borderRadius: "0.5rem",
    color: "#f1f5f9",
    caretColor: "#a78bfa",
    padding: "0.6rem 0.875rem",
    fontSize: "0.85rem",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
}

type ChatFilter = "all" | "needs_reply" | "follow_up"

export default function AdminChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [viewUserId, setViewUserId] = useState<number | null>(null)
  const [lockExpiry, setLockExpiry] = useState<number>(0)
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollMsgRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollConvRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMsgIdRef = useRef<number>(0)

  useEffect(() => {
    authFetch("/api/moderator/me").then(r => r.json()).then(u => setMyUserId(u.id)).catch(() => {})
    loadConversations()
    checkPushStatus()
  }, [page])

  const checkPushStatus = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setPushEnabled(false); return }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setPushEnabled(!!sub)
    } catch { setPushEnabled(false) }
  }

  const togglePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications not supported in this browser"); return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe()
        await authFetch("/api/moderator/push/unsubscribe", { method: "DELETE" })
        setPushEnabled(false)
        toast.success("Push notifications disabled")
        return
      }
      const r = await authFetch("/api/moderator/push/vapid-key")
      const { publicKey } = await r.json()
      if (!publicKey) { toast.error("Push not configured on server"); return }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })
      const subJson = sub.toJSON() as any
      await authFetch("/api/moderator/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      })
      setPushEnabled(true)
      toast.success("🔔 Push notifications enabled! You'll be alerted when users reply.")
    } catch (e: any) {
      toast.error(e?.message || "Failed to set up push notifications")
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    return () => {
      if (keepaliveRef.current) clearInterval(keepaliveRef.current)
      if (pollMsgRef.current) clearInterval(pollMsgRef.current)
      if (pollConvRef.current) clearInterval(pollConvRef.current)
    }
  }, [])

  // Poll conversation list every 30s for unread count updates
  useEffect(() => {
    if (pollConvRef.current) clearInterval(pollConvRef.current)
    pollConvRef.current = setInterval(() => loadConversations(true), 30_000)
    return () => { if (pollConvRef.current) clearInterval(pollConvRef.current) }
  }, [page])

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const r = await authFetch(`/api/moderator/conversations?page=${page}`)
      const d = await r.json()
      setConversations(d.conversations || [])
      setTotal(d.total || 0)
    } catch { if (!silent) toast.error("Failed to load conversations") }
    if (!silent) setLoading(false)
  }, [page])

  // Poll messages every 5s while a conversation is open
  useEffect(() => {
    if (pollMsgRef.current) clearInterval(pollMsgRef.current)
    if (!selected) return

    const pollMessages = async () => {
      try {
        const r = await authFetch(`/api/moderator/conversations/${selected.key}/messages`)
        const d = await r.json()
        const newMsgs: Message[] = d.messages || []
        const latestId = newMsgs.length > 0 ? newMsgs[newMsgs.length - 1].id : 0
        if (latestId > lastMsgIdRef.current) {
          lastMsgIdRef.current = latestId
          setMessages(newMsgs)
          // Update conversation list silently so unread badge refreshes
          loadConversations(true)
        }
      } catch {}
    }

    pollMsgRef.current = setInterval(pollMessages, 5_000)
    return () => { if (pollMsgRef.current) clearInterval(pollMsgRef.current) }
  }, [selected?.key])

  const openConversation = async (conv: Conversation) => {
    setSelected(conv)
    setMessages([])
    setMsgLoading(true)
    setReply("")
    lastMsgIdRef.current = 0
    try {
      const r = await authFetch(`/api/moderator/conversations/${conv.key}/messages`)
      const d = await r.json()
      const msgs: Message[] = d.messages || []
      setMessages(msgs)
      lastMsgIdRef.current = msgs.length > 0 ? msgs[msgs.length - 1].id : 0
    } catch { toast.error("Failed to load messages") }
    setMsgLoading(false)
  }

  const lockConversation = async () => {
    if (!selected) return
    try {
      const r = await authFetch(`/api/moderator/conversations/${selected.key}/lock`, { method: "POST" })
      if (!r.ok) { const e = await r.json(); toast.error(e.error || "Could not lock"); return }
      const d = await r.json()
      setLockExpiry(d.expiresAt)
      setSelected(s => s ? { ...s, lock: { moderatorId: myUserId!, moderatorName: "You", lockedAt: Math.floor(Date.now()/1000), expiresAt: d.expiresAt } } : s)
      if (keepaliveRef.current) clearInterval(keepaliveRef.current)
      keepaliveRef.current = setInterval(async () => {
        const kr = await authFetch(`/api/moderator/conversations/${selected.key}/keepalive`, { method: "POST" })
        if (kr.ok) { const kd = await kr.json(); setLockExpiry(kd.expiresAt) }
      }, 120_000)
      toast.success("Conversation locked — you can now reply")
    } catch { toast.error("Failed to lock") }
  }

  const sendReply = async () => {
    if (!selected || !reply.trim()) return
    setSending(true)
    try {
      const r = await authFetch(`/api/moderator/conversations/${selected.key}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      })
      if (!r.ok) { const e = await r.json(); toast.error(e.error || "Failed to send"); setSending(false); return }
      const d = await r.json()
      setMessages(m => {
        const updated = [...m, d.message]
        lastMsgIdRef.current = d.message.id
        return updated
      })
      setReply("")
    } catch { toast.error("Failed to send") }
    setSending(false)
  }

  const isLockedByMe = selected?.lock?.moderatorId === myUserId

  return (
    <div style={{ color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", margin: 0 }}>Fake User Chat</h2>
          <p style={{ color: "#475569", fontSize: "0.72rem", marginTop: "0.2rem" }}>
            Reply as fake users to real members · {total} conversations
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {pushEnabled !== null && (
            <button onClick={togglePush} style={S.btn(pushEnabled ? "#334155" : "#7c3aed")} title={pushEnabled ? "Disable push notifications" : "Enable push notifications"}>
              {pushEnabled ? "🔕 Mute" : "🔔 Enable Alerts"}
            </button>
          )}
          <button onClick={() => loadConversations()} style={S.btn("#1e293b")}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "320px 1fr" : "1fr", gap: "0.75rem", minHeight: 500 }}>
        {/* Conversation list */}
        <div style={{ ...S.card, display: "flex", flexDirection: "column", maxHeight: 600, overflowY: "auto" }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
            {([
              { key: "all",          label: "All",         color: "#64748b" },
              { key: "needs_reply",  label: "🔴 Reply",    color: "#FF192C" },
              { key: "follow_up",    label: "✅ Follow Up", color: "#22c55e" },
            ] as { key: ChatFilter; label: string; color: string }[]).map(tab => {
              const count =
                tab.key === "needs_reply" ? conversations.filter(c => !c.lastSenderFake).length :
                tab.key === "follow_up"   ? conversations.filter(c => c.lastSenderFake && c.lastMsgRead).length :
                conversations.length
              return (
                <button key={tab.key} onClick={() => setChatFilter(tab.key)} style={{
                  flex: 1, padding: "0.5rem 0.25rem", background: "transparent", border: "none",
                  borderBottom: chatFilter === tab.key ? `2px solid ${tab.color}` : "2px solid transparent",
                  color: chatFilter === tab.key ? "#fff" : "#475569",
                  fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", transition: "color 0.15s",
                  fontFamily: "inherit",
                }}>
                  {tab.label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                </button>
              )
            })}
          </div>

          {(() => {
            const visible = conversations.filter(c =>
              chatFilter === "needs_reply" ? !c.lastSenderFake :
              chatFilter === "follow_up"   ? c.lastSenderFake && c.lastMsgRead :
              true
            )
            if (loading) return (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <div style={{ width: "1.5rem", height: "1.5rem", border: "2px solid #FF192C", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            )
            if (visible.length === 0) return (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#475569" }}>
                <MessageSquare size={32} style={{ margin: "0 auto 0.75rem" }} />
                <p style={{ fontWeight: 600 }}>
                  {chatFilter === "needs_reply" ? "No conversations waiting for a reply" :
                   chatFilter === "follow_up"   ? "No conversations where user has read your last message" :
                   "No conversations yet"}
                </p>
                {chatFilter !== "all" && <p style={{ fontSize: "0.72rem", marginTop: "0.25rem", color: "#334155" }}>Switch to "All" to see everything</p>}
              </div>
            )
            return visible.map(conv => {
              const isActive = selected?.key === conv.key
              const lockedByOther = conv.lock && conv.lock.moderatorId !== myUserId
              // Show: "who sent last → recipient" so the arrow indicates message direction
              const senderName    = conv.lastSenderFake ? conv.fakeUser.name  : conv.realUser.name
              const recipientName = conv.lastSenderFake ? conv.realUser.name  : conv.fakeUser.name
              return (
                <button key={conv.key} onClick={() => openConversation(conv)} style={{
                  display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem",
                  background: isActive ? "#1e293b" : "transparent", border: "none",
                  borderBottom: "1px solid #1e293b", cursor: "pointer", textAlign: "left", width: "100%",
                }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <img src={getPhotoUrl(conv.fakeUser.photo)} alt="" style={S.avatar} onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                    <img src={getPhotoUrl(conv.realUser.photo)} alt="" style={{ ...S.avatar, width: 20, height: 20, position: "absolute", bottom: -2, right: -4, border: "1px solid #0f172a" }} onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.25rem" }}>
                      <span style={{ color: "#e2e8f0", fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {senderName}
                        <span style={{ color: "#475569", fontWeight: 400 }}> → </span>
                        {recipientName}
                      </span>
                      <span style={{ color: "#475569", fontSize: "0.65rem", flexShrink: 0 }}>{timeLabel(conv.lastTime)}</span>
                    </div>
                    <div style={{ color: "#334155", fontSize: "0.62rem", marginTop: "0.05rem" }}>
                      Real user: <span style={{ color: "#64748b" }}>#{conv.realUser.id}</span>
                      <button onClick={e => { e.stopPropagation(); setViewUserId(conv.realUser.id) }}
                        style={{ marginLeft: "0.3rem", background: "none", border: "none", color: "#60a5fa", fontSize: "0.6rem", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                        view ↗
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.1rem" }}>
                      <span style={{ color: "#64748b", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {conv.lastMessage || "No messages"}
                      </span>
                      {/* Read receipt: show when fake user sent last msg */}
                      {conv.lastSenderFake && (
                        <span style={{
                          fontSize: "0.65rem", flexShrink: 0, fontWeight: 700,
                          color: conv.lastMsgRead ? "#22c55e" : "#475569",
                        }} title={conv.lastMsgRead ? "Seen by user — good time to follow up!" : "Delivered, not yet read"}>
                          {conv.lastMsgRead ? "✓✓" : "✓"}
                        </span>
                      )}
                      {/* Waiting indicator: real user sent last msg, needs reply */}
                      {!conv.lastSenderFake && (
                        <span style={{
                          background: "#FF192C", color: "#fff",
                          fontSize: "0.55rem", fontWeight: 800,
                          borderRadius: "999px", padding: "1px 4px", flexShrink: 0,
                        }} title="Real user is waiting for a reply">REPLY</span>
                      )}
                    </div>
                    {lockedByOther && (
                      <div style={{ color: "#f59e0b", fontSize: "0.65rem", marginTop: "0.2rem" }}>
                        🔒 Locked by {conv.lock!.moderatorName}
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          })()}
          {total > 50 && (
            <div style={{ display: "flex", gap: "0.5rem", padding: "0.5rem", borderTop: "1px solid #1e293b" }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={S.btn("#1e293b")}>←</button>
              <span style={{ color: "#64748b", fontSize: "0.72rem", lineHeight: "2" }}>Page {page}</span>
              <button disabled={conversations.length < 50} onClick={() => setPage(p => p + 1)} style={S.btn("#1e293b")}>→</button>
            </div>
          )}
        </div>

        {/* Chat panel */}
        {selected && (
          <div style={{ ...S.card, display: "flex", flexDirection: "column", maxHeight: 600 }}>
            {/* Header */}
            <div style={{ padding: "0.75rem", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => { setSelected(null); if (pollMsgRef.current) clearInterval(pollMsgRef.current) }} style={S.btn("#1e293b")}>
                <ChevronLeft size={12} /> Back
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                <img src={getPhotoUrl(selected.fakeUser.photo)} alt="" style={{ ...S.avatar, width: 28, height: 28 }} onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                <div style={{ fontSize: "0.78rem", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Replying as <span style={{ color: "#a78bfa" }}>{selected.fakeUser.name}</span> to <span style={{ color: "#34d399" }}>{selected.realUser.name}</span>
                  </div>
                  {lockExpiry > 0 && isLockedByMe && (
                    <div style={{ color: "#22c55e", fontSize: "0.65rem" }}>🔒 Locked by you · expires {timeLabel(lockExpiry)}</div>
                  )}
                  {selected.lock && !isLockedByMe && (
                    <div style={{ color: "#f59e0b", fontSize: "0.65rem" }}>⚠️ Locked by {selected.lock.moderatorName}</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button onClick={() => setViewUserId(selected.realUser.id)} style={S.btn("#1e293b")} title="View real user profile">
                  <ExternalLink size={11} /> #{selected.realUser.id}
                </button>
                <span style={{ color: "#22c55e", fontSize: "0.6rem", fontWeight: 600 }}>● Live</span>
                {!isLockedByMe && !selected.lock && (
                  <button onClick={lockConversation} style={S.btn("#7c3aed")}>
                    <Lock size={11} /> Lock to Reply
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {msgLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: "1.5rem", height: "1.5rem", border: "2px solid #FF192C", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#475569", fontSize: "0.8rem" }}>No messages yet</div>
              ) : messages.map(msg => {
                const fromFake = msg.u1 === selected.fakeUser.id
                return (
                  <div key={msg.id} style={{ display: "flex", justifyContent: fromFake ? "flex-end" : "flex-start", gap: "0.4rem", alignItems: "flex-end" }}>
                    {!fromFake && (
                      <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#1e293b" }}>
                        <img src={getPhotoUrl(selected.realUser.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: "70%", padding: "0.5rem 0.75rem", borderRadius: fromFake ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
                      background: fromFake ? "#7c3aed" : "#1e293b", color: "#fff", fontSize: "0.82rem", lineHeight: 1.5,
                    }}>
                      {msg.mediaUrl && msg.mediaType?.startsWith("image") && (
                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginBottom: msg.message ? "0.4rem" : 0 }}>
                          <img src={msg.mediaUrl} alt="Media" style={{ maxWidth: 200, maxHeight: 240, borderRadius: "0.5rem", display: "block", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                        </a>
                      )}
                      {msg.mediaUrl && msg.mediaType?.startsWith("video") && (
                        <video src={msg.mediaUrl} controls style={{ maxWidth: 200, maxHeight: 240, borderRadius: "0.5rem", display: "block", background: "#000", marginBottom: msg.message ? "0.4rem" : 0 }} preload="metadata" />
                      )}
                      {msg.mediaUrl && msg.mediaType?.startsWith("audio") && (
                        <audio src={msg.mediaUrl} controls style={{ maxWidth: 200, marginBottom: msg.message ? "0.4rem" : 0 }} preload="metadata" />
                      )}
                      {msg.message && <div>{msg.message}</div>}
                      <div style={{ color: fromFake ? "rgba(255,255,255,0.55)" : "#475569", fontSize: "0.62rem", marginTop: "0.2rem", textAlign: "right", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.25rem" }}>
                        <span>{timeLabel(msg.time)}</span>
                        {fromFake && (
                          <span style={{ fontWeight: 700, color: msg.read ? "#86efac" : "rgba(255,255,255,0.4)" }} title={msg.read ? "Seen by user" : "Delivered"}>
                            {msg.read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                    {fromFake && (
                      <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#1e293b" }}>
                        <img src={getPhotoUrl(selected.fakeUser.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div style={{ padding: "0.75rem", borderTop: "1px solid #1e293b" }}>
              {!isLockedByMe ? (
                <div style={{ textAlign: "center", color: "#475569", fontSize: "0.78rem", padding: "0.5rem" }}>
                  {selected.lock ? `🔒 Locked by ${selected.lock.moderatorName}` : "Lock the conversation above to reply"}
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    placeholder={`Reply as ${selected.fakeUser.name}…`}
                    className="admin-dark-input"
                    style={{ flex: 1, width: "100%", padding: "0.6rem 0.875rem", fontSize: "0.85rem", boxSizing: "border-box" }}
                    disabled={sending}
                    autoFocus
                  />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} style={{ ...S.btn(), opacity: !reply.trim() || sending ? 0.5 : 1 }}>
                    <Send size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {viewUserId && (
        <AdminUserDetail userId={viewUserId} onClose={() => setViewUserId(null)} />
      )}
    </div>
  )
}
