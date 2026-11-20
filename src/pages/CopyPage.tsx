// Copy: legenda, gancho, texto de anúncio e mensagem de venda no tom do negócio.
import { useEffect, useState } from 'react'
import { Check, ChevronDown, Copy as CopyIcon, PenLine } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { ModuleHeader } from '../components/Module'
import { Button, copyText, cx, useToast } from '../components/ui'
import { useBusiness } from '../lib/business'
import { CREDITS_PER_COPY } from '../lib/pricing'
import { timeAgo, useStore } from '../lib/store'
import { supabase } from '../lib/supabase'

const TIPOS = [
  { id: 'legenda', label: 'Legenda', ph: 'Ex.: chegou o sabor novo de ninho com nutella' },
  { id: 'gancho', label: 'Gancho', ph: 'Ex.: vídeo mostrando o bolo saindo do forno' },
  { id: 'anuncio', label: 'Texto de anúncio', ph: 'Ex.: promoção de 3 potes por R$ 39 essa semana' },
  { id: 'venda', label: 'Mensagem de venda', ph: 'Ex.: cliente perguntou o preço e sumiu' },
] as const
type Tipo = (typeof TIPOS)[number]['id']

const inputCls = 'min-h-12 w-full rounded-[14px] border border-line-strong bg-bg/70 px-4 text-[16px] text-ink outline-none transition-shadow placeholder:text-subtle focus:border-accent focus:shadow-[0_0_0_4px_#ff8a3d22]'

