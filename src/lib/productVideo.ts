// Vídeo do produto: desenha cada quadro no canvas (sem servidor) e grava em MP4/WebM no navegador.
// Cenas: gancho, produto, benefício, prova, oferta e chamada. Tudo dentro da área segura do Reels.
import { playMusic, type Trilha } from './music'

export type CenaTipo = 'gancho' | 'produto' | 'beneficio' | 'prova' | 'oferta' | 'cta'
export type Cena = { tipo: CenaTipo; texto: string; destaque?: string; apoio?: string; segundos: number }
export type Roteiro = { titulo: string; legenda?: string; cenas: Cena[] }
export type Visual = {
  cores: string[]
  marca: string
  arroba?: string
  chamada?: string
  logo?: CanvasImageSource | null
  fotos: CanvasImageSource[]
}

export const CENA_LABEL: Record<CenaTipo, string> = {
  gancho: 'Gancho',
  produto: 'Produto',
  beneficio: 'Benefício',
  prova: 'Confiança',
  oferta: 'Oferta',
  cta: 'Chamada',
}

const LW = 1080
const LH = 1920
const DISPLAY = '"Plus Jakarta Sans", "Inter", system-ui, sans-serif'
const SANS = '"Inter", system-ui, sans-serif'

export function duracao(r: Roteiro) {
  return r.cenas.reduce((s, c) => s + c.segundos, 0)
}

/* ---------- utilidades ---------- */
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3)
const easeBack = (x: number) => {
  const c = 1.70158
  const t = clamp(x) - 1
  return 1 + (c + 1) * t * t * t + c * t * t
}
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
function hexA(hex: string, a: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h.slice(0, 6), 16)
  if (Number.isNaN(n)) return `rgba(255,138,61,${a})`
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function luminance(hex: string) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  if (Number.isNaN(n)) return 0.5
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}
function palette(cores: string[]) {
  // tira cores muito escuras ou muito claras do brilho, que somem no fundo
  const ok = cores.filter((c) => {
    const l = luminance(c)
    return l > 0.18 && l < 0.92
  })
  const a = ok[0] ?? '#ff8a3d'
  const b = ok[1] ?? (a.toLowerCase() === '#ff5da2' ? '#a78bfa' : '#ff5da2')
  return { a, b }
}
function size(img: CanvasImageSource) {
  const i = img as { naturalWidth?: number; videoWidth?: number; width?: number; naturalHeight?: number; videoHeight?: number; height?: number }
  const w = i.naturalWidth || i.videoWidth || Number(i.width) || 1
  const h = i.naturalHeight || i.videoHeight || Number(i.height) || 1
  return { w, h }
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}
function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number, zoom = 1) {
  const s = size(img)
  const k = Math.max(w / s.w, h / s.h) * zoom
  const dw = s.w * k
  const dh = s.h * k
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

let grain: HTMLCanvasElement | null = null
function grainTile() {
  if (grain) return grain
  grain = document.createElement('canvas')
  grain.width = grain.height = 256
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

const reflCache = new Map<string, HTMLCanvasElement>()
function reflBuffer(w: number, h: number) {
  const k = `${Math.round(w)}x${Math.round(h)}`
  let c = reflCache.get(k)
  if (!c) {
    c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w))
    c.height = Math.max(1, Math.round(h))
    if (reflCache.size > 8) reflCache.clear()
    reflCache.set(k, c)
  }
  return c
}

