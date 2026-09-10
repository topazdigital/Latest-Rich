import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "wouter"
import { ArrowLeft, Calendar, CheckCircle2, Clock3, CreditCard, Loader2, MapPin, Users } from "lucide-react"
import toast from "react-hot-toast"
import { authFetch } from "../lib/auth"
import { getPhotoUrl } from "../lib/utils"

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
  const eventId = Number(params?.id || 0)
  const [, setLocation] = useLocation()
  const [events, setEvents] = useState<EventRecord[]>([])
  const [myEvents, setMyEvents] = useState<EventRecord[]>([])
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

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
    const params = new URLSearchParams(window.location.search)
    if (params.get("success")) toast.success("Payment received. Your event place is confirmed.")
    if (params.get("cancelled")) toast("Checkout cancelled", { icon: "↩️" })
  }, [])

  const title = useMemo(() => eventId ? (event?.title || "Event details") : "Meet in person", [eventId, event?.title])

  async function startCheckout(target: EventRecord) {
    setActionLoading(true)
    try {
      const res = await authFetch("/api/engagement/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "event", eventId: target.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Could not start checkout")
        return
      }
      if (data.url) window.location.assign(data.url)
      else toast.error("Payment provider did not return a checkout link")
    } catch {
      toast.error("Could not start checkout")
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
                  <button onClick={() => startCheckout(event)} disabled={actionLoading || event.remaining === 0} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50">
                    {actionLoading ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
                    {event.remaining === 0 ? "Event is full" : "Buy ticket"}
                  </button>
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