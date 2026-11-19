// Historinhas de exemplo passando sozinhas (em fila ou em colunas), sem som.
import { Play } from 'lucide-react'
import { LoopVideo } from './LoopVideo'
import { cx } from './ui'
import ligacaoFesta from '../assets/historias/ligacao-festa.webp'
import ligacaoFestaMp4 from '../assets/historias/ligacao-festa.mp4'
import traderNoite from '../assets/historias/trader-noite.webp'
import traderNoiteMp4 from '../assets/historias/trader-noite.mp4'
import pontoOnibus from '../assets/historias/ponto-de-onibus.webp'
import pontoOnibusMp4 from '../assets/historias/ponto-de-onibus.mp4'
import traderVirada from '../assets/historias/trader-virada.webp'
import traderViradaMp4 from '../assets/historias/trader-virada.mp4'
import festaRisada from '../assets/historias/festa-risada.webp'
import festaRisadaMp4 from '../assets/historias/festa-risada.mp4'
import traderEscritorio from '../assets/historias/trader-escritorio.webp'
import traderEscritorioMp4 from '../assets/historias/trader-escritorio.mp4'
import carroNovo from '../assets/historias/carro-novo.webp'
import carroNovoMp4 from '../assets/historias/carro-novo.mp4'
import traderDecisao from '../assets/historias/trader-decisao.webp'
import traderDecisaoMp4 from '../assets/historias/trader-decisao.mp4'
import outroLado from '../assets/historias/outro-lado-da-linha.webp'
import outroLadoMp4 from '../assets/historias/outro-lado-da-linha.mp4'
import vendedorDuvidou from '../assets/historias/vendedor-duvidou.webp'
import vendedorDuvidouMp4 from '../assets/historias/vendedor-duvidou.mp4'
import talvezProxima from '../assets/historias/talvez-da-proxima.webp'
import talvezProximaMp4 from '../assets/historias/talvez-da-proxima.mp4'
import chamaramPobre from '../assets/historias/chamaram-de-pobre.webp'
import chamaramPobreMp4 from '../assets/historias/chamaram-de-pobre.mp4'
import eraAlugado from '../assets/historias/era-alugado.webp'
import eraAlugadoMp4 from '../assets/historias/era-alugado.mp4'
import carroChegou from '../assets/historias/o-carro-dele-chegou.webp'
import carroChegouMp4 from '../assets/historias/o-carro-dele-chegou.mp4'
import entrouCamiseta from '../assets/historias/entrou-de-camiseta.webp'
import entrouCamisetaMp4 from '../assets/historias/entrou-de-camiseta.mp4'
import chaveNaMao from '../assets/historias/a-chave-na-mao.webp'
import chaveNaMaoMp4 from '../assets/historias/a-chave-na-mao.mp4'

type Story = { title: string; video: string; poster: string }

export const stories: Story[] = [
  { title: 'A ligação da festa', video: ligacaoFestaMp4, poster: ligacaoFesta },
  { title: 'O vendedor duvidou', video: vendedorDuvidouMp4, poster: vendedorDuvidou },
  { title: 'Madrugada no trade', video: traderNoiteMp4, poster: traderNoite },
  { title: 'Entrou de camiseta', video: entrouCamisetaMp4, poster: entrouCamiseta },
  { title: 'Chamaram ele de pobre', video: chamaramPobreMp4, poster: chamaramPobre },
  { title: '1 ano depois', video: pontoOnibusMp4, poster: pontoOnibus },
  { title: 'O gráfico virou', video: traderViradaMp4, poster: traderVirada },
  { title: 'Era alugado?', video: eraAlugadoMp4, poster: eraAlugado },
  { title: 'Só se vive uma vez', video: festaRisadaMp4, poster: festaRisada },
  { title: 'Talvez da próxima', video: talvezProximaMp4, poster: talvezProxima },
  { title: 'Do quarto pro escritório', video: traderEscritorioMp4, poster: traderEscritorio },
  { title: 'O carro dele chegou', video: carroChegouMp4, poster: carroChegou },
  { title: 'O carro novo', video: carroNovoMp4, poster: carroNovo },
  { title: 'A chave na mão', video: chaveNaMaoMp4, poster: chaveNaMao },
  { title: 'A decisão', video: traderDecisaoMp4, poster: traderDecisao },
  { title: 'Do outro lado da linha', video: outroLadoMp4, poster: outroLado },
]

function StoryCard({ s, className, label = true }: { s: Story; className?: string; label?: boolean }) {
  return (
    <figure className={cx('relative m-0 aspect-[9/16] shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-side shadow-[0_18px_40px_-20px_#000]', className)}>
      <LoopVideo src={s.video} poster={s.poster} className="absolute inset-0 h-full w-full object-cover" />
      {label && (
        <>
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur">
            <Play size={12} fill="currentColor" aria-hidden />
          </span>
          <figcaption className="absolute inset-x-3 bottom-3 text-[13px] font-bold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,.8)]">{s.title}</figcaption>
        </>
      )}
    </figure>
  )
}

// Fila horizontal que anda sozinha (para quando o mouse passa por cima)
export function StoryReel({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const w = size === 'lg' ? 'w-[180px] sm:w-[230px]' : size === 'sm' ? 'w-[120px] sm:w-[140px]' : 'w-[150px] sm:w-[190px]'
  const list = [...stories, ...stories]
  return (
    <div aria-label="Exemplos de historinhas" className={cx('reel group relative overflow-hidden py-1', className)}>
      <div className="reel-track flex w-max gap-4 pr-4">
        {list.map((s, i) => (
          <StoryCard key={i} s={s} className={w} label={size !== 'sm'} />
        ))}
      </div>
    </div>
  )
}

// Colunas subindo e descendo (painel do login)
export function StoryColumns({ className }: { className?: string }) {
  const cols = [
    { items: [stories[0], stories[3], stories[6], stories[9], stories[12]], dir: 'up', dur: '64s' },
    { items: [stories[1], stories[4], stories[7], stories[10], stories[13]], dir: 'down', dur: '74s' },
    { items: [stories[2], stories[5], stories[8], stories[11], stories[14]], dir: 'up', dur: '68s' },
  ]
  return (
    <div aria-hidden className={cx('reel-cols grid grid-cols-3 gap-4', className)}>
      {cols.map((c, ci) => (
        <div key={ci} className={cx('relative overflow-hidden', ci === 1 && 'mt-[-14%]')}>
          <div className={cx('reel-col flex flex-col gap-4 pb-4', c.dir === 'down' && 'reel-col-down')} style={{ animationDuration: c.dur }}>
            {[...c.items, ...c.items].map((s, i) => (
              <StoryCard key={i} s={s} className="w-full" label={false} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