/* ---------- fundo ---------- */
function background(ctx: CanvasRenderingContext2D, t: number, a: string, b: string, frame: number) {
  ctx.fillStyle = '#07080c'
  ctx.fillRect(0, 0, LW, LH)
  const blobs = [
    { c: a, x: 300 + Math.sin(t * 0.35) * 220, y: 520 + Math.cos(t * 0.27) * 260, r: 820, al: 0.42 },
    { c: b, x: 820 + Math.cos(t * 0.3) * 200, y: 1380 + Math.sin(t * 0.22) * 240, r: 900, al: 0.34 },
  ]
  for (const bl of blobs) {
    const g = ctx.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, bl.r)
    g.addColorStop(0, hexA(bl.c, bl.al))
    g.addColorStop(1, hexA(bl.c, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, LW, LH)
  }
  // partículas de luz (bokeh) subindo devagar
  for (let i = 0; i < 34; i++) {
    const r = 5 + rand(i * 3.1) * 22
    const sp = 18 + rand(i * 7.7) * 40
    const x = rand(i * 1.3) * LW + Math.sin(t * 0.6 + i) * 30
    const y = (((rand(i * 5.9) * LH - t * sp) % LH) + LH) % LH
    ctx.fillStyle = i % 3 === 0 ? hexA(a, 0.16 * (0.5 + rand(i))) : `rgba(255,255,255,${0.04 + rand(i * 2.2) * 0.08})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // vinheta
  const v = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.25, LW / 2, LH / 2, LH * 0.78)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, LW, LH)
  void frame
}

function filmGrain(ctx: CanvasRenderingContext2D, frame: number) {
  const tile = grainTile()
  ctx.save()
  ctx.globalAlpha = 0.045
  ctx.globalCompositeOperation = 'overlay'
  const ox = Math.floor(rand(frame) * 256)
  const oy = Math.floor(rand(frame + 7) * 256)
  for (let x = -ox; x < LW; x += 256) for (let y = -oy; y < LH; y += 256) ctx.drawImage(tile, x, y)
  ctx.restore()
}

/* ---------- produto (foto em cartão com brilho e reflexo) ---------- */
function productCard(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | undefined,
  o: { cx: number; cy: number; w: number; h: number; rot: number; scale: number; zoom: number; shine: number; glow: string; reflection?: boolean; alpha?: number },
) {
  const { cx, cy, w, h } = o
  ctx.save()
  ctx.globalAlpha = o.alpha ?? 1
  ctx.translate(cx, cy)
  ctx.rotate((o.rot * Math.PI) / 180)
  ctx.scale(o.scale, o.scale)
  const x = -w / 2
  const y = -h / 2
  const r = 46

  // reflexo no "chão"
  if (o.reflection && img) {
    const rh = h * 0.32
    const buf = reflBuffer(w, rh)
    const bx = buf.getContext('2d')!
    bx.globalCompositeOperation = 'source-over'
    bx.clearRect(0, 0, buf.width, buf.height)
    bx.save()
    bx.translate(0, buf.height)
    bx.scale(buf.width / w, -buf.height / rh)
    bx.beginPath()
    bx.roundRect(0, -h + rh, w, h, r)
    bx.clip()
    cover(bx, img, 0, rh - h, w, h, o.zoom)
    bx.restore()
    bx.globalCompositeOperation = 'destination-in'
    const fade = bx.createLinearGradient(0, 0, 0, buf.height)
    fade.addColorStop(0, 'rgba(0,0,0,0.32)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    bx.fillStyle = fade
    bx.fillRect(0, 0, buf.width, buf.height)
    ctx.drawImage(buf, x, y + h + 18, w, rh)
  }

  // brilho atrás
  ctx.shadowColor = hexA(o.glow, 0.55)
  ctx.shadowBlur = 80
  rr(ctx, x, y, w, h, r)
  ctx.fillStyle = '#15171d'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.shadowColor = 'transparent'

  ctx.save()
  rr(ctx, x, y, w, h, r)
  ctx.clip()
  if (img) cover(ctx, img, x, y, w, h, o.zoom)
  else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h)
    g.addColorStop(0, '#2a2f3a')
    g.addColorStop(1, '#151820')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
  }
  // faixa de luz passando (efeito vidro)
  if (o.shine > 0 && o.shine < 1) {
    const sx = x - w * 0.6 + o.shine * w * 2.2
    const g = ctx.createLinearGradient(sx - 160, y, sx + 160, y + 260)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.34)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }
  // luz de cima
  const top = ctx.createLinearGradient(0, y, 0, y + h * 0.4)
  top.addColorStop(0, 'rgba(255,255,255,0.12)')
  top.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = top
  ctx.fillRect(x, y, w, h)
  ctx.restore()

  rr(ctx, x, y, w, h, r)
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}

/* ---------- texto que entra palavra por palavra ---------- */
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9$%]/g, '')
}

function kinetic(
  ctx: CanvasRenderingContext2D,
  text: string,
  o: { y: number; size: number; lt: number; delay?: number; destaque?: string; a: string; b: string; maxW?: number; maxLines?: number; align?: 'center' },
) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return o.y
  const maxW = o.maxW ?? 880
  let fs = o.size
  let lines: string[][] = []
  const hi = new Set((o.destaque ?? '').split(/\s+/).map(norm).filter(Boolean))
  for (let tries = 0; tries < 6; tries++) {
    ctx.font = `800 ${fs}px ${DISPLAY}`
    lines = []
    let cur: string[] = []
    for (const w of words) {
      const test = [...cur, w].join(' ')
      if (cur.length && ctx.measureText(test).width > maxW) {
        lines.push(cur)
        cur = [w]
      } else cur.push(w)
    }
    if (cur.length) lines.push(cur)
    if (lines.length <= (o.maxLines ?? 3) && lines.every((l) => ctx.measureText(l.join(' ')).width <= maxW)) break
    fs = Math.round(fs * 0.88)
  }
  const lh = fs * 1.12
  const space = ctx.measureText(' ').width
  let idx = 0
  lines.forEach((line, li) => {
    const widths = line.map((w) => ctx.measureText(w).width)
    const total = widths.reduce((s, w) => s + w, 0) + space * (line.length - 1)
    let x = LW / 2 - total / 2
    const by = o.y + li * lh + fs * 0.8
    line.forEach((w, wi) => {
      const p = clamp((o.lt - (o.delay ?? 0) - idx * 0.07) / 0.38)
      const k = easeBack(p)
      const isHi = hi.has(norm(w))
      ctx.save()
      ctx.globalAlpha *= clamp(p * 1.6)
      const cx = x + widths[wi] / 2
      ctx.translate(cx, by - fs * 0.35 + (1 - p) * 46)
      ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k)
      ctx.translate(-cx, -(by - fs * 0.35))
      if (isHi) {
        // marca-texto atrás da palavra destacada
        const grow = ease((o.lt - (o.delay ?? 0) - idx * 0.07 - 0.25) / 0.4)
        ctx.fillStyle = hexA(o.a, 0.26)
        rr(ctx, x - 12, by - fs * 0.78, (widths[wi] + 24) * grow, fs * 0.98, 18)
        ctx.fill()
        const g = ctx.createLinearGradient(x, by - fs, x + widths[wi], by)
        g.addColorStop(0, o.a)
        g.addColorStop(1, o.b)
        ctx.fillStyle = g
      } else ctx.fillStyle = '#ffffff'
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 14
      ctx.font = `800 ${fs}px ${DISPLAY}`
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(w, x, by)
      ctx.restore()
      x += widths[wi] + space
      idx++
    })
  })
  return o.y + lines.length * lh
}

function support(ctx: CanvasRenderingContext2D, text: string | undefined, y: number, lt: number, delay: number, maxW = 840) {
  if (!text) return y
  const p = ease((lt - delay) / 0.5)
  ctx.save()
  ctx.globalAlpha *= p
  ctx.font = `600 42px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 16
  const words = text.split(/\s+/)
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
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, LW / 2, y + 44 + i * 56 + (1 - p) * 20))
  ctx.restore()
  return y + 44 + lines.length * 56
}

