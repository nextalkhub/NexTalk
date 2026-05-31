import { useEffect, useState } from 'react'

export type Breakpoint = 'phone' | 'tablet' | 'desktop'

function detect(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 768) return 'phone'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(detect)

  useEffect(() => {
    const onResize = () => {
      const next = detect()
      setBp(prev => (prev === next ? prev : next))
    }
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return bp
}

export const useIsPhone   = (): boolean => useBreakpoint() === 'phone'
export const useIsTablet  = (): boolean => useBreakpoint() === 'tablet'
export const useIsMobile  = (): boolean => {
  const bp = useBreakpoint()
  return bp === 'phone' || bp === 'tablet'
}
