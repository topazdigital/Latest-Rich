import { AlertCircle, Home } from "lucide-react"
import { useLocation } from "wouter"

export default function NotFound() {
  const [, setLocation] = useLocation()
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-gray-500 text-sm mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => setLocation("/discover")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm"
        >
          <Home size={16} />
          Go to Discover
        </button>
      </div>
    </div>
  )
}
