// Vídeo do produto: desenha cada quadro no canvas (sem servidor) e grava em MP4/WebM no navegador.
// Cenas: gancho, produto, benefício, prova, oferta e chamada. Tudo dentro da área segura do Reels.
import { playMusic, type Trilha } from './music'
import { loadStage, render3D } from './stage3d'

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

/* ---------- tipografia do estilo Pro ---------- */
const BIG = '"Barlow Condensed", "Plus Jakarta Sans", sans-serif'
const UI = '"Inter Tight", "Inter", system-ui, sans-serif'
const MONO = '"JetBrains Mono", ui-monospace, monospace'
const SAFE = { top: 250, bottom: 1570, left: 80, right: 1000 }

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9$%]/g, '')
}

// texto "metal" (branco escovado) e "ouro" (nas cores da marca)
function metalFill(ctx: CanvasRenderingContext2D, y: number, h: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#FFFFFF')
  g.addColorStop(0.38, '#EDEDF1')
  g.addColorStop(0.53, '#A9ABB3')
  g.addColorStop(0.6, '#7A7C85')
  g.addColorStop(0.82, '#E2E3E8')
  g.addColorStop(1, '#FFFFFF')
  return g
}
function goldFill(ctx: CanvasRenderingContext2D, y: number, h: number, a: string, b: string) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#FFF6D6')
  g.addColorStop(0.3, b)
  g.addColorStop(0.52, a)
  g.addColorStop(0.62, hexA(a, 0.85))
  g.addColorStop(0.84, b)
  g.addColorStop(1, '#FFF3C4')
  return g
}

/** Manchete: letras subindo do borrão, com o espaçamento fechando (como nos vídeos de referência). */
function headline(
  ctx: CanvasRenderingContext2D,
  text: string,
  o: { y: number; size: number; lt: number; delay?: number; destaque?: string; a: string; b: string; maxW?: number; maxLines?: number; align?: 'center' | 'left'; x?: number },
) {
  const words = text.toUpperCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return o.y
  const maxW = o.maxW ?? 900
  const hi = new Set((o.destaque ?? '').split(/\s+/).map(norm).filter(Boolean))
  let fs = o.size
  let lines: string[][] = []
  for (let tries = 0; tries < 8; tries++) {
    ctx.font = `800 ${fs}px ${BIG}`
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
    fs = Math.round(fs * 0.9)
  }
  const lh = fs * 0.98
  let ci = 0
  const delay = o.delay ?? 0
  lines.forEach((line, li) => {
    ctx.font = `800 ${fs}px ${BIG}`
    const full = line.join(' ')
    const tw = ctx.measureText(full).width
    const x0 = o.align === 'left' ? (o.x ?? SAFE.left) : LW / 2 - tw / 2
    const by = o.y + li * lh + fs * 0.82
    let x = x0
    line.forEach((w, wi) => {
      const isHi = hi.has(norm(w))
      const fill = isHi ? goldFill(ctx, by - fs * 0.82, fs, o.a, o.b) : metalFill(ctx, by - fs * 0.82, fs)
      for (const ch of w) {
        const p = clamp((o.lt - delay - ci * 0.022) / 0.42)
        const k = ease(p)
        const cw = ctx.measureText(ch).width
        if (p > 0) {
          ctx.save()
          ctx.globalAlpha *= clamp(p * 1.4)
          // "desfoque" da entrada: sombra da mesma cor que some
          if (p < 1) {
            ctx.shadowColor = isHi ? hexA(o.a, 0.9) : 'rgba(255,255,255,0.75)'
            ctx.shadowBlur = (1 - k) * 26
          } else if (isHi) {
            ctx.shadowColor = hexA(o.a, 0.45)
            ctx.shadowBlur = 30
          } else {
            ctx.shadowColor = 'rgba(0,0,0,0.6)'
            ctx.shadowBlur = 18
          }
          ctx.fillStyle = fill
          ctx.textBaseline = 'alphabetic'
          ctx.fillText(ch, x + (1 - k) * 18, by + (1 - k) * 46)
          ctx.restore()
        }
        x += cw
        ci++
      }
      if (wi < line.length - 1) {
        x += ctx.measureText(' ').width
        ci++
      }
    })
  })
  return o.y + lines.length * lh + fs * 0.12
}

