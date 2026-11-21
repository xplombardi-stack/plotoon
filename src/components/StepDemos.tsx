// Mini demonstrações animadas dos passos (só ilustração, não é a ferramenta de verdade)
import { useEffect, useRef, useState } from 'react'
import { Check, CornerDownLeft, Download, Film, LoaderCircle, Zap } from 'lucide-react'
import { LoopVideo } from './LoopVideo'
import { cx } from './ui'
import { clips } from './Showcase'
import quadros from '../assets/historias/quadros-ligacao.webp'
import ligacaoMp4 from '../assets/historias/ligacao-festa.mp4'
import ligacaoPoster from '../assets/historias/ligacao-festa.webp'

// relógio que roda em loop só quando o bloco está na tela
export function useLoop(totalMs: number, still: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(still) // começa num quadro completo (é o que fica pra quem pede menos movimento)
  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    let start = 0
    const tick = () => setT((performance.now() - start) % totalMs)
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(timer)
      if (e.isIntersecting) {
        start = performance.now()
        setT(0)
        timer = window.setInterval(tick, 50)
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearInterval(timer)
    }
  }, [totalMs])
  return { ref, t }
}

export const typed = (text: string, t: number, start: number, cps: number) => text.slice(0, Math.max(0, Math.floor(((t - start) / 1000) * cps)))
export const on = (t: number, a: number) => t >= a

/* ---------- Passo 2: escreve a ideia, Enter, prompt e história ---------- */

const IDEIA = 'Motoboy que virou dono de frota'
const PROMPT = 'Animação 3D estilo cinema, vertical 9:16, 10s. FELIPE (mesmo rosto e roupa) pilota na chuva à noite, câmera baixa…'
const PARTES = [
  { n: 1, beat: 'Gancho', fala: 'Todo mundo duvidou de mim.' },
  { n: 2, beat: 'Virada', fala: 'Cada entrega virou um tijolo.' },
  { n: 3, beat: 'Final', fala: 'Hoje a frota é minha.' },
]

