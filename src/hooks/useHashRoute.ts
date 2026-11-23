import { useEffect, useState } from 'react'

export function readHash(): string {
  const raw = window.location.hash.replace(/^#/, '')
  if (raw === '' || raw === '/') return '/'
  return raw.startsWith('/') ? raw : '/' + raw
}

export function navigate(path: string): void {
  const next = '#' + path
  if (window.location.hash === next) return
  window.location.hash = next
}

export function useHashRoute(): string {
  const [route, setRoute] = useState<string>(() => readHash())

  useEffect(() => {
    const onChange = () => setRoute(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
