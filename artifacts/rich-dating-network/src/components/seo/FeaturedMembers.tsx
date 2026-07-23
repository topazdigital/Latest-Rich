import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { getPhotoUrl } from '../../lib/utils'
import { Users } from 'lucide-react'

interface Member {
  id: number
  username: string | null
  name: string | null
  age: number | null
  city: string | null
  country: string | null
  photo: string | null
}

interface Props {
  city?: string
  country?: string
  heading?: string
  /** 1 = men only, 2 = women only, undefined = any */
  gender?: number
  /** Unique ID used to scope the ItemList JSON-LD tag — pass the page slug */
  jsonLdId?: string
}

export default function FeaturedMembers({ city, country, heading, gender, jsonLdId }: Props) {
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    const params = new URLSearchParams()
    if (city) params.set('city', city)
    if (country) params.set('country', country)
    if (gender) params.set('gender', String(gender))
    params.set('fakeOnly', '1')
    params.set('limit', '6')
    fetch(`/api/users/public/members?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setMembers(Array.isArray(data) ? data.slice(0, 6) : []))
      .catch(() => {})
  }, [city, country, gender])

  // ItemList JSON-LD — tells Google exactly which profiles appear on this page
  useEffect(() => {
    if (!members.length) return
    const elId = `fm-ld-${jsonLdId ?? 'page'}`
    let el = document.getElementById(elId) as HTMLScriptElement | null
    if (!el) {
      el = document.createElement('script')
      el.id = elId
      el.type = 'application/ld+json'
      document.head.appendChild(el)
    }
    el.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: heading || `Members${city ? ` in ${city}` : country ? ` in ${country}` : ''}`,
      itemListElement: members.map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: m.username
          ? `https://richdatingnetwork.com/@${m.username}`
          : `https://richdatingnetwork.com/profile/${m.id}`,
        name: [m.name, m.age, m.city].filter(Boolean).join(', '),
      })),
    })
    return () => { document.getElementById(elId)?.remove() }
  }, [members, jsonLdId, heading, city, country])

  if (!members.length) return null

  const label = city || country || 'our network'

  return (
    <div className="mt-14">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-[#FF192C]" />
        <h2 className="text-2xl font-bold">
          {heading || `Meet Members in ${label}`}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {members.map(m => {
          const href = m.username ? `/@${m.username}` : `/profile/${m.id}`
          const altText = [m.name, m.age, m.city].filter(Boolean).join(', ')
          return (
            <Link
              key={m.id}
              href={href}
              className="group block rounded-2xl overflow-hidden border border-gray-200 hover:border-[#FF192C] hover:shadow-lg transition-all"
            >
              <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
                <img
                  src={getPhotoUrl(m.photo)}
                  alt={altText}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="font-semibold text-sm truncate">
                    {m.name}{m.age ? `, ${m.age}` : ''}
                  </p>
                  {m.city && (
                    <p className="text-xs text-white/80 truncate">📍 {m.city}</p>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      <div className="mt-5 text-center">
        <Link
          href="/members"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF192C] hover:underline"
        >
          Browse all members →
        </Link>
      </div>
    </div>
  )
}
