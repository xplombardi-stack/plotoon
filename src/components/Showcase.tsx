// Imagens e vídeos curtos da vitrine (Início, site e login)
import { Check } from 'lucide-react'
import { LoopVideo } from './LoopVideo'
import { cx } from './ui'
import criadorTrabalhando from '../assets/inicio/criador-trabalhando.webp'
import criadorTrabalhandoMp4 from '../assets/inicio/criador-trabalhando.mp4'
import criadorNotificacao from '../assets/inicio/criador-notificacao-venda.webp'
import criadorNotificacaoMp4 from '../assets/inicio/criador-notificacao-venda.mp4'
import criadoraPlanejando from '../assets/inicio/criadora-planejando.webp'
import criadoraPlanejandoMp4 from '../assets/inicio/criadora-planejando.mp4'
import cardRoteiro from '../assets/inicio/card-roteiro.webp'
import cardRoteiroMp4 from '../assets/inicio/card-roteiro.mp4'
import cardPersonagem from '../assets/inicio/card-personagem.webp'
import cardPersonagemMp4 from '../assets/inicio/card-personagem.mp4'
import cardCreditos from '../assets/inicio/card-creditos.webp'
import cardCreditosMp4 from '../assets/inicio/card-creditos.mp4'
import cardVideos from '../assets/inicio/card-videos-exportar.webp'
import cardVideosMp4 from '../assets/inicio/card-videos-exportar.mp4'

export type Clip = { video: string; poster: string }

export const clips = {
  notificacao: { video: criadorNotificacaoMp4, poster: criadorNotificacao },
  trabalhando: { video: criadorTrabalhandoMp4, poster: criadorTrabalhando },
  planejando: { video: criadoraPlanejandoMp4, poster: criadoraPlanejando },
  roteiro: { video: cardRoteiroMp4, poster: cardRoteiro },
  personagem: { video: cardPersonagemMp4, poster: cardPersonagem },
  creditos: { video: cardCreditosMp4, poster: cardCreditos },
  videos: { video: cardVideosMp4, poster: cardVideos },
} satisfies Record<string, Clip>

// Composição: vídeo principal na frente, dois menores atrás.
// "responsive" fica baixa no celular e alta no computador; "tall" é sempre alta.
export function HeroCreators({ layout = 'responsive', className }: { layout?: 'responsive' | 'tall'; className?: string }) {
  const tall = layout === 'tall'
  const side = 'absolute aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-side shadow-[0_18px_40px_-18px_#000]'
  return (
    <div
      aria-hidden
      className={cx(
        'relative mx-auto w-full',
        tall ? 'aspect-[4/3] max-w-[520px]' : 'aspect-[16/9] max-w-[460px] xl:aspect-[4/3] xl:max-w-[500px]',
        className,
      )}
    >
      <div className={cx(side, 'float-late', tall ? 'left-0 top-[15%] w-[34%]' : 'left-[3%] top-[13%] w-[31%] xl:left-0 xl:top-[15%] xl:w-[34%]')}>
        <LoopVideo src={clips.planejando.video} poster={clips.planejando.poster} eager className="h-full w-full object-cover brightness-[.82]" />
        <span className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
      </div>
      <div className={cx(side, 'float-slow', tall ? 'right-0 top-[15%] w-[34%]' : 'right-[3%] top-[13%] w-[31%] xl:right-0 xl:top-[15%] xl:w-[34%]')}>
        <LoopVideo src={clips.trabalhando.video} poster={clips.trabalhando.poster} eager className="h-full w-full object-cover brightness-[.82]" />
        <span className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
      </div>
      <div className={cx('float absolute left-1/2 top-0 z-10 aspect-[3/4] -translate-x-1/2', tall ? 'w-[48%]' : 'w-[40%] xl:w-[48%]')}>
        <div className="h-full w-full overflow-hidden rounded-[20px] border border-white/15 bg-side shadow-[0_28px_60px_-22px_#000,0_0_0_1px_#ff8a3d22]">
          <LoopVideo src={clips.notificacao.video} poster={clips.notificacao.poster} eager className="h-full w-full object-cover" />
          <span className="absolute inset-0 rounded-[20px] bg-gradient-to-t from-bg/55 via-transparent to-transparent" />
        </div>
        <span className="pop absolute -left-6 bottom-[14%] hidden items-center gap-2 rounded-full border border-line-strong bg-surface/90 py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-ink shadow-[0_12px_30px_-12px_#000] backdrop-blur sm:flex">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky text-[#06121f]">
            <Check size={14} strokeWidth={3} />
          </span>
          Vídeo pronto
        </span>
      </div>
    </div>
  )
}

// Vídeo curto no lugar de ilustração
export function ClipArt({ clip, className, pos }: { clip: Clip; className?: string; pos?: string }) {
  return (
    <span aria-hidden className={cx('relative block overflow-hidden bg-side', className)}>
      <LoopVideo src={clip.video} poster={clip.poster} style={pos ? { objectPosition: pos } : undefined} className="absolute inset-0 h-full w-full object-cover" />
    </span>
  )
}
