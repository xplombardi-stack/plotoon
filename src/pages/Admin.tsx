// Painel Admin (só o dono): usuários, consumo, custos, lucro e preços.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, BarChart3, Check, Coins, LoaderCircle, Plus, Search, Settings2, ShieldCheck, Trash2, TrendingUp, Users, Wallet } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader } from '../components/Module'
import { Badge, Button, cx, useToast } from '../components/ui'
import { deleteOffer, loadAdmin, saveCost, saveOffer, saveSetting, useIsAdmin, type AdminData, type Offer } from '../lib/admin'
import { applySettings } from '../lib/pricing'

type Aba = 'resumo' | 'usuarios' | 'consumo' | 'custos' | 'lucro' | 'config'
const ABAS: Array<{ id: Aba; t: string; icon: typeof Users }> = [
  { id: 'resumo', t: 'Resumo', icon: BarChart3 },
  { id: 'usuarios', t: 'Usuários', icon: Users },
  { id: 'consumo', t: 'Consumo', icon: TrendingUp },
  { id: 'custos', t: 'Custos', icon: Wallet },
  { id: 'lucro', t: 'Lucro', icon: Coins },
  { id: 'config', t: 'Configurações', icon: Settings2 },
]

// nomes amigáveis das configurações
const NOMES: Record<string, { t: string; grupo: 'preco' | 'video' | 'indique' | 'conta' | 'outros'; un?: string }> = {
  credits_per_mentor: { t: 'Mentor (por mensagem)', grupo: 'preco' },
  credits_per_mentor_images: { t: 'Mentor lendo prints', grupo: 'preco' },
  credits_per_copy: { t: 'Copy', grupo: 'preco' },
  credits_per_plan: { t: 'Calendário do mês', grupo: 'preco' },
  credits_per_app: { t: 'Criador de apps', grupo: 'preco' },
  credits_per_image: { t: 'Imagem', grupo: 'preco' },
  credits_per_logo: { t: 'Logo', grupo: 'preco' },
  credits_per_character: { t: 'Boneco 3D', grupo: 'preco' },
  credits_per_product_video: { t: 'Vídeo modelo', grupo: 'video' },
  credits_per_video_second: { t: 'Vídeo do produto (por segundo)', grupo: 'video' },
  credits_per_scene_fix: { t: 'Ajuste de cena', grupo: 'video' },
  credits_per_second: { t: 'Historinha (por segundo)', grupo: 'video' },
  credits_per_part: { t: 'Historinha: parte (antigo)', grupo: 'video' },
  credits_redo_part: { t: 'Historinha: refazer parte', grupo: 'video' },
  seconds_per_part: { t: 'Historinha: segundos por parte', grupo: 'video', un: 's' },
  max_seconds_per_part: { t: 'Historinha: máximo por parte', grupo: 'video', un: 's' },
  max_parts: { t: 'Historinha: máximo de partes', grupo: 'video', un: 'partes' },
  referral_bonus: { t: 'Bônus por indicação paga', grupo: 'indique' },
  welcome_credits: { t: 'Créditos de boas-vindas', grupo: 'conta' },
  credit_value_cents: { t: 'Valor de 1 crédito (centavos)', grupo: 'conta', un: 'centavos' },
  usd_brl_cents: { t: 'Câmbio do dólar (centavos)', grupo: 'conta', un: 'centavos' },
  credits_per_custom_video: { t: 'Vídeo do produto (preço antigo fixo, não usado)', grupo: 'outros' },
}
const GRUPOS: Array<[string, string]> = [
  ['preco', 'Preço em créditos de cada ação'],
  ['video', 'Vídeos'],
  ['indique', 'Indique e ganhe'],
  ['conta', 'Conta e valores'],
  ['outros', 'Outros'],
]

