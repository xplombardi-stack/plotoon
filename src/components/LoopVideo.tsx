import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import { cx } from './ui'

// Vídeo curto em loop, sem som. Só toca quando aparece na tela (e não toca pra quem pediu menos movimento).
export function LoopVideo({ src, poster, className, style, eager }: { src: string; poster: string; className?: string; style?: CSSProperties; eager?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const play = () => v.play().catch(() => undefined)
    if (!('IntersectionObserver' in window)) {
      play()
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) play()
        else v.pause()
      },
      { threshold: 0.2 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={eager ? 'auto' : 'none'}
      aria-hidden
      tabIndex={-1}
      disablePictureInPicture
      className={cx('pointer-events-none', className)}
      style={style}
    />
  )
}
