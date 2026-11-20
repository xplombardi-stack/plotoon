// Mentor: chat com o Claude que conhece o negócio, lê prints e sugere ações.
import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, History, ImagePlus, MessageSquarePlus, Send, Sparkles, Trash2, X } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader, ModuleIcon } from '../components/Module'
import { Button, cx, useToast } from '../components/ui'
import { ACTION_BUTTON, ACTION_MODULE, runAction, type MentorAction } from '../lib/actions'
import { useBusiness } from '../lib/business'
import { CREDITS_PER_MENTOR, CREDITS_PER_MENTOR_IMAGES } from '../lib/pricing'
import { shrinkImage, timeAgo, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

type Msg = { id: string; role: 'user' | 'assistant'; text: string; images: string[]; actions: MentorAction[]; at: number }
type Thread = { id: string; title: string; at: number }

const SUGESTOES = ['Tô perdido no meu negócio. Por onde eu começo?', 'O que eu posto essa semana pra vender mais?', 'Quanto eu devo cobrar pelo meu produto?', 'Analisa meu Instagram (vou mandar os prints)']

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

function ActionCards({ actions }: { actions: MentorAction[] }) {
  if (!actions.length) return null
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-accent-line bg-[#ff8a3d0d] p-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-text">Faça agora</span>
      {actions.map((a, i) => (
        <div key={i} className="pop flex flex-wrap items-center gap-3 rounded-xl bg-bg/60 p-2.5" style={{ animationDelay: `${i * 80}ms` }}>
          <ModuleIcon id={ACTION_MODULE[a.tipo]} size="sm" />
          <span className="flex min-w-0 flex-1 basis-[160px] flex-col">
            <span className="text-[14px] font-semibold leading-snug text-ink">{a.titulo}</span>
            <span className="line-clamp-2 text-[12.5px] text-muted">{a.detalhe}</span>
          </span>
          <Button size="sm" onClick={() => runAction(a)} className="w-full shrink-0 sm:w-auto">
            {ACTION_BUTTON[a.tipo]} <ArrowRight size={14} />
          </Button>
        </div>
      ))}
    </div>
  )
}

function Bubble({ m }: { m: Msg }) {
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
        <div className="rounded-[18px] rounded-tl-md border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-soft">
          <Rich text={m.text} />
        </div>
        <ActionCards actions={m.actions} />
      </div>
    </div>
  )
}

/* ---------- prévia (sem IA): respostas de exemplo ---------- */
function demoReply(q: string, nome: string, hasImages: boolean): { text: string; actions: MentorAction[] } {
  if (hasImages || /instagram|insta|@/i.test(q))
    return hasImages
      ? {
          text: `Olhei os prints do ${nome}. O que está travando:\n\n- **Bio sem chamada pra ação:** ninguém sabe como comprar.\n- **Fotos escuras:** o produto não brilha.\n- **Pouco vídeo:** o alcance fica baixo.\n\n**Próximo passo:** arruma a bio hoje e posta 1 vídeo amanhã.`,
          actions: [
            { tipo: 'copy', titulo: 'Bio nova que vende', detalhe: `Bio do Instagram do ${nome} com chamada pro WhatsApp`, formato: 'legenda' },
            { tipo: 'video', titulo: 'Vídeo mostrando o produto', detalhe: `Historinha curta mostrando o produto do ${nome} sendo feito e entregue` },
          ],
        }
      : { text: 'Bora! Eu não consigo abrir o Instagram, mas analiso pelos prints. Manda pelo clipe: **a bio**, **o feed** e **um post**.', actions: [] }
  return {
    text: `Pra ${nome}, eu começaria assim:\n\n- **Mostre o produto de perto** em vídeo curto.\n- **Uma oferta clara** essa semana.\n- **Peça pra comprar** em todo post.\n\n**Próximo passo:** faz o vídeo hoje.`,
    actions: [{ tipo: 'video', titulo: 'Vídeo com virada', detalhe: `O cliente que duvidou e virou fã do ${nome}` }],
  }
}

const SIGN_TTL = 60 * 60

