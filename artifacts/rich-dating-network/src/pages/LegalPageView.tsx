import { Link } from "wouter"
import { Heart } from "lucide-react"
import type { LegalPageDocument } from "../lib/legal-pages"
import { renderLegalContent } from "../lib/legal-pages"

export default function LegalPageView({ document }: { document: LegalPageDocument }) {
  const isTerms = document.slug === "terms"
  const date = document.updatedAt ? new Date(document.updatedAt) : null
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center">
            <Heart size={14} className="text-white fill-white" />
          </div>
          <span className="font-bold text-gray-900">Rich Dating Network</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.title}</h1>
        {dateLabel && <p className="text-sm text-gray-400 mb-6">Last updated: {dateLabel}</p>}

        <article className="legal-document prose prose-gray max-w-none text-gray-600">
          {renderLegalContent(document.content)}
        </article>
      </main>

      <footer className="border-t border-gray-100 py-6 px-4 text-center text-xs text-gray-400">
        <nav aria-label="Legal pages" className="flex items-center justify-center gap-4 flex-wrap mb-1">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          {isTerms
            ? <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
            : <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>}
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
        </nav>
        <p>© {new Date().getFullYear()} Rich Dating Network Limited. All rights reserved.</p>
      </footer>
    </div>
  )
}
