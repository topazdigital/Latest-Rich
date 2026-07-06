import { useEffect, useRef } from 'react'

interface Props {
  slot: string
  format?: 'auto' | 'fluid' | 'rectangle'
  style?: React.CSSProperties
  className?: string
}

declare global {
  interface Window { adsbygoogle: any[] }
}

export default function AdSenseAd({ slot, format = 'auto', style, className }: Props) {
  const ref = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    try {
      if (ref.current && window.adsbygoogle) {
        window.adsbygoogle = window.adsbygoogle || []
        window.adsbygoogle.push({})
        pushed.current = true
      }
    } catch {}
  }, [])

  return (
    <div className={className} style={{ overflow: 'hidden', textAlign: 'center', ...style }}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', ...(style || {}) }}
        data-ad-client="ca-pub-6533927898054426"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
