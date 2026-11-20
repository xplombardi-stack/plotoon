import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { tints, type Tint } from '../data/mock'
import { go, type Route } from '../lib/router'
import logoPlotoon from '../assets/marca/logo-plotoon.webp'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/* ---------- Marca ---------- */

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const h = size === 'lg' ? 'h-9' : size === 'sm' ? 'h-7' : 'h-8'
  return <img src={logoPlotoon} alt="Plotoon" width={645} height={128} className={cx(h, 'block w-auto select-none')} draggable={false} />
}

/* ---------- Botões e links ---------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover font-bold shine press shadow-[0_6px_24px_-8px_#ff8a3d99] hover:shadow-[0_10px_36px_-6px_#ff8a3dcc]',
  secondary: 'border border-line-strong text-ink hover:bg-surface-2 hover:border-accent-line font-semibold press',
  ghost: 'text-soft hover:bg-surface-2 hover:text-ink font-semibold press',
  soft: 'bg-surface-2 border border-line-strong text-ink hover:border-subtle font-semibold press',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'min-h-11 px-4 text-[14px] rounded-[10px] gap-2',
  lg: 'min-h-13 px-6 text-[15px] rounded-xl gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  )
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: {
  to: Route
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  'aria-label'?: string
}) {
  return (
    <a
      href={`#${to}`}
      aria-label={rest['aria-label']}
      className={cx('inline-flex items-center justify-center no-underline transition-colors', variants[variant], sizes[size], className)}
    >
      {children}
    </a>
  )
}

export function TextLink({ to, children, className }: { to: Route; children: ReactNode; className?: string }) {
  return (
    <a href={`#${to}`} className={cx('font-semibold text-accent-text no-underline hover:text-accent', className)}>
      {children}
    </a>
  )
}

/* ---------- Imagens ---------- */

// Espaço de imagem. Quando tiver imagem de verdade, passe src.
export function Shot({
  tint = 'gray',
  src,
  label,
  className,
  style,
  children,
}: {
  tint?: Tint
  src?: string
  label?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx('relative overflow-hidden', className)}
      style={{ background: src ? '#13161d' : tints[tint], ...style }}
    >
      {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {children}
    </div>
  )
}

/* ---------- Selos ---------- */

export function Badge({ tone = 'neutral', children, className }: { tone?: 'accent' | 'sky' | 'neutral' | 'violet'; children: ReactNode; className?: string }) {
  const tones = {
    accent: 'bg-accent text-accent-ink',
    sky: 'bg-sky-soft text-sky-text',
    neutral: 'bg-line text-soft',
    violet: 'bg-violet-soft text-violet-text',
  }
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', tones[tone], className)}>{children}</span>
}

export function CheckDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sky-text', className)}>
      <Check size={13} strokeWidth={3} />
    </span>
  )
}

/* ---------- Estrutura ---------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display text-[30px] font-extrabold tracking-[-0.025em] sm:text-[34px]">{title}</h1>
        {subtitle && <p className="m-0 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 font-display text-[20px] font-bold tracking-[-0.01em] sm:text-[22px]">{children}</h2>
      {action}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-line bg-surface', className)}>{children}</div>
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>
}

/* ---------- Aviso rápido (toast) ---------- */

type ToastCtx = { show: (msg: string) => void }
const ToastContext = createContext<ToastCtx>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(null), 2400)
  }, [])
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[96px] z-50 lg:bottom-6 flex justify-center px-4">
        {msg && (
          <div className="rise pointer-events-auto flex items-center gap-2.5 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[14px] font-medium shadow-2xl shadow-black/50">
            <CheckDot />
            {msg}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export { go }
