import { ArrowRight, Check, ChevronDown, Clapperboard, Coins, Layers, Lock, Play } from 'lucide-react'
import { plans } from '../data/mock'
import { LoopVideo } from '../components/LoopVideo'
import { clips, type Clip } from '../components/Showcase'
import { StoryColumns, StoryReel } from '../components/StoryReel'
import { Badge, LinkButton, Logo, cx } from '../components/ui'
import { CREDITS_PER_PART, SECONDS_PER_PART } from '../lib/pricing'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const steps: Array<{ n: number; title: string; text: string; clip: Clip; pos: string }> = [
  { n: 1, title: 'Crie seu boneco', text: 'Mande uma foto. Sai você em 3D, com o mesmo rosto em todas as cenas.', clip: clips.personagem, pos: '50% 28%' },
  { n: 2, title: 'Conte a ideia', text: 'Uma frase basta. O Diretor escreve a história em partes.', clip: clips.roteiro, pos: '50% 25%' },
  { n: 3, title: 'Poste o vídeo', text: 'As partes são geradas e montadas. Sai pronto em 9:16.', clip: clips.videos, pos: '50% 45%' },
]

const features = [
  { icon: Lock, title: 'Rosto travado', text: 'Seu personagem não muda de cara entre as partes.' },
  { icon: Clapperboard, title: 'Diretor com IA', text: 'Escreve a história e o prompt de cada parte pra você.' },
  { icon: Layers, title: 'Vídeo em partes', text: `Você escolhe quantas. Cada uma com até ${SECONDS_PER_PART} segundos.` },
  { icon: Coins, title: 'Custo antes de gerar', text: 'Você vê os créditos antes de apertar o botão.' },
]

const faq = [
  { q: 'Preciso saber editar vídeo?', a: 'Não. Você conta a ideia e o Diretor faz o resto: história, partes, legenda e música.' },
  { q: 'Preciso assinar outra ferramenta?', a: 'Não. Tudo é gerado aqui dentro do Plotoon.' },
  { q: 'O que é um crédito?', a: `É o que você usa pra gerar. Cada parte de até ${SECONDS_PER_PART} segundos gasta ${CREDITS_PER_PART} créditos, e você vê o total antes de gerar.` },
  { q: 'Funciona no celular?', a: 'Sim. É só abrir pelo navegador do celular.' },
]