function brandTag(ctx: CanvasRenderingContext2D, v: Visual, a: string, alpha: number) {
  if (!v.marca && !v.logo) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.font = `700 34px ${DISPLAY}`
  const name = v.marca.slice(0, 26)
  const tw = ctx.measureText(name).width
  const w = 56 + 16 + tw + 40
  const x = LW / 2 - w / 2
  const y = 200
  rr(ctx, x, y, w, 76, 38)
  ctx.fillStyle = 'rgba(10,11,15,0.55)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + 10 + 28, y + 38, 28, 0, Math.PI * 2)
  ctx.clip()
  if (v.logo) cover(ctx, v.logo, x + 10, y + 10, 56, 56)
  else {
    ctx.fillStyle = a
    ctx.fillRect(x + 10, y + 10, 56, 56)
    ctx.fillStyle = '#140c06'
    ctx.font = `800 30px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText((name[0] || 'P').toUpperCase(), x + 38, y + 49)
  }
  ctx.restore()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.font = `700 34px ${DISPLAY}`
  ctx.fillText(name, x + 10 + 56 + 16, y + 50)
  ctx.restore()
}

function checkBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: number, a: string, b: string) {
  const k = easeBack(p)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(k, k)
  const g = ctx.createLinearGradient(-r, -r, r, r)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  ctx.shadowColor = hexA(a, 0.6)
  ctx.shadowBlur = 40
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  const d = clamp((p - 0.35) / 0.5)
  ctx.strokeStyle = '#140c06'
  ctx.lineWidth = r * 0.17
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const pts: Array<[number, number]> = [
    [-r * 0.42, 0.02 * r],
    [-r * 0.12, r * 0.32],
    [r * 0.45, -r * 0.3],
  ]
  ctx.moveTo(pts[0][0], pts[0][1])
  if (d < 0.4) {
    const q = d / 0.4
    ctx.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * q, pts[0][1] + (pts[1][1] - pts[0][1]) * q)
  } else {
    ctx.lineTo(pts[1][0], pts[1][1])
    const q = (d - 0.4) / 0.6
    ctx.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * q, pts[1][1] + (pts[2][1] - pts[1][1]) * q)
  }
  if (d > 0) ctx.stroke()
  ctx.restore()
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5
    const rad = i % 2 === 0 ? r : r * 0.45
    ctx.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad)
  }
  ctx.closePath()
}

// conta o número do preço subindo (R$ 0,00 → R$ 49,90)
function countUp(text: string, p: number) {
  const m = text.match(/(\d{1,3}(?:\.\d{3})*|\d+)(,\d{1,2})?/)
  if (!m || p >= 1) return text
  const intPart = Number(m[1].replace(/\./g, ''))
  const dec = m[2] ? Number(m[2].slice(1)) / Math.pow(10, m[2].length - 1) : 0
  const val = (intPart + dec) * ease(p)
  const digits = m[2] ? m[2].length - 1 : 0
  const shown = val.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return text.replace(m[0], shown)
}

/* ---------- cada tipo de cena ---------- */
type Ctx = { ctx: CanvasRenderingContext2D; v: Visual; a: string; b: string; lt: number; d: number; i: number; foto?: CanvasImageSource; count: Record<CenaTipo, number> }

function sceneGancho({ ctx, a, b, lt, d, foto }: Ctx, c: Cena) {
  // foto ocupando a tela, escurecida, com um "soco" de zoom no começo
  if (foto) {
    ctx.save()
    const z = 1.32 - ease(lt / 0.55) * 0.2 + (lt / d) * 0.05
    cover(ctx, foto, 0, 0, LW, LH, z)
    ctx.fillStyle = 'rgba(7,8,12,0.62)'
    ctx.fillRect(0, 0, LW, LH)
    const g = ctx.createLinearGradient(0, LH * 0.25, 0, LH)
    g.addColorStop(0, 'rgba(7,8,12,0)')
    g.addColorStop(1, 'rgba(7,8,12,0.85)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, LW, LH)
    ctx.restore()
  }
  const end = kinetic(ctx, c.texto, { y: 720, size: 112, lt, delay: 0.1, destaque: c.destaque, a, b, maxLines: 4 })
  support(ctx, c.apoio, end + 10, lt, 0.7)
}

function sceneProduto({ ctx, a, b, lt, d, foto }: Ctx, c: Cena) {
  const p = ease(lt / 0.7)
  productCard(ctx, foto, {
    cx: LW / 2,
    cy: 760 + (1 - p) * 120,
    w: 720,
    h: 860,
    rot: Math.sin(lt * 0.9) * 1.6,
    scale: 0.94 + 0.06 * p + (lt / d) * 0.03,
    zoom: 1.04 + (lt / d) * 0.08,
    shine: clamp((lt - 0.6) / 1.2),
    glow: a,
    reflection: true,
    alpha: p,
  })
  const end = kinetic(ctx, c.texto, { y: 1290, size: 82, lt, delay: 0.35, destaque: c.destaque, a, b, maxLines: 2 })
  support(ctx, c.apoio, end, lt, 0.9)
}

function sceneBeneficio({ ctx, a, b, lt, d, foto, count }: Ctx, c: Cena) {
  const n = count.beneficio
  const side = n % 2 === 0 ? 1 : -1
  const p = ease(lt / 0.6)
  productCard(ctx, foto, {
    cx: LW / 2 + side * (1 - p) * 300,
    cy: 640,
    w: 600,
    h: 700,
    rot: side * (3 - p * 1.4) + Math.sin(lt) * 0.8,
    scale: 0.96 + (lt / d) * 0.04,
    zoom: 1.1 - (lt / d) * 0.06,
    shine: clamp((lt - 0.4) / 1.1),
    glow: n % 2 === 0 ? a : b,
    alpha: p,
  })
  checkBadge(ctx, LW / 2, 1110, 62, clamp((lt - 0.25) / 0.7), a, b)
  const end = kinetic(ctx, c.texto, { y: 1215, size: 78, lt, delay: 0.45, destaque: c.destaque, a, b, maxLines: 2 })
  support(ctx, c.apoio, end, lt, 0.95)
}

function sceneProva({ ctx, a, b, lt, d, foto }: Ctx, c: Cena) {
  const p = ease(lt / 0.6)
  productCard(ctx, foto, { cx: LW / 2 - 40, cy: 640, w: 520, h: 620, rot: -2 + Math.sin(lt * 0.8), scale: 0.95 + (lt / d) * 0.04, zoom: 1.06, shine: clamp((lt - 1) / 1.2), glow: a, alpha: p })
  // selo carimbando
  const sp = clamp((lt - 0.45) / 0.45)
  if (sp > 0) {
    ctx.save()
    ctx.translate(LW / 2 + 210, 880)
    const k = sp < 1 ? 2.2 - easeBack(sp) * 1.2 : 1
    ctx.scale(k, k)
    ctx.rotate(-0.18 + lt * 0.08)
    ctx.globalAlpha *= clamp(sp * 2)
    ctx.fillStyle = '#0d0f14'
    ctx.beginPath()
    ctx.arc(0, 0, 128, 0, Math.PI * 2)
    ctx.fill()
    ctx.setLineDash([10, 12])
    ctx.lineDashOffset = -lt * 40
    ctx.strokeStyle = a
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(0, 0, 112, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    checkBadge(ctx, LW / 2 + 210, 880, 72, clamp((lt - 0.7) / 0.6), a, b)
  }
  // estrelas acendendo uma por uma
  for (let i = 0; i < 5; i++) {
    const q = easeBack(clamp((lt - 0.9 - i * 0.12) / 0.35))
    ctx.save()
    ctx.translate(LW / 2 - 240 + i * 120, 1105)
    ctx.scale(q, q)
    star(ctx, 0, 0, 44)
    ctx.fillStyle = '#facc15'
    ctx.shadowColor = 'rgba(250,204,21,0.6)'
    ctx.shadowBlur = 24
    ctx.fill()
    ctx.restore()
  }
  const end = kinetic(ctx, c.texto, { y: 1185, size: 80, lt, delay: 0.5, destaque: c.destaque, a, b, maxLines: 2 })
  support(ctx, c.apoio, end, lt, 1.1)
}

function sceneOferta({ ctx, a, b, lt, d, foto }: Ctx, c: Cena) {
  // raios de luz girando atrás
  ctx.save()
  ctx.translate(LW / 2, 1180)
  ctx.rotate(lt * 0.25)
  for (let i = 0; i < 14; i++) {
    ctx.rotate((Math.PI * 2) / 14)
    ctx.fillStyle = hexA(i % 2 ? a : b, 0.07)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-90, -1300)
    ctx.lineTo(90, -1300)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  const p = ease(lt / 0.6)
  productCard(ctx, foto, { cx: LW / 2, cy: 600, w: 470, h: 560, rot: 4 - p * 6 + Math.sin(lt) * 0.8, scale: 0.9 + 0.08 * p, zoom: 1.08, shine: clamp((lt - 0.3) / 1), glow: b, alpha: p })
  // etiqueta de preço
  const tp = clamp((lt - 0.35) / 0.5)
  if (tp > 0) {
    const shown = countUp(c.texto, clamp((lt - 0.4) / 0.9))
    let fs = 118
    ctx.font = `800 ${fs}px ${DISPLAY}`
    while (ctx.measureText(c.texto).width > 760 && fs > 56) {
      fs -= 6
      ctx.font = `800 ${fs}px ${DISPLAY}`
    }
    const tw = ctx.measureText(c.texto).width
    const w = tw + 110
    const h = fs * 1.5
    const k = easeBack(tp)
    const pulse = 1 + Math.max(0, Math.sin((lt - 1.4) * 4)) * 0.025 * (lt > 1.4 ? 1 : 0)
    ctx.save()
    ctx.translate(LW / 2, 1110)
    ctx.scale(k * pulse, k * pulse)
    ctx.rotate(-0.03)
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
    g.addColorStop(0, a)
    g.addColorStop(1, b)
    ctx.shadowColor = hexA(a, 0.55)
    ctx.shadowBlur = 50
    rr(ctx, -w / 2, -h / 2, w, h, h / 2.4)
    ctx.fillStyle = g
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#140c06'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${fs}px ${DISPLAY}`
    ctx.fillText(shown, 0, fs * 0.04)
    ctx.restore()
  }
  support(ctx, c.apoio, 1110 + 120, lt, 0.9)
  void d
}

