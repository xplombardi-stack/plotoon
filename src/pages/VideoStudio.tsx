import type { ReactNode } from 'react'
import { useState } from 'react'
import { ArrowRight, Clapperboard, Megaphone, Mic, Plus, Users, Wand2 } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { LoopVideo } from '../components/LoopVideo'
import { ModuleHeader, SoonNotice, SoonPill } from '../components/Module'
import { StoryReel, stories as reel } from '../components/StoryReel'
import { Scene, Toon } from '../components/art'
import { Badge, Button, LinkButton, cx } from '../components/ui'
import { timeAgo, useStore } from '../lib/store'
import { useBusiness } from '../lib/business'

const TABS = [
  { id: 'historinhas', label: 'Historinhas', icon: Clapperboard, ready: true },
  { id: 'ia', label: 'Vídeo com IA', icon: Wand2, ready: false },
  { id: 'criativo', label: 'Criativo de anúncio', icon: Megaphone, ready: false },
  { id: 'avatar', label: 'Avatar falando', icon: Mic, ready: false },
] as const
type Tab = (typeof TABS)[number]['id']
const TAB_KEY = 'plotoon:aba-video'

function Stories() {
  const { stories, characters, openStory } = useStore()
  const [filter, setFilter] = useState<'todos' | 'pronto' | 'gerando'>('todos')
  const list = filter === 'todos' ? stories : stories.filter((s) => s.status === filter)
  const faces = characters.slice(0, 4)

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <a href="#nova-historinha" className="rise group relative flex min-h-[240px] flex-col justify-end overflow-hidden rounded-[24px] border border-line-strong bg-side p-5 text-ink no-underline sm:min-h-[280px] sm:p-7">
          <div aria-hidden className="absolute inset-0 flex gap-2 p-2 opacity-90">
            {reel.slice(0, 4).map((s, i) => (
              <span key={s.title} className={cx('relative flex-1 overflow-hidden rounded-[16px]', i > 1 && 'hidden sm:block')}>
                <LoopVideo src={s.video} poster={s.poster} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </span>
            ))}
          </div>
          <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
          <span className="relative flex flex-col gap-3">
            <Badge tone="accent" className="self-start">Boneco 3D</Badge>
            <span className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[32px]">Criar historinha</span>
            <span className="max-w-[440px] text-[15px] text-soft">Conte a ideia. O Diretor escreve a história em partes, você vê o custo antes e o app junta tudo num vídeo só.</span>
            <span className="shine inline-flex min-h-12 items-center gap-2 self-start rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-ink">
              <Plus size={18} aria-hidden /> Nova historinha
            </span>
          </span>
        </a>

        <a href="#elenco" className="rise rise-1 lift flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-5 text-ink no-underline sm:p-6">
          <span className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[16px] font-bold">
              <Users size={18} className="text-accent" aria-hidden /> Elenco
            </span>
            <span className="text-[13px] text-muted">{characters.length} personagens</span>
          </span>
          <span className="flex -space-x-3">
            {faces.length === 0 ? (
              <span className="text-[14px] text-muted">Crie o boneco 3D com o seu rosto.</span>
            ) : (
              faces.map((c) => (
                <span key={c.id} className="relative h-16 w-16 overflow-hidden rounded-full border-[3px] border-surface bg-gradient-to-b from-[#2a1a12] to-[#120d0a]">
                  {c.image || c.photo ? <img src={c.image ?? c.photo} alt="" className="h-full w-full object-cover object-top" /> : <Toon look={c.look} className="absolute inset-x-0 bottom-0 w-full" />}
                </span>
              ))
            )}
          </span>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent-text">
            {characters.length ? 'Ver elenco' : 'Criar personagem'} <ArrowRight size={16} aria-hidden />
          </span>
        </a>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-display text-[20px] font-bold">Suas historinhas</h2>
          {stories.length > 0 && (
            <div role="radiogroup" aria-label="Filtrar" className="flex gap-2">
              {(['todos', 'pronto', 'gerando'] as const).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)} className={cx('press min-h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold', filter === f ? 'bg-ink text-bg' : 'border border-line-strong text-soft hover:text-ink')}>
                  {f === 'todos' ? 'Todas' : f === 'pronto' ? 'Prontas' : 'Gerando'}
                </button>
              ))}
            </div>
          )}
        </div>
        {stories.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[15px] text-muted">Sua primeira historinha aparece aqui. Olha o tipo de vídeo que dá pra fazer:</p>
            <StoryReel size="sm" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {list.map((s, i) => {
              const look = characters.find((c) => c.id === s.characterIds[0])?.look
              return (
                <a key={s.id} href="#editor" onClick={() => openStory(s.id)} className="pop lift flex flex-col gap-2.5 rounded-2xl text-ink no-underline" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-2xl border border-line-strong">
                    <Scene backdrop={s.parts[0]?.backdrop ?? 'noite'} look={look} className="absolute inset-0 h-full w-full" />
                    <span className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
                      <Badge tone={s.status === 'pronto' ? 'sky' : 'accent'}>{s.status === 'pronto' ? 'Pronto' : 'Gerando'}</Badge>
                      <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[12px] font-semibold">{s.parts.length * s.seconds}s</span>
                    </span>
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14px] font-semibold leading-snug">{s.title}</span>
                    <span className="text-[12.5px] text-muted">
                      {s.parts.length} partes · {timeAgo(s.createdAt)}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// Abas que ainda não estão ligadas: tela completa, com exemplo e o formulário travado
function SoonTab({ title, sub, examples, fields, cost }: { title: string; sub: string; examples: number[]; fields: ReactNode; cost: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="rise flex flex-col gap-5 rounded-[24px] border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 font-display text-[22px] font-bold">{title}</h2>
          <p className="m-0 text-[14.5px] text-muted">{sub}</p>
        </div>
        <SoonNotice />
        <fieldset disabled className="m-0 flex flex-col gap-4 border-0 p-0 opacity-80">
          {fields}
        </fieldset>
        <Button size="lg" disabled className="self-stretch sm:self-start">
          Gerar · {cost}
        </Button>
      </div>
      <div className="rise rise-1 grid grid-cols-3 gap-3">
        {examples.map((n, i) => (
          <span key={n} className={cx('relative aspect-[9/16] overflow-hidden rounded-[18px] border border-line-strong', i === 1 && 'translate-y-6')}>
            <LoopVideo src={reel[n].video} poster={reel[n].poster} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">Exemplo</span>
          </span>
        ))}
      </div>
    </div>
  )
}

const fieldCls = 'min-h-12 w-full rounded-[14px] border border-line-strong bg-bg/70 px-4 text-[15px] text-ink outline-none placeholder:text-subtle'

export function VideoStudio() {
  const { business } = useBusiness()
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (sessionStorage.getItem(TAB_KEY) as Tab) || 'historinhas'
    } catch {
      return 'historinhas'
    }
  })
  function pick(t: Tab) {
    setTab(t)
    try {
      sessionStorage.setItem(TAB_KEY, t)
    } catch {
      /* sem armazenamento */
    }
  }
  const produto = business.sells ? business.sells.split(/[,.]/)[0] : 'seu produto'

  return (
    <AppShell active="estudio-video">
      <ModuleHeader
        id="estudio-video"
        actions={
          tab === 'historinhas' ? (
            <span className="hidden sm:block">
              <LinkButton to="nova-historinha" size="lg">
                <Plus size={18} /> Nova historinha
              </LinkButton>
            </span>
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Tipos de vídeo" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => pick(t.id)}
            className={cx(
              'press flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors',
              tab === t.id ? 'bg-ink text-bg' : 'border border-line-strong text-soft hover:text-ink',
            )}
          >
            <t.icon size={16} aria-hidden /> {t.label}
            {!t.ready && <SoonPill className={tab === t.id ? '!border-bg/20 !bg-bg/10 !text-bg/70' : ''} />}
          </button>
        ))}
      </div>

      <div role="tabpanel" key={tab}>
        {tab === 'historinhas' && <Stories />}
        {tab === 'ia' && (
          <SoonTab
            title="Vídeo com IA"
            sub="Descreva a cena e a IA cria o vídeo, no formato certo pra cada rede."
            examples={[7, 13, 11]}
            cost="45 créditos"
            fields={
              <>
                <textarea rows={3} className={cx(fieldCls, 'resize-none py-3')} placeholder={`Ex.: ${produto} em cima da mesa, câmera girando devagar, luz de fim de tarde`} />
                <div className="grid grid-cols-3 gap-2">
                  {['9:16', '1:1', '16:9'].map((f, i) => (
                    <span key={f} className={cx('flex min-h-11 items-center justify-center rounded-xl border-2 text-[14px] font-semibold', i === 0 ? 'border-accent text-ink' : 'border-line text-muted')}>
                      {f}
                    </span>
                  ))}
                </div>
              </>
            }
          />
        )}
        {tab === 'criativo' && (
          <SoonTab
            title="Criativo de anúncio"
            sub="Vídeo curto feito pra vender: gancho nos 2 primeiros segundos, oferta e chamada pra ação."
            examples={[1, 8, 4]}
            cost="60 créditos"
            fields={
              <>
                <input className={fieldCls} placeholder="O que você quer vender nesse anúncio?" defaultValue={business.sells ? produto : ''} />
                <input className={fieldCls} placeholder="Oferta (ex.: frete grátis hoje)" />
                <input className={fieldCls} placeholder="Chamada (ex.: chama no WhatsApp)" />
              </>
            }
          />
        )}
        {tab === 'avatar' && (
          <SoonTab
            title="Avatar falando"
            sub="Um apresentador com IA falando o seu texto, com a voz e o jeito da sua marca."
            examples={[15, 0, 9]}
            cost="40 créditos"
            fields={
              <>
                <textarea rows={4} className={cx(fieldCls, 'resize-none py-3')} placeholder="Cole o texto que o avatar vai falar" />
                <input className={fieldCls} placeholder="Escolha o avatar e a voz" />
              </>
            }
          />
        )}
      </div>
    </AppShell>
  )
}
