import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth'
import { StoreProvider } from './lib/store'
import { BusinessProvider } from './lib/business'
import { ToastProvider } from './components/ui'
import { applySettings } from './lib/pricing'
import { supabase } from './lib/supabase'

// Preços em créditos: usa os últimos salvos pra abrir na hora, e atualiza do banco em seguida
const CACHE = 'plotoon:precos'
try {
  const saved = localStorage.getItem(CACHE)
  if (saved) applySettings(JSON.parse(saved))
} catch {
  /* sem armazenamento */
}
if (supabase) {
  supabase
    .from('settings')
    .select('key, value')
    .then(({ data }) => {
      if (!data) return
      const map = Object.fromEntries(data.map((r) => [r.key, r.value]))
      applySettings(map)
      try {
        localStorage.setItem(CACHE, JSON.stringify(map))
      } catch {
        /* sem armazenamento */
      }
    })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <BusinessProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BusinessProvider>
      </StoreProvider>
    </AuthProvider>
  </StrictMode>,
)
