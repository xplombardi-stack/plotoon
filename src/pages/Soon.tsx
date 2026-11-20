// Módulos com a tela pronta e a API ainda não ligada: conteúdo de exemplo e um aviso discreto.
import type { ReactNode } from 'react'
import { AlertTriangle, Link2, MessageCircle, Pause, QrCode, Rocket, ShieldCheck, TrendingUp, Upload, Wand2 } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { LoopVideo } from '../components/LoopVideo'
import { ModuleHeader, SoonNotice } from '../components/Module'
import { ModuleDemo } from '../components/FeatureDemos'
import { stories as reel } from '../components/StoryReel'
import { Button, cx } from '../components/ui'
import type { ModuleId } from '../lib/modules'

const box = 'rounded-[24px] border border-line bg-surface p-5 sm:p-6'

function Frame({ id, phase, children, demo = true }: { id: ModuleId; phase: number; children: ReactNode; demo?: boolean }) {
  return (
    <AppShell active={id}>
      <ModuleHeader id={id} />
      <SoonNotice className="rise rise-1">Ainda não está ativo. Chega na fase {phase}. O que você vê aqui é um exemplo de como vai funcionar.</SoonNotice>
      {demo && (
        <section className="rise rise-2 flex flex-col gap-3">
          <h2 className="m-0 font-display text-[19px] font-bold">Veja como funciona</h2>
          <ModuleDemo id={id} className="h-[420px] w-full max-w-[560px] sm:h-[460px]" />
        </section>
      )}
      {children}
    </AppShell>
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
