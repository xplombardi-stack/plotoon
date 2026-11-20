// Atendente WhatsApp: conectar pelo QR code, treinar, testar no simulador e acompanhar as conversas.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Bot, Check, CheckCheck, GraduationCap, LoaderCircle, MessageCircle, Pause, Play, Power, QrCode, RotateCcw, Send, Smartphone, UserRound } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader } from '../components/Module'
import { Badge, Button, cx, useToast } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useBusiness } from '../lib/business'
import { useStore } from '../lib/store'
import { DEMO, supabase } from '../lib/supabase'

type Aba = 'conectar' | 'treinar' | 'testar' | 'conversas'
type Treino = { nome_atendente: string; apresentacao: string; produtos: string; perguntas: string; horario: string; regras: string; tom: string }
type Bot = { status: 'desconectado' | 'aguardando_qr' | 'conectado'; numero: string | null; nome_perfil: string | null; qr: string | null; ativo: boolean; treino: Partial<Treino> }
type Conversa = { id: string; jid: string; nome: string | null; ultima_msg: string | null; ultima_em: string; ia_pausada: boolean; precisa_dono: boolean; nao_lidas: number }
type Msg = { id: string; de: 'cliente' | 'ia' | 'dono'; texto: string; created_at: string }

const TONS = ['Simpático e próximo', 'Profissional e direto', 'Divertido, com energia', 'Sofisticado e elegante']
const TREINO_VAZIO: Treino = { nome_atendente: '', apresentacao: '', produtos: '', perguntas: '', horario: '', regras: '', tom: TONS[0] }

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

function Treinar({ treino, onChange, onSave, salvando }: { treino: Treino; onChange: (t: Treino) => void; onSave: () => void; salvando: boolean }) {
  const set = (k: keyof Treino) => (v: string) => onChange({ ...treino, [k]: v })
  return (
    <div className="flex flex-col gap-5 rounded-[22px] border border-line bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[19px] font-bold">O que o atendente precisa saber</h2>
        <p className="m-0 text-[14px] text-muted">Ele já usa o que está em Meu Negócio. Aqui você ensina o resto. Quanto mais detalhe, melhor ele vende.</p>
      </div>
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
      </div>
      <Campo label="Produtos, serviços e preços" dica="Um por linha. É a única fonte de preço que ele usa: o que não estiver aqui, ele não inventa." rows={5} value={treino.produtos} onChange={set('produtos')} placeholder={'Camiseta básica: R$ 59,90 (P ao GG, 6 cores)\nCalça jeans: R$ 149,90\nFrete grátis acima de R$ 200'} />
      <Campo label="Perguntas que os clientes sempre fazem" dica="Pergunta e resposta, do jeito que você responderia." rows={5} value={treino.perguntas} onChange={set('perguntas')} placeholder={'Aceita Pix? Sim, Pix, cartão em até 3x sem juros.\nEntrega? Entregamos em toda a cidade em até 2 dias.'} />
      <div className="grid gap-4 md:grid-cols-2">
        <Campo label="Horário de atendimento" rows={1} value={treino.horario} onChange={set('horario')} placeholder="Seg a sáb, 9h às 19h" />
        <Campo label="Como se apresentar" rows={1} value={treino.apresentacao} onChange={set('apresentacao')} placeholder="Oi! Aqui é a Ana da Loja X 😊" />
      </div>
      <Campo label="Regras importantes" dica="O que ele nunca deve fazer, quando chamar você, promoções do momento." rows={3} value={treino.regras} onChange={set('regras')} placeholder={'Não dar desconto sem falar comigo.\nSe pedirem troca, me chame.'} />
      <Button size="lg" onClick={onSave} disabled={salvando} className="self-start">
        {salvando ? <LoaderCircle size={18} className="animate-spin" /> : <GraduationCap size={18} />} Salvar treino
      </Button>
    </div>
  )
}

/* ---------- testar (simulador) ---------- */
type SimMsg = { de: 'cliente' | 'ia'; texto: string }
const DEMO_RESP = ['Oi! Tudo bem? 😊', 'Temos sim! A camiseta básica sai por R$ 59,90 e vai do P ao GG.', 'Qual tamanho você usa?']

