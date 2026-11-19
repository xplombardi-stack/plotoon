import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ChevronLeft, Clapperboard, Coins, Download, LoaderCircle, Music, Pencil, Play, Plus, RefreshCw, Wand } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Scene } from '../components/art'
import { ClipArt, clips } from '../components/Showcase'
import { Button, LinkButton, cx, useToast } from '../components/ui'
import type { Part } from '../lib/director'
import { CREDITS_REDO_PART, SECONDS_PER_PART } from '../lib/pricing'
import { styleList, useStore } from '../lib/store'
import { pedirAjuste } from '../lib/diretorApi'

type Msg = { id: number; from: 'user' | 'director'; text: string }

function StatusDot({ status }: { status: Part['status'] }) {
  if (status === 'pronta')
    return (
      <span className="pop flex h-6 w-6 items-center justify-center rounded-full bg-sky-soft text-sky-text" aria-label="Pronta">
        <Check size={13} strokeWidth={3} />
      </span>
    )
  if (status === 'gerando')
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent" aria-label="Gerando">
        <LoaderCircle size={14} className="animate-spin" />
      </span>
    )
  return <span className="flex h-6 items-center rounded-full bg-black/55 px-2 text-[11px] font-semibold text-soft">rascunho</span>
}

function EmptyEditor() {
  return (
    <AppShell active="editor">
      <div className="rise flex flex-col items-center gap-5 rounded-[22px] border border-dashed border-[#3a4152] px-6 py-14 text-center">
        <ClipArt clip={clips.roteiro} pos="50% 25%" className="aspect-[4/3] w-full max-w-[320px] rounded-2xl" />
        <h1 className="m-0 font-display text-[26px] font-extrabold">Nenhuma historinha aberta</h1>
        <p className="m-0 max-w-[420px] text-[15px] text-muted">Crie a sua primeira e ela aparece aqui pra você ajustar e exportar.</p>
        <LinkButton to="nova-historinha" size="lg">
          <Plus size={18} /> Criar historinha
        </LinkButton>
      </div>
    </AppShell>
  )
}

