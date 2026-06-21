import { Switch, Route, Router as WouterRouter, useLocation } from "wouter"
import { Toaster } from "react-hot-toast"
import { useEffect, useState, useCallback } from "react"
import { usePWAInstall } from "./hooks/usePWAInstall"

import { AuthContext, useAuth, useAuthState } from "./hooks/useAuth"
import LandingPage from "./components/landing/LandingPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import VerifyEmailPage from "./pages/VerifyEmailPage"
import HomePage from "./pages/HomePage"
import DiscoverPage from "./pages/DiscoverPage"
import MeetPageWrapper from "./pages/MeetPageWrapper"
import ChatListPage from "./pages/ChatListPage"
import ChatPage from "./pages/ChatPage"
import ProfilePage from "./pages/ProfilePage"
import NotificationsPage from "./pages/NotificationsPage"
import SettingsPageWrapper from "./pages/SettingsPageWrapper"
import PremiumPageWrapper from "./pages/PremiumPageWrapper"
import CreditsPageWrapper from "./pages/CreditsPageWrapper"
import TermsPage from "./pages/TermsPage"
import PrivacyPage from "./pages/PrivacyPage"
import AdminPage from "./pages/AdminPage"
import ModeratorPage from "./pages/ModeratorPage"
import GiftsPage from "./pages/GiftsPage"
import VisitorsPage from "./pages/VisitorsPage"
import LikesPage from "./pages/LikesPage"
import BoostPage from "./pages/BoostPage"
import ReferralsPage from "./pages/ReferralsPage"
import ContactPage from "./pages/ContactPage"
import MainNav from "./components/layout/MainNav"
import SEOHead from "./components/layout/SEOHead"
import WelcomeModal from "./components/common/WelcomeModal"
import NewSiteModal from "./components/common/NewSiteModal"
import ProfileQuestionsModal from "./components/common/ProfileQuestionsModal"
import VideoCallModal from "./components/common/VideoCallModal"
import NotFound from "./pages/not-found"
import { getStoredAuth, authFetch } from "./lib/auth"

const PROTECTED_PREFIXES = ["/home", "/discover", "/meet", "/chat", "/profile", "/@", "/notifications", "/settings", "/premium", "/credits", "/gifts", "/visitors", "/likes", "/boost", "/referrals"]
const ADMIN_PREFIXES = ["/admin"]
const MODERATOR_PREFIXES = ["/moderator"]

function matchesPrefix(location: string, prefixes: string[]) {
  return prefixes.some(p =>
    p === "/@"
      ? location.startsWith("/@")
      : location === p || location.startsWith(p + "/")
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const isProtected = matchesPrefix(location, PROTECTED_PREFIXES)
    const isAdmin = matchesPrefix(location, ADMIN_PREFIXES)
    const isModerator = matchesPrefix(location, MODERATOR_PREFIXES)
    const isUsernameProfile = location.startsWith("/@")
    if (!user && (isProtected || isAdmin || isModerator)) setLocation("/login")
    else if (user && (location === "/" || location === "/login" || location === "/register")) setLocation("/discover")
    else if (user && isAdmin && (user.admin ?? 0) < 2) setLocation("/discover")
    else if (user && isModerator && (user.admin ?? 0) < 1) setLocation("/discover")
  }, [user, loading, location])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-pink-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl animate-pulse">
            <span className="text-3xl">❤️</span>
          </div>
          <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-white/70 font-medium">Loading your matches…</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const isAdmin = location.startsWith("/admin") || location.startsWith("/moderator")
  const showNav = !isAdmin && matchesPrefix(location, PROTECTED_PREFIXES)
  return (
    <div className={showNav ? "pt-14 pb-16 md:pb-0 min-h-screen bg-gray-50" : ""}>
      {showNav && <MainNav />}
      {children}
    </div>
  )
}

function WelcomeController() {
  const { user } = useAuth()
  const [location] = useLocation()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (!user) return
    const shouldShow = localStorage.getItem('show_welcome') === '1'
    if (shouldShow && (location === '/home' || location === '/discover')) {
      localStorage.removeItem('show_welcome')
      setTimeout(() => setShowWelcome(true), 800)
    }
  }, [user, location])

  if (!showWelcome || !user) return null
  return <WelcomeModal userName={user.name} onClose={() => setShowWelcome(false)} />
}

