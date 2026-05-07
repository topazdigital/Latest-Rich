'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Shield, Star, Users, MessageCircle, Crown } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Rich Dating <span className="text-brand-500">Network</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium text-sm px-4 py-2 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-5">
              Join Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 gradient-brand text-white overflow-hidden relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['❤️','💎','✨','👑','🥂','💝'].map((e, i) => (
            <div key={i} className="absolute text-4xl opacity-20 animate-bounce"
              style={{ left: `${10 + i*15}%`, top: `${10 + (i%3)*25}%`, animationDelay: `${i*0.3}s`, animationDuration: `${2+i*0.5}s` }}>
              {e}
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6 text-sm">
            <Crown className="w-4 h-4" /> Exclusive Luxury Dating Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Where Affluent Singles<br />
            <span className="text-yellow-300">Find Real Love</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Join thousands of successful, wealthy singles looking for meaningful relationships.
            Premium matchmaking for those who deserve the best.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-brand-500 font-bold text-lg px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
              Start Free Today ❤️
            </Link>
            <Link href="/login" className="bg-white/20 backdrop-blur-sm text-white font-bold text-lg px-10 py-4 rounded-2xl border border-white/30 hover:bg-white/30 transition-all">
              Sign In
            </Link>
          </div>
          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-white/70">
            <span>✓ 100% Free to Join</span>
            <span>✓ Verified Profiles</span>
            <span>✓ Private & Secure</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: '7,000+', l: 'Members' },
            { n: '50K+', l: 'Connections' },
            { n: '180+', l: 'Countries' },
            { n: '98%', l: 'Satisfaction' },
          ].map((s, i) => (
            <div key={i} className="card p-6">
              <div className="text-3xl font-bold text-brand-500">{s.n}</div>
              <div className="text-sm text-gray-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
            Everything You Need to Find Love
          </h2>
          <p className="text-gray-500 text-center mb-12">Powerful features designed for modern daters</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Shield className="w-6 h-6 text-brand-500" />, t: 'Verified Profiles', d: 'Every profile is manually reviewed. Date with confidence knowing real people are behind each account.' },
              { icon: <MessageCircle className="w-6 h-6 text-brand-500" />, t: 'Real-time Chat', d: 'Instant messaging with read receipts, emoji, photos, and voice messages for deeper connection.' },
              { icon: <Star className="w-6 h-6 text-brand-500" />, t: 'Smart Matching', d: 'Our advanced algorithm learns your preferences and finds the most compatible partners for you.' },
              { icon: <Crown className="w-6 h-6 text-brand-500" />, t: 'Premium Features', d: 'Unlimited likes, see who viewed your profile, read receipts, and priority in search results.' },
              { icon: <Heart className="w-6 h-6 text-brand-500" />, t: 'Virtual Gifts', d: 'Send beautiful virtual gifts to show your interest and make a lasting impression.' },
              { icon: <Users className="w-6 h-6 text-brand-500" />, t: 'Active Community', d: 'Share stories, post updates, comment and connect with a vibrant community of singles.' },
            ].map((f, i) => (
              <div key={i} className="card p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.t}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', t: 'Create Profile', d: 'Sign up free and build your profile in minutes. Add photos and tell your story.' },
              { step: '02', t: 'Discover Matches', d: 'Browse profiles, use smart search, or let our algorithm suggest compatible matches.' },
              { step: '03', t: 'Start Connecting', d: 'Like, chat, send gifts, and go on video dates — all within the platform.' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full gradient-brand text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">{s.step}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.t}</h3>
                <p className="text-gray-500 text-sm">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 gradient-brand text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Find Your Match?</h2>
          <p className="text-white/80 mb-8 text-lg">Join Rich Dating Network today. It's completely free to start.</p>
          <Link href="/register" className="inline-block bg-white text-brand-500 font-bold text-lg px-12 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
            Join Now — It's Free! ❤️
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-white font-bold">Rich Dating Network</span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © {new Date().getFullYear()} Rich Dating Network. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
