// Atendente WhatsApp: conectar pelo QR code, treinar, testar no simulador e acompanhar as conversas.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, Bot, Briefcase, CalendarClock, Camera, ClipboardList, Check, CheckCheck, GraduationCap, Lightbulb, LoaderCircle, Lock, MapPin, MessageCircle, Pause, Pencil, Play, Plus, Power, QrCode, Repeat, RotateCcw, Send, Smartphone, Store, Trash2, Truck, UserRound, X } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader } from '../components/Module'
import { Badge, Button, cx, useToast } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useBusiness } from '../lib/business'
import { useStore } from '../lib/store'
import { DEMO, supabase } from '../lib/supabase'
import { ESPERAS, NICHOS, nichoPor, type Gatilho } from '../lib/nichos'
import { Pedidos, usePedidos } from '../components/WhatsAppPedidos'

type Aba = 'conectar' | 'treinar' | 'testar' | 'conversas' | 'pedidos'
type Entrega = { local: string; taxa: string; prazo: string }
type Remarketing = { ativo: boolean; espera_h: number; instrucao: string }
type Licao = { cliente: string; certo: string }
type Treino = {
  nome_atendente: string
  apresentacao: string
  produtos: string
  perguntas: string
  horario: string
  regras: string
  tom: string
  observacoes: string
  nicho: string
  nicho_outro: string
  frete: string
  extras: Record<string, string>
  agenda_modo: string
  remarketing: Partial<Record<Gatilho, Remarketing>>
  endereco: string
  referencia: string
  mapa: string
  entregas: Entrega[]
  fora_area: string
  licoes: Licao[]
}
type Bot = { status: 'desconectado' | 'aguardando_qr' | 'conectado'; numero: string | null; nome_perfil: string | null; qr: string | null; ativo: boolean; treino: Partial<Treino> }
type Conversa = { id: string; jid: string; nome: string | null; ultima_msg: string | null; ultima_em: string; ia_pausada: boolean; precisa_dono: boolean; nao_lidas: number }
type Msg = { id: string; de: 'cliente' | 'ia' | 'dono'; texto: string; created_at: string }

const TONS = ['Simpático e próximo', 'Profissional e direto', 'Divertido, com energia', 'Sofisticado e elegante']
const TREINO_VAZIO: Treino = {
  nome_atendente: '',
  apresentacao: '',
  produtos: '',
  perguntas: '',
  horario: '',
  regras: '',
  tom: TONS[0],
  observacoes: '',
  nicho: '',
  nicho_outro: '',
  frete: '',
  extras: {},
  agenda_modo: 'manual',
  remarketing: {},
  endereco: '',
  referencia: '',
  mapa: '',
  entregas: [],
  fora_area: '',
  licoes: [],
}
const CREDITOS_FOTO_CARDAPIO = 2
const DEMO_CARDAPIO = 'PIZZAS GRANDES (8 fatias)\nMussarela: R$ 49,90\nCalabresa: R$ 52,90\nPortuguesa: R$ 56,90\nFrango com catupiry: R$ 58,90\nBEBIDAS\nRefrigerante 2L: R$ 14,00'

// diminui a foto antes de mandar (mais rápido e mais barato de ler)
async function fotoParaBase64(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85).split(',')[1]
}

