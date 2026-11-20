// Estúdio de Imagem: foto de produto, post, story e banner com IA (Nano Banana).
import { useRef, useState } from 'react'
import { Download, ImagePlus, RotateCcw, Sparkles, X } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader } from '../components/Module'
import { Button, cx } from '../components/ui'
import { useBusiness } from '../lib/business'
import { CREDITS_PER_IMAGE } from '../lib/pricing'
import { shrinkImage, timeAgo, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

const FORMATOS = [
  { id: 'produto', label: 'Foto de produto', ratio: '1:1', box: 'aspect-square', w: 16, h: 16 },
  { id: 'post', label: 'Post', ratio: '4:5', box: 'aspect-[4/5]', w: 14, h: 17 },
  { id: 'story', label: 'Story / capa', ratio: '9:16', box: 'aspect-[9/16]', w: 11, h: 19 },
  { id: 'banner', label: 'Banner', ratio: '16:9', box: 'aspect-video', w: 20, h: 12 },
] as const
type Formato = (typeof FORMATOS)[number]['id']

const ERROS: Record<string, string> = {
  creditos_insuficientes: 'Você não tem créditos suficientes.',
  imagem_recusada: 'A IA não aceitou esse pedido. Tenta descrever de outro jeito.',
  sem_cota: 'A geração de imagem está fora do ar agora. Seus créditos foram devolvidos, tenta de novo daqui a pouco.',
  pedido_vazio: 'Mande uma foto ou descreva a imagem.',
}

const inputCls = 'min-h-12 w-full rounded-[14px] border border-line-strong bg-bg/70 px-4 text-[16px] text-ink outline-none transition-shadow placeholder:text-subtle focus:border-accent focus:shadow-[0_0_0_4px_#ff8a3d22]'

function readPrefill(): { pedido?: string; formato?: string } {
  try {
    const raw = sessionStorage.getItem('plotoon:imagem')
    sessionStorage.removeItem('plotoon:imagem')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Prévia (sem IA): monta uma imagem de exemplo com as cores da marca
async function demoImage(foto: string | null, cores: string[], ratio: string, texto: string) {
  const [w, h] = ratio === '9:16' ? [720, 1280] : ratio === '16:9' ? [1280, 720] : ratio === '4:5' ? [960, 1200] : [1024, 1024]
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, cores[0] ?? '#ffb08a')
  g.addColorStop(1, cores[1] ?? '#ff5da2')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,255,255,.18)'
  ctx.beginPath()
  ctx.arc(w * 0.8, h * 0.18, Math.min(w, h) * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,.35)'
  ctx.beginPath()
  ctx.ellipse(w / 2, h * 0.82, w * 0.32, h * 0.05, 0, 0, Math.PI * 2)
  ctx.fill()
  if (foto) {
    const img = await new Promise<HTMLImageElement>((ok) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.src = foto
    })
    const s = Math.min((w * 0.6) / img.width, (h * 0.6) / img.height)
    ctx.shadowColor = 'rgba(0,0,0,.35)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 20
    ctx.drawImage(img, (w - img.width * s) / 2, h * 0.78 - img.height * s, img.width * s, img.height * s)
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = `700 ${Math.round(Math.min(w, h) * 0.06)}px Arial`
    ctx.textAlign = 'center'
    ctx.fillText(texto.slice(0, 28) || 'Prévia', w / 2, h / 2)
  }
  return c.toDataURL('image/jpeg', 0.9)
}

