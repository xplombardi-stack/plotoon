import { Play } from 'lucide-react'
import { modules } from '../data/mock'
import { AppShell } from '../components/AppShell'
import { ClipArt, clips } from '../components/Showcase'
import { Badge, PageHeader, SectionTitle, Shot } from '../components/ui'

export function Lessons() {
  return (
    <AppShell active="aulas">
      <PageHeader title="Aulas" subtitle="Do primeiro boneco ao vídeo que viraliza." />

      <section className="relative grid items-center gap-6 overflow-hidden rounded-[22px] border border-line bg-surface p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="aurora"><span /></div>
        <div className="relative overflow-hidden rounded-2xl">
          <ClipArt clip={clips.videos} className="aspect-video w-full" />
        </div>
        <div className="relative flex flex-col gap-4">
          <Badge tone="violet" className="self-start">Em breve</Badge>
          <h2 className="m-0 font-display text-[26px] font-bold leading-tight tracking-[-0.02em]">As aulas estão chegando</h2>
          <p className="m-0 text-[15px] leading-relaxed text-muted">Passo a passo pra criar seu boneco, escrever histórias que prendem e postar do jeito certo.</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Módulos</SectionTitle>
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {modules.map((m, i) => (
            <article key={m.id} className={`rise lift flex flex-col overflow-hidden rounded-2xl border border-line bg-surface rise-${(i % 4) + 1}`}>
              <Shot tint={m.tint} label={`Capa do módulo ${m.title}`} className="flex aspect-video items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
                  <Play size={20} fill="currentColor" />
                </span>
              </Shot>
              <div className="flex flex-col gap-1.5 p-4">
                <span className="text-[13px] text-muted">Módulo {i + 1} · {m.lessons} aulas</span>
                <span className="text-[16px] font-bold leading-snug">{m.title}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
