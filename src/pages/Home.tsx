import type { FormEvent } from 'react'
import { useState } from 'react'
import { ArrowRight, Check, Plus } from 'lucide-react'
import { ideas } from '../data/mock'
import { AppShell, useDisplayName } from '../components/AppShell'
import { Scene } from '../components/art'
import { Badge, Button, SectionTitle, TextLink, cx, go } from '../components/ui'
import { useStore } from '../lib/store'
import { formatCredits } from '../lib/pricing'
import { LoopVideo } from '../components/LoopVideo'
import { HeroCreators, clips } from '../components/Showcase'
import { StoryReel } from '../components/StoryReel'

const starters: Array<{ to: 'nova-historinha' | 'novo-personagem' | 'planos' | 'videos'; title: string; sub: string; img: string; video: string; pos: string }> = [
  { to: 'nova-historinha', title: 'Criar historinha', sub: 'Da ideia ao vídeo', img: clips.roteiro.poster, video: clips.roteiro.video, pos: '50% 22%' },
  { to: 'novo-personagem', title: 'Criar personagem', sub: 'Seu boneco 3D', img: clips.personagem.poster, video: clips.personagem.video, pos: '50% 25%' },
  { to: 'planos', title: 'Créditos', sub: 'Veja e compre', img: clips.creditos.poster, video: clips.creditos.video, pos: '50% 50%' },
  { to: 'videos', title: 'Meus vídeos', sub: 'Assista e exporte', img: clips.videos.poster, video: clips.videos.video, pos: '50% 45%' },
]

export function Home() {
  const name = useDisplayName()
  const { characters, stories, credits, openStory } = useStore()
  const [idea, setIdea] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    try {
      sessionStorage.setItem('plotoon:ideia', idea)
      sessionStorage.removeItem('plotoon:rascunho')
    } catch {
      /* sem armazenamento */
    }
    go('nova-historinha')
  }

  const onboarding = [
    { done: characters.length > 0, title: 'Crie seu personagem', to: 'novo-personagem' as const },
    { done: stories.length > 0, title: 'Crie sua primeira historinha', to: 'nova-historinha' as const },
    { done: stories.some((s) => s.status === 'pronto'), title: 'Exporte e poste', to: 'videos' as const },
  ]
  const showOnboarding = onboarding.some((o) => !o.done)

  return (
    <AppShell active="inicio">
      <section className="relative grid items-center gap-6 overflow-hidden rounded-[24px] border border-line bg-surface p-6 sm:p-9 xl:grid-cols-[1.25fr_1fr] xl:gap-8">
        <div className="aurora"><span /></div>
        <div className="relative flex flex-col gap-5">
          <p className="rise m-0 text-[16px] text-muted">Oi{name ? `, ${name.split(' ')[0]}` : ''}!</p>
          <h1 className="rise rise-1 text-balance m-0 font-display text-[34px] font-extrabold leading-[1.06] tracking-[-0.03em] sm:text-[44px]">
            O que você vai <span className="text-accent text-glow">criar</span> hoje?
          </h1>
          <form onSubmit={submit} className="rise rise-2 flex flex-wrap gap-2.5">
            <label htmlFor="ideia" className="sr-only">Ideia da historinha</label>
            <input
              id="ideia"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Conte a ideia da sua história"
              className="min-h-14 min-w-0 flex-[1_1_280px] rounded-[16px] border border-line-strong bg-bg/80 px-4.5 text-[16px] text-ink outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_4px_#ff8a3d22]"
            />
            <Button type="submit" size="lg" className="min-h-14 rounded-[16px] px-7 text-[16px]">
              Criar <ArrowRight size={18} />
            </Button>
          </form>
          <div className="rise rise-3 flex flex-wrap gap-2">
            {ideas.slice(0, 3).map((i) => (
              <button key={i} type="button" onClick={() => setIdea(i)} className="press min-h-10 cursor-pointer rounded-full border border-line-strong bg-bg/50 px-3.5 text-[14px] text-soft hover:border-accent-line hover:text-ink">
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="relative order-first xl:order-none">
          <HeroCreators />
        </div>
      </section>

      {showOnboarding && (
        <section className="rise flex flex-col gap-4">
          <SectionTitle>Seus primeiros passos</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            {onboarding.map((o, i) => (
              <a
                key={o.title}
                href={`#${o.to}`}
                className={cx(
                  'lift flex items-center gap-4 rounded-[18px] border p-4 no-underline',
                  o.done ? 'border-sky-line bg-sky-soft/40 text-ink' : 'border-line bg-surface text-ink',
                )}
              >
                <span
                  className={cx(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-bold',
                    o.done ? 'bg-sky text-[#06121f]' : 'bg-accent text-accent-ink',
                  )}
                >
                  {o.done ? <Check size={20} strokeWidth={3} /> : i + 1}
                </span>
                <span className={cx('text-[15px] font-semibold', o.done && 'text-sky-text line-through decoration-2')}>{o.title}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <SectionTitle>Comece por aqui</SectionTitle>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {starters.map((s, i) => (
            <a key={s.to} href={`#${s.to}`} className={cx('group rise lift flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface text-ink no-underline', `rise-${i + 1}`)}>
              <span className="relative block aspect-[5/4] overflow-hidden bg-side">
                <LoopVideo
                  src={s.video}
                  poster={s.img}
                  style={{ objectPosition: s.pos }}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
                <span className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-surface to-transparent" />
              </span>
              <span className="flex flex-col gap-1 p-4">
                <span className="text-[16px] font-bold">{s.title}</span>
                <span className="text-[14px] text-muted">{s.to === 'planos' ? `${formatCredits(credits)} disponíveis` : s.sub}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <SectionTitle>Inspire-se</SectionTitle>
          <p className="m-0 text-[14px] text-muted">Historinhas com boneco 3D, do jeito que você vai criar.</p>
        </div>
        <StoryReel />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle action={stories.length > 0 ? <TextLink to="videos" className="text-[14px]">Ver todos</TextLink> : undefined}>Seus vídeos</SectionTitle>
        {stories.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[22px] border border-dashed border-[#3a4152] px-6 py-10 text-center">
            <p className="m-0 text-[16px] font-semibold">Seu primeiro vídeo aparece aqui</p>
            <a href="#nova-historinha" className="shine press inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-ink no-underline">
              <Plus size={18} /> Criar historinha
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {stories.slice(0, 6).map((s) => {
              const look = characters.find((c) => c.id === s.characterIds[0])?.look
              return (
                <a key={s.id} href="#editor" onClick={() => openStory(s.id)} className="lift flex flex-col gap-2.5 rounded-2xl text-ink no-underline">
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-2xl border border-line-strong">
                    <Scene backdrop={s.parts[0]?.backdrop ?? 'noite'} look={look} className="absolute inset-0 h-full w-full" />
                    <Badge tone={s.status === 'pronto' ? 'sky' : 'accent'} className="absolute left-2.5 top-2.5">
                      {s.status === 'pronto' ? 'Pronto' : 'Gerando'}
                    </Badge>
                  </span>
                  <span className="text-[14px] font-semibold leading-snug">{s.title}</span>
                </a>
              )
            })}
          </div>
        )}
      </section>
    </AppShell>
  )
}
