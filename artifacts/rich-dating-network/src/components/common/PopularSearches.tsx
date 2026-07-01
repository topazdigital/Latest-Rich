import { Link } from 'wouter'
import { SEO_LANDING_PAGES } from '../../data/seoLandingPages'

interface PopularSearchesProps {
  /** Slug of the current page (if on a keyword landing page) — excluded from the list. */
  excludeSlug?: string
  /** Max number of links to show. */
  limit?: number
  className?: string
}

export default function PopularSearches({ excludeSlug, limit = 24, className = '' }: PopularSearchesProps) {
  const pages = SEO_LANDING_PAGES.filter(p => p.slug !== excludeSlug).slice(0, limit)

  return (
    <section className={`px-4 py-8 bg-gray-50 border-t border-gray-100 ${className}`}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Popular Searches</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {pages.map(p => (
            <Link key={p.slug} href={`/${p.slug}`} className="text-gray-500 hover:text-brand-500 transition-colors whitespace-nowrap">
              {p.h1}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
