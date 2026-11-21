// Atendente WhatsApp: pedidos, orçamentos e horários que a IA fechou na conversa.
// O dono confere, marca como visto, imprime e avisa o cliente. Serviços podem ter agenda automática.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Check, CheckCheck, ClipboardList, Clock, LoaderCircle, MapPin, MessageCircle, Plus, Printer, Send, Wallet, X } from 'lucide-react'
import { Button, cx, useToast } from './ui'
import { supabase } from '../lib/supabase'

export type Pedido = {
  id: string
  codigo: number
  tipo: 'pedido' | 'orcamento' | 'agendamento'
  status: 'aberto' | 'visto' | 'concluido' | 'cancelado'
  confirmado: boolean
  cliente_nome: string | null
  cliente_numero: string | null
  itens: Array<{ qtd: number; item: string; preco: string }>
  total: string | null
  entrega: string | null
  endereco: string | null
  pagamento: string | null
  observacao: string | null
  servico: string | null
  quando: string | null
  duracao_min: number | null
  origem: 'whatsapp' | 'manual'
  conversa_id: string | null
  created_at: string
}

const COLS = 'id, codigo, tipo, status, confirmado, cliente_nome, cliente_numero, itens, total, entrega, endereco, pagamento, observacao, servico, quando, duracao_min, origem, conversa_id, created_at'
const agoraMenos = (min: number) => new Date(Date.now() - min * 60e3).toISOString()
const amanha15 = () => {
  const d = new Date(Date.now() + 86400e3)
  d.setHours(15, 0, 0, 0)
  return d.toISOString()
}
export const DEMO_PEDIDOS: Pedido[] = [
  { id: 'p1', codigo: 1042, tipo: 'pedido', status: 'aberto', confirmado: false, cliente_nome: 'Carla M.', cliente_numero: '5511988887777', itens: [{ qtd: 1, item: 'Pizza grande meio calabresa, meio quatro queijos, borda de catupiry', preco: 'R$ 69,90' }, { qtd: 1, item: 'Coca-Cola 2L', preco: 'R$ 14,00' }], total: 'R$ 91,90', entrega: 'entrega', endereco: 'Rua das Flores, 120, Jardim América', pagamento: 'Pix', observacao: 'Sem cebola', servico: null, quando: null, duracao_min: null, origem: 'whatsapp', conversa_id: 'c1', created_at: agoraMenos(3) },
  { id: 'p2', codigo: 1041, tipo: 'pedido', status: 'visto', confirmado: true, cliente_nome: 'João P.', cliente_numero: '5511977776666', itens: [{ qtd: 2, item: 'Pizza grande calabresa', preco: 'R$ 105,80' }], total: 'R$ 110,80', entrega: 'entrega', endereco: 'Av. Brasil, 900, Centro', pagamento: 'Cartão na entrega', observacao: null, servico: null, quando: null, duracao_min: null, origem: 'whatsapp', conversa_id: 'c2', created_at: agoraMenos(26) },
  { id: 'p3', codigo: 1043, tipo: 'agendamento', status: 'aberto', confirmado: true, cliente_nome: 'Bia', cliente_numero: '5511966665555', itens: [], total: null, entrega: null, endereco: null, pagamento: null, observacao: null, servico: 'Corte + barba', quando: amanha15(), duracao_min: 60, origem: 'whatsapp', conversa_id: 'c3', created_at: agoraMenos(8) },
]