// módulo do consumo -> custo da API
const MOD_CUSTO: Record<string, string> = {
  Mentor: 'mentor',
  'Vídeo do produto': 'video_ia',
  'Vídeo modelo': 'video_produto',
  Imagem: 'imagem',
  Copy: 'copy',
  Calendário: 'calendario',
  'Criador de apps': 'app',
  Logo: 'logo',
  'Boneco 3D': 'boneco',
  Historinha: 'historinha',
}
const CORES = ['#ff8a3d', '#5b8cff', '#a78bfa', '#34d399', '#facc15', '#ff5da2', '#38bdf8', '#f97316', '#22d3ee', '#e879f9']

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: n !== 0 && Math.abs(n) < 1 ? 3 : 2 })
const num = (n: number) => n.toLocaleString('pt-BR')
const data = (s: string | null) => (s ? new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—')
const pct = (n: number) => `${Math.round(n * 100)}%`

/* ---------- contas ---------- */
function useContas(d: AdminData | null) {
  return useMemo(() => {
    if (!d) return null
    const set = Object.fromEntries(d.settings.map((s) => [s.key, s.value]))
    const cambio = (set.usd_brl_cents ?? 550) / 100
    const ativos = d.offers.filter((o) => o.ativo && o.creditos > 0 && o.preco_brl > 0)
    // vale o pior caso: o crédito mais barato que você vende
    const valorCredito = ativos.length ? Math.min(...ativos.map((o) => o.preco_brl / o.creditos)) : (set.credit_value_cents ?? 20) / 100
    // custo real medido (vídeo do produto registra os tokens de verdade)
    const real: Record<string, { custo: number; creditos: number; n: number }> = {}
    for (const u of d.usos) {
      const k = u.modulo === 'video_ia_ajuste' ? 'video_ia_ajuste' : u.modulo
      real[k] ??= { custo: 0, creditos: 0, n: 0 }
      real[k].custo += u.custo_usd * cambio
      real[k].creditos += u.creditos
      real[k].n++
    }
    // custo por crédito cobrado de cada ação
    const porCredito: Record<string, number> = {}
    const linhas = d.custos.map((c) => {
      const creditos = c.acao ? (set[c.acao] ?? 0) : 0
      const cobrado = creditos * valorCredito
      const r = real[c.key]
      const custoReal = r && r.creditos > 0 && creditos > 0 ? (r.custo / r.creditos) * creditos : null
      const custo = custoReal ?? c.custo_brl
      porCredito[c.key] = creditos > 0 ? custo / creditos : 0
      const margem = cobrado > 0 ? (cobrado - custo) / cobrado : -1
      return { ...c, creditos, cobrado, custoReal, custo, margem, prejuizo: custo > cobrado }
    })
    const consumo30 = d.consumo.reduce((s, c) => s + c.creditos, 0)
    const porModulo = Object.entries(
      d.consumo.reduce<Record<string, { creditos: number; usos: number }>>((m, c) => {
        m[c.modulo] ??= { creditos: 0, usos: 0 }
        m[c.modulo].creditos += c.creditos
        m[c.modulo].usos += c.usos
        return m
      }, {}),
    )
      .map(([modulo, v]) => ({ modulo, ...v, custo: v.creditos * (porCredito[MOD_CUSTO[modulo]] ?? 0) }))
      .sort((a, b) => b.creditos - a.creditos)
    const custo30 = porModulo.reduce((s, m) => s + m.custo, 0)
    const custoMedioCredito = consumo30 > 0 ? custo30 / consumo30 : Object.values(porCredito).filter(Boolean).reduce((s, v, _, a) => s + v / a.length, 0)
    const receita30 = d.pagamentos.filter((p) => p.status === 'pago').reduce((s, p) => s + p.valor_brl, 0)
    const ofertas = d.offers.map((o) => {
      const custo = o.creditos * custoMedioCredito
      return { ...o, porCredito: o.creditos ? o.preco_brl / o.creditos : 0, custo, lucro: o.preco_brl - custo, margem: o.preco_brl > 0 ? (o.preco_brl - custo) / o.preco_brl : 0 }
    })
    return { set, cambio, valorCredito, linhas, porModulo, consumo30, custo30, custoMedioCredito, receita30, ofertas, alertas: linhas.filter((l) => l.prejuizo) }
  }, [d])
}

/* ---------- peças ---------- */
function Kpi({ t, v, sub, tone }: { t: string; v: string; sub?: string; tone?: 'ok' | 'ruim' }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-[20px] border border-line bg-surface p-4">
      <span className="text-[12.5px] font-semibold text-muted">{t}</span>
      <span className={cx('font-display text-[24px] font-extrabold leading-tight tabular-nums sm:text-[27px]', tone === 'ruim' ? 'text-[#f87171]' : tone === 'ok' ? 'text-[#6ee7b7]' : 'text-ink')}>{v}</span>
      {sub && <span className="text-[12.5px] text-subtle">{sub}</span>}
    </div>
  )
}

