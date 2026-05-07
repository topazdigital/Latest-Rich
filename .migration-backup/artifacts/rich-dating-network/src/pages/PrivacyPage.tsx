import { Link } from 'wouter'
import { Heart } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center"><Heart size={14} className="text-white fill-white" /></div>
          <span className="font-bold text-gray-900">Rich Dating Network</span>
        </Link>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-gray max-w-none text-gray-600 space-y-4">
          <p>Your privacy is important to us at Rich Dating Network.</p>
          <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
          <p>We collect information you provide during registration, including your name, email, and profile details.</p>
          <h2 className="text-xl font-semibold text-gray-900">How We Use Your Information</h2>
          <p>Your information is used to operate the service, match you with compatible members, and improve our platform.</p>
          <h2 className="text-xl font-semibold text-gray-900">Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information.</p>
          <h2 className="text-xl font-semibold text-gray-900">Third Parties</h2>
          <p>We do not sell your personal data to third parties.</p>
          <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
          <p>For privacy concerns, contact us at support@richdatingnetwork.com</p>
        </div>
      </div>
    </div>
  )
}
