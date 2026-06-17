import { useState, useEffect } from 'react'

let deferredPrompt: any = null

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) { setIsInstalled(true); return }

    if (deferredPrompt) { setCanInstall(true); return }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    setCanInstall(false)
    return outcome === 'accepted'
  }

  return { canInstall, isInstalled, install }
}
