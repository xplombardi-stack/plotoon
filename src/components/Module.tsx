// Peças comuns dos módulos: cabeçalho padrão, aviso de "ainda não ativo" e a arte de cada módulo.
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { MODULES, type ModuleId } from '../lib/modules'
import { cx } from './ui'

export function ModuleIcon({ id, size = 'md', className }: { id: ModuleId; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const m = MODULES[id]
  const Icon = m.icon
  const cor = m.color.match(/#[0-9a-fA-F]{6}/)?.[0] ?? '#ff8a3d'
  const box = size === 'lg' ? 'h-14 w-14 rounded-[14px]' : size === 'sm' ? 'h-8 w-8 rounded-[9px]' : 'h-11 w-11 rounded-[12px]'
  const ic = size === 'lg' ? 25 : size === 'sm' ? 16 : 20
  return (
    <span aria-hidden className={cx('relative flex shrink-0 items-center justify-center border', box, className)} style={{ color: cor, background: `${cor}14`, borderColor: `${cor}33` }}>
      <Icon size={ic} strokeWidth={1.9} />
    </span>
  )
}

// Mesmo cabeçalho em todo módulo: ícone, nome e uma frase do que ele faz
export function ModuleHeader({ id, title, phrase, actions }: { id: ModuleId; title?: string; phrase?: string; actions?: ReactNode }) {
  const m = MODULES[id]
  return (
    <header className="rise flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <ModuleIcon id={id} size="lg" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="m-0 font-display text-[26px] font-extrabold leading-tight tracking-[-0.025em] sm:text-[32px]">{title ?? m.name}</h1>
          <p className="m-0 text-[14px] text-muted sm:text-[15px]">{phrase ?? m.phrase}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}

// Aviso discreto de que a função ainda não está ligada
export function SoonNotice({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <p role="note" className={cx('m-0 flex items-start gap-2 rounded-xl border border-[#a78bfa33] bg-[#a78bfa12] px-3.5 py-2.5 text-[13px] text-soft', className)}>
      <Info size={16} className="mt-px shrink-0 text-[#c4b5fd]" aria-hidden />
      <span>{children ?? 'Ainda não está ativo. O que você vê aqui é um exemplo de como vai funcionar.'}</span>
    </p>
  )
}

export function SoonPill({ className }: { className?: string }) {
  return <span className={cx('rounded-full border border-[#a78bfa40] bg-[#a78bfa1a] px-2 py-0.5 text-[11px] font-semibold text-[#c4b5fd]', className)}>Em breve</span>
}