function sceneCta({ ctx, v, a, b, lt, foto }: Ctx, c: Cena) {
  // logo/foto redonda no alto
  const p = easeBack(clamp(lt / 0.6))
  ctx.save()
  ctx.translate(LW / 2, 520)
  ctx.scale(p, p)
  ctx.shadowColor = hexA(a, 0.6)
  ctx.shadowBlur = 60
  ctx.fillStyle = '#15171d'
  ctx.beginPath()
  ctx.arc(0, 0, 150, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, 142, 0, Math.PI * 2)
  ctx.clip()
  const img = v.logo ?? foto
  if (img) cover(ctx, img, -142, -142, 284, 284)
  ctx.restore()
  ctx.strokeStyle = a
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(0, 0, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease(lt / 1.2))
  ctx.stroke()
  ctx.restore()

  if (v.marca) {
    ctx.save()
    ctx.globalAlpha *= ease((lt - 0.3) / 0.5)
    ctx.font = `800 54px ${DISPLAY}`
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.fillText(v.marca.slice(0, 28), LW / 2, 750)
    ctx.restore()
  }
  kinetic(ctx, c.texto, { y: 820, size: 92, lt, delay: 0.45, destaque: c.destaque, a, b, maxLines: 2 })

  // botão pulsando
  const bp = clamp((lt - 0.9) / 0.5)
  if (bp > 0) {
    const label = (v.chamada || 'Chama no WhatsApp').slice(0, 30)
    const wpp = /whats|zap/i.test(label)
    ctx.save()
    const pulse = 1 + Math.sin(lt * 5) * 0.03
    ctx.translate(LW / 2, 1200)
    ctx.scale(easeBack(bp) * pulse, easeBack(bp) * pulse)
    ctx.font = `800 54px ${DISPLAY}`
    const w = Math.max(640, ctx.measureText(label).width + 140)
    const h = 150
    ctx.shadowColor = wpp ? 'rgba(37,211,102,0.6)' : hexA(a, 0.6)
    ctx.shadowBlur = 50
    rr(ctx, -w / 2, -h / 2, w, h, h / 2)
    if (wpp) ctx.fillStyle = '#25D366'
    else {
      const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
      g.addColorStop(0, a)
      g.addColorStop(1, b)
      ctx.fillStyle = g
    }
    ctx.fill()
    ctx.shadowBlur = 0
    // brilho passando no botão
    ctx.save()
    rr(ctx, -w / 2, -h / 2, w, h, h / 2)
    ctx.clip()
    const sx = -w / 2 - 200 + (((lt - 1.2) * 600) % (w + 600))
    const g2 = ctx.createLinearGradient(sx, 0, sx + 200, 0)
    g2.addColorStop(0, 'rgba(255,255,255,0)')
    g2.addColorStop(0.5, 'rgba(255,255,255,0.45)')
    g2.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g2
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
    ctx.fillStyle = wpp ? '#06240f' : '#140c06'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 0, 4)
    ctx.restore()

    // setinha apontando
    const ay = 1340 + Math.sin(lt * 6) * 14
    ctx.save()
    ctx.globalAlpha *= bp
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(LW / 2 - 26, ay - 30)
    ctx.lineTo(LW / 2, ay - 56)
    ctx.lineTo(LW / 2 + 26, ay - 30)
    ctx.moveTo(LW / 2, ay - 56)
    ctx.lineTo(LW / 2, ay + 10)
    ctx.stroke()
    ctx.restore()
  }
  const extra = c.apoio || v.arroba
  support(ctx, extra, 1380, lt, 1.3)
}

