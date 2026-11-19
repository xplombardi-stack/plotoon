import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

// Modo demonstração: a prévia roda sem internet, com dados de exemplo.
export const DEMO = import.meta.env.VITE_DEMO === '1' || !url || !key

// Volta do link do e-mail: às vezes chega como #inicio#access_token=...; deixa só a parte do login
const volta = window.location.hash.match(/^#[a-z-]+#(.+)$/)
if (volta && /access_token=|error_description=/.test(volta[1])) {
  history.replaceState(null, '', window.location.pathname + window.location.search + '#' + volta[1])
}
const retorno = window.location.hash
export const authReturn: 'login' | 'recovery' | 'erro' | null = /access_token=/.test(retorno)
  ? /type=recovery/.test(retorno)
    ? 'recovery'
    : 'login'
  : /error_description=/.test(retorno)
    ? 'erro'
    : null

export const supabase = DEMO ? null : createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// Arquivos de cada usuário ficam em media/<id do usuário>/...
export function mediaPath(userId: string, folder: 'fotos' | 'bonecos' | 'clipes' | 'videos', fileName: string) {
  return `${userId}/${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
}
