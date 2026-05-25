function hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = (str.charCodeAt(i) + ((hash << 5) - hash)) | 0
    }
    return Math.abs(hash)
}

export function avatarHue(id: string): number {
    return hashCode(id) % 360
}

export function avatarBg(hue: number): string {
    return `hsl(${hue}, 55%, 32%)`
}

export function nameInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('')
}
