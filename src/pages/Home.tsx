import { useState } from 'react'
import { ArrowRight, Coins, Plus } from 'lucide-react'
import { AppShell, useDisplayName } from '../components/AppShell'
import { EntryCard, EntryPreview, useLibraryEntries, type Entry } from '../components/Library'
import { ModuleDemo } from '../components/FeatureDemos'
import { ModuleIcon, SoonPill } from '../components/Module'
import { StoryReel } from '../components/StoryReel'
import { Button, SectionTitle, TextLink, cx } from '../components/ui'
import { tipOfTheDay, useBusiness } from '../lib/business'
import { CREATE_MODULES, MODULES, type ModuleId } from '../lib/modules'
import { formatCredits, partCost } from '../lib/pricing'
import { useStore } from '../lib/store'
import { MentorIcon } from '../components/MentorIcon'
import { runAction } from '../lib/actions'

const MORE: ModuleId[] = ['whatsapp', 'calendario', 'anuncios']

export function Home() {
  const name = useDisplayName()
  const { credits } = useStore()
  const { business } = useBusiness()
  const entries = useLibraryEntries()
  const [open, setOpen] = useState<Entry | null>(null)
  const tip = tipOfTheDay(business)
  const first = name.split(' ')[0]

  function makeTip() {
    runAction({ tipo: 'video', titulo: 'Ideia do dia', detalhe: tip.idea })
  }

  return (
    <AppShell active="inicio">
      {/* topo: saudação + saldo */}
      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="relative flex flex-col justify-center gap-5 overflow-hidden rounded-[24px] border border-line bg-surface p-5 sm:p-7">
          <div className="aurora"><span /></div>
          <div className="relative flex flex-col gap-3">
            <div className="rise flex items-center gap-2.5">
              {business.logo && <img src={business.logo} alt="" className="h-9 w-9 rounded-xl bg-white object-contain p-0.5" />}
              <span className="text-[15px] text-muted">
                Oi{first ? `, ${first}` : ''}!{business.name ? ` · ${business.name}` : ''}
              </span>
            </div>
            <h1 className="rise rise-1 text-balance m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
              O que vamos <span className="text-accent text-glow">criar</span> hoje?
            </h1>
          </div>
        </div>

        <a href="#planos" className="rise rise-1 neon-border lift flex flex-col justify-between gap-4 rounded-[24px] bg-surface p-5 text-ink no-underline sm:p-6">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-muted">
            <Coins size={18} className="text-accent" aria-hidden /> Seus créditos
          </span>
          <span className="flex items-end gap-2">
            <span className="font-display text-[48px] font-extrabold leading-none tracking-[-0.03em]">{formatCredits(credits)}</span>
          </span>
          <span className="text-[14px] text-muted">Dá pra uns {Math.floor(credits / partCost(10))} vídeos de 10s</span>
          <span className="inline-flex items-center gap-1.5 self-start rounded-xl bg-accent px-4 py-2.5 text-[14px] font-bold text-accent-ink">
            Comprar créditos <ArrowRight size={16} aria-hidden />
          </span>
        </a>
      </section>

      {/* atalhos pra criar */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Criar</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {CREATE_MODULES.map((id, i) => {
            const m = MODULES[id]
            return (
              <a key={id} href={`#${id}`} className={cx('group rise lift relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] border border-line-strong bg-side p-3.5 text-ink no-underline sm:aspect-[5/6] sm:p-4', `rise-${i + 1}`)}>
                <ModuleDemo id={id} base={400} className="absolute inset-0 p-2 transition-transform duration-700 group-hover:scale-[1.03]" />
                <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/95 to-transparent" />
                {!m.ready && <SoonPill className="absolute right-3 top-3" />}
                <span className="relative flex items-center gap-2.5">
                  <ModuleIcon id={id} size="sm" />
                  <span className="text-[16px] font-bold leading-tight text-white sm:text-[17px]">{m.short ?? m.name}</span>
                </span>
              </a>
            )
          })}
        </div>
      </section>

      {/* sugestão do dia do Mentor */}
      <section className="rise relative overflow-hidden rounded-[24px] border border-[#a78bfa40] bg-gradient-to-br from-[#1c1930] via-surface to-surface p-5 sm:p-7">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#a78bfa33] blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <ModuleIcon id="mentor" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#c4b5fd]">Sugestão do dia do Mentor</span>
              <span className="text-balance font-display text-[20px] font-bold leading-snug sm:text-[22px]">{tip.idea}</span>
              <span className="text-[14px] text-muted">{tip.why}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="lg" onClick={makeTip}>
              Gerar esse vídeo <ArrowRight size={18} />
            </Button>
            <a href="#mentor" className="press inline-flex min-h-13 items-center gap-2 rounded-xl border border-line-strong px-5 text-[15px] font-semibold text-ink no-underline hover:border-[#a78bfa80]">
              <MentorIcon size={18} className="text-[#c4b5fd]" /> Falar com o Mentor
            </a>
          </div>
        </div>
      </section>

      {/* últimos itens */}
      <section className="flex flex-col gap-4">
        <SectionTitle action={entries.length > 0 ? <TextLink to="biblioteca" className="text-[14px]">Ver biblioteca</TextLink> : undefined}>Criados por último</SectionTitle>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[22px] border border-dashed border-[#3a4152] px-6 py-10 text-center">
            <p className="m-0 text-[16px] font-semibold">O que você criar aparece aqui</p>
            <a href="#nova-historinha" className="shine press inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-ink no-underline">
              <Plus size={18} /> Criar historinha
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {entries.slice(0, 6).map((e, i) => (
              <EntryCard key={e.id} e={e} i={i} onPick={setOpen} />
            ))}
          </div>
        )}
      </section>

      {/* vender, planejar, analisar */}
      <section className="flex flex-col gap-4">
        <SectionTitle>Vender e crescer</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {MORE.map((id, i) => {
            const m = MODULES[id]
            return (
              <a key={id} href={`#${id}`} className={cx('rise lift flex items-center gap-3.5 rounded-[20px] border border-line bg-surface p-4 text-ink no-underline', `rise-${i + 1}`)}>
                <ModuleIcon id={id} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-[15px] font-bold">
                    {m.name} {!m.ready && <SoonPill />}
                  </span>
                  <span className="line-clamp-2 text-[13px] text-muted">{m.phrase}</span>
                </span>
              </a>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Inspire-se</SectionTitle>
        <StoryReel />
      </section>

      {open && <EntryPreview e={open} onClose={() => setOpen(null)} />}
    </AppShell>
  )
}