// Shows new-site onboarding for existing users who have no phone or haven't seen it yet
function NewSiteOnboardingController() {
  const { user } = useAuth()
  const [location] = useLocation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user) return
    // Only show on main app pages, not immediately on login
    const isAppPage = (location === '/discover' || location === '/home' || location === '/meet')
    if (!isAppPage) return
    // Only show once per browser session (or until dismissed permanently)
    const done = localStorage.getItem('new_site_onboarding_done') === '1'
    const isNewReg = localStorage.getItem('show_welcome') === '1'
    if (done || isNewReg) return
    // Show for users that registered before the new site (no phone or flag set)
    const hasPhone = !!(user as any).phone
    const seenBefore = localStorage.getItem('new_site_seen') === '1'
    if (!seenBefore && (!hasPhone || true)) {
      // Show once per account (keyed by user id)
      const shownKey = `new_site_shown_${user.id}`
      if (localStorage.getItem(shownKey) === '1') return
      setTimeout(() => setShow(true), 1200)
    }
  }, [user, location])

  if (!show || !user) return null
  return (
    <NewSiteModal
      userName={(user as any).name || 'there'}
      hasPhone={!!(user as any).phone}
      onClose={() => {
        setShow(false)
        localStorage.setItem(`new_site_shown_${user.id}`, '1')
        localStorage.setItem('new_site_onboarding_done', '1')
      }}
    />
  )
}

// Shows profile completion questions after new registration
function ProfileQuestionsController() {
  const { user } = useAuth()
  const [location] = useLocation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user) return
    const shouldShow = localStorage.getItem('show_profile_questions') === '1'
    if (shouldShow && (location === '/home' || location === '/discover')) {
      localStorage.removeItem('show_profile_questions')
      // Small delay so welcome modal can show first
      setTimeout(() => setShow(true), 4000)
    }
  }, [user, location])

  if (!show || !user) return null
  return (
    <ProfileQuestionsModal
      onClose={() => setShow(false)}
      onComplete={() => setShow(false)}
    />
  )
}

// Polls for incoming fake video calls every 30 seconds
function VideoCallController() {
  const { user } = useAuth()
  const [location] = useLocation()
  const [activeCaller, setActiveCaller] = useState<any | null>(null)
  const isProtected = PROTECTED_PREFIXES.some(p => location === p || location.startsWith(p + "/"))

  const checkForCall = useCallback(async () => {
    if (!user || !isProtected) return
    const auth = getStoredAuth()
    if (!auth?.token) return
    try {
      const res = await fetch('/api/video-calls/pending', {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      const data = await res.json()
      if (data.call && !activeCaller) {
        setActiveCaller(data.call)
      }
    } catch { }
  }, [user, isProtected, activeCaller])

  useEffect(() => {
    if (!user || !isProtected) return
    checkForCall()
    const timer = setInterval(checkForCall, 30000)
    return () => clearInterval(timer)
  }, [user, isProtected, location])

  if (!activeCaller) return null
  return (
    <VideoCallModal
      caller={activeCaller}
      onClose={() => setActiveCaller(null)}
    />
  )
}

function PWAInstallBanner() {
  const { canInstall, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_banner_dismissed') === '1')

  if (!canInstall || dismissed) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-2xl">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0 text-lg">❤️</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Install Rich Dating</p>
          <p className="text-xs text-gray-400 leading-tight mt-0.5">Add to home screen for the best experience</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setDismissed(true); localStorage.setItem('pwa_banner_dismissed', '1') }}
            className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1">
            Later
          </button>
          <button
            onClick={async () => { const ok = await install(); if (!ok) setDismissed(true) }}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors">
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

function iOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as any).standalone
}

function IOSInstallBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('ios_pwa_dismissed') === '1')

  useEffect(() => {
    if (!dismissed && iOSDevice()) setShow(true)
  }, [dismissed])

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl relative">
        <button
          onClick={() => { setDismissed(true); localStorage.setItem('ios_pwa_dismissed', '1') }}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-lg leading-none">✕</button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-lg flex-shrink-0">❤️</div>
          <div>
            <p className="text-sm font-semibold">Install Rich Dating Network</p>
            <p className="text-xs text-gray-400">Add to your home screen</p>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-3 text-xs text-gray-300">
            <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold flex-shrink-0 text-[10px]">1</span>
            <span>Tap the <span className="text-white font-semibold">Share</span> button
              <svg className="inline ml-1 mb-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              at the bottom of Safari
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-300">
            <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold flex-shrink-0 text-[10px]">2</span>
            <span>Scroll down and tap <span className="text-white font-semibold">"Add to Home Screen"</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-300">
            <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold flex-shrink-0 text-[10px]">3</span>
            <span>Tap <span className="text-white font-semibold">"Add"</span> — done!</span>
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rotate-45" />
      </div>
    </div>
  )
}

