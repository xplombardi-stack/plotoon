/// <reference lib="webworker" />
// Roda o código das cenas que o Claude escreveu, longe da página (sem acesso à conta, à tela nem à internet).
// Desenha cada quadro num OffscreenCanvas e devolve a imagem pronta pra página.
import * as THREE from 'three'

declare const self: DedicatedWorkerGlobalScope

// trava o que o código das cenas não precisa: rede, banco do navegador, outros workers
for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', 'EventSource', 'Worker', 'SharedWorker', 'BroadcastChannel', 'WebTransport']) {
  try {
    Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false })
  } catch {
    /* já travado */
  }
}
const post = self.postMessage.bind(self)

export type Transicao = 'corte' | 'fade' | 'zoom' | 'flash' | 'deslize'
export type SceneDef = { code: string; dur: number; transicao?: Transicao; texto?: string }
export type InitMsg = {
  type: 'init'
  scenes: SceneDef[]
  photos: ImageBitmap[]
  logo: ImageBitmap | null
  palette: string[]
  marca: { nome: string; arroba?: string; whatsapp?: string; chamada?: string }
  fonts: Array<{ family: string; weight: string; style?: string; data: ArrayBuffer }>
  grain?: boolean
}
type FrameMsg = { type: 'frame'; id: number; t: number; w: number; h: number }

const LW = 1080
const LH = 1920

/* ---------- ajudantes que as cenas usam ---------- */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = {
  out: (x: number) => 1 - Math.pow(1 - clamp(x), 3),
  in: (x: number) => Math.pow(clamp(x), 3),
  inOut: (x: number) => {
    const k = clamp(x)
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
  },
  back: (x: number) => {
    const c = 1.70158
    const t = clamp(x) - 1
    return 1 + (c + 1) * t * t * t + c * t * t
  },
  elastic: (x: number) => {
    const k = clamp(x)
    if (k === 0 || k === 1) return k
    return Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
  },
  expo: (x: number) => (clamp(x) === 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x))),
}
const prog = (t: number, a: number, b: number, e: (x: number) => number = ease.out) => e(clamp((t - a) / Math.max(1e-6, b - a)))
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
function noise(x: number, y = 0) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const s = (a: number, b: number) => rand(a * 57 + b * 131)
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  return lerp(lerp(s(ix, iy), s(ix + 1, iy), u), lerp(s(ix, iy + 1), s(ix + 1, iy + 1), u), v)
}
type C2D = OffscreenCanvasRenderingContext2D
function roundRect(ctx: C2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}
function cover(ctx: C2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, zoom = 1, fx = 0.5, fy = 0.5) {
  if (!img) return
  const k = Math.max(w / img.width, h / img.height) * zoom
  const dw = img.width * k
  const dh = img.height * k
  ctx.drawImage(img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh)
}
function wrap(ctx: C2D, text: string, maxW: number) {
  const words = String(text).split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w
    if (cur && ctx.measureText(t).width > maxW) {
      lines.push(cur)
      cur = w
    } else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}
function fit(ctx: C2D, text: string, maxW: number, size: number, font: string, weight = '800', minSize = 24) {
  let s = size
  ctx.font = `${weight} ${s}px "${font}"`
  while (ctx.measureText(text).width > maxW && s > minSize) {
    s -= 2
    ctx.font = `${weight} ${s}px "${font}"`
  }
  return s
}
function hexA(hex: string, a: number) {
  const h = String(hex).replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h.slice(0, 6), 16)
  if (Number.isNaN(n)) return `rgba(255,255,255,${a})`
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/* ---------- estado ---------- */
let out: OffscreenCanvas | null = null
let octx: C2D | null = null
let buf: OffscreenCanvas | null = null
let bctx: C2D | null = null
let gl: OffscreenCanvas | null = null
let renderer: THREE.WebGLRenderer | null = null
let glFailed = false
let scenes: Array<{ def: SceneDef; frame: ((ctx: C2D, t: number, p: number, d: number) => void) | null; error?: string }> = []
let S: Record<string, unknown> = {}
const texCache = new Map<ImageBitmap, THREE.Texture>()
const reported = new Set<number>()
let grain: OffscreenCanvas | null = null
let useGrain = true

