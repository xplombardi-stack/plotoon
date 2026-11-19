import type { ReactNode } from 'react'
import { useState } from 'react'
import { BookOpen, CirclePlus, Coins, Film, House, Menu, Users, X } from 'lucide-react'
import type { Route } from '../lib/router'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { formatCredits } from '../lib/pricing'
import { Logo, cx } from './ui'

const nav: Array<{ to: Route; label: string; icon: typeof House; match?: Route[] }> = [
  { to: 'inicio', label: 'Início', icon: House },
  { to: 'nova-historinha', label: 'Criar historinha', icon: CirclePlus },
  { to: 'videos', label: 'Meus vídeos', icon: Film, match: ['editor'] },
  { to: 'elenco', label: 'Elenco', icon: Users, match: ['novo-personagem'] },
  { to: 'aulas', label: 'Aulas', icon: BookOpen },
]

export function useDisplayName() {
  const { profile } = useAuth()
  const { name } = useStore()
  return (name || profile?.name || '').trim()
}

function NavLinks({ active, onPick }: { active: Route; onPick?: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      {nav.map((item) => {
        const on = item.to === active || item.match?.includes(active)
        const Icon = item.icon
        return (
          <a
            key={item.to}
            href={`#${item.to}`}
            onClick={onPick}
            aria-current={on ? 'page' : undefined}
            className={cx(
              'group relative flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] no-underline transition-all duration-300',
              on
                ? 'bg-gradient-to-r from-[#ff8a3d26] to-transparent font-semibold text-ink shadow-[inset_0_0_0_1px_#ff8a3d40]'
                : 'font-medium text-muted hover:translate-x-1 hover:bg-surface hover:text-ink',
            )}
          >
            {on && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-accent shadow-[0_0_12px_#ff8a3d]" />}
            <Icon size={20} strokeWidth={1.9} className={cx('transition-transform duration-300 group-hover:scale-110', on && 'text-accent')} aria-hidden />
            {item.label}
          </a>
        )
      })}
    </div>
  )
}

function SideFooter({ onPick }: { onPick?: () => void }) {
  const { credits } = useStore()
  const name = useDisplayName()
  return (
    <div className="mt-auto flex flex-col gap-2.5">
      <a href="#planos" onClick={onPick} className="neon-border flex flex-col gap-2.5 rounded-2xl bg-surface p-3.5 no-underline">
        <span className="flex items-center gap-2">
          <Coins size={18} className="text-accent" aria-hidden />
          <span className="font-display text-[22px] font-bold text-ink">{formatCredits(credits)}</span>
          <span className="text-[13px] text-muted">créditos</span>
        </span>
        <span className="text-[13px] font-semibold text-accent-text">Comprar créditos</span>
      </a>
      <a href="#conta" onClick={onPick} className="flex min-h-12 items-center gap-2.5 rounded-[12px] px-2 text-ink no-underline hover:bg-surface">
        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#ff5da2] text-[13px] font-bold text-accent-ink">
          {(name || 'V').charAt(0).toUpperCase()}
        </span>
        <span className="text-[14px] font-semibold">{name || 'Minha conta'}</span>
      </a>
    </div>
  )
}

export function AppShell({ active, children }: { active: Route; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative min-h-screen lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col gap-7 border-r border-line bg-side px-3 pb-4 pt-5 lg:flex">
        <a href="#inicio" className="press px-2 no-underline" aria-label="Plotoon, ir pro início">
          <Logo />
        </a>
        <nav aria-label="Menu principal">
          <NavLinks active={active} />
        </nav>
        <SideFooter />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-side/90 px-4 backdrop-blur lg:hidden">
        <a href="#inicio" className="no-underline" aria-label="Plotoon, ir pro início">
          <Logo size="sm" />
        </a>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="press flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] text-ink hover:bg-surface"
        >
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 cursor-default bg-black/60" onClick={() => setOpen(false)} />
          <div className="rise absolute inset-y-0 left-0 flex w-[280px] flex-col gap-6 border-r border-line bg-side px-3 pb-4 pt-4">
            <div className="flex items-center justify-between px-2">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] text-ink hover:bg-surface"
              >
                <X size={22} />
              </button>
            </div>
            <nav aria-label="Menu principal">
              <NavLinks active={active} onPick={() => setOpen(false)} />
            </nav>
            <SideFooter onPick={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 px-5 pb-16 pt-7 sm:px-8 lg:px-10 lg:pt-9">{children}</div>
      </main>
    </div>
  )
}