function Box({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-4 rounded-[22px] border border-line bg-surface p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-display text-[18px] font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function NumInput({ value, onSave, step = 1, prefix, suffix, label }: { value: number; onSave: (v: number) => Promise<boolean>; step?: number; prefix?: string; suffix?: string; label: string }) {
  const [v, setV] = useState(String(value))
  const [st, setSt] = useState<'idle' | 'salvando' | 'ok' | 'erro'>('idle')
  useEffect(() => setV(String(value)), [value])
  const dirty = Number(v.replace(',', '.')) !== value
  async function salvar() {
    const n = Number(v.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || !dirty) return
    setSt('salvando')
    const ok = await onSave(n)
    setSt(ok ? 'ok' : 'erro')
    if (ok) setTimeout(() => setSt('idle'), 1500)
  }
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx('flex h-11 items-center rounded-xl border bg-bg px-2.5 focus-within:border-accent', st === 'erro' ? 'border-[#f87171]' : 'border-line-strong')}>
        {prefix && <span className="pr-1 text-[13px] text-muted">{prefix}</span>}
        <input
          aria-label={label}
          inputMode="decimal"
          value={v}
          step={step}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && salvar()}
          onBlur={salvar}
          className="w-[70px] bg-transparent text-right text-[15px] font-semibold tabular-nums text-ink outline-none"
        />
        {suffix && <span className="pl-1 text-[12px] text-muted">{suffix}</span>}
      </span>
      <span className="flex w-5 justify-center">
        {st === 'salvando' ? <LoaderCircle size={15} className="animate-spin text-muted" /> : st === 'ok' ? <Check size={16} className="text-[#6ee7b7]" /> : dirty ? <span className="h-2 w-2 rounded-full bg-accent" title="Não salvo" /> : null}
      </span>
    </span>
  )
}

