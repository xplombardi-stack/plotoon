// Estúdio do "Vídeo do produto": fotos + o que é o produto → o Claude escreve o roteiro →
// o vídeo aparece na hora, a pessoa ajusta os textos e baixa. Feito sem boneco e sem Google Flow.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy as CopyIcon, Download, ImagePlus, LoaderCircle, Music2, RefreshCw, Sparkles, Wand2, X } from 'lucide-react'
import { VideoPlayer } from './VideoPlayer'
import { Badge, Button, cx, useToast } from './ui'
import { useBusiness, type Business } from '../lib/business'
import { CREDITS_PER_PRODUCT_VIDEO } from '../lib/pricing'
import { shrinkImage, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { TRILHAS, type Trilha } from '../lib/music'
import { CENA_LABEL, SAMPLE_PHOTO, canRecord, duracao, gravar, loadImage, poster, sampleProduct, sampleRoteiro, type Cena, type Roteiro, type Visual } from '../lib/productVideo'

const PROJ_KEY = 'plotoon:produto-projeto'
export const PRODUTO_PEDIDO = 'plotoon:produto-pedido'
const CHAMADAS = ['Chama no WhatsApp', 'Peça pelo link da bio', 'Compre no site']
const fieldCls = 'min-h-12 w-full rounded-[14px] border border-line-strong bg-bg/70 px-4 text-[16px] text-ink outline-none placeholder:text-subtle focus:border-accent sm:text-[15px]'

type Projeto = { fotos: string[]; produto: string; oferta: string; destaque: string; duracao: 30 | 40; trilha: Trilha; chamada: string; roteiro?: Roteiro }

/* ---------- imagens prontas pro canvas ---------- */
function useImages(srcs: string[]) {
  const [imgs, setImgs] = useState<HTMLImageElement[]>([])
  const key = srcs.join('|')
  useEffect(() => {
    let alive = true
    Promise.all(srcs.map((s) => loadImage(s).catch(() => null))).then((l) => alive && setImgs(l.filter((x): x is HTMLImageElement => !!x)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return imgs
}

export function useBrandVisual(b: Business, fotos: CanvasImageSource[], chamada?: string): Visual {
  const logoImgs = useImages(b.logo ? [b.logo] : [])
  return useMemo(
    () => ({
      cores: b.colors,
      marca: b.name,
      arroba: b.socials.instagram ? `@${b.socials.instagram.replace(/^@/, '')}` : undefined,
      chamada,
      logo: logoImgs[0] ?? null,
      fotos,
    }),
    [b.colors, b.name, b.socials.instagram, chamada, logoImgs, fotos],
  )
}

/** Vídeo de exemplo (perfume), usado nas prévias e na escolha de estilo. */
export function SampleProductVideo({ className, controls = false, trilha = 'nenhuma' }: { className?: string; controls?: boolean; trilha?: Trilha }) {
  const imgs = useImages([SAMPLE_PHOTO])
  const fallback = useMemo(() => [sampleProduct('#c98a2b')], [])
  const roteiro = useMemo(() => sampleRoteiro(), [])
  const visual = useMemo<Visual>(() => ({ cores: ['#ff8a3d', '#facc15'], marca: 'Essência Decants', arroba: '@essenciadecants', chamada: 'Chama no WhatsApp', fotos: imgs.length ? imgs : fallback }), [imgs, fallback])
  return <VideoPlayer roteiro={roteiro} visual={visual} autoPlay loop controls={controls} trilha={trilha} className={className} />
}

/* ---------- roteiro de exemplo na prévia (sem IA) ---------- */
function demoRoteiro(p: Projeto): Roteiro {
  const nome = p.produto.trim() || 'seu produto'
  const curto = nome.split(/\s+/).slice(0, 3).join(' ').replace(/^./, (c) => c.toLowerCase())
  const extra = p.destaque.trim()
  const total = p.duracao
  const cenas: Cena[] = [
    { tipo: 'gancho', texto: `Você ainda não conhece ${curto}?`, destaque: curto.split(' ')[0], segundos: 3 },
    { tipo: 'produto', texto: `Conheça ${curto}`, destaque: curto.split(' ')[0], apoio: extra ? extra.slice(0, 70) : 'Feito com cuidado, do jeito que você gosta', segundos: 5 },
    { tipo: 'beneficio', texto: 'Qualidade que dá pra sentir', destaque: 'Qualidade', segundos: 4 },
    { tipo: 'beneficio', texto: 'Do jeitinho que você queria', destaque: 'jeitinho', segundos: 4 },
    { tipo: 'prova', texto: 'Feito com cuidado de verdade', destaque: 'cuidado', apoio: 'Atendimento do começo ao fim', segundos: 4.5 },
  ]
  if (p.oferta.trim()) cenas.push({ tipo: 'oferta', texto: p.oferta.trim().slice(0, 24), segundos: 4 })
  cenas.push({ tipo: 'cta', texto: 'Garanta o seu hoje', destaque: 'hoje', segundos: 5.5 })
  const soma = cenas.reduce((s, c) => s + c.segundos, 0)
  return { titulo: `Vídeo: ${curto}`, legenda: `Conheça ${nome}! ${p.chamada} e garanta o seu.`, cenas: cenas.map((c) => ({ ...c, segundos: Math.round(((c.segundos * total) / soma) * 10) / 10 })) }
}

const STEPS = ['Lendo o seu produto', 'Escrevendo o gancho que prende', 'Montando as cenas e os textos', 'Escolhendo o ritmo da música']

function Generating() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((x) => Math.min(STEPS.length - 1, x + 1)), 2200)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="rise flex flex-col items-center gap-6 rounded-[24px] border border-line bg-surface px-5 py-10 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/25" />
        <Wand2 size={28} className="relative text-accent" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[22px] font-extrabold">Criando o seu vídeo…</h2>
        <p className="m-0 text-[14px] text-muted">Leva uns 15 segundos. Já já ele aparece aqui pra você assistir.</p>
      </div>
      <ol className="m-0 flex w-full max-w-[340px] list-none flex-col gap-2.5 p-0 text-left">
        {STEPS.map((s, i) => (
          <li key={s} className={cx('flex items-center gap-3 text-[14.5px] transition-colors', i <= n ? 'text-ink' : 'text-subtle')}>
            <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', i < n ? 'bg-accent text-accent-ink' : i === n ? 'bg-accent-soft text-accent' : 'bg-surface-2')}>
              {i < n ? <Check size={15} strokeWidth={3} /> : i === n ? <LoaderCircle size={15} className="animate-spin" /> : <span className="text-[12px] font-bold">{i + 1}</span>}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------- gravação (tela cheia com o vídeo sendo gravado) ---------- */
function Recorder({ roteiro, visual, trilha, onClose, onSaved }: { roteiro: Roteiro; visual: Visual; trilha: Trilha; onClose: () => void; onSaved: (blob: Blob, ext: string, mime: string) => Promise<boolean> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [prog, setProg] = useState(0)
  const [phase, setPhase] = useState<'gravando' | 'salvando' | 'pronto' | 'erro'>('gravando')
  const [file, setFile] = useState<{ url: string; ext: string; saved: boolean } | null>(null)
  const cancel = useRef<() => void>(() => {})
  const total = duracao(roteiro)
  const nome = (roteiro.titulo || 'video-do-produto')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const job = gravar(c, roteiro, visual, trilha, (s) => setProg(s))
    cancel.current = job.cancel
    job.done
      .then(async (g) => {
        const url = URL.createObjectURL(g.blob)
        setFile({ url, ext: g.ext, saved: false })
        // baixa na hora
        const a = document.createElement('a')
        a.href = url
        a.download = `${nome || 'video'}.${g.ext}`
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
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-[#ef4444]" /> Gravando
              </Badge>
              <h2 className="m-0 font-display text-[22px] font-extrabold">Gravando o seu vídeo</h2>
              <p className="m-0 text-[14.5px] text-muted">A gravação leva o tempo do vídeo ({Math.round(total)}s). Deixa essa tela aberta: se você trocar de aba, ela pausa e continua quando voltar.</p>
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
                <a href={file.url} download={`${nome || 'video'}.${file.ext}`} className="press inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-bold text-accent-ink no-underline">
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

/* ---------- a aba completa ---------- */
export function ProductVideoStudio() {
  const { business, addLocalItem, reloadLibrary } = useBusiness()
  const { live, credits, addCredits, reload } = useStore()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [proj, setProj] = useState<Projeto>(() => {
    const base: Projeto = {
      fotos: [],
      produto: business.sells ? business.sells.split(/[,.;]/)[0].trim().slice(0, 80) : '',
      oferta: '',
      destaque: '',
      duracao: 30,
      trilha: 'animada',
      chamada: business.socials.whatsapp ? CHAMADAS[0] : CHAMADAS[1],
    }
    try {
      const saved = sessionStorage.getItem(PROJ_KEY)
      const pedido = sessionStorage.getItem(PRODUTO_PEDIDO)
      if (pedido) {
        sessionStorage.removeItem(PRODUTO_PEDIDO)
        const prev = saved ? (JSON.parse(saved) as Projeto) : null
        return { ...base, fotos: prev?.fotos ?? [], destaque: pedido.slice(0, 600) }
      }
      if (saved) return { ...base, ...(JSON.parse(saved) as Projeto) }
    } catch {
      /* sem armazenamento */
    }
    return base
  })
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const [usingSample, setUsingSample] = useState(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(PROJ_KEY, JSON.stringify(proj))
    } catch {
      /* fotos grandes demais pra guardar: segue sem */
    }
  }, [proj])

  const fotoSrcs = proj.fotos.length ? proj.fotos : usingSample ? [SAMPLE_PHOTO] : []
  const imgs = useImages(fotoSrcs)
  const visual = useBrandVisual(business, imgs, proj.chamada)
  const set = (p: Partial<Projeto>) => setProj((x) => ({ ...x, ...p }))

  async function addPhotos(list: FileList | null) {
    if (!list) return
    const out: string[] = []
    for (const f of Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, 4 - proj.fotos.length)) {
      try {
        out.push(await shrinkImage(f, 1200))
      } catch {
        /* imagem ruim */
      }
    }
    setUsingSample(false)
    set({ fotos: [...proj.fotos, ...out].slice(0, 4) })
  }

  async function generate() {
    if (busy) return
    if (proj.produto.trim().length < 2) return toast.show('Conta qual é o produto.')
    if (!proj.fotos.length && !usingSample) return toast.show('Manda pelo menos 1 foto do produto.')
    if (credits < CREDITS_PER_PRODUCT_VIDEO) return toast.show('Você não tem créditos suficientes.')
    setBusy(true)
    if (!live || !supabase) {
      addCredits(-CREDITS_PER_PRODUCT_VIDEO, 'Vídeo do produto')
      await new Promise((r) => window.setTimeout(r, 4200))
      set({ roteiro: demoRoteiro(proj) })
      setBusy(false)
      return
    }
    const { data, error } = await supabase.functions.invoke('video-produto', { body: { produto: proj.produto, oferta: proj.oferta, destaque: proj.destaque, duracao: proj.duracao } })
    setBusy(false)
    reload()
    if (error || !data?.roteiro) {
      let code = ''
      try {
        const ctx = (error as { context?: Response } | null)?.context
        code = String((ctx ? await ctx.json() : null)?.error ?? '')
      } catch {
        /* sem detalhe */
      }
      return toast.show(code === 'creditos_insuficientes' ? 'Seus créditos acabaram.' : 'Não consegui criar o roteiro agora. Seus créditos foram devolvidos.')
    }
    set({ roteiro: data.roteiro as Roteiro })
  }

  function editScene(i: number, p: Partial<Cena>) {
    if (!proj.roteiro) return
    set({ roteiro: { ...proj.roteiro, cenas: proj.roteiro.cenas.map((c, k) => (k === i ? { ...c, ...p } : c)) } })
  }

  async function saveToLibrary(blob: Blob, ext: string, mime: string) {
    const r = proj.roteiro
    if (!r) return false
    const capa = await poster(r, visual)
    const meta = { roteiro: r, produto: proj.produto, trilha: proj.trilha, estilo: 'produto' }
    if (!live || !supabase) {
      const prev = capa ? await new Promise<string>((res) => {
        const fr = new FileReader()
        fr.onload = () => res(String(fr.result))
        fr.readAsDataURL(capa)
      }) : undefined
      addLocalItem({ kind: 'video', module: 'video-produto', title: r.titulo, preview: prev, file: URL.createObjectURL(blob), body: r.legenda, meta })
      return true
    }
    const { data: s } = await supabase.auth.getSession()
    const uid = s.session?.user.id
    if (!uid) return false
    const base = `${uid}/videos/produto-${Date.now()}`
    const up = await supabase.storage.from('media').upload(`${base}.${ext}`, blob, { contentType: mime })
    if (up.error) return false
    let previewPath: string | null = null
    if (capa) {
      const pu = await supabase.storage.from('media').upload(`${base}-capa.jpg`, capa, { contentType: 'image/jpeg' })
      if (!pu.error) previewPath = `${base}-capa.jpg`
    }
    const { error } = await supabase.from('library_items').insert({ user_id: uid, kind: 'video', module: 'video-produto', title: r.titulo, preview_path: previewPath, file_path: `${base}.${ext}`, body: r.legenda ?? null, meta })
    if (error) return false
    reloadLibrary()
    return true
  }

  /* ---------- tela: resultado ---------- */
  if (busy) return <Generating />
  if (proj.roteiro) {
    const r = proj.roteiro
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <VideoPlayer roteiro={r} visual={visual} trilha={proj.trilha} className="mx-auto max-w-[380px] border border-line-strong" />
          <Button size="lg" onClick={() => (canRecord() ? setRecording(true) : toast.show('Seu navegador não grava vídeo. Abre no Chrome ou no Safari atualizado.'))} className="w-full">
            <Download size={18} /> Baixar vídeo
          </Button>
          <p className="m-0 text-center text-[12.5px] text-muted">Baixar e mudar textos não gasta crédito.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <Badge tone="accent" className="self-start">
                <Check size={13} /> Roteiro pronto
              </Badge>
              <h2 className="m-0 font-display text-[22px] font-extrabold leading-tight">{r.titulo}</h2>
              <p className="m-0 text-[14px] text-muted">Aperta o play pra assistir. Quer mudar alguma frase? Edita aqui embaixo que o vídeo muda na hora.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => set({ roteiro: undefined })}>
                <ArrowLeft size={16} /> Voltar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="flex items-center gap-2 text-[13px] font-bold text-soft">
              <Music2 size={15} /> Música
            </span>
            <div className="flex flex-wrap gap-2">
              {TRILHAS.map((t) => (
                <button key={t.id} type="button" onClick={() => set({ trilha: t.id })} aria-pressed={proj.trilha === t.id} className={cx('press min-h-10 cursor-pointer rounded-full px-3.5 text-[13.5px] font-semibold', proj.trilha === t.id ? 'bg-ink text-bg' : 'border border-line-strong text-soft hover:text-ink')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {r.cenas.map((c, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent-text">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="flex items-center justify-between gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                    {CENA_LABEL[c.tipo]} <span className="font-semibold normal-case tracking-normal text-subtle">{c.segundos.toLocaleString('pt-BR')}s</span>
                  </span>
                  <label className="sr-only" htmlFor={`cena-${i}`}>
                    Texto da cena {i + 1}
                  </label>
                  <input id={`cena-${i}`} value={c.texto} maxLength={60} onChange={(e) => editScene(i, { texto: e.target.value })} className="min-h-11 w-full rounded-xl border border-line-strong bg-bg/70 px-3 text-[16px] font-semibold text-ink outline-none focus:border-accent sm:text-[15px]" />
                  {(c.apoio !== undefined || c.tipo !== 'oferta') && (
                    <input aria-label={`Frase de apoio da cena ${i + 1}`} value={c.apoio ?? ''} maxLength={90} placeholder="Frase pequena (opcional)" onChange={(e) => editScene(i, { apoio: e.target.value || undefined })} className="min-h-10 w-full rounded-xl border border-line bg-bg/40 px-3 text-[15px] text-soft outline-none placeholder:text-subtle focus:border-accent sm:text-[14px]" />
                  )}
                </div>
              </li>
            ))}
          </ol>

          {r.legenda && (
            <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
              <span className="text-[13px] font-bold text-soft">Legenda pro post</span>
              <p className="m-0 whitespace-pre-wrap text-[14.5px] text-soft">{r.legenda}</p>
              <Button
                variant="soft"
                size="sm"
                className="self-start"
                onClick={() => {
                  navigator.clipboard?.writeText(r.legenda ?? '').then(() => toast.show('Legenda copiada!'))
                }}
              >
                <CopyIcon size={14} /> Copiar legenda
              </Button>
            </div>
          )}

          <Button variant="secondary" onClick={generate} className="self-start">
            <RefreshCw size={16} /> Escrever outro roteiro · {CREDITS_PER_PRODUCT_VIDEO} créditos
          </Button>
        </div>

        {recording && <Recorder roteiro={r} visual={visual} trilha={proj.trilha} onClose={() => setRecording(false)} onSaved={saveToLibrary} />}
      </div>
    )
  }

  /* ---------- tela: formulário ---------- */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div className="rise flex flex-col gap-5 rounded-[24px] border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 font-display text-[22px] font-bold">Vídeo do produto</h2>
          <p className="m-0 text-[14.5px] text-muted">Seu produto em destaque, com texto animado, música e chamada pra ação. De 30 a 40 segundos, pronto pra postar. Não precisa de boneco.</p>
        </div>

        <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-3">
          {['Você manda as fotos e conta o produto', 'A IA escreve o roteiro que vende', 'Você assiste, ajusta e baixa'].map((s, i) => (
            <li key={s} className="flex items-center gap-2.5 rounded-xl bg-bg/50 px-3 py-2.5 text-[13px] font-medium text-soft sm:flex-col sm:items-start">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-accent-ink">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

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
            {usingSample && !proj.fotos.length && (
              <span className="relative aspect-square overflow-hidden rounded-xl border border-accent">
                <img src={SAMPLE_PHOTO} alt="Foto de exemplo" className="h-full w-full object-cover" />
                <span className="absolute inset-x-1 bottom-1 rounded-md bg-black/70 py-0.5 text-center text-[10.5px] font-semibold text-white">Exemplo</span>
              </span>
            )}
            {proj.fotos.length < 4 && (
              <button type="button" onClick={() => file.current?.click()} className="press flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-[12px] font-semibold text-muted hover:border-accent hover:text-ink">
                <ImagePlus size={22} /> Adicionar
              </button>
            )}
          </div>
          <p className="m-0 text-[12.5px] text-muted">
            Até 4 fotos. Foto do celular serve: fundo limpo e boa luz ficam melhores.{' '}
            {!proj.fotos.length && !usingSample && (
              <button type="button" onClick={() => setUsingSample(true)} className="cursor-pointer font-semibold text-accent-text underline-offset-2 hover:underline">
                Testar com uma foto de exemplo
              </button>
            )}
          </p>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" tabIndex={-1} onChange={(e) => (addPhotos(e.target.files), (e.target.value = ''))} />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">Qual é o produto?</span>
          <input value={proj.produto} maxLength={120} onChange={(e) => set({ produto: e.target.value })} placeholder="Ex.: decant de perfume importado 5 ml" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">
            Preço ou oferta <span className="font-normal text-muted">(opcional)</span>
          </span>
          <input value={proj.oferta} maxLength={60} onChange={(e) => set({ oferta: e.target.value })} placeholder="Ex.: R$ 39,90 · frete grátis hoje" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">
            O que você quer destacar? <span className="font-normal text-muted">(opcional)</span>
          </span>
          <textarea value={proj.destaque} rows={3} maxLength={600} onChange={(e) => set({ destaque: e.target.value })} placeholder="Ex.: é original, tirado do frasco lacrado na frente do cliente, cheiro dura o dia todo" className={cx(fieldCls, 'resize-none py-3')} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-ink">Duração</span>
            <div className="grid grid-cols-2 gap-2">
              {([30, 40] as const).map((d) => (
                <button key={d} type="button" aria-pressed={proj.duracao === d} onClick={() => set({ duracao: d })} className={cx('press min-h-11 cursor-pointer rounded-xl border-2 text-[14px] font-semibold', proj.duracao === d ? 'border-accent text-ink' : 'border-line text-muted hover:text-ink')}>
                  {d} segundos
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

        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-ink">Música</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TRILHAS.map((t) => (
              <button key={t.id} type="button" aria-pressed={proj.trilha === t.id} onClick={() => set({ trilha: t.id })} className={cx('press flex min-h-14 cursor-pointer flex-col items-start justify-center rounded-xl border-2 px-3 text-left', proj.trilha === t.id ? 'border-accent' : 'border-line hover:border-line-strong')}>
                <span className="text-[14px] font-semibold text-ink">{t.label}</span>
                <span className="text-[12px] text-muted">{t.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <Button size="lg" onClick={generate} disabled={busy} className="self-stretch sm:self-start">
          <Sparkles size={18} /> Criar meu vídeo · {CREDITS_PER_PRODUCT_VIDEO} créditos
        </Button>
      </div>

      <div className="rise rise-1 flex flex-col gap-3">
        <span className="flex items-center justify-between text-[14px] font-semibold text-soft">
          Olha um exemplo (aperta o play com som)
          <Badge tone="neutral">Exemplo</Badge>
        </span>
        <SampleProductVideo controls trilha="luxo" className="mx-auto max-w-[360px] border border-line-strong" />
      </div>
    </div>
  )
}
