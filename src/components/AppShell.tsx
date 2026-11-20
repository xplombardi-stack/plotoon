import { useIsAdmin } from '../lib/admin'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Coins, FolderOpen, House, LayoutGrid, LoaderCircle, Plus, X } from 'lucide-react'
import { dismissJob, useJobs } from '../lib/jobs'
import { MentorIcon } from './MentorIcon'
import type { Route } from '../lib/router'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { useBusiness } from '../lib/business'
import { formatCredits } from '../lib/pricing'
import { CREATE_MODULES, MODULES, NAV_GROUPS, moduleFor, type ModuleId } from '../lib/modules'
import { ModuleDemo } from './FeatureDemos'
import { ModuleIcon, SoonPill } from './Module'
import { Logo, cx } from './ui'

export function useDisplayName() {
  const { profile } = useAuth()
  const { name } = useStore()
  return (name || profile?.name || '').trim()
}

function NavItem({ id, on, onPick }: { id: ModuleId; on: boolean; onPick?: () => void }) {
  const m = MODULES[id]
  const Icon = m.icon
  return (
    <a
      href={`#${id}`}
      onClick={onPick}
      aria-current={on ? 'page' : undefined}
      className={cx(
        'group relative flex min-h-10 items-center gap-3 rounded-[11px] px-3 text-[14.5px] no-underline transition-all duration-300',
        on ? 'bg-gradient-to-r from-[#ff8a3d26] to-transparent font-semibold text-ink shadow-[inset_0_0_0_1px_#ff8a3d40]' : 'font-medium text-muted hover:translate-x-1 hover:bg-surface hover:text-ink',
      )}
    >
      {on && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-accent shadow-[0_0_12px_#ff8a3d]" />}
      <Icon size={19} strokeWidth={1.9} className={cx('shrink-0 transition-transform duration-300 group-hover:scale-110', on && 'text-accent')} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{m.name}</span>
      {!m.ready && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#a78bfa]/60" title="Em breve" />}
    </a>
  )
}

function NavGroups({ activeId, onPick }: { activeId?: ModuleId; onPick?: () => void }) {
  const admin = useIsAdmin()
  return (
    <div className="flex flex-col gap-4">
      {admin && (
        <div className="flex flex-col gap-0.5">
          <NavItem id="admin" on={activeId === 'admin'} onPick={onPick} />
        </div>
      )}
      {NAV_GROUPS.map((g, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {g.title && <span className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-subtle">{g.title}</span>}
          {g.items.map((id) => (
            <NavItem key={id} id={id} on={id === activeId} onPick={onPick} />
          ))}
        </div>
      ))}
    </div>
  )
}

function CreditsCard({ on, onPick }: { on: boolean; onPick?: () => void }) {
  const { credits } = useStore()
  return (
    <a
      href="#planos"
      onClick={onPick}
      aria-current={on ? 'page' : undefined}
      className={cx('neon-border flex items-center gap-3 rounded-2xl bg-surface p-3 no-underline', on && 'shadow-[inset_0_0_0_1px_#ff8a3d66]')}
    >
      <Coins size={20} className="shrink-0 text-accent" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="font-display text-[20px] font-bold text-ink">{formatCredits(credits)}</span>
        <span className="text-[12px] text-muted">créditos</span>
      </span>
      <span className="rounded-lg bg-accent px-2.5 py-1.5 text-[12px] font-bold text-accent-ink">Comprar</span>
    </a>
  )
}

function AccountLink({ onPick }: { onPick?: () => void }) {
  const name = useDisplayName()
  const { business } = useBusiness()
  return (
    <a href="#conta" onClick={onPick} className="flex min-h-11 items-center gap-2.5 rounded-[12px] px-2 text-ink no-underline hover:bg-surface">
      {business.logo ? (
        <img src={business.logo} alt="" className="h-8 w-8 rounded-full border border-line-strong bg-white object-contain p-0.5" />
      ) : (
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#ff5da2] text-[13px] font-bold text-accent-ink">
          {(business.name || name || 'V').charAt(0).toUpperCase()}
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[14px] font-semibold">{business.name || name || 'Minha conta'}</span>
        <span className="text-[12px] text-muted">Minha conta</span>
      </span>
    </a>
  )
}

// Folha que sobe de baixo no celular
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[86vh] flex-col overflow-hidden rounded-t-[26px] border-t border-line-strong bg-side pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <span className="font-display text-[19px] font-bold">{title}</span>
          <button type="button" onClick={onClose} aria-label="Fechar" className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-surface">
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-2">{children}</div>
      </div>
    </div>
  )
}

function CreateGrid({ onPick }: { onPick?: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CREATE_MODULES.map((id, i) => {
        const m = MODULES[id]
        return (
          <a key={id} href={`#${id}`} onClick={onPick} className={cx('pop group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[20px] border border-line-strong bg-surface p-3 text-ink no-underline')} style={{ animationDelay: `${i * 60}ms` }}>
            <ModuleDemo id={id} base={400} className="absolute inset-0 bg-[#0d1017] p-1.5" />
            <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />
            <span className="relative flex items-center gap-2">
              <ModuleIcon id={id} size="sm" />
              <span className="text-[15px] font-bold leading-tight text-white">{m.short ?? m.name}</span>
            </span>
            {!m.ready && <SoonPill className="absolute right-2.5 top-2.5" />}
          </a>
        )
      })}
    </div>
  )
}

function BottomBar({ activeId, onCreate, onMore, moreOpen }: { activeId?: ModuleId; onCreate: () => void; onMore: () => void; moreOpen: boolean }) {
  const tab = (id: ModuleId, label: string, Icon: ComponentType<{ size?: number; strokeWidth?: number }>) => {
    const on = activeId === id
    return (
      <a href={`#${id}`} aria-current={on ? 'page' : undefined} className={cx('press flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold no-underline', on ? 'text-accent' : 'text-muted')}>
        <Icon size={22} strokeWidth={on ? 2.3 : 1.9} aria-hidden />
        {label}
      </a>
    )
  }
  const createOn = activeId ? CREATE_MODULES.includes(activeId) : false
  const moreOn = moreOpen || (!!activeId && !['inicio', 'mentor', 'biblioteca', ...CREATE_MODULES].includes(activeId))
  return (
    <nav aria-label="Menu" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-side/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-[520px] items-end px-2">
        {tab('inicio', 'Início', House)}
        {tab('mentor', 'Mentor', MentorIcon)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onCreate}
            aria-label="Criar"
            className={cx(
              'press -mt-6 flex h-[60px] w-[60px] cursor-pointer flex-col items-center justify-center rounded-[20px] bg-gradient-to-br from-accent to-[#ff5da2] text-accent-ink shadow-[0_10px_30px_-6px_#ff8a3dcc] ring-4 ring-bg',
              createOn && 'ring-accent/40',
            )}
          >
            <Plus size={28} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
        {tab('biblioteca', 'Biblioteca', FolderOpen)}
        <button type="button" onClick={onMore} aria-expanded={moreOpen} className={cx('press flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-semibold', moreOn ? 'text-accent' : 'text-muted')}>
          <LayoutGrid size={22} strokeWidth={moreOn ? 2.3 : 1.9} aria-hidden />
          Mais
        </button>
      </div>
    </nav>
  )
}

// Aviso no canto: tarefas que continuam rodando enquanto a pessoa navega
function JobsTray({ active }: { active: Route }) {
  const list = useJobs().filter((j) => !(j.route === active) && (j.status === 'running' || !j.consumed))
  if (!list.length) return null
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[92px] z-40 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5 lg:bottom-5" aria-live="polite">
      {list.map((j) => {
        const run = j.status === 'running'
        const err = j.status === 'error'
        return (
          <div key={j.id} className="pop pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-line-strong bg-side/95 p-2.5 pl-3 shadow-[0_20px_50px_-15px_#000] backdrop-blur sm:w-[330px]">
            <ModuleIcon id={moduleFor(j.route)?.id ?? 'inicio'} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13.5px] font-semibold text-ink">{run ? `${j.label}…` : err ? 'Não deu certo dessa vez' : j.doneLabel}</span>
              <span className="text-[12px] text-muted">{run ? 'Pode navegar à vontade, continua aqui' : err ? 'Seus créditos foram devolvidos' : 'Toque pra ver'}</span>
            </span>
            {run ? (
              <LoaderCircle size={18} className="mr-1.5 shrink-0 animate-spin text-accent" aria-label="Em andamento" />
            ) : (
              <span className="flex shrink-0 items-center gap-1">
                <a href={`#${j.route}`} className="press rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-bold text-accent-ink no-underline">
                  Ver
                </a>
                <button type="button" onClick={() => dismissJob(j.id)} aria-label="Fechar aviso" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-ink">
                  <X size={15} />
                </button>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function AppShell({ active, children, wide }: { active: Route; children: ReactNode; wide?: boolean }) {
  const [sheet, setSheet] = useState<'criar' | 'mais' | null>(null)
  const { credits } = useStore()
  const activeId = moduleFor(active)?.id
  const close = () => setSheet(null)

  return (
    <div className="relative min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-5 border-r border-line bg-side px-3 pb-4 pt-5 lg:flex">
        <a href="#inicio" className="press px-2 no-underline" aria-label="Plotoon, ir pro início">
          <Logo />
        </a>
        <nav aria-label="Menu principal" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 [scrollbar-width:thin]">
          <NavGroups activeId={activeId} />
        </nav>
        <div className="flex flex-col gap-2">
          <CreditsCard on={active === 'planos'} />
          <AccountLink />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-side/90 px-4 backdrop-blur lg:hidden">
        <a href="#inicio" className="no-underline" aria-label="Plotoon, ir pro início">
          <Logo size="sm" />
        </a>
        <a href="#planos" className="press flex min-h-10 items-center gap-1.5 rounded-full border border-accent-line bg-[#ff8a3d14] pl-2.5 pr-3 text-[14px] font-bold text-ink no-underline" aria-label={`${formatCredits(credits)} créditos. Ver créditos e planos`}>
          <Coins size={16} className="text-accent" aria-hidden />
          {formatCredits(credits)}
        </a>
      </header>

      <main className="min-w-0 flex-1 pb-24 lg:pb-0">
        <div className={cx('mx-auto flex w-full flex-col gap-8 px-4 pb-12 pt-6 sm:px-8 lg:gap-10 lg:px-10 lg:pt-9', wide ? 'max-w-[1400px]' : 'max-w-[1240px]')}>{children}</div>
      </main>

      <JobsTray active={active} />
      <BottomBar activeId={activeId} onCreate={() => setSheet('criar')} onMore={() => setSheet('mais')} moreOpen={sheet === 'mais'} />

      {sheet === 'criar' && (
        <Sheet title="O que vamos criar?" onClose={close}>
          <CreateGrid onPick={close} />
        </Sheet>
      )}
      {sheet === 'mais' && (
        <Sheet title="Menu" onClose={close}>
          <div className="flex flex-col gap-4 pb-2">
            <CreditsCard on={active === 'planos'} onPick={close} />
            <NavGroups activeId={activeId} onPick={close} />
            <div className="border-t border-line pt-2">
              <AccountLink onPick={close} />
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
