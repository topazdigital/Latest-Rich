import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, X } from 'lucide-react'
import { authFetch } from '../../lib/auth'

interface LocationResult {
  city: string
  country: string
  countryCode?: string
}

interface Props {
  value: string
  country?: string
  onChange: (city: string, country: string, countryCode?: string) => void
  placeholder?: string
  className?: string
  label?: string
}

export default function LocationAutocomplete({ value, country, onChange, placeholder = 'Search city...', className = '', label }: Props) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState<LocationResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  const search = useCallback((q: string) => {
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/location/autocomplete?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setOpen(data.length > 0)
        setHighlighted(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    search(q)
    if (!q) {
      onChange('', country || '', undefined)
      setOpen(false)
    }
  }

  function select(r: LocationResult) {
    setQuery(r.city)
    onChange(r.city, r.country, r.countryCode)
    setOpen(false)
    setResults([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      select(results[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function clear() {
    setQuery('')
    onChange('', country || '', undefined)
    setOpen(false)
    inputRef.current?.focus()
  }

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!inputRef.current?.parentElement?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="relative">
        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          className={`input-field pl-9 pr-8 ${className}`}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        )}
        {!loading && query && (
          <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {results.map((r, i) => (
            <button
              key={`${r.city}-${r.country}`}
              onMouseDown={() => select(r)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${i === highlighted ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <MapPin size={13} className="text-gray-400 flex-shrink-0" />
              <div>
                <span className="font-medium">{r.city}</span>
                <span className="text-gray-400 ml-1.5">{r.country}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
