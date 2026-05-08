import { Switch, Route, Router as WouterRouter, useLocation } from "wouter"
import { Toaster } from "react-hot-toast"
import { useEffect, useState, useCallback } from "react"

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
import MainNav from "./components/layout/MainNav"
import SEOHead from "./components/layout/SEOHead"
import WelcomeModal from "./components/common/WelcomeModal"
import ProfileQuestionsModal from "./components/common/ProfileQuestionsModal"
import VideoCallModal from "./components/common/VideoCallModal"
import NotFound from "./pages/not-found"
import { getStoredAuth } from "./lib/auth"

const PROTECTED_PREFIXES = ["/home", "/discover", "/meet", "/chat", "/profile", "/notifications", "/settings", "/premium", "/credits", "/gifts", "/visitors", "/likes", "/boost", "/referrals"]
const ADMIN_PREFIXES = ["/admin"]
const MODERATOR_PREFIXES = ["/moderator"]

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const isProtected = PROTECTED_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
    const isAdmin = ADMIN_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
    const isModerator = MODERATOR_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
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
  const showNav = !isAdmin && PROTECTED_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
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
    fetch(`/api/users/by-username/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(d => {
        if (d.id) setUserId(String(d.id))
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
  }, [params.username])

  if (notFound) return <NotFound />
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
      <WelcomeController />
      <ProfileQuestionsController />
      <VideoCallController />
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
            {(params: { id: string }) => <ChatPage params={params} />}
          </Route>
          <Route path="/profile" component={MyProfile} />
          <Route path="/profile/:id">
            {(params: { id: string }) => <ProfilePage params={params} />}
          </Route>
          {/* Username-based profile URLs: /@username */}
          <Route path="/@:username">
            {(params: { username: string }) => <UsernameProfilePage params={params} />}
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
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/:rest*" component={AdminPage} />
          <Route path="/moderator" component={ModeratorPage} />
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
