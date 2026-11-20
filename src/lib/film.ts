// Lado da página do "filme": prepara fotos e fontes, conversa com o worker e entrega cada quadro.
import type { InitMsg, SceneDef } from './filmWorker'
import { playMusic, type Trilha } from './music'

export type { SceneDef }
export type Cena = SceneDef & { titulo?: string; descricao?: string }
export type Filme = {
  titulo: string
  conceito?: string
  legenda?: string
  paleta: string[]
  trilha?: Trilha
  cenas: Cena[]
}

const FONTES: Array<{ family: string; weight: string; style?: string; file: string }> = [
  { family: 'Barlow Condensed', weight: '800', file: 'barlow-condensed-latin-800-normal.woff2' },
  { family: 'Barlow Condensed', weight: '700', file: 'barlow-condensed-latin-700-normal.woff2' },
  { family: 'Inter Tight', weight: '400', file: 'inter-tight-latin-400-normal.woff2' },
  { family: 'Inter Tight', weight: '600', file: 'inter-tight-latin-600-normal.woff2' },
  { family: 'Inter Tight', weight: '800', file: 'inter-tight-latin-800-normal.woff2' },
  { family: 'Instrument Serif', weight: '400', file: 'instrument-serif-latin-400-normal.woff2' },
  { family: 'Instrument Serif', weight: '400', style: 'italic', file: 'instrument-serif-latin-400-italic.woff2' },
  { family: 'JetBrains Mono', weight: '500', file: 'jetbrains-mono-latin-500-normal.woff2' },
  { family: 'Unbounded', weight: '800', file: 'unbounded-latin-800-normal.woff2' },
  { family: 'Sora', weight: '400', file: 'sora-latin-400-normal.woff2' },
  { family: 'Sora', weight: '700', file: 'sora-latin-700-normal.woff2' },
]

let fontCache: Promise<InitMsg['fonts']> | null = null
function loadFonts() {
  if (!fontCache)
    fontCache = Promise.all(
      FONTES.map(async (f) => {
        try {
          const r = await fetch(`/fonts/${f.file}`)
          return { family: f.family, weight: f.weight, style: f.style, data: await r.arrayBuffer() }
        } catch {
          return null
        }
      }),
    ).then((l) => l.filter((x): x is NonNullable<typeof x> => !!x))
  return fontCache
}

async function toBitmap(src: string | Blob | CanvasImageSource, max = 1400) {
  try {
    let blob: Blob | null = null
    if (typeof src === 'string') blob = await (await fetch(src)).blob()
    else if (src instanceof Blob) blob = src
    const bmp = blob ? await createImageBitmap(blob) : await createImageBitmap(src as ImageBitmapSource)
    if (Math.max(bmp.width, bmp.height) <= max) return bmp
    const k = max / Math.max(bmp.width, bmp.height)
    const small = await createImageBitmap(bmp, { resizeWidth: Math.round(bmp.width * k), resizeHeight: Math.round(bmp.height * k), resizeQuality: 'high' })
    bmp.close()
    return small
  } catch {
    return null
  }
}

export function duracaoFilme(f: Filme) {
  return f.cenas.reduce((s, c) => s + c.dur, 0)
}

export function canRunFilm() {
  return typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined' && typeof createImageBitmap !== 'undefined'
}

type Marca = InitMsg['marca']

/** Um "projetor": um worker com as cenas carregadas, que devolve o quadro de qualquer segundo. */
export class Projetor {
  private w!: Worker
  private seq = 0
  private waiting = new Map<number, (b: ImageBitmap | null) => void>()
  ready: Promise<void>
  onErro?: (i: number, msg: string) => void

  constructor(filme: Filme, fotos: Array<string | Blob | CanvasImageSource>, logo: string | null | undefined, marca: Marca) {
    this.w = new Worker(new URL('./filmWorker.ts', import.meta.url), { type: 'module' })
    let ok: () => void = () => {}
    this.ready = new Promise<void>((r) => (ok = r))
    this.w.onmessage = (e) => {
      const m = e.data
      if (m.type === 'frame') {
        const cb = this.waiting.get(m.id)
        this.waiting.delete(m.id)
        cb?.(m.bitmap ?? null)
      } else if (m.type === 'pronto') ok()
      else if (m.type === 'erro') this.onErro?.(m.i, m.msg)
    }
    ;(async () => {
      const [fonts, bmps, logoBmp] = await Promise.all([loadFonts(), Promise.all(fotos.map((f) => toBitmap(f))), logo ? toBitmap(logo, 600) : Promise.resolve(null)])
      const photos = bmps.filter((b): b is ImageBitmap => !!b)
      const msg: InitMsg = {
        type: 'init',
        scenes: filme.cenas.map((c) => ({ code: c.code, dur: c.dur, transicao: c.transicao, texto: c.texto })),
        photos,
        logo: logoBmp,
        palette: filme.paleta.length ? filme.paleta : ['#ff8a3d', '#ffd000'],
        marca,
        fonts: fonts.map((f) => ({ ...f, data: f.data.slice(0) })),
      }
      this.w.postMessage(msg)
    })()
  }

