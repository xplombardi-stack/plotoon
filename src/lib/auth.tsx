import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { DEMO, authReturn, supabase } from './supabase'
import { go } from './router'

export type Profile = {
  id: string
  name: string | null
  plan: string
  credits: number
}

type AuthState = {
  ready: boolean
  session: Session | null
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>
  signInWithGoogle: () => Promise<string | null>
  resetPassword: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const demoProfile: Profile = { id: 'demo', name: 'Felipe', plan: 'estudio', credits: 1240 }

const AuthContext = createContext<AuthState | null>(null)

// Traduz os erros mais comuns do Supabase
function pt(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Olhe sua caixa de entrada.'
  if (m.includes('already registered')) return 'Esse e-mail já tem conta. Tente entrar.'
  if (m.includes('password should be')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('provider is not enabled')) return 'Entrar com Google ainda não está ativado.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Espere um pouco e tente de novo.'
  return 'Não deu certo agora. Tente de novo.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(DEMO)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(DEMO ? demoProfile : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
      // veio do link do e-mail: confirmação leva pro Início, troca de senha leva pra Conta
      if (authReturn === 'erro') go('entrar')
      else if (authReturn && data.session) go(authReturn === 'recovery' ? 'conta' : 'inicio')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) {
      if (!DEMO) setProfile(null)
      return
    }
    supabase
      .from('profiles')
      .select('id, name, plan, credits')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null))
  }, [session])

  const value: AuthState = {
    ready,
    session,
    profile,
    async signIn(email, password) {
      if (!supabase) return null
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return error ? pt(error.message) : null
    },
    async signUp(name, email, password) {
      if (!supabase) return { error: null, needsConfirm: false }
      // a conta já nasce confirmada (sem e-mail de confirmação) e a pessoa entra direto
      const { error } = await supabase.functions.invoke('cadastro', { body: { name, email, password } })
      if (error) {
        let code = ''
        try {
          const ctx = (error as { context?: Response }).context
          code = String((ctx ? await ctx.json() : null)?.error ?? '')
        } catch {
          /* sem detalhe */
        }
        const msg: Record<string, string> = {
          ja_existe: 'Esse e-mail já tem conta. Tente entrar.',
          email_invalido: 'Confira o e-mail.',
          senha_curta: 'A senha precisa ter pelo menos 6 caracteres.',
          senha_fraca: 'Escolha uma senha mais forte.',
          nome_vazio: 'Coloque o seu nome.',
        }
        return { error: msg[code] ?? 'Não deu certo agora. Tente de novo.', needsConfirm: false }
      }
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password })
      return { error: e2 ? pt(e2.message) : null, needsConfirm: false }
    },
    async signInWithGoogle() {
      if (!supabase) return null
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/' },
      })
      return error ? pt(error.message) : null
    },
    async resetPassword(email) {
      if (!supabase) return null
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/',
      })
      return error ? pt(error.message) : null
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

export function firstName(profile: Profile | null) {
  return (profile?.name ?? 'você').split(' ')[0]
}