export function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#site" className="press no-underline" aria-label="Plotoon">
            <Logo />
          </a>
          <nav aria-label="Seções" className="hidden items-center gap-1 md:flex">
            {[
              ['como-funciona', 'Como funciona'],
              ['exemplos', 'Exemplos'],
              ['precos', 'Planos'],
              ['duvidas', 'Dúvidas'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="min-h-10 cursor-pointer rounded-lg px-3 text-[14px] font-medium text-muted transition-colors hover:text-ink">
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LinkButton to="entrar" variant="ghost" size="sm" className="hidden sm:inline-flex">Entrar</LinkButton>
            <LinkButton to="criar-conta" size="sm">Começar agora</LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="aurora"><span /></div>
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-10 lg:pt-6">
            <div className="flex flex-col gap-6">
              <Badge tone="accent" className="rise self-start !bg-accent-soft !text-accent-text shadow-[0_0_0_1px_#ff8a3d55]">Animação 3D com IA</Badge>
              <h1 className="rise rise-1 text-balance m-0 font-display text-[42px] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-[60px]">
                Vire um <span className="text-accent text-glow">boneco 3D</span> e conte histórias que prendem.
              </h1>
              <p className="rise rise-2 m-0 max-w-[520px] text-[17px] leading-relaxed text-muted sm:text-[19px]">Do roteiro ao vídeo pronto pra postar. Sem saber editar.</p>
              <div className="rise rise-3 flex flex-wrap gap-3">
                <LinkButton to="criar-conta" size="lg" className="pulse">
                  Começar agora <ArrowRight size={18} />
                </LinkButton>
                <button
                  type="button"
                  onClick={() => scrollTo('exemplos')}
                  className="press inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-bg/40 px-6 text-[15px] font-semibold text-ink backdrop-blur hover:border-accent-line"
                >
                  <Play size={16} fill="currentColor" /> Ver exemplos
                </button>
              </div>
            </div>

            <div className="relative hidden h-[640px] lg:block">
              <StoryColumns className="absolute inset-0 h-full [&>div]:h-full" />
            </div>
            <div className="-mx-5 sm:-mx-8 lg:hidden">
              <StoryReel size="sm" />
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-20 border-t border-line bg-side">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 py-20 sm:px-8">
            <h2 className="text-balance m-0 text-center font-display text-[34px] font-extrabold tracking-[-0.03em] sm:text-[44px]">Em 3 passos</h2>
            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((s) => (
                <article key={s.n} className="lift flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface">
                  <div className="aspect-[4/3] overflow-hidden bg-side">
                    <LoopVideo src={s.clip.video} poster={s.clip.poster} style={{ objectPosition: s.pos }} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-2 p-5">
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-display text-[16px] font-bold text-accent-ink shadow-[0_0_16px_#ff8a3d88]">{s.n}</span>
                      <h3 className="m-0 text-[19px] font-bold">{s.title}</h3>
                    </span>
                    <p className="m-0 text-[15px] leading-relaxed text-muted">{s.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* EXEMPLOS */}
        <section id="exemplos" className="scroll-mt-20">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 pb-10 pt-20 sm:px-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-balance m-0 font-display text-[34px] font-extrabold tracking-[-0.03em] sm:text-[44px]">Historinhas que prendem</h2>
              <p className="m-0 text-[16px] text-muted">Seu boneco 3D vivendo a história, parte por parte, em vídeo vertical.</p>
            </div>
          </div>
          <StoryReel size="lg" className="pb-20" />
        </section>

        {/* RECURSOS */}
        <section className="border-y border-line bg-side">
          <div className="mx-auto grid max-w-[1200px] gap-6 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="group flex flex-col gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 [transition-timing-function:var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110">
                  <f.icon size={22} aria-hidden />
                </span>
                <h3 className="m-0 text-[17px] font-bold">{f.title}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PLANOS */}
        <section id="precos" className="scroll-mt-20">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 py-20 sm:px-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-balance m-0 font-display text-[34px] font-extrabold tracking-[-0.03em] sm:text-[44px]">Escolha seu plano</h2>
              <p className="m-0 text-[16px] text-muted">Escolha quantos vídeos você quer fazer por mês.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((p) => (
                <article key={p.id} className={cx('lift relative flex flex-col gap-6 rounded-[22px] p-6', p.highlight ? 'neon-border bg-[#16110d]' : 'border border-line bg-surface')}>
                  {p.highlight && <Badge tone="accent" className="absolute -top-3 left-6">Mais escolhido</Badge>}
                  <div className="flex flex-col gap-1.5">
                    <h3 className="m-0 font-display text-[22px] font-bold">{p.name}</h3>
                    <p className="m-0 text-[14px] text-muted">{p.tagline}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[34px] font-extrabold tracking-[-0.02em]">{p.price}</span>
                    {p.price.startsWith('R$') && <span className="text-[14px] text-muted">/mês</span>}
                  </div>
                  <span className="text-[14px] font-semibold text-accent-text">{p.credits}</span>
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-[15px] text-soft">
                        <Check size={18} className="shrink-0 text-sky-text" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <LinkButton to="criar-conta" variant={p.highlight ? 'primary' : 'secondary'} size="lg" className="mt-auto">
                    Assinar o {p.name}
                  </LinkButton>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* DÚVIDAS */}
        <section id="duvidas" className="scroll-mt-20 border-t border-line bg-side">
          <div className="mx-auto flex max-w-[760px] flex-col gap-8 px-5 py-20 sm:px-8">
            <h2 className="text-balance m-0 text-center font-display text-[34px] font-extrabold tracking-[-0.03em] sm:text-[44px]">Dúvidas</h2>
            <div className="flex flex-col gap-3">
              {faq.map((item) => (
                <details key={item.q} className="group rounded-[16px] border border-line bg-surface transition-colors open:border-accent-line">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[16px] font-semibold">
                    {item.q}
                    <ChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="m-0 px-5 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CHAMADA FINAL */}
        <section className="relative overflow-hidden">
          <div className="aurora"><span /></div>
          <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-5 py-24 text-center sm:px-8">
            <h2 className="text-balance m-0 font-display text-[36px] font-extrabold tracking-[-0.03em] sm:text-[52px]">Seu primeiro vídeo hoje.</h2>
            <LinkButton to="criar-conta" size="lg" className="pulse">
              Começar agora <ArrowRight size={18} />
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[14px] text-subtle sm:px-8">
          <Logo size="sm" />
          <div className="flex flex-wrap gap-5">
            <a href="#site" className="text-subtle no-underline hover:text-ink">Termos de uso</a>
            <a href="#site" className="text-subtle no-underline hover:text-ink">Privacidade</a>
            <span>© Plotoon</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
