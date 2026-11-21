// Mentor: chat com o Claude que conhece o negócio, lê prints e sugere ações.
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, AtSign, Camera, Check, History, ImagePlus, MessageSquarePlus, Send, Trash2, X } from 'lucide-react'
import { MentorIcon } from '../components/MentorIcon'
import { AppShell } from '../components/AppShell'
import { ModuleHeader, ModuleIcon } from '../components/Module'
import { Button, cx, useToast } from '../components/ui'
import { ACTION_MODULE, runAction, type MentorAction } from '../lib/actions'
import { useBusiness } from '../lib/business'
import { CREDITS_PER_MENTOR, CREDITS_PER_MENTOR_IMAGES } from '../lib/pricing'
import { shrinkImage, timeAgo, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { consumeJob, startJob, useJobs } from '../lib/jobs'

type Diag = { nota: number; itens: Array<{ area: string; status: 'bom' | 'melhorar' | 'falta' | 'nao_vi'; dica: string }> }
type Msg = { id: string; role: 'user' | 'assistant'; text: string; images: string[]; actions: MentorAction[]; diag?: Diag | null; at: number }
type Thread = { id: string; title: string; at: number }

const SUGESTOES = ['Como atraio mais clientes?', 'Me ajuda a montar uma promoção', 'Por que não estou vendendo?']

/* ---------- texto com listas e negrito, sem HTML ---------- */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

function Rich({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="flex flex-col gap-2.5">
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter((l) => l.trim())
        if (lines.length && lines.every((l) => /^\s*[-•]\s+/.test(l)))
          return (
            <ul key={i} className="m-0 flex list-none flex-col gap-1.5 p-0">
              {lines.map((l, k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>
                    <Inline text={l.replace(/^\s*[-•]\s+/, '')} />
                  </span>
                </li>
              ))}
            </ul>
          )
        if (lines.length && lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
          return (
            <ol key={i} className="m-0 flex list-none flex-col gap-1.5 p-0">
              {lines.map((l, k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent-text">{k + 1}</span>
                  <span>
                    <Inline text={l.replace(/^\s*\d+[.)]\s+/, '')} />
                  </span>
                </li>
              ))}
            </ol>
          )
        return (
          <p key={i} className="m-0 whitespace-pre-wrap">
            <Inline text={b} />
          </p>
        )
      })}
    </div>
  )
}

function ActionCards({ actions, onInstagram }: { actions: MentorAction[]; onInstagram: () => void }) {
  if (!actions.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {actions.slice(0, 2).map((a, i) => (
        <button key={i} type="button" onClick={() => (a.tipo === 'instagram' ? onInstagram() : runAction(a))} title={a.detalhe} className="press flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold text-soft hover:border-accent hover:text-ink">
          <ModuleIcon id={ACTION_MODULE[a.tipo]} size="sm" className="!h-6 !w-6 !rounded-lg" />
          {a.titulo}
          <ArrowRight size={14} className="text-accent" />
        </button>
      ))}
    </div>
  )
}

const DIAG_STATUS = {
  bom: { label: 'Bom', dot: 'bg-[#34d399]', text: 'text-[#6ee7b7]' },
  melhorar: { label: 'Melhorar', dot: 'bg-[#facc15]', text: 'text-[#fde68a]' },
  falta: { label: 'Falta', dot: 'bg-[#ef4444]', text: 'text-[#fca5a5]' },
  nao_vi: { label: 'Não deu pra ver', dot: 'bg-[#64748b]', text: 'text-muted' },
} as const

