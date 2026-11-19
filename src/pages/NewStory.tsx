import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, Clapperboard, Coins, Minus, Plus, RefreshCw, Wand } from 'lucide-react'
import { ideas } from '../data/mock'
import { AppShell } from '../components/AppShell'
import { Scene, Toon } from '../components/art'
import { ClipArt, clips } from '../components/Showcase'
import { Badge, Button, LinkButton, cx, go, useToast } from '../components/ui'
import { buildPrompt, tones, writeScript, type Part, type Tone } from '../lib/director'
import { pedirRoteiro } from '../lib/diretorApi'
import { MAX_PARTS, SECONDS_PER_PART, formatCredits, storyCost } from '../lib/pricing'
import { styleList, useStore } from '../lib/store'

const steps = ['Ideia', 'Elenco', 'Partes', 'Roteiro']
const DRAFT = 'plotoon:rascunho'

type Draft = { step: number; idea: string; tone: Tone; picked: string[]; parts: number }

function readDraft(): Partial<Draft> {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? '{}') as Partial<Draft>
    const idea = sessionStorage.getItem('plotoon:ideia')
    sessionStorage.removeItem('plotoon:ideia')
    return idea ? { ...d, idea, step: 0 } : d
  } catch {
    return {}
  }
}

function Stepper({ step, onPick }: { step: number; onPick: (i: number) => void }) {
  return (
    <ol className="m-0 flex list-none items-center gap-2 p-0 sm:gap-3">
      {steps.map((label, i) => {
        const done = i < step
        const now = i === step
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={i > step}
              onClick={() => onPick(i)}
              aria-current={now ? 'step' : undefined}
              className={cx('flex cursor-pointer items-center gap-2 disabled:cursor-default', now ? 'text-ink' : done ? 'text-soft' : 'text-subtle')}
            >
              <span
                className={cx(
                  'flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] font-bold transition-all duration-300',
                  now && 'bg-accent text-accent-ink shadow-[0_0_20px_#ff8a3d88] scale-110',
                  done && 'bg-sky-soft text-sky-text',
                  !now && !done && 'border border-line-strong',
                )}
              >
                {done ? <Check size={16} strokeWidth={3} /> : i + 1}
              </span>
              <span className="hidden text-[15px] font-semibold sm:inline">{label}</span>
            </button>
            {i < steps.length - 1 && <span aria-hidden className={cx('h-0.5 w-6 rounded-full sm:w-12', i < step ? 'bg-sky' : 'bg-line-strong')} />}
          </li>
        )
      })}
    </ol>
  )
}

function Panel({ title, hint, children, art }: { title: string; hint?: string; children: ReactNode; art?: ReactNode }) {
  return (
    <section className="rise grid gap-6 overflow-hidden rounded-[22px] border border-line bg-surface p-5 sm:p-7 lg:grid-cols-[1.35fr_1fr]">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.02em] sm:text-[30px]">{title}</h2>
          {hint && <p className="m-0 text-[15px] text-muted">{hint}</p>}
        </div>
        {children}
      </div>
      {art && <div className="hidden items-center justify-center lg:flex">{art}</div>}
    </section>
  )
}

const writingSteps = ['Lendo sua ideia', 'Dividindo em partes', 'Escrevendo as falas', 'Montando o prompt de cada parte']

