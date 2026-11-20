// Módulos com a tela pronta e a API ainda não ligada: conteúdo de exemplo e um aviso discreto.
import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, CalendarPlus, Clapperboard, Copy, ImagePlus, Link2, MessageCircle, Pause, QrCode, Rocket, Send, ShieldCheck, Sparkles, TrendingUp, Upload, Wand2 } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { LoopVideo } from '../components/LoopVideo'
import { ModuleHeader, SoonNotice } from '../components/Module'
import { stories as reel } from '../components/StoryReel'
import { Button, cx, go } from '../components/ui'
import { tipOfTheDay, useBusiness } from '../lib/business'
import type { ModuleId } from '../lib/modules'
import estiloCinema from '../assets/estilos/estilo-cinema.webp'
import estiloRealista from '../assets/estilos/estilo-realista.webp'
import estiloFofinho from '../assets/estilos/estilo-fofinho.webp'
import cardCreditos from '../assets/inicio/card-creditos.webp'

const box = 'rounded-[24px] border border-line bg-surface p-5 sm:p-6'
const fieldCls = 'min-h-12 w-full rounded-[14px] border border-line-strong bg-bg/70 px-4 text-[15px] text-ink outline-none placeholder:text-subtle'

function Frame({ id, phase, children }: { id: ModuleId; phase: number; children: ReactNode }) {
  return (
    <AppShell active={id}>
      <ModuleHeader id={id} />
      <SoonNotice className="rise rise-1">Ainda não está ativo. Chega na fase {phase}. O que você vê aqui é um exemplo de como vai funcionar.</SoonNotice>
      {children}
    </AppShell>
  )
}

function useBiz() {
  const { business } = useBusiness()
  return { ...business, nome: business.name || 'sua loja', produto: business.sells ? business.sells.split(/[,.]/)[0] : 'seu produto' }
}

/* ---------- Mentor ---------- */
export function Mentor() {
  const b = useBiz()
  const tip = tipOfTheDay(b)
  function make() {
    try {
      sessionStorage.setItem('plotoon:ideia', tip.idea)
      sessionStorage.removeItem('plotoon:rascunho')
    } catch {
      /* sem armazenamento */
    }
    go('nova-historinha')
  }
  return (
    <Frame id="mentor" phase={2}>
      <div className={cx(box, 'rise flex flex-col gap-4')}>
        <div className="flex justify-end">
          <p className="m-0 max-w-[80%] rounded-[18px] rounded-br-md bg-accent px-4 py-3 text-[15px] font-medium text-accent-ink">Minhas vendas caíram essa semana. O que eu posto pra movimentar?</p>
        </div>
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#5b8cff] text-white">
            <Sparkles size={17} aria-hidden />
          </span>
          <div className="flex max-w-[88%] flex-col gap-3">
            <p className="m-0 rounded-[18px] rounded-tl-md border border-line bg-bg/60 px-4 py-3 text-[15px] leading-relaxed text-soft">
              Pra {b.nome}, eu faria 3 coisas hoje: uma historinha com virada mostrando o cliente antes e depois, uma legenda com escassez e um lembrete no WhatsApp pra quem perguntou preço e sumiu. Começa pela historinha:
            </p>
            <div className="pop flex flex-col gap-3 rounded-[18px] border border-accent-line bg-[#ff8a3d10] p-4">
              <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-accent-text">
                <Clapperboard size={15} aria-hidden /> Ideia de vídeo
              </span>
              <span className="text-[15px] font-semibold text-ink">{tip.idea}</span>
              <div className="flex flex-wrap gap-2">
                <Button onClick={make}>
                  Gerar esse vídeo <ArrowRight size={16} />
                </Button>
                <Button variant="soft" disabled>
                  <CalendarPlus size={16} /> Agendar no calendário
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-[16px] border border-line-strong bg-bg/70 p-1.5 pl-4 opacity-70">
          <span className="flex-1 text-[15px] text-subtle">Pergunte ao Mentor…</span>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-ink">
            <Send size={18} aria-hidden />
          </span>
        </div>
      </div>
    </Frame>
  )
}