function DiagnosticCard({ d }: { d: Diag }) {
  const pct = Math.max(0, Math.min(10, d.nota)) / 10
  const cor = d.nota >= 7.5 ? '#34d399' : d.nota >= 5 ? '#facc15' : '#ff8a3d'
  return (
    <div className="pop flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-3.5 sm:p-4">
      <div className="flex items-center gap-3.5">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
            <circle cx="32" cy="32" r="27" fill="none" stroke="#ffffff14" strokeWidth="7" />
            <circle cx="32" cy="32" r="27" fill="none" stroke={cor} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${pct * 169.6} 169.6`} />
          </svg>
          <span className="font-display text-[19px] font-extrabold text-ink">{d.nota.toLocaleString('pt-BR')}</span>
        </span>
        <span className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#c4b5fd]">Raio-x do Instagram</span>
          <span className="text-[15px] font-semibold text-ink">Nota {d.nota.toLocaleString('pt-BR')} de 10</span>
          <span className="text-[12.5px] text-muted">{d.itens.filter((i) => i.status === 'falta' || i.status === 'melhorar').length} pontos pra arrumar</span>
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {d.itens.map((it, i) => {
          const st = DIAG_STATUS[it.status] ?? DIAG_STATUS.nao_vi
          return (
            <li key={i} className="flex gap-2.5 rounded-xl bg-bg/50 px-3 py-2.5">
              <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', st.dot)} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 text-[13.5px] font-semibold text-ink">
                  {it.area} <span className={cx('text-[11.5px] font-bold', st.text)}>{st.label}</span>
                </span>
                <span className="text-[13px] text-muted">{it.dica}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Bubble({ m, onInstagram }: { m: Msg; onInstagram: () => void }) {
  if (m.role === 'user')
    return (
      <div className="pop flex flex-col items-end gap-2">
        {m.images.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {m.images.map((src, i) => (
              <img key={i} src={src} alt="Print enviado" className="h-24 w-20 rounded-lg border border-line-strong object-cover" />
            ))}
          </div>
        )}
        {m.text && <p className="m-0 max-w-[85%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-accent px-4 py-2.5 text-[15px] font-medium text-accent-ink">{m.text}</p>}
      </div>
    )
  return (
    <div className="rise flex gap-3">
      <ModuleIcon id="mentor" size="sm" className="mt-0.5" />
      <div className="flex min-w-0 max-w-[92%] flex-1 flex-col gap-3">
        <div className="pt-1 text-[15.5px] leading-relaxed text-soft">
          <Rich text={m.text} />
        </div>
        {m.diag && m.diag.itens?.length > 0 && <DiagnosticCard d={m.diag} />}
        <ActionCards actions={m.actions} onInstagram={onInstagram} />
      </div>
    </div>
  )
}

/* ---------- prévia (sem IA): respostas de exemplo ---------- */
function demoReply(q: string, nome: string, hasImages: boolean): { text: string; actions: MentorAction[]; diag?: Diag } {
  if (hasImages)
    return {
      text: `Olhei o Instagram do ${nome}. As 3 coisas mais urgentes:\n\n- **Bio sem chamada pra ação:** quem chega não sabe como comprar.\n- **Fotos escuras:** o produto não brilha no feed.\n- **Quase nenhum Reels:** o alcance fica preso nos seus seguidores.\n\n**Primeiro passo:** arruma a bio hoje e posta 1 vídeo do produto amanhã.`,
      diag: {
        nota: 5.5,
        itens: [
          { area: 'Foto de perfil', status: 'bom', dica: 'A logo aparece bem, mantém.' },
          { area: 'Nome e bio', status: 'melhorar', dica: 'Diga o que você vende e pra quem na primeira linha.' },
          { area: 'Link e chamada', status: 'falta', dica: 'Coloque o link do WhatsApp com "Peça aqui".' },
          { area: 'Visual do feed', status: 'melhorar', dica: 'Fotos mais claras e com fundo limpo.' },
          { area: 'Vídeos e Reels', status: 'falta', dica: 'Poste 3 Reels por semana mostrando o produto.' },
          { area: 'Prova social', status: 'melhorar', dica: 'Crie um destaque com prints de clientes.' },
          { area: 'Preço e oferta', status: 'nao_vi', dica: 'Não deu pra ver nos prints: mostre a faixa de preço.' },
        ],
      },
      actions: [
        { tipo: 'copy', titulo: 'Bio nova que vende', detalhe: `Bio do Instagram do ${nome} com chamada pro WhatsApp`, formato: 'legenda' },
        { tipo: 'video', titulo: 'Vídeo do produto pro feed', detalhe: `Vídeo curto mostrando o produto do ${nome} de perto, com o preço e chamada pro WhatsApp`, formato: 'produto' },
      ],
    }
  if (/instagram|insta|@/i.test(q))
    return { text: 'Bora! Eu analiso pelos prints. Toca em **Analisar meu Instagram** e manda 3 prints: **o perfil**, **o feed** e **um post**.', actions: [{ tipo: 'instagram', titulo: 'Analisar meu Instagram', detalhe: 'Perfil, feed e um post' }] }
  return {
    text: `Pra ${nome}, eu começaria assim:\n\n- **Mostre o produto de perto** em vídeo curto.\n- **Uma oferta clara** essa semana.\n- **Peça pra comprar** em todo post.\n\nAntes de te dar um plano fechado, me deixa ver o seu Instagram? Assim eu vejo o que está faltando.`,
    actions: [
      { tipo: 'instagram', titulo: 'Analisar meu Instagram', detalhe: 'Manda 3 prints: perfil, feed e um post' },
      { tipo: 'video', titulo: 'Vídeo do produto', detalhe: `Vídeo curto mostrando o produto do ${nome} com oferta e chamada pro WhatsApp`, formato: 'produto' },
    ],
  }
}

/* ---------- passo a passo: mandar os prints do Instagram ---------- */
const SLOTS = [
  { k: 'perfil', t: 'Seu perfil', d: 'O topo do perfil: foto, bio, link e destaques' },
  { k: 'feed', t: 'Seu feed', d: 'Rola um pouco e tira print dos últimos posts' },
  { k: 'post', t: 'Um post ou Reels', d: 'Um que você goste, com as curtidas aparecendo' },
] as const

function InstagramSheet({ arroba, onClose, onSend }: { arroba: string; onClose: () => void; onSend: (at: string, imgs: string[]) => void }) {
  const [at, setAt] = useState(arroba)
  const [imgs, setImgs] = useState<Record<string, string>>({})
  const [slot, setSlot] = useState<string>('perfil')
  const file = useRef<HTMLInputElement>(null)
  const total = Object.keys(imgs).length

  async function pick(f?: File | null) {
    if (!f) return
    try {
      const d = await shrinkImage(f, 1400)
      setImgs((x) => ({ ...x, [slot]: d }))
    } catch {
      /* imagem ruim */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Analisar meu Instagram">
      <button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default bg-black/70" onClick={onClose} />
      <div className="sheet-up relative flex max-h-[92vh] w-full max-w-[620px] flex-col gap-4 overflow-y-auto rounded-t-[26px] border border-line-strong bg-side p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-[26px] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white">
              <Camera size={24} />
            </span>
            <div className="flex flex-col">
              <h2 className="m-0 font-display text-[20px] font-extrabold leading-tight">Analisar meu Instagram</h2>
              <span className="text-[13.5px] text-muted">O Mentor olha os prints e diz o que está faltando pra vender mais.</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-surface">
            <X size={20} />
          </button>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">Seu @ no Instagram</span>
          <span className="flex min-h-12 items-center gap-2 rounded-[14px] border border-line-strong bg-bg/70 px-3.5 focus-within:border-accent">
            <AtSign size={17} className="text-muted" />
            <input value={at} onChange={(e) => setAt(e.target.value.replace(/^@+/, '').replace(/\s/g, ''))} placeholder="seunegocio" maxLength={40} className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-subtle" />
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">Mande 3 prints</span>
          <div className="grid grid-cols-3 gap-2.5">
            {SLOTS.map((s, i) => (
              <button
                key={s.k}
                type="button"
                onClick={() => {
                  setSlot(s.k)
                  file.current?.click()
                }}
                className={cx('press relative flex aspect-[9/14] cursor-pointer flex-col items-center justify-end gap-1 overflow-hidden rounded-[16px] border-2 p-2 text-center', imgs[s.k] ? 'border-[#34d399]' : 'border-dashed border-line-strong hover:border-accent')}
              >
                {imgs[s.k] ? (
                  <>
                    <img src={imgs[s.k]} alt={`Print: ${s.t}`} className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="relative flex items-center gap-1 text-[12px] font-bold text-white">
                      <Check size={13} strokeWidth={3} className="text-[#6ee7b7]" /> {s.t}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-accent-ink">{i + 1}</span>
                    <ImagePlus size={22} className="mb-auto mt-auto text-muted" />
                    <span className="text-[12.5px] font-bold text-ink">{s.t}</span>
                    <span className="text-[11px] leading-tight text-muted">{s.d}</span>
                  </>
                )}
              </button>
            ))}
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />
          <p className="m-0 text-[12.5px] text-muted">No celular: abre seu perfil no Instagram e aperta os botões de tirar print. O Mentor só vê os prints que você mandar. Ler direto pelo @, sem print, vai chegar quando der pra conectar o Instagram.</p>
        </div>

        <Button size="lg" disabled={total === 0} onClick={() => onSend(at, SLOTS.map((s) => imgs[s.k]).filter(Boolean) as string[])} className="w-full">
          Analisar {total ? `${total} print${total > 1 ? 's' : ''}` : ''} · {CREDITS_PER_MENTOR_IMAGES} créditos
        </Button>
      </div>
    </div>
  )
}

const SIGN_TTL = 60 * 60

export function MentorPage() {
  const { live, credits, addCredits, reload } = useStore()
  const { business, saveBusiness } = useBusiness()
  const toast = useToast()
  const [igOpen, setIgOpen] = useState(false)
  const job = useJobs().filter((j) => j.kind === 'mentor').at(-1)
  const busy = job?.status === 'running'
  const [lendo, setLendo] = useState(0)
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [imgs, setImgs] = useState<string[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)
  const nome = business.name || 'seu negócio'
  const custo = imgs.length ? CREDITS_PER_MENTOR_IMAGES : CREDITS_PER_MENTOR

  const loadThreads = useCallback(async () => {
    if (!live || !supabase) return
    const { data } = await supabase.from('mentor_threads').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(50)
    setThreads((data ?? []).map((t) => ({ id: t.id, title: t.title, at: new Date(t.updated_at).getTime() })))
  }, [live])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, busy])

  async function openThread(id: string) {
    setListOpen(false)
    setThreadId(id)
    setMsgs([])
    if (!live || !supabase) return
    setLoadingThread(true)
    const { data } = await supabase.from('mentor_messages').select('id, role, content, images, actions, diagnostico, created_at').eq('thread_id', id).order('created_at')
    const paths = (data ?? []).flatMap((m) => m.images ?? [])
    const signed: Record<string, string> = {}
    if (paths.length) {
      const { data: s } = await supabase.storage.from('media').createSignedUrls(paths, SIGN_TTL)
      s?.forEach((x) => {
        if (x.path && x.signedUrl) signed[x.path] = x.signedUrl
      })
    }
    setMsgs(
      (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as Msg['role'],
        text: m.content,
        images: (m.images ?? []).map((p: string) => signed[p]).filter(Boolean),
        actions: (m.actions as MentorAction[]) ?? [],
        diag: (m.diagnostico as Diag | null) ?? null,
        at: new Date(m.created_at).getTime(),
      })),
    )
    setLoadingThread(false)
  }

  function newThread() {
    setThreadId(null)
    setMsgs([])
    setListOpen(false)
  }

  async function removeThread(id: string) {
    if (!live || !supabase) return
    await supabase.from('mentor_threads').delete().eq('id', id)
    if (threadId === id) newThread()
    loadThreads()
  }

  async function pickImages(files: FileList | null) {
    if (!files) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 4 - imgs.length)
    const out: string[] = []
    for (const f of list) {
      try {
        out.push(await shrinkImage(f, 1400))
      } catch {
        /* imagem ruim */
      }
    }
    setImgs((x) => [...x, ...out].slice(0, 4))
  }

  // a resposta chega mesmo se a pessoa sair da tela; ao voltar, a conversa aparece com a resposta
  useEffect(() => {
    if (!job) return
    const inp = job.input as { msgs: Msg[]; threadId: string | null }
    if (job.status === 'running') {
      if (msgs.length < inp.msgs.length) {
        setMsgs(inp.msgs)
        setThreadId(inp.threadId)
      }
      return
    }
    if (job.consumed) return
    consumeJob(job.id)
    reload()
    const r = job.result as { thread_id?: string; msg?: Msg } | undefined
    if (job.status === 'done' && r?.msg) {
      if (r.thread_id) setThreadId(r.thread_id)
      setMsgs((m) => [...(m.length >= inp.msgs.length ? m : inp.msgs), r.msg!])
      loadThreads()
    } else {
      setMsgs((m) => [
        ...(m.length >= inp.msgs.length ? m : inp.msgs),
        {
          id: `e${Date.now()}`,
          role: 'assistant',
          text: job.error === 'creditos_insuficientes' ? 'Seus créditos acabaram. Compre mais créditos pra continuar a conversa.' : 'Não consegui responder agora. Seus créditos foram devolvidos, tenta de novo em instantes.',
          images: [],
          actions: [],
          at: Date.now(),
        },
      ])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status])

  function send(q = text, override?: string[]) {
    const msg = q.trim()
    const sentImgs = override ?? imgs
    const custo = sentImgs.length ? CREDITS_PER_MENTOR_IMAGES : CREDITS_PER_MENTOR
    if ((!msg && !sentImgs.length) || busy) return
    if (credits < custo) return toast.show('Você não tem créditos suficientes pra falar com o Mentor.')
    const next: Msg[] = [...msgs, { id: `u${Date.now()}`, role: 'user', text: msg, images: sentImgs, actions: [], at: Date.now() }]
    setMsgs(next)
    setText('')
    setImgs([])
    const tid = threadId
    startJob({
      kind: 'mentor',
      label: sentImgs.length ? 'Mentor analisando os prints' : 'Mentor pensando na resposta',
      doneLabel: 'O Mentor respondeu',
      route: 'mentor',
      input: { msgs: next, threadId: tid },
      run: async () => {
        if (!live || !supabase) {
          addCredits(-custo, 'Mentor')
          await new Promise((r) => window.setTimeout(r, 1400))
          const r = demoReply(msg, nome, sentImgs.length > 0)
          return { thread_id: undefined, msg: { id: `a${Date.now()}`, role: 'assistant', text: r.text, images: [], actions: r.actions, diag: r.diag ?? null, at: Date.now() } as Msg }
        }
        const { data, error } = await supabase.functions.invoke('mentor', { body: { thread_id: tid, mensagem: msg, imagens: sentImgs } })
        if (error || !data?.mensagem) {
          let code = 'falha'
          try {
            const ctx = (error as { context?: Response } | null)?.context
            code = String((ctx ? await ctx.json() : null)?.error ?? 'falha')
          } catch {
            /* sem detalhe */
          }
          throw new Error(code)
        }
        return {
          thread_id: data.thread_id as string,
          msg: { id: data.mensagem.id ?? `a${Date.now()}`, role: 'assistant', text: data.mensagem.texto, images: [], actions: data.mensagem.acoes ?? [], diag: data.mensagem.diagnostico ?? null, at: Date.now() } as Msg,
        }
      },
    })
  }

  function sendInstagram(at: string, prints: string[]) {
    setIgOpen(false)
    const arroba = at.replace(/^@+/, '').trim()
    if (arroba && arroba !== (business.socials.instagram ?? '').replace(/^@+/, '')) saveBusiness({ socials: { ...business.socials, instagram: arroba } })
    send(`Analisa meu Instagram${arroba ? ` @${arroba}` : ''}. Mandei ${prints.length} print${prints.length > 1 ? 's' : ''}: ${['o perfil', 'o feed', 'um post'].slice(0, prints.length).join(', ')}.`, prints)
  }

  // enquanto analisa os prints, mostra o que está olhando
  const LENDO = ['Lendo a sua bio…', 'Olhando o feed…', 'Vendo os vídeos e as curtidas…', 'Montando o seu raio-x…']
  const analisando = busy && !!msgs.at(-1)?.images.length
  useEffect(() => {
    if (!analisando) return setLendo(0)
    const id = window.setInterval(() => setLendo((n) => Math.min(LENDO.length - 1, n + 1)), 2600)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analisando])

  const threadList: ReactNode = (
    <div className="flex flex-col gap-1">
      <Button variant="soft" onClick={newThread} className="mb-2 w-full">
        <MessageSquarePlus size={16} /> Nova conversa
      </Button>
      {threads.length === 0 && <p className="m-0 px-2 text-[13px] text-muted">{live ? 'Suas conversas aparecem aqui.' : 'Na prévia as conversas não ficam salvas.'}</p>}
      {threads.map((t) => (
        <div key={t.id} className={cx('group flex items-center gap-1 rounded-xl', t.id === threadId ? 'bg-[#a78bfa1f]' : 'hover:bg-surface')}>
          <button type="button" onClick={() => openThread(t.id)} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-start px-3 py-2 text-left">
            <span className="w-full truncate text-[14px] font-semibold text-ink">{t.title}</span>
            <span className="text-[12px] text-muted">{timeAgo(t.at)}</span>
          </button>
          <button type="button" onClick={() => removeThread(t.id)} aria-label={`Apagar a conversa ${t.title}`} className="press mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-subtle opacity-70 hover:bg-[#ef444422] hover:text-[#fca5a5] group-hover:opacity-100">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <AppShell active="mentor">
      <div className="hidden lg:block">
        <ModuleHeader id="mentor" />
      </div>
      <div className="-mb-4 flex items-center gap-3 lg:hidden">
        <ModuleIcon id="mentor" size="sm" className="!h-10 !w-10" />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="font-display text-[20px] font-extrabold">Mentor</span>
          <span className="truncate text-[12.5px] text-muted">Seu estrategista de marketing</span>
        </span>
        <button type="button" onClick={() => setListOpen(true)} aria-label="Conversas anteriores" className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong text-soft hover:text-ink">
          <History size={18} />
        </button>
        <button type="button" onClick={newThread} aria-label="Nova conversa" className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong text-soft hover:text-ink">
          <MessageSquarePlus size={18} />
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">{threadList}</aside>

        <section className="-mx-4 flex h-[calc(100dvh-212px)] min-h-[440px] flex-col overflow-hidden border-y border-line bg-[#0f1218] sm:mx-0 sm:rounded-[24px] sm:border lg:h-[calc(100vh-180px)]">
          <div className="mx-auto flex min-h-0 w-full max-w-[860px] flex-1 flex-col gap-6 overflow-y-auto p-4 [&>*:first-child]:mt-auto sm:p-6">
            {msgs.length === 0 && !loadingThread && (
              <div className="my-auto flex w-full flex-col items-center gap-5 py-2 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <h2 className="text-balance m-0 font-display text-[24px] font-extrabold leading-tight sm:text-[28px]">Seu estrategista de marketing</h2>
                  <p className="m-0 max-w-[440px] text-[14.5px] text-muted">Conta o que você quer resolver{business.name ? ` no ${business.name}` : ' no seu negócio'}. Ele pensa a estratégia com você e te diz o próximo passo.</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {SUGESTOES.map((sug) => (
                    <button key={sug} type="button" onClick={() => send(sug)} className="press min-h-10 cursor-pointer rounded-xl px-3 text-[14px] text-soft underline-offset-4 hover:text-ink hover:underline">
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loadingThread && <span className="m-auto h-8 w-8 animate-spin rounded-full border-[3px] border-[#a78bfa] border-t-transparent" aria-label="Carregando" />}
            {msgs.map((m) => (
              <Bubble key={m.id} m={m} onInstagram={() => setIgOpen(true)} />
            ))}
            {busy && (
              <div className="flex items-center gap-3 text-[#c4b5fd]">
                <ModuleIcon id="mentor" size="sm" />
                <span className="flex items-center gap-1.5 text-[14px]">
                  <MentorIcon size={16} className="animate-pulse" /> {analisando ? LENDO[lendo] : 'Pensando…'}
                </span>
              </div>
            )}
            <div ref={end} />
          </div>

          <div className="mx-auto w-full max-w-[860px] p-3 sm:p-4">
            {imgs.length > 0 && (
              <div className="mb-2.5 flex gap-2">
                {imgs.map((src, i) => (
                  <span key={i} className="relative">
                    <img src={src} alt="Print anexado" className="h-16 w-14 rounded-lg border border-line-strong object-cover" />
                    <button type="button" onClick={() => setImgs((x) => x.filter((_, k) => k !== i))} aria-label="Tirar esse print" className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-ink text-bg">
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-[24px] border border-line-strong bg-surface p-1.5 shadow-[0_10px_30px_-15px_#000] focus-within:border-[#a78bfa]">
              <button type="button" onClick={() => file.current?.click()} disabled={imgs.length >= 4} aria-label="Anexar prints" className="press flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-ink disabled:opacity-40">
                <ImagePlus size={20} />
              </button>
              <label htmlFor="mentor-input" className="sr-only">
                Mensagem pro Mentor
              </label>
              <textarea
                id="mentor-input"
                value={text}
                rows={1}
                maxLength={4000}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="O que você quer resolver?"
                className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[16px] text-ink outline-none placeholder:text-subtle [field-sizing:content]"
              />
              <button type="button" onClick={() => send()} disabled={busy || (!text.trim() && !imgs.length)} aria-label="Enviar" className="press flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent text-accent-ink disabled:opacity-40">
                <Send size={18} />
              </button>
            </div>
            <p className="m-0 mt-2 text-center text-[12px] text-subtle">
              {custo} crédito{custo > 1 ? 's' : ''} por mensagem{imgs.length ? ' com prints' : ''}
            </p>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" tabIndex={-1} onChange={(e) => (pickImages(e.target.files), (e.target.value = ''))} />
          </div>
        </section>
      </div>

      {igOpen && <InstagramSheet arroba={(business.socials.instagram ?? '').replace(/^@+/, '')} onClose={() => setIgOpen(false)} onSend={sendInstagram} />}

      {listOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Conversas">
          <button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default bg-black/65" onClick={() => setListOpen(false)} />
          <div className="sheet-up absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[26px] border-t border-line-strong bg-side p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-[19px] font-bold">Conversas</span>
              <button type="button" onClick={() => setListOpen(false)} aria-label="Fechar" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full hover:bg-surface">
                <X size={22} />
              </button>
            </div>
            {threadList}
          </div>
        </div>
      )}
    </AppShell>
  )
}