const SCENES: Record<CenaTipo, (c: Ctx, cena: Cena) => void> = {
  gancho: sceneGancho,
  produto: sceneProduto,
  beneficio: sceneBeneficio,
  prova: sceneProva,
  oferta: sceneOferta,
  cta: sceneCta,
}

/** Desenha o quadro do segundo `t` num canvas de qualquer tamanho 9:16. */
export function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, r: Roteiro, v: Visual) {
  const { a, b } = palette(v.cores)
  const frame = Math.floor(t * 30)
  ctx.setTransform(W / LW, 0, 0, H / LH, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  background(ctx, t, a, b, frame)
  if (!r.cenas.length) return

  // acha a cena atual
  let start = 0
  let i = 0
  for (; i < r.cenas.length - 1; i++) {
    if (t < start + r.cenas[i].segundos) break
    start += r.cenas[i].segundos
  }
  const cena = r.cenas[i]
  const d = cena.segundos
  const lt = t - start
  const count = { gancho: 0, produto: 0, beneficio: 0, prova: 0, oferta: 0, cta: 0 } as Record<CenaTipo, number>
  for (let k = 0; k < i; k++) count[r.cenas[k].tipo]++
  const fotos = v.fotos
  const foto = fotos.length ? fotos[i % fotos.length] : undefined

  // transição: a cena entra crescendo e sai "voando"
  const out = i < r.cenas.length - 1 ? clamp((lt - (d - 0.28)) / 0.28) : 0
  ctx.save()
  ctx.globalAlpha = 1 - out
  ctx.translate(LW / 2, LH / 2)
  const sc = 1 + out * 0.12
  ctx.scale(sc, sc)
  ctx.translate(-LW / 2, -LH / 2)
  SCENES[cena.tipo]({ ctx, v, a, b, lt, d, i, foto, count }, cena)
  ctx.restore()

  if (cena.tipo !== 'cta' && cena.tipo !== 'gancho') brandTag(ctx, v, a, ease(lt / 0.5) * (1 - out))
  else if (cena.tipo === 'gancho') brandTag(ctx, v, a, ease((lt - 0.6) / 0.5) * (1 - out))

  // flash na troca de cena
  const flash = Math.max(0, 1 - lt / 0.22) * (i > 0 ? 1 : 0)
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.28})`
    ctx.fillRect(0, 0, LW, LH)
  }
  filmGrain(ctx, frame)
  // escurece no fim
  const total = duracao(r)
  const fadeEnd = clamp((t - (total - 0.6)) / 0.6)
  if (fadeEnd > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fadeEnd * 0.85})`
    ctx.fillRect(0, 0, LW, LH)
  }
}

