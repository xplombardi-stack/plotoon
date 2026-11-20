// Prévias animadas mais "de verdade": o pedido de vídeo virando vídeo (2 estilos) e um app de loja sendo construído.
import { Check, LoaderCircle, Search, ShoppingBag, Star } from 'lucide-react'
import { LoopVideo } from './LoopVideo'
import { ModuleIcon } from './Module'
import { SampleProductVideo } from './ProductVideo'
import { stories as reel } from './StoryReel'
import { Fit } from './FeatureDemos'
import { on, typed, useLoop } from './StepDemos'
import { FOTO_DEPOIS } from './BeforeAfter'
import { cx } from './ui'

/* ---------- Vídeo: pedido → criação → vídeo pronto, nos 2 estilos ---------- */

const PEDIDOS = [
  {
    texto: 'Faz um vídeo do meu perfume mostrando que é original',
    estilo: 'Vídeo do produto',
    tom: 'from-[#ff8a3d] to-[#facc15]',
    passos: ['Roteiro com gancho', 'Cenas com o seu produto', 'Texto animado e música'],
  },
  {
    texto: 'Faz uma historinha comigo convencendo um cliente desconfiado',
    estilo: 'Historinha com boneco 3D',
    tom: 'from-[#ff5da2] to-[#a78bfa]',
    passos: ['O Diretor escreve a história', 'Seu boneco em cada cena', 'Juntando as partes'],
  },
]
const CICLO = 12000

export function DemoVideo({ className }: { className?: string }) {
  const { ref, t } = useLoop(CICLO * 2, CICLO + 9500)
  const k = Math.floor(t / CICLO) % 2
  const u = t % CICLO
  const p = PEDIDOS[k]
  const escrito = typed(p.texto, u, 300, 34)
  const enviado = on(u, 2500)
  const gerando = u > 2900 && u < 6400
  const pronto = on(u, 6400)
  const prog = Math.min(100, Math.max(0, ((u - 2900) / 3500) * 100))
  return (
    <div ref={ref} className={cx('relative aspect-[64/47] overflow-hidden rounded-[24px] border border-line-strong bg-[#0d1017] shadow-[0_30px_80px_-30px_#000]', className)} aria-hidden>
      <Fit base={640} className="h-full w-full">
        <div className="grid h-[470px] grid-cols-[1fr_232px] gap-5 p-5">
          {/* conversa */}
          <div className="flex min-w-0 flex-col gap-3">
            <span className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <ModuleIcon id="estudio-video" size="sm" /> Estúdio de Vídeo
            </span>
            <div className="flex gap-1.5">
              {PEDIDOS.map((x, i) => (
                <span key={x.estilo} className={cx('rounded-full px-3 py-1.5 text-[12px] font-bold transition-all duration-500', i === k ? `bg-gradient-to-r ${x.tom} text-[#140c06]` : 'border border-line-strong text-muted')}>
                  {x.estilo}
                </span>
              ))}
            </div>
            <div className="flex flex-1 flex-col justify-end gap-3">
              {enviado && <p className="pop m-0 max-w-[92%] self-end rounded-[16px] rounded-br-md bg-accent px-3.5 py-2.5 text-[14px] font-semibold leading-snug text-accent-ink">{p.texto}</p>}
              {enviado && (
                <div className="pop flex flex-col gap-2.5 rounded-[16px] rounded-tl-md border border-line bg-surface p-3.5" style={{ animationDelay: '200ms' }}>
                  <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                    {pronto ? <Check size={15} className="text-[#6ee7b7]" strokeWidth={3} /> : <LoaderCircle size={15} className="animate-spin text-accent" />}
                    {pronto ? 'Seu vídeo está pronto!' : 'Criando o seu vídeo…'}
                  </span>
                  {p.passos.map((s, i) => {
                    const ok = prog > ((i + 1) / p.passos.length) * 100 - 5 || pronto
                    const cur = !ok && prog > (i / p.passos.length) * 100
                    return (
                      <span key={s} className={cx('flex items-center gap-2 text-[12.5px] transition-colors', ok ? 'text-soft' : cur ? 'text-ink' : 'text-subtle')}>
                        <span className={cx('flex h-5 w-5 items-center justify-center rounded-full', ok ? 'bg-accent text-accent-ink' : cur ? 'bg-accent-soft text-accent' : 'bg-surface-2')}>
                          {ok ? <Check size={12} strokeWidth={3} /> : cur ? <LoaderCircle size={12} className="animate-spin" /> : null}
                        </span>
                        {s}
                      </span>
                    )
                  })}
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className={cx('block h-full rounded-full bg-gradient-to-r', p.tom)} style={{ width: `${pronto ? 100 : prog}%` }} />
                  </span>
                </div>
              )}
            </div>
            <div className={cx('rounded-[14px] border border-line-strong bg-bg/70 px-3.5 py-3 text-[14px] text-ink', !enviado && 'caret')}>{enviado ? <span className="text-subtle">Peça outro vídeo…</span> : escrito}</div>
          </div>

          {/* celular com o resultado */}
          <div className="relative self-center overflow-hidden rounded-[30px] border-[6px] border-[#1f2430] bg-black shadow-2xl" style={{ height: 403 }}>
            {pronto ? (
              k === 0 ? (
                <SampleProductVideo key={`p${Math.floor(t / (CICLO * 2))}`} className="!rounded-none" />
              ) : (
                <LoopVideo src={reel[1].video} poster={reel[1].poster} className="pop absolute inset-0 h-full w-full object-cover" />
              )
            ) : (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b0d12]">
                <span className="shimmer absolute inset-0 opacity-60" />
                {gerando ? (
                  <>
                    <span className="relative font-display text-[34px] font-extrabold text-ink">{Math.round(prog)}%</span>
                    <span className="relative text-[12px] font-semibold text-muted">gerando…</span>
                  </>
                ) : (
                  <span className="relative px-6 text-center text-[12.5px] text-subtle">Seu vídeo aparece aqui</span>
                )}
              </span>
            )}
            {pronto && <span className="pop absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">{p.estilo}</span>}
          </div>
        </div>
      </Fit>
    </div>
  )
}