export function StepIdea({ className }: { className?: string }) {
  const TOTAL = 12500
  const { ref, t } = useLoop(TOTAL, 11000)
  const ideia = typed(IDEIA, t, 400, 16)
  const enter = on(t, 2600)
  const pressing = t > 2600 && t < 2900
  const prompt = typed(PROMPT, t, 3200, 48)
  const fade = t > 11800 ? 1 - (t - 11800) / 700 : 1

  return (
    <div ref={ref} aria-hidden className={cx('relative overflow-hidden bg-side', className)}>
      <LoopVideo src={clips.roteiro.video} poster={clips.roteiro.poster} className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 to-bg/80" />
      <div className="relative flex h-full flex-col gap-2 p-3.5 transition-opacity duration-300 sm:p-4" style={{ opacity: fade }}>
        {/* campo da ideia */}
        <div className={cx('flex items-center gap-2 rounded-xl border bg-bg/85 px-3 py-2 backdrop-blur transition-colors', enter ? 'border-accent shadow-[0_0_0_3px_#ff8a3d33]' : 'border-line-strong')}>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
            {ideia || <span className="text-subtle">Conte a ideia da sua história</span>}
            {!enter && <span className="ml-px inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse bg-accent" />}
          </span>
          <span className={cx('flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] font-bold transition-all', pressing ? 'scale-90 border-accent bg-accent text-accent-ink' : enter ? 'border-accent/60 text-accent-text' : 'border-line-strong text-muted')}>
            <CornerDownLeft size={11} /> Enter
          </span>
        </div>

        {/* prompt se criando */}
        {on(t, 3000) && (
          <div className="pop rounded-xl border border-line bg-surface/90 px-3 py-2 backdrop-blur">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-sky-text">
              <Zap size={11} /> Prompt
            </div>
            <p className="m-0 line-clamp-2 text-[11px] leading-snug text-soft">
              {prompt}
              {prompt.length < PROMPT.length && <span className="ml-px inline-block h-3 w-[2px] translate-y-[2px] bg-sky" />}
            </p>
          </div>
        )}

        {/* história em partes */}
        <div className="flex flex-col gap-1.5">
          {PARTES.map((p, i) => {
            const start = 6200 + i * 1500
            if (!on(t, start)) return null
            const fala = typed(p.fala, t, start + 250, 30)
            const done = fala.length === p.fala.length
            return (
              <div key={p.n} className="rise flex items-center gap-2 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 backdrop-blur">
                <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors', done ? 'bg-sky text-[#06121f]' : 'bg-accent text-accent-ink')}>
                  {done ? <Check size={11} strokeWidth={3} /> : p.n}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-ink">Parte {p.n}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{fala}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ---------- Passo 3: vídeo carregando quadro a quadro num editor ---------- */

export function StepEditor({ className }: { className?: string }) {
  const TOTAL = 11000
  const { ref, t } = useLoop(TOTAL, 9000)
  const FRAMES = 12
  const loaded = Math.min(FRAMES, Math.max(0, Math.floor((t - 300) / 450)))
  const pct = Math.round((loaded / FRAMES) * 100)
  const allDone = loaded === FRAMES
  const exportOn = on(t, 6400)
  const exported = on(t, 7600)
  const playhead = allDone ? ((t - 5700) % 2600) / 2600 : loaded / FRAMES
  const fade = t > 10300 ? 1 - (t - 10300) / 700 : 1
  const parts = [
    { n: 1, st: 'ok' as const },
    { n: 2, st: allDone ? ('ok' as const) : ('gerando' as const) },
    { n: 3, st: allDone ? ('ok' as const) : ('fila' as const) },
  ]

  return (
    <div ref={ref} aria-hidden className={cx('relative overflow-hidden bg-[#0b0d12]', className)}>
      <div className="flex h-full flex-col gap-2 p-3 transition-opacity duration-300" style={{ opacity: fade }}>
        <div className="flex min-h-0 flex-1 gap-2.5">
          {/* prévia */}
          <div className="relative aspect-[9/16] h-full shrink-0 overflow-hidden rounded-lg border border-line-strong bg-black">
            <LoopVideo src={ligacaoMp4} poster={ligacaoPoster} className="absolute inset-0 h-full w-full object-cover" />
            {!allDone && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-4">
                <div className="h-1 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>
          {/* partes e exportar */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              <Film size={11} /> Partes
            </span>
            {parts.map((p) => (
              <div key={p.n} className="flex items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5">
                <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full', p.st === 'ok' ? 'bg-sky text-[#06121f]' : p.st === 'gerando' ? 'text-accent' : 'border border-line-strong')}>
                  {p.st === 'ok' ? <Check size={10} strokeWidth={3} /> : p.st === 'gerando' ? <LoaderCircle size={13} className="animate-spin" /> : null}
                </span>
                <span className="text-[11px] font-semibold text-ink">Parte {p.n}</span>
                <span className="ml-auto text-[10px] text-muted">{p.st === 'ok' ? 'pronta' : p.st === 'gerando' ? `${pct}%` : 'na fila'}</span>
              </div>
            ))}
            <div className="mt-auto">
              <div className={cx('flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-bold transition-all', exported ? 'bg-sky text-[#06121f]' : exportOn ? 'scale-[1.03] bg-accent text-accent-ink shadow-[0_0_18px_#ff8a3d88]' : 'bg-surface-2 text-subtle')}>
                {exported ? <Check size={12} strokeWidth={3} /> : <Download size={12} />}
                {exported ? 'Vídeo pronto' : 'Exportar 9:16'}
              </div>
            </div>
          </div>
        </div>
        {/* linha do tempo quadro a quadro */}
        <div className="relative rounded-md border border-line bg-surface p-1">
          <div className="grid grid-cols-12 gap-[2px]">
            {Array.from({ length: FRAMES }, (_, i) => (
              <span
                key={i}
                className={cx('block aspect-[9/16] rounded-[3px] bg-surface-2', i < loaded ? 'pop' : i === loaded && 'animate-pulse')}
                style={i < loaded ? { backgroundImage: `url(${quadros})`, backgroundSize: `${FRAMES * 100}% 100%`, backgroundPosition: `${(i / (FRAMES - 1)) * 100}% 0` } : undefined}
              />
            ))}
          </div>
          <span className="pointer-events-none absolute inset-y-0 w-[2px] bg-accent shadow-[0_0_8px_#ff8a3d]" style={{ left: `calc(4px + ${playhead} * (100% - 8px))` }} />
        </div>
      </div>
    </div>
  )
}
