import { ArrowRight, Check, ChevronDown, Play, TrendingDown, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { ModuleIcon } from '../components/Module'
import { MentorIcon } from '../components/MentorIcon'
import { LinkButton, Logo, cx } from '../components/ui'
import { MODULES, type ModuleId } from '../lib/modules'
import { DemoAtendente } from '../components/WhatsAppShowcase'
import { DemoApps } from '../components/FeatureDemos'
import { StoryReel } from '../components/StoryReel'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// o que tem dentro (o resto a pessoa descobre depois de entrar)
const DENTRO: Array<{ id: ModuleId; t: string }> = [
  { id: 'whatsapp', t: 'Responde, tira dúvida e fecha pedido no seu WhatsApp, 24h.' },
  { id: 'mentor', t: 'Estrategista de marketing que diz o que fazer pra vender.' },
  { id: 'estudio-imagem', t: 'Foto de produto e post prontos pro Instagram.' },
  { id: 'estudio-video', t: 'Vídeos curtos pra Reels e anúncios.' },
  { id: 'anuncios', t: 'Diz quais anúncios pausar, manter ou escalar.' },
  { id: 'copy', t: 'Legendas e textos de venda no seu tom.' },
  { id: 'calendario', t: 'O mês de posts planejado pra você.' },
  { id: 'apps', t: 'Seu site ou app criado conversando.' },
]

const faq = [
  { q: 'Serve pro meu negócio?', a: 'Serve pra quem vende: de autônomo a empresa. Pizzaria, barbearia, loja, fábrica, clínica, infoproduto. No começo você escolhe o tipo do seu negócio e tudo no app se ajusta a ele.' },
  { q: 'O atendente é aquele robô de "digite 1, 2 ou 3"?', a: 'Não. Ele lê o que o cliente escreveu (ou ouve o áudio) e responde curto e natural, como alguém da sua loja. Só usa os preços e regras que você ensinou e te avisa quando o cliente quer fechar.' },
  { q: 'Quanto custa?', a: 'Você usa créditos: cada resposta, imagem ou vídeo gasta um pouco. Planos mensais a partir de R$ 47 e pacotes a partir de R$ 5, sem fidelidade.' },
  { q: 'Preciso entender de marketing?', a: 'Não. O Mentor te diz o que fazer e cada ferramenta já vem pronta pro seu tipo de negócio.' },
]

// cartõezinhos em volta do celular: mostram que é mais que WhatsApp
function Flutuante({ className, children }: { className: string; children: ReactNode }) {
  return <div className={cx('absolute z-10 hidden items-center sm:flex gap-2.5 rounded-2xl border border-line-strong bg-[#11141bee] px-3 py-2.5 shadow-[0_20px_40px_-20px_#000] backdrop-blur', className)}>{children}</div>
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] py-4">
      <DemoAtendente compact className="max-w-[300px]" />
      <Flutuante className="-left-1 top-[24%] max-w-[200px] sm:-left-10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#a78bfa44] bg-[#a78bfa14] text-[#c4b5fd]">
          <MentorIcon size={16} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-bold text-[#c4b5fd]">Mentor</span>
          <span className="text-[12.5px] text-ink">Segunda fraca? Crie um combo só pra ela.</span>
        </span>
      </Flutuante>
      <Flutuante className="-right-1 top-[56%] sm:-right-10">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#ff8a3d44] bg-[#ff8a3d14] text-[#fdba74]">
          <Play size={14} fill="currentColor" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-bold text-[#fdba74]">Vídeo</span>
          <span className="text-[12.5px] text-ink">Reels pronto em 3 min</span>
        </span>
      </Flutuante>
      <Flutuante className="-left-1 bottom-[7%] sm:-left-12">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#38bdf844] bg-[#38bdf814] text-[#7dd3fc]">
          <TrendingDown size={15} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-bold text-[#7dd3fc]">Anúncios</span>
          <span className="text-[12.5px] text-ink">Pausar "Público frio": caro</span>
        </span>
      </Flutuante>
      <div className="mt-4 flex flex-wrap justify-center gap-2 sm:hidden">
        {[
          ['Mentor', 'from-[#a78bfa] to-[#5b8cff]'],
          ['Vídeos', 'from-[#ff8a3d] to-[#ff5d5d]'],
          ['Imagens', 'from-[#38bdf8] to-[#5b8cff]'],
          ['Anúncios', 'from-[#38bdf8] to-[#34d399]'],
        ].map(([t, c]) => (
          <span key={t} className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-soft">
            <span className={cx('h-2.5 w-2.5 rounded-full bg-gradient-to-br', c)} /> + {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function Bolha({ de, children, ruim }: { de: 'cliente' | 'outro'; children: ReactNode; ruim?: boolean }) {
  return (
    <span className={cx('max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-snug', de === 'cliente' ? 'self-end rounded-tr-sm bg-[#005c4b] text-white' : ruim ? 'self-start rounded-tl-sm bg-[#262a31] font-mono text-[12px] text-[#c3c8d0]' : 'self-start rounded-tl-sm bg-[#202c33] text-white')}>
      {children}
    </span>
  )
}

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#site" className="press no-underline" aria-label="Plotoon">
            <Logo />
          </a>
          <nav aria-label="Seções" className="hidden items-center gap-1 md:flex">
            {[
              ['destaques', 'Destaques'],
              ['dentro', 'O que tem dentro'],
              ['duvidas', 'Dúvidas'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="min-h-10 cursor-pointer rounded-lg px-3 text-[14px] font-medium text-muted transition-colors hover:text-ink">
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LinkButton to="entrar" variant="ghost" size="sm">
              Entrar
            </LinkButton>
            <LinkButton to="criar-conta" size="sm" className="whitespace-nowrap">
              Começar agora
            </LinkButton>
          </div>
        </div>
      </header>

      <main>
        {/* TOPO */}
        <section className="relative overflow-hidden">
          <div className="aurora"><span /></div>
          <div className="relative mx-auto grid max-w-[1120px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-14 lg:pt-12">
            <div className="flex flex-col gap-5">
              <span className="rise tag-mono flex items-center gap-2 self-start rounded-full border border-line-strong bg-surface px-3 py-1.5 text-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" /> Plataforma de vendas para negócios
              </span>
              <h1 className="rise rise-1 text-balance m-0 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[52px]">
                Atenda, divulgue e <span className="text-accent">venda mais</span>. Tudo com IA, num lugar só.
              </h1>
              <p className="rise rise-2 m-0 max-w-[520px] text-[16.5px] leading-relaxed text-muted sm:text-[18px]">
                Um atendente que responde seus clientes no WhatsApp, um estrategista de marketing que te diz o que fazer, e imagens, vídeos e anúncios prontos. Pra quem vende sozinho ou tem empresa.
              </p>
              <div className="rise rise-3 flex flex-wrap items-center gap-3">
                <LinkButton to="criar-conta" size="lg" className="pulse">
                  Criar minha conta <ArrowRight size={18} />
                </LinkButton>
                <button type="button" onClick={() => scrollTo('dentro')} className="press inline-flex min-h-13 cursor-pointer items-center rounded-xl px-4 text-[15px] font-semibold text-soft hover:text-ink">
                  Ver o que tem dentro
                </button>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* DESTAQUES */}
        <section id="destaques" className="scroll-mt-20 border-y border-line bg-side">
          <div className="mx-auto grid max-w-[1120px] gap-4 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:py-16">
            <article className="flex flex-col gap-4 rounded-[20px] border border-[#34d39944] bg-surface p-5 sm:p-6">
              <span className="flex items-center gap-3">
                <ModuleIcon id="whatsapp" />
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-[21px] font-extrabold">Atendente no WhatsApp</span>
                  <span className="text-[13.5px] text-muted">Conversa como gente, não como robô</span>
                </span>
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1.5 rounded-2xl bg-[#0b0d11] p-2.5">
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#f87171]">
                    <X size={12} strokeWidth={3} /> Robô comum
                  </span>
                  <Bolha de="cliente">tem a jaqueta preta no M?</Bolha>
                  <Bolha de="outro" ruim>Opção inválida. Digite 1, 2 ou 3.</Bolha>
                </div>
                <div className="flex flex-col gap-1.5 rounded-2xl bg-[#0b141a] p-2.5">
                  <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6ee7b7]">
                    <Check size={12} strokeWidth={3} /> Plotoon
                  </span>
                  <Bolha de="cliente">tem a jaqueta preta no M?</Bolha>
                  <Bolha de="outro">Tem sim! Sai R$ 189,90. Quer que eu separe pra você?</Bolha>
                </div>
              </div>
              <p className="m-0 text-[14.5px] text-soft">Ouve áudio, fecha pedido, marca horário na agenda e te avisa quando precisa de você.</p>
            </article>

            <article className="flex flex-col gap-4 rounded-[20px] border border-[#a78bfa44] bg-surface p-5 sm:p-6">
              <span className="flex items-center gap-3">
                <ModuleIcon id="mentor" />
                <span className="flex flex-col leading-tight">
                  <span className="font-display text-[21px] font-extrabold">Mentor estrategista</span>
                  <span className="text-[13.5px] text-muted">Você conta o problema, ele monta a estratégia</span>
                </span>
              </span>
              <div className="flex flex-col gap-2 rounded-2xl bg-[#0d0c14] p-3">
                <span className="self-end rounded-2xl rounded-br-md bg-accent px-3 py-2 text-[13px] font-medium text-accent-ink">Minha agenda fica vazia na segunda. O que eu faço?</span>
                <span className="flex flex-col gap-1 self-start text-[13px] leading-snug text-soft">
                  <span>Crie o <b className="text-ink">Combo segunda</b>: um serviço extra de brinde só nesse dia.</span>
                  <span>1. Poste hoje um Reels de 15s mostrando o antes e depois.</span>
                  <span>2. Mande a oferta pra quem não volta há mais de 30 dias.</span>
                </span>
              </div>
              <p className="m-0 text-[14.5px] text-soft">Ele já conhece o seu negócio e responde como alguém do seu ramo.</p>
            </article>
          </div>
        </section>

        {/* E AINDA */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-[1120px] gap-4 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:py-16">
            <article className="flex flex-col gap-4 overflow-hidden rounded-[20px] border border-line bg-surface p-5 sm:p-6">
              <span className="tag-mono text-accent-text">Vídeos de historinha</span>
              <h3 className="m-0 font-display text-[22px] font-bold leading-tight tracking-[-0.02em]">Um personagem 3D da sua marca contando histórias que vendem</h3>
              <p className="m-0 text-[14.5px] text-muted">Você cria o boneco uma vez e ele aparece em vídeos curtos pro Reels e TikTok, sempre com o mesmo rosto.</p>
              <StoryReel size="md" className="-mx-5 mt-auto sm:-mx-6" />
            </article>
            <article className="flex flex-col gap-4 overflow-hidden rounded-[20px] border border-line bg-surface p-5 sm:p-6">
              <span className="tag-mono text-[#67e8f9]">Criador de apps</span>
              <h3 className="m-0 font-display text-[22px] font-bold leading-tight tracking-[-0.02em]">O site ou app do seu negócio, criado numa conversa</h3>
              <p className="m-0 text-[14.5px] text-muted">Cardápio digital, página de agendamento, catálogo. Você descreve, ele monta e publica.</p>
              <DemoApps className="mx-auto w-full max-w-[460px]" />
            </article>
          </div>
        </section>

        {/* O QUE TEM DENTRO */}
        <section id="dentro" className="scroll-mt-20">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-5 py-12 sm:px-8 lg:py-16">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="m-0 font-display text-[28px] font-extrabold tracking-[-0.03em] sm:text-[38px]">O que tem dentro</h2>
              <p className="m-0 text-[15px] text-muted">Tudo se ajusta ao tipo do seu negócio.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {DENTRO.map((x, i) => (
                <article key={x.id} className={cx('flex flex-col gap-2.5 rounded-[18px] border p-3.5', i < 2 ? 'border-accent-line bg-surface' : 'border-line bg-surface')}>
                  <span className="flex items-center gap-2.5">
                    <ModuleIcon id={x.id} size="sm" />
                    <span className="text-[14.5px] font-bold leading-tight">{MODULES[x.id].short ?? MODULES[x.id].name}</span>
                  </span>
                  <span className="text-[13px] leading-snug text-muted">{x.t}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* DÚVIDAS + CHAMADA */}
        <section id="duvidas" className="scroll-mt-20 border-t border-line bg-side">
          <div className="mx-auto grid max-w-[1120px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:py-16">
            <div className="flex flex-col gap-4">
              <h2 className="text-balance m-0 font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[38px]">Comece hoje. O resto você descobre lá dentro.</h2>
              <p className="m-0 text-[15px] text-muted">Crie a conta em 1 minuto, escolha o tipo do seu negócio e use.</p>
              <LinkButton to="criar-conta" size="lg" className="self-start">
                Criar minha conta <ArrowRight size={18} />
              </LinkButton>
            </div>
            <div className="flex flex-col gap-2.5">
              {faq.map((item) => (
                <details key={item.q} className="group rounded-[16px] border border-line bg-surface transition-colors open:border-accent-line">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[15.5px] font-semibold">
                    {item.q}
                    <ChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="m-0 px-5 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[14px] text-subtle sm:px-8">
          <Logo size="sm" />
          <div className="flex flex-wrap gap-5">
            <a href="#site" className="text-subtle no-underline hover:text-ink">
              Termos de uso
            </a>
            <a href="#site" className="text-subtle no-underline hover:text-ink">
              Privacidade
            </a>
            <span>© Plotoon</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
