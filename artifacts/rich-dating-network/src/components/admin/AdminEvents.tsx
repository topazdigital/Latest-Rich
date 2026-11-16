import { useEffect, useState, type FormEvent } from "react"
import toast from "react-hot-toast"
import { CalendarDays, MapPin, Plus, RefreshCw } from "lucide-react"
import { authFetch } from "../../lib/auth"

type EventRow = {
  id: number
  title: string
  description?: string
  image?: string
  ticketPrice: number
  startsAt: number
  endTime: number
  location: string
  timezone?: string
  registrationDeadline?: number
  capacity?: number
  active: number
}

type EventForm = {
  title: string
  description: string
  image: string
  startsAt: string
  endTime: string
  location: string
  ticketPrice: string
  capacity: string
  registrationDeadline: string
}

const emptyForm = (): EventForm => ({
  title: "",
  description: "",
  image: "",
  startsAt: "",
  endTime: "",
  location: "",
  ticketPrice: "200",
  capacity: "0",
  registrationDeadline: "",
})

function toTimestamp(value: string): number {
  const milliseconds = new Date(value).getTime()
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : 0
}

function formatEventDate(timestamp: number, timezone = "Africa/Nairobi"): string {
  if (!timestamp) return "Date not set"
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(timestamp * 1000))
  } catch {
    return new Date(timestamp * 1000).toLocaleString()
  }
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [form, setForm] = useState<EventForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const loadEvents = async () => {
    setLoading(true)
    try {
      const response = await authFetch("/api/engagement/admin/events")
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.error || "Could not load events")
      setEvents(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load events")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  const updateForm = (key: keyof EventForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const postEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const startsAt = toTimestamp(form.startsAt)
    const endTime = toTimestamp(form.endTime)
    const registrationDeadline = form.registrationDeadline ? toTimestamp(form.registrationDeadline) : 0
    const ticketPrice = Number(form.ticketPrice)
    const capacity = Number(form.capacity)

    if (startsAt <= Math.floor(Date.now() / 1000)) {
      toast.error("Choose a future event start time")
      return
    }
    if (endTime <= startsAt) {
      toast.error("The event end time must be after its start time")
      return
    }
    if (!Number.isFinite(ticketPrice) || ticketPrice < 1) {
      toast.error("Ticket price must be at least 1 USD")
      return
    }
    if (!Number.isInteger(capacity) || capacity < 0) {
      toast.error("Capacity must be zero or a positive whole number")
      return
    }
    if (registrationDeadline && (registrationDeadline <= Math.floor(Date.now() / 1000) || registrationDeadline > startsAt)) {
      toast.error("Registration deadline must be before the event starts")
      return
    }

    setSaving(true)
    try {
      const response = await authFetch("/api/engagement/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          image: form.image.trim(),
          startsAt,
          endTime,
          location: form.location.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Nairobi",
          ticketPrice,
          capacity,
          registrationDeadline,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Could not post event")
      toast.success("Event posted")
      setForm(emptyForm())
      await loadEvents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post event")
    } finally {
      setSaving(false)
    }
  }

  const toggleEvent = async (event: EventRow) => {
    setUpdatingId(event.id)
    try {
      const response = await authFetch(`/api/engagement/admin/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: event.active === 1 ? 0 : 1 }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Could not update event")
      toast.success(event.active === 1 ? "Event unpublished" : "Event published")
      await loadEvents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update event")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-slate-800">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays size={22} className="text-rose-600" />
          <h2 className="text-xl font-extrabold">Events</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Post upcoming events and unpublish them when needed. Ended or unpublished events won’t appear in the app menu.
        </p>
      </div>

      <form onSubmit={postEvent} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-rose-600" />
          <h3 className="font-bold">Post an event</h3>
        </div>

        <label className="block text-sm font-semibold">
          Event title
          <input
            required
            maxLength={255}
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            placeholder="e.g. Nairobi Members Mixer"
          />
        </label>

        <label className="block text-sm font-semibold">
          Description
          <textarea
            maxLength={5000}
            rows={4}
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            placeholder="What should members know about the event?"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Starts at
            <input
              required
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => updateForm("startsAt", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Ends at
            <input
              required
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => updateForm("endTime", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
        </div>
        <p className="-mt-2 text-xs text-slate-500">Times use this device’s time zone.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Location
            <input
              required
              maxLength={255}
              value={form.location}
              onChange={(e) => updateForm("location", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              placeholder="City, venue, or Online"
            />
          </label>
          <label className="block text-sm font-semibold">
            Event image URL (optional)
            <input
              type="url"
              value={form.image}
              onChange={(e) => updateForm("image", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-semibold">
            Ticket price (USD)
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={form.ticketPrice}
              onChange={(e) => updateForm("ticketPrice", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Capacity (0 = unlimited)
            <input
              type="number"
              min="0"
              step="1"
              value={form.capacity}
              onChange={(e) => updateForm("capacity", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Registration deadline (optional)
            <input
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(e) => updateForm("registrationDeadline", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2.5 font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Posting…" : "Post event"}
        </button>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-bold">Posted events</h3>
          <button
            type="button"
            onClick={() => void loadEvents()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">No events have been posted yet.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const ended = Number(event.endTime || event.startsAt || 0) <= Math.floor(Date.now() / 1000)
              const status = ended ? "Ended" : event.active === 1 ? "Published" : "Unpublished"
              return (
                <article key={event.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold">{event.title}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status === "Published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {status}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <CalendarDays size={14} />
                      {formatEventDate(event.startsAt, event.timezone)}
                      {" – "}
                      {formatEventDate(event.endTime, event.timezone)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin size={14} /> {event.location || "Location not set"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleEvent(event)}
                    disabled={updatingId === event.id}
                    className={`rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50 ${event.active === 1 ? "border-slate-300 text-slate-700" : "border-rose-200 text-rose-700"}`}
                  >
                    {updatingId === event.id ? "Saving…" : event.active === 1 ? "Unpublish" : "Publish"}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
