// Player do filme feito pela IA: pede cada quadro ao projetor (worker) e toca a trilha junto.
import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Projetor, duracaoFilme, type Filme } from '../lib/film'
import { playMusic, type Trilha } from '../lib/music'
import { cx } from './ui'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export type FilmSource = { filme: Filme; fotos: Array<string | Blob | CanvasImageSource>; logo?: string | null; marca: { nome: string; arroba?: string; whatsapp?: string; chamada?: string } }

export function FilmPlayer({
  src,
  trilha = 'nenhuma',
  autoPlay = false,
  loop = false,
  controls = true,
  className,
  onReady,
  onErro,
  seekTo,
}: {
  src: FilmSource
  trilha?: Trilha
  autoPlay?: boolean
  loop?: boolean
  controls?: boolean
  className?: string
  onReady?: (p: Projetor) => void
  onErro?: (i: number, msg: string) => void
  seekTo?: { t: number; n: number }
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const proj = useRef<Projetor | null>(null)
  const tRef = useRef(0)
  const playRef = useRef(false)
  const started = useRef(false)
  // o navegador só deixa tocar som depois de um clique da pessoa
  const gesto = useRef(false)
  const dirty = useRef(true)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [shown, setShown] = useState(0)
  const [muted, setMuted] = useState(!controls)
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const trilhaRef = useRef(trilha)
  trilhaRef.current = trilha
  const audio = useRef<AudioContext | null>(null)
  const stopMusic = useRef<() => void>(() => {})
  const visible = useRef(true)
  const total = duracaoFilme(src.filme)
  const totalRef = useRef(total)
  totalRef.current = total
  const errRef = useRef(onErro)
  errRef.current = onErro

  function music(from: number) {
    stopMusic.current()
    stopMusic.current = () => {}
    if (!gesto.current || mutedRef.current || trilhaRef.current === 'nenhuma') return
    try {
      if (!audio.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audio.current = new AC()
      }
      audio.current.resume().catch(() => {})
      stopMusic.current = playMusic(audio.current, audio.current.destination, trilhaRef.current, totalRef.current, from)
    } catch {
      /* sem áudio */
    }
  }
  function play() {
    gesto.current = true
    started.current = true
    if (tRef.current >= totalRef.current - 0.05) tRef.current = 0
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

  // um projetor por filme
  useEffect(() => {
    const p = new Projetor(src.filme, src.fotos, src.logo, src.marca)
    p.onErro = (i, m) => errRef.current?.(i, m)
    proj.current = p
    setLoading(true)
    p.ready.then(() => {
      if (proj.current !== p) return
      setLoading(false)
      dirty.current = true
      onReady?.(p)
    })
    return () => {
      p.dispose()
      if (proj.current === p) proj.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  useEffect(() => {
    const b = box.current
    if (!b) return
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting))
    io.observe(b)
    let raf = 0
    let last = performance.now()
    let lastUi = 0
    let busy = false
    const loopFn = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const c = canvas.current
      if (c && b) {
        const w = Math.min(720, Math.max(180, Math.round(b.clientWidth * Math.min(2, window.devicePixelRatio || 1))))
        const h = Math.round((w * 16) / 9)
        if (c.width !== w) {
          c.width = w
          c.height = h
          dirty.current = true
        }
        if (playRef.current && visible.current) {
          tRef.current += dt
          if (tRef.current >= totalRef.current) {
            if (loop) {
              tRef.current = 0
              music(0)
            } else {
              tRef.current = totalRef.current
              pause()
            }
          }
          dirty.current = true
          if (now - lastUi > 120) {
            lastUi = now
            setShown(tRef.current)
          }
        }
        const p = proj.current
        if (dirty.current && !busy && p && visible.current) {
          busy = true
          dirty.current = false
          const at = started.current ? tRef.current : Math.min(2.2, totalRef.current * 0.3)
          p.frame(at, c.width, c.height).then((bmp) => {
            busy = false
            if (bmp) {
              c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height)
              bmp.close()
            }
          })
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
      io.disconnect()
      stopMusic.current()
      audio.current?.close().catch(() => {})
      audio.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (playRef.current) music(tRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trilha, muted])

  function seek(v: number) {
    started.current = true
    tRef.current = v
    setShown(v)
    dirty.current = true
    if (playRef.current) music(v)
  }

  // pular pra uma cena (lista de cenas)
  useEffect(() => {
    if (seekTo) seek(seekTo.t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo?.n])

  return (
    <div ref={box} className={cx('relative aspect-[9/16] w-full overflow-hidden rounded-[22px] bg-black', className)}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
          <LoaderCircle size={28} className="animate-spin text-white/80" aria-label="Carregando o vídeo" />
        </span>
      )}
      {controls && (
        <>
          <button type="button" onClick={() => (playing ? pause() : play())} aria-label={playing ? 'Pausar' : 'Assistir'} className="absolute inset-0 cursor-pointer">
            {!playing && !loading && (
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#111] shadow-xl">
                <Play size={28} className="ml-1" fill="currentColor" />
              </span>
            )}
          </button>
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
            <button type="button" onClick={() => (playing ? pause() : play())} aria-label={playing ? 'Pausar' : 'Assistir'} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
            </button>
            <label className="sr-only" htmlFor="filme-tempo">
              Tempo do vídeo
            </label>
            <input id="filme-tempo" type="range" min={0} max={total} step={0.05} value={Math.min(shown, total)} onChange={(e) => seek(Number(e.target.value))} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#ff8a3d]" />
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-white/85">
              {fmt(shown)} / {fmt(total)}
            </span>
            {trilha !== 'nenhuma' && (
              <button type="button" onClick={() => {
                  gesto.current = true
                  setMuted((m) => !m)
                }} aria-label={muted ? 'Ligar o som' : 'Tirar o som'} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
