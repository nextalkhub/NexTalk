import { useRef } from 'react'

const STORAGE_KEY = 'sidebar-width'
const MIN_W = 160
const MAX_W = 480
const DEFAULT_W = 268

export function useSidebarResize() {
    const isDragging = useRef(false)
    const startX = useRef(0)
    const startW = useRef(DEFAULT_W)

    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        isDragging.current = true
        startX.current = e.clientX

        const inline = document.documentElement.style.getPropertyValue('--side-w')
        startW.current = inline ? parseInt(inline, 10) : DEFAULT_W

        const onMouseMove = (ev: MouseEvent) => {
            if (!isDragging.current) return
            const delta = ev.clientX - startX.current
            const newW = Math.min(MAX_W, Math.max(MIN_W, startW.current + delta))
            document.documentElement.style.setProperty('--side-w', `${newW}px`)
        }

        const onMouseUp = () => {
            if (!isDragging.current) return
            isDragging.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            const inline = document.documentElement.style.getPropertyValue('--side-w')
            if (inline) localStorage.setItem(STORAGE_KEY, inline.replace('px', '').trim())
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    return { onMouseDown }
}
