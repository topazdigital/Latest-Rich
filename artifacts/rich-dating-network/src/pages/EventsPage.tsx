import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "wouter"
import { ArrowLeft, Calendar, CheckCircle2, Clock3, CreditCard, Loader2, MapPin, Upload, Users } from "lucide-react"
import toast from "react-hot-toast"
import { authFetch } from "../lib/auth"
import { getPhotoUrl } from "../lib/utils"
import { useAuth } from "../hooks/useAuth"

type EventRecord = {
  id: number
  title: string
  description?: string
  image?: string
  ticketPrice: number
  priceUsd: number
  localPrice: number
  currency: string
  startsAt: number
  endTime?: number
  location?: string
  timezone?: string
  capacity?: number
  attendeeCount: number
  remaining: number | null
  attendeePreview: Array<{ id: number; name: string; photo?: string; photoThumb?: string }>
  userStatus: "going" | "waitlisted" | "cancelled" | null
  userPaid: boolean
  attendanceStatus?: "going" | "waitlisted"
  paid?: boolean
}

type Props = { params?: { id?: string } }

function formatDate(timestamp: number, timezone = "Africa/Nairobi") {
  if (!timestamp) return "Date to be announced"
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date(timestamp * 1000))
  } catch {
    return new Date(timestamp * 1000).toLocaleString()
  }
}

function localPrice(event: EventRecord) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: event.currency || "USD",
    maximumFractionDigits: 0,
  }).format(event.localPrice || event.priceUsd)
}

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  payhero: { name: "M-Pesa", icon: "📱", color: "#00a651" },
  paystack: { name: "Card / Bank Transfer", icon: "🏦", color: "#00c3f7" },
  paymongo: { name: "GCash / Maya / Card", icon: "📲", color: "#7c3aed" },
}

function AttendeePreview({ event }: { event: EventRecord }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {event.attendeePreview.slice(0, 8).map((person) => (
          <img
            key={person.id}
            src={getPhotoUrl(person.photoThumb || person.photo)}
            alt={person.name}
            className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
            onError={(e) => { e.currentTarget.src = "/images/default-avatar.svg" }}
          />
        ))}
      </div>
      <p className="text-sm text-gray-600">
        {event.attendeeCount > 0 ? (
          <><span className="font-bold text-gray-900">{event.attendeeCount} attending</span> · a private preview</>
        ) : (
          <>Members are joining soon</>
        )}
      </p>
    </div>
  )
}