/* ---------- Apps: pedido → app de loja moderno sendo montado ---------- */

const APP_PEDIDO = 'Cria o app da minha loja de perfumes, com catálogo e pedido no WhatsApp'
const PRODUTOS = [
  { n: 'Âmbar Noir', d: 'Decant 5 ml', p: 'R$ 39,90', f: 'none', star: '4,9' },
  { n: 'Rosé Velvet', d: 'Decant 5 ml', p: 'R$ 44,90', f: 'hue-rotate(-28deg) saturate(1.2)', star: '5,0' },
  { n: 'Ocean Bleu', d: 'Decant 10 ml', p: 'R$ 69,90', f: 'hue-rotate(170deg) saturate(0.9)', star: '4,8' },
  { n: 'Verde Fresh', d: 'Decant 5 ml', p: 'R$ 36,90', f: 'hue-rotate(55deg) saturate(0.8)', star: '4,9' },
]
const BUILD = ['Página inicial com a sua marca', 'Catálogo com fotos e preços', 'Carrinho de compras', 'Pedido direto no WhatsApp']

function Sk({ className }: { className?: string }) {
  return <span className={cx('block rounded-md bg-[#ece7e1]', className)} />
}

export function DemoAppsPro({ className }: { className?: string }) {
  const TOTAL = 15000
  const { ref, t } = useLoop(TOTAL, 12500)
  const pedido = typed(APP_PEDIDO, t, 300, 30)
  const sent = on(t, 2600)
  const step = t < 3000 ? -1 : Math.min(4, Math.floor((t - 3000) / 1000)) // 0..3 montando, 4 pronto
  const ready = step >= 4
  const added = on(t, 8600)
  const added2 = on(t, 9300)
  const published = on(t, 10600)
  const scroll = t > 7200 && t < 11800 ? Math.min(1, (t - 7200) / 1200) : t >= 11800 ? Math.max(0, 1 - (t - 11800) / 900) : 0
  return (
    <div ref={ref} aria-hidden className={cx('relative aspect-[64/48] overflow-hidden rounded-[24px] border border-line-strong bg-[#0d1017] shadow-[0_30px_80px_-30px_#000]', className)}>
      <Fit base={640} className="h-full w-full">
        <div className="grid h-[480px] grid-cols-[1fr_244px] gap-5 p-5">
          {/* conversa */}
          <div className="flex min-w-0 flex-col gap-3">
            <span className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <ModuleIcon id="apps" size="sm" /> Criador de Apps
            </span>
            <div className="flex flex-1 flex-col justify-end gap-3">
              {sent && <p className="pop m-0 max-w-[92%] self-end rounded-[16px] rounded-br-md bg-accent px-3.5 py-2.5 text-[14px] font-semibold leading-snug text-accent-ink">{APP_PEDIDO}</p>}
              {sent && (
                <div className="pop flex flex-col gap-2 rounded-[16px] rounded-tl-md border border-line bg-surface p-3.5">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                    {ready ? <Check size={15} strokeWidth={3} className="text-[#6ee7b7]" /> : <LoaderCircle size={15} className="animate-spin text-[#67e8f9]" />}
                    {ready ? 'App pronto! Quer mudar alguma coisa?' : 'Construindo o seu app…'}
                  </span>
                  {BUILD.map((b, i) => (
                    <span key={b} className={cx('flex items-center gap-2 text-[12.5px] transition-all duration-300', step > i ? 'text-soft' : step === i ? 'text-ink' : 'text-subtle')}>
                      <span className={cx('flex h-5 w-5 items-center justify-center rounded-full', step > i ? 'bg-[#22d3ee] text-[#04222a]' : step === i ? 'bg-[#22d3ee22] text-[#67e8f9]' : 'bg-surface-2')}>
                        {step > i ? <Check size={12} strokeWidth={3} /> : step === i ? <LoaderCircle size={12} className="animate-spin" /> : null}
                      </span>
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className={cx('rounded-[14px] border border-line-strong bg-bg/70 px-3.5 py-3 text-[14px] text-ink', !sent && 'caret')}>{sent ? <span className="text-subtle">Peça um ajuste…</span> : pedido}</div>
            <span className={cx('flex items-center gap-2 rounded-xl border border-[#34d39955] bg-[#34d39914] px-3 py-2 text-[12.5px] font-semibold text-[#6ee7b7] transition-all duration-500', published ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0')}>
              <Check size={14} strokeWidth={3} /> Publicado · plotoon.app/p/essencia
            </span>
          </div>

          {/* o app no celular */}
          <div className="relative self-center overflow-hidden rounded-[32px] border-[6px] border-[#1f2430] bg-[#faf7f3] shadow-2xl" style={{ height: 440 }}>
            <div className="flex flex-col transition-transform duration-700 ease-out" style={{ transform: `translateY(${-scroll * 150}px)` }}>
              {/* topo */}
              <div className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
                {step >= 0 ? (
                  <span className="pop flex items-center gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a120b] font-display text-[13px] font-extrabold text-[#f3c26b]">E</span>
                    <span className="font-display text-[13px] font-extrabold tracking-[0.12em] text-[#1a120b]">ESSÊNCIA</span>
                  </span>
                ) : (
                  <Sk className="h-6 w-24" />
                )}
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1a120b] shadow-sm">
                  <ShoppingBag size={15} />
                  {added && <span className="pop absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#e8572a] text-[9px] font-bold text-white">{added2 ? 2 : 1}</span>}
                </span>
              </div>
              {/* destaque */}
              <div className="px-3.5">
                {step >= 0 ? (
                  <div className="pop relative h-[150px] overflow-hidden rounded-[18px] bg-[#1a120b]">
                    <img src={FOTO_DEPOIS} alt="" className="absolute right-[-18px] top-0 h-full w-[60%] object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-r from-[#1a120b] via-[#1a120b]/85 to-transparent" />
                    <span className="absolute left-3.5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#f3c26b]">Coleção nova</span>
                      <span className="font-display text-[17px] font-extrabold leading-[1.05] text-white">
                        Perfume original
                        <br />
                        em decant
                      </span>
                      <span className="self-start rounded-full bg-[#f3c26b] px-2.5 py-1 text-[10px] font-extrabold text-[#2a1606]">Ver coleção</span>
                    </span>
                  </div>
                ) : (
                  <Sk className="h-[150px] w-full rounded-[18px]" />
                )}
              </div>
              {/* busca e categorias */}
              <div className="flex flex-col gap-2 px-3.5 pt-3">
                {step >= 1 ? (
                  <>
                    <span className="pop flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] text-[#8a8178] shadow-sm">
                      <Search size={13} /> Buscar perfume
                    </span>
                    <span className="pop flex gap-1.5" style={{ animationDelay: '100ms' }}>
                      {['Todos', 'Masculino', 'Feminino', 'Kits'].map((c, i) => (
                        <span key={c} className={cx('rounded-full px-2.5 py-1 text-[10px] font-bold', i === 0 ? 'bg-[#1a120b] text-white' : 'bg-white text-[#5c544c] shadow-sm')}>
                          {c}
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  <>
                    <Sk className="h-8 w-full rounded-full" />
                    <Sk className="h-5 w-3/4" />
                  </>
                )}
              </div>
              {/* produtos */}
              <div className="grid grid-cols-2 gap-2.5 px-3.5 pb-3 pt-3">
                {PRODUTOS.map((it, i) =>
                  step >= 1 ? (
                    <div key={it.n} className="pop flex flex-col overflow-hidden rounded-[14px] bg-white shadow-sm" style={{ animationDelay: `${i * 120}ms` }}>
                      <span className="relative block aspect-square overflow-hidden bg-[#1a120b]">
                        <img src={FOTO_DEPOIS} alt="" className="h-full w-full scale-[1.25] object-cover" style={{ filter: it.f }} />
                        <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8.5px] font-bold text-[#1a120b]">
                          <Star size={8} fill="#f59e0b" className="text-[#f59e0b]" /> {it.star}
                        </span>
                      </span>
                      <span className="flex flex-col gap-0.5 p-2">
                        <span className="truncate text-[11px] font-bold text-[#1a120b]">{it.n}</span>
                        <span className="text-[9px] text-[#8a8178]">{it.d}</span>
                        <span className="mt-0.5 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-[#1a120b]">{it.p}</span>
                          {step >= 2 && <span className={cx('pop flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold text-white transition-colors', (added && i === 0) || (added2 && i === 1) ? 'bg-[#16a34a]' : 'bg-[#1a120b]')}>{(added && i === 0) || (added2 && i === 1) ? '✓' : '+'}</span>}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <div key={it.n} className="flex flex-col gap-1.5 rounded-[14px] bg-white p-1.5">
                      <Sk className="aspect-square w-full rounded-[10px]" />
                      <Sk className="h-3 w-3/4" />
                      <Sk className="h-3 w-1/2" />
                    </div>
                  ),
                )}
              </div>
            </div>
            {/* barra do carrinho */}
            <div className={cx('absolute inset-x-2.5 bottom-2.5 flex items-center justify-between rounded-[16px] bg-[#16a34a] px-3.5 py-2.5 text-white shadow-[0_10px_24px_-8px_#16a34aaa] transition-all duration-500 [transition-timing-function:var(--ease-spring)]', step >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0')}>
              <span className="flex flex-col leading-tight">
                <span className="text-[9.5px] opacity-85">{added2 ? '2 itens' : added ? '1 item' : 'Seu carrinho'}</span>
                <span className="text-[12px] font-extrabold">{added2 ? 'R$ 84,80' : added ? 'R$ 39,90' : 'R$ 0,00'}</span>
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-[10.5px] font-extrabold text-[#166534]">Pedir no WhatsApp</span>
            </div>
          </div>
        </div>
      </Fit>
    </div>
  )
}