function kicker(ctx: CanvasRenderingContext2D, text: string, y: number, lt: number, delay: number, a: string, align: 'center' | 'left' = 'center') {
  const p = ease((lt - delay) / 0.4)
  if (p <= 0) return
  ctx.save()
  ctx.globalAlpha *= p
  ctx.font = `500 26px ${MONO}`
  const label = text.toUpperCase().split('').join(' ')
  ctx.letterSpacing = '6px'
  const tw = ctx.measureText(label).width + 30
  const x = align === 'center' ? LW / 2 - tw / 2 : SAFE.left
  ctx.fillStyle = a
  ctx.shadowColor = a
  ctx.shadowBlur = 14
  ctx.save()
  ctx.translate(x + 6, y - 9)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-6, -6, 12, 12)
  ctx.restore()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#B9BBC3'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(label, x + 30 + (1 - p) * -14, y)
  ctx.restore()
  ctx.letterSpacing = '0px'
}

/** Legenda palavra por palavra; as palavras destacadas ganham o marca-texto inclinado. */
function caption(ctx: CanvasRenderingContext2D, text: string | undefined, y: number, lt: number, delay: number, destaque: string | undefined, a: string, b: string) {
  if (!text) return y
  const words = text.trim().split(/\s+/)
  const hi = new Set((destaque ?? '').split(/\s+/).map(norm).filter(Boolean))
  const fsN = 44
  const fsH = 50
  const gap = 13
  const maxW = 880
  const items = words.map((w) => {
    const h = hi.has(norm(w))
    ctx.font = h ? `800 ${fsH}px ${BIG}` : `600 ${fsN}px ${UI}`
    const label = h ? w.toUpperCase() : w
    return { w: label, h, width: ctx.measureText(label).width + (h ? 20 : 0) }
  })
  const lines: (typeof items)[] = []
  let cur: typeof items = []
  let cw = 0
  for (const it of items) {
    if (cur.length && cw + gap + it.width > maxW) {
      lines.push(cur)
      cur = []
      cw = 0
    }
    cw += (cur.length ? gap : 0) + it.width
    cur.push(it)
  }
  if (cur.length) lines.push(cur)
  let idx = 0
  lines.slice(0, 3).forEach((line, li) => {
    const total = line.reduce((s, it) => s + it.width, 0) + gap * (line.length - 1)
    let x = LW / 2 - total / 2
    const by = y + li * 64 + 48
    for (const it of line) {
      const at = delay + idx * 0.11
      const p = ease((lt - at) / 0.22)
      if (p > 0) {
        ctx.save()
        ctx.globalAlpha *= 0.25 + 0.75 * p
        const dy = (1 - p) * 14
        if (it.h) {
          const m = ease((lt - at - 0.04) / 0.28)
          ctx.save()
          ctx.translate(x, by - fsH * 0.86 + dy)
          ctx.transform(1, 0, -0.14, 1, 0, 0)
          const g = ctx.createLinearGradient(0, 0, it.width, 0)
          g.addColorStop(0, a)
          g.addColorStop(1, b)
          ctx.fillStyle = g
          ctx.shadowColor = hexA(a, 0.5)
          ctx.shadowBlur = 24 * m
          rr(ctx, 0, 0, it.width * m, fsH * 1.08, 6)
          ctx.fill()
          ctx.restore()
          ctx.font = `800 ${fsH}px ${BIG}`
          ctx.fillStyle = m > 0.5 ? '#0A0A0C' : '#F7F7F9'
          ctx.fillText(it.w, x + 10, by + dy)
        } else {
          ctx.font = `600 ${fsN}px ${UI}`
          ctx.fillStyle = '#F7F7F9'
          ctx.shadowColor = 'rgba(0,0,0,0.95)'
          ctx.shadowBlur = 22
          ctx.fillText(it.w, x, by + dy)
        }
        ctx.restore()
      }
      x += it.width + gap
      idx++
    }
  })
  return y + Math.min(3, lines.length) * 64 + 20
}

