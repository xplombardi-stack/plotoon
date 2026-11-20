import { useEffect, useRef } from 'react'

// Cursor da Plotoon: seta fina e limpa (branca com contorno escuro). No hover fica laranja;
// no clique, pulso circular + risquinhos. Só em computador.
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path className="seta" d="M5.2 3.2v15.6c0 .6.7.9 1.1.5l3.5-3.3 2.6 5.6c.2.4.6.6 1 .4l1.7-.8c.4-.2.6-.6.4-1l-2.6-5.5h4.7c.6 0 .9-.7.5-1.1L6.3 2.7c-.4-.4-1.1-.1-1.1.5Z" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
