// Calendário: o Mentor planeja o mês e cada post sai direto do dia.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader } from '../components/Module'
import { Button, cx, useToast } from '../components/ui'
import { runAction, type MentorAction } from '../lib/actions'
import { useBusiness } from '../lib/business'
import { CREDITS_PER_PLAN } from '../lib/pricing'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

type Kind = 'video' | 'post' | 'story' | 'copy'
type Post = { id: string; day: string; kind: Kind; channel: string; title: string; idea: string; done: boolean }

const KIND: Record<Kind, { label: string; dot: string; chip: string }> = {
  video: { label: 'Vídeo', dot: 'bg-accent', chip: 'bg-[#ff8a3d22] text-accent-text' },
  post: { label: 'Post', dot: 'bg-sky', chip: 'bg-[#38bdf822] text-sky-text' },
  story: { label: 'Story', dot: 'bg-[#a78bfa]', chip: 'bg-[#a78bfa22] text-[#c4b5fd]' },
  copy: { label: 'Copy', dot: 'bg-[#facc15]', chip: 'bg-[#facc1522] text-[#fde68a]' },
}
const LOCAL = 'plotoon:calendario:v1'
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function readLocal(): Post[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]')
  } catch {
    return []
  }
}
function writeLocal(p: Post[]) {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(p))
  } catch {
    /* sem armazenamento */
  }
}

function toAction(p: Post): MentorAction {
  if (p.kind === 'video') return { tipo: 'video', titulo: p.title, detalhe: p.idea || p.title }
  if (p.kind === 'copy') return { tipo: 'copy', titulo: p.title, detalhe: p.idea || p.title, formato: 'venda' }
  return { tipo: 'imagem', titulo: p.title, detalhe: p.idea || p.title, formato: p.kind === 'story' ? 'story' : 'post' }
}

const IDEIAS_DEMO: Array<[Kind, string, string]> = [
  ['video', 'Historinha: o cliente que duvidou', 'Vídeo curto com virada mostrando um cliente que não acreditava e virou fã.'],
  ['post', 'Foto do produto mais vendido', 'Post com a foto do campeão de vendas e o preço visível.'],
  ['story', 'Bastidores da produção', 'Story mostrando como o produto é feito.'],
  ['copy', 'Mensagem pra quem sumiu', 'Mensagem no WhatsApp pra quem perguntou o preço e não comprou.'],
]