const brData = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s).toLocaleString('pt-BR', o)
const hora = (s: string) => brData(s, { hour: '2-digit', minute: '2-digit' })
const diaRotulo = (s: string) => {
  const d = new Date(s)
  const hoje = new Date()
  const am = new Date(Date.now() + 86400e3)
  if (d.toDateString() === hoje.toDateString()) return 'Hoje'
  if (d.toDateString() === am.toDateString()) return 'Amanhã'
  return brData(s, { weekday: 'long', day: '2-digit', month: '2-digit' })
}
const haQuanto = (s: string) => {
  const min = Math.round((Date.now() - new Date(s).getTime()) / 60e3)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.floor(min / 60)}h`
  return brData(s, { day: '2-digit', month: '2-digit' })
}
const numeroBonito = (n: string | null) => {
  const m = (n ?? '').match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n ?? ''
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// apito curto quando chega pedido novo
function apito() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = i ? 1320 : 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.18)
    })
    setTimeout(() => ctx.close(), 800)
  } catch {
    /* sem som */
  }
}

// imprime no formato de cupom (bobina de 80mm), pela impressora que estiver no computador
export function imprimir(p: Pedido, negocio: string) {
  const titulo = p.tipo === 'agendamento' ? 'AGENDAMENTO' : p.tipo === 'orcamento' ? 'PEDIDO DE ORÇAMENTO' : 'PEDIDO'
  const linhas = p.itens.map((i) => `<tr><td>${i.qtd}x</td><td>${esc(i.item)}</td><td class="r">${esc(i.preco || '')}</td></tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${titulo} #${p.codigo}</title><style>
@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{font:13px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#000;margin:0;width:72mm}
h1{font-size:15px;text-align:center;margin:0 0 2px}.c{text-align:center}.r{text-align:right;white-space:nowrap}hr{border:0;border-top:1px dashed #000;margin:6px 0}
table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:2px 0}td:first-child{width:28px}.big{font-size:16px;font-weight:700}p{margin:2px 0}
</style></head><body>
<h1>${esc(negocio || 'Pedido')}</h1><p class="c">${titulo} #${p.codigo}</p><p class="c">${brData(p.created_at, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p><hr>
<p><b>Cliente:</b> ${esc(p.cliente_nome || '')}</p>${p.cliente_numero ? `<p><b>WhatsApp:</b> ${numeroBonito(p.cliente_numero)}</p>` : ''}<hr>
${p.tipo === 'agendamento' ? `<p class="big">${esc(p.servico || 'Horário')}</p><p class="big">${p.quando ? `${brData(p.quando, { weekday: 'short', day: '2-digit', month: '2-digit' })} às ${hora(p.quando)}` : 'Data a combinar'}</p>${p.duracao_min ? `<p>Duração: ${p.duracao_min} min</p>` : ''}` : `<table>${linhas}</table>${p.total ? `<hr><p class="big r">TOTAL ${esc(p.total)}</p>` : ''}`}
${p.entrega || p.endereco ? `<hr><p><b>${esc((p.entrega || 'Entrega').toUpperCase())}</b></p>${p.endereco ? `<p>${esc(p.endereco)}</p>` : ''}` : ''}
${p.pagamento ? `<p><b>Pagamento:</b> ${esc(p.pagamento)}</p>` : ''}${p.observacao ? `<hr><p><b>Obs:</b> ${esc(p.observacao)}</p>` : ''}
<hr><p class="c">Plotoon · atendente WhatsApp</p></body></html>`
  const f = document.createElement('iframe')
  f.setAttribute('aria-hidden', 'true')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  const doc = f.contentWindow!.document
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    f.contentWindow!.focus()
    f.contentWindow!.print()
    setTimeout(() => f.remove(), 1500)
  }, 250)
}

// lista ao vivo (também usada pro número na aba)
export function usePedidos(uid: string, live: boolean) {
  const toast = useToast()
  const [lista, setLista] = useState<Pedido[]>(live ? [] : DEMO_PEDIDOS)
  const [carregando, setCarregando] = useState(live)
  const primeiro = useRef(true)

  const carregar = useCallback(async () => {
    if (!live || !supabase || !uid) return
    const { data } = await supabase.from('whatsapp_pedidos').select(COLS).eq('user_id', uid).order('created_at', { ascending: false }).limit(300)
    setLista((data ?? []) as Pedido[])
    setCarregando(false)
  }, [live, uid])

  useEffect(() => {
    if (!live || !supabase || !uid) return
    carregar()
    const ch = supabase
      .channel('wa-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_pedidos', filter: `user_id=eq.${uid}` }, (p) => {
        if (p.eventType === 'INSERT' && (p.new as Pedido).origem === 'whatsapp' && !primeiro.current) {
          const n = p.new as Pedido
          apito()
          toast.show(n.tipo === 'agendamento' ? `Novo agendamento de ${n.cliente_nome || 'cliente'}` : `Novo pedido #${n.codigo} de ${n.cliente_nome || 'cliente'}`)
        }
        carregar()
      })
      .subscribe(() => {
        primeiro.current = false
      })
    return () => {
      supabase?.removeChannel(ch)
    }
  }, [carregar, live, uid, toast])

  const mudar = useCallback(
    async (id: string, patch: Partial<Pedido>) => {
      setLista((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)))
      if (live && supabase) await supabase.from('whatsapp_pedidos').update({ ...patch, ...(patch.status === 'visto' ? { visto_em: new Date().toISOString() } : {}) }).eq('id', id)
    },
    [live],
  )
  const adicionar = useCallback(
    async (p: Omit<Pedido, 'id' | 'codigo' | 'created_at'>) => {
      if (!live || !supabase) {
        setLista((l) => [{ ...p, id: `m${Date.now()}`, codigo: 1100 + l.length, created_at: new Date().toISOString() }, ...l])
        return true
      }
      const { error } = await supabase.from('whatsapp_pedidos').insert({ ...p, user_id: uid })
      if (!error) carregar()
      return !error
    },
    [live, uid, carregar],
  )
  const abertos = lista.filter((p) => p.status === 'aberto').length
  return { lista, carregando, mudar, adicionar, abertos }
}