function readPrefill(): { tipo?: Tipo; tema?: string; extra?: string } {
  try {
    const raw = sessionStorage.getItem('plotoon:copy')
    sessionStorage.removeItem('plotoon:copy')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function demoOptions(tipo: Tipo, tema: string, nome: string) {
  const t = tema.replace(/[.!]+$/, '')
  if (tipo === 'gancho') return [`Ninguém te contou isso sobre ${t}…`, `Para tudo: ${t} 👀`, `Eu não acreditava até ver isso: ${t}`]
  if (tipo === 'venda') return [`Oi! Tudo bem? Vi que você se interessou. Sobre ${t}: ainda dá pra garantir hoje. Quer que eu separe o seu?`, `Passando pra te lembrar: ${t}. Posso te mandar o link do Pix?`, `Oi! Separei uma condição especial pra você: ${t}. Fecho pra você?`]
  if (tipo === 'anuncio') return [`${t}. Toque em "Enviar mensagem" e garanta o seu hoje.`, `Procurando ${t}? A ${nome} tem. Chama no WhatsApp.`, `Só essa semana: ${t}. Vagas limitadas, fala com a gente.`]
  return [`Chegou o que faltava ✨ ${t}. Corre que é por pouco tempo! 👉 Chama no direct`, `Alerta de novidade na ${nome}: ${t} 😍 Comenta "EU QUERO" que a gente te chama!`, `${t} 💛 Feito com carinho pra você. Pede pelo link da bio!`]
}

export function CopyPage() {
  const { live, credits, addCredits, reload } = useStore()
  const { business, library, addLocalItem, reloadLibrary } = useBusiness()
  const toast = useToast()
  const pre = useState(readPrefill)[0]
  const [tipo, setTipo] = useState<Tipo>(pre.tipo && TIPOS.some((t) => t.id === pre.tipo) ? pre.tipo : 'legenda')
  const [tema, setTema] = useState(pre.tema ?? '')
  const [extra, setExtra] = useState(pre.extra ?? '')
  const [busy, setBusy] = useState(false)
  const [opcoes, setOpcoes] = useState<string[]>([])
  const [copied, setCopied] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [openHist, setOpenHist] = useState<string | null>(null)
  const nome = business.name || 'sua loja'
  const historico = library.filter((i) => i.kind === 'copy').slice(0, 8)
  const ph = TIPOS.find((t) => t.id === tipo)!.ph

  useEffect(() => setCopied(null), [opcoes])

  async function gerar() {
    if (busy) return
    if (tema.trim().length < 3) return setError('Conta sobre o que é o texto.')
    if (credits < CREDITS_PER_COPY) return setError('Você não tem créditos suficientes.')
    setError('')
    setBusy(true)
    setOpcoes([])
    if (!live || !supabase) {
      addCredits(-CREDITS_PER_COPY, 'Copy')
      await new Promise((r) => window.setTimeout(r, 1300))
      const out = demoOptions(tipo, tema.trim(), nome)
      setOpcoes(out)
      addLocalItem({ kind: 'copy', module: 'copy', title: `${TIPOS.find((t) => t.id === tipo)!.label}: ${tema.trim().slice(0, 70)}`, body: out.join('\n\n———\n\n'), meta: { tipo, tema, extra, opcoes: out } })
      setBusy(false)
      return
    }
    const { data, error: err } = await supabase.functions.invoke('copy', { body: { tipo, tema, extra } })
    setBusy(false)
    if (err || !Array.isArray(data?.opcoes)) {
      let code = ''
      try {
        const ctx = (err as { context?: Response } | null)?.context
        code = String((ctx ? await ctx.json() : null)?.error ?? '')
      } catch {
        /* sem detalhe */
      }
      await reload()
      return setError(code === 'creditos_insuficientes' ? 'Você não tem créditos suficientes.' : 'Não consegui escrever agora. Seus créditos foram devolvidos, tenta de novo.')
    }
    setOpcoes(data.opcoes)
    reload()
    reloadLibrary()
  }

  async function copiar(i: number, t: string) {
    if (await copyText(t)) {
      setCopied(i)
      toast.show('Texto copiado')
    }
  }

  return (
    <AppShell active="copy">
      <ModuleHeader id="copy" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="rise flex flex-col gap-4 rounded-[24px] border border-line bg-surface p-5 sm:p-6">
          <div role="radiogroup" aria-label="Tipo de texto" className="flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)} className={cx('press min-h-10 cursor-pointer rounded-full px-4 text-[14px] font-semibold transition-colors', tipo === t.id ? 'bg-ink text-bg' : 'border border-line-strong text-soft hover:text-ink')}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="copy-tema" className="text-[14px] font-semibold text-soft">
              Sobre o que é?
            </label>
            <textarea id="copy-tema" rows={3} value={tema} maxLength={600} onChange={(e) => setTema(e.target.value)} placeholder={ph} className={cx(inputCls, 'resize-none py-3')} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="copy-extra" className="text-[14px] font-semibold text-soft">
              Oferta ou detalhe (opcional)
            </label>
            <input id="copy-extra" value={extra} maxLength={300} onChange={(e) => setExtra(e.target.value)} placeholder="Ex.: frete grátis hoje, 10% no Pix" className={inputCls} />
          </div>
          <p className="m-0 text-[13px] text-muted">
            Sai no tom {business.tone ? 'que você escolheu' : 'da sua marca'}, pensando em {business.audience ? 'quem compra de você' : 'o seu público'}.
          </p>
          {error && (
            <p role="alert" className="m-0 text-[14px] text-[#fca5a5]">
              {error}
            </p>
          )}
          <Button size="lg" onClick={gerar} disabled={busy} className="self-stretch sm:self-start">
            <PenLine size={18} /> {busy ? 'Escrevendo…' : `Escrever 3 opções · ${CREDITS_PER_COPY} crédito${CREDITS_PER_COPY > 1 ? 's' : ''}`}
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          {busy &&
            [0, 1, 2].map((i) => (
              <div key={i} className="relative h-[120px] overflow-hidden rounded-[20px] border border-line bg-surface">
                <span className="shimmer absolute inset-0" />
              </div>
            ))}
          {!busy && opcoes.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[#3a4152] px-6 py-10 text-center">
              <PenLine size={26} className="text-[#facc15]" />
              <p className="m-0 text-[15px] font-semibold">As 3 opções aparecem aqui</p>
              <p className="m-0 text-[13.5px] text-muted">Cada uma com um ângulo diferente. Você escolhe e copia.</p>
            </div>
          )}
          {opcoes.map((o, i) => (
            <article key={i} className="pop flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4 sm:p-5" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent-text">Opção {i + 1}</span>
              <p className="m-0 whitespace-pre-wrap text-[15px] leading-relaxed text-soft">{o}</p>
              <button type="button" onClick={() => copiar(i, o)} className={cx('press flex min-h-10 cursor-pointer items-center gap-1.5 self-end rounded-lg px-3 text-[13px] font-bold transition-colors', copied === i ? 'bg-sky text-[#06121f]' : 'border border-line-strong text-soft hover:text-ink')}>
                {copied === i ? <Check size={15} /> : <CopyIcon size={15} />} {copied === i ? 'Copiado' : 'Copiar'}
              </button>
            </article>
          ))}
        </section>
      </div>

      {historico.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-[20px] font-bold">Suas copies</h2>
          <div className="flex flex-col gap-2">
            {historico.map((h) => {
              const open = openHist === h.id
              return (
                <div key={h.id} className="rounded-2xl border border-line bg-surface">
                  <button type="button" onClick={() => setOpenHist(open ? null : h.id)} aria-expanded={open} className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 text-left">
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{h.title}</span>
                    <span className="shrink-0 text-[12px] text-muted">{timeAgo(h.createdAt)}</span>
                    <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <div className="flex flex-col gap-2 border-t border-line p-4">
                      {(Array.isArray(h.meta?.opcoes) ? (h.meta!.opcoes as string[]) : [h.body ?? '']).map((o, k) => (
                        <div key={k} className="flex items-start gap-3 rounded-xl bg-bg/50 p-3">
                          <p className="m-0 min-w-0 flex-1 whitespace-pre-wrap text-[14px] leading-relaxed text-soft">{o}</p>
                          <button type="button" onClick={async () => toast.show((await copyText(o)) ? 'Texto copiado' : 'Não deu pra copiar')} aria-label="Copiar" className="press flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line-strong text-soft hover:text-ink">
                            <CopyIcon size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </AppShell>
  )
}
