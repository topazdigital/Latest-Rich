import { useState } from "react"
import { Link } from "wouter"
import { Heart, Mail, MessageSquare, Clock, CheckCircle } from "lucide-react"

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
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <Heart size={14} className="text-white fill-white" />
          </div>
          <span className="font-bold text-gray-900">Rich Dating Network</span>
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Have a question, need help, or want to report something? Our support team is here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Info cards */}
          <div className="space-y-4">
            <div className="border border-gray-100 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Mail size={20} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Email Support</h3>
              <p className="text-sm text-gray-500">For all inquiries, reach us at:</p>
              <a href="mailto:contact@richdatingnetwork.com" className="text-red-500 font-semibold text-sm break-all hover:underline">
                contact@richdatingnetwork.com
              </a>
            </div>

            <div className="border border-gray-100 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock size={20} className="text-amber-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Response Time</h3>
              <p className="text-sm text-gray-500">We typically respond within <strong>24–48 hours</strong> on business days.</p>
            </div>

            <div className="border border-gray-100 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <MessageSquare size={20} className="text-green-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Common Topics</h3>
              <ul className="text-sm text-gray-500 space-y-1">
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
              <div className="border border-green-200 bg-green-50 rounded-2xl p-10 text-center space-y-4">
                <CheckCircle size={48} className="text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-900">Message Sent!</h2>
                <p className="text-gray-500">
                  Thank you for reaching out. We'll reply to <strong>{form.email}</strong> within 24–48 hours.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }) }}
                  className="text-red-500 font-semibold text-sm hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="border border-gray-100 rounded-2xl p-8 space-y-5">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Send a Message</h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Jane Smith"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                  <select
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition bg-white"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue or question in detail…"
                    rows={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl text-sm hover:from-red-600 hover:to-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending…" : "Send Message →"}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Or email us directly at{" "}
                  <a href="mailto:contact@richdatingnetwork.com" className="text-red-500 hover:underline">
                    contact@richdatingnetwork.com
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { q: "I paid via Mpesa but didn't get my credits — what do I do?", a: "Credits are usually added within 15 minutes automatically. If they still don't appear, contact us with your Mpesa transaction code and we'll sort it immediately." },
              { q: "How do I verify my profile?", a: "Go to Settings → Verification and upload a clear photo holding a handwritten note with your username and the date. Our team reviews within 24 hours." },
              { q: "Can I get a refund?", a: "We review refund requests case-by-case. Contact us within 7 days of purchase with your payment reference and reason." },
              { q: "How do I report a fake or abusive profile?", a: "Use the Report button on any profile, or send us the username/profile link via this contact form with details." },
              { q: "How does premium membership work?", a: "Premium unlocks unlimited messaging, profile boosts, read receipts, and access to all members. Subscribe via Credits → Premium in your account." },
              { q: "Is Rich Dating Network available in my country?", a: "Yes! We're available worldwide with payment options for Kenya (Mpesa), Nigeria, Ghana, South Africa, Philippines, USA, UK, Europe and more." },
            ].map(({ q, a }) => (
              <div key={q} className="border border-gray-100 rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-100 mt-16 py-8 px-4 text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <a href="mailto:contact@richdatingnetwork.com" className="hover:text-gray-600">contact@richdatingnetwork.com</a>
        </div>
        <p className="mt-3">© {new Date().getFullYear()} Rich Dating Network. All rights reserved.</p>
      </footer>
    </div>
  )
}
