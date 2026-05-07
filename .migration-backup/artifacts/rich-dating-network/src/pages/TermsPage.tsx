import { Link } from 'wouter'
import { Heart } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center"><Heart size={14} className="text-white fill-white" /></div>
          <span className="font-bold text-gray-900">Rich Dating Network</span>
        </Link>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
          <p>By using Rich Dating Network, you agree to these terms of service.</p>
          <h2 className="text-xl font-semibold text-gray-900">1. Eligibility</h2>
          <p>You must be at least 18 years of age to use this service.</p>
          <h2 className="text-xl font-semibold text-gray-900">2. User Conduct</h2>
          <p>Users must not post false information, harass others, or use the platform for illegal activities.</p>
          <h2 className="text-xl font-semibold text-gray-900">3. Privacy</h2>
          <p>We take your privacy seriously. Please review our Privacy Policy for details on data handling.</p>
          <h2 className="text-xl font-semibold text-gray-900">4. Payments</h2>
          <p>All purchases are final. Refunds are granted at our sole discretion.</p>
          <h2 className="text-xl font-semibold text-gray-900">5. Termination</h2>
          <p>We reserve the right to terminate accounts that violate these terms.</p>
        </div>
      </div>
    </div>
  )
}
