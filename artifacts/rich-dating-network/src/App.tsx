import { Switch, Route, Router as WouterRouter, useLocation } from "wouter"
import { Toaster } from "react-hot-toast"
import { useEffect, useContext } from "react"

import { AuthContext, useAuth, useAuthState } from "./hooks/useAuth"
import LandingPage from "./components/landing/LandingPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
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
import MainNav from "./components/layout/MainNav"
import NotFound from "./pages/not-found"

const PROTECTED_PREFIXES = ["/home", "/discover", "/meet", "/chat", "/profile", "/notifications", "/settings", "/premium", "/credits"]
const AUTH_ONLY = ["/", "/login", "/register"]

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    const isProtected = PROTECTED_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
    const isAuthOnly = AUTH_ONLY.includes(location)
    if (!user && isProtected) setLocation("/login")
    else if (user && isAuthOnly) setLocation("/home")
  }, [user, loading, location])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const showNav = PROTECTED_PREFIXES.some(p => location === p || location.startsWith(p + "/"))
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
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
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
          duration: 3000,
          style: { borderRadius: "12px", fontSize: "14px" },
        }}
      />
    </AuthContext.Provider>
  )
}

export default App