export function NewStory() {
  const toast = useToast()
  const { characters, credits, createStory, live } = useStore()
  const saved = useMemo(readDraft, [])

  const [step, setStep] = useState(saved.step ?? 0)
  const [idea, setIdea] = useState(saved.idea ?? '')
  const [tone, setTone] = useState<Tone>(saved.tone ?? 'motivacional')
  const [picked, setPicked] = useState<string[]>((saved.picked ?? []).filter((id) => characters.some((c) => c.id === id)))
  const [count, setCount] = useState(saved.parts ?? 3)

  const [writing, setWriting] = useState(0) // 0 = parado, 1..n = escrevendo
  const [title, setTitle] = useState('')
  const [parts, setParts] = useState<Part[]>([])
  const [openPrompt, setOpenPrompt] = useState<number | null>(null)
  const [result, setResult] = useState<{ title: string; parts: Part[]; modelo: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const ask = useRef(0)

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify({ step: Math.min(step, 2), idea, tone, picked, parts: count }))
    } catch {
      /* sem armazenamento */
    }
  }, [step, idea, tone, picked, count])

  const cast = useMemo(() => picked.map((id) => characters.find((c) => c.id === id)).filter(Boolean) as typeof characters, [picked, characters])
  const styleName = styleList.find((s) => s.id === cast[0]?.style)?.name ?? 'Cinema 3D'
  const cost = storyCost(count)
  const enough = credits >= cost

  function write() {
    const id = ++ask.current
    setParts([])
    setResult(null)
    setWriting(1)
    const modelo = () => ({ ...writeScript({ idea, tone, names: cast.map((c) => c.name), styleName, parts: count }), modelo: true })
    if (!live) return setResult(modelo())
    pedirRoteiro({
      ideia: idea,
      clima: tone,
      partes: count,
      personagens: cast.map((c) => ({ nome: c.name, estilo: styleList.find((s) => s.id === c.style)?.name ?? 'Cinema 3D' })),
    }).then((r) => {
      if (id === ask.current) setResult(r ? { ...r, modelo: false } : modelo())
    })
  }

  // a animação anda até o último passo e espera o Diretor responder
  useEffect(() => {
    if (!writing) return
    if (writing >= writingSteps.length) {
      if (!result) return
      setTitle(result.title)
      setParts(result.parts)
      setWriting(0)
      if (result.modelo && live) toast.show('O Diretor não respondeu agora. Usei um roteiro modelo, pode editar.')
      return
    }
    const t = window.setTimeout(() => setWriting((w) => w + 1), 650)
    return () => window.clearTimeout(t)
  }, [writing, result]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 3 && parts.length !== count && !writing) write()
  }, [step])

  function editFala(num: number, fala: string) {
    setParts((ps) =>
      ps.map((p) => (p.num === num ? { ...p, fala, prompt: buildPrompt({ styleName, names: cast.map((c) => c.name), num, beat: p.beat, scene: p.scene, fala }) } : p)),
    )
  }

  async function generate() {
    if (busy) return
    setBusy(true)
    const id = await createStory({ title: title.trim() || 'Nova historinha', idea, tone, characterIds: picked, parts })
    setBusy(false)
    if (!id) return toast.show(credits < cost ? 'Créditos insuficientes' : 'Não deu pra criar agora. Tenta de novo.')
    try {
      sessionStorage.removeItem(DRAFT)
    } catch {
      /* sem armazenamento */
    }
    toast.show(`Gerando ${parts.length} partes · ${cost} créditos`)
    go('editor')
  }

  const canNext = [idea.trim().length > 5, picked.length > 0, enough, parts.length > 0 && !writing][step]
  const hintNext = ['Conte a ideia em uma frase.', 'Escolha pelo menos um personagem.', 'Você não tem créditos suficientes.', ''][step]

  return (
    <AppShell active="nova-historinha">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1 className="m-0 font-display text-[30px] font-extrabold tracking-[-0.025em] sm:text-[34px]">Nova historinha</h1>
        <Stepper step={step} onPick={setStep} />
      </div>

      {step === 0 && (
        <Panel title="Qual é a história?" hint="Conta em uma frase. O Diretor escreve o resto." art={<ClipArt clip={clips.roteiro} pos="50% 25%" className="aspect-[4/3] w-full max-w-[380px] rounded-[18px]" />}>
          <label htmlFor="ideia-txt" className="sr-only">Sua ideia</label>
          <textarea
            id="ideia-txt"
            rows={4}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Ex.: um motoboy que todo mundo duvidava e hoje é dono de uma frota"
            className="resize-none rounded-[16px] border border-line-strong bg-bg p-4 text-[17px] leading-relaxed text-ink outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_4px_#ff8a3d22]"
          />
          <div className="flex flex-col gap-2.5">
            <span className="text-[14px] font-medium text-muted">Sem ideia? Toca numa:</span>
            <div className="flex flex-wrap gap-2">
              {ideas.map((i) => (
                <button key={i} type="button" onClick={() => setIdea(i)} className="press min-h-10 cursor-pointer rounded-full border border-line-strong px-3.5 text-[14px] text-soft hover:border-accent-line hover:text-ink">
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-[14px] font-medium text-muted">Clima da história</span>
            <div role="radiogroup" aria-label="Clima da história" className="flex flex-wrap gap-2">
              {tones.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={tone === t.id}
                  onClick={() => setTone(t.id)}
                  className={cx(
                    'press min-h-11 cursor-pointer rounded-xl border px-4 text-[15px] font-semibold transition-colors',
                    tone === t.id ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-strong text-soft hover:text-ink',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {step === 1 && (
        <Panel title="Quem aparece?" hint="O primeiro que você escolher é o protagonista.">
          {characters.length === 0 ? (
            <div className="flex flex-col items-start gap-5 rounded-[18px] border border-dashed border-[#3a4152] p-5 sm:flex-row sm:items-center">
              <ClipArt clip={clips.personagem} pos="50% 30%" className="aspect-[4/3] w-full max-w-[220px] rounded-2xl" />
              <div className="flex flex-col gap-3">
                <h3 className="m-0 text-[20px] font-bold">Você ainda não tem personagens</h3>
                <p className="m-0 text-[15px] text-muted">Cria o seu boneco a partir de uma foto. Depois você volta aqui e continua de onde parou.</p>
                <a
                  href="#novo-personagem"
                  onClick={() => {
                    try {
                      sessionStorage.setItem('plotoon:voltar', 'nova-historinha')
                    } catch {
                      /* sem armazenamento */
                    }
                  }}
                  className="shine press inline-flex min-h-12 items-center gap-2 self-start rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-ink no-underline"
                >
                  <Plus size={18} /> Criar personagem
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {characters.map((c) => {
                const pos = picked.indexOf(c.id)
                const on = pos >= 0
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                    className="press flex cursor-pointer flex-col items-center gap-2 text-ink"
                  >
                    <span className={cx('relative aspect-square w-full overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-[#1e3550] to-[#0f1825] transition-all', on ? 'border-accent glow-accent' : 'border-transparent')}>
                      {c.image ? (
                        <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                      ) : (
                        <Toon look={c.look} className="absolute inset-x-0 bottom-0 w-full" />
                      )}
                      {on && (
                        <span className="pop absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-ink">
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] font-bold">{c.name}</span>
                    {pos === 0 && <Badge tone="accent" className="!py-0.5 !text-[11px]">Protagonista</Badge>}
                  </button>
                )
              })}
              <a
                href="#novo-personagem"
                onClick={() => {
                  try {
                    sessionStorage.setItem('plotoon:voltar', 'nova-historinha')
                  } catch {
                    /* sem armazenamento */
                  }
                }}
                className="press flex flex-col items-center gap-2 text-muted no-underline"
              >
                <span className="flex aspect-square w-full items-center justify-center rounded-2xl border-[1.5px] border-dashed border-[#3a4152] hover:border-accent-line">
                  <Plus size={24} className="text-accent" aria-hidden />
                </span>
                <span className="text-[13px] font-semibold">Novo</span>
              </a>
            </div>
          )}
        </Panel>
      )}

      {step === 2 && (
        <Panel title="Em quantas partes?" hint={`Cada parte é um pedaço do vídeo de até ${SECONDS_PER_PART} segundos.`}>
          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Menos uma parte"
              disabled={count <= 1}
              onClick={() => setCount((c) => c - 1)}
              className="press flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-line-strong text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus size={22} />
            </button>
            <span className="flex flex-col items-center">
              <span key={count} className="pop font-display text-[56px] font-extrabold leading-none text-glow">{count}</span>
              <span className="text-[14px] text-muted">{count === 1 ? 'parte' : 'partes'}</span>
            </span>
            <button
              type="button"
              aria-label="Mais uma parte"
              disabled={count >= MAX_PARTS}
              onClick={() => setCount((c) => c + 1)}
              className="press flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl border border-line-strong text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={22} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="pop flex aspect-[9/14] flex-col justify-between rounded-xl border border-line-strong bg-gradient-to-b from-[#2a1d14] to-[#140e0a] p-2" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="text-[12px] font-bold text-accent-text">Parte {i + 1}</span>
                <span className="text-[11px] text-muted">{SECONDS_PER_PART}s</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-2xl border border-line bg-bg p-4">
              <span className="text-[13px] text-muted">Duração</span>
              <span className="font-display text-[24px] font-bold">até {count * SECONDS_PER_PART}s</span>
            </div>
            <div className="neon-border flex flex-col gap-1 rounded-2xl bg-bg p-4">
              <span className="text-[13px] text-muted">Vai gastar</span>
              <span className="flex items-center gap-2 font-display text-[24px] font-bold text-accent-text">
                <Coins size={20} aria-hidden /> {formatCredits(cost)}
              </span>
            </div>
            <div className={cx('flex flex-col gap-1 rounded-2xl border p-4', enough ? 'border-line bg-bg' : 'border-[#5a2420] bg-[#2a1210]')}>
              <span className="text-[13px] text-muted">Você tem</span>
              <span className="font-display text-[24px] font-bold">{formatCredits(credits)}</span>
              {!enough && (
                <a href="#planos" className="text-[13px] font-semibold text-accent-text no-underline">Comprar créditos</a>
              )}
            </div>
          </div>
        </Panel>
      )}

      {step === 3 && (
        <section className="rise flex flex-col gap-5">
          {writing ? (
            <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[22px] border border-line bg-surface px-6 py-14 text-center">
              <div className="aurora"><span /></div>
              <span className="pulse relative flex h-20 w-20 items-center justify-center rounded-[22px] bg-accent text-accent-ink">
                <Clapperboard size={34} aria-hidden />
              </span>
              <h2 className="relative m-0 font-display text-[26px] font-extrabold">O Diretor está escrevendo…</h2>
              <ul className="relative m-0 flex list-none flex-col gap-3 p-0 text-left">
                {writingSteps.map((s, i) => {
                  const done = i + 1 < writing
                  const now = i + 1 === writing
                  return (
                    <li key={s} className={cx('flex items-center gap-3 text-[16px] transition-colors', done || now ? 'text-ink' : 'text-subtle')}>
                      <span className={cx('flex h-6 w-6 items-center justify-center rounded-full', done ? 'bg-sky-soft text-sky-text' : now ? 'animate-spin border-2 border-accent border-t-transparent' : 'border border-line-strong')}>
                        {done && <Check size={13} strokeWidth={3} />}
                      </span>
                      {s}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-[22px] border border-line bg-surface p-5 sm:p-6">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label htmlFor="titulo" className="text-[14px] font-medium text-muted">Título</label>
                  <input
                    id="titulo"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="min-h-12 rounded-[12px] border border-line-strong bg-bg px-3.5 font-display text-[20px] font-bold text-ink outline-none focus:border-accent"
                  />
                </div>
                <Button variant="secondary" onClick={write}>
                  <RefreshCw size={16} /> Reescrever
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {parts.map((p, i) => (
                  <article key={p.num} className="pop lift flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Scene backdrop={p.backdrop} look={cast[0]?.look} crop="face" className="absolute inset-0 h-full w-full" />
                      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[13px] font-bold backdrop-blur">Parte {p.num} · {p.beat}</span>
                    </div>
                    <div className="flex flex-col gap-3 p-4">
                      <p className="m-0 text-[14px] leading-relaxed text-muted">{p.scene}</p>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor={`fala-${p.num}`} className="text-[13px] font-medium text-muted">Fala</label>
                        <input
                          id={`fala-${p.num}`}
                          value={p.fala}
                          onChange={(e) => editFala(p.num, e.target.value)}
                          className="min-h-11 rounded-[10px] border border-line-strong bg-bg px-3 text-[15px] text-ink outline-none focus:border-accent"
                        />
                      </div>
                      <button
                        type="button"
                        aria-expanded={openPrompt === p.num}
                        onClick={() => setOpenPrompt(openPrompt === p.num ? null : p.num)}
                        className="flex min-h-10 cursor-pointer items-center justify-between rounded-[10px] px-1 text-[14px] font-semibold text-accent-text"
                      >
                        <span className="flex items-center gap-2">
                          <Wand size={16} aria-hidden /> Prompt escrito pelo Diretor
                        </span>
                        <ChevronDown size={18} className={cx('transition-transform', openPrompt === p.num && 'rotate-180')} aria-hidden />
                      </button>
                      {openPrompt === p.num && (
                        <textarea
                          aria-label={`Prompt da parte ${p.num}`}
                          rows={6}
                          value={p.prompt}
                          onChange={(e) => setParts((ps) => ps.map((x) => (x.num === p.num ? { ...x, prompt: e.target.value } : x)))}
                          className="rise resize-none rounded-[10px] border border-line-strong bg-bg p-3 text-[13px] leading-relaxed text-soft outline-none focus:border-accent"
                        />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Barra de baixo: custo e botões */}
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-line-strong bg-surface-2/90 p-3 pl-5 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="flex items-center gap-4 text-[14px]">
          <span className="flex items-center gap-2 font-semibold">
            <Coins size={18} className="text-accent" aria-hidden />
            {count} {count === 1 ? 'parte' : 'partes'} · {formatCredits(cost)} créditos
          </span>
          <span className="hidden text-muted sm:inline">Você tem {formatCredits(credits)}</span>
        </div>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={18} /> Voltar
            </Button>
          )}
          {step < 3 ? (
            <Button size="lg" disabled={!canNext} title={!canNext ? hintNext : undefined} onClick={() => setStep((s) => s + 1)}>
              {step === 2 ? (
                <>
                  <Wand size={18} /> Escrever com o Diretor
                </>
              ) : (
                <>
                  Continuar <ArrowRight size={18} />
                </>
              )}
            </Button>
          ) : (
            <Button size="lg" disabled={!canNext || !enough || busy} onClick={generate} className={canNext ? 'pulse' : undefined}>
              Gerar vídeo · {formatCredits(cost)} créditos
            </Button>
          )}
        </div>
      </div>
      {!canNext && hintNext && <p className="-mt-6 m-0 text-center text-[13px] text-subtle">{hintNext}</p>}
      {step === 3 && !enough && (
        <div className="text-center">
          <LinkButton to="planos" variant="secondary">Comprar créditos</LinkButton>
        </div>
      )}
    </AppShell>
  )
}