export function ImagePage() {
  const { live, credits, addCredits, reload } = useStore()
  const { business, library, addLocalItem, reloadLibrary } = useBusiness()
  const pre = useState(readPrefill)[0]
  const [formato, setFormato] = useState<Formato>(FORMATOS.some((f) => f.id === pre.formato) ? (pre.formato as Formato) : 'produto')
  const [pedido, setPedido] = useState(pre.pedido ?? '')
  const [foto, setFoto] = useState<string | null>(null)
  const [marca, setMarca] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const f = FORMATOS.find((x) => x.id === formato)!
  const historico = library.filter((i) => i.kind === 'imagem').slice(0, 12)

  async function pick(fl: File | undefined) {
    if (!fl || !fl.type.startsWith('image/')) return
    try {
      setFoto(await shrinkImage(fl, 1600))
    } catch {
      setError('Não deu pra abrir essa foto.')
    }
  }

  async function gerar() {
    if (busy) return
    if (!foto && pedido.trim().length < 3) return setError(ERROS.pedido_vazio)
    if (credits < CREDITS_PER_IMAGE) return setError(ERROS.creditos_insuficientes)
    setError('')
    setBusy(true)
    setResult(null)
    if (!live || !supabase) {
      addCredits(-CREDITS_PER_IMAGE, 'Imagem com IA')
      await new Promise((r) => window.setTimeout(r, 1600))
      const url = await demoImage(foto, marca ? business.colors : [], f.ratio, pedido)
      setResult(url)
      addLocalItem({ kind: 'imagem', module: 'imagem', title: `${f.label}${pedido ? `: ${pedido.slice(0, 50)}` : ''}`, preview: url, file: url, meta: { pedido, formato } })
      setBusy(false)
      return
    }
    const { data, error: err } = await supabase.functions.invoke('imagem', { body: { formato, pedido, foto, marca } })
    setBusy(false)
    if (err || !data?.imagem) {
      let code = ''
      try {
        const ctx = (err as { context?: Response } | null)?.context
        code = String((ctx ? await ctx.json() : null)?.error ?? '')
      } catch {
        /* sem detalhe */
      }
      await reload()
      return setError(ERROS[code] ?? 'Não consegui gerar agora. Seus créditos foram devolvidos, tenta de novo.')
    }
    setResult(data.imagem)
    reload()
    reloadLibrary()
  }

  return (
    <AppShell active="estudio-imagem">
      <ModuleHeader id="estudio-imagem" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rise flex flex-col gap-5 rounded-[24px] border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-soft">Foto do produto (opcional)</span>
            {foto ? (
              <div className="relative self-start">
                <img src={foto} alt="Foto do produto" className="h-32 w-32 rounded-2xl border border-line-strong object-cover" />
                <button type="button" onClick={() => setFoto(null)} aria-label="Tirar a foto" className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-ink text-bg">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => file.current?.click()} className="press flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line-strong bg-bg/50 px-4 py-5 text-center hover:border-accent-line">
                <ImagePlus size={26} className="text-sky" />
                <span className="text-[14.5px] font-semibold">Mande a foto do celular mesmo</span>
                <span className="text-[12.5px] text-muted">A IA mantém o produto e troca o fundo, a luz e a cena.</span>
              </button>
            )}
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />
          </div>

          <div role="radiogroup" aria-label="Formato" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FORMATOS.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={formato === x.id} onClick={() => setFormato(x.id)} className={cx('press flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-center', formato === x.id ? 'border-accent bg-[#17130f]' : 'border-line bg-bg/50 hover:border-line-strong')}>
                <span className={cx('rounded-[3px] border-2', formato === x.id ? 'border-accent' : 'border-muted')} style={{ width: x.w, height: x.h }} />
                <span className="text-[12.5px] font-semibold leading-tight text-ink">{x.label}</span>
                <span className="text-[11px] text-muted">{x.ratio}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="img-pedido" className="text-[14px] font-semibold text-soft">
              Como você quer a imagem?
            </label>
            <textarea id="img-pedido" rows={3} value={pedido} maxLength={500} onChange={(e) => setPedido(e.target.value)} placeholder="Ex.: o bolo numa mesa de madeira clara, luz de fim de tarde, com morangos em volta" className={cx(inputCls, 'resize-none py-3')} />
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={marca} onChange={(e) => setMarca(e.target.checked)} className="h-5 w-5 accent-[#ff8a3d]" />
            <span className="text-[14px] text-soft">Usar as cores da minha marca</span>
            {business.colors.length > 0 && (
              <span className="flex gap-1">
                {business.colors.map((c) => (
                  <span key={c} className="h-4 w-4 rounded-full border border-white/20" style={{ background: c }} />
                ))}
              </span>
            )}
          </label>

          {error && (
            <p role="alert" className="m-0 text-[14px] text-[#fca5a5]">
              {error}
            </p>
          )}
          <Button size="lg" onClick={gerar} disabled={busy} className="self-stretch sm:self-start">
            <Sparkles size={18} /> {busy ? 'Criando a imagem…' : `Gerar imagem · ${CREDITS_PER_IMAGE} créditos`}
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <div className={cx('relative mx-auto w-full max-w-[460px] overflow-hidden rounded-[22px] border border-line-strong bg-[#0f1218]', f.box)}>
            {busy && <span className="shimmer absolute inset-0" />}
            {result ? (
              <img src={result} alt="Imagem gerada" className="pop absolute inset-0 h-full w-full object-cover" />
            ) : (
              !busy && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <Sparkles size={26} className="text-sky" />
                  <span className="text-[15px] font-semibold">Sua imagem aparece aqui</span>
                  <span className="text-[13px] text-muted">
                    {f.label} · {f.ratio}
                  </span>
                </span>
              )
            )}
          </div>
          {result && (
            <div className="flex flex-wrap justify-center gap-2">
              <a href={result} target="_blank" rel="noreferrer" download className="press inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-bold text-accent-ink no-underline">
                <Download size={16} /> Baixar
              </a>
              <Button variant="secondary" onClick={gerar} disabled={busy}>
                <RotateCcw size={16} /> Gerar outra
              </Button>
            </div>
          )}
        </section>
      </div>

      {historico.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-[20px] font-bold">Suas imagens</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {historico.map((h) => (
              <a key={h.id} href={h.file ?? h.preview} target="_blank" rel="noreferrer" className="group flex flex-col gap-1.5 text-ink no-underline">
                <span className="relative block aspect-square overflow-hidden rounded-xl border border-line-strong bg-bg">
                  {h.preview && <img src={h.preview} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                </span>
                <span className="truncate text-[12px] text-muted">{timeAgo(h.createdAt)}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  )
}