export function MentorPage() {
  const { live, credits, addCredits, reload } = useStore()
  const { business } = useBusiness()
  const toast = useToast()
  const [threads, setThreads] = useState<Thread[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [imgs, setImgs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
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
    const { data } = await supabase.from('mentor_messages').select('id, role, content, images, actions, created_at').eq('thread_id', id).order('created_at')
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

  async function send(q = text) {
    const msg = q.trim()
    if ((!msg && !imgs.length) || busy) return
    if (credits < custo) return toast.show('Você não tem créditos suficientes pra falar com o Mentor.')
    const sentImgs = imgs
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: msg, images: sentImgs, actions: [], at: Date.now() }])
    setText('')
    setImgs([])
    setBusy(true)

    if (!live || !supabase) {
      addCredits(-custo, 'Mentor')
      await new Promise((r) => window.setTimeout(r, 1400))
      const r = demoReply(msg, nome, sentImgs.length > 0)
      setMsgs((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', text: r.text, images: [], actions: r.actions, at: Date.now() }])
      setBusy(false)
      return
    }

    const { data, error } = await supabase.functions.invoke('mentor', { body: { thread_id: threadId, mensagem: msg, imagens: sentImgs } })
    setBusy(false)
    if (error || !data?.mensagem) {
      let code = ''
      try {
        const ctx = (error as { context?: Response } | null)?.context
        const b = ctx ? await ctx.json() : null
        code = String(b?.error ?? '')
        if (b?.thread_id) setThreadId(b.thread_id)
      } catch {
        /* sem detalhe */
      }
      await reload()
      setMsgs((m) => [
        ...m,
        {
          id: `e${Date.now()}`,
          role: 'assistant',
          text: code === 'creditos_insuficientes' ? 'Seus créditos acabaram. Compre mais créditos pra continuar a conversa.' : 'Não consegui responder agora. Seus créditos foram devolvidos, tenta de novo em instantes.',
          images: [],
          actions: [],
          at: Date.now(),
        },
      ])
      return
    }
    setThreadId(data.thread_id)
    setMsgs((m) => [...m, { id: data.mensagem.id ?? `a${Date.now()}`, role: 'assistant', text: data.mensagem.texto, images: [], actions: data.mensagem.acoes ?? [], at: Date.now() }])
    reload()
    loadThreads()
  }

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
      <ModuleHeader
        id="mentor"
        actions={
          <button type="button" onClick={() => setListOpen(true)} className="press flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-3.5 text-[14px] font-semibold text-soft hover:text-ink lg:hidden">
            <History size={16} /> Conversas
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">{threadList}</aside>

        <section className="flex h-[calc(100dvh-270px)] min-h-[460px] flex-col overflow-hidden rounded-[24px] border border-line bg-[#0f1218] lg:h-[calc(100vh-190px)]">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
            {msgs.length === 0 && !loadingThread && (
              <div className="m-auto flex w-full max-w-[560px] flex-col items-center gap-5 py-6 text-center">
                <ModuleIcon id="mentor" size="lg" />
                <div className="flex flex-col gap-1.5">
                  <h2 className="m-0 font-display text-[24px] font-extrabold">Oi! Me conta o que tá travando{business.name ? ` no ${business.name}` : ''}.</h2>
                  <p className="m-0 text-[14.5px] text-muted">Venda parada, preço, o que postar, como anunciar. Pode mandar prints do seu Instagram pelo clipe que eu analiso.</p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {SUGESTOES.map((s) => (
                    <button key={s} type="button" onClick={() => (s.includes('prints') ? (setText(s), file.current?.click()) : send(s))} className="press min-h-12 cursor-pointer rounded-2xl border border-line-strong bg-surface px-4 py-3 text-left text-[14px] font-medium text-soft hover:border-[#a78bfa80] hover:text-ink">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loadingThread && <span className="m-auto h-8 w-8 animate-spin rounded-full border-[3px] border-[#a78bfa] border-t-transparent" aria-label="Carregando" />}
            {msgs.map((m) => (
              <Bubble key={m.id} m={m} />
            ))}
            {busy && (
              <div className="flex items-center gap-3 text-[#c4b5fd]">
                <ModuleIcon id="mentor" size="sm" />
                <span className="flex items-center gap-1.5 text-[14px]">
                  <Sparkles size={15} className="animate-pulse" /> {imgs.length || msgs.at(-1)?.images.length ? 'Analisando os prints…' : 'Pensando…'}
                </span>
              </div>
            )}
            <div ref={end} />
          </div>

          <div className="border-t border-line bg-side/80 p-3 sm:p-4">
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
            <div className="flex items-end gap-2 rounded-[18px] border border-line-strong bg-bg/70 p-1.5 focus-within:border-[#a78bfa]">
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
                placeholder="Pergunte ao Mentor…"
                className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[16px] text-ink outline-none placeholder:text-subtle [field-sizing:content]"
              />
              <button type="button" onClick={() => send()} disabled={busy || (!text.trim() && !imgs.length)} aria-label="Enviar" className="press flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent text-accent-ink disabled:opacity-40">
                <Send size={18} />
              </button>
            </div>
            <p className="m-0 mt-2 text-center text-[12px] text-subtle">
              {custo} crédito{custo > 1 ? 's' : ''} por mensagem{imgs.length ? ' com prints' : ''} · Enter envia
            </p>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" tabIndex={-1} onChange={(e) => (pickImages(e.target.files), (e.target.value = ''))} />
          </div>
        </section>
      </div>

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
