import { Check, Coins } from 'lucide-react'
import { creditPacks, plans } from '../data/mock'
import { AppShell } from '../components/AppShell'
import { ModuleHeader } from '../components/Module'
import { ClipArt, clips } from '../components/Showcase'
import { Badge, Button, Card, SectionTitle, cx, useToast } from '../components/ui'
import { CREDITS_PER_CHARACTER, CREDITS_PER_COPY, CREDITS_PER_IMAGE, CREDITS_PER_LOGO, CREDITS_PER_MENTOR, CREDITS_PER_MENTOR_IMAGES, CREDITS_PER_PLAN, CREDITS_PER_APP, CREDITS_PER_PRODUCT_VIDEO, formatCredits, partCost } from '../lib/pricing'
import { timeAgo, useStore } from '../lib/store'
import { brl, checkoutUrl, useOffers } from '../lib/offers'

const planNames: Record<string, string> = { nenhum: 'Sem plano', start: 'Start', estudio: 'Estúdio', pro: 'Pro' }

export function Plans() {
  const toast = useToast()
  const { credits, plan, usage, addCredits, live } = useStore()
  const ofertas = useOffers()
  const pacotes = (ofertas ?? []).filter((o) => o.tipo === 'pacote' && o.cakto_id)
  const planosVenda = (ofertas ?? []).filter((o) => o.tipo === 'plano' && o.cakto_id)
  const abrir = (id: string) => window.open(checkoutUrl(id), '_blank', 'noopener')

  return (
    <AppShell active="planos">
      <ModuleHeader id="planos" />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.1fr]">
        <Card className="rise flex flex-col gap-3 p-6">
          <span className="text-[14px] text-muted">Seu plano</span>
          <span className="font-display text-[32px] font-extrabold tracking-[-0.02em]">{planNames[plan] ?? plan}</span>
          <span className="text-[14px] text-muted">{plan === 'nenhum' ? 'Assine um plano e ganhe créditos todo mês' : 'Plano ativo · créditos novos todo mês'}</span>
        </Card>
        <div className="rise rise-1 neon-border flex flex-col gap-3 rounded-2xl bg-surface p-6">
          <span className="flex items-center gap-2 text-[14px] text-muted">
            <Coins size={16} className="text-accent" aria-hidden /> Seus créditos
          </span>
          <span key={credits} className="pop font-display text-[32px] font-extrabold tracking-[-0.02em] text-accent-text">{formatCredits(credits)}</span>
        </div>
        <Card className="rise rise-2 flex flex-col gap-3 p-6">
          <span className="text-[14px] text-muted">Quanto custa</span>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[15px]">
            <li className="flex justify-between gap-3"><span>1 parte de vídeo (10s)</span><strong>{partCost(10)}</strong></li>
            <li className="flex justify-between gap-3"><span>1 parte de vídeo (15s)</span><strong>{partCost(15)}</strong></li>
            <li className="flex justify-between gap-3"><span>Refazer 1 parte</span><strong>igual à parte</strong></li>
            <li className="flex justify-between gap-3"><span>Gerar 1 boneco</span><strong>{CREDITS_PER_CHARACTER}</strong></li>
            <li className="flex justify-between gap-3"><span>Logo com IA</span><strong>{CREDITS_PER_LOGO}</strong></li>
            <li className="flex justify-between gap-3"><span>Imagem com IA</span><strong>{CREDITS_PER_IMAGE}</strong></li>
            <li className="flex justify-between gap-3"><span>Mensagem pro Mentor</span><strong>{CREDITS_PER_MENTOR} ({CREDITS_PER_MENTOR_IMAGES} com prints)</strong></li>
            <li className="flex justify-between gap-3"><span>3 opções de copy</span><strong>{CREDITS_PER_COPY}</strong></li>
            <li className="flex justify-between gap-3"><span>Calendário do mês</span><strong>{CREDITS_PER_PLAN}</strong></li>
            <li className="flex justify-between gap-3"><span>Criar ou ajustar um app</span><strong>{CREDITS_PER_APP}</strong></li>
            <li className="flex justify-between gap-3"><span>Vídeo do produto (30 a 40s)</span><strong>{CREDITS_PER_PRODUCT_VIDEO}</strong></li>
          </ul>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <SectionTitle>Comprar créditos</SectionTitle>
        <p className="m-0 -mt-2 text-[14px] text-muted">Pagamento único. Os créditos não vencem e caem na hora. Pague com o mesmo e-mail da sua conta.</p>
        {pacotes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pacotes.map((p, i) => (
              <div key={p.id} className={cx('rise lift relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface p-5', `rise-${Math.min(i + 1, 3)}`)}>
                <span className="text-[14px] font-semibold text-muted">{p.nome}</span>
                <span className="font-display text-[26px] font-extrabold">{formatCredits(p.creditos)} créditos</span>
                <span className="text-[15px] text-soft">
                  {brl(p.preco_brl)} <span className="text-[13px] text-subtle">· {brl(p.preco_brl / p.creditos)} cada</span>
                </span>
                <Button onClick={() => abrir(p.cakto_id!)} className="mt-auto">
                  Comprar
                </Button>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {creditPacks.map((p, i) => (
            <div key={p.id} className={cx('rise lift relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-surface p-5', p.highlight ? 'border-accent' : 'border-line', `rise-${i + 1}`)}>
              {p.highlight && <Badge tone="accent" className="absolute right-4 top-4">Melhor valor</Badge>}
              <ClipArt clip={clips.creditos} className="h-24 w-24 rounded-2xl" />
              <span className="font-display text-[26px] font-extrabold">{formatCredits(p.credits)} créditos</span>
              <span className="text-[15px] text-muted">{p.price}</span>
              <Button variant={p.highlight ? 'primary' : 'secondary'} onClick={() => {
                if (addCredits(p.credits, `Compra de ${p.credits} créditos`)) toast.show(`+${p.credits} créditos (na prévia é de graça)`)
                else toast.show('O pagamento pela Cakto entra em breve')
              }}>
                Comprar
              </Button>
            </div>
          ))}
        </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Planos</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => {
            const venda = planosVenda.find((o) => o.slug === p.id)
            const current = p.id === plan
            return (
              <Card key={p.id} className={cx('flex flex-col gap-5 p-5', current && '!border-accent glow-accent')}>
                <div className="flex items-center justify-between">
                  <h3 className="m-0 font-display text-[20px] font-bold">{p.name}</h3>
                  {current && <Badge tone="accent">Seu plano</Badge>}
                </div>
                <span className="font-display text-[26px] font-extrabold">
                  {venda ? brl(venda.preco_brl) : p.price}
                  {(venda || p.price.startsWith('R$')) && <span className="text-[14px] font-normal text-muted"> /mês</span>}
                </span>
                <span className="text-[14px] font-semibold text-accent-text">{venda ? `${formatCredits(venda.creditos)} créditos todo mês, que acumulam` : p.credits}</span>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-[14px] text-soft">
                      <Check size={16} className="shrink-0 text-sky-text" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant={current ? 'soft' : 'secondary'} disabled={current} onClick={() => (venda ? abrir(venda.cakto_id!) : toast.show(live ? 'Esse plano abre em breve' : 'Na prévia não tem pagamento'))} className="mt-auto">
                  {current ? 'Plano atual' : plan === 'nenhum' ? `Assinar o ${p.name}` : `Mudar pro ${p.name}`}
                </Button>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Extrato</SectionTitle>
        {usage.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">Quando você usar ou comprar créditos, aparece aqui.</p>
        ) : (
          <Card className="overflow-hidden">
            <ul className="m-0 list-none p-0">
              {usage.map((u, i) => (
                <li key={u.id} className={cx('flex flex-wrap items-center justify-between gap-2 px-5 py-4', i > 0 && 'border-t border-line')}>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-medium">{u.what}</span>
                    <span className="text-[13px] text-muted">{timeAgo(u.when)}</span>
                  </span>
                  <span className={cx('text-[15px] font-bold', u.credits > 0 ? 'text-sky-text' : 'text-accent-text')}>
                    {u.credits > 0 ? `+${u.credits}` : u.credits}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </AppShell>
  )
}
