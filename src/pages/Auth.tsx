import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { HeroCreators } from '../components/Showcase'
import { DEMO } from '../lib/supabase'
import { Button, CheckDot, Logo, TextLink, go } from '../components/ui'

function Field({ id, label, type = 'text', value, onChange, placeholder, autoComplete, aside }: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  aside?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[14px] font-medium">{label}</label>
        {aside}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="min-h-12 rounded-[10px] border border-line-strong bg-[#0f1218] px-3.5 text-[15px] text-ink outline-none focus:border-accent"
      />
    </div>
  )
}

function GoogleButton({ onError }: { onError: (m: string) => void }) {
  const { signInWithGoogle } = useAuth()
  return (
    <Button
      variant="soft"
      size="lg"
      className="w-full"
      onClick={async () => {
        if (DEMO) return go('inicio')
        const err = await signInWithGoogle()
        if (err) onError(err)
      }}
    >
      <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-bg">G</span>
      Continuar com Google
    </Button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[13px] text-subtle">ou</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <section className="flex min-w-0 flex-[1_1_480px] flex-col px-6 py-7 sm:px-12">
        <a href="#site" className="self-start no-underline" aria-label="Voltar pro site">
          <Logo />
        </a>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="rise flex w-full max-w-[392px] flex-col gap-6">{children}</div>
        </div>
        <div className="flex flex-wrap gap-5 text-[13px] text-subtle">
          <span>© Plotoon</span>
          <a href="#site" className="text-subtle no-underline hover:text-ink">Termos de uso</a>
          <a href="#site" className="text-subtle no-underline hover:text-ink">Privacidade</a>
        </div>
      </section>

      <section aria-hidden className="relative hidden min-w-0 flex-[1.1_1_520px] flex-col justify-center gap-9 overflow-hidden border-l border-line bg-side p-12 lg:flex">
        <div className="aurora"><span /></div>
        <h2 className="relative text-balance m-0 max-w-[480px] font-display text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em]">
          Do roteiro ao vídeo pronto, com o seu boneco 3D.
        </h2>
        <div className="relative flex flex-col gap-3">
          {['Mesmo rosto em todas as partes', 'Um Diretor com IA que escreve por você', 'Você vê o custo antes de gerar'].map((t) => (
            <span key={t} className="flex items-center gap-3 text-[15px] text-soft">
              <CheckDot /> {t}
            </span>
          ))}
        </div>
        <HeroCreators layout="tall" className="!mx-0 max-w-[480px]" />
      </section>
    </div>
  )
}

function ErrorText({ children }: { children: ReactNode }) {
  return <p role="alert" className="m-0 rounded-[10px] border border-[#5a2420] bg-[#2a1210] px-3.5 py-3 text-[14px] text-[#ffb4a8]">{children}</p>
}

export function Login() {
  const { signIn, resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (DEMO) return go('inicio')
    setBusy(true)
    setError(null)
    const err = await signIn(email, password)
    setBusy(false)
    if (err) setError(err)
    else go('inicio')
  }

  async function forgot() {
    setError(null)
    if (!email) return setError('Digite seu e-mail primeiro.')
    if (DEMO) return setInfo('Enviamos um link pra você criar uma senha nova.')
    const err = await resetPassword(email)
    if (err) setError(err)
    else setInfo('Enviamos um link pra você criar uma senha nova.')
  }

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[30px] font-bold tracking-[-0.02em]">Entrar</h1>
        <p className="m-0 text-[15px] text-muted">Que bom te ver de novo.</p>
      </div>
      <GoogleButton onError={setError} />
      <Divider />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field id="email" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" autoComplete="email" />
        <Field
          id="senha"
          label="Senha"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Sua senha"
          autoComplete="current-password"
          aside={
            <button type="button" onClick={forgot} className="cursor-pointer text-[13px] font-semibold text-accent-text hover:text-accent">
              Esqueci a senha
            </button>
          }
        />
        {error && <ErrorText>{error}</ErrorText>}
        {info && <p className="m-0 text-[14px] text-sky-text">{info}</p>}
        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="m-0 text-center text-[14px] text-muted">
        Ainda não tem conta? <TextLink to="criar-conta">Criar conta</TextLink>
      </p>
    </Layout>
  )
}

export function Signup() {
  const { signUp } = useAuth()
  const { setName: saveName, reset } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (DEMO) {
      reset()
      saveName(name.trim())
      return go('inicio')
    }
    setBusy(true)
    setError(null)
    const res = await signUp(name, email, password)
    setBusy(false)
    if (res.error) setError(res.error)
    else if (res.needsConfirm) setSent(true)
    else go('inicio')
  }

  if (sent) {
    return (
      <Layout>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-soft text-sky-text">
          <MailCheck size={28} aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[28px] font-bold tracking-[-0.02em]">Confirme seu e-mail</h1>
          <p className="m-0 text-[15px] leading-relaxed text-muted">
            Mandamos um link pra <strong className="text-ink">{email}</strong>. Clique nele e você já entra.
          </p>
        </div>
        <TextLink to="entrar">Voltar pro login</TextLink>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[30px] font-bold tracking-[-0.02em]">Criar conta</h1>
        <p className="m-0 text-[15px] text-muted">Leva menos de um minuto.</p>
      </div>
      <GoogleButton onError={setError} />
      <Divider />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field id="nome" label="Seu nome" value={name} onChange={setName} placeholder="Como você quer ser chamado" autoComplete="name" />
        <Field id="email-c" label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" autoComplete="email" />
        <Field id="senha-c" label="Senha" type="password" value={password} onChange={setPassword} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
          {busy ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>
      <p className="m-0 text-center text-[13px] leading-relaxed text-subtle">Ao criar a conta você aceita os Termos de uso e a Política de privacidade.</p>
      <p className="m-0 text-center text-[14px] text-muted">
        Já tem conta? <TextLink to="entrar">Entrar</TextLink>
      </p>
    </Layout>
  )
}
