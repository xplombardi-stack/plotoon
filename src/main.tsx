import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './lib/auth'
import { StoreProvider } from './lib/store'
import { ToastProvider } from './components/ui'
import { applySettings } from './lib/pricing'
import { supabase } from './lib/supabase'

// Lê os preços em créditos do banco antes de abrir o app
async function boot() {
  if (supabase) {
    try {
      const { data } = await supabase.from('settings').select('key, value')
      if (data) applySettings(Object.fromEntries(data.map((r) => [r.key, r.value])))
    } catch {
      /* segue com os valores padrão */
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <StoreProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </StoreProvider>
      </AuthProvider>
    </StrictMode>,
  )
}
boot()
