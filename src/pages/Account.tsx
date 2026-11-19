import type { FormEvent } from 'react'
import { useState } from 'react'
import { LogOut, RotateCcw } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { DEMO, supabase } from '../lib/supabase'
import { useStore } from '../lib/store'
import { AppShell, useDisplayName } from '../components/AppShell'
import { Button, Card, PageHeader, go, useToast } from '../components/ui'

export function Account() {
  const toast = useToast()
  const { profile, session, signOut } = useAuth()
  const { setName, reset } = useStore()
  const current = useDisplayName()
  const [name, setNameInput] = useState(current)
  const [password, setPassword] = useState('')

  async function saveName(e: FormEvent) {
    e.preventDefault()
    if (supabase && profile) {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', profile.id)
      if (error) return toast.show('Não deu pra salvar agora')
    }
    setName(name.trim())
    toast.show('Nome salvo')
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) return toast.show('A senha precisa ter pelo menos 6 caracteres')
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) return toast.show('Não deu pra trocar a senha agora')
    }
    setPassword('')
    toast.show('Senha trocada')
  }

  const email = session?.user.email ?? ''

  return (
    <AppShell active="conta">
      <PageHeader title="Minha conta" />
      <div className="grid max-w-[880px] gap-5">
        <Card className="rise p-6">
          <form onSubmit={saveName} className="flex flex-col gap-4">
            <h2 className="m-0 text-[17px] font-bold">Seus dados</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="nome" className="text-[14px] font-medium">Nome</label>
                <input id="nome" value={name} onChange={(e) => setNameInput(e.target.value)} placeholder="Seu nome" className="min-h-12 rounded-[10px] border border-line-strong bg-bg px-3.5 text-[15px] text-ink outline-none focus:border-accent" />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-[14px] font-medium">E-mail</label>
                <input id="email" value={email} placeholder={DEMO ? 'aparece aqui quando o login estiver no ar' : ''} readOnly className="min-h-12 rounded-[10px] border border-line bg-surface-2 px-3.5 text-[15px] text-muted outline-none" />
              </div>
            </div>
            <Button type="submit" className="self-start">Salvar</Button>
          </form>
        </Card>

        <Card className="rise rise-1 p-6">
          <form onSubmit={savePassword} className="flex flex-col gap-4">
            <h2 className="m-0 text-[17px] font-bold">Senha</h2>
            <div className="flex max-w-[420px] flex-col gap-2">
              <label htmlFor="nova-senha" className="text-[14px] font-medium">Nova senha</label>
              <input id="nova-senha" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" className="min-h-12 rounded-[10px] border border-line-strong bg-bg px-3.5 text-[15px] text-ink outline-none focus:border-accent" />
            </div>
            <Button type="submit" variant="secondary" className="self-start">Trocar senha</Button>
          </form>
        </Card>

        {DEMO && (
          <Card className="rise rise-2 flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[17px] font-bold">Começar do zero</h2>
              <span className="text-[14px] text-muted">Só na prévia: apaga elenco e vídeos pra testar como conta nova.</span>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                reset()
                toast.show('Prévia zerada')
                go('inicio')
              }}
            >
              <RotateCcw size={16} /> Zerar a prévia
            </Button>
          </Card>
        )}

        <Card className="rise rise-3 flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[17px] font-bold">Sair da conta</h2>
            <span className="text-[14px] text-muted">Você pode entrar de novo quando quiser.</span>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut()
              go('site')
            }}
          >
            <LogOut size={16} /> Sair
          </Button>
        </Card>
      </div>
    </AppShell>
  )
}
