import type { ReactNode } from 'react'
import { ArrowRight, Check, ChevronDown, FolderOpen, Play, Sparkles, Store } from 'lucide-react'
import { plans } from '../data/mock'
import { DemoAnuncios, DemoCalendario, DemoChaos, DemoCopy, DemoCortes, DemoHub, DemoImagem, DemoLogo, DemoMentor, DemoWhatsApp } from '../components/FeatureDemos'
import { ModuleIcon, SoonPill } from '../components/Module'
import { StepIdea } from '../components/StepDemos'
import { StoryReel } from '../components/StoryReel'
import { Badge, LinkButton, Logo, cx } from '../components/ui'
import { MODULES, type ModuleId } from '../lib/modules'
import { CREDITS_PER_CHARACTER, CREDITS_PER_LOGO, MAX_PARTS, partCost } from '../lib/pricing'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

type Feature = { id: string; module: ModuleId; name?: string; title: string; text: string; bullets: string[]; demo: ReactNode; soon?: boolean; highlight?: boolean }

const FEATURES: Feature[] = [
  {
    id: 'mentor',
    module: 'mentor',
    highlight: true,
    title: 'Um mentor de vendas que conhece o seu negócio',
    text: 'Conte o que está travando: venda parada, preço, o que postar. Ele pede o seu Instagram, analisa o perfil e entrega um plano feito pro seu negócio, com o botão pra fazer cada passo.',
    bullets: ['Analisa o seu Instagram e mostra o que está travando as vendas', 'Ajuda com preço, oferta, ideia de post e estratégia', 'Cada sugestão vira um botão: gerar o vídeo, a imagem, o texto ou agendar'],
    demo: <DemoMentor className="h-[500px]" />,
  },
  {
    id: 'video',
    module: 'estudio-video',
    highlight: true,
    title: 'Vídeos que prendem, sem saber editar',
    text: 'Conte a ideia em uma frase. O Diretor escreve a história em partes, você vê o custo antes, e o app junta tudo num vídeo vertical pronto pra postar.',
    bullets: ['Historinhas com o seu boneco 3D, com o mesmo rosto em todas as cenas', `Até ${MAX_PARTS} partes de 10 ou 15 segundos num vídeo só, com chamada pra ação no final`, 'Também: vídeo com IA, criativo de anúncio e avatar falando'],
    demo: <StepIdea className="aspect-[4/3] w-full overflow-hidden rounded-[24px] border border-line-strong" />,
  },
  {
    id: 'imagem',
    module: 'estudio-imagem',
    title: 'Foto de estúdio a partir da foto do celular',
    text: 'Mande a foto do produto do jeito que estiver. A IA limpa o fundo, monta a cena e arruma a luz, já no tamanho de cada rede.',
    bullets: ['Foto de produto, post, banner e capa', 'Com as cores da sua marca', 'Sem fotógrafo e sem app de design'],
    demo: <DemoImagem className="mx-auto w-full max-w-[460px]" />,
  },
  {
    id: 'logo',
    module: 'meu-negocio',
    name: 'Logo com IA',
    title: 'Não tem logo? Crie a sua em segundos',
    text: 'Digite o nome, escolha o estilo e as cores. A IA desenha opções e você fica com a que mais gostar. A logo já entra em tudo que você criar.',
    bullets: ['Moderna, minimalista, elegante, divertida ou com mascote', 'Gere quantas quiser até achar a certa', 'Fica guardada na sua Biblioteca, pronta pra baixar'],
    demo: <DemoLogo className="mx-auto w-full max-w-[460px]" />,
  },
  {
    id: 'copy',
    module: 'copy',
    title: 'Textos que vendem, no tom da sua marca',
    text: 'Legenda, gancho, texto de anúncio e mensagem de venda. Você diz sobre o que é, ele escreve pensando em quem compra de você.',
    bullets: ['3 opções por vez pra você escolher', 'Sempre no tom que você definiu', 'Copia com um toque'],
    demo: <DemoCopy className="mx-auto w-full max-w-[460px]" />,
  },
  {
    id: 'cortes',
    module: 'cortes',
    title: 'Uma live vira 10 vídeos curtos',
    text: 'Suba um vídeo longo ou cole o link do YouTube. A IA acha os melhores momentos e entrega cortes verticais com legenda, prontos pra Reels, TikTok e Shorts.',
    bullets: ['Encontra os trechos que mais prendem', 'Corta em 9:16 e coloca legenda', 'Dá pra usar de novo no Estúdio de Vídeo'],
    demo: <DemoCortes className="mx-auto w-full max-w-[460px]" />,
  },
  {
    id: 'whatsapp',
    module: 'whatsapp',
    title: 'Um atendente que responde na hora, 24 horas',
    text: 'Conecte o seu WhatsApp e a IA responde preço, estoque e dúvidas do seu jeito. Ela separa quem quer comprar pra você não perder venda.',
    bullets: ['Responde no tom da sua marca, a qualquer hora', 'Marca os clientes quentes, prontos pra comprar', 'Conecta por QR code ou pela API oficial da Meta'],
    demo: <DemoWhatsApp className="py-4" />,
  },
  {
    id: 'calendario',
    module: 'calendario',
    title: 'O mês planejado em um clique',
    text: 'O Mentor monta o calendário de posts do mês pra você. Em cada dia, um botão gera o conteúdo na hora.',
    bullets: ['Vídeo, post e texto distribuídos no mês', 'Datas importantes do seu nicho', 'Gerar direto do dia'],
    demo: <DemoCalendario className="mx-auto w-full max-w-[460px]" />,
  },
  {
    id: 'anuncios',
    module: 'anuncios',
    title: 'Saiba o que pausar, escalar ou trocar',
    text: 'Conecte o Meta Ads e receba um raio-x das campanhas em português claro: onde está o dinheiro bom e onde está o desperdício.',
    bullets: ['Veredito por campanha', 'Quanto você economiza com cada ajuste', 'Troque o criativo ruim direto no Estúdio'],
    demo: <DemoAnuncios className="mx-auto w-full max-w-[460px]" />,
  },
]

