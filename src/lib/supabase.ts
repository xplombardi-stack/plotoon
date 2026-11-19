import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

// Modo demonstração: a prévia roda sem internet, com dados de exemplo.
export const DEMO = import.meta.env.VITE_DEMO === '1' || !url || !key

export const supabase = DEMO ? null : createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

// Arquivos de cada usuário ficam em media/<id do usuário>/...
export function mediaPath(userId: string, folder: 'fotos' | 'bonecos' | 'clipes' | 'videos', fileName: string) {
  return `${userId}/${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
}