export async function fontsReady() {
  try {
    await Promise.all([document.fonts.load(`800 100px "Plus Jakarta Sans"`), document.fonts.load(`700 40px "Plus Jakarta Sans"`), document.fonts.load(`600 40px "Inter"`)])
  } catch {
    /* segue com a fonte do sistema */
  }
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

/* ---------- foto de exemplo (frasco desenhado), usada na prévia e nos exemplos ---------- */
export function sampleProduct(cor = '#ff8a3d') {
  const c = document.createElement('canvas')
  c.width = 900
  c.height = 1100
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, 0, 1100)
  bg.addColorStop(0, '#f6efe6')
  bg.addColorStop(1, '#e2d4c3')
  g.fillStyle = bg
  g.fillRect(0, 0, 900, 1100)
  // sombra no chão
  g.fillStyle = 'rgba(60,40,20,0.22)'
  g.beginPath()
  g.ellipse(450, 930, 230, 34, 0, 0, Math.PI * 2)
  g.fill()
  // frasco
  const body = g.createLinearGradient(250, 0, 650, 0)
  body.addColorStop(0, hexA(cor, 0.95))
  body.addColorStop(0.45, hexA(cor, 0.7))
  body.addColorStop(1, hexA(cor, 1))
  g.fillStyle = body
  g.beginPath()
  g.roundRect(250, 380, 400, 550, 60)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.roundRect(290, 410, 46, 480, 23)
  g.fill()
  // gargalo e tampa
  g.fillStyle = '#d9c7b0'
  g.fillRect(390, 330, 120, 60)
  const cap = g.createLinearGradient(330, 0, 570, 0)
  cap.addColorStop(0, '#1b1b1f')
  cap.addColorStop(0.5, '#3a3a42')
  cap.addColorStop(1, '#141417')
  g.fillStyle = cap
  g.beginPath()
  g.roundRect(340, 180, 220, 160, 28)
  g.fill()
  // rótulo
  g.fillStyle = 'rgba(255,255,255,0.92)'
  g.beginPath()
  g.roundRect(320, 560, 260, 200, 18)
  g.fill()
  g.fillStyle = '#1b1b1f'
  g.textAlign = 'center'
  g.font = `800 44px ${DISPLAY}`
  g.fillText('SEU', 450, 650)
  g.fillText('PRODUTO', 450, 705)
  return c
}

