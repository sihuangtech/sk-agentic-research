import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initializeApi } from './api/client'
import i18n, { initializeI18n } from './i18n'
import { initializeTheme } from './theme'

const root = createRoot(document.getElementById('root'))

const bootstrap = async () => {
  try {
    initializeTheme()
    await initializeI18n()
    await initializeApi()
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    const t = i18n.t.bind(i18n)
    root.render(
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-100">
        <section className="max-w-xl rounded-2xl border border-rose-300/20 bg-rose-300/10 p-6">
          <h1 className="text-xl font-bold">{t('bootstrap.title')}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{error?.message || t('bootstrap.unknownError')}</p>
          <p className="mt-3 text-xs text-slate-500">{t('bootstrap.hint')}</p>
        </section>
      </main>,
    )
  }
}

bootstrap()