function Testar({ treino, nome, live }: { treino: Treino; nome: string; live: boolean }) {
  const [msgs, setMsgs] = useState<SimMsg[]>([])
  const [txt, setTxt] = useState('')
  const [digitando, setDigitando] = useState(false)
  const [chamou, setChamou] = useState(false)
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
    if (live && supabase) {
      const { data } = await supabase.functions.invoke('whatsapp', { body: { acao: 'simular', historico: hist, treino } })
      partes = data?.partes ?? []
      chamar = !!data?.chamar
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
          <button type="button" onClick={() => (setMsgs([]), setChamou(false))} aria-label="Recomeçar conversa" className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#9fb5ad] hover:bg-white/5">
            <RotateCcw size={18} />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
          {!msgs.length && <p className="m-auto max-w-[260px] text-center text-[13.5px] text-[#9fb5ad]">Escreva como se fosse um cliente. Ex.: "oi, quanto custa?"</p>}
          {msgs.map((m, i) => (
            <div key={i} className={cx('pop max-w-[80%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug', m.de === 'cliente' ? 'self-end rounded-br-md bg-[#1f6f55] text-white' : 'self-start rounded-bl-md bg-[#1c2724] text-[#e6efec]')}>
              {m.texto}
            </div>
          ))}
          {digitando && (
            <div className="self-start rounded-2xl rounded-bl-md bg-[#1c2724] px-4 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#9fb5ad]" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          )}
          {chamou && <p className="pop mx-auto mt-2 rounded-full bg-[#facc1522] px-3 py-1 text-[12px] font-semibold text-[#fde68a]">Aqui ele chamaria você pra assumir a conversa</p>}
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
        {['Mensagens curtas, divididas como gente digita', 'Mostra "digitando…" e espera o cliente terminar de escrever', 'Entende áudio e foto', 'Nunca inventa preço: usa só o que está no treino', 'Chama você quando o cliente quer fechar, reclamar ou falar com uma pessoa'].map((t) => (
          <span key={t} className="flex gap-2">
            <Check size={16} className="mt-0.5 shrink-0 text-[#6ee7b7]" /> {t}
          </span>
        ))}
        <p className="m-0 mt-1 text-[12.5px] text-muted">O simulador usa o treino que está na tela, mesmo sem salvar. É grátis.</p>
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

function Conversas({ uid, live }: { uid: string; live: boolean }) {
  const toast = useToast()
  const [convs, setConvs] = useState<Conversa[] | null>(live ? null : DEMO_CONVS)
  const [aberta, setAberta] = useState<string | null>(null)
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

  async function salvarTreino() {
    if (!live || !supabase || !uid) return toast.show('Treino salvo (na prévia fica só na tela).')
    setSalvando(true)
    const { error } = await supabase.from('whatsapp_bots').upsert({ user_id: uid, instance, treino, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    setSalvando(false)
    toast.show(error ? 'Não consegui salvar agora.' : 'Treino salvo! O atendente já usa nas próximas respostas.')
  }

  const conectado = bot?.status === 'conectado'
  const abas: Array<{ id: Aba; t: string; icon: typeof QrCode }> = [
    { id: 'conectar', t: conectado ? 'Conexão' : 'Conectar', icon: QrCode },
    { id: 'treinar', t: 'Treinar', icon: GraduationCap },
    { id: 'testar', t: 'Testar', icon: Bot },
    { id: 'conversas', t: 'Conversas', icon: MessageCircle },
  ]

  return (
    <AppShell active="whatsapp" wide>
      <ModuleHeader id="whatsapp" actions={bot ? <Badge tone={conectado ? 'sky' : 'neutral'}>{conectado ? (bot.ativo ? 'Respondendo' : 'Pausado') : 'Desconectado'}</Badge> : undefined} />
      <div role="tablist" aria-label="Seções do atendente" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {abas.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={a.id === aba} onClick={() => setAba(a.id)} className={cx('press flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] font-semibold', a.id === aba ? 'border-accent bg-[#ff8a3d1a] text-ink' : 'border-line text-muted hover:text-ink')}>
            <a.icon size={16} /> {a.t}
          </button>
        ))}
      </div>
      <div className="rise" key={aba}>
        {aba === 'conectar' && <Conectar bot={bot} onBot={onBot} live={live} />}
        {aba === 'treinar' && <Treinar treino={treino} onChange={setTreino} onSave={salvarTreino} salvando={salvando} />}
        {aba === 'testar' && <Testar treino={treino} nome={business.name} live={live} />}
        {aba === 'conversas' && <Conversas uid={uid} live={live} />}
      </div>
    </AppShell>
  )
}
