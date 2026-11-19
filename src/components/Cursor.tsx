import { useEffect, useRef } from 'react'

// Cursor com bolinha neon + anel que gira em cima de botões e links. Só em computador.
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || calm) return

    document.documentElement.classList.add('custom-cursor')
    let x = -100
    let y = -100
    let rx = x
    let ry = y
    let raf = 0

    const loop = () => {
      rx += (x - rx) * 0.18
      ry += (y - ry) * 0.18
      if (dot.current) dot.current.style.transform = `translate(${x}px, ${y}px)`
      if (ring.current) ring.current.style.transform = `translate(${rx}px, ${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      const t = e.target as Element | null
      const hot = !!t?.closest('a, button, label, summary, [role="radio"], [role="tab"], input[type="file"]')
      ring.current?.classList.toggle('is-hover', hot)
    }
    const down = () => ring.current?.classList.add('is-down')
    const up = () => ring.current?.classList.remove('is-down')
    const leave = () => {
      x = -100
      y = -100
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('custom-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden>
        <span />
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  )
}
