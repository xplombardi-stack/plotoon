// Criador de Apps: a pessoa conversa com a IA e ela monta o app/site do negócio.
// Prévia ao vivo isolada, ajustes pelo chat e publicação com link.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy as CopyIcon, ExternalLink, Globe, Monitor, Send, Smartphone, Sparkles, Trash2 } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleDemo } from '../components/FeatureDemos'
import { ModuleHeader, ModuleIcon } from '../components/Module'
import { Button, copyText, cx, useToast } from '../components/ui'
import { useBusiness } from '../lib/business'
import { CREDITS_PER_APP } from '../lib/pricing'
import { timeAgo, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

type Msg = { role: 'user' | 'assistant'; text: string }
type AppRow = { id: string; name: string; slug: string; html: string; messages: Msg[]; published: boolean; updated_at: string }

const MODELOS = [
  { e: '🍔', t: 'Cardápio digital', p: 'Cardápio digital com categorias, carrinho e botão de pedir no WhatsApp' },
  { e: '🛍️', t: 'Catálogo de produtos', p: 'Catálogo dos meus produtos com fotos em destaque, preços e botão de comprar pelo WhatsApp' },
  { e: '📅', t: 'Agendamento', p: 'Página de agendamento: a pessoa escolhe o serviço, o dia e o horário e confirma pelo WhatsApp' },
  { e: '🔗', t: 'Link na bio', p: 'Página de link na bio com meus links, redes, endereço e botão de WhatsApp' },
  { e: '🚀', t: 'Página de vendas', p: 'Página de vendas do meu produto principal, com benefícios, depoimentos de exemplo, perguntas frequentes e botão de comprar' },
  { e: '🧾', t: 'Orçamento', p: 'Calculadora de orçamento: a pessoa escolhe as opções, vê o valor e manda o pedido pelo WhatsApp' },
]

const LOCAL = 'plotoon:apps:v1'
const publicUrl = (slug: string) => `${window.location.origin}/#p/${slug}`

function readLocal(): AppRow[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]')
  } catch {
    return []
  }
}