function EventCard({ event }: { event: EventRecord }) {
  return (
    <Link href={`/events/${event.id}`} className="group block overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-600">
        {event.image && (
          <img src={event.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/75">Featured event</p>
            <h2 className="text-xl font-black leading-tight">{event.title}</h2>
          </div>
          <div className="rounded-2xl bg-white/95 px-3 py-2 text-right text-gray-900 shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">From</p>
            <p className="text-base font-black">{localPrice(event)}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <span className="flex items-center gap-2"><Calendar size={15} className="text-rose-500" />{formatDate(event.startsAt, event.timezone)}</span>
          <span className="flex items-center gap-2"><MapPin size={15} className="text-rose-500" />{event.location || "Private venue"}</span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-gray-600">{event.description || "A curated members-only experience."}</p>
        <AttendeePreview event={event} />
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
          <span className="font-semibold text-gray-700">
            {event.remaining === null ? "Spaces available" : `${event.remaining} spaces left`}
          </span>
          <span className="font-black text-rose-600">View event →</span>
        </div>
      </div>
    </Link>
  )
}

export default function EventsPage({ params }: Props) {
  const { user, token, refreshUser } = useAuth()
  const eventId = Number(params?.id || 0)
  const [, setLocation] = useLocation()
  const [events, setEvents] = useState<EventRecord[]>([])
  const [myEvents, setMyEvents] = useState<EventRecord[]>([])
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [customGateways, setCustomGateways] = useState<any[]>([])
  const [activePaymentTab, setActivePaymentTab] = useState<"auto" | "manual">("auto")
  const [selectedGateway, setSelectedGateway] = useState<any>(null)
  const [proof, setProof] = useState("")
  const [phone, setPhone] = useState("")
  const [useCard, setUseCard] = useState(false)
  const [paymentStep, setPaymentStep] = useState<"idle" | "phone" | "polling">("idle")
  const [countdown, setCountdown] = useState(90)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refreshEventDetails() {
    if (!eventId) return
    const res = await authFetch(`/api/engagement/events/${eventId}`)
    if (res.ok) setEvent(await res.json())
  }

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  const pollMpesaStatus = useCallback((reference: string) => {
    setPaymentStep("polling")
    setCountdown(90)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          stopPolling()
          setPaymentStep("idle")
          toast.error("The M-Pesa request timed out. Please try again.")
          return 0
        }
        return current - 1
      })
    }, 1000)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await authFetch(`/api/payments/payhero/status/${reference}`)
        const data = await res.json()
        if (data.finalStatus === "completed" || data.orderStatus === "completed") {
          stopPolling()
          setPaymentStep("idle")
          toast.success("Payment received! Your event place is confirmed.")
          await refreshUser()
          await refreshEventDetails()
        } else if (data.finalStatus === "cancelled" || data.finalStatus === "failed") {
          stopPolling()
          setPaymentStep("idle")
          toast.error(data.finalStatus === "cancelled" ? "Payment cancelled." : "Payment failed. Please try again.")
        }
      } catch {
        // Keep polling through a temporary network error.
      }
    }, 4000)
  }, [refreshUser, stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const requests = eventId
      ? [authFetch(`/api/engagement/events/${eventId}`).then((res) => res.ok ? res.json() : null)]
      : [
          authFetch("/api/engagement/events").then((res) => res.ok ? res.json() : []),
          authFetch("/api/engagement/my-events").then((res) => res.ok ? res.json() : []),
        ]
    Promise.all(requests).then((results) => {
      if (cancelled) return
      if (eventId) setEvent(results[0])
      else {
        setEvents(Array.isArray(results[0]) ? results[0] : [])
        setMyEvents(Array.isArray(results[1]) ? results[1] : [])
      }
    }).catch(() => toast.error("Could not load events"))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [eventId])

  useEffect(() => {
    if (!token) return
    authFetch("/api/payments/method").then((res) => res.json()).then(setPaymentMethod).catch(() => {})
    authFetch("/api/custom-payments/gateways").then((res) => res.json())
      .then((data) => setCustomGateways(Array.isArray(data) ? data : [])).catch(() => {})
  }, [token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success")) toast.success("Payment received. Your event place is confirmed.")
    if (params.get("cancelled")) toast("Checkout cancelled", { icon: "↩️" })
  }, [])

  const title = useMemo(() => eventId ? (event?.title || "Event details") : "Meet in person", [eventId, event?.title])
  const provider = paymentMethod?.provider || "paystack"
  const hasLocalMethod = provider === "payhero" || provider === "paymongo"
  const effectiveProvider = hasLocalMethod && useCard ? "paystack" : provider
  const providerInfo = PROVIDER_INFO[effectiveProvider] || PROVIDER_INFO.paystack
  const manualGateways = customGateways.filter((gateway) => gateway.type === 3 || gateway.type == null)

  async function startCheckout(target: EventRecord, skipPhoneStep = false) {
    const price = Number(target.priceUsd || target.ticketPrice || 0)
    if (price <= 0) {
      setActionLoading(true)
      try {
        const res = await authFetch(`/api/engagement/events/${target.id}/attend`, { method: "POST" })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error || "Could not reserve your place"); return }
        toast.success("Your place is reserved.")
        await refreshEventDetails()
      } catch {
        toast.error("Could not reserve your place")
      } finally {
        setActionLoading(false)
      }
      return
    }

    if (activePaymentTab === "manual") {
      await submitManualPayment(target)
      return
    }

    if (effectiveProvider === "payhero" && !useCard && !skipPhoneStep) {
      setPaymentStep("phone")
      return
    }

    setActionLoading(true)
    try {
      const endpoint = effectiveProvider === "payhero"
        ? "/api/payments/payhero/initiate"
        : effectiveProvider === "paymongo"
          ? "/api/payments/paymongo/initiate"
          : "/api/payments/paystack/initiate"
      const body: Record<string, any> = { packageId: target.id, type: "event" }
      if (effectiveProvider === "payhero") body.phone = phone
      else if (effectiveProvider === "paymongo") body.paymentMethod = "gcash"
      else body.email = user?.email
      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Could not start checkout"); return }
      if (data.url) window.location.assign(data.url)
      else if (data.reference) {
        toast.success(data.message || "Request sent! Check your phone.")
        pollMpesaStatus(data.reference)
      } else toast.error("Payment provider did not return a checkout link")
    } catch {
      toast.error("Could not start checkout")
    } finally {
      setActionLoading(false)
    }
  }

  async function submitManualPayment(target: EventRecord) {
    if (!selectedGateway || !proof.trim()) {
      toast.error("Select a payment method and enter your payment proof")
      return
    }
    setActionLoading(true)
    try {
      const res = await authFetch("/api/custom-payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gatewayId: selectedGateway.id, type: "event", packageId: target.id, proof }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Submission failed"); return }
      toast.success(`Payment submitted! It will be reviewed within ${data.reviewTime} hour(s).`)
      setProof("")
      setSelectedGateway(null)
      setActivePaymentTab("auto")
    } catch {
      toast.error("Could not submit payment proof")
    } finally {
      setActionLoading(false)
    }
  }

  async function cancelAttendance(target: EventRecord) {
    setActionLoading(true)
    try {
      const res = await authFetch(`/api/engagement/events/${target.id}/attend`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Could not cancel attendance")
        return
      }
      toast.success("Your attendance was cancelled")
      setEvent((current) => current ? { ...current, userStatus: "cancelled", userPaid: false } : current)
      setMyEvents((current) => current.filter((item) => item.id !== target.id))
    } catch {
      toast.error("Could not cancel attendance")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-rose-500" /></div>
  }

  if (eventId) {
    if (!event) {
      return <div className="mx-auto max-w-3xl px-4 py-12 text-center"><p className="text-gray-600">This event is no longer available.</p><Link href="/events" className="mt-4 inline-block font-bold text-rose-600">Back to events</Link></div>
    }
    const status = event.userStatus || event.attendanceStatus
    const isConfirmed = status === "going"
    const isWaitlisted = status === "waitlisted"
    return (
      <main className="min-h-screen bg-gradient-to-b from-rose-50/70 via-gray-50 to-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
          <button onClick={() => setLocation("/events")} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-rose-600"><ArrowLeft size={16} /> All events</button>
          <div className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-xl">
            <div className="relative flex min-h-[260px] items-end overflow-hidden bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-600 p-6 sm:min-h-[340px] sm:p-10">
              {event.image && <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
              <div className="relative max-w-2xl text-white">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/75">Rich Dating Network events</p>
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/90"><Clock3 size={16} />{formatDate(event.startsAt, event.timezone)}</p>
              </div>
            </div>
            <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_310px]">
              <section>
                <div className="flex flex-wrap gap-3 text-sm font-semibold text-gray-700">
                  <span className="rounded-full bg-rose-50 px-3 py-2 text-rose-700"><MapPin size={15} className="mr-1 inline" />{event.location || "Private venue"}</span>
                  <span className="rounded-full bg-gray-100 px-3 py-2"><Users size={15} className="mr-1 inline" />{event.remaining === null ? "Spaces available" : `${event.remaining} spaces left`}</span>
                </div>
                <p className="mt-6 whitespace-pre-line text-base leading-8 text-gray-600">{event.description || "A curated members-only experience."}</p>
                <div className="mt-8 rounded-3xl bg-gray-50 p-5">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900"><Users size={19} className="text-rose-500" /> Members joining</h2>
                  <AttendeePreview event={event} />
                  <p className="mt-3 text-xs leading-5 text-gray-500">We show a limited preview for privacy. Confirmed paid members are added after payment, alongside a small set of community profiles.</p>
                </div>
              </section>
              <aside className="h-fit rounded-3xl border border-rose-100 bg-gradient-to-b from-white to-rose-50/60 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Your ticket</p>
                <p className="mt-2 text-3xl font-black text-gray-900">{localPrice(event)}</p>
                <p className="mt-1 text-sm text-gray-500">US$ {Number(event.priceUsd || event.ticketPrice || 200).toFixed(2)} base price · local estimate</p>
                <div className="my-5 h-px bg-rose-100" />
                {isConfirmed ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-bold text-emerald-700"><CheckCircle2 size={18} /> You are confirmed</div>
                    <button onClick={() => cancelAttendance(event)} disabled={actionLoading} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">{actionLoading ? "Updating…" : "Cancel attendance"}</button>
                  </div>
                ) : isWaitlisted ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Payment received. You are on the waitlist because the event is full.</div>
                    <button onClick={() => cancelAttendance(event)} disabled={actionLoading} className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">{actionLoading ? "Updating…" : "Leave waitlist"}</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {manualGateways.length > 0 && (
                      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                        <button onClick={() => setActivePaymentTab("auto")} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${activePaymentTab === "auto" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                          {providerInfo.icon} {providerInfo.name}
                        </button>
                        <button onClick={() => setActivePaymentTab("manual")} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${activePaymentTab === "manual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                          🏦 Manual transfer
                        </button>
                      </div>
                    )}

                    {activePaymentTab === "auto" ? (
                      <>
                        {hasLocalMethod && (
                          <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                            <button onClick={() => setUseCard(false)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${!useCard ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                              {PROVIDER_INFO[provider]?.icon} {PROVIDER_INFO[provider]?.name}
                            </button>
                            <button onClick={() => setUseCard(true)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${useCard ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                              💳 Pay by card
                            </button>
                          </div>
                        )}
                        {paymentStep === "phone" ? (
                          <div className="space-y-3 rounded-2xl bg-white p-1">
                            <div className="text-center">
                              <div className="text-3xl">📱</div>
                              <p className="mt-1 text-sm font-black text-gray-900">Pay with M-Pesa</p>
                              <p className="mt-1 text-xs text-gray-500">Enter your phone number and we will send an STK push.</p>
                            </div>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0712345678" className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-rose-400" />
                            <div className="flex gap-2">
                              <button onClick={() => setPaymentStep("idle")} className="flex-1 rounded-xl border border-gray-200 px-3 py-3 text-xs font-bold text-gray-600">Back</button>
                              <button onClick={() => startCheckout(event, true)} disabled={!phone.trim() || actionLoading} className="flex-[2] rounded-xl bg-emerald-600 px-3 py-3 text-xs font-black text-white disabled:opacity-50">
                                {actionLoading ? "Sending…" : "Send M-Pesa request"}
                              </button>
                            </div>
                          </div>
                        ) : paymentStep === "polling" ? (
                          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
                            <div className="text-3xl">📲</div>
                            <p className="mt-1 text-sm font-black text-emerald-900">Check your phone</p>
                            <p className="mt-1 text-xs leading-5 text-emerald-800">Enter your M-Pesa PIN to complete payment.</p>
                            <p className="mt-2 text-xs text-emerald-700">Waiting… {countdown}s</p>
                          </div>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold" style={{ color: providerInfo.color }}>
                              <span>{providerInfo.icon}</span> Paying with {providerInfo.name}
                            </div>
                            <button onClick={() => startCheckout(event)} disabled={actionLoading || event.remaining === 0} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50">
                              {actionLoading ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
                              {event.remaining === 0 ? "Event is full" : "Pay and reserve your place"}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Select payment method</p>
                        {manualGateways.map((gateway) => (
                          <button key={gateway.id} onClick={() => setSelectedGateway(gateway)} className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left ${selectedGateway?.id === gateway.id ? "border-rose-500 bg-rose-50" : "border-gray-200 bg-white"}`}>
                            <span className="text-xl">{gateway.logo || "💳"}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-gray-900">{gateway.name}</span>
                              {gateway.description && <span className="mt-1 block text-xs leading-4 text-gray-500">{gateway.description}</span>}
                              <span className="mt-1 block text-[11px] text-gray-400">Review within {gateway.reviewTime}h</span>
                            </span>
                            {selectedGateway?.id === gateway.id && <span className="font-black text-rose-600">✓</span>}
                          </button>
                        ))}
                        {selectedGateway && (
                          <>
                            <textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={3} placeholder={selectedGateway.proofLabel || "Enter transaction ID or payment proof"} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-rose-400" />
                            <button onClick={() => startCheckout(event)} disabled={actionLoading || !proof.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">
                              {actionLoading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
                              Submit payment proof
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-4 text-center text-xs leading-5 text-gray-500">Secure checkout. Your place is only confirmed after the payment provider confirms payment.</p>
              </aside>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/70 via-gray-50 to-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:py-10">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-600">Members-only experiences</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-5xl">Meet beyond the screen.</h1>
          <p className="mt-3 text-base leading-7 text-gray-600">Curated events for verified members. See who is joining, reserve your place, and keep the full attendee list private.</p>
        </div>
        {myEvents.length > 0 && (
          <section className="mb-8 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Your plans</p><h2 className="mt-1 text-xl font-black text-gray-900">My events</h2></div>
              <CheckCircle2 className="text-emerald-600" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {myEvents.map((item) => (
                <Link key={item.id} href={`/events/${item.id}`} className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
                  <p className="font-black text-gray-900">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{formatDate(item.startsAt, item.timezone)}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700">{item.attendanceStatus === "waitlisted" ? "Waitlisted" : "Confirmed"}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
        {events.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">{events.map((item) => <EventCard key={item.id} event={item} />)}</div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Calendar className="mx-auto mb-4 text-rose-400" size={34} />
            <h2 className="text-xl font-black text-gray-900">New events are coming soon</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">We are preparing the next curated experience. Check back soon.</p>
          </div>
        )}
      </div>
    </main>
  )
}