// roteiro de exemplo (um perfume em decant), usado nas prévias e na escolha de estilo
export function sampleRoteiro(): Roteiro {
  return {
    titulo: 'Exemplo: decant de perfume',
    legenda: 'Perfume original em tamanho de bolso. Chama no WhatsApp e garanta o seu!',
    cenas: [
      { tipo: 'gancho', texto: 'Cheiro de perfume caro, pagando pouco?', destaque: 'pagando pouco', segundos: 3 },
      { tipo: 'produto', texto: 'Decant de perfume original', destaque: 'original', apoio: 'O mesmo perfume do frasco, em tamanho de bolso', segundos: 5 },
      { tipo: 'beneficio', texto: 'Testa antes de comprar o frasco', destaque: 'Testa', segundos: 4 },
      { tipo: 'beneficio', texto: 'Cabe na bolsa e no bolso', destaque: 'bolso', segundos: 4 },
      { tipo: 'prova', texto: 'Tirado do frasco lacrado', destaque: 'lacrado', apoio: 'Feito na hora, na sua frente', segundos: 4.5 },
      { tipo: 'oferta', texto: 'R$ 39,90', apoio: '5 ml prontos pra usar', segundos: 4 },
      { tipo: 'cta', texto: 'Garanta o seu hoje', destaque: 'hoje', segundos: 5.5 },
    ],
  }
}