/** Painel de vidro escuro com barra de título (os "cards de app" dos vídeos de referência). */
function glass(ctx: CanvasRenderingContext2D, o: { x: number; y: number; w: number; h: number; title?: string; meta?: string; a: string; p: number; glow?: number; scan?: number }) {
  const p = ease(o.p)
  if (p <= 0) return
  ctx.save()
  ctx.globalAlpha *= p
  ctx.translate(o.x + o.w / 2, o.y + o.h / 2 + (1 - p) * 60)
  ctx.scale(0.94 + 0.06 * p, 0.94 + 0.06 * p)
  ctx.translate(-o.w / 2, -o.h / 2)
  const glow = o.glow ?? 0.4
  ctx.shadowColor = hexA(o.a, 0.1 + 0.35 * glow)
  ctx.shadowBlur = 40 + 60 * glow
  rr(ctx, 0, 0, o.w, o.h, 28)
  const g = ctx.createLinearGradient(0, 0, o.w * 0.3, o.h)
  g.addColorStop(0, 'rgba(30,30,36,0.94)')
  g.addColorStop(0.55, 'rgba(14,14,18,0.95)')
  g.addColorStop(1, 'rgba(8,8,11,0.97)')
  ctx.fillStyle = g
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = hexA(o.a, 0.25 + 0.4 * glow)
  ctx.lineWidth = 2
  ctx.stroke()
  // brilho de cima
  ctx.save()
  rr(ctx, 0, 0, o.w, o.h, 28)
  ctx.clip()
  const top = ctx.createRadialGradient(o.w / 2, 0, 0, o.w / 2, 0, o.w * 0.6)
  top.addColorStop(0, hexA(o.a, 0.16 + 0.2 * glow))
  top.addColorStop(1, hexA(o.a, 0))
  ctx.fillStyle = top
  ctx.fillRect(0, 0, o.w, o.h)
  if (o.scan !== undefined && o.scan > 0 && o.scan < 1) {
    const sy = o.scan * o.h
    const sg = ctx.createLinearGradient(0, 0, o.w, 0)
    sg.addColorStop(0, hexA(o.a, 0))
    sg.addColorStop(0.5, '#ffffff')
    sg.addColorStop(1, hexA(o.a, 0))
    ctx.globalAlpha *= Math.sin(o.scan * Math.PI)
    ctx.fillStyle = sg
    ctx.shadowColor = o.a
    ctx.shadowBlur = 24
    ctx.fillRect(0, sy, o.w, 3)
  }
  ctx.restore()
  if (o.title) {
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    ctx.fillRect(0, 74, o.w, 1.5)
    ;[o.a, '#3a3a42', '#3a3a42'].forEach((c, i) => {
      ctx.fillStyle = c
      if (i === 0) {
        ctx.shadowColor = c
        ctx.shadowBlur = 10
      }
      ctx.beginPath()
      ctx.arc(34 + i * 20, 38, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    })
    ctx.font = `500 22px ${MONO}`
    ctx.letterSpacing = '3px'
    ctx.fillStyle = '#9B9DA4'
    ctx.fillText(o.title.toUpperCase(), 104, 46)
    if (o.meta) {
      const mw = ctx.measureText(o.meta.toUpperCase()).width
      ctx.fillStyle = '#6F717A'
      ctx.fillText(o.meta.toUpperCase(), o.w - 30 - mw, 46)
    }
    ctx.letterSpacing = '0px'
  }
  ctx.restore()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
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
  return lines
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
type Ctx = { ctx: CanvasRenderingContext2D; v: Visual; a: string; b: string; lt: number; d: number; i: number; n: number; foto?: CanvasImageSource; has3d: boolean }

// sem 3D (aparelho sem WebGL ou ainda carregando): cartão 2D no mesmo lugar do painel
function fallbackPanel({ ctx, a, lt, d, foto, has3d }: Ctx, cy: number, w: number, h: number, rot = 0) {
  if (has3d) return
  const p = ease(lt / 0.7)
  productCard(ctx, foto, { cx: LW / 2, cy: cy + (1 - p) * 80, w, h, rot: rot + Math.sin(lt * 0.9) * 1.2, scale: 0.95 + 0.05 * p + (lt / d) * 0.03, zoom: 1.04 + (lt / d) * 0.06, shine: clamp((lt - 0.5) / 1.2), glow: a, reflection: true, alpha: p })
}

function legibility(ctx: CanvasRenderingContext2D, from: number, alpha = 0.85) {
  const g = ctx.createLinearGradient(0, from, 0, LH)
  g.addColorStop(0, 'rgba(5,5,7,0)')
  g.addColorStop(0.35, `rgba(5,5,7,${alpha * 0.8})`)
  g.addColorStop(1, `rgba(5,5,7,${alpha})`)
  ctx.fillStyle = g
  ctx.fillRect(0, from, LW, LH - from)
}

function sceneGancho(c: Ctx, cena: Cena) {
  const { ctx, a, b, lt } = c
  fallbackPanel(c, 760, 640, 760, -2)
  legibility(ctx, 900, 0.9)
  kicker(ctx, 'Para tudo', 1130, lt, 0.05, a)
  const end = headline(ctx, cena.texto, { y: 1160, size: 140, lt, delay: 0.12, destaque: cena.destaque, a, b, maxLines: 3 })
  caption(ctx, cena.apoio, end + 6, lt, 0.9, cena.destaque, a, b)
}

function sceneProduto(c: Ctx, cena: Cena) {
  const { ctx, a, b, lt } = c
  fallbackPanel(c, 700, 660, 780)
  legibility(ctx, 1000, 0.8)
  kicker(ctx, 'Apresentando', 1215, lt, 0.2, a)
  const end = headline(ctx, cena.texto, { y: 1245, size: 128, lt, delay: 0.3, destaque: cena.destaque, a, b, maxLines: 2 })
  caption(ctx, cena.apoio, end + 4, lt, 1.0, cena.destaque, a, b)
}

function sceneBeneficio(c: Ctx, cena: Cena) {
  const { ctx, a, b, lt, n } = c
  fallbackPanel(c, 610, 520, 600, n % 2 ? 3 : -3)
  const y = 1085
  const h = 400
  glass(ctx, { x: SAFE.left, y, w: SAFE.right - SAFE.left, h, title: `Benefício ${String(n + 1).padStart(2, '0')}`, meta: 'ok', a, p: lt / 0.5, glow: 0.55, scan: (lt - 0.35) / 0.8 })
  if (lt > 0.2) {
    checkBadge(ctx, SAFE.left + 100, y + 190, 46, clamp((lt - 0.35) / 0.6), a, b)
    ctx.save()
    const p = ease((lt - 0.45) / 0.45)
    ctx.globalAlpha *= p
    ctx.font = `800 70px ${BIG}`
    const lines = wrapText(ctx, cena.texto.toUpperCase(), 640).slice(0, 3)
    lines.forEach((l, i) => {
      ctx.fillStyle = i === 0 ? metalFill(ctx, y + 120, 80) : metalFill(ctx, y + 120 + i * 68, 80)
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 12
      ctx.fillText(l, SAFE.left + 180 + (1 - p) * 30, y + 182 + i * 68)
    })
    if (cena.apoio) {
      ctx.font = `600 32px ${UI}`
      ctx.fillStyle = '#9B9DA4'
      ctx.shadowBlur = 0
      wrapText(ctx, cena.apoio, 640)
        .slice(0, 2)
        .forEach((l, i) => ctx.fillText(l, SAFE.left + 180, y + 190 + lines.length * 68 + i * 42))
    }
    ctx.restore()
    // medidor
    const m = ease((lt - 0.8) / 0.9)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    rr(ctx, SAFE.left + 40, y + h - 46, SAFE.right - SAFE.left - 80, 8, 4)
    ctx.fill()
    const g = ctx.createLinearGradient(SAFE.left, 0, SAFE.right, 0)
    g.addColorStop(0, hexA(a, 0.6))
    g.addColorStop(1, b)
    ctx.fillStyle = g
    ctx.shadowColor = a
    ctx.shadowBlur = 12
    rr(ctx, SAFE.left + 40, y + h - 46, (SAFE.right - SAFE.left - 80) * m, 8, 4)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function sceneProva(c: Ctx, cena: Cena) {
  const { ctx, a, b, lt } = c
  fallbackPanel(c, 600, 500, 580, -2)
  const y = 1060
  glass(ctx, { x: SAFE.left, y, w: SAFE.right - SAFE.left, h: 440, title: 'Verificado', meta: 'qualidade', a, p: lt / 0.5, glow: 0.5, scan: (lt - 0.3) / 0.8 })
  // selo carimbando sobre o produto
  const sp = clamp((lt - 0.5) / 0.45)
  if (sp > 0) {
    ctx.save()
    ctx.translate(760, 860)
    const k = sp < 1 ? 2.1 - easeBack(sp) * 1.1 : 1
    ctx.scale(k, k)
    ctx.rotate(-0.16 + lt * 0.06)
    ctx.globalAlpha *= clamp(sp * 2)
    ctx.fillStyle = '#0c0d11'
    ctx.beginPath()
    ctx.arc(0, 0, 118, 0, Math.PI * 2)
    ctx.fill()
    ctx.setLineDash([9, 11])
    ctx.lineDashOffset = -lt * 40
    ctx.strokeStyle = a
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(0, 0, 104, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    checkBadge(ctx, 760, 860, 64, clamp((lt - 0.75) / 0.55), a, b)
  }
  for (let i = 0; i < 5; i++) {
    const q = easeBack(clamp((lt - 0.6 - i * 0.1) / 0.32))
    ctx.save()
    ctx.translate(SAFE.left + 70 + i * 74, y + 140)
    ctx.scale(q, q)
    star(ctx, 0, 0, 28)
    ctx.fillStyle = '#FFD000'
    ctx.shadowColor = 'rgba(255,208,0,0.6)'
    ctx.shadowBlur = 16
    ctx.fill()
    ctx.restore()
  }
  const end = headline(ctx, cena.texto, { y: y + 190, size: 92, lt, delay: 0.55, destaque: cena.destaque, a, b, maxLines: 2, maxW: 780 })
  if (cena.apoio) {
    ctx.save()
    ctx.globalAlpha *= ease((lt - 1.1) / 0.4)
    ctx.font = `600 34px ${UI}`
    ctx.fillStyle = '#B9BBC3'
    ctx.textAlign = 'center'
    wrapText(ctx, cena.apoio, 780)
      .slice(0, 2)
      .forEach((l, i) => ctx.fillText(l, LW / 2, end + 30 + i * 44))
    ctx.restore()
  }
}

function sceneOferta(c: Ctx, cena: Cena) {
  const { ctx, a, b, lt } = c
  fallbackPanel(c, 560, 430, 500, 3)
  // raios de luz girando atrás do preço
  ctx.save()
  ctx.translate(LW / 2, 1250)
  ctx.rotate(lt * 0.22)
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16)
    ctx.fillStyle = hexA(i % 2 ? a : b, 0.05)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-70, -1100)
    ctx.lineTo(70, -1100)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  legibility(ctx, 980, 0.7)
  kicker(ctx, 'Oferta', 1110, lt, 0.15, a)
  const tp = clamp((lt - 0.3) / 0.5)
  if (tp > 0) {
    const shown = countUp(cena.texto, clamp((lt - 0.35) / 1.0))
    let fs = 230
    ctx.font = `800 ${fs}px ${BIG}`
    while (ctx.measureText(cena.texto).width > 880 && fs > 90) {
      fs -= 8
      ctx.font = `800 ${fs}px ${BIG}`
    }
    const k = easeBack(tp)
    ctx.save()
    ctx.translate(LW / 2, 1150 + fs * 0.82)
    ctx.scale(k, k)
    ctx.textAlign = 'center'
    ctx.fillStyle = goldFill(ctx, -fs * 0.82, fs, a, b)
    ctx.shadowColor = hexA(a, 0.55)
    ctx.shadowBlur = 50
    ctx.fillText(shown, 0, 0)
    ctx.restore()
    // traço que cresce embaixo
    const u = ease((lt - 0.9) / 0.6)
    const g = ctx.createLinearGradient(LW / 2 - 300, 0, LW / 2 + 300, 0)
    g.addColorStop(0, hexA(a, 0))
    g.addColorStop(0.5, b)
    g.addColorStop(1, hexA(a, 0))
    ctx.fillStyle = g
    ctx.fillRect(LW / 2 - 300 * u, 1150 + fs + 18, 600 * u, 4)
    caption(ctx, cena.apoio, 1150 + fs + 30, lt, 1.0, cena.destaque, a, b)
  }
}

function sceneCta(c: Ctx, cena: Cena) {
  const { ctx, v, a, b, lt } = c
  fallbackPanel(c, 520, 380, 440)
  legibility(ctx, 940, 0.8)
  if (v.marca) {
    ctx.save()
    ctx.globalAlpha *= ease((lt - 0.2) / 0.5)
    ctx.font = `500 26px ${MONO}`
    ctx.letterSpacing = '8px'
    ctx.fillStyle = '#9B9DA4'
    ctx.textAlign = 'center'
    ctx.fillText(v.marca.toUpperCase().slice(0, 30), LW / 2, 1075)
    ctx.letterSpacing = '0px'
    ctx.restore()
  }
  headline(ctx, cena.texto, { y: 1100, size: 124, lt, delay: 0.35, destaque: cena.destaque, a, b, maxLines: 2 })
  const bp = clamp((lt - 0.95) / 0.5)
  if (bp > 0) {
    const label = (v.chamada || 'Chama no WhatsApp').toUpperCase().slice(0, 30)
    const wpp = /whats|zap/i.test(label)
    ctx.save()
    const pulse = 1 + Math.sin(lt * 5) * 0.025
    ctx.translate(LW / 2, 1405)
    ctx.scale(easeBack(bp) * pulse, easeBack(bp) * pulse)
    ctx.font = `800 62px ${BIG}`
    ctx.letterSpacing = '2px'
    const w = Math.max(620, ctx.measureText(label).width + 170)
    const h = 136
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
    ctx.save()
    rr(ctx, -w / 2, -h / 2, w, h, h / 2)
    ctx.clip()
    const sx = -w / 2 - 200 + (((lt - 1.2) * 700) % (w + 600))
    const g2 = ctx.createLinearGradient(sx, 0, sx + 200, 0)
    g2.addColorStop(0, 'rgba(255,255,255,0)')
    g2.addColorStop(0.5, 'rgba(255,255,255,0.5)')
    g2.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g2
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.restore()
    ctx.fillStyle = wpp ? '#052410' : '#0A0A0C'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, 0, 4)
    ctx.restore()
    ctx.letterSpacing = '0px'
    // dedinho tocando o botão
    const tap = (lt - 1.6) % 1.6
    if (lt > 1.6 && tap < 0.6) {
      const r = ease(tap / 0.6)
      ctx.save()
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - r)})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(LW / 2 + 180, 1425, 20 + r * 60, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
  const extra = cena.apoio || v.arroba
  if (extra) {
    ctx.save()
    ctx.globalAlpha *= ease((lt - 1.4) / 0.4)
    ctx.font = `500 28px ${MONO}`
    ctx.letterSpacing = '3px'
    ctx.fillStyle = '#B9BBC3'
    ctx.textAlign = 'center'
    ctx.fillText(extra.slice(0, 44), LW / 2, 1540)
    ctx.letterSpacing = '0px'
    ctx.restore()
  }
}

const SCENES: Record<CenaTipo, (c: Ctx, cena: Cena) => void> = {
  gancho: sceneGancho,
  produto: sceneProduto,
  beneficio: sceneBeneficio,
  prova: sceneProva,
  oferta: sceneOferta,
  cta: sceneCta,
}

/* ---------- moldura: capítulos no topo, luz, vinheta, cortes ---------- */
function hud(ctx: CanvasRenderingContext2D, r: Roteiro, v: Visual, t: number, i: number, a: string) {
  const total = duracao(r)
  const appear = ease((t - 0.3) / 0.6) * (1 - clamp((t - (total - 1.2)) / 0.7))
  if (appear <= 0) return
  ctx.save()
  ctx.globalAlpha *= 0.9 * appear
  const cena = r.cenas[i]
  let start = 0
  for (let k = 0; k < i; k++) start += r.cenas[k].segundos
  const sw = ease((t - start) / 0.45)
  ctx.font = `500 21px ${MONO}`
  ctx.letterSpacing = '4px'
  ctx.fillStyle = a
  ctx.shadowColor = a
  ctx.shadowBlur = 10
  ctx.save()
  ctx.translate(SAFE.left + 8, SAFE.top + 10)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-5, -5, 10, 10)
  ctx.restore()
  ctx.shadowBlur = 0
  ctx.fillStyle = '#9B9DA4'
  ctx.globalAlpha *= 0.3 + 0.7 * sw
  ctx.fillText(`${String(i + 1).padStart(2, '0')} · ${CENA_LABEL[cena.tipo].toUpperCase()}`, SAFE.left + 28 - (1 - sw) * 14, SAFE.top + 18)
  ctx.globalAlpha = 0.9 * appear
  if (v.marca) {
    const m = v.marca.toUpperCase().slice(0, 22)
    ctx.fillStyle = '#55565E'
    ctx.fillText(m, SAFE.right - ctx.measureText(m).width, SAFE.top + 18)
  }
  ctx.letterSpacing = '0px'
  // barras de progresso por cena
  let x = SAFE.left
  const full = SAFE.right - SAFE.left - 4 * (r.cenas.length - 1)
  let s0 = 0
  r.cenas.forEach((c) => {
    const w = (c.segundos / total) * full
    const p = clamp((t - s0) / c.segundos)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    rr(ctx, x, SAFE.top + 36, w, 4, 2)
    ctx.fill()
    if (p > 0) {
      const g = ctx.createLinearGradient(x, 0, x + w, 0)
      g.addColorStop(0, hexA(a, 0.5))
      g.addColorStop(1, a)
      ctx.fillStyle = g
      ctx.shadowColor = a
      ctx.shadowBlur = 8
      rr(ctx, x, SAFE.top + 36, w * p, 4, 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
    x += w + 4
    s0 += c.segundos
  })
  ctx.restore()
}

function topLight(ctx: CanvasRenderingContext2D, a: string, k: number) {
  const g = ctx.createRadialGradient(LW / 2, -200, 0, LW / 2, -200, 1300)
  g.addColorStop(0, hexA(a, 0.42 * k))
  g.addColorStop(0.45, hexA(a, 0.12 * k))
  g.addColorStop(1, hexA(a, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, LW, LH)
}

function vignette(ctx: CanvasRenderingContext2D) {
  const v = ctx.createRadialGradient(LW / 2, LH * 0.45, LH * 0.3, LW / 2, LH * 0.45, LH * 0.82)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, LW, LH)
}

// tremida de corte: faixas da imagem deslocadas por um instante
function glitch(ctx: CanvasRenderingContext2D, W: number, H: number, amount: number, seed: number) {
  if (amount <= 0) return
  const c = ctx.canvas
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  for (let i = 0; i < 7; i++) {
    const y = Math.floor(rand(seed + i * 3.3) * H)
    const h = Math.max(2, Math.floor(rand(seed + i * 7.1) * H * 0.06))
    const dx = (rand(seed + i * 1.7) - 0.5) * W * 0.08 * amount
    ctx.globalAlpha = 0.9
    ctx.drawImage(c, 0, y, W, h, dx, y, W, h)
  }
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 0.18 * amount
  ctx.drawImage(c, 0, 0, W, H, 6 * amount, 0, W, H)
  ctx.restore()
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
  ctx.fillStyle = '#050507'
  ctx.fillRect(0, 0, LW, LH)
  if (!r.cenas.length) return

  let start = 0
  let i = 0
  for (; i < r.cenas.length - 1; i++) {
    if (t < start + r.cenas[i].segundos) break
    start += r.cenas[i].segundos
  }
  const cena = r.cenas[i]
  const d = cena.segundos
  const lt = t - start
  let n = 0
  for (let k = 0; k < i; k++) if (r.cenas[k].tipo === cena.tipo) n++
  const foto = v.fotos.length ? v.fotos[i % v.fotos.length] : undefined

  // luz de fundo nas cores da marca
  background(ctx, t, a, b, frame)
  ctx.fillStyle = 'rgba(5,5,7,0.55)'
  ctx.fillRect(0, 0, LW, LH)

  // palco 3D
  const r3 = render3D({ tipo: cena.tipo, lt, d, n, t, foto, a, b, intro: lt / 0.6 })
  const c3 = r3?.canvas
  if (r3) {
    // halo de luz atrás do produto
    const halo = ctx.createRadialGradient(r3.x, r3.y, 0, r3.x, r3.y, r3.r * 2.2)
    halo.addColorStop(0, hexA(a, 0.38))
    halo.addColorStop(0.5, hexA(b, 0.1))
    halo.addColorStop(1, hexA(a, 0))
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, LW, LH)
    ctx.drawImage(r3.canvas, 0, 0, LW, LH)
    // reflexo de lente: risco horizontal passando no topo do produto
    const sweep = ((t * 0.32) % 1.6) - 0.3
    if (sweep > 0 && sweep < 1) {
      const fx = r3.x - r3.r * 0.9 + sweep * r3.r * 1.8
      const fy = r3.y - r3.r * 0.92
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const k = Math.sin(sweep * Math.PI)
      const lg = ctx.createLinearGradient(fx - 420, 0, fx + 420, 0)
      lg.addColorStop(0, 'rgba(255,255,255,0)')
      lg.addColorStop(0.5, hexA(b, 0.55 * k))
      lg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = lg
      ctx.fillRect(fx - 420, fy - 2, 840, 4)
      const core = ctx.createRadialGradient(fx, fy, 0, fx, fy, 70)
      core.addColorStop(0, `rgba(255,255,255,${0.75 * k})`)
      core.addColorStop(0.3, hexA(b, 0.35 * k))
      core.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = core
      ctx.fillRect(fx - 70, fy - 70, 140, 140)
      ctx.restore()
    }
  }

  // cena: entra crescendo (zoom-through) e sai acelerando
  const enter = ease(lt / 0.34)
  const out = i < r.cenas.length - 1 ? clamp((lt - (d - 0.22)) / 0.22) : 0
  ctx.save()
  ctx.globalAlpha = enter * (1 - out)
  const sc = (1.14 - 0.14 * enter) * (1 + out * 0.1)
  ctx.translate(LW / 2, LH / 2)
  ctx.scale(sc, sc)
  ctx.translate(-LW / 2, -LH / 2)
  SCENES[cena.tipo]({ ctx, v, a, b, lt, d, i, n, foto, has3d: !!c3 }, cena)
  ctx.restore()

  topLight(ctx, a, 0.55 + 0.25 * Math.max(0, 1 - lt / 0.5) + Math.sin(t * 0.8) * 0.05)
  hud(ctx, r, v, t, i, a)
  vignette(ctx)

  // corte: clarão + tremida
  if (i > 0 && lt < 0.25) {
    const f = 1 - lt / 0.25
    ctx.fillStyle = `rgba(255,255,255,${f * 0.22})`
    ctx.fillRect(0, 0, LW, LH)
    if (lt < 0.14) glitch(ctx, W, H, 1 - lt / 0.14, i * 13.7)
  }
  filmGrain(ctx, frame)
  const total = duracao(r)
  const fadeEnd = clamp((t - (total - 0.6)) / 0.6)
  if (fadeEnd > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fadeEnd * 0.9})`
    ctx.fillRect(0, 0, LW, LH)
  }
}

export async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`800 100px "Barlow Condensed"`),
      document.fonts.load(`500 30px "JetBrains Mono"`),
      document.fonts.load(`600 40px "Inter Tight"`),
      document.fonts.load(`800 40px "Inter Tight"`),
      loadStage(),
    ])
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
