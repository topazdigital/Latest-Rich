import { useState } from "react"
import { Link } from "wouter"
import { Heart, Mail, Clock, CheckCircle, ChevronDown } from "lucide-react"

const FAQS = [
  { q: "I paid via Mpesa but didn't get my credits?", a: "Credits are usually added within 15 minutes. If not, contact us with your Mpesa transaction code." },
  { q: "How do I verify my profile?", a: "Go to Settings → Verification and upload a clear photo holding a note with your username and date." },
  { q: "Can I get a refund?", a: "We review requests case-by-case. Contact us within 7 days of purchase with your payment reference." },
  { q: "How do I report a fake or abusive profile?", a: "Use the Report button on any profile, or send us the username/link via this form." },
  { q: "How does premium membership work?", a: "Premium unlocks unlimited messaging, boosts, and read receipts. Subscribe via Credits → Premium." },
  { q: "Is Rich Dating Network available in my country?", a: "Yes — available worldwide with payment options for Kenya, Nigeria, South Africa, Philippines, USA, UK, Europe and more." },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
      >
        <span>{q}</span>
        <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-2">
          {a}
        </div>
      )}
    </div>
  )
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields.")
      return
    }
    setSending(true)
    setError("")
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (r.ok) {
        setSent(true)
      } else {
        setError(d.error || "Failed to send message. Please try again.")
      }
    } catch {
      setError("Network error. Please try again or email us directly.")
    }
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <Heart size={13} className="text-white fill-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Rich Dating Network</span>
        </Link>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Contact Support</h1>
          <p className="text-sm text-gray-500">Questions, billing help, or anything else — we're here.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Info column */}
          <div className="flex flex-col gap-3">
            <div className="border border-gray-100 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Mail size={15} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Email Support</h3>
                <a href="mailto:contact@richdatingnetwork.com" className="text-red-500 text-xs hover:underline break-all">
                  contact@richdatingnetwork.com
                </a>
              </div>
            </div>

            <div className="border border-gray-100 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock size={15} className="text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Response Time</h3>
                <p className="text-xs text-gray-500 mt-0.5">Within <strong>24–48 hours</strong> on business days.</p>
              </div>
            </div>

            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">Common Topics</h3>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Account & billing issues</li>
                <li>• Payment & credits help</li>
                <li>• Profile verification</li>
                <li>• Report a user or bug</li>
                <li>• Partnership inquiries</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            {sent ? (
              <div className="border border-green-200 bg-green-50 rounded-xl p-8 text-center space-y-3">
                <CheckCircle size={40} className="text-green-500 mx-auto" />
                <h2 className="text-xl font-bold text-gray-900">Message Sent!</h2>
                <p className="text-gray-500 text-sm">
                  We'll reply to <strong>{form.email}</strong> within 24–48 hours.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }) }}
                  className="text-red-500 font-semibold text-sm hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="border border-gray-100 rounded-xl p-5 space-y-4">
                <h2 className="text-base font-bold text-gray-900">Send a Message</h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-xs">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Topic</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition bg-white"
                  >
                    <option value="">Select a topic…</option>
                    <option value="Payment / Credits Issue">Payment / Credits Issue</option>
                    <option value="Account Problem">Account Problem</option>
                    <option value="Profile Verification">Profile Verification</option>
                    <option value="Report a User">Report a User</option>
                    <option value="Premium Membership">Premium Membership</option>
                    <option value="Partnership / Advertising">Partnership / Advertising</option>
                    <option value="Technical Bug">Technical Bug</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue or question in detail…"
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-2.5 rounded-lg text-sm hover:from-red-600 hover:to-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending…" : "Send Message →"}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Or email us at{" "}
                  <a href="mailto:contact@richdatingnetwork.com" className="text-red-500 hover:underline">
                    contact@richdatingnetwork.com
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* FAQ — collapsible accordion */}
        <div className="mt-6">
          <h2 className="text-base font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-4 px-4 text-center text-xs text-gray-400 flex-shrink-0">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-1">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <a href="mailto:contact@richdatingnetwork.com" className="hover:text-gray-600">contact@richdatingnetwork.com</a>
        </div>
        <p>© {new Date().getFullYear()} Rich Dating Network. All rights reserved.</p>
      </footer>
    </div>
  )
}
