import { Link } from 'wouter'
import { Heart, Shield, Star, Users, MessageCircle, Crown } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
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
            <Link href="/register" className="bg-white text-brand-500 font-bold text-lg px-10 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 block text-center">
              Start Free Today ❤️
            </Link>
            <Link href="/login" className="bg-white/20 backdrop-blur-sm text-white font-bold text-lg px-10 py-4 rounded-2xl border border-white/30 hover:bg-white/30 transition-all block text-center">
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

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Rich Dating Network?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Shield className="w-6 h-6" />, title: 'Verified Profiles', desc: 'Every member is verified to ensure authenticity and safety.' },
              { icon: <Star className="w-6 h-6" />, title: 'Elite Matching', desc: 'Advanced algorithms connect you with compatible, successful singles.' },
              { icon: <MessageCircle className="w-6 h-6" />, title: 'Unlimited Chat', desc: 'Connect freely with real-time messaging and video calls.' },
              { icon: <Users className="w-6 h-6" />, title: 'Global Community', desc: 'Meet affluent singles from 180+ countries worldwide.' },
              { icon: <Crown className="w-6 h-6" />, title: 'VIP Features', desc: 'Premium tools to stand out and find your perfect match.' },
              { icon: <Heart className="w-6 h-6" />, title: 'Real Connections', desc: 'Thousands of success stories — find love that lasts.' },
            ].map((f, i) => (
              <div key={i} className="card p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 gradient-brand text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Crown className="w-12 h-12 mx-auto mb-6 text-yellow-300" />
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Perfect Match?</h2>
          <p className="text-white/80 mb-8 text-lg">Join the most exclusive dating network for successful singles.</p>
          <Link href="/register" className="bg-white text-brand-500 font-bold text-lg px-12 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all inline-block">
            Create Free Account 💝
          </Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-900 text-gray-400 text-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
          <span className="text-white font-semibold">Rich Dating Network</span>
        </div>
        <div className="flex gap-4 justify-center mb-4">
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
        <p>© {new Date().getFullYear()} Rich Dating Network. All rights reserved.</p>
      </footer>
    </div>
  )
}
