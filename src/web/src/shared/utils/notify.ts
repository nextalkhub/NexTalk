// Браузерные уведомления о новых сообщениях. Управляются настройками
// (вкладка "Уведомления"). Срабатывают только когда вкладка неактивна,
// чтобы не дублировать то, что пользователь и так видит.

import { loadPrefs } from '../prefs/prefs'

// Короткий сигнал через WebAudio - без внешних аудио-файлов.
function playBeep() {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!Ctx) return
        const ctx = new Ctx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 660
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
        osc.start()
        osc.stop(ctx.currentTime + 0.26)
        osc.onended = () => ctx.close().catch(() => {})
    } catch {
        // звук не критичен
    }
}

export function notifyNewMessage(authorName: string, content: string) {
    // Только когда вкладка скрыта - активную вкладку не спамим.
    if (!document.hidden) return

    const prefs = loadPrefs()

    if (prefs.desktopNotifications
        && typeof Notification !== 'undefined'
        && Notification.permission === 'granted') {
        try {
            new Notification(authorName, {
                body: content.length > 120 ? content.slice(0, 117) + '...' : content,
                tag: 'nextalk-message',
            })
        } catch {
            // некоторые браузеры требуют ServiceWorker - молча пропускаем
        }
    }

    if (prefs.newMessageSound) playBeep()
}
