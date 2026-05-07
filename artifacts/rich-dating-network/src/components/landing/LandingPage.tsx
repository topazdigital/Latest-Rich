import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Heart, Shield, Star, Users, MessageCircle, Crown, MapPin, Zap, Check, ChevronRight } from 'lucide-react'

const TESTIMONIALS = [
  { name: 'Sarah M.', city: 'New York', text: 'Found my dream partner in just 2 weeks! The quality of members here is incredible.', avatar: '👩‍💼', rating: 5 },
  { name: 'James K.', city: 'London', text: 'Finally a dating platform that matches me with serious, successful people. Worth every penny.', avatar: '👨‍💻', rating: 5 },
  { name: 'Priya R.', city: 'Dubai', text: 'The location-based matching is genius. Met someone amazing just 10 miles away!', avatar: '👩‍🎨', rating: 5 },
]

const FEATURES = [
  { icon: MapPin, title: 'Location-Based Matches', desc: 'Find singles near you first, or explore matches worldwide with advanced location filters.' },
  { icon: Shield, title: 'Verified Profiles', desc: 'Every member is verified to ensure authenticity and your safety on the platform.' },
  { icon: Zap, title: 'Real-Time Messaging', desc: 'Instant chat with typing indicators, read receipts, and zero delays — powered by WebSockets.' },
  { icon: Star, title: 'Elite Matching', desc: 'Advanced algorithms connect you with compatible, successful singles based on preferences.' },
  { icon: Crown, title: 'VIP Features', desc: 'Premium tools to stand out, including unlimited swipes, superlikes, and priority placement.' },
  { icon: Heart, title: 'Real Connections', desc: 'Thousands of success stories. Find meaningful love that truly lasts.' },
]

const STATS = [
  { n: '7,000+', l: 'Members' },
  { n: '50K+', l: 'Connections' },
  { n: '180+', l: 'Countries' },
  { n: '98%', l: 'Satisfaction' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-md">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              Rich <span className={scrolled ? 'text-brand-500' : 'text-yellow-300'}>Dating</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className={`font-medium text-sm px-4 py-2 rounded-xl transition-all ${scrolled ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
              Sign In
            </Link>
            <Link href="/register" className={`font-semibold text-sm px-5 py-2 rounded-xl transition-all ${scrolled ? 'gradient-brand text-white shadow-md hover:shadow-lg hover:-translate-y-0.5' : 'bg-white text-brand-500 shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}>
              Join Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center gradient-brand overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['❤️', '💎', '✨', '👑', '🥂', '💝', '🌹', '💫'].map((e, i) => (
            <div key={i} className="absolute text-3xl md:text-4xl opacity-15 animate-bounce select-none"
              style={{
                left: `${8 + i * 12}%`,
                top: `${15 + (i % 4) * 20}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${2.5 + i * 0.3}s`
              }}>
              {e}
            </div>
          ))}
          {/* Decorative circles */}
          <div className="absolute top-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6 text-sm text-white">
              <Crown className="w-3.5 h-3.5 text-yellow-300" />
              <span>Exclusive Luxury Dating Platform</span>
              <span className="bg-yellow-300 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full ml-1">NEW</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1]">
              Where Affluent<br />
              Singles Find{' '}
              <span className="text-yellow-300 relative">
                Real Love
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none" style={{ height: '6px' }}>
                  <path d="M0 6 Q50 0 100 4 Q150 8 200 2" stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/80 max-w-xl mx-auto mb-8 leading-relaxed">
              Join thousands of successful, verified singles. 
              Real-time matching based on your location, preferences, and lifestyle.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <Link href="/register"
                className="bg-white text-brand-600 font-bold text-base md:text-lg px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1 inline-flex items-center justify-center gap-2 group">
                Start Free Today
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login"
                className="bg-white/15 backdrop-blur-sm border border-white/30 text-white font-semibold text-base md:text-lg px-8 py-4 rounded-2xl hover:bg-white/25 transition-all inline-flex items-center justify-center">
                Sign In
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> 100% Free to Join</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> Verified Profiles</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> Real-Time Messaging</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> Location-Based Matching</span>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full" preserveAspectRatio="none" style={{ height: '60px' }}>
            <path d="M0 80L60 68C120 56 240 32 360 26.7C480 21 600 35 720 37.3C840 40 960 32 1080 29.3C1200 27 1320 30 1380 31.3L1440 33V80H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s, i) => (
            <div key={i} className="group">
              <div className="text-3xl md:text-4xl font-bold text-brand-500 mb-1 group-hover:scale-110 transition-transform">{s.n}</div>
              <div className="text-sm text-gray-400 font-medium">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Star size={14} /> Why Choose Us
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need to Find Love</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">A premium dating experience built for successful people who know what they want.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card p-6 hover:shadow-lg transition-all hover:-translate-y-1 group border border-gray-100">
                <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform shadow-md">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap size={14} /> Simple Process
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">Find Love in 3 Easy Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Your Profile', desc: 'Sign up free and tell us about yourself — your interests, location, and what you\'re looking for.', icon: '📝' },
              { step: '02', title: 'Discover Matches', desc: 'See compatible singles near you first, or explore profiles worldwide with smart filters.', icon: '🔍' },
              { step: '03', title: 'Connect & Meet', desc: 'Chat in real-time, send gifts, and plan your first date. Love is just a message away!', icon: '❤️' },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-brand-200 to-transparent z-0 -translate-y-1/2" />
                )}
                <div className="relative z-10">
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="text-xs font-bold text-brand-500 mb-2 tracking-widest">STEP {s.step}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Real Success Stories</h2>
            <p className="text-gray-500">Join thousands who found their perfect match</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card p-6 border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-xl">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={10} /> {t.city}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 gradient-brand text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="text-5xl mb-6">💝</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Find Your Perfect Match?</h2>
          <p className="text-white/80 mb-8 text-lg">Join the most exclusive dating network for successful singles. Free to join, always.</p>
          <Link href="/register"
            className="bg-white text-brand-600 font-bold text-lg px-10 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1 inline-flex items-center gap-3">
            Create Free Account
            <ChevronRight size={20} />
          </Link>
          <p className="text-white/60 text-sm mt-5">No credit card required • Join in 30 seconds</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 bg-gray-950 text-gray-400">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="text-white font-bold">Rich Dating Network</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm justify-center">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Join Free</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Rich Dating Network. All rights reserved.</p>
            <p>Built with ❤️ for successful singles worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