export function CalendarPage() {
  const { live, credits, addCredits, reload } = useStore()
  const { business } = useBusiness()
  const toast = useToast()
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [posts, setPosts] = useState<Post[]>(() => (live ? [] : readLocal()))
  const [sel, setSel] = useState(now.getDate())
  const [porSemana, setPorSemana] = useState(3)
  const [foco, setFoco] = useState(() => {
    try {
      const v = sessionStorage.getItem('plotoon:calendario') ?? ''
      sessionStorage.removeItem('plotoon:calendario')
      return v
    } catch {
      return ''
    }
  })
  const [busy, setBusy] = useState(false)
  const [novo, setNovo] = useState('')
  const [novoKind, setNovoKind] = useState<Kind>('video')

  const dias = new Date(ym.y, ym.m + 1, 0).getDate()
  const offset = new Date(ym.y, ym.m, 1).getDay()
  const mesNome = new Date(ym.y, ym.m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const isToday = (d: number) => ym.y === now.getFullYear() && ym.m === now.getMonth() && d === now.getDate()

  const load = useCallback(async () => {
    if (!live || !supabase) return
    const { data } = await supabase
      .from('calendar_posts')
      .select('id, day, kind, channel, title, idea, done')
      .gte('day', iso(ym.y, ym.m, 1))
      .lte('day', iso(ym.y, ym.m, new Date(ym.y, ym.m + 1, 0).getDate()))
      .order('day')
    setPosts((data ?? []) as Post[])
  }, [live, ym])

  useEffect(() => {
    load()
  }, [load])

  const doMes = useMemo(() => posts.filter((p) => p.day.startsWith(`${ym.y}-${pad(ym.m + 1)}`)), [posts, ym])
  const porDia = (d: number) => doMes.filter((p) => p.day === iso(ym.y, ym.m, d))
  const doDia = porDia(sel)

  function mudaMes(delta: number) {
    const d = new Date(ym.y, ym.m + delta, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
    setSel(1)
  }

  async function planejar() {
    if (busy) return
    if (credits < CREDITS_PER_PLAN) return toast.show('Você não tem créditos suficientes.')
    setBusy(true)
    if (!live || !supabase) {
      addCredits(-CREDITS_PER_PLAN, 'Calendário do mês')
      await new Promise((r) => window.setTimeout(r, 1500))
      const start = ym.y === now.getFullYear() && ym.m === now.getMonth() ? now.getDate() : 1
      const novos: Post[] = []
      for (let d = start, k = 0; d <= dias; d += Math.max(1, Math.round(7 / porSemana)), k++) {
        const [kind, title, idea] = IDEIAS_DEMO[k % IDEIAS_DEMO.length]
        novos.push({ id: Math.random().toString(36).slice(2), day: iso(ym.y, ym.m, d), kind, channel: 'Instagram', title, idea, done: false })
      }
      const all = [...posts, ...novos]
      setPosts(all)
      writeLocal(all)
      setBusy(false)
      return toast.show(`${novos.length} posts planejados`)
    }
    const { data, error } = await supabase.functions.invoke('calendario', { body: { ano: ym.y, mes: ym.m + 1, por_semana: porSemana, foco } })
    setBusy(false)
    if (error || !data?.criados) {
      await reload()
      return toast.show('Não consegui planejar agora. Seus créditos foram devolvidos.')
    }
    toast.show(`${data.criados} posts planejados pelo Mentor`)
    reload()
    load()
  }

  async function update(p: Post, patch: Partial<Post>) {
    const all = posts.map((x) => (x.id === p.id ? { ...x, ...patch } : x))
    setPosts(all)
    if (!live || !supabase) return writeLocal(all)
    await supabase.from('calendar_posts').update(patch).eq('id', p.id)
  }

  async function remove(p: Post) {
    const all = posts.filter((x) => x.id !== p.id)
    setPosts(all)
    if (!live || !supabase) return writeLocal(all)
    await supabase.from('calendar_posts').delete().eq('id', p.id)
  }

  async function adicionar() {
    const title = novo.trim()
    if (title.length < 2) return
    const day = iso(ym.y, ym.m, sel)
    setNovo('')
    if (!live || !supabase) {
      const all = [...posts, { id: Math.random().toString(36).slice(2), day, kind: novoKind, channel: 'Instagram', title, idea: '', done: false }]
      setPosts(all)
      return writeLocal(all)
    }
    const { data } = await supabase.from('calendar_posts').insert({ day, kind: novoKind, title }).select('id, day, kind, channel, title, idea, done').single()
    if (data) setPosts((x) => [...x, data as Post])
  }

  return (
    <AppShell active="calendario">
      <ModuleHeader id="calendario" />

      <section className="rise flex flex-col gap-4 rounded-[24px] border border-[#a78bfa40] bg-gradient-to-br from-[#1c1930] via-surface to-surface p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[15px] font-bold">
          <Sparkles size={17} className="text-[#c4b5fd]" /> Mentor, planeja meu mês
        </div>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Posts por semana</span>
            <div role="radiogroup" aria-label="Posts por semana" className="flex gap-1.5">
              {[2, 3, 5, 7].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={porSemana === n} onClick={() => setPorSemana(n)} className={cx('press h-11 w-11 cursor-pointer rounded-xl text-[15px] font-bold', porSemana === n ? 'bg-ink text-bg' : 'border border-line-strong text-soft')}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cal-foco" className="text-[13px] font-semibold text-muted">
              Foco do mês (opcional)
            </label>
            <input id="cal-foco" value={foco} maxLength={400} onChange={(e) => setFoco(e.target.value)} placeholder={`Ex.: lançar o sabor novo${business.name ? ` da ${business.name}` : ''}, promoção de Natal`} className="min-h-11 w-full rounded-xl border border-line-strong bg-bg/70 px-3.5 text-[15px] text-ink outline-none focus:border-[#a78bfa]" />
          </div>
          <Button size="lg" onClick={planejar} disabled={busy} className="whitespace-nowrap">
            {busy ? 'Planejando…' : `Planejar ${new Date(ym.y, ym.m, 1).toLocaleDateString('pt-BR', { month: 'long' })} · ${CREDITS_PER_PLAN} créditos`}
          </Button>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-[24px] border border-line bg-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => mudaMes(-1)} aria-label="Mês anterior" className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl hover:bg-surface-2">
              <ChevronLeft size={20} />
            </button>
            <h2 className="m-0 font-display text-[19px] font-bold capitalize">{mesNome}</h2>
            <button type="button" onClick={() => mudaMes(1)} aria-label="Próximo mês" className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl hover:bg-surface-2">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11.5px] font-semibold text-subtle sm:gap-1.5">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i} className="pb-1">
                {d}
              </span>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <span key={`v${i}`} />
            ))}
            {Array.from({ length: dias }).map((_, i) => {
              const d = i + 1
              const items = porDia(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSel(d)}
                  aria-pressed={sel === d}
                  aria-label={`Dia ${d}${items.length ? `, ${items.length} post${items.length > 1 ? 's' : ''}` : ''}`}
                  className={cx(
                    'press flex aspect-square cursor-pointer flex-col items-center justify-start gap-1 rounded-xl border p-1 text-[13px] sm:aspect-[1/0.9] sm:items-start sm:p-1.5',
                    sel === d ? 'border-accent bg-[#ff8a3d14] text-ink' : isToday(d) ? 'border-[#a78bfa] text-ink' : 'border-line bg-bg/40 text-soft hover:border-line-strong',
                  )}
                >
                  <span className="font-semibold">{d}</span>
                  <span className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                    {items.slice(0, 3).map((p) => (
                      <span key={p.id} className={cx('h-1.5 w-1.5 rounded-full', KIND[p.kind].dot, p.done && 'opacity-40')} />
                    ))}
                  </span>
                  <span className="hidden w-full flex-col gap-0.5 sm:flex">
                    {items.slice(0, 2).map((p) => (
                      <span key={p.id} className={cx('truncate rounded px-1 text-left text-[10.5px] font-semibold', KIND[p.kind].chip, p.done && 'line-through opacity-50')}>
                        {p.title}
                      </span>
                    ))}
                    {items.length > 2 && <span className="text-left text-[10px] text-muted">+{items.length - 2}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted">
            {(Object.keys(KIND) as Kind[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cx('h-2 w-2 rounded-full', KIND[k].dot)} /> {KIND[k].label}
              </span>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[24px] border border-line bg-surface p-4 sm:p-5">
          <h2 className="m-0 font-display text-[18px] font-bold capitalize">{new Date(ym.y, ym.m, sel).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {doDia.length === 0 && <p className="m-0 text-[14px] text-muted">Nada planejado pra esse dia.</p>}
          {doDia.map((p) => (
            <article key={p.id} className={cx('pop flex flex-col gap-2.5 rounded-2xl border border-line bg-bg/50 p-3.5', p.done && 'opacity-60')}>
              <div className="flex items-center gap-2">
                <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold', KIND[p.kind].chip)}>{KIND[p.kind].label}</span>
                <span className="text-[12px] text-muted">{p.channel}</span>
                <button type="button" onClick={() => remove(p)} aria-label={`Apagar ${p.title}`} className="press ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-subtle hover:bg-[#ef444422] hover:text-[#fca5a5]">
                  <Trash2 size={15} />
                </button>
              </div>
              <span className={cx('text-[15px] font-semibold', p.done && 'line-through')}>{p.title}</span>
              {p.idea && <span className="text-[13.5px] leading-relaxed text-muted">{p.idea}</span>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => runAction(toAction(p))}>
                  Gerar agora <ArrowRight size={14} />
                </Button>
                <Button size="sm" variant={p.done ? 'soft' : 'secondary'} onClick={() => update(p, { done: !p.done })}>
                  <Check size={14} /> {p.done ? 'Postado' : 'Marcar como postado'}
                </Button>
              </div>
            </article>
          ))}
          <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
            <span className="text-[13px] font-semibold text-muted">Adicionar nesse dia</span>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(KIND) as Kind[]).map((k) => (
                <button key={k} type="button" onClick={() => setNovoKind(k)} aria-pressed={novoKind === k} className={cx('press min-h-9 cursor-pointer rounded-full px-3 text-[12.5px] font-semibold', novoKind === k ? 'bg-ink text-bg' : 'border border-line-strong text-soft')}>
                  {KIND[k].label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input aria-label="Título do post" value={novo} maxLength={160} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} placeholder="Ex.: vídeo do bastidor" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-bg/70 px-3.5 text-[15px] text-ink outline-none focus:border-accent" />
              <Button onClick={adicionar} aria-label="Adicionar">
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
