import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './shared/styles/global.scss'
import { oidcService } from './modules/auth/oidc/oidcService'
import { loadPrefs, applyPrefs } from './modules/settings/pages/AppSettingsPage'

async function bootstrap() {
    applyPrefs(loadPrefs())
    await oidcService.init()

    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
}

bootstrap()