/* ---------- um cartão ---------- */
function Cartao({ p, negocio, live, onMudar, onConversa, agendaAuto }: { p: Pedido; negocio: string; live: boolean; onMudar: (patch: Partial<Pedido>) => void; onConversa: (id: string) => void; agendaAuto: boolean }) {
  const toast = useToast()
  const [avisando, setAvisando] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const ag = p.tipo === 'agendamento'
  const quandoTxt = p.quando ? `${diaRotulo(p.quando)} às ${hora(p.quando)}` : 'Dia e hora a combinar'

  function abrirAviso() {
    setTexto(
      ag
        ? `Seu horário está confirmado ✅ ${p.servico ? `${p.servico}, ` : ''}${p.quando ? `${diaRotulo(p.quando).toLowerCase()} às ${hora(p.quando)}` : ''}. Te espero!`
        : p.tipo === 'orcamento'
          ? 'Oi! Seu orçamento ficou assim: '
          : 'Pedido confirmado ✅ Já estamos preparando. Qualquer coisa é só chamar!',
    )
    setAvisando(true)
  }
  async function enviarAviso() {
    const t = texto.trim()
    if (!t || !p.conversa_id) return
    setEnviando(true)
    let ok = true
    if (live && supabase) {
      const { error } = await supabase.functions.invoke('whatsapp', { body: { acao: 'enviar', conversa_id: p.conversa_id, texto: t, pausar: false } })
      ok = !error
    }
    setEnviando(false)
    if (!ok) return toast.show('Não consegui enviar agora. Confere se o WhatsApp está conectado.')
    onMudar({ status: p.status === 'aberto' ? 'visto' : p.status, confirmado: true })
    setAvisando(false)
    toast.show('Mensagem enviada pro cliente.')
  }

  const etiqueta = ag ? (p.confirmado ? 'Agendado' : 'Pedido de horário') : p.tipo === 'orcamento' ? 'Orçamento' : 'Pedido'
  return (
    <article className={cx('pop flex flex-col gap-3 rounded-[20px] border bg-surface p-4', p.status === 'aberto' ? 'border-accent-line shadow-[0_0_0_1px_#ff8a3d33]' : 'border-line')}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[17px] font-bold">{ag ? p.servico || 'Horário' : `#${p.codigo}`}</span>
            <span className={cx('rounded-full px-2 py-0.5 text-[11.5px] font-bold', p.status === 'aberto' ? 'bg-accent text-accent-ink' : p.status === 'concluido' ? 'bg-[#34d39922] text-[#6ee7b7]' : p.status === 'cancelado' ? 'bg-[#f8717122] text-[#fca5a5]' : 'bg-white/5 text-soft')}>
              {p.status === 'aberto' ? 'Novo' : p.status === 'visto' ? 'Visto' : p.status === 'concluido' ? 'Concluído' : 'Cancelado'}
            </span>
            <span className="text-[12px] font-semibold text-muted">{etiqueta}</span>
          </span>
          <span className="text-[14px] text-soft">
            {p.cliente_nome || 'Cliente'} {p.cliente_numero && <span className="text-muted">· {numeroBonito(p.cliente_numero)}</span>}
          </span>
        </div>
        <span className="shrink-0 text-[12.5px] text-muted">{haQuanto(p.created_at)}</span>
      </header>

      {ag ? (
        <div className={cx('flex items-center gap-3 rounded-2xl px-3.5 py-3', p.confirmado ? 'bg-[#34d39914] text-[#a7f3d0]' : 'bg-[#facc1514] text-[#fde68a]')}>
          <CalendarClock size={20} className="shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="text-[15.5px] font-bold">{quandoTxt}</span>
            <span className="text-[12.5px] opacity-80">{p.duracao_min ? `${p.duracao_min} min · ` : ''}{p.confirmado ? (agendaAuto ? 'confirmado pelo atendente' : 'confirmado') : 'esperando você confirmar'}</span>
          </span>
        </div>
      ) : (
        p.itens.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 rounded-2xl bg-bg p-3">
            {p.itens.map((i, k) => (
              <li key={k} className="flex items-start gap-2 text-[14px]">
                <span className="shrink-0 font-bold text-accent">{i.qtd}x</span>
                <span className="min-w-0 flex-1 text-ink">{i.item}</span>
                {i.preco && <span className="shrink-0 text-muted">{i.preco}</span>}
              </li>
            ))}
            {p.total && (
              <li className="mt-1 flex justify-between border-t border-line pt-2 text-[15px] font-bold">
                <span>Total</span>
                <span>{p.total}</span>
              </li>
            )}
          </ul>
        )
      )}

      {(p.endereco || p.entrega || p.pagamento || p.observacao) && (
        <div className="flex flex-col gap-1.5 text-[13.5px] text-soft">
          {(p.entrega || p.endereco) && (
            <span className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-muted" />
              <span>
                {p.entrega && <b className="capitalize text-ink">{p.entrega}</b>}
                {p.entrega && p.endereco ? ' · ' : ''}
                {p.endereco}
              </span>
            </span>
          )}
          {p.pagamento && (
            <span className="flex items-center gap-2">
              <Wallet size={15} className="shrink-0 text-muted" /> {p.pagamento}
            </span>
          )}
          {p.observacao && (
            <span className="flex items-start gap-2">
              <ClipboardList size={15} className="mt-0.5 shrink-0 text-muted" /> {p.observacao}
            </span>
          )}
        </div>
      )}

      {avisando && (
        <div className="flex flex-col gap-2 rounded-2xl border border-line-strong bg-bg p-3">
          <span className="text-[13px] font-semibold text-ink">Mensagem pro cliente no WhatsApp</span>
          <textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} className="resize-none rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent" />
          <div className="flex gap-2">
            <Button size="sm" onClick={enviarAviso} disabled={enviando || !texto.trim()}>
              {enviando ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Enviar
            </Button>
            <button type="button" onClick={() => setAvisando(false)} className="press flex min-h-10 cursor-pointer items-center gap-1 rounded-xl px-3 text-[13.5px] text-muted hover:text-ink">
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      )}

      <footer className="flex flex-wrap gap-2">
        {p.status === 'aberto' && (
          <Button size="sm" onClick={() => onMudar({ status: 'visto' })}>
            <Check size={15} /> Marcar como visto
          </Button>
        )}
        {p.status !== 'concluido' && p.status !== 'cancelado' && p.conversa_id && !avisando && (
          <Button size="sm" variant="soft" onClick={abrirAviso}>
            <CheckCheck size={15} /> {ag && !p.confirmado ? 'Confirmar e avisar' : p.tipo === 'orcamento' ? 'Mandar orçamento' : 'Avisar cliente'}
          </Button>
        )}
        <Button size="sm" variant="soft" onClick={() => imprimir(p, negocio)}>
          <Printer size={15} /> Imprimir
        </Button>
        {p.conversa_id && (
          <Button size="sm" variant="ghost" onClick={() => onConversa(p.conversa_id!)}>
            <MessageCircle size={15} /> Conversa
          </Button>
        )}
        {p.status === 'visto' && (
          <Button size="sm" variant="ghost" onClick={() => onMudar({ status: 'concluido' })}>
            <Check size={15} /> {ag ? 'Atendido' : 'Concluído'}
          </Button>
        )}
        {(p.status === 'aberto' || p.status === 'visto') && (
          <Button size="sm" variant="ghost" onClick={() => onMudar({ status: 'cancelado' })} className="!text-muted">
            <X size={15} /> Cancelar
          </Button>
        )}
      </footer>
    </article>
  )
}

