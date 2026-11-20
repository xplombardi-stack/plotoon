import { useEffect, useRef } from 'react'

// Cursor da Plotoon: seta preta com borda branca, brilho laranja e o símbolo da marca dentro.
// Normal (brilho respirando), hover (realça) e clique (pulso circular + risquinhos). Só em computador.
export function Cursor() {
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || calm) return

    document.documentElement.classList.add('custom-cursor')
    let x = -100
    let y = -100
    let raf = 0
    let dirty = true

    const loop = () => {
      if (dirty && el.current) {
        el.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
        dirty = false
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const move = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      dirty = true
      el.current?.classList.add('is-on')
      const t = e.target as Element | null
      const hot = !!t?.closest('a, button, label, summary, select, [role="radio"], [role="tab"], [role="button"], input[type="file"], input[type="checkbox"]')
      el.current?.classList.toggle('is-hover', hot)
    }
    const down = (e: PointerEvent) => {
      el.current?.classList.add('is-down')
      // pulso + risquinhos no ponto do clique
      const fx = document.createElement('div')
      fx.className = 'cursor-click'
      fx.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      fx.innerHTML = '<span class="r1"></span><span class="r2"></span><i></i><i></i><i></i>'
      document.body.appendChild(fx)
      window.setTimeout(() => fx.remove(), 650)
    }
    const up = () => el.current?.classList.remove('is-down')
    const leave = () => el.current?.classList.remove('is-on')

    window.addEventListener('pointermove', move, { passive: true })
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
    <div ref={el} className="plotoon-cursor" aria-hidden>
      <svg width="34" height="40" viewBox="0 0 34 40" fill="none">
        <path d="M3.2 2.6 L30.4 22.4 Q31.6 23.4 30.1 24.1 L19.6 25.2 L24.9 35.3 Q25.4 36.4 24.4 36.9 L20.6 38.6 Q19.5 39 19 37.9 L13.9 27.7 L6.2 34.6 Q5 35.6 4.7 34 L2.1 3.6 Q2 2 3.2 2.6 Z" fill="#0c0c10" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
        <image href="/favicon.png" x="7.2" y="11.6" width="11.5" height="11.5" />
      </svg>
    </div>
  )
}
