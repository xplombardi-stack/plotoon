import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { EntryCard, EntryPreview, useLibraryEntries, type Entry } from '../components/Library'
import { ModuleDemo } from '../components/FeatureDemos'
import { ModuleHeader } from '../components/Module'
import { LinkButton, cx } from '../components/ui'
import type { LibraryKind } from '../lib/business'

const TYPES: Array<{ id: 'todos' | 'videos' | LibraryKind; label: string; kinds?: LibraryKind[] }> = [
  { id: 'todos', label: 'Tudo' },
  { id: 'videos', label: 'Vídeos', kinds: ['historinha', 'video', 'avatar'] },
  { id: 'imagem', label: 'Imagens', kinds: ['imagem'] },
  { id: 'corte', label: 'Cortes', kinds: ['corte'] },
  { id: 'copy', label: 'Copy', kinds: ['copy'] },
  { id: 'personagem', label: 'Personagens', kinds: ['personagem'] },
]

const DATES = [
  { id: 'tudo', label: 'Qualquer data', days: Infinity },
  { id: 'hoje', label: 'Hoje', days: 0 },
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
] as const

function Chips<T extends string>({ label, items, value, onChange }: { label: string; items: ReadonlyArray<{ id: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="radio"
          aria-checked={value === it.id}
          onClick={() => onChange(it.id)}
          className={cx('press min-h-10 shrink-0 cursor-pointer rounded-full px-4 text-[14px] font-semibold transition-colors', value === it.id ? 'bg-ink text-bg' : 'border border-line-strong text-soft hover:text-ink')}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Library() {
  const entries = useLibraryEntries()
  const [type, setType] = useState<(typeof TYPES)[number]['id']>('todos')
  const [date, setDate] = useState<(typeof DATES)[number]['id']>('tudo')
  const [open, setOpen] = useState<Entry | null>(null)

  const kinds = TYPES.find((t) => t.id === type)?.kinds
  const days = DATES.find((d) => d.id === date)!.days
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const list = entries.filter((e) => {
    if (kinds && !kinds.includes(e.kind)) return false
    if (days === Infinity) return true
    if (days === 0) return e.createdAt >= startOfToday
    return e.createdAt >= Date.now() - days * 86_400_000
  })

  return (
    <AppShell active="biblioteca">
      <ModuleHeader id="biblioteca" />

      {entries.length === 0 ? (
        <div className="rise flex flex-col items-center gap-5 rounded-[22px] border border-dashed border-[#3a4152] px-6 py-14 text-center">
          <ModuleDemo id="biblioteca" base={360} className="aspect-[4/3.6] w-full max-w-[320px]" />
          <h2 className="m-0 font-display text-[24px] font-extrabold">Sua biblioteca está vazia</h2>
          <p className="m-0 max-w-[420px] text-[15px] text-muted">Tudo que você criar nos estúdios fica guardado aqui, pronto pra baixar ou usar de novo.</p>
          <LinkButton to="estudio-video" size="lg">
            <Plus size={18} /> Criar o primeiro
          </LinkButton>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Chips label="Tipo" items={TYPES} value={type} onChange={setType} />
            <Chips label="Data" items={DATES} value={date} onChange={setDate} />
          </div>
          {list.length === 0 ? (
            <p className="m-0 rounded-2xl border border-line bg-surface px-5 py-8 text-center text-[15px] text-muted">Nada aqui com esses filtros.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((e, i) => (
                <EntryCard key={e.id} e={e} i={i} onPick={setOpen} />
              ))}
            </div>
          )}
        </>
      )}

      {open && <EntryPreview e={open} onClose={() => setOpen(null)} />}
    </AppShell>
  )
}