const faq = [
  { q: 'O que é o Plotoon?', a: 'Um estúdio de marketing com IA pra pequenos negócios. Em vez de usar um app de vídeo, um de design, um de texto, várias abas de chat e planilhas, você cria, vende e planeja tudo aqui, com um Mentor que conhece o seu negócio.' },
  { q: 'Preciso saber editar ou mexer com design?', a: 'Não. Você conta o que quer e a IA faz: o vídeo, a imagem, a logo ou o texto. Você só escolhe e posta.' },
  { q: 'Preciso assinar outras ferramentas?', a: 'Não. Tudo é gerado aqui dentro do Plotoon e usa os mesmos créditos.' },
  { q: 'Como funcionam os créditos?', a: `Cada coisa que você gera gasta créditos, e você vê o valor antes de apertar o botão. Uma parte de vídeo de 10 segundos gasta ${partCost(10)} créditos, um boneco 3D gasta ${CREDITS_PER_CHARACTER} e uma logo gasta ${CREDITS_PER_LOGO}.` },
  { q: 'Tudo já está funcionando?', a: 'As historinhas em vídeo, o boneco 3D, a logo com IA, o perfil do negócio e a Biblioteca já estão no ar. As funções marcadas como "Em breve" estão sendo ligadas uma a uma, e você usa todas com a mesma conta.' },
  { q: 'Funciona no celular?', a: 'Sim. É só abrir pelo navegador do celular. Foi feito pensando no celular primeiro.' },
]