export function Editor() {
  const toast = useToast()
  const { stories, characters, openStoryId, updatePart, redoPart, credits, live } = useStore()
  const story = stories.find((s) => s.id === openStoryId) ?? stories[0]

  const [sel, setSel] = useState(1)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [thinking, setThinking] = useState(false)
  const [redoing, setRedoing] = useState(false)

  useEffect(() => {
    setSel(1)
    setMsgs(story ? [{ id: 1, from: 'director', text: `Pronto! Escrevi “${story.title}” em ${story.parts.length} partes. Me fala se quer mudar alguma coisa.` }] : [])
  }, [story?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!story) return <EmptyEditor />

  const parts = story.parts
  const cur = parts.find((p) => p.num === sel) ?? parts[0]
  const ready = parts.filter((p) => p.status === 'pronta').length
  const allReady = ready === parts.length
  const look = characters.find((c) => c.id === story.characterIds[0])?.look
  const total = parts.length * SECONDS_PER_PART
  const start = (cur.num - 1) * SECONDS_PER_PART

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || thinking) return
    setInput('')
    setMsgs((m) => [...m, { id: Date.now(), from: 'user', text }])
    const num = cur.num
    const reply = (t: string) => setMsgs((m) => [...m, { id: Date.now() + 1, from: 'director', text: t }])
    if (!live) {
      window.setTimeout(() => reply(`Feito. Ajustei a parte ${num}. Quer gerar ela de novo? Custa ${CREDITS_REDO_PART} créditos.`), 900)
      return
    }
    setThinking(true)
    const out = await pedirAjuste({
      pedido: text,
      titulo: story.title,
      ideia: story.idea,
      personagens: characters.filter((c) => story.characterIds.includes(c.id)).map((c) => ({ nome: c.name, estilo: styleList.find((s) => s.id === c.style)?.name ?? 'Cinema 3D' })),
      parte: cur,
    })
    setThinking(false)
    if (!out) return reply('Não consegui falar com o Diretor agora. Tenta de novo em instantes.')
    updatePart(story.id, num, { scene: out.scene, fala: out.fala, prompt: out.prompt })
    reply(`${out.resposta} Pra ver na tela, gere a parte ${num} de novo (${CREDITS_REDO_PART} créditos).`)
  }

  function saveFala() {
    updatePart(story.id, sel, { fala: draft })
    setEditing(false)
    toast.show('Fala atualizada')
  }

  async function redo() {
    if (redoing) return
    setRedoing(true)
    const ok = await redoPart(story.id, sel)
    setRedoing(false)
    if (!ok) return toast.show('Créditos insuficientes')
    toast.show(`Gerando a parte ${sel} de novo · ${CREDITS_REDO_PART} créditos`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-side/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <a href="#videos" aria-label="Voltar pros meus vídeos" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong text-ink hover:border-accent">
            <ChevronLeft size={20} />
          </a>
          <div className="flex min-w-0 flex-col">
            <h1 className="m-0 truncate font-display text-[18px] font-bold sm:text-[20px]">{story.title}</h1>
            <span className="text-[13px] text-muted">
              {parts.length} partes · até {total}s · {ready} de {parts.length} prontas
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[14px] text-muted sm:flex">
            <Coins size={16} className="text-accent" aria-hidden /> {credits} créditos
          </span>
          <Button size="md" disabled={!allReady} className={allReady ? 'pulse' : undefined} onClick={() => toast.show('Seu vídeo está sendo exportado em 9:16')}>
            <Download size={18} /> {allReady ? 'Exportar vídeo' : 'Gerando…'}
          </Button>
        </div>
      </header>

      <div className="grid flex-1 items-start gap-7 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(260px,340px)_1fr_minmax(280px,340px)]">
        {/* PRÉVIA */}
        <section aria-label="Prévia" className="mx-auto flex w-full max-w-[340px] flex-col gap-3.5">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border border-line-strong glow-accent">
            <Scene key={`${cur.num}-${cur.backdrop}`} backdrop={cur.backdrop} look={look} className="pop absolute inset-0 h-full w-full" label={`Parte ${cur.num}`} />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-black/55 px-3 py-1 text-[13px] font-semibold backdrop-blur">Parte {cur.num}</span>
            {cur.status === 'gerando' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-sm">
                <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-accent border-t-transparent" aria-hidden />
                <span className="text-[15px] font-semibold">Gerando a parte {cur.num}…</span>
              </div>
            )}
            <span className="absolute inset-x-3 bottom-8 text-center font-display text-[22px] font-extrabold uppercase leading-[1.08] [text-shadow:0_2px_0_#000,0_0_16px_rgba(0,0,0,.9)]">
              {cur.fala.replace(/[.!]$/, '')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Reproduzir" onClick={() => toast.show('A prévia toca aqui quando o vídeo for gerado de verdade')} className="press flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-bg">
              <Play size={20} fill="currentColor" />
            </button>
            <div className="h-1.5 flex-1 rounded-full bg-line">
              <div className="h-1.5 rounded-full bg-accent transition-all duration-500" style={{ width: `${(start / total) * 100}%` }} />
            </div>
            <span className="text-[13px] text-muted">
              0:{String(start).padStart(2, '0')} / 0:{String(total).padStart(2, '0')}
            </span>
          </div>
        </section>

        {/* PARTES */}
        <section aria-labelledby="partes-t" className="flex min-w-0 flex-col gap-4">
          <h2 id="partes-t" className="m-0 font-display text-[18px] font-bold">Partes</h2>
          <div className="grid grid-cols-3 gap-3">
            {parts.map((p) => (
              <button
                key={p.num}
                type="button"
                aria-pressed={p.num === sel}
                aria-label={`Parte ${p.num}: ${p.beat}`}
                onClick={() => {
                  setSel(p.num)
                  setEditing(false)
                  setShowPrompt(false)
                }}
                className="press flex cursor-pointer flex-col gap-2 text-left text-ink"
              >
                <span className={cx('relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 transition-all', p.num === sel ? 'border-accent glow-accent' : 'border-transparent hover:border-line-strong')}>
                  <Scene backdrop={p.backdrop} look={look} className="absolute inset-0 h-full w-full" />
                  <span className="absolute left-2 top-2 rounded-lg bg-black/55 px-2 py-0.5 text-[12px] font-bold">{p.num}</span>
                  <span className="absolute right-2 top-2">
                    <StatusDot status={p.status} />
                  </span>
                </span>
                <span className="text-[14px] font-semibold">{p.beat}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-4">
            <span className="text-[13px] font-semibold text-accent-text">Parte {cur.num} · {cur.beat}</span>
            <p className="m-0 text-[14px] leading-relaxed text-muted">{cur.scene}</p>
            {editing ? (
              <>
                <label htmlFor="fala" className="text-[13px] font-medium text-muted">Fala</label>
                <input id="fala" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-12 rounded-[10px] border border-line-strong bg-bg px-3.5 text-[16px] text-ink outline-none focus:border-accent" />
                <div className="flex gap-2">
                  <Button onClick={saveFala}>Salvar</Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
                </div>
              </>
            ) : (
              <>
                <p className="m-0 text-[17px] leading-relaxed">“{cur.fala}”</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="soft" onClick={redo} disabled={cur.status === 'gerando' || redoing}>
                    <RefreshCw size={16} /> Refazer parte · {CREDITS_REDO_PART}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft(cur.fala)
                      setEditing(true)
                    }}
                  >
                    <Pencil size={16} /> Editar fala
                  </Button>
                  <Button variant="ghost" aria-expanded={showPrompt} onClick={() => setShowPrompt((v) => !v)}>
                    <Wand size={16} /> Prompt <ChevronDown size={16} className={cx('transition-transform', showPrompt && 'rotate-180')} />
                  </Button>
                </div>
                {showPrompt && <p className="rise m-0 rounded-[12px] border border-line bg-bg p-3 text-[13px] leading-relaxed text-soft">{cur.prompt}</p>}
              </>
            )}
          </div>
        </section>

        {/* DIRETOR */}
        <aside aria-labelledby="diretor-t" className="flex min-h-[520px] flex-col overflow-hidden rounded-[20px] border border-line bg-surface">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-accent text-accent-ink shadow-[0_0_18px_#ff8a3d77]">
              <Clapperboard size={18} aria-hidden />
            </span>
            <div className="flex flex-col">
              <h2 id="diretor-t" className="m-0 text-[16px] font-bold">Diretor</h2>
              <span className="text-[12px] text-muted">com Claude</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-line p-4">
            {['História escrita', 'Elenco escalado', `${ready} de ${parts.length} partes prontas`].map((t) => (
              <span key={t} className="flex items-center gap-2.5 text-[14px]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-soft text-sky-text">
                  <Check size={13} strokeWidth={3} />
                </span>
                {t}
              </span>
            ))}
            {!allReady && (
              <span className="flex items-center gap-2.5 text-[14px]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <LoaderCircle size={14} className="animate-spin" />
                </span>
                Gerando a parte {parts.find((p) => p.status === 'gerando')?.num}
              </span>
            )}
          </div>

          <div aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {msgs.map((m) =>
              m.from === 'user' ? (
                <div key={m.id} className="rise max-w-[90%] self-end rounded-[14px_14px_4px_14px] bg-[#242b3a] px-3.5 py-2.5 text-[14px] leading-snug">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className="rise max-w-[94%] text-[14px] leading-snug text-soft">
                  {m.text}
                </div>
              ),
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-[14px] text-muted">
                <LoaderCircle size={15} className="animate-spin text-accent" aria-hidden /> O Diretor está ajustando…
              </div>
            )}
          </div>

          <form onSubmit={send} className="border-t border-line p-3">
            <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-bg py-1.5 pl-3.5 pr-1.5 focus-within:border-accent">
              <label htmlFor="pedido" className="sr-only">Peça algo pro Diretor</label>
              <input id="pedido" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ex.: deixa a parte 2 mais engraçada" className="min-h-10 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none" />
              <button type="submit" aria-label="Enviar" className="press flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-accent text-accent-ink">
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </aside>
      </div>

      {/* LINHA DO TEMPO */}
      <section aria-label="Linha do tempo" className="flex flex-col gap-3 border-t border-line bg-side px-4 py-4 sm:px-6">
        <div className="flex h-[76px] gap-1.5">
          {parts.map((p) => (
            <button key={p.num} type="button" aria-label={`Ir pra parte ${p.num}`} onClick={() => setSel(p.num)} className="press relative min-w-0 flex-[10_1_0px] cursor-pointer overflow-hidden rounded-[12px]">
              <Scene backdrop={p.backdrop} look={look} crop="face" className="absolute inset-0 h-full w-full" />
              <span className={cx('absolute inset-0 rounded-[12px] border-2', p.num === sel ? 'border-accent' : 'border-transparent')} />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 text-[11px] font-bold">{p.num}</span>
              {p.status === 'gerando' && <span className="absolute inset-0 animate-pulse bg-black/45" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => toast.show('Aqui você adiciona um vídeo seu depois da historinha')}
            className="press flex min-w-0 flex-[8_1_0px] cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] border-dashed border-[#3a4152] text-[13px] text-muted hover:border-accent-line hover:text-ink"
          >
            <Plus size={16} aria-hidden /> <span className="hidden sm:inline">Seu vídeo</span>
          </button>
          <div className="flex min-w-0 flex-[5_1_0px] items-center justify-center rounded-[12px] border border-sky-line bg-sky-soft text-[13px] font-semibold text-sky-text">
            <span className="truncate px-1">Frase final</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Music size={16} className="text-violet-text" aria-hidden />
          <span className="text-[14px] text-soft">Música motivacional</span>
          <Button variant="secondary" size="sm" onClick={() => toast.show('Música trocada')}>Trocar</Button>
        </div>
      </section>
    </div>
  )
}