/* ---------- Estúdio de Imagem ---------- */
export function ImageStudio() {
  const b = useBiz()
  const kinds = [
    { t: 'Foto de produto', s: 'Fundo de estúdio, luz profissional', img: estiloRealista },
    { t: 'Post', s: 'Feed e carrossel no tamanho certo', img: estiloFofinho },
    { t: 'Banner', s: 'Site, loja e promoções', img: cardCreditos },
    { t: 'Capa', s: 'Reels, YouTube e destaques', img: estiloCinema },
  ]
  return (
    <Frame id="estudio-imagem" phase={3}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kinds.map((k, i) => (
          <div key={k.t} className={cx('rise lift relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] border border-line-strong p-4', `rise-${i + 1}`)}>
            <img src={k.img} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <span className="relative text-[16px] font-bold text-white">{k.t}</span>
            <span className="relative text-[13px] text-white/75">{k.s}</span>
          </div>
        ))}
      </div>
      <div className={cx(box, 'rise flex flex-col gap-4')}>
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-strong px-4 py-8 text-center opacity-80">
          <ImagePlus size={28} className="text-accent" aria-hidden />
          <span className="text-[15px] font-semibold">Envie a foto do produto</span>
          <span className="text-[13px] text-muted">Pode ser de celular. A IA limpa o fundo e monta a cena.</span>
        </div>
        <input disabled className={fieldCls} placeholder={`Como você quer a foto? Ex.: ${b.produto} numa mesa de mármore, luz natural`} />
        <Button size="lg" disabled className="self-start">
          Gerar 4 imagens · 8 créditos
        </Button>
      </div>
    </Frame>
  )
}

