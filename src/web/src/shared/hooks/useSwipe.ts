import { useEffect, useRef } from 'react'

interface SwipeOptions {
  enabled?: boolean
  edgePx?: number
  thresholdPx?: number
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  edgeOnlyRight?: boolean
}

export function useSwipe({
  enabled = true,
  edgePx = 24,
  thresholdPx = 60,
  onSwipeRight,
  onSwipeLeft,
  edgeOnlyRight = true,
}: SwipeOptions): void {
  const startRef = useRef<{ x: number; y: number; fromEdge: boolean } | null>(null)

  useEffect(() => {
    if (!enabled) return

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      const fromEdge = t.clientX <= edgePx
      startRef.current = { x: t.clientX, y: t.clientY, fromEdge }
    }

    const onTouchEnd = (e: TouchEvent) => {
      const start = startRef.current
      startRef.current = null
      if (!start) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (Math.abs(dy) > Math.abs(dx)) return

      if (dx > thresholdPx) {
        if (edgeOnlyRight && !start.fromEdge) return
        onSwipeRight?.()
      } else if (dx < -thresholdPx) {
        onSwipeLeft?.()
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled, edgePx, thresholdPx, onSwipeRight, onSwipeLeft, edgeOnlyRight])
}
