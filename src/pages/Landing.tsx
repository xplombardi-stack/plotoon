import { ArrowRight, ChevronDown, Ear, MessageCircle, Receipt, Hand } from 'lucide-react'
import { ModuleIcon } from '../components/Module'
import { Badge, LinkButton, Logo } from '../components/ui'
import { FEATURED, MODULES, type ModuleId } from '../lib/modules'
import { DemoAtendente, RoboVsAtendente } from '../components/WhatsAppShowcase'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// só o essencial: o resto a pessoa vê dentro do app, depois de entrar
const PRINCIPAIS: Array<{ id: ModuleId; t: string }> = [
  { id: 'whatsapp', t: 'Atende, tira dúvida e fecha pedido no seu WhatsApp, 24h.' },
  { id: 'mentor', t: 'Seu estrategista de marketing: diz o que fazer pra vender mais.' },
  { id: 'estudio-imagem', t: 'Fotos de produto e posts prontos pro Instagram.' },
  { id: 'estudio-video', t: 'Vídeos curtos pra Reels e anúncios, em minutos.' },
]

const DIFERENCIAIS = [
  { icon: MessageCircle, t: 'Conversa como gente' },
  { icon: Ear, t: 'Ouve áudio e vê foto' },
  { icon: Receipt, t: 'Fecha o pedido com a taxa certa' },
  { icon: Hand, t: 'Te chama quando precisa' },
]

const PASSOS = ['Crie sua conta em 1 minuto', 'Conte o que você vende', 'Conecte o WhatsApp e comece']

const faq = [
  { q: 'É aquele robô de "digite 1, 2 ou 3"?', a: 'Não. Ele lê o que o cliente escreveu (ou ouve o áudio) e responde curto e natural, como alguém da sua loja. Só usa os preços e regras que você ensinou e, quando o cliente quer fechar ou reclamar, te avisa pra você assumir.' },
  { q: 'Como conecto o meu WhatsApp?', a: 'Pelo QR code, igual no WhatsApp Web. Leva 1 minuto. Recomendamos um número só pro atendimento.' },
  { q: 'Quanto custa?', a: 'Você usa créditos: cada resposta, imagem ou vídeo gasta um pouco. Tem planos mensais a partir de R$ 47 e pacotes de créditos a partir de R$ 5, sem fidelidade. Tudo aparece dentro do app depois que você entra.' },
  { q: 'Preciso entender de marketing?', a: 'Não. O Mentor te diz o que fazer e cada ferramenta já vem pronta pro seu tipo de negócio.' },
]

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
              ['whatsapp', 'Atendente'],
              ['funcoes', 'Funções'],
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
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pb-20 lg:pt-16">
            <div className="flex flex-col gap-5">
              <Badge tone="accent" className="rise self-start !border-[#34d39955] !bg-[#34d39914] !text-[#6ee7b7]">
                <MessageCircle size={13} aria-hidden /> Atendente no WhatsApp com IA
              </Badge>
              <h1 className="rise rise-1 text-balance m-0 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[56px]">
                Um atendente no WhatsApp que conversa como gente e <span className="text-accent text-glow">vende</span> por você.
              </h1>
              <p className="rise rise-2 m-0 max-w-[520px] text-[17px] leading-relaxed text-muted sm:text-[19px]">
                Nada de robô com "digite 1". E ainda tem um Mentor de marketing, imagens e vídeos com IA.
              </p>
              <div className="rise rise-3 flex flex-wrap items-center gap-3">
                <LinkButton to="criar-conta" size="lg" className="pulse">
                  Criar minha conta <ArrowRight size={18} />
                </LinkButton>
                <LinkButton to="entrar" variant="ghost" size="lg">
                  Já tenho conta
                </LinkButton>
              </div>
            </div>
            <DemoAtendente className="rise rise-2" compact />
          </div>
        </section>

        {/* ROBÔ X GENTE */}
        <section id="whatsapp" className="scroll-mt-20 border-y border-line bg-side">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="text-balance m-0 text-center font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[42px]">Robô de menu afasta cliente. Atendimento de verdade vende.</h2>
            <RoboVsAtendente />
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-4">
              {DIFERENCIAIS.map((d) => (
                <li key={d.t} className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-[14px] font-semibold text-soft">
                  <d.icon size={17} className="shrink-0 text-[#6ee7b7]" /> {d.t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* O QUE TEM */}
        <section id="funcoes" className="scroll-mt-20">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="text-balance m-0 text-center font-display text-[28px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[42px]">Tudo pra vender mais, num lugar só</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {PRINCIPAIS.map((x) => (
                <article key={x.id} className={`flex flex-col gap-3 rounded-[20px] border p-4 ${FEATURED[x.id] ? 'neon-border bg-[#16110d]' : 'border-line bg-surface'}`}>
                  <ModuleIcon id={x.id} />
                  <span className="text-[16px] font-bold leading-tight">{MODULES[x.id].name}</span>
                  <span className="text-[13.5px] leading-snug text-muted">{x.t}</span>
                </article>
              ))}
            </div>
            <p className="m-0 text-center text-[14.5px] text-muted">E mais: análise de anúncios, textos de venda, calendário de posts e criador de apps.</p>
          </div>
        </section>

        {/* COMO COMEÇAR */}
        <section className="border-y border-line bg-side">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-12 sm:px-8 sm:py-16">
            <h2 className="m-0 text-center font-display text-[26px] font-extrabold tracking-[-0.03em] sm:text-[36px]">Comece em 3 passos</h2>
            <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
              {PASSOS.map((p, i) => (
                <li key={p} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[16px] font-extrabold text-accent-ink">{i + 1}</span>
                  <span className="text-[15.5px] font-semibold">{p}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* DÚVIDAS */}
        <section id="duvidas" className="scroll-mt-20">
          <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-5 py-14 sm:px-8 sm:py-20">
            <h2 className="m-0 text-center font-display text-[28px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Dúvidas</h2>
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

        {/* CHAMADA FINAL */}
        <section className="relative overflow-hidden border-t border-line">
          <div className="aurora"><span /></div>
          <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-5 px-5 py-16 text-center sm:px-8 sm:py-24">
            <h2 className="text-balance m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[48px]">Seu atendente começa hoje.</h2>
            <LinkButton to="criar-conta" size="lg" className="pulse">
              Criar minha conta <ArrowRight size={18} />
            </LinkButton>
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