function ensureGL(w: number, h: number) {
  if (glFailed) return null
  if (!gl) {
    try {
      gl = new OffscreenCanvas(w, h)
      renderer = new THREE.WebGLRenderer({ canvas: gl as unknown as HTMLCanvasElement, antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setPixelRatio(1)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.1
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
    } catch {
      glFailed = true
      return null
    }
  }
  if (gl.width !== w || gl.height !== h) renderer!.setSize(w, h, false)
  return renderer
}

function texture(img: ImageBitmap | null | undefined) {
  if (!img) return null
  let t = texCache.get(img)
  if (!t) {
    // passa por um canvas pra textura ficar do lado certo em qualquer navegador
    const c = new OffscreenCanvas(img.width, img.height)
    c.getContext('2d')!.drawImage(img, 0, 0)
    t = new THREE.CanvasTexture(c as unknown as HTMLCanvasElement)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    texCache.set(img, t)
  }
  return t
}

function grainTile() {
  if (grain) return grain
  grain = new OffscreenCanvas(256, 256)
  const g = grain.getContext('2d')!
  const d = g.createImageData(256, 256)
  for (let i = 0; i < d.data.length; i += 4) {
    const v = Math.random() * 255
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v
    d.data[i + 3] = 255
  }
  g.putImageData(d, 0, 0)
  return grain
}

function resetCtx(ctx: C2D, sx: number, sy: number) {
  ctx.setTransform(sx, 0, 0, sy, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.filter = 'none'
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  try {
    ctx.letterSpacing = '0px'
  } catch {
    /* navegador antigo */
  }
}

function fallback(ctx: C2D, i: number, t: number) {
  const pal = S.colors as string[]
  const g = ctx.createLinearGradient(0, 0, 0, LH)
  g.addColorStop(0, '#0b0b10')
  g.addColorStop(1, '#050507')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, LW, LH)
  const halo = ctx.createRadialGradient(LW / 2, LH * 0.45, 0, LW / 2, LH * 0.45, 900)
  halo.addColorStop(0, hexA(pal[0], 0.35))
  halo.addColorStop(1, hexA(pal[0], 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, LW, LH)
  const txt = scenes[i]?.def.texto ?? ''
  if (txt) {
    const p = ease.out(t / 0.6)
    ctx.globalAlpha = p
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    const s = fit(ctx, txt.toUpperCase(), 900, 120, 'Barlow Condensed')
    ctx.font = `800 ${s}px "Barlow Condensed"`
    wrap(ctx, txt.toUpperCase(), 900)
      .slice(0, 4)
      .forEach((l, k) => ctx.fillText(l, LW / 2, LH * 0.45 + k * s * 1.02 + (1 - p) * 40))
  }
}

function drawScene(ctx: C2D, i: number, lt: number, sx: number, sy: number) {
  const s = scenes[i]
  ctx.save()
  resetCtx(ctx, sx, sy)
  try {
    if (!s.frame) throw new Error(s.error ?? 'cena sem código')
    s.frame(ctx, Math.max(0, lt), clamp(lt / s.def.dur), s.def.dur)
  } catch (e) {
    ctx.restore()
    ctx.save()
    resetCtx(ctx, sx, sy)
    fallback(ctx, i, lt)
    if (!reported.has(i)) {
      reported.add(i)
      post({ type: 'erro', i, msg: String((e as Error)?.message ?? e).slice(0, 400) })
    }
  }
  ctx.restore()
}

function frameAt(t: number, w: number, h: number) {
  if (!out || out.width !== w || out.height !== h) {
    out = new OffscreenCanvas(w, h)
    octx = out.getContext('2d')!
    buf = new OffscreenCanvas(w, h)
    bctx = buf.getContext('2d')!
  }
  const ctx = octx!
  const sx = w / LW
  const sy = h / LH
  ;(S as { _sx?: number })._sx = sx
  ;(S as { _w?: number; _h?: number })._w = w
  ;(S as { _w?: number; _h?: number })._h = h
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  if (!scenes.length) return out.transferToImageBitmap()

  let start = 0
  let i = 0
  for (; i < scenes.length - 1; i++) {
    if (t < start + scenes[i].def.dur) break
    start += scenes[i].def.dur
  }
  const lt = t - start
  const tr = scenes[i].def.transicao ?? 'fade'
  const TD = tr === 'flash' ? 0.25 : 0.5
  if (i > 0 && lt < TD && tr !== 'corte') {
    const k = ease.inOut(lt / TD)
    const prev = i - 1
    // cena que sai continua andando por baixo
    drawScene(bctx!, prev, scenes[prev].def.dur + lt, sx, sy)
    if (tr === 'fade' || tr === 'flash') {
      ctx.drawImage(buf!, 0, 0)
      ctx.save()
      ctx.globalAlpha = tr === 'flash' ? 1 : k
      drawSceneTo(ctx, i, lt, sx, sy)
      ctx.restore()
      if (tr === 'flash') {
        ctx.fillStyle = `rgba(255,255,255,${(1 - k) * 0.85})`
        ctx.fillRect(0, 0, w, h)
      }
    } else if (tr === 'zoom') {
      ctx.save()
      ctx.globalAlpha = 1 - k
      ctx.translate(w / 2, h / 2)
      ctx.scale(1 + k * 0.25, 1 + k * 0.25)
      ctx.drawImage(buf!, -w / 2, -h / 2)
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = k
      ctx.translate(w / 2, h / 2)
      const z = 0.85 + 0.15 * k
      ctx.scale(z, z)
      ctx.translate(-w / 2, -h / 2)
      drawSceneTo(ctx, i, lt, sx, sy)
      ctx.restore()
    } else {
      // deslize: uma empurra a outra pra cima
      ctx.drawImage(buf!, 0, -k * h)
      ctx.save()
      ctx.translate(0, (1 - k) * h)
      drawSceneTo(ctx, i, lt, sx, sy)
      ctx.restore()
    }
  } else drawScene(ctx, i, lt, sx, sy)

  if (useGrain) {
    const tile = grainTile()
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 0.05
    ctx.globalCompositeOperation = 'overlay'
    const f = Math.floor(t * 24)
    const ox = Math.floor(rand(f) * 256)
    const oy = Math.floor(rand(f + 3) * 256)
    for (let x = -ox; x < w; x += 256) for (let y = -oy; y < h; y += 256) ctx.drawImage(tile, x, y)
    ctx.restore()
  }
  return out.transferToImageBitmap()
}

// desenha uma cena respeitando a transformação que já está no contexto (pra zoom e deslize)
function drawSceneTo(ctx: C2D, i: number, lt: number, sx: number, sy: number) {
  const m = ctx.getTransform()
  const s = scenes[i]
  ctx.save()
  resetCtx(ctx, 1, 1)
  ctx.setTransform(m.a * sx, m.b, m.c, m.d * sy, m.e, m.f)
  try {
    if (!s.frame) throw new Error(s.error ?? 'cena sem código')
    s.frame(ctx, Math.max(0, lt), clamp(lt / s.def.dur), s.def.dur)
  } catch (e) {
    ctx.restore()
    ctx.save()
    ctx.setTransform(m.a * sx, m.b, m.c, m.d * sy, m.e, m.f)
    fallback(ctx, i, lt)
    if (!reported.has(i)) {
      reported.add(i)
      post({ type: 'erro', i, msg: String((e as Error)?.message ?? e).slice(0, 400) })
    }
  }
  ctx.restore()
}

function compile(def: SceneDef, i: number) {
  try {
    const code = def.code.replace(/^\s*```(?:js|javascript)?[ \t]*\n/, '').replace(/```\s*$/, '')
    const factory = new Function('S', 'THREE', `"use strict";\n${code}`) as (S: unknown, T: unknown) => unknown
    const frame = factory(S, THREE)
    if (typeof frame !== 'function') throw new Error('o código da cena não devolveu a função do quadro')
    return { def, frame: frame as (ctx: C2D, t: number, p: number, d: number) => void }
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).slice(0, 400)
    post({ type: 'erro', i, msg })
    return { def, frame: null, error: msg }
  }
}

async function init(m: InitMsg) {
  // fontes
  const fontSet = (self as unknown as { fonts?: FontFaceSet }).fonts
  if (fontSet)
    await Promise.all(
      m.fonts.map(async (f) => {
        try {
          const face = new FontFace(f.family, f.data, { weight: f.weight, style: f.style ?? 'normal' })
          await face.load()
          fontSet.add(face)
        } catch {
          /* segue sem essa fonte */
        }
      }),
    )
  useGrain = m.grain !== false
  texCache.clear()
  reported.clear()
  const photos = m.photos
  S = {
    W: LW,
    H: LH,
    SAFE: { top: 250, bottom: 1570, left: 80, right: 1000 },
    THREE,
    colors: m.palette,
    marca: m.marca,
    photos,
    photo: (i: number) => (photos.length ? photos[((i % photos.length) + photos.length) % photos.length] : null),
    logo: m.logo,
    texture: (i: number) => texture(photos.length ? photos[((i % photos.length) + photos.length) % photos.length] : null),
    logoTexture: () => texture(m.logo),
    fonts: { titulo: 'Barlow Condensed', texto: 'Inter Tight', elegante: 'Instrument Serif', mono: 'JetBrains Mono', forte: 'Unbounded', moderno: 'Sora' },
    ease,
    prog,
    clamp,
    lerp,
    rand,
    noise,
    hexA,
    roundRect,
    cover,
    wrap,
    fit,
    // ponto 3D -> posição na tela (1080x1920), pra encaixar texto e brilhos perto do objeto
    toScreen: (v: THREE.Vector3, camera: THREE.Camera) => {
      camera.updateMatrixWorld()
      const q = v.clone().project(camera)
      return { x: ((q.x + 1) / 2) * LW, y: ((1 - q.y) / 2) * LH, atras: q.z > 1 }
    },
    // distância da câmera pra um objeto de altura h ocupar a fração f da altura da tela
    distPara: (camera: THREE.PerspectiveCamera, h: number, f = 0.4) => h / f / (2 * Math.tan(((camera.fov ?? 35) * Math.PI) / 360)),
    // desenha uma cena 3D no quadro inteiro (por cima do que já foi desenhado)
    render3D: (ctx: C2D, scene: THREE.Scene, camera: THREE.Camera) => {
      const w = (S as { _w: number })._w
      const h = (S as { _h: number })._h
      const r = ensureGL(w, h)
      if (!r) return false
      r.setClearColor(0x000000, 0)
      r.render(scene, camera)
      const tf = ctx.getTransform()
      ctx.save()
      ctx.setTransform(tf.a / ((S as { _sx: number })._sx || 1), tf.b, tf.c, tf.d / ((S as { _sx: number })._sx || 1), tf.e, tf.f)
      ctx.drawImage(gl!, 0, 0, w, h)
      ctx.restore()
      return true
    },
    get renderer() {
      return renderer
    },
  }
  scenes = m.scenes.map((d, i) => compile(d, i))
  post({ type: 'pronto', erros: scenes.map((s, i) => (s.frame ? null : { i, msg: s.error })).filter(Boolean) })
}

self.onmessage = async (e: MessageEvent<InitMsg | FrameMsg | { type: 'trocar'; i: number; def: SceneDef }>) => {
  const m = e.data
  if (m.type === 'init') return init(m)
  if (m.type === 'trocar') {
    reported.delete(m.i)
    scenes[m.i] = compile(m.def, m.i)
    return post({ type: 'trocada', i: m.i, ok: !!scenes[m.i].frame })
  }
  if (m.type === 'frame') {
    try {
      const bmp = frameAt(m.t, m.w, m.h)
      post({ type: 'frame', id: m.id, bitmap: bmp }, [bmp])
    } catch (err) {
      post({ type: 'frame', id: m.id, bitmap: null, msg: String(err) })
    }
  }
}
