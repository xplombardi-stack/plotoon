// Vídeo com IA, sem modelo: a pessoa manda fotos, conta o que quer e escolhe as cores (ou "tanto faz").
// O Claude cria o conceito, a oferta e escreve cada cena do zero. O vídeo roda e é gravado no navegador.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy as CopyIcon, Download, ImagePlus, LoaderCircle, Palette, Plus, RefreshCw, Zap, Wand2, X } from 'lucide-react'
import { FilmPlayer, type FilmSource } from './FilmPlayer'
import { ShowcaseVideos } from './Exemplos'
import { Badge, Button, cx, useToast } from './ui'
import { useBusiness } from '../lib/business'
import { consumeJob, startJob, updateJob, useJobs } from '../lib/jobs'
import { canRecordFilm, capaFilme, gravarFilme, type Filme, type Projetor } from '../lib/film'
import { FILME_EXEMPLO, EXEMPLO_CODIGO } from '../lib/filmExample'
import { TRILHAS, type Trilha } from '../lib/music'
import { CREDITS_PER_SCENE_FIX, customVideoCost } from '../lib/pricing'
import { shrinkImage, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

const KEY = 'plotoon:video-ia:v1'
export const VIDEO_IA_PEDIDO = 'plotoon:video-ia-pedido'
const CHAMADAS = ['Chama no WhatsApp', 'Peça pelo link da bio', 'Compre no site', 'Agende pelo WhatsApp']
const SUGESTOES_COR = ['#0f5132', '#d9a441', '#111111', '#f5e6c8', '#7c1d2e', '#1e3a8a', '#ff8a3d', '#ff5da2', '#a78bfa', '#38bdf8', '#34d399', '#ffffff']
const fieldCls = 'min-h-12 w-full rounded-[14px] border border-line-strong bg-bg/70 px-4 text-[16px] text-ink outline-none placeholder:text-subtle focus:border-accent sm:text-[15px]'

type CenaPlano = { titulo: string; visual: string; texto: string; duracao: number; transicao: Filme['cenas'][number]['transicao'] }
type Plano = { titulo: string; conceito: string; paleta: string[]; trilha: Trilha; legenda: string; chamada: string; cenas: CenaPlano[] }
type Projeto = {
  fotos: string[] // data URLs (ou links assinados)
  produto: string
  oferta: string
  pedido: string
  duracao: 20 | 30 | 40
  tantoFaz: boolean
  cores: string[]
  chamada: string
  trilha: Trilha | 'auto'
  projetoId?: string
  plano?: Plano
  codigos?: (string | null)[]
}
type Progresso = { etapa: 'fotos' | 'plano' | 'cenas'; prontas: number; total: number; plano?: Plano }

function readProj(base: Projeto): Projeto {
  try {
    const raw = sessionStorage.getItem(KEY)
    const pedido = sessionStorage.getItem(VIDEO_IA_PEDIDO)
    const saved = raw ? (JSON.parse(raw) as Projeto) : null
    if (pedido) {
      sessionStorage.removeItem(VIDEO_IA_PEDIDO)
      return { ...base, fotos: saved?.fotos ?? [], pedido: pedido.slice(0, 1200) }
    }
    if (saved) return { ...base, ...saved }
  } catch {
    /* sem armazenamento */
  }
  return base
}

async function dataUrlToBlob(d: string) {
  return (await fetch(d)).blob()
}

function errCode(error: unknown) {
  return (async () => {
    try {
      const ctx = (error as { context?: Response } | null)?.context
      return String((ctx ? await ctx.json() : null)?.error ?? 'falha')
    } catch {
      return 'falha'
    }
  })()
}

/* ---------- prévia (sem IA): o filme de exemplo com as cores escolhidas ---------- */
function demoPlano(p: Projeto): Plano {
  return {
    titulo: p.produto ? `Filme: ${p.produto.slice(0, 40)}` : FILME_EXEMPLO.titulo,
    conceito: FILME_EXEMPLO.conceito ?? '',
    paleta: p.tantoFaz ? FILME_EXEMPLO.paleta : p.cores,
    trilha: 'luxo',
    legenda: FILME_EXEMPLO.legenda ?? '',
    chamada: p.chamada,
    cenas: FILME_EXEMPLO.cenas.map((c) => ({ titulo: c.titulo ?? '', visual: c.descricao ?? '', texto: c.texto ?? '', duracao: c.dur, transicao: c.transicao })),
  }
}
const DEMO_CODES = [EXEMPLO_CODIGO.fios, EXEMPLO_CODIGO.pedestal, EXEMPLO_CODIGO.beneficios, EXEMPLO_CODIGO.oferta, EXEMPLO_CODIGO.fechamento]

/* ---------- criação: plano + cenas em paralelo (roda fora da tela) ---------- */
async function criar(snap: Projeto, live: boolean, jobId: () => string | undefined, addCredits: (n: number, r: string) => void) {
  const prog = (p: Progresso) => {
    const id = jobId()
    if (id) updateJob(id, p)
  }
  if (!live || !supabase) {
    addCredits(-customVideoCost(snap.duracao), 'Vídeo com IA')
    prog({ etapa: 'plano', prontas: 0, total: 5 })
    await new Promise((r) => setTimeout(r, 2500))
    const plano = demoPlano(snap)
    prog({ etapa: 'cenas', prontas: 0, total: plano.cenas.length, plano })
    for (let i = 1; i <= plano.cenas.length; i++) {
      await new Promise((r) => setTimeout(r, 700))
      prog({ etapa: 'cenas', prontas: i, total: plano.cenas.length, plano })
    }
    return { projetoId: 'demo', plano, codigos: DEMO_CODES }
  }

  // 1) sobe as fotos (ficam guardadas com o projeto)
  prog({ etapa: 'fotos', prontas: 0, total: 0 })
  const { data: s } = await supabase.auth.getSession()
  const uid = s.session?.user.id
  if (!uid) throw new Error('nao_autenticado')
  const pasta = `${uid}/videos-ia/${Date.now()}`
  const paths: string[] = []
  for (let i = 0; i < snap.fotos.length; i++) {
    const blob = await dataUrlToBlob(snap.fotos[i])
    const path = `${pasta}/foto-${i}.jpg`
    const up = await supabase.storage.from('media').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
    if (!up.error) paths.push(path)
  }

  // 2) o plano (o Claude olha as fotos)
  prog({ etapa: 'plano', prontas: 0, total: 0 })
  const { data: pd, error: pe } = await supabase.functions.invoke('video-ia', {
    body: { etapa: 'plano', produto: snap.produto, oferta: snap.oferta, pedido: snap.pedido, chamada: snap.chamada, duracao: snap.duracao, cores: snap.tantoFaz ? [] : snap.cores, fotos_paths: paths },
  })
  if (pe || !pd?.plano) throw new Error(await errCode(pe))
  const plano = pd.plano as Plano
  const projetoId = pd.projeto_id as string
  const total = plano.cenas.length
  const codigos: (string | null)[] = new Array(total).fill(null)
  let prontas = 0
  prog({ etapa: 'cenas', prontas, total, plano })

  // 3) cada cena escrita do zero, todas ao mesmo tempo
  const fila = plano.cenas.map((_, i) => i)
  const worker = async () => {
    while (fila.length) {
      const i = fila.shift()!
      for (let tent = 0; tent < 2 && !codigos[i]; tent++) {
        const { data, error } = await supabase!.functions.invoke('video-ia', { body: { etapa: 'cena', projeto_id: projetoId, cena: i } })
        if (!error && data?.codigo) codigos[i] = data.codigo
      }
      prontas++
      prog({ etapa: 'cenas', prontas, total, plano })
    }
  }
  await Promise.all(plano.cenas.map(() => worker()))
  return { projetoId, plano, codigos }
}

function Gerando({ p }: { p?: Progresso }) {
  const etapas = [
    { k: 'fotos', t: 'Guardando as suas fotos' },
    { k: 'plano', t: 'Olhando as fotos e criando o conceito do filme' },
    { k: 'cenas', t: p?.etapa === 'cenas' ? `Escrevendo as cenas do zero (${p.prontas} de ${p.total})` : 'Escrevendo as cenas do zero' },
  ]
  const idx = etapas.findIndex((e) => e.k === p?.etapa)
  return (
    <div className="rise grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col items-center gap-6 rounded-[24px] border border-line bg-surface px-5 py-10 text-center">
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/25" />
          <Wand2 size={28} className="relative text-accent" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-[22px] font-extrabold">Criando o seu filme…</h2>
          <p className="m-0 text-[14px] text-muted">Leva uns 3 a 5 minutos (cada cena é criada do zero). Pode sair dessa tela: ele continua e te avisa quando ficar pronto.</p>
        </div>
        <ol className="m-0 flex w-full max-w-[380px] list-none flex-col gap-2.5 p-0 text-left">
          {etapas.map((e, i) => (
            <li key={e.k} className={cx('flex items-center gap-3 text-[14.5px]', i <= idx ? 'text-ink' : 'text-subtle')}>
              <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', i < idx ? 'bg-accent text-accent-ink' : i === idx ? 'bg-accent-soft text-accent' : 'bg-surface-2')}>
                {i < idx ? <Check size={15} strokeWidth={3} /> : i === idx ? <LoaderCircle size={15} className="animate-spin" /> : <span className="text-[12px] font-bold">{i + 1}</span>}
              </span>
              {e.t}
            </li>
          ))}
        </ol>
        {p?.etapa === 'cenas' && (
          <div className="h-2 w-full max-w-[380px] overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#ff5da2] transition-[width] duration-500" style={{ width: `${(p.prontas / Math.max(1, p.total)) * 100}%` }} />
          </div>
        )}
      </div>
      {p?.plano ? (
        <div className="pop flex flex-col gap-3 rounded-[24px] border border-line bg-surface p-5">
          <Badge tone="violet" className="self-start">
            O conceito
          </Badge>
          <h3 className="m-0 font-display text-[21px] font-extrabold leading-tight">{p.plano.titulo}</h3>
          <p className="m-0 text-[14.5px] text-soft">{p.plano.conceito}</p>
          <span className="flex gap-1.5">
            {p.plano.paleta.map((c) => (
              <span key={c} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c }} title={c} />
            ))}
          </span>
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {p.plano.cenas.map((c, i) => (
              <li key={i} className="flex gap-2.5 rounded-xl bg-bg/50 p-2.5">
                <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', i < p.prontas ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>{i < p.prontas ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {c.titulo} <span className="font-normal text-muted">· {c.duracao.toLocaleString('pt-BR')}s</span>
                  </span>
                  <span className="line-clamp-2 text-[12.5px] text-muted">{c.visual}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="flex flex-col justify-center gap-3 rounded-[24px] border border-dashed border-line-strong p-6 text-center text-[14px] text-muted">
          O conceito do filme aparece aqui assim que a IA olhar as suas fotos.
        </div>
      )}
    </div>
  )
}

/* ---------- gravação ---------- */
function Recorder({ proj, filme, trilha, nome, onClose, onSaved }: { proj: Projetor; filme: Filme; trilha: Trilha; nome: string; onClose: () => void; onSaved: (blob: Blob, ext: string, mime: string) => Promise<boolean> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [prog, setProg] = useState(0)
  const [phase, setPhase] = useState<'gravando' | 'salvando' | 'pronto' | 'erro'>('gravando')
  const [file, setFile] = useState<{ url: string; ext: string; saved: boolean } | null>(null)
  const cancel = useRef<() => void>(() => {})
  const total = filme.cenas.reduce((s, c) => s + c.dur, 0)
  const slug = (nome || 'video').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const job = gravarFilme(c, proj, filme, trilha, (s) => setProg(s))
    cancel.current = job.cancel
    job.done
      .then(async (g) => {
        const url = URL.createObjectURL(g.blob)
        setFile({ url, ext: g.ext, saved: false })
        const a = document.createElement('a')
        a.href = url
        a.download = `${slug}.${g.ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setPhase('salvando')
        const ok = await onSaved(g.blob, g.ext, g.mime)
        setFile({ url, ext: g.ext, saved: ok })
        setPhase('pronto')
      })
      .catch((e) => {
        if (String(e?.message) !== 'cancelado') setPhase('erro')
      })
    return () => cancel.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Gravando o vídeo">
      <div className="pop flex max-h-full w-full max-w-[860px] flex-col gap-5 overflow-y-auto rounded-[26px] border border-line-strong bg-side p-5 sm:flex-row sm:p-6">
        <canvas ref={canvas} width={720} height={1280} className="mx-auto aspect-[9/16] h-[46vh] max-h-[520px] shrink-0 rounded-[18px] bg-black sm:h-[60vh]" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
          {phase === 'gravando' && (
            <>
              <Badge tone="accent" className="self-start">
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-[#ef4444]" /> Montando
              </Badge>
              <h2 className="m-0 font-display text-[22px] font-extrabold">Montando o seu vídeo em alta</h2>
              <p className="m-0 text-[14.5px] text-muted">Cada quadro é desenhado um por um (30 por segundo), com música e efeitos sonoros. Por isso o vídeo sai liso, sem travar. Leva de 1 a 3 minutos.</p>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-[#ff5da2] transition-[width] duration-200" style={{ width: `${(prog / total) * 100}%` }} />
              </div>
              <span className="text-[13px] font-semibold tabular-nums text-soft">
                {Math.floor(prog)}s de {Math.round(total)}s
              </span>
              <Button variant="ghost" onClick={() => (cancel.current(), onClose())} className="self-start">
                Cancelar
              </Button>
            </>
          )}
          {phase === 'salvando' && (
            <p className="m-0 flex items-center gap-2 text-[15px] text-soft">
              <LoaderCircle size={18} className="animate-spin text-accent" /> Guardando na sua Biblioteca…
            </p>
          )}
          {phase === 'pronto' && file && (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#34d39922] text-[#6ee7b7]">
                <Check size={26} strokeWidth={3} />
              </span>
              <h2 className="m-0 font-display text-[22px] font-extrabold">Vídeo pronto!</h2>
              <p className="m-0 text-[14.5px] text-muted">
                O download começou. {file.saved ? 'Também ficou guardado na sua Biblioteca.' : 'Não deu pra guardar na Biblioteca agora, mas o arquivo é seu.'}
                {file.ext === 'webm' && ' Seu navegador gravou em WebM: pra postar pelo celular, grave pelo Chrome atualizado ou pelo Safari, que gravam em MP4.'}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <a href={file.url} download={`${slug}.${file.ext}`} className="press inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-ink no-underline">
                  <Download size={18} /> Baixar de novo
                </a>
                <Button variant="secondary" size="lg" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </>
          )}
          {phase === 'erro' && (
            <>
              <h2 className="m-0 font-display text-[22px] font-extrabold">Não deu pra gravar aqui</h2>
              <p className="m-0 text-[14.5px] text-muted">Seu navegador não conseguiu gravar o vídeo. Tenta pelo Chrome ou Safari atualizados.</p>
              <Button variant="secondary" onClick={onClose} className="self-start">
                Fechar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- escolher as cores ---------- */
function Cores({ value, onChange, tantoFaz, onTantoFaz }: { value: string[]; onChange: (v: string[]) => void; tantoFaz: boolean; onTantoFaz: (v: boolean) => void }) {
  const [slot, setSlot] = useState(0)
  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Palette size={16} /> Cores do vídeo
      </span>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={!tantoFaz} onClick={() => onTantoFaz(false)} className={cx('press min-h-12 cursor-pointer rounded-xl border-2 px-3 text-left', !tantoFaz ? 'border-accent' : 'border-line hover:border-line-strong')}>
          <span className="block text-[14px] font-semibold text-ink">Eu escolho</span>
          <span className="text-[12px] text-muted">2 ou 3 cores, usadas exatamente</span>
        </button>
        <button type="button" aria-pressed={tantoFaz} onClick={() => onTantoFaz(true)} className={cx('press min-h-12 cursor-pointer rounded-xl border-2 px-3 text-left', tantoFaz ? 'border-accent' : 'border-line hover:border-line-strong')}>
          <span className="block text-[14px] font-semibold text-ink">Tanto faz</span>
          <span className="text-[12px] text-muted">A IA escolhe o que combina</span>
        </button>
      </div>
      {!tantoFaz && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-bg/50 p-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {[0, 1, 2].map((i) => {
              const c = value[i]
              return (
                <span key={i} className="flex items-center gap-1">
                  <label className={cx('relative flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2', slot === i ? 'border-accent' : 'border-line-strong', !c && 'border-dashed')} style={{ background: c ?? 'transparent' }} onClick={() => setSlot(i)}>
                    {!c && <Plus size={18} className="text-muted" />}
                    <input
                      type="color"
                      aria-label={`Cor ${i + 1}`}
                      value={c ?? '#ffffff'}
                      onChange={(e) => {
                        const next = [...value]
                        next[i] = e.target.value
                        onChange(next.filter(Boolean).slice(0, 3))
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                  {c && i >= 2 && (
                    <button type="button" aria-label="Tirar a 3ª cor" onClick={() => onChange(value.slice(0, 2))} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted hover:text-ink">
                      <X size={14} />
                    </button>
                  )}
                </span>
              )
            })}
            <span className="text-[12.5px] text-muted">{value.length < 2 ? 'Escolha pelo menos 2' : value.length === 2 ? 'A 3ª é opcional' : '3 cores'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGESTOES_COR.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Usar a cor ${c}`}
                onClick={() => {
                  const next = [...value]
                  const at = Math.min(slot, next.length)
                  next[at] = c
                  onChange(next.slice(0, 3))
                  setSlot(Math.min(2, at + 1))
                }}
                className="press h-8 w-8 cursor-pointer rounded-full border border-white/20"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- a aba ---------- */
export function AiVideoStudio() {
  const { business, addLocalItem, reloadLibrary } = useBusiness()
  const { live, credits, addCredits, reload } = useStore()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [proj, setProj] = useState<Projeto>(() =>
    readProj({
      fotos: [],
      produto: business.sells ? business.sells.split(/[,.;]/)[0].trim().slice(0, 80) : '',
      oferta: '',
      pedido: '',
      duracao: 30,
      tantoFaz: business.colors.length < 2,
      cores: business.colors.slice(0, 3),
      chamada: business.socials.whatsapp ? CHAMADAS[0] : CHAMADAS[1],
      trilha: 'auto',
    }),
  )
  const set = (p: Partial<Projeto>) => setProj((x) => ({ ...x, ...p }))
  const [recording, setRecording] = useState(false)
  const [projetor, setProjetor] = useState<Projetor | null>(null)
  const [ajustes, setAjustes] = useState<Record<number, string>>({})
  const [ajustando, setAjustando] = useState<Record<number, boolean>>({})
  const [seek, setSeek] = useState<{ t: number; n: number } | undefined>()
  const consertadas = useRef<Set<number>>(new Set())

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(proj))
    } catch {
      /* fotos grandes demais: segue sem guardar */
    }
  }, [proj])

  // a criação roda fora da tela
  const job = useJobs().filter((j) => j.kind === 'video').at(-1)
  const busy = job?.status === 'running'
  const jobIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!job || job.status === 'running' || job.consumed) return
    consumeJob(job.id)
    reload()
    if (job.status === 'done') {
      const r = job.result as { projetoId: string; plano: Plano; codigos: (string | null)[] }
      consertadas.current.clear()
      set({ projetoId: r.projetoId, plano: r.plano, codigos: r.codigos })
    } else toast.show(job.error === 'creditos_insuficientes' ? 'Seus créditos acabaram.' : 'Não consegui criar o vídeo agora. Seus créditos foram devolvidos.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status])

  async function addPhotos(list: FileList | null) {
    if (!list) return
    const out: string[] = []
    for (const f of Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, 4 - proj.fotos.length)) {
      try {
        out.push(await shrinkImage(f, 1400))
      } catch {
        /* imagem ruim */
      }
    }
    set({ fotos: [...proj.fotos, ...out].slice(0, 4) })
  }

  function gerar() {
    if (busy) return
    if (proj.produto.trim().length < 2 && proj.pedido.trim().length < 3) return toast.show('Conta qual é o produto ou o que você quer no vídeo.')
    if (!proj.tantoFaz && proj.cores.length < 2) return toast.show('Escolha pelo menos 2 cores, ou marque "Tanto faz".')
    if (credits < customVideoCost(proj.duracao)) return toast.show('Você não tem créditos suficientes.')
    const snap = { ...proj, fotos: proj.fotos.length ? proj.fotos : live ? [] : ['/demo/perfume-depois.jpg'] }
    const id = startJob({
      kind: 'video',
      label: 'Criando o seu filme',
      doneLabel: 'Seu vídeo está pronto pra assistir',
      route: 'estudio-video',
      run: () => criar(snap, live, () => jobIdRef.current, addCredits),
    })
    jobIdRef.current = id
  }

  // filme pronto pro player
  const filme: Filme | null = useMemo(() => {
    if (!proj.plano || !proj.codigos) return null
    return {
      titulo: proj.plano.titulo,
      conceito: proj.plano.conceito,
      legenda: proj.plano.legenda,
      paleta: proj.plano.paleta,
      trilha: proj.plano.trilha,
      cenas: proj.plano.cenas.map((c, i) => ({ code: proj.codigos![i] ?? '', dur: c.duracao, transicao: c.transicao, texto: c.texto, titulo: c.titulo, descricao: c.visual })),
    }
  }, [proj.plano, proj.codigos])
  const trilha: Trilha = proj.trilha === 'auto' ? (proj.plano?.trilha ?? 'luxo') : proj.trilha
  const marca = useMemo(() => ({ nome: business.name, arroba: business.socials.instagram ? `@${business.socials.instagram.replace(/^@/, '')}` : undefined, whatsapp: business.socials.whatsapp, chamada: proj.chamada }), [business.name, business.socials.instagram, business.socials.whatsapp, proj.chamada])
  const fotosFilme = useMemo(() => (proj.fotos.length ? proj.fotos : ['/demo/perfume-depois.jpg']), [proj.fotos])
  const src: FilmSource | null = useMemo(() => (filme ? { filme, fotos: fotosFilme, logo: business.logo ?? null, marca } : null), [filme, fotosFilme, business.logo, marca])

  // conserta sozinho a cena que der erro ao rodar (1 vez por cena, sem custo)
  async function consertar(i: number, msg: string) {
    if (!live || !supabase || !proj.projetoId || consertadas.current.has(i)) return
    consertadas.current.add(i)
    const { data } = await supabase.functions.invoke('video-ia', { body: { etapa: 'cena', projeto_id: proj.projetoId, cena: i, erro: msg } })
    if (data?.codigo) setProj((x) => (x.codigos ? { ...x, codigos: x.codigos.map((c, k) => (k === i ? data.codigo : c)) } : x))
  }

  async function ajustar(i: number) {
    const pedido = (ajustes[i] ?? '').trim()
    if (pedido.length < 3 || ajustando[i]) return
    if (!live || !supabase || !proj.projetoId) return toast.show('Na prévia o ajuste é só de exemplo. Com a IA ligada, a cena é reescrita do jeito que você pedir.')
    if (credits < CREDITS_PER_SCENE_FIX) return toast.show('Você não tem créditos suficientes.')
    setAjustando((x) => ({ ...x, [i]: true }))
    const { data, error } = await supabase.functions.invoke('video-ia', { body: { etapa: 'cena', projeto_id: proj.projetoId, cena: i, ajuste: pedido } })
    setAjustando((x) => ({ ...x, [i]: false }))
    reload()
    if (error || !data?.codigo) return toast.show((await errCode(error)) === 'creditos_insuficientes' ? 'Seus créditos acabaram.' : 'Não consegui ajustar agora. Seus créditos foram devolvidos.')
    consertadas.current.delete(i)
    setAjustes((x) => ({ ...x, [i]: '' }))
    setProj((x) => (x.codigos ? { ...x, codigos: x.codigos.map((c, k) => (k === i ? data.codigo : c)) } : x))
    const start = (proj.plano?.cenas ?? []).slice(0, i).reduce((s, c) => s + c.duracao, 0)
    setSeek({ t: start + 0.05, n: Date.now() })
    toast.show('Cena ajustada!')
  }

  async function saveToLibrary(blob: Blob, ext: string, mime: string) {
    if (!filme || !projetor) return false
    const capa = await capaFilme(projetor, Math.min(3, filme.cenas[0]?.dur ?? 2) + 1.5)
    const meta = { estilo: 'video-ia', projeto_id: proj.projetoId, titulo: filme.titulo }
    if (!live || !supabase) {
      const prev = capa
        ? await new Promise<string>((res) => {
            const fr = new FileReader()
            fr.onload = () => res(String(fr.result))
            fr.readAsDataURL(capa)
          })
        : undefined
      addLocalItem({ kind: 'video', module: 'video-ia', title: filme.titulo, preview: prev, file: URL.createObjectURL(blob), body: filme.legenda, meta })
      return true
    }
    const { data: s } = await supabase.auth.getSession()
    const uid = s.session?.user.id
    if (!uid) return false
    const base = `${uid}/videos/ia-${Date.now()}`
    const up = await supabase.storage.from('media').upload(`${base}.${ext}`, blob, { contentType: mime })
    if (up.error) return false
    let previewPath: string | null = null
    if (capa) {
      const pu = await supabase.storage.from('media').upload(`${base}-capa.jpg`, capa, { contentType: 'image/jpeg' })
      if (!pu.error) previewPath = `${base}-capa.jpg`
    }
    const { error } = await supabase.from('library_items').insert({ user_id: uid, kind: 'video', module: 'video-ia', title: filme.titulo, preview_path: previewPath, file_path: `${base}.${ext}`, body: filme.legenda ?? null, meta })
    if (error) return false
    reloadLibrary()
    return true
  }

  if (busy) return <Gerando p={job?.progress as Progresso | undefined} />

  /* ---------- resultado ---------- */
  if (filme && src && proj.plano) {
    const plano = proj.plano
    let acc = 0
    const starts = plano.cenas.map((c) => {
      const s = acc
      acc += c.duracao
      return s
    })
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <FilmPlayer src={src} trilha={trilha} className="mx-auto max-w-[380px] border border-line-strong" onReady={setProjetor} onErro={consertar} seekTo={seek} />
          <Button size="lg" disabled={!projetor} onClick={() => (canRecordFilm() ? setRecording(true) : toast.show('Seu navegador não grava vídeo. Abre no Chrome ou no Safari atualizado.'))} className="w-full">
            <Download size={18} /> Baixar vídeo
          </Button>
          <p className="m-0 text-center text-[12.5px] text-muted">Baixar não gasta crédito.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Badge tone="accent" className="self-start">
                <Zap size={13} /> Feito do zero pra você
              </Badge>
              <h2 className="m-0 font-display text-[23px] font-extrabold leading-tight">{plano.titulo}</h2>
              <p className="m-0 text-[14.5px] text-soft">{plano.conceito}</p>
              <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                {plano.paleta.map((c) => (
                  <span key={c} className="h-5 w-5 rounded-full border border-white/20" style={{ background: c }} />
                ))}
                cores do filme
              </span>
            </div>
            <Button variant="ghost" onClick={() => set({ plano: undefined, codigos: undefined, projetoId: undefined })}>
              <ArrowLeft size={16} /> Novo vídeo
            </Button>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-bold text-soft">Música</span>
            <div className="flex flex-wrap gap-2">
              {TRILHAS.map((t) => (
                <button key={t.id} type="button" onClick={() => set({ trilha: t.id })} aria-pressed={trilha === t.id} className={cx('press min-h-10 cursor-pointer rounded-full px-3.5 text-[13.5px] font-semibold', trilha === t.id ? 'bg-ink text-bg' : 'border border-line-strong text-soft hover:text-ink')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {plano.cenas.map((c, i) => (
              <li key={i} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => setSeek({ t: starts[i] + 0.05, n: Date.now() })} aria-label={`Ver a cena ${i + 1}`} className="press flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent-text">
                    {i + 1}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-x-2 text-[14.5px] font-semibold text-ink">
                      {c.titulo} <span className="text-[12px] font-normal text-muted">{c.duracao.toLocaleString('pt-BR')}s</span>
                      {!proj.codigos?.[i] && <span className="text-[12px] font-semibold text-[#fca5a5]">não saiu, use o ajuste pra refazer</span>}
                    </span>
                    <span className="text-[13px] text-muted">“{c.texto}”</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor={`ajuste-${i}`}>
                    Ajuste da cena {i + 1}
                  </label>
                  <input id={`ajuste-${i}`} value={ajustes[i] ?? ''} maxLength={300} onChange={(e) => setAjustes((x) => ({ ...x, [i]: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && ajustar(i)} placeholder="Pedir ajuste: ex. preço maior, mais brilho" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-bg/70 px-3 text-[16px] text-ink outline-none placeholder:text-subtle focus:border-accent sm:text-[14px]" />
                  <Button variant="soft" onClick={() => ajustar(i)} disabled={ajustando[i] || (ajustes[i] ?? '').trim().length < 3}>
                    {ajustando[i] ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />} {CREDITS_PER_SCENE_FIX}
                  </Button>
                </div>
              </li>
            ))}
          </ol>

          {plano.legenda && (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <span className="text-[13px] font-bold text-soft">Legenda pro post</span>
              <p className="m-0 whitespace-pre-wrap text-[14.5px] text-soft">{plano.legenda}</p>
              <Button variant="soft" size="sm" className="self-start" onClick={() => navigator.clipboard?.writeText(plano.legenda).then(() => toast.show('Legenda copiada!'))}>
                <CopyIcon size={14} /> Copiar legenda
              </Button>
            </div>
          )}
        </div>
        {recording && projetor && <Recorder proj={projetor} filme={filme} trilha={trilha} nome={filme.titulo} onClose={() => setRecording(false)} onSaved={saveToLibrary} />}
      </div>
    )
  }

  /* ---------- formulário ---------- */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div className="rise flex flex-col gap-5 rounded-[24px] border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 font-display text-[22px] font-bold">Vídeo do produto, feito do zero</h2>
          <p className="m-0 text-[14.5px] text-muted">Nada de modelo pronto. A IA olha as suas fotos, cria o conceito, monta a oferta e escreve cada cena do zero, em 3D e motion design, nas cores que você escolher.</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">Fotos do produto</span>
          <div className="grid grid-cols-4 gap-2">
            {proj.fotos.map((src, i) => (
              <span key={i} className="relative aspect-square overflow-hidden rounded-xl border border-line-strong">
                <img src={src} alt={`Foto ${i + 1} do produto`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => set({ fotos: proj.fotos.filter((_, k) => k !== i) })} aria-label="Tirar essa foto" className="absolute right-1 top-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white">
                  <X size={14} />
                </button>
              </span>
            ))}
            {proj.fotos.length < 4 && (
              <button type="button" onClick={() => file.current?.click()} className="press flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-[12px] font-semibold text-muted hover:border-accent hover:text-ink">
                <ImagePlus size={22} /> Adicionar
              </button>
            )}
          </div>
          <p className="m-0 text-[12.5px] text-muted">Até 4 fotos. A IA olha cada uma pra montar o filme. Foto do celular serve.</p>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" tabIndex={-1} onChange={(e) => (addPhotos(e.target.files), (e.target.value = ''))} />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">Qual é o produto?</span>
          <input value={proj.produto} maxLength={120} onChange={(e) => set({ produto: e.target.value })} placeholder="Ex.: uniformes profissionais bordados" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">
            Preço ou oferta <span className="font-normal text-muted">(opcional)</span>
          </span>
          <input value={proj.oferta} maxLength={80} onChange={(e) => set({ oferta: e.target.value })} placeholder="Ex.: kit com 10 camisas por R$ 490 · frete grátis" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">Conta como você quer o vídeo</span>
          <textarea value={proj.pedido} rows={4} maxLength={1200} onChange={(e) => set({ pedido: e.target.value })} placeholder="Ex.: mostrar os 30 anos de história, a costura feita com cuidado e terminar com a nossa marca. Clima premium." className={cx(fieldCls, 'resize-none py-3')} />
        </label>

        <Cores value={proj.cores} onChange={(cores) => set({ cores })} tantoFaz={proj.tantoFaz} onTantoFaz={(tantoFaz) => set({ tantoFaz })} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-ink">Duração</span>
            <div className="grid grid-cols-3 gap-2">
              {([20, 30, 40] as const).map((d) => (
                <button key={d} type="button" aria-pressed={proj.duracao === d} onClick={() => set({ duracao: d })} className={cx('press flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border-2 text-[15px] font-bold leading-tight', proj.duracao === d ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink')}>
                  {d}s
                  <span className="text-[11.5px] font-semibold text-muted">{customVideoCost(d)} créditos</span>
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-ink">Chamada no final</span>
            <select value={proj.chamada} onChange={(e) => set({ chamada: e.target.value })} className={cx(fieldCls, 'cursor-pointer')}>
              {CHAMADAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <Button size="lg" onClick={gerar} className="self-stretch sm:self-start">
          <Zap size={18} /> Criar meu vídeo · {customVideoCost(proj.duracao)} créditos
        </Button>
        <p className="m-0 -mt-2 text-[12.5px] text-muted">Depois de pronto, dá pra pedir ajuste em qualquer cena ({CREDITS_PER_SCENE_FIX} créditos cada).</p>
      </div>

      <div className="rise rise-1 flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <span className="flex items-center justify-between gap-2 text-[14px] font-semibold text-soft">
            Um filme feito nesse motor
            <Badge tone="neutral">Exemplo</Badge>
          </span>
          <FilmPlayer src={EXEMPLO_SRC} autoPlay loop trilha="luxo" className="mx-auto max-w-[340px] border border-line-strong" />
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-[14px] font-semibold text-soft">Vídeos de verdade nesse nível</span>
          <ShowcaseVideos className="!grid-cols-2" />
        </div>
      </div>
    </div>
  )
}

export const EXEMPLO_SRC: FilmSource = { filme: FILME_EXEMPLO, fotos: ['/demo/perfume-depois.jpg'], logo: null, marca: { nome: 'Essência Decants', arroba: '@essenciadecants', chamada: 'Chama no WhatsApp' } }
