// Vídeos de verdade feitos no estilo que o Plotoon usa (motion design + 3D), pra mostrar o nível do resultado.
// Pra colocar mais um: salve o .mp4 e a capa .jpg em public/exemplos e adicione na lista.
import { useRef, useState } from 'react'
import { Play, Volume2, VolumeX } from 'lucide-react'
import { cx } from './ui'

export type Exemplo = { id: string; titulo: string; tipo: string; video: string; capa: string }

export const EXEMPLOS: Exemplo[] = [{ id: 'correios', titulo: 'Explicativo com 3D e dados', tipo: 'Notícia explicada', video: '/exemplos/correios.mp4', capa: '/exemplos/correios.jpg' }]

function Card({ e, className }: { e: Exemplo; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [som, setSom] = useState(false)
  return (
    <figure className={cx('m-0 flex min-w-0 flex-col gap-2', className)}>
      <div className="group relative aspect-[9/16] overflow-hidden rounded-[18px] border border-line-strong bg-black">
        <video ref={ref} src={e.video} poster={e.capa} muted={!som} loop playsInline autoPlay preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">{e.tipo}</span>
        <button
          type="button"
          onClick={() => {
            setSom((x) => !x)
            ref.current?.play().catch(() => {})
          }}
          aria-label={som ? 'Tirar o som' : 'Ouvir com som'}
          className="absolute bottom-2.5 right-2.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white backdrop-blur"
        >
          {som ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>
      <figcaption className="text-[13px] font-semibold text-soft">{e.titulo}</figcaption>
    </figure>
  )
}

/** Fileira de exemplos reais. */
export function ShowcaseVideos({ className, max }: { className?: string; max?: number }) {
  const list = EXEMPLOS.slice(0, max ?? EXEMPLOS.length)
  if (!list.length) return null
  return (
    <div className={cx('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {list.map((e) => (
        <Card key={e.id} e={e} />
      ))}
    </div>
  )
}

/** Um exemplo grande, tocando sozinho (pra escolha de estilo e prévias). */
export function ShowcaseHero({ className }: { className?: string }) {
  const e = EXEMPLOS[0]
  if (!e) return null
  return (
    <span className={cx('relative block h-full w-full overflow-hidden bg-black', className)}>
      <video src={e.video} poster={e.capa} muted loop playsInline autoPlay preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-bold text-white backdrop-blur">
        <Play size={10} fill="currentColor" /> Exemplo real
      </span>
    </span>
  )
}