  frame(t: number, w: number, h: number) {
    const id = ++this.seq
    return new Promise<ImageBitmap | null>((res) => {
      this.waiting.set(id, res)
      this.w.postMessage({ type: 'frame', id, t, w, h })
    })
  }

  trocarCena(i: number, def: SceneDef) {
    this.w.postMessage({ type: 'trocar', i, def })
  }

  dispose() {
    this.w.terminate()
    this.waiting.forEach((cb) => cb(null))
    this.waiting.clear()
  }
}

/* ---------- gravação ---------- */
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.4D401F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc3,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return list.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}
export function canRecordFilm() {
  return canRunFilm() && typeof MediaRecorder !== 'undefined' && !!pickMime() && typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

export type GravacaoFilme = { blob: Blob; mime: string; ext: 'mp4' | 'webm' }

/**
 * Grava o filme quadro a quadro, no ritmo do relógio do áudio. Chame direto no clique.
 * Se a pessoa trocar de aba, pausa e continua quando ela voltar.
 */
export function gravarFilme(canvas: HTMLCanvasElement, proj: Projetor, filme: Filme, trilha: Trilha, onProgress: (s: number, total: number) => void) {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ac = new AC()
  const total = duracaoFilme(filme)
  const mime = pickMime()
  let cancelled = false
  let cancelFn = () => {
    cancelled = true
  }
  const done = (async () => {
    await ac.resume().catch(() => {})
    await proj.ready
    const ctx = canvas.getContext('2d')!
    const first = await proj.frame(0, canvas.width, canvas.height)
    if (first) ctx.drawImage(first, 0, 0)
    first?.close()
    const stream = canvas.captureStream(30)
    const dest = ac.createMediaStreamDestination()
    if (trilha !== 'nenhuma') dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr))
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000 })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    const stopped = new Promise<void>((res) => (rec.onstop = () => res()))
    const vis = () => {
      if (document.hidden) {
        if (rec.state === 'recording') rec.pause()
        ac.suspend()
      } else
        ac.resume().then(() => {
          if (rec.state === 'paused') rec.resume()
        })
    }
    document.addEventListener('visibilitychange', vis)
    rec.start(250)
    const t0 = ac.currentTime + 0.05
    const stopMusic = playMusic(ac, dest, trilha, total, 0)
    await new Promise<void>((resolve) => {
      let busy = false
      let raf = 0
      cancelFn = () => {
        cancelled = true
        cancelAnimationFrame(raf)
        resolve()
      }
      const loop = () => {
        const t = Math.max(0, ac.currentTime - t0)
        if (t >= total + 0.15) return resolve()
        if (!busy) {
          busy = true
          proj.frame(Math.min(t, total), canvas.width, canvas.height).then((b) => {
            if (b) {
              ctx.drawImage(b, 0, 0)
              b.close()
            }
            busy = false
          })
        }
        onProgress(Math.min(t, total), total)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })
    stopMusic()
    document.removeEventListener('visibilitychange', vis)
    if (rec.state !== 'inactive') rec.stop()
    await stopped
    stream.getTracks().forEach((tr) => tr.stop())
    ac.close().catch(() => {})
    if (cancelled) throw new Error('cancelado')
    const base = mime.split(';')[0] || 'video/webm'
    return { blob: new Blob(chunks, { type: base }), mime: base, ext: base.includes('mp4') ? 'mp4' : 'webm' } as GravacaoFilme
  })()
  return { done, cancel: () => cancelFn() }
}

/** Capa (um quadro) em JPEG. */
export async function capaFilme(proj: Projetor, at: number) {
  await proj.ready
  const b = await proj.frame(at, 540, 960)
  if (!b) return null
  const c = document.createElement('canvas')
  c.width = 540
  c.height = 960
  c.getContext('2d')!.drawImage(b, 0, 0)
  b.close()
  return new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85))
}