async function erroDe(error: unknown) {
  try {
    const ctx = (error as { context?: Response } | null)?.context
    return String((ctx ? await ctx.json() : null)?.error ?? 'falha')
  } catch {
    return 'falha'
  }
}
const hora = (s: string) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const quando = (s: string) => {
  const d = new Date(s)
  const hoje = new Date()
  return d.toDateString() === hoje.toDateString() ? hora(s) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
const numeroBonito = (jid: string) => {
  const n = jid.split('@')[0]
  const m = n.match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : jid.endsWith('@lid') ? 'Contato' : n
}

/* ---------- conectar ---------- */
function Conectar({ bot, onBot, live }: { bot: Bot | null; onBot: (b: Partial<Bot>) => void; live: boolean }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const status = bot?.status ?? 'desconectado'

  // enquanto o QR está na tela, confere a cada 3s se já conectou
  useEffect(() => {
    if (!live || !supabase || status !== 'aguardando_qr') return
    const id = window.setInterval(async () => {
      const { data } = await supabase!.functions.invoke('whatsapp', { body: { acao: 'status' } })
      if (data?.status === 'conectado') {
        onBot({ status: 'conectado', numero: data.numero ?? null, qr: null })
        toast.show('WhatsApp conectado! O atendente já está respondendo.')
      }
    }, 3000)
    return () => window.clearInterval(id)
  }, [live, status, onBot, toast])

  async function conectar() {
    if (!live || !supabase) {
      onBot({ status: 'conectado', numero: '5511999990000' })
      return toast.show('Na prévia é só de exemplo.')
    }
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('whatsapp', { body: { acao: 'conectar' } })
    setBusy(false)
    if (error) {
      const e = await erroDe(error)
      return toast.show(e === 'evolution_nao_configurada' ? 'O servidor do WhatsApp ainda não está configurado.' : 'Não consegui gerar o QR agora. Tenta de novo.')
    }
    onBot({ status: data.status, qr: data.qr ?? null })
  }
  async function desconectar() {
    if (!window.confirm('Desconectar o WhatsApp? O atendente para de responder até você conectar de novo.')) return
    if (live && supabase) await supabase.functions.invoke('whatsapp', { body: { acao: 'desconectar' } })
    onBot({ status: 'desconectado', numero: null, qr: null })
  }

  if (status === 'conectado')
    return (
      <div className="flex flex-col gap-4 rounded-[22px] border border-[#34d39955] bg-[#34d39910] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34d39926] text-[#6ee7b7]">
            <CheckCheck size={24} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-[19px] font-bold">WhatsApp conectado</span>
            <span className="text-[14px] text-muted">{bot?.numero ? numeroBonito(`${bot.numero}@s`) : 'Seu número'}{bot?.nome_perfil ? ` · ${bot.nome_perfil}` : ''}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={desconectar}>
            <Power size={16} /> Desconectar
          </Button>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-bg/50 p-4">
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold text-ink">Atendente respondendo</span>
            <span className="text-[13px] text-muted">{bot?.ativo ? 'A IA responde quem mandar mensagem.' : 'Pausado: ninguém recebe resposta automática.'}</span>
          </span>
          <input type="checkbox" role="switch" checked={!!bot?.ativo} onChange={(e) => onBot({ ativo: e.target.checked })} className="h-6 w-11 cursor-pointer appearance-none rounded-full bg-surface-2 transition-colors before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:transition-transform checked:bg-[#34d399] checked:before:translate-x-[22px]" />
        </label>
      </div>
    )

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5">
        <h2 className="m-0 font-display text-[19px] font-bold">Conectar pelo QR code</h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {['Clique em "Gerar QR code"', 'No celular, abra o WhatsApp → Aparelhos conectados → Conectar aparelho', 'Aponte a câmera pro QR code. Pronto: o atendente começa a responder'].map((t, i) => (
            <li key={t} className="flex gap-3 text-[14.5px] text-soft">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <p role="note" className="m-0 flex gap-2 rounded-xl border border-[#facc1540] bg-[#facc1512] px-3.5 py-3 text-[13px] text-soft">
          <AlertTriangle size={17} className="mt-px shrink-0 text-[#facc15]" aria-hidden />
          <span>
            <strong className="text-ink">Importante:</strong> a conexão pelo QR code não é oficial do WhatsApp, e o número pode ser bloqueado se ele perceber uso automático. Prefira um número só pro atendimento e não use pra mandar mensagem em massa.
          </span>
        </p>
        <Button size="lg" onClick={conectar} disabled={busy} className="self-start">
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <QrCode size={18} />} {status === 'aguardando_qr' ? 'Gerar outro QR code' : 'Gerar QR code'}
        </Button>
      </div>
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[22px] border border-line bg-surface p-5 text-center">
        {status === 'aguardando_qr' && bot?.qr ? (
          <>
            <img src={bot.qr.startsWith('data:') ? bot.qr : `data:image/png;base64,${bot.qr}`} alt="QR code pra conectar o WhatsApp" className="h-[260px] w-[260px] rounded-2xl bg-white p-3" />
            <span className="flex items-center gap-2 text-[13.5px] text-muted">
              <LoaderCircle size={15} className="animate-spin text-accent" /> Esperando você escanear… o QR muda a cada poucos segundos.
            </span>
          </>
        ) : (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-muted">
              <Smartphone size={30} />
            </span>
            <span className="text-[14px] text-muted">O QR code aparece aqui.</span>
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- treinar ---------- */
function Campo({ label, dica, value, onChange, rows = 3, placeholder }: { label: string; dica?: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      {dica && <span className="-mt-1 text-[12.5px] text-muted">{dica}</span>}
      {rows === 1 ? (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 rounded-xl border border-line-strong bg-bg px-3.5 text-[15px] text-ink outline-none placeholder:text-subtle focus:border-accent" />
      ) : (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="resize-y rounded-xl border border-line-strong bg-bg px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-subtle focus:border-accent" />
      )}
    </label>
  )
}

function Secao({ icon: Icon, titulo, dica, children }: { icon: typeof MapPin; titulo: string; dica?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff8a3d1a] text-accent">
          <Icon size={19} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 font-display text-[18px] font-bold">{titulo}</h2>
          {dica && <p className="m-0 text-[13.5px] text-muted">{dica}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

const inputCls = 'h-12 min-w-0 rounded-xl border border-line-strong bg-bg px-3.5 text-[15px] text-ink outline-none placeholder:text-subtle focus:border-accent'

function Treinar({ treino, onChange, onSave, salvando, live }: { treino: Treino; onChange: (t: Treino) => void; onSave: () => void; salvando: boolean; live: boolean }) {
  const toast = useToast()
  const { credits, reload, addCredits } = useStore()
  const [lendo, setLendo] = useState(0)
  const fotoRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof Treino) => (v: string) => onChange({ ...treino, [k]: v })
  const setEntrega = (i: number, p: Partial<Entrega>) => onChange({ ...treino, entregas: treino.entregas.map((e, j) => (j === i ? { ...e, ...p } : e)) })

  async function lerFotos(files: FileList | null) {
    const lista = [...(files ?? [])].filter((f) => f.type.startsWith('image/')).slice(0, 6)
    if (!lista.length) return
    if (credits < lista.length * CREDITOS_FOTO_CARDAPIO) return toast.show(`Precisa de ${lista.length * CREDITOS_FOTO_CARDAPIO} créditos pra ler ${lista.length > 1 ? 'essas fotos' : 'essa foto'}.`)
    let texto = treino.produtos.trim()
    let lidas = 0
    for (const [i, f] of lista.entries()) {
      setLendo(i + 1)
      let lido = ''
      if (live && supabase) {
        const imagem = await fotoParaBase64(f).catch(() => '')
        if (!imagem) continue
        const { data, error } = await supabase.functions.invoke('whatsapp', { body: { acao: 'ler_cardapio', imagem } })
        if (error) {
          const e = await erroDe(error)
          toast.show(e === 'creditos_insuficientes' ? 'Seus créditos acabaram.' : e === 'sem_itens' ? 'Não achei itens com preço nessa foto (os créditos voltaram).' : 'Não consegui ler uma das fotos. Tenta uma foto mais nítida (os créditos voltaram).')
          if (e === 'creditos_insuficientes') break
          continue
        }
        lido = String(data?.texto ?? '').trim()
      } else {
        await new Promise((r) => setTimeout(r, 1200))
        lido = DEMO_CARDAPIO
        addCredits(-CREDITOS_FOTO_CARDAPIO, 'Atendente: leitura do cardápio')
      }
      if (lido) {
        texto = texto ? `${texto}\n${lido}` : lido
        lidas++
      }
    }
    setLendo(0)
    if (fotoRef.current) fotoRef.current.value = ''
    if (live) reload()
    if (lidas) {
      onChange({ ...treino, produtos: texto })
      toast.show('Cardápio lido! Confira os preços e clique em Salvar treino.')
    }
  }

  const nicho = nichoPor(treino.nicho)
  const temPergunta = (q: string) => treino.perguntas.toLowerCase().includes(q.toLowerCase().replace(/\?$/, ''))
  const addPergunta = (q: string) => onChange({ ...treino, perguntas: `${treino.perguntas.trim() ? `${treino.perguntas.trim()}\n` : ''}${q} ` })
  const setExtra = (label: string, v: string) => onChange({ ...treino, extras: { ...treino.extras, [label]: v } })
  const tituloLocal = nicho?.id === 'servicos' ? 'Onde fica' : nicho?.id === 'fabrica' ? 'Endereço e entrega' : 'Loja e entrega'

  return (
    <div className="flex flex-col gap-4">
      <Secao icon={Store} titulo="Qual é o seu negócio?" dica="Cada tipo de negócio tem um treino diferente. Escolha o seu pra liberar os campos certos.">
        <div role="radiogroup" aria-label="Tipo de negócio" className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {NICHOS.map((n) => {
            const on = treino.nicho === n.id
            return (
              <button key={n.id} type="button" role="radio" aria-checked={on} onClick={() => onChange({ ...treino, nicho: n.id })} className={cx('press flex min-h-[84px] cursor-pointer flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors', on ? 'border-accent bg-[#ff8a3d14] shadow-[0_0_0_1px_#ff8a3d]' : 'border-line-strong bg-bg hover:border-[#ff8a3d80]')}>
                <span className="flex w-full items-center gap-2">
                  <span className="text-[20px] leading-none">{n.emoji}</span>
                  <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-tight text-ink">{n.nome}</span>
                  {on && <Check size={16} className="shrink-0 text-accent" />}
                </span>
                <span className="text-[12.5px] leading-snug text-muted">{n.exemplos}</span>
              </button>
            )
          })}
        </div>
        {treino.nicho === 'outro' && <Campo label="Qual é o seu negócio?" rows={1} value={treino.nicho_outro} onChange={set('nicho_outro')} placeholder="Ex.: pet shop, autoescola, imobiliária, loja de materiais de construção" />}
      </Secao>

      {!nicho ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-line-strong px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-muted">
            <Lock size={22} />
          </span>
          <p className="m-0 max-w-[360px] text-[15px] font-semibold text-ink">Escolha o tipo do seu negócio aí em cima</p>
          <p className="m-0 max-w-[380px] text-[13.5px] text-muted">Aí aparecem os campos e as perguntas certas pra ele, com exemplos do seu ramo.</p>
        </div>
      ) : (
        <>
          <Secao icon={GraduationCap} titulo="O básico" dica="Ele já usa o que está em Meu Negócio. Aqui você ensina o resto.">
            <div className="grid gap-4 md:grid-cols-2">
              <Campo label="Nome do atendente" rows={1} value={treino.nome_atendente} onChange={set('nome_atendente')} placeholder="Ex.: Ana" />
              <label className="flex flex-col gap-1.5">
                <span className="text-[14px] font-semibold text-ink">Jeito de falar</span>
                <select value={treino.tom} onChange={(e) => set('tom')(e.target.value)} className="h-12 rounded-xl border border-line-strong bg-bg px-3 text-[15px] text-ink outline-none focus:border-accent">
                  {TONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <Campo label="Horário de atendimento" rows={1} value={treino.horario} onChange={set('horario')} placeholder="Seg a sáb, 9h às 19h" />
              <Campo label="Como se apresentar" rows={1} value={treino.apresentacao} onChange={set('apresentacao')} placeholder="Oi! Aqui é a Ana da Loja X 😊" />
            </div>
          </Secao>

          <Secao icon={Camera} titulo={nicho.produtosTitulo} dica="É a única fonte de preço que ele usa: o que não estiver aqui, ele não inventa.">
            <input ref={fotoRef} type="file" accept="image/*" multiple hidden onChange={(e) => lerFotos(e.target.files)} />
            <button type="button" onClick={() => fotoRef.current?.click()} disabled={!!lendo} className="press flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-bg p-4 text-left hover:border-accent disabled:cursor-wait">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff8a3d1a] text-accent">{lendo ? <LoaderCircle size={20} className="animate-spin" /> : <Camera size={20} />}</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold text-ink">{lendo ? `Lendo a foto ${lendo}…` : nicho.fotoLabel}</span>
                <span className="text-[13px] text-muted">{lendo ? 'Leva uns segundos por foto.' : `Ele lê os itens e os valores e escreve aqui embaixo. ${CREDITOS_FOTO_CARDAPIO} créditos por foto, até 6 de uma vez.`}</span>
              </span>
            </button>
            <Campo label="Itens e preços" dica="Um por linha. Pode escrever, colar ou corrigir o que ele leu da foto." rows={7} value={treino.produtos} onChange={set('produtos')} placeholder={nicho.produtosPlaceholder} />
          </Secao>

          {nicho.extras.length > 0 && (
            <Secao icon={Briefcase} titulo="Como funciona o seu negócio" dica="O que os clientes desse ramo sempre querem saber.">
              <div className="grid gap-4 md:grid-cols-2">
                {nicho.extras.map((x) => (
                  <Campo key={x.label} label={x.label} dica={x.dica} rows={3} value={treino.extras[x.label] ?? ''} onChange={(v) => setExtra(x.label, v)} placeholder={x.placeholder} />
                ))}
              </div>
            </Secao>
          )}

          {nicho.id === 'servicos' && (
            <Secao icon={CalendarClock} titulo="Agenda" dica="Quando o cliente quiser marcar horário pelo WhatsApp, o que o atendente faz?">
              <div role="radiogroup" aria-label="Tipo de agenda" className="grid gap-2.5 md:grid-cols-2">
                {[
                  { id: 'manual', t: 'Manual: eu confirmo', d: 'Ele anota o horário que o cliente quer, diz que vai verificar e manda pra aba Agenda. Você confere na sua agenda (papel, caderno, outro app) e confirma com um toque.' },
                  { id: 'automatica', t: 'Automática: ele agenda sozinho', d: 'O Plotoon cria a sua agenda. Ele só oferece horários livres dentro do seu horário de atendimento, já confirma com o cliente e lança na agenda.' },
                ].map((o) => {
                  const on = (treino.agenda_modo || 'manual') === o.id
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onChange({ ...treino, agenda_modo: o.id })} className={cx('press flex cursor-pointer flex-col items-start gap-1.5 rounded-2xl border p-4 text-left', on ? 'border-accent bg-[#ff8a3d14] shadow-[0_0_0_1px_#ff8a3d]' : 'border-line-strong bg-bg hover:border-[#ff8a3d80]')}>
                      <span className="flex w-full items-center gap-2 text-[15px] font-bold text-ink">
                        {o.t} {on && <Check size={16} className="ml-auto text-accent" />}
                      </span>
                      <span className="text-[13px] leading-snug text-muted">{o.d}</span>
                    </button>
                  )
                })}
              </div>
              {treino.agenda_modo === 'automatica' && <p className="m-0 rounded-xl bg-[#facc1512] px-3.5 py-2.5 text-[13px] text-[#fde68a]">Preencha bem o horário de atendimento e a duração de cada serviço (ex.: "Corte: R$ 45 (40 min)"). É com isso que ele monta os horários livres.</p>}
            </Secao>
          )}

          {(nicho.endereco !== 'nao' || nicho.entregaBairros || nicho.frete) && (
            <Secao icon={MapPin} titulo={tituloLocal} dica={nicho.entregaBairros ? 'Pra ele explicar onde fica e cobrar a taxa certa de cada lugar.' : 'Pra ele explicar onde fica e como o cliente recebe.'}>
              {nicho.endereco !== 'nao' && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Campo label={nicho.endereco === 'opcional' ? 'Endereço (se tiver loja ou fábrica)' : 'Endereço'} rows={1} value={treino.endereco} onChange={set('endereco')} placeholder="Rua das Palmeiras, 230, Centro" />
                    <Campo label="Ponto de referência" rows={1} value={treino.referencia} onChange={set('referencia')} placeholder="Ao lado da farmácia, em frente à praça" />
                  </div>
                  <Campo label="Link do mapa (opcional)" dica="Copie no Google Maps em Compartilhar. Ele manda quando perguntarem onde fica." rows={1} value={treino.mapa} onChange={set('mapa')} placeholder="https://maps.app.goo.gl/…" />
                </>
              )}
              {nicho.entregaBairros && (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                      <Truck size={16} className="text-accent" /> Onde entrega e quanto custa
                    </span>
                    {treino.entregas.map((e, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_44px] gap-2 rounded-2xl border border-line bg-bg p-2 sm:grid-cols-[1fr_130px_150px_44px] sm:border-0 sm:bg-transparent sm:p-0">
                        <input value={e.local} onChange={(ev) => setEntrega(i, { local: ev.target.value })} placeholder="Bairro ou região" aria-label="Bairro ou região" className={cx(inputCls, 'col-span-3 sm:col-span-1')} />
                        <input value={e.taxa} onChange={(ev) => setEntrega(i, { taxa: ev.target.value })} placeholder="Taxa: R$ 6" aria-label="Taxa de entrega" className={inputCls} />
                        <input value={e.prazo} onChange={(ev) => setEntrega(i, { prazo: ev.target.value })} placeholder="Prazo: 40 min" aria-label="Prazo de entrega" className={inputCls} />
                        <button type="button" onClick={() => onChange({ ...treino, entregas: treino.entregas.filter((_, j) => j !== i) })} aria-label="Remover lugar" className="press flex h-12 w-11 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-ink">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => onChange({ ...treino, entregas: [...treino.entregas, { local: '', taxa: '', prazo: '' }] })} className="press flex h-11 cursor-pointer items-center gap-2 self-start rounded-full border border-line-strong px-4 text-[14px] font-semibold text-soft hover:text-ink">
                      <Plus size={16} /> Adicionar lugar
                    </button>
                  </div>
                  <Campo label="Fora dessas áreas" rows={1} value={treino.fora_area} onChange={set('fora_area')} placeholder="Não entregamos, só retirada na loja" />
                </>
              )}
              {nicho.frete && <Campo label={nicho.frete.label} rows={3} value={treino.frete} onChange={set('frete')} placeholder={nicho.frete.placeholder} />}
            </Secao>
          )}

          <Secao icon={MessageCircle} titulo="Perguntas e regras">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-muted">Perguntas comuns no seu ramo: toque pra adicionar e escreva a resposta</span>
              <div className="flex flex-wrap gap-2">
                {nicho.perguntas.map((q) => {
                  const ja = temPergunta(q)
                  return (
                    <button key={q} type="button" disabled={ja} onClick={() => addPergunta(q)} className={cx('press flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium', ja ? 'cursor-default border-[#34d39955] text-[#6ee7b7]' : 'border-line-strong text-soft hover:border-accent hover:text-ink')}>
                      {ja ? <Check size={13} /> : <Plus size={13} />} {q}
                    </button>
                  )
                })}
              </div>
            </div>
            <Campo label="Perguntas que os clientes sempre fazem" dica="Pergunta e resposta, do jeito que você responderia." rows={6} value={treino.perguntas} onChange={set('perguntas')} placeholder={nicho.perguntasPlaceholder} />
            <Campo label="Regras importantes" dica="O que ele nunca deve fazer, quando chamar você, promoções do momento." rows={3} value={treino.regras} onChange={set('regras')} placeholder={nicho.regrasPlaceholder} />
          </Secao>

          <Secao icon={Repeat} titulo="Remarketing" dica="Mensagens que ele manda sozinho depois, pra trazer o cliente de volta. Cada uma é escrita na hora, com o nome e o que a pessoa pediu.">
            <div className="flex flex-col gap-2.5">
              {(['pos_pedido', 'sem_resposta', 'voltar'] as Gatilho[]).map((g) => {
                const pre = nicho.remarketing[g]
                const rm = treino.remarketing[g]
                const on = !!rm?.ativo
                const espera = rm?.espera_h ?? pre.espera_h
                const setRm = (patch: Partial<Remarketing>) => onChange({ ...treino, remarketing: { ...treino.remarketing, [g]: { ativo: on, espera_h: espera, instrucao: rm?.instrucao ?? pre.instrucao, ...patch } } })
                const esperaTxt = ESPERAS.find((x) => x.h === espera)?.t ?? `${espera}h`
                return (
                  <div key={g} className={cx('flex flex-col gap-3 rounded-2xl border p-3.5', on ? 'border-[#34d39955] bg-[#0f1a15]' : 'border-line-strong bg-bg')}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] font-bold text-ink">{pre.titulo}</span>
                        <span className="text-[13px] text-muted">
                          {on ? `Manda ${esperaTxt} ${pre.quando}` : 'Desligado'}
                        </span>
                      </span>
                      <input type="checkbox" role="switch" aria-label={pre.titulo} checked={on} onChange={(e) => setRm({ ativo: e.target.checked })} className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-surface-2 transition-colors before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:transition-transform checked:bg-[#34d399] checked:before:translate-x-[22px]" />
                    </label>
                    {on && (
                      <div className="grid gap-3 md:grid-cols-[170px_1fr]">
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[13px] font-semibold text-ink">Quanto tempo depois</span>
                          <select value={espera} onChange={(e) => setRm({ espera_h: Number(e.target.value) })} className="h-12 rounded-xl border border-line-strong bg-surface px-3 text-[15px] text-ink outline-none focus:border-accent">
                            {ESPERAS.map((x) => (
                              <option key={x.h} value={x.h}>
                                {x.t}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="text-[13px] font-semibold text-ink">O que ele deve falar</span>
                          <textarea value={rm?.instrucao ?? pre.instrucao} onChange={(e) => setRm({ instrucao: e.target.value })} rows={2} placeholder={pre.instrucao} className="resize-y rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14.5px] leading-relaxed text-ink outline-none placeholder:text-subtle focus:border-accent" />
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="m-0 text-[12.5px] text-muted">Só envia entre 9h e 21h, uma vez por cliente, e nunca pra quem pediu pra não receber. Cada mensagem gasta 1 crédito.</p>
          </Secao>

          <Secao icon={Lightbulb} titulo="Observações" dica="Escreva do seu jeito, como se estivesse explicando pra um funcionário novo. Vale qualquer coisa.">
            <Campo label="O que mais ele precisa saber" rows={5} value={treino.observacoes} onChange={set('observacoes')} placeholder={nicho.observacoesPlaceholder} />
            {treino.licoes.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-semibold text-ink">Correções que você fez no simulador</span>
                {treino.licoes.map((l, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-line bg-bg p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1 text-[13.5px]">
                      {l.cliente && <span className="text-muted">Cliente: "{l.cliente}"</span>}
                      <span className="text-ink">Responder assim: {l.certo}</span>
                    </div>
                    <button type="button" onClick={() => onChange({ ...treino, licoes: treino.licoes.filter((_, j) => j !== i) })} aria-label="Apagar correção" className="press flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-ink">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Secao>
        </>
      )}

      {nicho && (
        <div className="sticky bottom-[92px] z-20 flex justify-end lg:bottom-4">
          <Button size="lg" onClick={onSave} disabled={salvando} className="shadow-[0_10px_30px_-8px_rgba(0,0,0,.6)]">
            {salvando ? <LoaderCircle size={18} className="animate-spin" /> : <GraduationCap size={18} />} Salvar treino
          </Button>
        </div>
      )}
    </div>
  )
}

/* ---------- testar (simulador) ---------- */
type SimMsg = { de: 'cliente' | 'ia'; texto: string }
const DEMO_RESP = ['Oi! Tudo bem? 😊', 'Temos sim! A camiseta básica sai por R$ 59,90 e vai do P ao GG.', 'Qual tamanho você usa?']

function Testar({ treino, nome, live, onLicao }: { treino: Treino; nome: string; live: boolean; onLicao: (l: Licao) => void }) {
  const [msgs, setMsgs] = useState<SimMsg[]>([])
  const [corrigindo, setCorrigindo] = useState<number | null>(null)
  const [certo, setCerto] = useState('')
  const [corrigidas, setCorrigidas] = useState<number[]>([])

  function salvarCorrecao(i: number) {
    const t = certo.trim()
    if (!t) return
    const cliente = [...msgs.slice(0, i)].reverse().find((m) => m.de === 'cliente')?.texto ?? ''
    onLicao({ cliente: cliente.slice(0, 300), certo: t.slice(0, 1000) })
    setCorrigidas((c) => [...c, i])
    setCorrigindo(null)
    setCerto('')
  }
  const [txt, setTxt] = useState('')
  const [digitando, setDigitando] = useState(false)
  const [chamou, setChamou] = useState(false)
  const [registro, setRegistro] = useState<{ tipo: string; dados: Record<string, unknown> } | null>(null)
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = fim.current?.parentElement
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
  }, [msgs, digitando])

  async function enviar() {
    const t = txt.trim()
    if (!t || digitando) return
    const hist = [...msgs, { de: 'cliente' as const, texto: t }]
    setMsgs(hist)
    setTxt('')
    setDigitando(true)
    let partes: string[] = []
    let chamar = false
    let reg: { tipo: string; dados: Record<string, unknown> } | null = null
    if (live && supabase) {
      const { data } = await supabase.functions.invoke('whatsapp', { body: { acao: 'simular', historico: hist, treino } })
      partes = data?.partes ?? []
      chamar = !!data?.chamar
      reg = data?.registro ?? null
    } else {
      await new Promise((r) => setTimeout(r, 900))
      partes = DEMO_RESP
    }
    if (!partes.length) partes = ['(não consegui responder agora, tenta de novo)']
    for (const p of partes) {
      await new Promise((r) => setTimeout(r, Math.min(2200, 500 + p.length * 18)))
      setMsgs((m) => [...m, { de: 'ia', texto: p }])
    }
    setDigitando(false)
    if (chamar) setChamou(true)
    if (reg) setRegistro(reg)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="flex h-[min(620px,72vh)] flex-col overflow-hidden rounded-[22px] border border-line bg-[#0b1411]">
        <div className="flex items-center gap-3 border-b border-white/5 bg-[#111c18] px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34d39926] text-[#6ee7b7]">
            <Bot size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[15px] font-semibold text-white">{treino.nome_atendente || nome || 'Seu atendente'}</span>
            <span className="text-[12px] text-[#9fb5ad]">{digitando ? 'digitando…' : 'simulador · não envia pro WhatsApp'}</span>
          </span>
          <button type="button" onClick={() => (setMsgs([]), setChamou(false), setRegistro(null), setCorrigidas([]), setCorrigindo(null))} aria-label="Recomeçar conversa" className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#9fb5ad] hover:bg-white/5">
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
          {!msgs.length && <p className="m-auto max-w-[260px] text-center text-[13.5px] text-[#9fb5ad]">Escreva como se fosse um cliente. Ex.: "oi, quanto custa?"</p>}
          {msgs.map((m, i) =>
            m.de === 'cliente' ? (
              <div key={i} className="pop max-w-[80%] self-end rounded-2xl rounded-br-md bg-[#1f6f55] px-3.5 py-2 text-[14.5px] leading-snug text-white">
                {m.texto}
              </div>
            ) : (
              <div key={i} className="pop flex max-w-[88%] flex-col items-start gap-1.5 self-start">
                <div className="flex items-end gap-1">
                  <div className={cx('rounded-2xl rounded-bl-md bg-[#1c2724] px-3.5 py-2 text-[14.5px] leading-snug text-[#e6efec]', corrigidas.includes(i) && 'line-through opacity-50')}>{m.texto}</div>
                  {!digitando && corrigindo !== i && !corrigidas.includes(i) && (
                    <button type="button" onClick={() => (setCorrigindo(i), setCerto(''))} aria-label="Corrigir essa resposta" title="Corrigir essa resposta" className="press flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#7d948c] hover:bg-white/5 hover:text-white">
                      <Pencil size={15} />
                    </button>
                  )}
                  {corrigidas.includes(i) && <Check size={16} className="mb-2 shrink-0 text-[#6ee7b7]" aria-label="Corrigida" />}
                </div>
                {corrigindo === i && (
                  <div className="flex w-[min(340px,78vw)] flex-col gap-2 rounded-2xl border border-[#2a3a35] bg-[#111c18] p-3">
                    <span className="text-[13px] font-semibold text-white">Como ele deveria ter respondido?</span>
                    <textarea autoFocus value={certo} onChange={(e) => setCerto(e.target.value)} rows={3} placeholder="Escreva a resposta certa. Ele aprende e responde assim nas próximas vezes." className="resize-none rounded-xl bg-[#1c2724] px-3 py-2 text-[14px] text-white outline-none placeholder:text-[#7d948c]" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => salvarCorrecao(i)} disabled={!certo.trim()} className="press flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#25d366] px-4 text-[13.5px] font-semibold text-[#0b1411] disabled:opacity-40">
                        <Check size={15} /> Ensinar
                      </button>
                      <button type="button" onClick={() => setCorrigindo(null)} className="press flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13.5px] text-[#9fb5ad] hover:text-white">
                        <X size={15} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ),
          )}
          {digitando && (
            <div className="self-start rounded-2xl rounded-bl-md bg-[#1c2724] px-4 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#9fb5ad]" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          )}
          {chamou && <p className="pop mx-auto mt-2 rounded-full bg-[#facc1522] px-3 py-1 text-center text-[12px] font-semibold text-[#fde68a]">Aqui você receberia o aviso pra assumir a conversa</p>}
          {registro && (
            <div className="pop mx-auto mt-2 flex max-w-[92%] flex-col gap-1 rounded-2xl border border-[#34d39955] bg-[#0f2a20] px-3.5 py-2.5 text-[12.5px] text-[#a7f3d0]">
              <span className="font-bold">{registro.tipo === 'AGENDAR' ? 'Aqui o horário iria pra aba Agenda' : 'Aqui o pedido iria pra aba Pedidos'}</span>
              {registro.tipo === 'AGENDAR' ? (
                <span>
                  {String(registro.dados.servico ?? '')} · {String(registro.dados.quando ?? '').replace('T', ' às ')}
                </span>
              ) : (
                <span>
                  {(Array.isArray(registro.dados.itens) ? registro.dados.itens : []).map((i) => `${(i as { qtd?: number }).qtd ?? 1}x ${(i as { item?: string }).item ?? ''}`).join(' · ')}
                  {registro.dados.total ? ` · Total ${String(registro.dados.total)}` : ''}
                </span>
              )}
            </div>
          )}
          <div ref={fim} />
        </div>
        <form onSubmit={(e) => (e.preventDefault(), enviar())} className="flex items-center gap-2 border-t border-white/5 bg-[#111c18] p-2.5">
          <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Mensagem do cliente" aria-label="Mensagem do cliente" className="h-12 min-w-0 flex-1 rounded-full bg-[#1c2724] px-4 text-[15px] text-white outline-none placeholder:text-[#7d948c]" />
          <button type="submit" disabled={!txt.trim() || digitando} aria-label="Enviar" className="press flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#25d366] text-[#0b1411] disabled:opacity-40">
            <Send size={19} />
          </button>
        </form>
      </div>
      <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface p-5 text-[14px] text-soft">
        <h3 className="m-0 font-display text-[17px] font-bold text-ink">Como ele responde</h3>
        {['Mensagens curtas, divididas como gente digita', 'Mostra "digitando…" e espera o cliente terminar de escrever', 'Entende áudio e foto', 'Nunca inventa preço: usa só o que está no treino', 'Quando precisa de você, diz que vai verificar e te avisa', 'Resposta ruim? Toque no lápis e ensine o jeito certo'].map((t) => (
          <span key={t} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-[#6ee7b7]" /> {t}
          </span>
        ))}
        <p className="m-0 mt-1 text-[12.5px] text-muted">O simulador usa o treino que está na tela, mesmo sem salvar. É grátis. As correções já ficam salvas.</p>
      </div>
    </div>
  )
}

/* ---------- conversas ---------- */
const DEMO_CONVS: Conversa[] = [
  { id: 'c1', jid: '5511988887777@s.whatsapp.net', nome: 'Carla M.', ultima_msg: 'Tem no tamanho M?', ultima_em: new Date().toISOString(), ia_pausada: false, precisa_dono: false, nao_lidas: 2 },
  { id: 'c2', jid: '5511977776666@s.whatsapp.net', nome: 'João P.', ultima_msg: 'Quero fechar 2 unidades', ultima_em: new Date(Date.now() - 9e5).toISOString(), ia_pausada: true, precisa_dono: true, nao_lidas: 1 },
  { id: 'c3', jid: '5511966665555@s.whatsapp.net', nome: 'Bia', ultima_msg: 'Obrigada! Vou ver e te falo', ultima_em: new Date(Date.now() - 4e6).toISOString(), ia_pausada: false, precisa_dono: false, nao_lidas: 0 },
]
const DEMO_MSGS: Msg[] = [
  { id: 'm1', de: 'cliente', texto: 'Oi, tem a camiseta preta?', created_at: new Date(Date.now() - 2e5).toISOString() },
  { id: 'm2', de: 'ia', texto: 'Oi, Carla! Tem sim 😊', created_at: new Date(Date.now() - 1.8e5).toISOString() },
  { id: 'm3', de: 'ia', texto: 'Sai por R$ 59,90. Qual tamanho você usa?', created_at: new Date(Date.now() - 1.7e5).toISOString() },
  { id: 'm4', de: 'cliente', texto: 'Tem no tamanho M?', created_at: new Date().toISOString() },
]

function Conversas({ uid, live, inicial }: { uid: string; live: boolean; inicial?: string | null }) {
  const toast = useToast()
  const [convs, setConvs] = useState<Conversa[] | null>(live ? null : DEMO_CONVS)
  const [aberta, setAberta] = useState<string | null>(inicial ?? null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [txt, setTxt] = useState('')
  const [enviando, setEnviando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)

  const carregar = useCallback(async () => {
    if (!live || !supabase) return
    const { data } = await supabase.from('whatsapp_conversas').select('*').order('ultima_em', { ascending: false }).limit(100)
    setConvs((data ?? []) as Conversa[])
  }, [live])

  useEffect(() => {
    carregar()
    if (!live || !supabase || !uid) return
    const ch = supabase
      .channel('wa-conversas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversas', filter: `user_id=eq.${uid}` }, () => carregar())
      .subscribe()
    return () => {
      supabase?.removeChannel(ch)
    }
  }, [carregar, live, uid])

  useEffect(() => {
    if (!aberta) return
    if (!live || !supabase) return setMsgs(DEMO_MSGS)
    let off = false
    supabase
      .from('whatsapp_mensagens')
      .select('id, de, texto, created_at')
      .eq('conversa_id', aberta)
      .order('created_at')
      .limit(300)
      .then(({ data }) => !off && setMsgs((data ?? []) as Msg[]))
    supabase.from('whatsapp_conversas').update({ nao_lidas: 0 }).eq('id', aberta).then(() => null)
    const ch = supabase
      .channel(`wa-msgs-${aberta}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_mensagens', filter: `conversa_id=eq.${aberta}` }, (p) => setMsgs((m) => (m.some((x) => x.id === p.new.id) ? m : [...m, p.new as Msg])))
      .subscribe()
    return () => {
      off = true
      supabase?.removeChannel(ch)
    }
  }, [aberta, live])
  useEffect(() => {
    const box = fim.current?.parentElement
    if (box) box.scrollTop = box.scrollHeight
  }, [msgs])

  const conv = convs?.find((c) => c.id === aberta) ?? null
  async function iaNaConversa(on: boolean) {
    if (!conv) return
    setConvs((cs) => cs?.map((c) => (c.id === conv.id ? { ...c, ia_pausada: !on, precisa_dono: on ? false : c.precisa_dono } : c)) ?? null)
    if (live && supabase) await supabase.from('whatsapp_conversas').update({ ia_pausada: !on, ...(on ? { precisa_dono: false } : {}) }).eq('id', conv.id)
  }
  async function enviar() {
    const t = txt.trim()
    if (!t || !conv || enviando) return
    setEnviando(true)
    if (live && supabase) {
      const { error } = await supabase.functions.invoke('whatsapp', { body: { acao: 'enviar', conversa_id: conv.id, texto: t } })
      if (error) {
        setEnviando(false)
        return toast.show('Não consegui enviar. Confere se o WhatsApp está conectado.')
      }
    } else setMsgs((m) => [...m, { id: String(Date.now()), de: 'dono', texto: t, created_at: new Date().toISOString() }])
    setTxt('')
    setEnviando(false)
  }

  const lista = (
    <div className={cx('flex min-w-0 flex-col gap-2', aberta && 'hidden md:flex')}>
      {convs === null ? (
        <div className="flex justify-center py-10">
          <LoaderCircle className="animate-spin text-accent" />
        </div>
      ) : !convs.length ? (
        <p className="m-0 rounded-2xl border border-dashed border-line-strong p-6 text-center text-[14px] text-muted">Quando alguém mandar mensagem pro seu WhatsApp, a conversa aparece aqui.</p>
      ) : (
        convs.map((c) => (
          <button key={c.id} type="button" onClick={() => setAberta(c.id)} className={cx('press flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left', c.id === aberta ? 'border-accent bg-[#ff8a3d10]' : 'border-line bg-bg/40 hover:border-line-strong')}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[15px] font-bold">{(c.nome || '?').charAt(0).toUpperCase()}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2">
                <span className="truncate text-[15px] font-semibold text-ink">{c.nome || numeroBonito(c.jid)}</span>
                {c.precisa_dono && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-ink">Precisa de você</span>}
              </span>
              <span className="truncate text-[13px] text-muted">{c.ultima_msg}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[11.5px] text-subtle">{quando(c.ultima_em)}</span>
              {c.nao_lidas > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-bold text-[#0b1411]">{c.nao_lidas}</span>}
              {c.ia_pausada && !c.precisa_dono && <Pause size={13} className="text-muted" aria-label="IA pausada" />}
            </span>
          </button>
        ))
      )}
    </div>
  )

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(260px,340px)_1fr]">
      {lista}
      {conv ? (
        <div className="flex h-[min(640px,74vh)] flex-col overflow-hidden rounded-[22px] border border-line bg-[#0b1411]">
          <div className="flex items-center gap-2 border-b border-white/5 bg-[#111c18] px-2 py-2.5 sm:px-4">
            <button type="button" onClick={() => setAberta(null)} aria-label="Voltar pra lista" className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#9fb5ad] md:hidden">
              <ArrowLeft size={20} />
            </button>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[15px] font-semibold text-white">{conv.nome || numeroBonito(conv.jid)}</span>
              <span className="text-[12px] text-[#9fb5ad]">{numeroBonito(conv.jid)}</span>
            </span>
            <Button size="sm" variant={conv.ia_pausada ? 'primary' : 'secondary'} onClick={() => iaNaConversa(conv.ia_pausada)}>
              {conv.ia_pausada ? <Play size={15} /> : <Pause size={15} />} {conv.ia_pausada ? 'Ligar IA' : 'Assumir'}
            </Button>
          </div>
          {conv.ia_pausada && <p className="m-0 bg-[#facc1514] px-4 py-2 text-[12.5px] text-[#fde68a]">{conv.precisa_dono ? 'O atendente chamou você. Ele não responde essa conversa até você ligar a IA de novo.' : 'Você assumiu: a IA não responde essa conversa até você ligar de novo.'}</p>}
          <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
            {msgs.map((m) => (
              <div key={m.id} className={cx('max-w-[80%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug', m.de === 'cliente' ? 'self-start rounded-bl-md bg-[#1c2724] text-[#e6efec]' : 'self-end rounded-br-md text-white', m.de === 'ia' && 'bg-[#1f6f55]', m.de === 'dono' && 'bg-[#3b4fa8]')}>
                {m.de !== 'cliente' && (
                  <span className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-white/70">
                    {m.de === 'ia' ? <Bot size={12} /> : <UserRound size={12} />} {m.de === 'ia' ? 'Atendente' : 'Você'}
                  </span>
                )}
                {m.texto}
                <span className="ml-2 align-bottom text-[10.5px] text-white/50">{hora(m.created_at)}</span>
              </div>
            ))}
            <div ref={fim} />
          </div>
          <form onSubmit={(e) => (e.preventDefault(), enviar())} className="flex items-center gap-2 border-t border-white/5 bg-[#111c18] p-2.5">
            <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Responder como você (a IA pausa nessa conversa)" aria-label="Sua resposta" className="h-12 min-w-0 flex-1 rounded-full bg-[#1c2724] px-4 text-[15px] text-white outline-none placeholder:text-[#7d948c]" />
            <button type="submit" disabled={!txt.trim() || enviando} aria-label="Enviar" className="press flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#25d366] text-[#0b1411] disabled:opacity-40">
              {enviando ? <LoaderCircle size={19} className="animate-spin" /> : <Send size={19} />}
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden min-h-[320px] flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-line-strong text-center text-[14px] text-muted md:flex">
          <MessageCircle size={28} />
          Escolha uma conversa
        </div>
      )}
    </div>
  )
}

/* ---------- página ---------- */
export function WhatsAppPage() {
  const { session } = useAuth()
  const { live } = useStore()
  const { business } = useBusiness()
  const toast = useToast()
  const uid = session?.user.id ?? ''
  const [aba, setAba] = useState<Aba>('conectar')
  const [bot, setBot] = useState<Bot | null>(null)
  const [treino, setTreino] = useState<Treino>(TREINO_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [convInicial, setConvInicial] = useState<string | null>(null)
  const pedidos = usePedidos(uid, live)
  const servicos = treino.nicho === 'servicos'
  const instance = useMemo(() => (uid ? `pl${uid.replace(/-/g, '').slice(0, 22)}` : ''), [uid])

  useEffect(() => {
    if (!live || !supabase || !uid) {
      if (DEMO) setBot({ status: 'desconectado', numero: null, nome_perfil: null, qr: null, ativo: true, treino: {} })
      return
    }
    supabase
      .from('whatsapp_bots')
      .select('status, numero, nome_perfil, qr, ativo, treino')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => {
        const b = (data as Bot | null) ?? { status: 'desconectado', numero: null, nome_perfil: null, qr: null, ativo: true, treino: {} }
        setBot(b)
        setTreino({ ...TREINO_VAZIO, ...(b.treino ?? {}) })
        if (b.status === 'conectado') setAba('conversas')
      })
    // QR e conexão chegam em tempo real
    const ch = supabase
      .channel('wa-bot')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_bots', filter: `user_id=eq.${uid}` }, (p) => setBot((b) => ({ ...(b as Bot), ...(p.new as Bot) })))
      .subscribe()
    return () => {
      supabase?.removeChannel(ch)
    }
  }, [live, uid])

  const onBot = useCallback(
    (p: Partial<Bot>) => {
      setBot((b) => ({ ...(b as Bot), ...p }))
      if ('ativo' in p && live && supabase && uid) supabase.from('whatsapp_bots').update({ ativo: p.ativo }).eq('user_id', uid).then(() => null)
    },
    [live, uid],
  )

  async function salvarTreino(t: Treino = treino, aviso = 'Treino salvo! O atendente já usa nas próximas respostas.') {
    if (!live || !supabase || !uid) return toast.show(`${aviso.split('!')[0]}! (na prévia fica só na tela)`)
    setSalvando(true)
    const { error } = await supabase.from('whatsapp_bots').upsert({ user_id: uid, instance, treino: t, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSalvando(false)
    toast.show(error ? 'Não consegui salvar agora.' : aviso)
  }

  function ensinar(l: Licao) {
    const novo = { ...treino, licoes: [...treino.licoes, l].slice(-40) }
    setTreino(novo)
    salvarTreino(novo, 'Aprendido! Nas próximas vezes ele responde desse jeito.')
  }

  const conectado = bot?.status === 'conectado'
  const abas: Array<{ id: Aba; t: string; icon: typeof QrCode }> = [
    { id: 'conectar', t: conectado ? 'Conexão' : 'Conectar', icon: QrCode },
    { id: 'treinar', t: 'Treinar', icon: GraduationCap },
    { id: 'testar', t: 'Testar', icon: Bot },
    { id: 'conversas', t: 'Conversas', icon: MessageCircle },
    { id: 'pedidos', t: servicos ? 'Agenda' : 'Pedidos', icon: servicos ? CalendarClock : ClipboardList },
  ]

  return (
    <AppShell active="whatsapp" wide>
      <ModuleHeader id="whatsapp" actions={bot ? <Badge tone={conectado ? 'sky' : 'neutral'}>{conectado ? (bot.ativo ? 'Respondendo' : 'Pausado') : 'Desconectado'}</Badge> : undefined} />
      <div role="tablist" aria-label="Seções do atendente" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {abas.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={a.id === aba} onClick={() => setAba(a.id)} className={cx('press flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] font-semibold', a.id === aba ? 'border-accent bg-[#ff8a3d1a] text-ink' : 'border-line text-muted hover:text-ink')}>
            <a.icon size={16} /> {a.t}
            {a.id === 'pedidos' && pedidos.abertos > 0 && <span className="rounded-full bg-accent px-1.5 text-[11.5px] font-bold text-accent-ink">{pedidos.abertos}</span>}
          </button>
        ))}
      </div>
      <div className="rise" key={aba}>
        {aba === 'conectar' && <Conectar bot={bot} onBot={onBot} live={live} />}
        {aba === 'treinar' && <Treinar treino={treino} onChange={setTreino} onSave={() => salvarTreino()} salvando={salvando} live={live} />}
        {aba === 'testar' && <Testar treino={treino} nome={business.name} live={live} onLicao={ensinar} />}
        {aba === 'conversas' && <Conversas uid={uid} live={live} inicial={convInicial} />}
        {aba === 'pedidos' && <Pedidos uid={uid} live={live} negocio={business.name} servicos={servicos} agendaAuto={servicos && treino.agenda_modo === 'automatica'} dados={pedidos} onConversa={(id) => (setConvInicial(id), setAba('conversas'))} />}
      </div>
    </AppShell>
  )
}
