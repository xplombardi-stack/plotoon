// Antes e depois do Estúdio de Imagem com um produto de verdade (perfume):
// a foto crua do celular vira foto de produto, post, story, banner e capa.
import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import { cx } from './ui'

export const FOTO_ANTES = '/demo/perfume-antes.jpg'
export const FOTO_DEPOIS = '/demo/perfume-depois.jpg'

export type FormatoArte = 'produto' | 'post' | 'story' | 'banner' | 'capa'

export const ARTES: Array<{ id: FormatoArte; label: string; sub: string; box: string }> = [
  { id: 'produto', label: 'Foto de produto', sub: 'Fundo de estúdio e luz de verdade', box: 'aspect-square' },
  { id: 'post', label: 'Post', sub: 'Pronto pro feed, com preço e chamada', box: 'aspect-[4/5]' },
  { id: 'story', label: 'Story', sub: 'Vertical, com botão pro WhatsApp', box: 'aspect-[9/16]' },
  { id: 'banner', label: 'Banner', sub: 'Site, loja e promoção', box: 'aspect-video' },
  { id: 'capa', label: 'Capa de Reels', sub: 'Título que faz clicar', box: 'aspect-[9/16]' },
]

const Photo = ({ className, pos = 'center' }: { className?: string; pos?: string }) => (
  <img src={FOTO_DEPOIS} alt="" draggable={false} className={cx('absolute inset-0 h-full w-full object-cover', className)} style={{ objectPosition: pos }} />
)

const Brand = ({ className }: { className?: string }) => (
  <span className={cx('inline-flex items-center gap-1.5 font-display font-bold tracking-[0.18em] text-[#f3d9a4]', className)}>
    <span className="h-[1px] w-4 bg-[#f3d9a4]/70" /> ESSÊNCIA <span className="h-[1px] w-4 bg-[#f3d9a4]/70" />
  </span>
)

/** A peça pronta (depois) em cada formato, desenhada em HTML em cima da foto. */
export function Arte({ formato, className }: { formato: FormatoArte; className?: string }) {
  const wrap = (children: ReactNode) => <div className={cx('absolute inset-0 overflow-hidden bg-[#120c06] [container-type:inline-size]', className)}>{children}</div>
  if (formato === 'produto') return wrap(<Photo />)
  if (formato === 'post')
    return wrap(
      <>
        <Photo className="scale-[1.08]" pos="50% 40%" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />
        <span className="absolute inset-x-0 top-[5%] flex justify-center text-[4.2cqw]">
          <Brand />
        </span>
        <span className="absolute inset-x-[7%] bottom-[7%] flex flex-col items-start gap-[2.5cqw]">
          <span className="font-display text-[8.6cqw] font-extrabold leading-[1.02] text-white">
            Perfume original,
            <br />
            <span className="text-[#f3c26b]">tamanho de bolso</span>
          </span>
          <span className="flex items-center gap-[2cqw]">
            <span className="rounded-full bg-[#f3c26b] px-[3.5cqw] py-[1.4cqw] font-display text-[5.4cqw] font-extrabold text-[#2a1606]">R$ 39,90</span>
            <span className="text-[3.8cqw] font-semibold text-white/80">decant 5 ml</span>
          </span>
        </span>
      </>,
    )
  if (formato === 'story')
    return wrap(
      <>
        <Photo className="scale-[1.25]" pos="50% 45%" />
        <span className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/85" />
        <span className="absolute inset-x-0 top-[6%] flex flex-col items-center gap-[2cqw]">
          <span className="rounded-full bg-white/15 px-[3.5cqw] py-[1.2cqw] text-[4.2cqw] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">Chegou</span>
          <Brand className="text-[5cqw]" />
        </span>
        <span className="absolute inset-x-[8%] bottom-[8%] flex flex-col items-center gap-[3.5cqw] text-center">
          <span className="font-display text-[10cqw] font-extrabold leading-[1.02] text-white">
            Cheiro de caro,
            <br />
            <span className="text-[#f3c26b]">preço de amigo</span>
          </span>
          <span className="inline-flex items-center gap-[1.8cqw] rounded-full bg-[#25D366] px-[5cqw] py-[2.4cqw] text-[5cqw] font-extrabold text-[#06240f]">
            <MessageCircle className="h-[5.5cqw] w-[5.5cqw]" /> Pedir no WhatsApp
          </span>
        </span>
      </>,
    )
  if (formato === 'banner')
    return wrap(
      <>
        <span className="absolute inset-0 bg-gradient-to-r from-[#0e0905] via-[#1d1209] to-[#3a2410]" />
        <span className="absolute inset-y-0 right-0 w-[52%]">
          <Photo pos="50% 50%" />
          <span className="absolute inset-0 bg-gradient-to-r from-[#0e0905] via-transparent to-transparent" />
        </span>
        <span className="absolute inset-y-0 left-[6%] flex w-[48%] flex-col justify-center gap-[1.6cqw]">
          <Brand className="text-[2.2cqw]" />
          <span className="font-display text-[5.2cqw] font-extrabold leading-[1.02] text-white">
            Decants <span className="text-[#f3c26b]">originais</span>
          </span>
          <span className="text-[2.2cqw] text-white/75">Teste o perfume antes de comprar o frasco</span>
          <span className="mt-[0.8cqw] self-start rounded-full bg-[#f3c26b] px-[2.6cqw] py-[1cqw] text-[2.3cqw] font-extrabold text-[#2a1606]">A partir de R$ 39,90</span>
        </span>
      </>,
    )
  // capa de Reels
  return wrap(
    <>
      <Photo className="scale-[1.35]" pos="50% 60%" />
      <span className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/60" />
      <span className="absolute inset-x-[7%] top-[9%] flex flex-col items-start gap-[2.5cqw]">
        <span className="rounded-md bg-[#ff3b5c] px-[2.6cqw] py-[1cqw] text-[4.4cqw] font-extrabold uppercase text-white">Não compre</span>
        <span className="font-display text-[11cqw] font-extrabold uppercase leading-[0.98] text-white">
          perfume caro
          <br />
          <span className="text-[#f3c26b]">sem ver isso</span>
        </span>
      </span>
      <span className="absolute bottom-[6%] left-1/2 -translate-x-1/2 text-[4cqw]">
        <Brand />
      </span>
    </>,
  )
}