// Prévia (sem IA): um app de exemplo com o nome e as cores do negócio
function demoHtml(nome: string, cores: string[], pedido: string) {
  const a = cores[0] ?? '#ff8a3d'
  const b = cores[1] ?? '#5b8cff'
  const esc = (s: string) => s.replace(/[<>&"]/g, '')
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(nome)}</title><style>body{margin:0;font-family:system-ui,sans-serif;background:#fafafa;color:#111}header{padding:40px 20px;text-align:center;color:#fff;background:linear-gradient(135deg,${a},${b})}h1{margin:8px 0 4px;font-size:28px}.c{max-width:520px;margin:-20px auto 0;padding:0 16px 40px}.i{display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:14px;margin-top:12px;box-shadow:0 4px 18px #0001}.e{font-size:28px}.n{flex:1;font-weight:700}.p{color:${a};font-weight:800}a.b{display:block;margin-top:20px;text-align:center;background:#16a34a;color:#fff;padding:16px;border-radius:14px;font-weight:800;text-decoration:none}</style></head><body><header><div style="font-size:40px">✨</div><h1>${esc(nome)}</h1><div>${esc(pedido).slice(0, 80)}</div></header><div class="c"><div class="i"><span class="e">⭐</span><span class="n">Produto 1</span><span class="p">R$ 19,90</span></div><div class="i"><span class="e">💛</span><span class="n">Produto 2</span><span class="p">R$ 29,90</span></div><div class="i"><span class="e">🎁</span><span class="n">Combo</span><span class="p">R$ 44,90</span></div><a class="b" href="https://wa.me/?text=Oi!%20Quero%20fazer%20um%20pedido" target="_blank">Pedir no WhatsApp</a></div></body></html>`
}

function Preview({ html, device }: { html: string; device: 'cel' | 'pc' }) {
  return (
    <div className={cx('mx-auto h-full overflow-hidden bg-white shadow-[0_30px_80px_-30px_#000] transition-all duration-500', device === 'cel' ? 'w-full max-w-[390px] rounded-[30px] border-[8px] border-[#1f2430]' : 'w-full rounded-xl border border-line-strong')}>
      <iframe title="Prévia do app" srcDoc={html} sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" className="h-full w-full border-0 bg-white" />
    </div>
  )
}

export function AppsPage() {
  const { live, credits, addCredits, reload } = useStore()
  const { business } = useBusiness()
  const toast = useToast()
  const [apps, setApps] = useState<AppRow[]>(() => (live ? [] : readLocal()))
  const [open, setOpen] = useState<AppRow | null>(null)
  const [pedido, setPedido] = useState('')
  const [busy, setBusy] = useState(false)
  const [device, setDevice] = useState<'cel' | 'pc'>('cel')
  const [tab, setTab] = useState<'chat' | 'previa'>('chat')
  const [error, setError] = useState('')
  const end = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!live || !supabase) return
    const { data } = await supabase.from('apps').select('id, name, slug, html, messages, published, updated_at').order('updated_at', { ascending: false })
    setApps((data ?? []) as AppRow[])
  }, [live])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [open?.messages.length, busy])

  function saveLocal(list: AppRow[]) {
    setApps(list)
    try {
      localStorage.setItem(LOCAL, JSON.stringify(list.slice(0, 20)))
    } catch {
      /* sem armazenamento */
    }
  }

  async function gerar(texto = pedido) {
    const p = texto.trim()
    if (busy || p.length < 3) return
    if (credits < CREDITS_PER_APP) return setError('Você não tem créditos suficientes.')
    setError('')
    setPedido('')
    setBusy(true)
    const pending: AppRow = open ?? { id: '', name: 'Novo app', slug: '', html: '', messages: [], published: false, updated_at: new Date().toISOString() }
    setOpen({ ...pending, messages: [...pending.messages, { role: 'user', text: p }] })

    if (!live || !supabase) {
      addCredits(-CREDITS_PER_APP, 'App com IA')
      await new Promise((r) => window.setTimeout(r, 2200))
      const nome = open?.name && open.name !== 'Novo app' ? open.name : `${business.name || 'Meu negócio'} · ${MODELOS.find((m) => m.p === p)?.t ?? 'App'}`
      const row: AppRow = {
        ...pending,
        id: pending.id || Math.random().toString(36).slice(2),
        slug: pending.slug || Math.random().toString(36).slice(2, 10),
        name: nome,
        html: demoHtml(nome, business.colors, p),
        messages: [...pending.messages, { role: 'user', text: p }, { role: 'assistant', text: 'Pronto! Na prévia é um exemplo. Com a IA ligada, o app sai completo do jeito que você pediu.' }],
        updated_at: new Date().toISOString(),
      }
      setOpen(row)
      saveLocal([row, ...apps.filter((a) => a.id !== row.id)])
      setBusy(false)
      return
    }

    const { data, error: err } = await supabase.functions.invoke('apps', { body: { app_id: open?.id || undefined, pedido: p } })
    setBusy(false)
    if (err || !data?.app) {
      let code = ''
      try {
        const ctx = (err as { context?: Response } | null)?.context
        code = String((ctx ? await ctx.json() : null)?.error ?? '')
      } catch {
        /* sem detalhe */
      }
      await reload()
      setOpen(open)
      return setError(code === 'creditos_insuficientes' ? 'Você não tem créditos suficientes.' : 'Não consegui montar agora. Seus créditos foram devolvidos, tenta de novo.')
    }
    setOpen(data.app as AppRow)
    setTab('previa')
    reload()
    load()
  }

  async function publicar(row: AppRow, published: boolean) {
    const next = { ...row, published }
    setOpen(next)
    if (!live || !supabase) return saveLocal(apps.map((a) => (a.id === row.id ? next : a)))
    const { error: err } = await supabase.from('apps').update({ published }).eq('id', row.id)
    if (err) return toast.show('Não deu pra mudar agora.')
    toast.show(published ? 'App publicado! O link já funciona.' : 'App despublicado')
    load()
  }

  async function apagar(row: AppRow) {
    if (!window.confirm(`Apagar o app "${row.name}"? Isso não dá pra desfazer.`)) return
    setOpen(null)
    if (!live || !supabase) return saveLocal(apps.filter((a) => a.id !== row.id))
    await supabase.from('apps').delete().eq('id', row.id)
    load()
  }

  /* ---------- lista ---------- */
  if (!open)
    return (
      <AppShell active="apps">
        <ModuleHeader id="apps" />
        <section className="grid items-center gap-6 rounded-[24px] border border-line bg-surface p-5 sm:p-7 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-4">
            <h2 className="m-0 font-display text-[24px] font-extrabold leading-tight sm:text-[30px]">O app do seu negócio, criado numa conversa.</h2>
            <p className="m-0 text-[15px] text-muted">Conta o que você quer. A IA monta o app inteiro com a sua marca, você ajusta pelo chat e publica com um link pra mandar pros clientes. Pedidos e agendamentos chegam no seu WhatsApp.</p>
            <div className="flex flex-col gap-2">
              <label htmlFor="app-pedido" className="text-[14px] font-semibold text-soft">
                O que você quer criar?
              </label>
              <textarea id="app-pedido" rows={3} value={pedido} maxLength={3000} onChange={(e) => setPedido(e.target.value)} placeholder="Ex.: um cardápio digital com os sabores, carrinho e botão de pedir no WhatsApp" className="min-h-12 w-full resize-none rounded-[14px] border border-line-strong bg-bg/70 px-4 py-3 text-[16px] text-ink outline-none placeholder:text-subtle focus:border-accent" />
            </div>
            {error && (
              <p role="alert" className="m-0 text-[14px] text-[#fca5a5]">
                {error}
              </p>
            )}
            <Button size="lg" onClick={() => gerar()} disabled={busy || pedido.trim().length < 3} className="self-stretch sm:self-start">
              <Sparkles size={18} /> Criar app · {CREDITS_PER_APP} créditos
            </Button>
          </div>
          <ModuleDemo id="apps" className="h-[340px] w-full" />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-[20px] font-bold">Comece por um modelo</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MODELOS.map((m, i) => (
              <button key={m.t} type="button" onClick={() => setPedido(m.p)} className={cx('rise lift flex cursor-pointer flex-col items-start gap-2 rounded-[18px] border border-line bg-surface p-4 text-left', `rise-${(i % 4) + 1}`)}>
                <span className="text-[26px]">{m.e}</span>
                <span className="text-[15px] font-bold text-ink">{m.t}</span>
                <span className="line-clamp-2 text-[12.5px] text-muted">{m.p}</span>
              </button>
            ))}
          </div>
        </section>

        {apps.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="m-0 font-display text-[20px] font-bold">Seus apps</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((a) => (
                <button key={a.id} type="button" onClick={() => (setOpen(a), setTab('previa'))} className="lift flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-line bg-surface text-left">
                  <span className="pointer-events-none relative block h-44 overflow-hidden bg-white">
                    <iframe title={a.name} srcDoc={a.html} sandbox="" tabIndex={-1} className="absolute left-0 top-0 h-[880px] w-[200%] origin-top-left scale-50 border-0" />
                  </span>
                  <span className="flex items-center gap-2 p-3.5">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-bold text-ink">{a.name}</span>
                      <span className="text-[12.5px] text-muted">{timeAgo(new Date(a.updated_at).getTime())}</span>
                    </span>
                    {a.published && <span className="rounded-full bg-[#34d39922] px-2 py-0.5 text-[11px] font-bold text-[#6ee7b7]">No ar</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </AppShell>
    )

  /* ---------- construtor ---------- */
  const link = open.slug ? publicUrl(open.slug) : ''
  return (
    <AppShell active="apps" wide>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(null)} aria-label="Voltar pros meus apps" className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong hover:bg-surface">
          <ArrowLeft size={18} />
        </button>
        <ModuleIcon id="apps" />
        <span className="min-w-0 flex-1 truncate font-display text-[20px] font-bold sm:text-[24px]">{open.name}</span>
        {open.id && (
          <div className="flex flex-wrap items-center gap-2">
            {open.published ? (
              <>
                <Button variant="soft" onClick={async () => toast.show((await copyText(link)) ? 'Link copiado' : 'Não deu pra copiar')}>
                  <CopyIcon size={16} /> Copiar link
                </Button>
                <a href={link} target="_blank" rel="noreferrer" className="press inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line-strong px-4 text-[14px] font-semibold text-ink no-underline hover:border-accent-line">
                  <ExternalLink size={16} /> Abrir
                </a>
                <Button variant="ghost" onClick={() => publicar(open, false)}>
                  Tirar do ar
                </Button>
              </>
            ) : (
              <Button onClick={() => publicar(open, true)}>
                <Globe size={16} /> Publicar
              </Button>
            )}
            <button type="button" onClick={() => apagar(open)} aria-label="Apagar app" className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-subtle hover:bg-[#ef444422] hover:text-[#fca5a5]">
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </div>
      {open.published && link && (
        <p className="m-0 -mt-4 flex items-center gap-2 text-[13px] text-[#6ee7b7]">
          <Check size={15} /> No ar em <span className="truncate font-semibold">{link}</span>
        </p>
      )}

      <div role="tablist" className="-mt-2 flex gap-2 lg:hidden">
        {(['chat', 'previa'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('press min-h-10 flex-1 cursor-pointer rounded-full text-[14px] font-semibold', tab === t ? 'bg-ink text-bg' : 'border border-line-strong text-soft')}>
            {t === 'chat' ? 'Conversa' : 'Prévia'}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className={cx('flex h-[calc(100dvh-300px)] min-h-[440px] flex-col overflow-hidden rounded-[24px] border border-line bg-[#0f1218] lg:flex lg:h-[calc(100vh-210px)]', tab === 'chat' ? 'flex' : 'hidden')}>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {open.messages.map((m, i) =>
              m.role === 'user' ? (
                <p key={i} className="pop m-0 max-w-[88%] self-end whitespace-pre-wrap rounded-[16px] rounded-br-md bg-accent px-3.5 py-2.5 text-[14px] font-medium text-accent-ink">
                  {m.text}
                </p>
              ) : (
                <div key={i} className="rise flex gap-2.5">
                  <ModuleIcon id="apps" size="sm" />
                  <p className="m-0 max-w-[88%] whitespace-pre-wrap rounded-[16px] rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-soft">{m.text}</p>
                </div>
              ),
            )}
            {busy && (
              <div className="flex flex-col gap-2 rounded-2xl border border-[#22d3ee44] bg-[#22d3ee0d] p-3.5">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-[#a5f3fc]">
                  <Sparkles size={16} className="animate-pulse" /> Construindo seu app…
                </span>
                <span className="text-[12.5px] text-muted">Leva cerca de 1 minuto. Pode deixar essa tela aberta.</span>
                <span className="relative h-1.5 overflow-hidden rounded-full bg-line">
                  <span className="shimmer absolute inset-0" />
                </span>
              </div>
            )}
            <div ref={end} />
          </div>
          <div className="border-t border-line p-3">
            {error && (
              <p role="alert" className="m-0 mb-2 text-[13px] text-[#fca5a5]">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2 rounded-[16px] border border-line-strong bg-bg/70 p-1.5 focus-within:border-[#22d3ee]">
              <label htmlFor="app-ajuste" className="sr-only">
                Pedir ajuste
              </label>
              <textarea
                id="app-ajuste"
                rows={1}
                value={pedido}
                maxLength={3000}
                onChange={(e) => setPedido(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    gerar()
                  }
                }}
                placeholder={open.id ? 'Ex.: troca a cor do botão, adiciona os combos…' : 'Descreva o app'}
                className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] text-ink outline-none placeholder:text-subtle [field-sizing:content]"
              />
              <button type="button" onClick={() => gerar()} disabled={busy || pedido.trim().length < 3} aria-label="Enviar" className="press flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent text-accent-ink disabled:opacity-40">
                <Send size={18} />
              </button>
            </div>
            <p className="m-0 mt-1.5 text-center text-[11.5px] text-subtle">{CREDITS_PER_APP} créditos por criação ou ajuste</p>
          </div>
        </section>

        <section className={cx('flex h-[calc(100dvh-300px)] min-h-[440px] flex-col gap-3 lg:flex lg:h-[calc(100vh-210px)]', tab === 'previa' ? 'flex' : 'hidden')}>
          <div className="flex items-center justify-center gap-2">
            {(['cel', 'pc'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={d === 'cel' ? 'Ver no celular' : 'Ver no computador'} className={cx('press flex h-10 w-12 cursor-pointer items-center justify-center rounded-xl', device === d ? 'bg-ink text-bg' : 'border border-line-strong text-soft')}>
                {d === 'cel' ? <Smartphone size={17} /> : <Monitor size={17} />}
              </button>
            ))}
          </div>
          <div className="relative min-h-0 flex-1">
            {open.html ? (
              <Preview html={open.html} device={device} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#3a4152]">
                <span className="relative h-10 w-10 animate-spin rounded-full border-[3px] border-[#22d3ee] border-t-transparent" />
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}

/* ---------- Página pública do app (#p/slug), fora do login ---------- */
export function PublicApp() {
  const slug = window.location.hash.replace('#p/', '').replace(/[^a-z0-9-]/gi, '').slice(0, 40)
  const [state, setState] = useState<{ html: string; name: string } | null | 'loading'>('loading')
  useEffect(() => {
    if (!supabase) {
      const local = readLocal().find((a) => a.slug === slug && a.published)
      return setState(local ? { html: local.html, name: local.name } : null)
    }
    supabase.rpc('app_publico', { p_slug: slug }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null
      setState(row ? { html: row.html, name: row.name } : null)
    })
  }, [slug])
  useEffect(() => {
    if (state && state !== 'loading') document.title = state.name
  }, [state])
  if (state === 'loading')
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#ff8a3d] border-t-transparent" aria-label="Carregando" />
      </div>
    )
  if (!state)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="m-0 font-display text-[26px] font-bold">Esse app não está no ar</h1>
        <p className="m-0 text-muted">O link pode estar errado ou o app foi tirado do ar.</p>
        <a href="#site" className="font-semibold text-accent-text">
          Conhecer o Plotoon
        </a>
      </div>
    )
  return (
    <div className="fixed inset-0 bg-white">
      <iframe title={state.name} srcDoc={state.html} sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" className="h-full w-full border-0" />
      <a href="#site" target="_blank" rel="noreferrer" className="fixed bottom-3 right-3 rounded-full bg-black/75 px-3 py-1.5 text-[11.5px] font-semibold text-white no-underline backdrop-blur">
        Feito com Plotoon
      </a>
    </div>
  )
}