/* ---------- abas ---------- */
function Resumo({ d, c, irPara }: { d: AdminData; c: NonNullable<ReturnType<typeof useContas>>; irPara: (a: Aba) => void }) {
  const novos7 = d.users.filter((u) => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000).length
  const pagantes = d.users.filter((u) => u.plan && u.plan !== 'nenhum').length
  const lucro = c.receita30 - c.custo30
  const porDia = useMemo(() => {
    const m: Record<string, number> = {}
    for (const x of d.consumo) m[x.dia] = (m[x.dia] ?? 0) + x.creditos
    const out: Array<{ dia: string; v: number }> = []
    for (let i = 13; i >= 0; i--) {
      const k = new Date(Date.now() - i * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      out.push({ dia: k, v: m[k] ?? 0 })
    }
    return out
  }, [d.consumo])
  const max = Math.max(1, ...porDia.map((x) => x.v))
  return (
    <div className="flex flex-col gap-5">
      {c.alertas.length > 0 && (
        <button type="button" onClick={() => irPara('custos')} className="press flex cursor-pointer items-start gap-3 rounded-[18px] border border-[#f8717166] bg-[#f871711a] p-4 text-left">
          <AlertTriangle size={22} className="mt-0.5 shrink-0 text-[#f87171]" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold text-[#fca5a5]">
              {c.alertas.length === 1 ? '1 geração custa mais do que você cobra' : `${c.alertas.length} gerações custam mais do que você cobra`}
            </span>
            <span className="text-[13.5px] text-soft">{c.alertas.map((a) => a.label).join(', ')}. Toque pra ver e ajustar o preço.</span>
          </span>
        </button>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi t="Usuários" v={num(d.users.length)} sub={`${novos7} novos em 7 dias · ${pagantes} com plano`} />
        <Kpi t="Créditos gastos (30 dias)" v={num(c.consumo30)} sub={`custo estimado ${brl(c.custo30)}`} />
        <Kpi t="Receita (30 dias)" v={brl(c.receita30)} sub={d.pagamentos.length ? `${d.pagamentos.length} pagamentos` : 'aparece quando a Cakto estiver ligada'} />
        <Kpi t="Lucro (30 dias)" v={brl(lucro)} sub={c.receita30 > 0 ? `margem ${pct(lucro / c.receita30)}` : 'receita − custo das IAs'} tone={c.receita30 > 0 ? (lucro >= 0 ? 'ok' : 'ruim') : undefined} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Box title="Créditos gastos por dia">
          <div className="flex h-[170px] items-end gap-1.5" role="img" aria-label="Créditos gastos por dia nos últimos 14 dias">
            {porDia.map((x) => (
              <div key={x.dia} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className="rounded-t-md bg-gradient-to-t from-accent to-[#ffb37a] transition-opacity group-hover:opacity-80" style={{ height: `${Math.max(2, (x.v / max) * 100)}%` }} />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-1.5 py-0.5 text-[11px] text-white group-hover:block">{x.v}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11.5px] text-subtle">
            <span>{data(porDia[0].dia)}</span>
            <span>hoje</span>
          </div>
        </Box>
        <Box title="Onde mais gastam" action={<button type="button" onClick={() => irPara('consumo')} className="cursor-pointer text-[13px] font-semibold text-accent-text">Ver tudo</button>}>
          <ModBars itens={c.porModulo.slice(0, 6)} />
        </Box>
      </div>
    </div>
  )
}

function ModBars({ itens }: { itens: Array<{ modulo: string; creditos: number; usos: number; custo: number }> }) {
  const max = Math.max(1, ...itens.map((i) => i.creditos))
  if (!itens.length) return <p className="m-0 text-[14px] text-muted">Ainda sem consumo.</p>
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {itens.map((i, k) => (
        <li key={i.modulo} className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2 text-[13.5px]">
            <span className="font-semibold text-ink">{i.modulo}</span>
            <span className="tabular-nums text-muted">
              {num(i.creditos)} créditos · {num(i.usos)} usos
            </span>
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full" style={{ width: `${(i.creditos / max) * 100}%`, background: CORES[k % CORES.length] }} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Usuarios({ d }: { d: AdminData }) {
  const [q, setQ] = useState('')
  const lista = d.users.filter((u) => !q || `${u.email} ${u.name ?? ''} ${u.plan ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Box
      title={`${d.users.length} usuários`}
      action={
        <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-line-strong bg-bg px-3 sm:w-[280px]">
          <Search size={16} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por e-mail, nome ou plano" aria-label="Buscar usuário" className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-subtle" />
        </label>
      }
    >
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="text-[12px] uppercase tracking-[0.08em] text-subtle">
              {['Conta', 'Plano', 'Saldo', 'Gastou', 'Comprou/ganhou', 'Entrou', 'Último uso'].map((h) => (
                <th key={h} className="border-b border-line px-2 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id} className="hover:bg-bg/40">
                <td className="border-b border-line px-2 py-3">
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-semibold text-ink">
                      {u.name || '—'} {u.admin && <ShieldCheck size={14} className="text-accent" aria-label="Admin" />}
                    </span>
                    <span className="text-[12.5px] text-muted">{u.email}</span>
                  </span>
                </td>
                <td className="border-b border-line px-2 py-3">
                  <PlanoTag plan={u.plan} />
                </td>
                <td className="border-b border-line px-2 py-3 tabular-nums">{num(u.credits)}</td>
                <td className="border-b border-line px-2 py-3 tabular-nums">{num(u.gasto)}</td>
                <td className="border-b border-line px-2 py-3 tabular-nums">{num(u.comprado)}</td>
                <td className="border-b border-line px-2 py-3 text-muted">{data(u.created_at)}</td>
                <td className="border-b border-line px-2 py-3 text-muted">{data(u.ultimo_uso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0 md:hidden">
        {lista.map((u) => (
          <li key={u.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-bg/40 p-3.5">
            <span className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  {u.name || '—'} {u.admin && <ShieldCheck size={14} className="text-accent" aria-label="Admin" />}
                </span>
                <span className="truncate text-[12.5px] text-muted">{u.email}</span>
              </span>
              <PlanoTag plan={u.plan} />
            </span>
            <span className="grid grid-cols-3 gap-2 text-[12px] text-muted">
              <span className="flex flex-col">
                Saldo <b className="text-[15px] text-ink tabular-nums">{num(u.credits)}</b>
              </span>
              <span className="flex flex-col">
                Gastou <b className="text-[15px] text-ink tabular-nums">{num(u.gasto)}</b>
              </span>
              <span className="flex flex-col">
                Entrou <b className="text-[15px] text-ink">{data(u.created_at)}</b>
              </span>
            </span>
          </li>
        ))}
      </ul>
      {!lista.length && <p className="m-0 text-[14px] text-muted">Ninguém encontrado.</p>}
    </Box>
  )
}

function PlanoTag({ plan }: { plan: string | null }) {
  const sem = !plan || plan === 'nenhum'
  return <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold capitalize', sem ? 'bg-surface-2 text-muted' : 'bg-[#ff8a3d22] text-accent-text')}>{sem ? 'Sem plano' : plan}</span>
}

function ConsumoAba({ d, c }: { d: AdminData; c: NonNullable<ReturnType<typeof useContas>> }) {
  const dias = useMemo(() => {
    const m = new Map<string, Record<string, number>>()
    for (const x of d.consumo) {
      if (!m.has(x.dia)) m.set(x.dia, {})
      m.get(x.dia)![x.modulo] = (m.get(x.dia)![x.modulo] ?? 0) + x.creditos
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [d.consumo])
  const mods = c.porModulo.map((m) => m.modulo)
  return (
    <div className="flex flex-col gap-5">
      <Box title="Créditos gastos por módulo (30 dias)">
        <ModBars itens={c.porModulo} />
      </Box>
      <Box title="Dia a dia">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]">
            <thead>
              <tr className="text-[12px] text-subtle">
                <th className="sticky left-0 border-b border-line bg-surface px-2 py-2 font-semibold">Dia</th>
                {mods.map((m, k) => (
                  <th key={m} className="border-b border-line px-2 py-2 text-right font-semibold">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: CORES[k % CORES.length] }} />
                    {m}
                  </th>
                ))}
                <th className="border-b border-line px-2 py-2 text-right font-semibold text-ink">Total</th>
              </tr>
            </thead>
            <tbody>
              {dias.map(([dia, v]) => (
                <tr key={dia}>
                  <td className="sticky left-0 border-b border-line bg-surface px-2 py-2.5 text-muted">{data(dia)}</td>
                  {mods.map((m) => (
                    <td key={m} className="border-b border-line px-2 py-2.5 text-right tabular-nums">
                      {v[m] ? num(v[m]) : <span className="text-subtle">—</span>}
                    </td>
                  ))}
                  <td className="border-b border-line px-2 py-2.5 text-right font-bold tabular-nums">{num(Object.values(v).reduce((s, n) => s + n, 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!dias.length && <p className="m-0 py-4 text-[14px] text-muted">Ainda sem consumo nos últimos 30 dias.</p>}
        </div>
      </Box>
    </div>
  )
}

function Custos({ d, c, onChange }: { d: AdminData; c: NonNullable<ReturnType<typeof useContas>>; onChange: (d: AdminData) => void }) {
  return (
    <Box title="Custo de cada geração">
      <p className="m-0 -mt-2 text-[13.5px] text-muted">
        Quanto cada API te custa por geração, em reais. Compara com o que você cobra (créditos × {brl(c.valorCredito)}, o crédito mais barato que você vende). Onde já dá pra medir, aparece o custo real.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {c.linhas.map((l) => (
          <li key={l.key} className={cx('flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center', l.prejuizo ? 'border-[#f8717180] bg-[#f871710f]' : 'border-line bg-bg/40')}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink">
                {l.label}
                {l.prejuizo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f8717126] px-2 py-0.5 text-[11.5px] font-bold text-[#fca5a5]">
                    <AlertTriangle size={12} /> Prejuízo
                  </span>
                )}
              </span>
              <span className="text-[12.5px] text-muted">
                {l.unidade} · cobra {l.creditos} {l.creditos === 1 ? 'crédito' : 'créditos'} = {brl(l.cobrado)}
                {l.custoReal != null && <> · custo real medido: <b className="text-soft">{brl(l.custoReal)}</b></>}
              </span>
            </span>
            <span className="flex items-center justify-between gap-3 sm:justify-end">
              <span className={cx('text-[13px] font-bold tabular-nums', l.prejuizo ? 'text-[#f87171]' : l.margem < 0.4 ? 'text-[#facc15]' : 'text-[#6ee7b7]')}>margem {l.cobrado > 0 ? pct(l.margem) : '—'}</span>
              <NumInput
                label={`Custo de ${l.label}`}
                value={l.custo_brl}
                prefix="R$"
                step={0.01}
                onSave={async (v) => {
                  const ok = await saveCost(l.key, v)
                  if (ok) onChange({ ...d, custos: d.custos.map((x) => (x.key === l.key ? { ...x, custo_brl: v } : x)) })
                  return ok
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Box>
  )
}

const OFERTA_VAZIA: Omit<Offer, 'id'> = { tipo: 'pacote', nome: '', preco_brl: 0, creditos: 0, cakto_id: null, ativo: true, ordem: 0 }

function Lucro({ d, c, onChange }: { d: AdminData; c: NonNullable<ReturnType<typeof useContas>>; onChange: (d: AdminData) => void }) {
  const toast = useToast()
  const [nova, setNova] = useState<Omit<Offer, 'id'> | null>(null)
  async function salvar(o: Omit<Offer, 'id'> & { id?: string }) {
    if (!o.nome.trim() || o.creditos <= 0) return toast.show('Coloque um nome e quantos créditos dá.')
    const r = await saveOffer(o)
    if (!r) return toast.show('Não consegui salvar agora.')
    onChange({ ...d, offers: o.id ? d.offers.map((x) => (x.id === o.id ? r : x)) : [...d.offers, r] })
    setNova(null)
    toast.show('Salvo!')
  }
  async function apagar(id: string) {
    if (!window.confirm('Apagar esse plano/pacote?')) return
    if (await deleteOffer(id)) onChange({ ...d, offers: d.offers.filter((x) => x.id !== id) })
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi t="Receita (30 dias)" v={brl(c.receita30)} sub="pagamentos da Cakto" />
        <Kpi t="Custo real das IAs (30 dias)" v={brl(c.custo30)} sub={`${num(c.consumo30)} créditos gastos`} />
        <Kpi t="Custo médio por crédito" v={brl(c.custoMedioCredito)} sub={`você vende a partir de ${brl(c.valorCredito)}`} tone={c.custoMedioCredito > c.valorCredito ? 'ruim' : 'ok'} />
        <Kpi t="Margem (30 dias)" v={c.receita30 > 0 ? pct((c.receita30 - c.custo30) / c.receita30) : '—'} sub={c.receita30 > 0 ? brl(c.receita30 - c.custo30) : 'sem receita ainda'} tone={c.receita30 > 0 ? (c.receita30 >= c.custo30 ? 'ok' : 'ruim') : undefined} />
      </div>
      <Box
        title="Planos e pacotes"
        action={
          <Button size="sm" onClick={() => setNova({ ...OFERTA_VAZIA })}>
            <Plus size={16} /> Novo
          </Button>
        }
      >
        <p className="m-0 -mt-2 text-[13.5px] text-muted">Margem de cada um se o cliente gastar todos os créditos, pelo custo médio real ({brl(c.custoMedioCredito)} por crédito).</p>
        {nova && <OfertaForm o={nova} onCancel={() => setNova(null)} onSave={(o) => salvar(o)} />}
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {c.ofertas.map((o) => (
            <OfertaLinha key={o.id} o={o} onSave={salvar} onDelete={() => apagar(o.id)} />
          ))}
        </ul>
        {!d.offers.length && !nova && <p className="m-0 text-[14px] text-muted">Nenhum plano ou pacote ainda. Cadastre com o preço que vai cobrar na Cakto pra ver a margem.</p>}
      </Box>
    </div>
  )
}

function OfertaLinha({ o, onSave, onDelete }: { o: Offer & { porCredito: number; custo: number; lucro: number; margem: number }; onSave: (o: Offer) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false)
  if (edit) return <OfertaForm o={o} onCancel={() => setEdit(false)} onSave={(x) => (onSave({ ...o, ...x }), setEdit(false))} />
  return (
    <li className={cx('flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center', o.lucro < 0 ? 'border-[#f8717180] bg-[#f871710f]' : 'border-line bg-bg/40', !o.ativo && 'opacity-60')}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-ink">
          {o.nome}
          <Badge tone={o.tipo === 'plano' ? 'violet' : 'sky'}>{o.tipo === 'plano' ? 'Plano mensal' : 'Pacote'}</Badge>
          {!o.ativo && <Badge>Inativo</Badge>}
        </span>
        <span className="text-[12.5px] text-muted">
          {brl(o.preco_brl)} · {num(o.creditos)} créditos · {brl(o.porCredito)} por crédito
        </span>
      </span>
      <span className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="flex flex-col text-right">
          <span className={cx('text-[15px] font-bold tabular-nums', o.lucro < 0 ? 'text-[#f87171]' : 'text-[#6ee7b7]')}>{brl(o.lucro)}</span>
          <span className="text-[12px] text-muted">lucro · margem {pct(o.margem)}</span>
        </span>
        <span className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => setEdit(true)}>
            Editar
          </Button>
          <button type="button" onClick={onDelete} aria-label={`Apagar ${o.nome}`} className="press flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-[#f87171]">
            <Trash2 size={17} />
          </button>
        </span>
      </span>
    </li>
  )
}

function OfertaForm({ o, onSave, onCancel }: { o: Omit<Offer, 'id'>; onSave: (o: Omit<Offer, 'id'>) => void; onCancel: () => void }) {
  const [f, setF] = useState(o)
  const campo = 'h-11 rounded-xl border border-line-strong bg-bg px-3 text-[15px] text-ink outline-none focus:border-accent'
  return (
    <li className="pop flex list-none flex-col gap-3 rounded-2xl border border-accent-line bg-[#ff8a3d0d] p-3.5">
      <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_1fr]">
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-muted">
          Tipo
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as Offer['tipo'] })} className={campo}>
            <option value="pacote">Pacote</option>
            <option value="plano">Plano mensal</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-muted">
          Nome
          <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Estúdio" className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-muted">
          Preço (R$)
          <input inputMode="decimal" value={f.preco_brl || ''} onChange={(e) => setF({ ...f, preco_brl: Number(e.target.value.replace(',', '.')) || 0 })} placeholder="97,00" className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-muted">
          Créditos
          <input inputMode="numeric" value={f.creditos || ''} onChange={(e) => setF({ ...f, creditos: Math.round(Number(e.target.value) || 0) })} placeholder="500" className={campo} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[14px] text-soft">
          <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} className="h-5 w-5 accent-[#ff8a3d]" /> Ativo (aparece pra venda)
        </label>
        <span className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(f)}>Salvar</Button>
        </span>
      </div>
    </li>
  )
}

function Config({ d, c, onChange }: { d: AdminData; c: NonNullable<ReturnType<typeof useContas>>; onChange: (d: AdminData) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {GRUPOS.map(([g, titulo]) => {
        const itens = d.settings.filter((s) => (NOMES[s.key]?.grupo ?? 'outros') === g)
        if (!itens.length) return null
        return (
          <Box key={g} title={titulo}>
            {g === 'preco' && <p className="m-0 -mt-2 text-[13.5px] text-muted">Muda na hora pra todo mundo. 1 crédito vale a partir de {brl(c.valorCredito)}.</p>}
            <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
              {itens.map((s) => {
                const n = NOMES[s.key]
                return (
                  <li key={s.key} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-bg/40 px-3.5 py-2.5">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[14px] font-semibold text-ink">{n?.t ?? s.description ?? s.key}</span>
                      {(!n?.un || n.grupo === 'preco') && g !== 'conta' && g !== 'indique' && <span className="text-[12px] text-subtle">≈ {brl(s.value * c.valorCredito)}</span>}
                      {s.key === 'credit_value_cents' && <span className="text-[12px] text-subtle">usado só quando não há pacote cadastrado</span>}
                    </span>
                    <NumInput
                      label={n?.t ?? s.key}
                      value={s.value}
                      suffix={n?.un ?? 'créditos'}
                      onSave={async (v) => {
                        const ok = await saveSetting(s.key, Math.round(v))
                        if (ok) {
                          const settings = d.settings.map((x) => (x.key === s.key ? { ...x, value: Math.round(v) } : x))
                          onChange({ ...d, settings })
                          applySettings(Object.fromEntries(settings.map((x) => [x.key, x.value])))
                        }
                        return ok
                      }}
                    />
                  </li>
                )
              })}
            </ul>
          </Box>
        )
      })}
      <Box title="Pacotes por nicho">
        <p className="m-0 text-[14px] text-muted">Os pacotes por nicho (hamburgueria, loja de roupa, estética…) vão ser criados e editados aqui. É o próximo módulo.</p>
      </Box>
    </div>
  )
}

/* ---------- página ---------- */
export function AdminPage() {
  const admin = useIsAdmin()
  const [aba, setAba] = useState<Aba>('resumo')
  const [d, setD] = useState<AdminData | null>(null)
  const [erro, setErro] = useState(false)
  const c = useContas(d)
  useEffect(() => {
    if (!admin) return
    loadAdmin()
      .then(setD)
      .catch(() => setErro(true))
  }, [admin])

  if (!admin)
    return (
      <AppShell active="admin">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <ShieldCheck size={36} className="text-muted" />
          <h1 className="m-0 font-display text-[24px] font-extrabold">Área restrita</h1>
          <p className="m-0 text-[15px] text-muted">Essa tela é só pro administrador.</p>
        </div>
      </AppShell>
    )

  return (
    <AppShell active="admin" wide>
      <ModuleHeader id="admin" actions={c && c.alertas.length > 0 ? <Badge tone="accent">{c.alertas.length} alerta{c.alertas.length > 1 ? 's' : ''}</Badge> : undefined} />
      <div role="tablist" aria-label="Seções do painel" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {ABAS.map((a) => {
          const on = a.id === aba
          const Icon = a.icon
          return (
            <button key={a.id} type="button" role="tab" aria-selected={on} onClick={() => setAba(a.id)} className={cx('press flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-[14px] font-semibold', on ? 'border-accent bg-[#ff8a3d1a] text-ink' : 'border-line text-muted hover:text-ink')}>
              <Icon size={16} /> {a.t}
              {a.id === 'custos' && c && c.alertas.length > 0 && <span className="h-2 w-2 rounded-full bg-[#f87171]" />}
            </button>
          )
        })}
      </div>
      {erro && <p className="m-0 rounded-2xl border border-[#f8717166] bg-[#f871711a] p-4 text-[14px] text-[#fca5a5]">Não consegui carregar o painel agora. Tenta de novo daqui a pouco.</p>}
      {!d || !c ? (
        !erro && (
          <div className="flex justify-center py-16">
            <LoaderCircle size={28} className="animate-spin text-accent" />
          </div>
        )
      ) : (
        <div className="rise" key={aba}>
          {aba === 'resumo' && <Resumo d={d} c={c} irPara={setAba} />}
          {aba === 'usuarios' && <Usuarios d={d} />}
          {aba === 'consumo' && <ConsumoAba d={d} c={c} />}
          {aba === 'custos' && <Custos d={d} c={c} onChange={setD} />}
          {aba === 'lucro' && <Lucro d={d} c={c} onChange={setD} />}
          {aba === 'config' && <Config d={d} c={c} onChange={setD} />}
        </div>
      )}
    </AppShell>
  )
}