/* ---------- Cortes ---------- */
export function Clips() {
  const cuts = [
    { n: 2, t: 'O erro que todo iniciante comete', s: '0:42' },
    { n: 6, t: 'Como eu dobrei as vendas', s: '0:58' },
    { n: 10, t: 'Ninguém te conta isso', s: '0:35' },
    { n: 14, t: 'Faz isso hoje', s: '0:47' },
  ]
  return (
    <Frame id="cortes" phase={3}>
      <div className={cx(box, 'rise grid gap-4 lg:grid-cols-2')}>
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-strong px-4 py-8 text-center opacity-80">
          <Upload size={28} className="text-accent" aria-hidden />
          <span className="text-[15px] font-semibold">Suba um vídeo longo</span>
          <span className="text-[13px] text-muted">Live, podcast, aula ou vídeo do YouTube.</span>
        </div>
        <div className="flex flex-col justify-center gap-3">
          <label className="flex min-h-12 items-center gap-3 rounded-[14px] border border-line-strong bg-bg/70 pl-3.5 opacity-80">
            <Link2 size={18} className="text-accent" aria-hidden />
            <input disabled className="min-h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle" placeholder="Ou cole o link do YouTube" />
          </label>
          <Button size="lg" disabled>
            <Wand2 size={18} /> Encontrar os melhores cortes
          </Button>
        </div>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="m-0 font-display text-[20px] font-bold">Exemplo de resultado</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cuts.map((c, i) => (
            <figure key={c.t} className={cx('rise m-0 flex flex-col gap-2', `rise-${i + 1}`)}>
              <span className="relative block aspect-[9/16] overflow-hidden rounded-[18px] border border-line-strong">
                <LoopVideo src={reel[c.n].video} poster={reel[c.n].poster} className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-x-3 bottom-[22%] rounded-md bg-black/70 px-2 py-1 text-center text-[13px] font-extrabold uppercase leading-tight text-white">{c.t}</span>
                <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">{c.s}</span>
              </span>
              <figcaption className="text-[13px] font-semibold">Corte {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </Frame>
  )
}

/* ---------- Copy ---------- */
export function CopyStudio() {
  const b = useBiz()
  const types = ['Legenda', 'Gancho', 'Texto de anúncio', 'Mensagem de venda']
  const samples = [
    { t: 'Legenda', body: `Chegou o que faltava pra você ✨\n${b.produto} com aquele cuidado que só a ${b.nome} tem. Corre que é por pouco tempo!\n\n👉 Chama no direct` },
    { t: 'Gancho', body: 'Ninguém te conta isso antes de você comprar…' },
    { t: 'Mensagem de venda', body: `Oi! Vi que você se interessou por ${b.produto}. Hoje ainda dá pra garantir com condição especial. Quer que eu separe o seu?` },
  ]
  return (
    <Frame id="copy" phase={3}>
      <div className={cx(box, 'rise flex flex-col gap-4')}>
        <div className="flex flex-wrap gap-2">
          {types.map((t, i) => (
            <span key={t} className={cx('flex min-h-10 items-center rounded-full px-4 text-[14px] font-semibold', i === 0 ? 'bg-ink text-bg' : 'border border-line-strong text-soft')}>
              {t}
            </span>
          ))}
        </div>
        <textarea disabled rows={3} className={cx(fieldCls, 'resize-none py-3')} placeholder="Sobre o que é o post? Ex.: chegou coleção nova, promoção de sexta…" />
        <Button size="lg" disabled className="self-start">
          Escrever 3 opções · 1 crédito
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {samples.map((s, i) => (
          <div key={s.t} className={cx('rise flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5', `rise-${i + 1}`)}>
            <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent-text">{s.t}</span>
            <p className="m-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-soft">{s.body}</p>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <Copy size={14} aria-hidden /> Copiar
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

/* ---------- Atendente WhatsApp ---------- */
export function WhatsApp() {
  const chats = [
    { n: 'Carla M.', m: 'Tem no tamanho M?', hot: true, t: '2 min' },
    { n: 'João P.', m: 'Qual o valor com entrega?', hot: true, t: '14 min' },
    { n: 'Bia', m: 'Obrigada! Vou ver e te falo', hot: false, t: '1 h' },
    { n: 'Rafa', m: 'Aceita Pix?', hot: true, t: '3 h' },
  ]
  return (
    <Frame id="whatsapp" phase={4}>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className={cx(box, 'rise flex flex-col gap-4')}>
          <h2 className="m-0 font-display text-[19px] font-bold">Conectar o número</h2>
          <div className="grid gap-3">
            <div className="flex gap-3 rounded-2xl border-2 border-accent bg-[#17130f] p-4">
              <QrCode size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">Pelo QR code</span>
                <span className="text-[13px] text-muted">Rápido: aponta a câmera do WhatsApp e pronto.</span>
              </span>
            </div>
            <div className="flex gap-3 rounded-2xl border-2 border-line p-4">
              <ShieldCheck size={22} className="mt-0.5 shrink-0 text-sky" aria-hidden />
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">API oficial da Meta</span>
                <span className="text-[13px] text-muted">Mais segura, sem risco de bloqueio. Leva um pouco mais pra configurar.</span>
              </span>
            </div>
          </div>
          <p role="note" className="m-0 flex gap-2 rounded-xl border border-[#facc1540] bg-[#facc1512] px-3.5 py-3 text-[13px] text-soft">
            <AlertTriangle size={17} className="mt-px shrink-0 text-[#facc15]" aria-hidden />
            <span>
              <strong className="text-ink">Atenção:</strong> no modo QR code o WhatsApp pode bloquear o número se perceber uso automático. Use um número só pro atendimento e evite mandar muita mensagem em massa.
            </span>
          </p>
          <Button size="lg" disabled>
            <MessageCircle size={18} /> Conectar WhatsApp
          </Button>
        </div>
        <div className={cx(box, 'rise rise-1 flex flex-col gap-3')}>
          <div className="flex items-center justify-between">
            <h2 className="m-0 font-display text-[19px] font-bold">Conversas</h2>
            <span className="rounded-full bg-[#34d39922] px-2.5 py-1 text-[12px] font-bold text-[#6ee7b7]">3 querem comprar</span>
          </div>
          {chats.map((c) => (
            <div key={c.n} className="flex items-center gap-3 rounded-2xl border border-line bg-bg/50 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[15px] font-bold">{c.n.charAt(0)}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  {c.n}
                  {c.hot && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-ink">Quer comprar</span>}
                </span>
                <span className="truncate text-[13px] text-muted">{c.m}</span>
              </span>
              <span className="shrink-0 text-[12px] text-subtle">{c.t}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

/* ---------- Calendário ---------- */
export function Calendar() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const offset = first.getDay()
  const month = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const planned: Record<number, string> = { 2: 'video', 5: 'post', 8: 'video', 11: 'copy', 14: 'video', 17: 'post', 20: 'video', 23: 'copy', 26: 'video', 29: 'post' }
  const dot: Record<string, string> = { video: 'bg-accent', post: 'bg-sky', copy: 'bg-[#facc15]' }
  return (
    <Frame id="calendario" phase={4}>
      <div className={cx(box, 'rise flex flex-col gap-4')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-display text-[20px] font-bold capitalize">{month}</h2>
          <Button disabled>
            <Sparkles size={16} /> Mentor, planeja meu mês
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-semibold text-subtle sm:gap-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
          {Array.from({ length: offset }).map((_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1
            const kind = planned[d]
            const today = d === now.getDate()
            return (
              <span key={d} className={cx('flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-[13px] sm:text-[14px]', today ? 'border-accent bg-[#ff8a3d14] font-bold text-ink' : 'border-line bg-bg/40 text-soft')}>
                {d}
                {kind && <span className={cx('h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2', dot[kind])} />}
              </span>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-4 text-[13px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Vídeo</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky" /> Post</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#facc15]" /> Copy</span>
        </div>
      </div>
    </Frame>
  )
}

/* ---------- Anúncios ---------- */
export function Ads() {
  const rows = [
    { c: 'Coleção verão · Reels', spend: 'R$ 412', roas: '4,1', v: 'Escalar', tone: 'bg-[#34d39922] text-[#6ee7b7]', icon: Rocket },
    { c: 'Remarketing carrinho', spend: 'R$ 188', roas: '2,6', v: 'Manter', tone: 'bg-[#5b8cff22] text-[#9db8ff]', icon: TrendingUp },
    { c: 'Público frio · Stories', spend: 'R$ 296', roas: '0,7', v: 'Pausar', tone: 'bg-[#ef444422] text-[#fca5a5]', icon: Pause },
    { c: 'Promoção sexta', spend: 'R$ 140', roas: '1,4', v: 'Trocar criativo', tone: 'bg-[#facc1522] text-[#fde68a]', icon: Wand2 },
  ]
  return (
    <Frame id="anuncios" phase={4}>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { k: 'Investido (7 dias)', v: 'R$ 1.036' },
          { k: 'Vendas', v: 'R$ 2.870' },
          { k: 'Retorno', v: '2,8x' },
        ].map((s, i) => (
          <div key={s.k} className={cx('rise flex flex-col gap-1 rounded-[20px] border border-line bg-surface p-5', `rise-${i + 1}`)}>
            <span className="text-[13px] text-muted">{s.k}</span>
            <span className="font-display text-[28px] font-bold">{s.v}</span>
          </div>
        ))}
      </div>
      <div className={cx(box, 'rise flex flex-col gap-3')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-display text-[19px] font-bold">Raio-x das campanhas</h2>
          <Button disabled variant="soft">
            Conectar Meta Ads
          </Button>
        </div>
        {rows.map((r) => (
          <div key={r.c} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-bg/50 p-3.5">
            <span className="min-w-0 flex-1 basis-[180px] text-[15px] font-semibold">{r.c}</span>
            <span className="text-[13px] text-muted">{r.spend}</span>
            <span className="text-[13px] text-muted">ROAS {r.roas}</span>
            <span className={cx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold', r.tone)}>
              <r.icon size={13} aria-hidden /> {r.v}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  )
}