function DynamicFavicon() {
  useEffect(() => {
    fetch('/api/branding/public').then(r => r.json()).then((d: Record<string, string>) => {
      if (d.branding_favicon) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
        link.href = d.branding_favicon
      }
      if (d.site_name && !document.title.includes(d.site_name)) {
        document.title = document.title.replace('Rich Dating Network', d.site_name)
      }
    }).catch(() => {})
  }, [])
  return null
}

function AnalyticsInjector() {
  useEffect(() => {
    fetch('/api/admin/public-config').then(r => r.json()).then((cfg: Record<string, string>) => {
      const clarityId = cfg.clarity_project_id?.trim()
      if (clarityId && !document.getElementById('ms-clarity')) {
        const s = document.createElement('script')
        s.id = 'ms-clarity'
        s.type = 'text/javascript'
        s.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`
        document.head.appendChild(s)
      }
      const gaId = cfg.google_analytics_id?.trim()
      if (gaId && !document.getElementById('ga-gtag')) {
        const s1 = document.createElement('script')
        s1.id = 'ga-gtag'
        s1.async = true
        s1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
        document.head.appendChild(s1)
        const s2 = document.createElement('script')
        s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`
        document.head.appendChild(s2)
      }
    }).catch(() => {})
  }, [])
  return null
}

function MyProfile() {
  const { user } = useAuth()
  return user ? <ProfilePage params={{ id: String(user.id) }} /> : null
}

// Resolve /@username to profile page
function UsernameProfilePage({ params }: { params: { username: string } }) {
  const [, setLocation] = useLocation()
  const [userId, setUserId] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const username = params.username.replace(/^@/, '')
    authFetch(`/api/users/by-username/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(d => {
        if (d.id) setUserId(String(d.id))
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [params.username])

  if (notFound) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
        <p className="text-gray-500 text-sm mb-6">
          The profile <span className="font-mono text-gray-700">@{params.username}</span> doesn't exist or has been removed.
        </p>
        <button
          onClick={() => setLocation("/discover")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm"
        >
          Browse Profiles
        </button>
      </div>
    </div>
  )
  if (!userId) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return <ProfilePage params={{ id: userId }} />
}

function Router() {
  return (
    <AuthGuard>
      <SEOHead />
      <DynamicFavicon />
      <AnalyticsInjector />
      <WelcomeController />
      <NewSiteOnboardingController />
      <ProfileQuestionsController />
      <VideoCallController />
      <PWAInstallBanner />
      <IOSInstallBanner />
      <AppLayout>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/verify-email" component={VerifyEmailPage} />
          <Route path="/home" component={HomePage} />
          <Route path="/discover" component={DiscoverPage} />
          <Route path="/meet" component={MeetPageWrapper} />
          <Route path="/chat" component={ChatListPage} />
          <Route path="/chat/:id">
            {(params: { id: string }) => <ChatPage key={params.id} params={params} />}
          </Route>
          <Route path="/profile" component={MyProfile} />
          <Route path="/profile/:id">
            {(params: { id: string }) => <ProfilePage params={params} />}
          </Route>
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/settings" component={SettingsPageWrapper} />
          <Route path="/premium" component={PremiumPageWrapper} />
          <Route path="/credits" component={CreditsPageWrapper} />
          <Route path="/gifts" component={GiftsPage} />
          <Route path="/visitors" component={VisitorsPage} />
          <Route path="/likes" component={LikesPage} />
          <Route path="/boost" component={BoostPage} />
          <Route path="/referrals" component={ReferralsPage} />
          <Route path="/ref/:code" component={ReferralsPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/:rest*" component={AdminPage} />
          <Route path="/moderator" component={ModeratorPage} />
          {/* Username-based profile URLs: /@username — must come last so it
              doesn't shadow any of the named routes above.
              Wouter/regexparam doesn't treat @ as a valid param prefix, so
              /@:username never matches; we use /:atusername and check for @. */}
          <Route path="/:atusername">
            {(params: { atusername: string }) =>
              params.atusername?.startsWith('@')
                ? <UsernameProfilePage params={{ username: params.atusername.slice(1) }} />
                : <NotFound />
            }
          </Route>
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </AuthGuard>
  )
}

function App() {
  const auth = useAuthState()
  return (
    <AuthContext.Provider value={auth}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      />
    </AuthContext.Provider>
  )
}

export default App