/**
 * Card com a foto crua do celular virando a peça pronta (cortina passando sozinha, em loop).
 * `delay` em segundos, pra cada card começar num momento.
 */
export function BeforeAfter({ formato, className, delay = 0, labels = true }: { formato: FormatoArte; className?: string; delay?: number; labels?: boolean }) {
  const box = ARTES.find((a) => a.id === formato)?.box ?? 'aspect-square'
  return (
    <div className={cx('relative overflow-hidden rounded-[18px] border border-line-strong bg-[#0f1218]', box, className)}>
      <img src={FOTO_ANTES} alt="Antes: foto tirada com o celular" draggable={false} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 55%' }} />
      <div className="ba-after absolute inset-0" style={{ animationDelay: `${delay}s` }}>
        <Arte formato={formato} />
      </div>
      <span className="ba-line pointer-events-none absolute inset-y-0 w-[2px] bg-white shadow-[0_0_14px_#fff]" style={{ animationDelay: `${delay}s` }} />
      {labels && (
        <>
          <span className="ba-tag-antes absolute left-2.5 top-2.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur" style={{ animationDelay: `${delay}s` }}>
            Antes
          </span>
          <span className="ba-tag-depois absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#3a2410]" style={{ animationDelay: `${delay}s` }}>
            Depois
          </span>
        </>
      )}
    </div>
  )
}

/** Galeria: os 5 formatos, cada um com o antes e depois passando. */
export function ImageShowcase({ className, only }: { className?: string; only?: FormatoArte[] }) {
  const list = ARTES.filter((a) => !only || only.includes(a.id))
  return (
    <div className={cx('grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5', className)}>
      {list.map((a, i) => (
        <figure key={a.id} className={cx('m-0 flex min-w-0 flex-col gap-2', a.id === 'banner' && 'col-span-2 lg:col-span-1 lg:justify-center')}>
          <BeforeAfter formato={a.id} delay={i * 0.7} />
          <figcaption className="flex flex-col">
            <span className="text-[14px] font-semibold text-ink">{a.label}</span>
            <span className="text-[12.5px] text-muted">{a.sub}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