/* ---------- lançar horário na mão (agenda automática) ---------- */
function LancarHorario({ onSalvar }: { onSalvar: (p: Omit<Pedido, 'id' | 'codigo' | 'created_at'>) => Promise<boolean> }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [servico, setServico] = useState('')
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10))
  const [hr, setHr] = useState('14:00')
  const [dur, setDur] = useState('60')
  const [salvando, setSalvando] = useState(false)
  const cls = 'h-12 min-w-0 rounded-xl border border-line-strong bg-bg px-3 text-[15px] text-ink outline-none focus:border-accent [color-scheme:dark]'
  if (!aberto)
    return (
      <button type="button" onClick={() => setAberto(true)} className="press flex h-11 cursor-pointer items-center gap-2 self-start rounded-full border border-line-strong px-4 text-[14px] font-semibold text-soft hover:text-ink">
        <Plus size={16} /> Lançar horário na agenda
      </button>
    )
  async function salvar() {
    setSalvando(true)
    const quando = new Date(`${dia}T${hr}:00`).toISOString()
    const ok = await onSalvar({ tipo: 'agendamento', status: 'visto', confirmado: true, cliente_nome: nome || null, cliente_numero: null, itens: [], total: null, entrega: null, endereco: null, pagamento: null, observacao: null, servico: servico || null, quando, duracao_min: Number(dur) || 60, origem: 'manual', conversa_id: null })
    setSalvando(false)
    if (ok) {
      setAberto(false)
      setNome('')
      setServico('')
    }
  }
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-line-strong bg-surface p-4">
      <span className="text-[14px] font-semibold text-ink">Lançar horário (cliente que marcou por fora)</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" aria-label="Nome do cliente" className={cls} />
        <input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Serviço" aria-label="Serviço" className={cls} />
      </div>
      <div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-3">
        <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia" className={cx(cls, 'col-span-2 sm:col-span-1')} />
        <input type="time" value={hr} onChange={(e) => setHr(e.target.value)} aria-label="Hora" className={cls} />
        <select value={dur} onChange={(e) => setDur(e.target.value)} aria-label="Duração" className={cls}>
          {[15, 30, 45, 60, 90, 120, 180].map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? '30' : ''}`}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={salvar} disabled={salvando}>
          {salvando ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} Salvar na agenda
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

/* ---------- a aba ---------- */
type Filtro = 'aberto' | 'visto' | 'fechados'

export function Pedidos({ uid, live, negocio, servicos, agendaAuto, onConversa, dados }: { uid: string; live: boolean; negocio: string; servicos: boolean; agendaAuto: boolean; onConversa: (id: string) => void; dados: ReturnType<typeof usePedidos> }) {
  void uid
  const { lista, carregando, mudar, adicionar } = dados
  const [filtro, setFiltro] = useState<Filtro>('aberto')
  const [verAgenda, setVerAgenda] = useState(agendaAuto)
  useEffect(() => setVerAgenda(agendaAuto), [agendaAuto])

  const filtrados = useMemo(() => lista.filter((p) => (filtro === 'fechados' ? p.status === 'concluido' || p.status === 'cancelado' : p.status === filtro)), [lista, filtro])
  const agenda = useMemo(() => {
    const ini = new Date()
    ini.setHours(0, 0, 0, 0)
    const dias = new Map<string, Pedido[]>()
    lista
      .filter((p) => p.tipo === 'agendamento' && p.confirmado && p.quando && p.status !== 'cancelado' && new Date(p.quando) >= ini)
      .sort((a, b) => a.quando!.localeCompare(b.quando!))
      .forEach((p) => {
        const k = new Date(p.quando!).toDateString()
        dias.set(k, [...(dias.get(k) ?? []), p])
      })
    return [...dias.values()]
  }, [lista])
  const conta = (f: Filtro) => lista.filter((p) => (f === 'fechados' ? p.status === 'concluido' || p.status === 'cancelado' : p.status === f)).length

  if (carregando)
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle size={26} className="animate-spin text-accent" />
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filtro" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {servicos && agendaAuto && (
            <button type="button" role="tab" aria-selected={verAgenda} onClick={() => setVerAgenda(true)} className={cx('press flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold', verAgenda ? 'border-accent bg-[#ff8a3d1a] text-ink' : 'border-line text-muted')}>
              <CalendarClock size={15} /> Agenda
            </button>
          )}
          {(['aberto', 'visto', 'fechados'] as Filtro[]).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={!verAgenda && filtro === f} onClick={() => (setVerAgenda(false), setFiltro(f))} className={cx('press flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold', !verAgenda && filtro === f ? 'border-accent bg-[#ff8a3d1a] text-ink' : 'border-line text-muted')}>
              {f === 'aberto' ? (servicos ? 'Novos' : 'Em aberto') : f === 'visto' ? 'Vistos' : 'Finalizados'}
              <span className={cx('rounded-full px-1.5 text-[11.5px]', f === 'aberto' && conta(f) ? 'bg-accent text-accent-ink' : 'bg-white/5')}>{conta(f)}</span>
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <Clock size={14} /> Chega sozinho quando o cliente fecha na conversa
        </span>
      </div>

      {verAgenda && servicos && agendaAuto ? (
        <div className="flex flex-col gap-4">
          <LancarHorario onSalvar={adicionar} />
          {agenda.length === 0 && <p className="m-0 rounded-[20px] border border-dashed border-line-strong px-6 py-10 text-center text-[14.5px] text-muted">Nenhum horário marcado ainda. Quando o atendente agendar alguém, aparece aqui.</p>}
          {agenda.map((dia) => (
            <section key={dia[0].quando} className="flex flex-col gap-2">
              <h3 className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">{diaRotulo(dia[0].quando!)}</h3>
              {dia.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                  <span className="flex w-[62px] shrink-0 flex-col items-center rounded-xl bg-[#ff8a3d14] py-1.5 text-accent">
                    <span className="font-display text-[17px] font-bold leading-none">{hora(p.quando!)}</span>
                    <span className="text-[11px] text-muted">{p.duracao_min ?? 60} min</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-[15px] font-semibold text-ink">{p.servico || 'Horário'}</span>
                    <span className="truncate text-[13px] text-muted">
                      {p.cliente_nome || 'Cliente'} {p.origem === 'manual' ? '· lançado por você' : '· pelo WhatsApp'}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => imprimir(p, negocio)} aria-label="Imprimir" className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-ink">
                      <Printer size={17} />
                    </button>
                    <button type="button" onClick={() => mudar(p.id, { status: 'cancelado' })} aria-label="Cancelar horário" className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-ink">
                      <X size={17} />
                    </button>
                  </span>
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-line-strong px-6 py-12 text-center">
          <ClipboardList size={26} className="text-muted" />
          <p className="m-0 max-w-[380px] text-[15px] font-semibold text-ink">{filtro === 'aberto' ? 'Nenhum pedido esperando você' : 'Nada por aqui'}</p>
          <p className="m-0 max-w-[400px] text-[13.5px] text-muted">
            {servicos ? 'Quando um cliente marcar horário pelo WhatsApp, ele aparece aqui.' : 'Quando o cliente fechar o pedido na conversa, o atendente manda pra cá na hora, com os itens, o total e o endereço.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtrados.map((p) => (
            <Cartao key={p.id} p={p} negocio={negocio} live={live} agendaAuto={agendaAuto} onMudar={(patch) => mudar(p.id, patch)} onConversa={onConversa} />
          ))}
        </div>
      )}
      <p className="m-0 text-[12.5px] text-muted">
        <Printer size={13} className="mr-1 inline" />O botão Imprimir usa a impressora instalada no computador, inclusive impressora térmica de cupom (bobina de 80mm).
      </p>
    </div>
  )
}
