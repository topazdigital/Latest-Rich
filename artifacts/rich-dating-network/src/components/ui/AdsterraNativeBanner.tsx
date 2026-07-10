import { useEffect, useRef } from 'react'

// Adsterra Native Banner for richdatingnetwork.com.
// Adsterra's invoke.js looks for a div with this exact id and injects the ad
// into it, so only one instance of this component should be mounted at a
// time per page (it's an SPA — the script only runs once per page load).
const CONTAINER_ID = 'container-fa854d7e46f5c947da46a735ff012321'
const SCRIPT_SRC = 'https://pl30297535.effectivecpmnetwork.com/fa854d7e46f5c947da46a735ff012321/invoke.js'

interface Props {
  className?: string
  style?: React.CSSProperties
}

export default function AdsterraNativeBanner({ className, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.id = CONTAINER_ID

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement('script')
      script.async = true
      script.setAttribute('data-cfasync', 'false')
      script.src = SCRIPT_SRC
      document.body.appendChild(script)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ textAlign: 'center', overflow: 'hidden', minHeight: 90, ...style }}
    />
  )
}
