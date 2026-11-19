import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Scene } from '../components/art'
import { ClipArt, clips } from '../components/Showcase'
import { Badge, LinkButton, PageHeader, cx } from '../components/ui'
import { SECONDS_PER_PART } from '../lib/pricing'
import { timeAgo, useStore } from '../lib/store'

const filters = [
  { id: 'todos', label: 'Todos' },
  { id: 'pronto', label: 'Prontos' },
  { id: 'gerando', label: 'Gerando' },
] as const

export function Videos() {
  const { stories, characters, openStory } = useStore()
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('todos')
  const list = filter === 'todos' ? stories : stories.filter((s) => s.status === filter)

  return (
    <AppShell active="videos">
      <PageHeader
        title="Meus vídeos"
        actions={
          <LinkButton to="nova-historinha" size="lg">
            <Plus size={18} /> Novo vídeo
          </LinkButton>
        }
      />

      {stories.length === 0 ? (
        <div className="rise flex flex-col items-center gap-5 rounded-[22px] border border-dashed border-[#3a4152] px-6 py-14 text-center">
          <ClipArt clip={clips.videos} className="aspect-[4/3] w-full max-w-[320px] rounded-2xl" />
          <h2 className="m-0 font-display text-[24px] font-extrabold">Nenhum vídeo ainda</h2>
          <p className="m-0 max-w-[420px] text-[15px] text-muted">Conte uma ideia, escolha seu elenco e o Diretor faz o resto.</p>
          <LinkButton to="nova-historinha" size="lg">
            <Plus size={18} /> Criar minha primeira historinha
          </LinkButton>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Filtrar vídeos" className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cx('press min-h-10 cursor-pointer rounded-full px-4 text-[14px] font-semibold transition-colors', filter === f.id ? 'bg-ink text-bg' : 'border border-line-strong text-soft hover:text-ink')}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {list.map((s, i) => {
              const look = characters.find((c) => c.id === s.characterIds[0])?.look
              return (
                <a key={s.id} href="#editor" onClick={() => openStory(s.id)} className="pop lift flex flex-col gap-3 rounded-2xl text-ink no-underline" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-2xl border border-line-strong">
                    <Scene backdrop={s.parts[0]?.backdrop ?? 'noite'} look={look} className="absolute inset-0 h-full w-full" />
                    <span className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
                      <Badge tone={s.status === 'pronto' ? 'sky' : 'accent'}>{s.status === 'pronto' ? 'Pronto' : 'Gerando'}</Badge>
                      <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[12px] font-semibold">{s.parts.length * SECONDS_PER_PART}s</span>
                    </span>
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold leading-snug">{s.title}</span>
                    <span className="text-[13px] text-muted">
                      {s.parts.length} partes · {timeAgo(s.createdAt)}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>
        </>
      )}
    </AppShell>
  )
}
