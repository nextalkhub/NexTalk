import { generateCodeVerifier, generateCodeChallenge } from './pkce'

export interface Tokens {
    access_token: string
    refresh_token?: string
    id_token?: string
    expires_in: number
    token_type: string
    scope?: string
}

export interface UserInfo {
    sub: string
    email: string
    preferred_username: string
    name: string
    picture?: string
    given_name?: string
    family_name?: string
    updated_at?: number
}

class OidcService {
    private static instance: OidcService
    private tokens: Tokens | null = null
    private userInfo: UserInfo | null = null
    private tokenExpirationTimer: ReturnType<typeof setTimeout> | null = null

    // Конфигурация Zitadel
    private config = {
        authority: import.meta.env.VITE_OIDC_AUTHORITY,
        clientId: import.meta.env.VITE_OIDC_CLIENT_ID || '',
        redirectUri: import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/callback`,
        postLogoutRedirectUri: `${window.location.origin}/auth`,
        scope: 'openid profile email offline_access',
    }

    private constructor() {
        this.loadTokensFromStorage()
    }

    async init(): Promise<void> {
        try {
            const res = await fetch('/swagger/config.json')
            if (res.ok) {
                const data = await res.json()
                if (data.spaClientId) {
                    this.config.clientId = data.spaClientId
                }
            }
        } catch {
            // fallback на build-time VITE_OIDC_CLIENT_ID (локальная разработка без Docker)
        }
    }

    static getInstance(): OidcService {
        if (!OidcService.instance) {
            OidcService.instance = new OidcService()
        }
        return OidcService.instance
    }

    // Начало авторизации - редирект на Zitadel
    async login(): Promise<void> {
        // Генерируем PKCE параметры
        const codeVerifier = generateCodeVerifier()
        const codeChallenge = await generateCodeChallenge(codeVerifier)

        // Сохраняем code_verifier в sessionStorage
        sessionStorage.setItem('code_verifier', codeVerifier)

        // Генерируем state для защиты от CSRF
        const state = generateCodeVerifier()
        sessionStorage.setItem('oauth_state', state)

        // Строим URL для редиректа
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scope,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        })

        const authUrl = `${this.config.authority}/oauth/v2/authorize?${params.toString()}`

        // Редирект на Zitadel
        window.location.href = authUrl
    }

    // Обработка callback после редиректа от Zitadel
    async handleCallback(code: string, state: string): Promise<Tokens | null> {
        // Проверяем state
        const savedState = sessionStorage.getItem('oauth_state')
        if (state !== savedState) {
            throw new Error('Invalid state parameter - possible CSRF attack')
        }

        // Получаем code_verifier
        const codeVerifier = sessionStorage.getItem('code_verifier')
        if (!codeVerifier) {
            throw new Error('Code verifier not found')
        }

        // Обмениваем code на токены
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.config.redirectUri,
            code_verifier: codeVerifier,
        })

        const response = await fetch(`${this.config.authority}/oauth/v2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        })

        if (!response.ok) {
            throw new Error('Failed to exchange code for tokens')
        }

        this.tokens = await response.json()

        // Очищаем временные данные
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('code_verifier')

        // Загружаем информацию о пользователе
        await this.loadUserInfo()

        // Сохраняем после loadUserInfo — иначе userInfo не попадёт в localStorage
        this.saveTokensToStorage()

        // Настраиваем автообновление токена
        this.scheduleTokenRefresh()

        return this.tokens
    }

    // Загрузка информации о пользователе
    async loadUserInfo(): Promise<UserInfo | null> {
        if (!this.tokens?.access_token) {
            throw new Error('No access token')
        }

        const response = await fetch(`${this.config.authority}/oidc/v1/userinfo`, {
            headers: {
                'Authorization': `Bearer ${this.tokens.access_token}`,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to load user info')
        }

        this.userInfo = await response.json()
        return this.userInfo
    }

    // Обновление access_token через refresh_token
    async refreshToken(): Promise<Tokens | null> {
        if (!this.tokens?.refresh_token) {
            throw new Error('No refresh token available')
        }

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            grant_type: 'refresh_token',
            refresh_token: this.tokens.refresh_token,
        })

        const response = await fetch(`${this.config.authority}/oauth/v2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        })

        if (!response.ok) {
            throw new Error('Failed to refresh token')
        }

        this.tokens = await response.json()
        this.saveTokensToStorage()
        this.scheduleTokenRefresh()

        return this.tokens
    }

    // Выход из системы
    async logout(): Promise<void> {
        // Очищаем таймер
        if (this.tokenExpirationTimer) {
            clearTimeout(this.tokenExpirationTimer)
            this.tokenExpirationTimer = null
        }

        const idToken = this.tokens?.id_token

        // Очищаем локальные данные
        this.tokens = null
        this.userInfo = null
        localStorage.removeItem('oidc_tokens')
        localStorage.removeItem('oidc_user')

        // Редирект на Zitadel logout
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            post_logout_redirect_uri: this.config.postLogoutRedirectUri,
        })
        if (idToken) {
            params.set('id_token_hint', idToken)
        }

        window.location.href = `${this.config.authority}/oidc/v1/end_session?${params.toString()}`

        // Зависаем — страница уйдёт сама, fulfilled не должен срабатывать до навигации.
        await new Promise<never>(() => {})
    }

    // Настройка автообновления токена
    private scheduleTokenRefresh(): void {
        if (this.tokenExpirationTimer) {
            clearTimeout(this.tokenExpirationTimer)
        }

        if (!this.tokens?.expires_in) return

        // Обновляем за 60 секунд до истечения
        const refreshTime = (this.tokens.expires_in - 60) * 1000
        this.tokenExpirationTimer = setTimeout(() => {
            this.refreshToken().catch(console.error)
        }, refreshTime)
    }

    // Сохранение токенов в localStorage
    private saveTokensToStorage(): void {
        if (this.tokens) {
            localStorage.setItem('oidc_tokens', JSON.stringify(this.tokens))
        }
        if (this.userInfo) {
            localStorage.setItem('oidc_user', JSON.stringify(this.userInfo))
        }
    }

    // Загрузка токенов из localStorage
    private loadTokensFromStorage(): void {
        const tokensStr = localStorage.getItem('oidc_tokens')
        const userStr = localStorage.getItem('oidc_user')

        if (tokensStr) {
            this.tokens = JSON.parse(tokensStr)
            this.scheduleTokenRefresh()
        }
        if (userStr) {
            this.userInfo = JSON.parse(userStr)
        }
    }

    // Получение access_token для API запросов
    getAccessToken(): string | null {
        return this.tokens?.access_token || null
    }

    // Получение информации о пользователе
    getUserInfo(): UserInfo | null {
        return this.userInfo
    }

    // Проверка авторизации
    isAuthenticated(): boolean {
        return !!this.tokens?.access_token && !!this.userInfo
    }
}

export const oidcService = OidcService.getInstance()