function FeatureRow({ f, flip }: { f: Feature; flip: boolean }) {
  const m = MODULES[f.module]
  return (
    <article id={f.id} className="scroll-mt-24 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={cx('flex flex-col gap-5', flip && 'lg:order-2')}>
        <span className="flex items-center gap-3">
          <ModuleIcon id={f.module} />
          <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-accent-text">{f.name ?? m.name}</span>
          {f.soon ?? !m.ready ? <SoonPill /> : null}
        </span>
        <h3 className="text-balance m-0 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-[36px]">{f.title}</h3>
        <p className="m-0 text-[16px] leading-relaxed text-muted sm:text-[17px]">{f.text}</p>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {f.bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[15px] text-soft">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Check size={13} strokeWidth={3} aria-hidden />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={cx('relative', flip && 'lg:order-1')}>
        <span aria-hidden className="pointer-events-none absolute -inset-8 rounded-full bg-[radial-gradient(closest-side,#ff8a3d22,transparent)] blur-2xl" />
        <div className="relative">{f.demo}</div>
      </div>
    </article>
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
              ['funcoes', 'Funções'],
              ['mentor', 'Mentor'],
              ['precos', 'Planos'],
              ['duvidas', 'Dúvidas'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => scrollTo(id)} className="min-h-10 cursor-pointer rounded-lg px-3 text-[14px] font-medium text-muted transition-colors hover:text-ink">
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LinkButton to="entrar" variant="ghost" size="sm" className="hidden sm:inline-flex">
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
          <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pb-20 lg:pt-16">
            <div className="flex flex-col gap-6">
              <Badge tone="accent" className="rise self-start !bg-accent-soft !text-accent-text shadow-[0_0_0_1px_#ff8a3d55]">
                <Sparkles size={13} aria-hidden /> Estúdio de marketing com IA
              </Badge>
              <h1 className="rise rise-1 text-balance m-0 font-display text-[40px] font-extrabold leading-[1.03] tracking-[-0.04em] sm:text-[58px]">
                Tudo que o seu negócio precisa pra <span className="text-accent text-glow">vender</span>, num lugar só.
              </h1>
              <p className="rise rise-2 m-0 max-w-[540px] text-[17px] leading-relaxed text-muted sm:text-[19px]">
                Um <strong className="font-semibold text-ink">Mentor de IA</strong> que conhece o seu negócio te diz o que fazer. O estúdio faz: <strong className="font-semibold text-ink">vídeos</strong>, imagens, logo e textos. E ainda atende no WhatsApp, planeja o mês e analisa seus anúncios.
              </p>
              <div className="rise rise-3 flex flex-wrap gap-3">
                <LinkButton to="criar-conta" size="lg" className="pulse">
                  Criar minha conta <ArrowRight size={18} />
                </LinkButton>
                <button type="button" onClick={() => scrollTo('funcoes')} className="press inline-flex min-h-13 cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-bg/40 px-6 text-[15px] font-semibold text-ink backdrop-blur hover:border-accent-line">
                  <Play size={16} fill="currentColor" /> Ver como funciona
                </button>
              </div>
              <p className="rise rise-4 m-0 text-[14px] text-subtle">Troque 5 apps e 30 abas por um só.</p>
            </div>
            <DemoHub className="rise rise-2 aspect-[4/5] w-full sm:aspect-[4/3.6]" />
          </div>
        </section>

        {/* 5 APPS VIRAM 1 */}
        <section className="border-y border-line bg-side">
          <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-8 px-5 py-16 text-center sm:px-8 sm:py-20">
            <div className="flex flex-col gap-3">
              <h2 className="text-balance m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Chega de pular de app em app</h2>
              <p className="m-0 text-[16px] text-muted sm:text-[17px]">Um app pra vídeo, outro pra arte, outro pra texto, vários chats de IA abertos e uma planilha pra organizar. Aqui é tudo junto e um conversa com o outro.</p>
            </div>
            <DemoChaos />
          </div>
        </section>

        {/* DESTAQUES: MENTOR E VÍDEO */}
        <section className="relative border-t border-line">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <Badge tone="violet" className="self-center">
                <Sparkles size={13} aria-hidden /> O coração do Plotoon
              </Badge>
              <h2 className="text-balance m-0 max-w-[760px] font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[44px]">
                Um Mentor que te diz o que fazer. Um estúdio que faz.
              </h2>
              <p className="m-0 max-w-[620px] text-[16px] text-muted sm:text-[17px]">Você conta o que está travando, o Mentor monta o plano e, com um toque, o Estúdio de Vídeo transforma a ideia em vídeo pronto pra postar.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {FEATURES.filter((f) => f.highlight).map((f) => (
                <article key={f.id} id={f.id} className="scroll-mt-24 neon-border flex min-w-0 flex-col gap-5 rounded-[28px] bg-[#111319] p-5 sm:p-7">
                  <span className="flex items-center gap-3">
                    <ModuleIcon id={f.module} size="lg" />
                    <span className="flex flex-col">
                      <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-accent-text">Destaque</span>
                      <span className="font-display text-[20px] font-bold">{MODULES[f.module].name}</span>
                    </span>
                  </span>
                  <h3 className="text-balance m-0 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-[30px]">{f.title}</h3>
                  <p className="m-0 text-[15.5px] leading-relaxed text-muted">{f.text}</p>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-[14.5px] text-soft">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                          <Check size={13} strokeWidth={3} aria-hidden />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-1 flex-col">
                    {f.module === 'mentor' ? (
                      <DemoMentor className="h-full min-h-[520px] flex-1" />
                    ) : (
                      <div className="flex flex-col gap-4">
                        <StepIdea className="aspect-[4/3.9] w-full overflow-hidden rounded-[24px] border border-line-strong sm:aspect-[4/3]" />
                        <div className="-mx-5 overflow-hidden sm:-mx-7">
                          <StoryReel size="sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FUNÇÕES */}
        <section id="funcoes" className="scroll-mt-20">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 pb-6 pt-16 sm:px-8 sm:pt-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-balance m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">O que tem dentro</h2>
              <p className="m-0 text-[16px] text-muted">Toque numa função pra ver ela funcionando.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {FEATURES.map((f, i) => {
                const m = MODULES[f.module]
                return (
                  <button key={f.id} type="button" onClick={() => scrollTo(f.id)} className={cx('rise lift relative flex cursor-pointer flex-col items-start gap-3 rounded-[20px] p-4 text-left', f.highlight ? 'neon-border bg-[#16110d]' : 'border border-line bg-surface', `rise-${(i % 4) + 1}`)}>
                    {f.highlight && <span className="absolute right-3 top-3 rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold text-accent-ink">Destaque</span>}
                    <ModuleIcon id={f.module} />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-ink">{f.name ?? m.short ?? m.name}</span>
                      <span className="line-clamp-2 text-[12.5px] text-muted">{f.title}</span>
                    </span>
                  </button>
                )
              })}
              <button type="button" onClick={() => scrollTo('base')} className="rise lift flex cursor-pointer flex-col items-start gap-3 rounded-[20px] border border-line bg-surface p-4 text-left">
                <ModuleIcon id="biblioteca" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-ink">Biblioteca</span>
                  <span className="line-clamp-2 text-[12.5px] text-muted">Tudo que você criou, guardado num lugar só</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* CADA FUNÇÃO EM AÇÃO */}
        <section>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-24 px-5 py-16 sm:px-8 sm:py-20 lg:gap-32">
            {FEATURES.filter((f) => !f.highlight).map((f, i) => (
              <FeatureRow key={f.id} f={f} flip={i % 2 === 1} />
            ))}
          </div>
        </section>

        {/* BASE: MEU NEGÓCIO + BIBLIOTECA */}
        <section id="base" className="scroll-mt-20 border-y border-line bg-side">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-balance m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Configure uma vez. Tudo sai com a sua cara.</h2>
              <p className="m-0 max-w-[640px] text-[16px] text-muted">No primeiro acesso você conta sobre o seu negócio. Daí pra frente, todo vídeo, imagem e texto já sai com o seu nome, a sua logo, as suas cores e o seu jeito de falar.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="lift flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-6">
                <span className="flex items-center gap-3">
                  <ModuleIcon id="meu-negocio" />
                  <span className="text-[18px] font-bold">Meu Negócio</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Nome', 'Nicho', 'O que vende', 'Público', 'Tom de voz', 'Logo', 'Cores', 'Redes sociais', 'Elenco 3D'].map((c, k) => (
                    <span key={c} className="pop rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-soft" style={{ animationDelay: `${k * 60}ms` }}>
                      <Store size={12} className="mr-1.5 inline text-accent" aria-hidden />
                      {c}
                    </span>
                  ))}
                </div>
                <p className="m-0 text-[14.5px] text-muted">Leva 2 minutos e dá pra mudar quando quiser.</p>
              </div>
              <div className="lift flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-6">
                <span className="flex items-center gap-3">
                  <ModuleIcon id="biblioteca" />
                  <span className="text-[18px] font-bold">Biblioteca</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Vídeos', 'Imagens', 'Logos', 'Cortes', 'Textos', 'Personagens'].map((c, k) => (
                    <span key={c} className="pop rounded-full border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-soft" style={{ animationDelay: `${k * 60}ms` }}>
                      <FolderOpen size={12} className="mr-1.5 inline text-sky" aria-hidden />
                      {c}
                    </span>
                  ))}
                </div>
                <p className="m-0 text-[14.5px] text-muted">Tudo que você gera fica guardado, com filtro, download e o botão "usar de novo".</p>
              </div>
            </div>
          </div>
        </section>

        {/* EXEMPLOS */}
        <section>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 pb-8 pt-16 text-center sm:px-8 sm:pt-20">
            <h2 className="text-balance m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Feito no Plotoon</h2>
            <p className="m-0 text-[16px] text-muted">Historinhas com boneco 3D, do jeito que você vai criar.</p>
          </div>
          <StoryReel size="lg" className="pb-16 sm:pb-20" />
        </section>

        {/* CRÉDITOS */}
        <section className="border-y border-line bg-side">
          <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="text-balance m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[40px]">Um crédito pra tudo</h2>
              <p className="m-0 text-[16px] text-muted">Os mesmos créditos servem pra todas as funções, e você sempre vê o custo antes de gerar. Sem surpresa.</p>
            </div>
            <div className="grid gap-2.5">
              {[
                ['Parte de vídeo de 10 segundos', partCost(10)],
                ['Parte de vídeo de 15 segundos', partCost(15)],
                ['Boneco 3D com o seu rosto', CREDITS_PER_CHARACTER],
                ['Logo com IA', CREDITS_PER_LOGO],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
                  <span className="text-[15px] font-semibold">{k}</span>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-[14px] font-bold text-accent-text">{v} créditos</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section id="precos" className="scroll-mt-20">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-balance m-0 font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Escolha seu plano</h2>
              <p className="m-0 text-[16px] text-muted">Todas as funções em todos os planos. Muda só a quantidade de créditos.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((p) => (
                <article key={p.id} className={cx('lift relative flex flex-col gap-6 rounded-[22px] p-6', p.highlight ? 'neon-border bg-[#16110d]' : 'border border-line bg-surface')}>
                  {p.highlight && <Badge tone="accent" className="absolute -top-3 left-6">Mais escolhido</Badge>}
                  <div className="flex flex-col gap-1.5">
                    <h3 className="m-0 font-display text-[22px] font-bold">{p.name}</h3>
                    <p className="m-0 text-[14px] text-muted">{p.tagline}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-[34px] font-extrabold tracking-[-0.02em]">{p.price}</span>
                    {p.price.startsWith('R$') && <span className="text-[14px] text-muted">/mês</span>}
                  </div>
                  <span className="text-[14px] font-semibold text-accent-text">{p.credits}</span>
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-[15px] text-soft">
                        <Check size={18} className="shrink-0 text-sky-text" aria-hidden /> {f}
                      </li>
                    ))}
                  </ul>
                  <LinkButton to="criar-conta" variant={p.highlight ? 'primary' : 'secondary'} size="lg" className="mt-auto">
                    Começar com o {p.name}
                  </LinkButton>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* DÚVIDAS */}
        <section id="duvidas" className="scroll-mt-20 border-t border-line bg-side">
          <div className="mx-auto flex max-w-[760px] flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="text-balance m-0 text-center font-display text-[30px] font-extrabold tracking-[-0.03em] sm:text-[42px]">Dúvidas</h2>
            <div className="flex flex-col gap-3">
              {faq.map((item) => (
                <details key={item.q} className="group rounded-[16px] border border-line bg-surface transition-colors open:border-accent-line">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[16px] font-semibold">
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
        <section className="relative overflow-hidden">
          <div className="aurora"><span /></div>
          <div className="relative mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-5 py-20 text-center sm:px-8 sm:py-24">
            <h2 className="text-balance m-0 font-display text-[34px] font-extrabold tracking-[-0.03em] sm:text-[52px]">Seu negócio inteiro num lugar só.</h2>
            <p className="m-0 max-w-[520px] text-[16px] text-muted">Crie a conta, conte sobre o seu negócio e faça o primeiro conteúdo hoje.</p>
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
