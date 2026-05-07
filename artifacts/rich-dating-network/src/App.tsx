import { Switch, Route, Router as WouterRouter, useLocation } from "wouter"
import { Toaster } from "react-hot-toast"
import { useEffect, useContext } from "react"

import { AuthContext, useAuth, useAuthState } from "./hooks/useAuth"
import LandingPage from "./components/landing/LandingPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
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
import GiftsPage from "./pages/GiftsPage"
import VisitorsPage from "./pages/VisitorsPage"
import LikesPage from "./pages/LikesPage"
import BoostPage from "./pages/BoostPage"
import MainNav from "./components/layout/MainNav"
import NotFound from "./pages/not-found"

const PROTECTED_PREFIXES = ["/home", "/discover", "/meet", "/chat", "/profile", "/notifications", "/settings", "/premium", "/credits", "/gifts", "/visitors", "/likes", "/boost"]
const AUTH_ONLY = ["/", "/login", "/register", "/forgot-password"]
const ADMIN_PREFIXES = ["/admin"]

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const isProtected = PROTECTED_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
    const isAuthOnly = AUTH_ONLY.includes(location) || location.startsWith("/forgot-password") || location.startsWith("/reset-password")
    const isAdmin = ADMIN_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
    if (!user && (isProtected || isAdmin)) setLocation("/login")
    else if (user && (location === "/" || location === "/login" || location === "/register")) setLocation("/home")
    else if (user && isAdmin && user.admin !== 1) setLocation("/home")
  }, [user, loading, location])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-pink-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl animate-pulse">
            <span className="text-3xl">❤️</span>
          </div>
          <div className="w-8 h-8 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-white/70 font-medium">Loading your matches...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const isAdmin = location.startsWith("/admin")
  const showNav = !isAdmin && PROTECTED_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
  return (
    <div className={showNav ? "pt-14 pb-16 md:pb-0 min-h-screen bg-gray-50" : ""}>
      {showNav && <MainNav />}
      {children}
    </div>
  )
}

function MyProfile() {
  const { user } = useAuth()
  return user ? <ProfilePage params={{ id: String(user.id) }} /> : null
}

function Router() {
  return (
    <AuthGuard>
      <AppLayout>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
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
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/settings" component={SettingsPageWrapper} />
          <Route path="/premium" component={PremiumPageWrapper} />
          <Route path="/credits" component={CreditsPageWrapper} />
          <Route path="/gifts" component={GiftsPage} />
          <Route path="/visitors" component={VisitorsPage} />
          <Route path="/likes" component={LikesPage} />
          <Route path="/boost" component={BoostPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/:rest*" component={AdminPage} />
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
