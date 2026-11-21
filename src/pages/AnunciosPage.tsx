// Anúncios: conecta a conta de anúncios da Meta (passo a passo pra leigo) ou recebe print/relatório,
// e mostra em português simples o que escalar, manter, ajustar ou pausar.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ExternalLink, FileUp, KeyRound, LoaderCircle, LogOut, Pause, Rocket, ShieldCheck, TrendingUp, Wrench, X } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader, ModuleIcon } from '../components/Module'
import { Button, cx, useToast } from '../components/ui'
import { ACTION_BUTTON, runAction, type MentorAction } from '../lib/actions'
import { useAuth } from '../lib/auth'
import { useBusiness } from '../lib/business'
import { shrinkImage, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

type Veredito = 'escalar' | 'manter' | 'ajustar' | 'pausar'
type Resultado = {
  resumo: string
  nota: number
  gasto_total?: string
  campanhas: Array<{ nome: string; veredito: Veredito; numeros: string; motivo: string; o_que_fazer: string }>
  prioridades: string[]
  acoes?: Array<{ tipo: 'video' | 'imagem' | 'copy'; titulo: string; detalhe: string; formato?: string }>
}
type Analise = { id: string; origem: 'meta' | 'arquivo'; periodo: string | null; conta_nome: string | null; resultado: Resultado; created_at: string }
type Conta = { id: string; nome: string; moeda: string; ativa: boolean }
type Conexao = { meta_nome: string | null; contas: Conta[]; conta_id: string | null; conta_nome: string | null; expira_em: string | null }

const CUSTO = 5
const VER: Record<Veredito, { t: string; cls: string; icon: typeof Rocket }> = {
  escalar: { t: 'Escalar', cls: 'bg-[#34d39922] text-[#6ee7b7] border-[#34d39955]', icon: Rocket },
  manter: { t: 'Manter', cls: 'bg-[#5b8cff22] text-[#9db8ff] border-[#5b8cff55]', icon: TrendingUp },
  ajustar: { t: 'Ajustar', cls: 'bg-[#facc1522] text-[#fde68a] border-[#facc1555]', icon: Wrench },
  pausar: { t: 'Pausar', cls: 'bg-[#ef444422] text-[#fca5a5] border-[#ef444455]', icon: Pause },
}
const PERIODOS = [
  { id: 'last_7d', t: '7 dias' },
  { id: 'last_14d', t: '14 dias' },
  { id: 'last_30d', t: '30 dias' },
]

const DEMO_ANALISE: Analise = {
  id: 'demo',
  origem: 'meta',
  periodo: 'últimos 7 dias',
  conta_nome: 'Forno da Vila',
  created_at: new Date().toISOString(),
  resultado: {
    resumo: 'Seus anúncios estão trazendo conversas no WhatsApp a um custo bom no geral. Uma campanha está gastando sem trazer ninguém e outra está cansando o público.',
    nota: 6.5,
    gasto_total: 'R$ 842,00',
    campanhas: [
      { nome: 'Pizza em dobro · WhatsApp', veredito: 'escalar', numeros: 'R$ 320 gastos · 58 conversas · R$ 5,50 cada', motivo: 'É a que traz conversa mais barata, bem abaixo da média da conta.', o_que_fazer: 'Aumente o orçamento em 20% hoje e mais 20% em 3 dias, se o custo segurar.' },
      { nome: 'Combo família · Reels', veredito: 'manter', numeros: 'R$ 210 gastos · 26 conversas · R$ 8,10 cada', motivo: 'Está dentro da média e ainda estável.', o_que_fazer: 'Deixe rodando e olhe de novo em 5 dias.' },
      { nome: 'Promo terça · Stories', veredito: 'ajustar', numeros: 'R$ 180 gastos · 12 conversas · frequência 4,2', motivo: 'As mesmas pessoas já viram o anúncio mais de 4 vezes: o criativo cansou.', o_que_fazer: 'Troque o vídeo por um novo, com a pizza saindo do forno.' },
      { nome: 'Público frio · Feed', veredito: 'pausar', numeros: 'R$ 132 gastos · 2 conversas · R$ 66 cada', motivo: 'Gastou bastante e quase ninguém chamou: custo 8 vezes maior que a média.', o_que_fazer: 'Pause e passe o dinheiro pra campanha "Pizza em dobro".' },
    ],
    prioridades: ['Pausar "Público frio · Feed" hoje.', 'Aumentar 20% do orçamento da "Pizza em dobro".', 'Trocar o vídeo da "Promo terça" por um novo.'],
    acoes: [{ tipo: 'video', titulo: 'Vídeo novo pra Promo terça', detalhe: 'Pizza saindo do forno a lenha com o queijo puxando, texto "Terça tem 2ª pizza com 30% off" e chamada pro WhatsApp', formato: 'produto' }],
  },
}

async function erroDe(error: unknown) {
  try {
    const ctx = (error as { context?: Response } | null)?.context
    return String((ctx ? await ctx.json() : null)?.error ?? 'falha')
  } catch {
    return 'falha'
  }
}
const MSG: Record<string, string> = {
  token_invalido: 'Esse token não parece certo. Copie de novo o código inteiro.',
  token_expirado: 'A chave venceu ou foi colada errada. Faça de novo os passos 3 e 4.',
  sem_permissao: 'Faltou a permissão ads_read. No passo 3, adicione ads_read antes de gerar o token.',
  sem_contas: 'Esse Facebook não tem nenhuma conta de anúncio. Entre com o Facebook que paga os anúncios.',
  limite_meta: 'A Meta pediu pra esperar um pouco. Tenta de novo em alguns minutos.',
  sem_dados: 'Não teve anúncio rodando nesse período. Tenta um período maior.',
  creditos_insuficientes: 'Seus créditos acabaram.',
}

/* ---------- passo a passo pra conectar ---------- */
const PASSOS = [
  {
    t: 'Entre como desenvolvedor da Meta',
    d: 'Abra o site da Meta pra desenvolvedores com o mesmo Facebook que cuida dos seus anúncios. Se aparecer o botão "Começar", clique e confirme seus dados. É grátis e leva 1 minuto.',
    link: 'https://developers.facebook.com/',
    linkT: 'Abrir Meta for Developers',
  },
  {
    t: 'Crie um app só seu',
    d: 'Clique em "Meus apps" e depois em "Criar app". Dê um nome (ex.: Plotoon da minha loja). Quando perguntar pra que serve, escolha a opção de anúncios / "API de Marketing" (se não tiver, escolha "Outro" e depois "Empresa"). Termine a criação.',
    link: 'https://developers.facebook.com/apps/',
    linkT: 'Abrir Meus apps',
  },
  {
    t: 'Gere a sua chave (token)',
    d: 'Abra o "Explorador da Graph API". No campo "Aplicativo da Meta", escolha o app que você criou. Em "Permissões", adicione ads_read. Clique em "Generate Access Token" e aceite.',
    link: 'https://developers.facebook.com/tools/explorer/',
    linkT: 'Abrir o Explorador',
  },
  {
    t: 'Faça a chave durar 60 dias',
    d: 'Copie o token que apareceu. Abra o "Depurador de Token", cole, clique em "Depurar" e, lá embaixo, em "Estender token de acesso". Copie o token novo que aparecer.',
    link: 'https://developers.facebook.com/tools/debug/accesstoken/',
    linkT: 'Abrir o Depurador',
  },
]

function Conectar({ onConectado, live }: { onConectado: (c: Conexao) => void; live: boolean }) {
  const toast = useToast()
  const [aberto, setAberto] = useState(0)
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)

  async function conectar() {
    if (!token.trim()) return
    setBusy(true)
    if (!live || !supabase) {
      await new Promise((r) => setTimeout(r, 900))
      setBusy(false)
      return onConectado({ meta_nome: 'Você', contas: [{ id: 'act_1', nome: 'Forno da Vila', moeda: 'BRL', ativa: true }], conta_id: 'act_1', conta_nome: 'Forno da Vila', expira_em: new Date(Date.now() + 60 * 86400e3).toISOString() })
    }
    const { data, error } = await supabase.functions.invoke('anuncios', { body: { acao: 'conectar', token } })
    setBusy(false)
    if (error) return toast.show(MSG[await erroDe(error)] ?? 'Não consegui conectar agora. Confere o token e tenta de novo.')
    setToken('')
    const contas = (data?.contas ?? []) as Conta[]
    onConectado({ meta_nome: data?.nome ?? null, contas, conta_id: contas.length === 1 ? contas[0].id : null, conta_nome: contas.length === 1 ? contas[0].nome : null, expira_em: data?.expira_em ?? null })
    toast.show('Conta de anúncios conectada!')
  }

  return (
    <section className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 flex items-center gap-2 font-display text-[19px] font-bold">
          <KeyRound size={19} className="text-accent" /> Conectar sua conta de anúncios
        </h2>
        <p className="m-0 text-[14px] text-muted">Faz uma vez só e leva uns 5 minutos. Siga os passos com calma, um de cada vez.</p>
      </div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {PASSOS.map((p, i) => {
          const on = aberto === i
          return (
            <li key={p.t} className={cx('rounded-2xl border', on ? 'border-accent-line bg-[#ff8a3d0a]' : 'border-line bg-bg')}>
              <button type="button" onClick={() => setAberto(on ? -1 : i)} aria-expanded={on} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3.5 text-left">
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold', on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-soft')}>{i + 1}</span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{p.t}</span>
                <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform', on && 'rotate-180')} />
              </button>
              {on && (
                <div className="flex flex-col gap-3 px-3.5 pb-3.5 pl-[58px]">
                  <p className="m-0 text-[14px] leading-relaxed text-soft">{p.d}</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={p.link} target="_blank" rel="noreferrer" className="press inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line-strong px-3.5 text-[13.5px] font-semibold text-ink no-underline hover:border-accent">
                      {p.linkT} <ExternalLink size={14} />
                    </a>
                    <button type="button" onClick={() => setAberto(i + 1)} className="press inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-accent">
                      Feito, próximo <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
        <li className={cx('rounded-2xl border p-3.5', aberto === PASSOS.length ? 'border-accent-line bg-[#ff8a3d0a]' : 'border-line bg-bg')}>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[14px] font-bold text-soft">5</span>
            <span className="text-[15px] font-semibold text-ink">Cole a chave aqui</span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole aqui o token que começa com EAA…" aria-label="Token da Meta" autoComplete="off" spellCheck={false} className="h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 font-mono text-[14px] text-ink outline-none placeholder:font-sans placeholder:text-subtle focus:border-accent" />
            <Button size="lg" onClick={conectar} disabled={busy || token.trim().length < 20}>
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Check size={18} />} Conectar
            </Button>
          </div>
        </li>
      </ol>
      <p className="m-0 flex items-start gap-2 rounded-xl bg-[#34d39912] px-3.5 py-2.5 text-[13px] text-[#a7f3d0]">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" /> Essa chave só deixa o Plotoon LER os números. Ele não cria, não muda e não gasta nada na sua conta. Você pode desconectar quando quiser.
      </p>
    </section>
  )
}

/* ---------- mandar print ou relatório ---------- */
function PorArquivo({ onAnalise, live, ocupado }: { onAnalise: (a: Analise) => void; live: boolean; ocupado: (b: boolean) => void }) {
  const toast = useToast()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  async function enviar(files: FileList | null) {
    const lista = [...(files ?? [])].slice(0, 4)
    if (!lista.length) return
    setBusy(true)
    ocupado(true)
    let texto = ''
    const imagens: string[] = []
    for (const f of lista) {
      if (f.type.startsWith('image/')) imagens.push(await shrinkImage(f, 1600))
      else if (/\.(csv|txt|tsv)$/i.test(f.name)) texto += `\n${(await f.text()).slice(0, 60000)}`
    }
    if (ref.current) ref.current.value = ''
    if (!texto && !imagens.length) {
      setBusy(false)
      ocupado(false)
      return toast.show('Mande um print (imagem) ou o relatório em CSV.')
    }
    if (!live || !supabase) {
      await new Promise((r) => setTimeout(r, 1400))
      setBusy(false)
      ocupado(false)
      return onAnalise({ ...DEMO_ANALISE, id: `d${Date.now()}`, origem: 'arquivo', periodo: null })
    }
    const { data, error } = await supabase.functions.invoke('anuncios', { body: { acao: 'analisar_arquivo', texto, imagens } })
    setBusy(false)
    ocupado(false)
    if (error) return toast.show(MSG[await erroDe(error)] ?? 'Não consegui analisar agora. Tenta de novo.')
    onAnalise(data.analise as Analise)
  }
  return (
    <section className="flex flex-col gap-3 rounded-[22px] border border-dashed border-line-strong p-5">
      <h3 className="m-0 text-[15.5px] font-bold">Não quer conectar? Mande um print ou o relatório</h3>
      <p className="m-0 text-[13.5px] text-muted">No Gerenciador de Anúncios, tire print da tabela de campanhas (com gasto e resultados aparecendo) ou clique em "Exportar" e baixe em CSV. Até 4 arquivos.</p>
      <input ref={ref} type="file" accept="image/*,.csv,.tsv,.txt" multiple hidden onChange={(e) => enviar(e.target.files)} />
      <Button variant="soft" onClick={() => ref.current?.click()} disabled={busy} className="self-start">
        {busy ? <LoaderCircle size={17} className="animate-spin" /> : <FileUp size={17} />} {busy ? 'Analisando…' : `Enviar e analisar · ${CUSTO} créditos`}
      </Button>
    </section>
  )
}

/* ---------- resultado ---------- */
function ResultadoView({ a, onFechar }: { a: Analise; onFechar?: () => void }) {
  const r = a.resultado
  const cor = r.nota >= 7.5 ? '#34d399' : r.nota >= 5 ? '#facc15' : '#ff8a3d'
  const pct = Math.max(0, Math.min(10, r.nota)) / 10
  return (
    <section className="rise flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <span className="relative flex h-20 w-20 shrink-0 items-center justify-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#ffffff14" strokeWidth="7" />
            <circle cx="32" cy="32" r="27" fill="none" stroke={cor} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${pct * 169.6} 169.6`} />
          </svg>
          <span className="font-display text-[22px] font-extrabold">{Number(r.nota).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            {a.conta_nome ? `${a.conta_nome} · ` : ''}
            {a.periodo ?? (a.origem === 'arquivo' ? 'pelo print ou relatório' : '')}
            {r.gasto_total ? ` · ${r.gasto_total} gastos` : ''}
          </span>
          <p className="m-0 text-[15.5px] leading-relaxed text-ink">{r.resumo}</p>
        </div>
        {onFechar && (
          <button type="button" onClick={onFechar} aria-label="Fechar análise" className="press flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center self-start rounded-xl text-muted hover:bg-white/5 hover:text-ink">
            <X size={18} />
          </button>
        )}
      </div>

      {r.prioridades?.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[22px] border border-accent-line bg-[#ff8a3d0d] p-5">
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent-text">Faça agora</span>
          <ol className="m-0 flex flex-col gap-2 pl-5 text-[15px] text-ink">
            {r.prioridades.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {r.campanhas.map((c) => {
          const v = VER[c.veredito] ?? VER.manter
          return (
            <article key={c.nome} className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1 text-[15.5px] font-bold leading-snug text-ink">{c.nome}</span>
                <span className={cx('flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-bold', v.cls)}>
                  <v.icon size={13} /> {v.t}
                </span>
              </div>
              <span className="text-[13.5px] font-semibold text-soft">{c.numeros}</span>
              <span className="text-[14px] text-muted">{c.motivo}</span>
              <span className="flex items-start gap-2 rounded-xl bg-bg px-3 py-2 text-[14px] text-ink">
                <ArrowRight size={15} className="mt-0.5 shrink-0 text-accent" /> {c.o_que_fazer}
              </span>
            </article>
          )
        })}
      </div>

      {(r.acoes?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2 rounded-[22px] border border-line bg-surface p-4">
          <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-muted">Criativos novos pra trocar os cansados</span>
          {r.acoes!.map((x) => (
            <div key={x.titulo} className="flex flex-wrap items-center gap-3 rounded-xl bg-bg p-3">
              <ModuleIcon id={x.tipo === 'video' ? 'estudio-video' : x.tipo === 'imagem' ? 'estudio-imagem' : 'copy'} size="sm" />
              <span className="flex min-w-0 flex-1 basis-[180px] flex-col">
                <span className="text-[14.5px] font-semibold text-ink">{x.titulo}</span>
                <span className="line-clamp-2 text-[13px] text-muted">{x.detalhe}</span>
              </span>
              <Button size="sm" onClick={() => runAction(x as MentorAction)}>
                {ACTION_BUTTON[x.tipo]} <ArrowRight size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ---------- página ---------- */
export function AnunciosPage() {
  const { session } = useAuth()
  const { live, credits, reload } = useStore()
  useBusiness()
  const toast = useToast()
  const uid = session?.user.id ?? ''
  const [con, setCon] = useState<Conexao | null>(null)
  const [carregando, setCarregando] = useState(live)
  const [analises, setAnalises] = useState<Analise[]>([])
  const [atual, setAtual] = useState<Analise | null>(null)
  const [periodo, setPeriodo] = useState('last_7d')
  const [analisando, setAnalisando] = useState(false)

  const carregar = useCallback(async () => {
    if (!live || !supabase || !uid) return setCarregando(false)
    const [c, a] = await Promise.all([
      supabase.from('anuncios_conexoes').select('meta_nome, contas, conta_id, conta_nome, expira_em').eq('user_id', uid).maybeSingle(),
      supabase.from('anuncios_analises').select('id, origem, periodo, conta_nome, resultado, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    ])
    setCon((c.data as Conexao | null) ?? null)
    const lista = (a.data ?? []) as Analise[]
    setAnalises(lista)
    setAtual((x) => x ?? lista[0] ?? null)
    setCarregando(false)
  }, [live, uid])
  useEffect(() => {
    carregar()
  }, [carregar])

  const vencido = !!con?.expira_em && new Date(con.expira_em).getTime() < Date.now()
  const diasRestantes = con?.expira_em ? Math.max(0, Math.ceil((new Date(con.expira_em).getTime() - Date.now()) / 86400e3)) : null

  function novaAnalise(a: Analise) {
    setAnalises((l) => [a, ...l.filter((x) => x.id !== a.id)])
    setAtual(a)
    if (live) reload()
    toast.show('Análise pronta!')
  }

  async function escolher(id: string) {
    const c = con?.contas.find((x) => x.id === id)
    if (!c) return
    setCon((x) => (x ? { ...x, conta_id: c.id, conta_nome: c.nome } : x))
    if (live && supabase) await supabase.functions.invoke('anuncios', { body: { acao: 'escolher', conta_id: id } })
  }

  async function analisar() {
    if (credits < CUSTO) return toast.show(`Precisa de ${CUSTO} créditos pra analisar.`)
    setAnalisando(true)
    if (!live || !supabase) {
      await new Promise((r) => setTimeout(r, 1500))
      setAnalisando(false)
      return novaAnalise({ ...DEMO_ANALISE, id: `d${Date.now()}`, periodo: `últimos ${PERIODOS.find((p) => p.id === periodo)?.t}` })
    }
    const { data, error } = await supabase.functions.invoke('anuncios', { body: { acao: 'analisar', periodo } })
    setAnalisando(false)
    if (error) {
      const e = await erroDe(error)
      if (e === 'token_expirado') setCon((x) => (x ? { ...x, expira_em: new Date(0).toISOString() } : x))
      return toast.show(MSG[e] ?? 'Não consegui analisar agora. Tenta de novo em instantes.')
    }
    novaAnalise(data.analise as Analise)
  }

  async function desconectar() {
    if (live && supabase) await supabase.functions.invoke('anuncios', { body: { acao: 'desconectar' } })
    setCon(null)
    toast.show('Conta desconectada.')
  }

  return (
    <AppShell active="anuncios">
      <ModuleHeader id="anuncios" />
      {carregando ? (
        <div className="flex justify-center py-16">
          <LoaderCircle size={26} className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {con && !vencido ? (
            <section className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34d39918] text-[#6ee7b7]">
                  <Check size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="text-[15.5px] font-bold text-ink">Conectado{con.meta_nome ? ` como ${con.meta_nome}` : ''}</span>
                  <span className="text-[13px] text-muted">{diasRestantes !== null ? `A chave vale por mais ${diasRestantes} dia${diasRestantes === 1 ? '' : 's'}` : 'Só leitura dos números'}</span>
                </span>
                <Button size="sm" variant="ghost" onClick={desconectar} className="!text-muted">
                  <LogOut size={15} /> Desconectar
                </Button>
              </div>
              {con.contas.length > 1 && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[14px] font-semibold text-ink">Qual conta de anúncio?</span>
                  <select value={con.conta_id ?? ''} onChange={(e) => escolher(e.target.value)} className="h-12 rounded-xl border border-line-strong bg-bg px-3 text-[15px] text-ink outline-none focus:border-accent">
                    {!con.conta_id && <option value="">Escolha…</option>}
                    {con.contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.ativa ? '' : ' (desativada)'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-soft">Analisar os</span>
                {PERIODOS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPeriodo(p.id)} aria-pressed={periodo === p.id} className={cx('press min-h-10 cursor-pointer rounded-full border px-3.5 text-[14px] font-semibold', periodo === p.id ? 'border-accent bg-[#ff8a3d1a] text-ink' : 'border-line-strong text-muted')}>
                    últimos {p.t}
                  </button>
                ))}
                <Button onClick={analisar} disabled={analisando || !con.conta_id} className="ml-auto">
                  {analisando ? <LoaderCircle size={17} className="animate-spin" /> : <TrendingUp size={17} />} {analisando ? 'Analisando…' : `Analisar · ${CUSTO} créditos`}
                </Button>
              </div>
            </section>
          ) : (
            <>
              {vencido && <p className="m-0 rounded-xl bg-[#facc1514] px-4 py-3 text-[14px] text-[#fde68a]">Sua chave da Meta venceu. Faça de novo os passos 3 e 4 e cole a chave nova.</p>}
              <Conectar live={live} onConectado={setCon} />
            </>
          )}

          {analisando && (
            <div className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-5 text-[14.5px] text-soft">
              <LoaderCircle size={20} className="animate-spin text-accent" /> Lendo as suas campanhas e comparando cada uma com a média da conta…
            </div>
          )}

          {atual && !analisando && <ResultadoView a={atual} />}

          <PorArquivo live={live} onAnalise={novaAnalise} ocupado={setAnalisando} />

          {analises.length > 1 && (
            <section className="flex flex-col gap-2">
              <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Análises anteriores</h3>
              <div className="flex flex-wrap gap-2">
                {analises.map((a) => (
                  <button key={a.id} type="button" onClick={() => setAtual(a)} className={cx('press min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold', atual?.id === a.id ? 'border-accent bg-[#ff8a3d1a] text-ink' : 'border-line text-muted')}>
                    {new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · {a.origem === 'meta' ? a.periodo : 'print/relatório'}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}