export const SAMPLE_PHOTO = '/demo/perfume-depois.jpg'

/* ---------- gravação ---------- */
export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  // MP4 só com H.264 (o que o Instagram e o iPhone aceitam); senão grava WebM
  const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.4D401F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4;codecs=avc3,mp4a', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return list.find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

export function canRecord() {
  return typeof MediaRecorder !== 'undefined' && !!pickMime() && typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

/** Capa (um quadro) em JPEG. */
export function poster(r: Roteiro, v: Visual, at?: number) {
  const c = document.createElement('canvas')
  c.width = 540
  c.height = 960
  const ctx = c.getContext('2d')!
  const first = r.cenas[0]?.segundos ?? 3
  drawFrame(ctx, 540, 960, at ?? first + 2.2, r, v)
  return new Promise<Blob | null>((res) => c.toBlob(res, 'image/jpeg', 0.85))
}

export type Gravacao = { blob: Blob; mime: string; ext: 'mp4' | 'webm' }

/**
 * Grava o vídeo em tempo real no canvas que você passar (ele aparece na tela enquanto grava).
 * Chame direto no clique: o áudio precisa nascer junto com o toque da pessoa.
 */
export function gravar(canvas: HTMLCanvasElement, r: Roteiro, v: Visual, trilha: Trilha, onProgress: (s: number, total: number) => void): { done: Promise<Gravacao>; cancel: () => void } {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ac = new AC()
  const total = duracao(r)
  const mime = pickMime()
  let cancelled = false
  let cancelFn = () => {
    cancelled = true
  }

  const done = (async () => {
    await ac.resume().catch(() => {})
    await fontsReady()
    const ctx = canvas.getContext('2d')!
    drawFrame(ctx, canvas.width, canvas.height, 0, r, v)
    const stream = canvas.captureStream(30)
    let stopMusic = () => {}
    const dest = ac.createMediaStreamDestination()
    if (trilha !== 'nenhuma') dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr))
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 7_000_000, audioBitsPerSecond: 160_000 })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    const stopped = new Promise<void>((res) => (rec.onstop = () => res()))

    // se a pessoa sair da aba, pausa tudo junto (o navegador congela a tela escondida)
    const vis = () => {
      if (document.hidden) {
        if (rec.state === 'recording') rec.pause()
        ac.suspend()
      } else {
        ac.resume().then(() => {
          if (rec.state === 'paused') rec.resume()
        })
      }
    }
    document.addEventListener('visibilitychange', vis)

    rec.start(250)
    const t0 = ac.currentTime + 0.05
    stopMusic = playMusic(ac, dest, trilha, total, 0)
    await new Promise<void>((resolve) => {
      let raf = 0
      cancelFn = () => {
        cancelled = true
        cancelAnimationFrame(raf)
        resolve()
      }
      const loop = () => {
        const t = Math.max(0, ac.currentTime - t0)
        drawFrame(ctx, canvas.width, canvas.height, Math.min(t, total), r, v)
        onProgress(Math.min(t, total), total)
        if (t >= total + 0.15) return resolve()
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
    return { blob: new Blob(chunks, { type: base }), mime: base, ext: base.includes('mp4') ? 'mp4' : 'webm' } as Gravacao
  })()
  return { done, cancel: () => cancelFn() }
}
