// Player do vídeo do produto: desenha o vídeo ao vivo no canvas (o mesmo desenho que vai pro arquivo).
import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { drawFrame, duracao, fontsReady, type Roteiro, type Visual } from '../lib/productVideo'
import { playMusic, type Trilha } from '../lib/music'
import { cx } from './ui'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function VideoPlayer({
  roteiro,
  visual,
  trilha = 'nenhuma',
  autoPlay = false,
  loop = false,
  controls = true,
  className,
  rounded = 'rounded-[22px]',
}: {
  roteiro: Roteiro
  visual: Visual
  trilha?: Trilha
  autoPlay?: boolean
  loop?: boolean
  controls?: boolean
  className?: string
  rounded?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const props = useRef({ roteiro, visual, trilha })
  props.current = { roteiro, visual, trilha }
  const tRef = useRef(0)
  const playRef = useRef(false)
  const started = useRef(false) // antes do primeiro play, mostra um quadro com texto (capa)
  const [playing, setPlaying] = useState(false)
  const [shown, setShown] = useState(0)
  const [muted, setMuted] = useState(!controls)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const audio = useRef<AudioContext | null>(null)
  const stopMusic = useRef<() => void>(() => {})
  const visible = useRef(true)
  const total = duracao(roteiro)

  function draw() {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    const at = started.current ? tRef.current : Math.min(1.8, duracao(props.current.roteiro))
    if (ctx) drawFrame(ctx, c.width, c.height, at, props.current.roteiro, props.current.visual)
  }

  function music(from: number) {
    stopMusic.current()
    stopMusic.current = () => {}
    if (mutedRef.current || props.current.trilha === 'nenhuma') return
    try {
      if (!audio.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audio.current = new AC()
      }
      audio.current.resume().catch(() => {})
      stopMusic.current = playMusic(audio.current, audio.current.destination, props.current.trilha, duracao(props.current.roteiro), from)
    } catch {
      /* sem áudio */
    }
  }

  function play() {
    started.current = true
    if (tRef.current >= duracao(props.current.roteiro) - 0.05) tRef.current = 0
    playRef.current = true
    setPlaying(true)
    music(tRef.current)
  }
  function pause() {
    playRef.current = false
    setPlaying(false)
    stopMusic.current()
    stopMusic.current = () => {}
  }

  // tamanho interno do canvas acompanha a tela (nítido sem pesar)
  useEffect(() => {
    const c = canvas.current
    const b = box.current
    if (!c || !b) return
    const fit = () => {
      const w = Math.min(720, Math.max(180, Math.round(b.clientWidth * Math.min(2, window.devicePixelRatio || 1))))
      c.width = w
      c.height = Math.round((w * 16) / 9)
      draw()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(b)
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting))
    io.observe(b)
    fontsReady().then(draw)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // relógio
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastUi = 0
    const loopFn = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (playRef.current && visible.current) {
        const tot = duracao(props.current.roteiro)
        tRef.current += dt
        if (tRef.current >= tot) {
          if (loop) {
            tRef.current = 0
            music(0)
          } else {
            tRef.current = tot
            pause()
          }
        }
        draw()
        if (now - lastUi > 120) {
          lastUi = now
          setShown(tRef.current)
        }
      }
      raf = requestAnimationFrame(loopFn)
    }
    raf = requestAnimationFrame(loopFn)
    if (autoPlay) {
      started.current = true
      playRef.current = true
      setPlaying(true)
    }
    return () => {
      cancelAnimationFrame(raf)
      stopMusic.current()
      audio.current?.close().catch(() => {})
      audio.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // redesenha quando muda o texto/foto com o vídeo parado
  useEffect(() => {
    if (!playRef.current) draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roteiro, visual])

  // trocou a música tocando: recomeça a trilha do ponto atual
  useEffect(() => {
    if (playRef.current) music(tRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trilha, muted])

  function seek(v: number) {
    started.current = true
    tRef.current = v
    setShown(v)
    draw()
    if (playRef.current) music(v)
  }

  return (
    <div ref={box} className={cx('relative aspect-[9/16] w-full overflow-hidden bg-[#07080c]', rounded, className)}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      {controls && (
        <>
          <button type="button" onClick={() => (playing ? pause() : play())} aria-label={playing ? 'Pausar' : 'Assistir'} className="absolute inset-0 cursor-pointer">
            {!playing && (
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111] shadow-xl">
                <Play size={28} className="ml-1" fill="currentColor" />
              </span>
            )}
          </button>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
            <button type="button" onClick={() => (playing ? pause() : play())} aria-label={playing ? 'Pausar' : 'Assistir'} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
            </button>
            <label className="sr-only" htmlFor="video-tempo">
              Tempo do vídeo
            </label>
            <input id="video-tempo" type="range" min={0} max={total} step={0.05} value={Math.min(shown, total)} onChange={(e) => seek(Number(e.target.value))} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#ff8a3d]" />
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-white/85">
              {fmt(shown)} / {fmt(total)}
            </span>
            {trilha !== 'nenhuma' && (
              <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Ligar o som' : 'Tirar o som'} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
