// Meu Negócio: cadastro em passos no primeiro acesso (#comecar) e edição depois (#meu-negocio).
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, AtSign, Check, Globe, ImagePlus, Lock, Music2, Phone, Play, Plus } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { LoopVideo } from '../components/LoopVideo'
import { ModuleHeader } from '../components/Module'
import { stories as reelStories } from '../components/StoryReel'
import { clips } from '../components/Showcase'
import { Toon } from '../components/art'
import { Button, Logo, cx, go, useToast } from '../components/ui'
import { BRAND_COLORS, NICHES, TONES, useBusiness, type Business, type Socials } from '../lib/business'
import { useStore } from '../lib/store'

/* ---------- Campos ---------- */

const inputCls =
  'min-h-12 w-full rounded-[14px] border border-line-strong bg-bg/70 px-4 text-[16px] text-ink outline-none transition-shadow placeholder:text-subtle focus:border-accent focus:shadow-[0_0_0_4px_#ff8a3d22]'

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold text-soft">
        {label}
      </label>
      {children}
      {hint && <span className="text-[12.5px] text-muted">{hint}</span>}
    </div>
  )
}

function NicheChoice({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const custom = value && !NICHES.includes(value)
  const [other, setOther] = useState(custom || value === 'Outro')
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Nicho" className="flex flex-wrap gap-2">
        {NICHES.map((n) => {
          const on = n === 'Outro' ? other : value === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                if (n === 'Outro') {
                  setOther(true)
                  onChange('')
                } else {
                  setOther(false)
                  onChange(n)
                }
              }}
              className={cx('press min-h-11 cursor-pointer rounded-full border px-4 text-[14px] font-semibold transition-colors', on ? 'border-accent bg-[#ff8a3d1f] text-ink' : 'border-line-strong text-soft hover:border-accent-line hover:text-ink')}
            >
              {n}
            </button>
          )
        })}
      </div>
      {other && <input aria-label="Qual o seu nicho?" autoFocus value={value} maxLength={60} onChange={(e) => onChange(e.target.value)} placeholder="Ex.: Ótica, papelaria, oficina..." className={inputCls} />}
    </div>
  )
}

function ToneChoice({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Tom de voz" className="grid gap-2.5 sm:grid-cols-2">
      {TONES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx('press flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors', value === t.id ? 'border-accent bg-[#17130f]' : 'border-line bg-bg/60 hover:border-line-strong')}
        >
          <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', value === t.id ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong')}>
            {value === t.id && <Check size={14} strokeWidth={3} aria-hidden />}
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-bold text-ink">{t.label}</span>
            <span className="text-[13px] text-muted">{t.sub}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function LogoAndColors({ business, onColors }: { business: Business; onColors: (c: string[]) => void }) {
  const { uploadLogo } = useBusiness()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const colors = business.colors

  async function pick(f: File | undefined) {
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.show('Escolha uma imagem (PNG ou JPG).')
    if (f.size > 8 * 1024 * 1024) return toast.show('Imagem muito grande. Até 8 MB.')
    setBusy(true)
    const ok = await uploadLogo(f)
    setBusy(false)
    toast.show(ok ? 'Logo salva' : 'Não deu pra salvar a logo. Tenta de novo.')
  }

  function toggle(c: string) {
    onColors(colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c].slice(-4))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-soft">Logo</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => file.current?.click()}
            className="press group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[22px] border-[1.5px] border-dashed border-line-strong bg-bg/60 hover:border-accent-line"
            aria-label={business.logo ? 'Trocar a logo' : 'Enviar a logo'}
          >
            {business.logo ? (
              <img src={business.logo} alt="Logo do negócio" className="h-full w-full bg-white object-contain p-2" />
            ) : (
              <ImagePlus size={28} className="text-accent transition-transform group-hover:scale-110" aria-hidden />
            )}
            {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/60"><span className="h-6 w-6 animate-spin rounded-full border-[3px] border-accent border-t-transparent" /></span>}
          </button>
          <div className="flex flex-col gap-1.5">
            <Button variant="soft" onClick={() => file.current?.click()} disabled={busy}>
              {business.logo ? 'Trocar logo' : 'Enviar logo'}
            </Button>
            <span className="text-[12.5px] text-muted">PNG com fundo transparente fica melhor.</span>
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[14px] font-semibold text-soft">Cores da marca (até 4)</span>
        <div className="flex flex-wrap items-center gap-2.5">
          {BRAND_COLORS.map((c) => {
            const on = colors.includes(c)
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                aria-label={`Cor ${c}`}
                onClick={() => toggle(c)}
                className={cx('press relative h-11 w-11 cursor-pointer rounded-full border-2 transition-transform', on ? 'scale-110 border-white shadow-[0_0_0_3px_#ff8a3d]' : 'border-white/15 hover:scale-105')}
                style={{ background: c }}
              >
                {on && <Check size={16} strokeWidth={3} className="absolute inset-0 m-auto text-white mix-blend-difference" aria-hidden />}
              </button>
            )
          })}
          <label className="press relative flex h-11 cursor-pointer items-center gap-2 rounded-full border border-dashed border-line-strong px-3.5 text-[13px] font-semibold text-soft hover:border-accent-line">
            <Plus size={15} aria-hidden /> Outra
            <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => toggle(e.target.value)} />
          </label>
        </div>
        {colors.length > 0 && (
          <div className="mt-1 flex h-3 w-full max-w-[320px] overflow-hidden rounded-full">
            {colors.map((c) => (
              <span key={c} className="bar-grow flex-1" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const socialFields: Array<{ key: keyof Socials; label: string; icon: typeof AtSign; ph: string }> = [
  { key: 'instagram', label: 'Instagram', icon: AtSign, ph: '@seunegocio' },
  { key: 'tiktok', label: 'TikTok', icon: Music2, ph: '@seunegocio' },
  { key: 'youtube', label: 'YouTube', icon: Play, ph: '@seucanal' },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone, ph: '(11) 99999-9999' },
  { key: 'site', label: 'Site', icon: Globe, ph: 'seunegocio.com.br' },
]

function SocialsForm({ value, onChange }: { value: Socials; onChange: (v: Socials) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {socialFields.map((f) => (
        <label key={f.key} className="flex min-h-12 items-center gap-3 rounded-[14px] border border-line-strong bg-bg/70 pl-3.5 focus-within:border-accent focus-within:shadow-[0_0_0_4px_#ff8a3d22]">
          <f.icon size={18} className="shrink-0 text-accent" aria-hidden />
          <span className="sr-only">{f.label}</span>
          <input
            value={value[f.key] ?? ''}
            maxLength={120}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
            placeholder={`${f.label}: ${f.ph}`}
            inputMode={f.key === 'whatsapp' ? 'tel' : undefined}
            className="min-h-12 min-w-0 flex-1 bg-transparent pr-3.5 text-[16px] text-ink outline-none placeholder:text-subtle"
          />
        </label>
      ))}
    </div>
  )
}

function CastStrip({ from }: { from: 'comecar' | 'meu-negocio' }) {
  const { characters } = useStore()
  function create() {
    try {
      sessionStorage.setItem('plotoon:voltar', from)
    } catch {
      /* sem armazenamento */
    }
    go('novo-personagem')
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      <button type="button" onClick={create} className="press flex w-[112px] shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-strong bg-bg/50 py-6 text-ink hover:border-accent-line">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-ink">
          <Plus size={22} aria-hidden />
        </span>
        <span className="text-[13px] font-semibold">Novo</span>
      </button>
      {characters.map((c) => (
        <figure key={c.id} className="pop m-0 flex w-[112px] shrink-0 flex-col gap-1.5">
          <span className="relative block aspect-square overflow-hidden rounded-[18px] border border-line-strong bg-gradient-to-b from-[#2a1a12] to-[#120d0a]">
            {c.image || c.photo ? <img src={c.image ?? c.photo} alt="" className="absolute inset-0 h-full w-full object-cover object-top" /> : <Toon look={c.look} className="absolute inset-x-0 bottom-0 w-full" />}
            <Lock size={12} className="absolute left-2 top-2 text-sky" aria-hidden />
          </span>
          <figcaption className="truncate text-[13px] font-semibold">{c.name}</figcaption>
        </figure>
      ))}
    </div>
  )
}

/* ---------- Cadastro em passos ---------- */

type StepDef = { key: string; title: string; sub: string; art: { video: string; poster: string }; ok: (b: Business) => boolean }

const STEPS: StepDef[] = [
  { key: 'nome', title: 'Como se chama o seu negócio?', sub: 'É assim que ele vai aparecer nos posts e vídeos.', art: clips.notificacao, ok: (b) => b.name.trim().length > 1 },
  { key: 'nicho', title: 'Qual é o seu nicho?', sub: 'Assim as ideias já chegam certas pra você.', art: clips.trabalhando, ok: (b) => b.niche.trim().length > 1 },
  { key: 'vende', title: 'O que você vende?', sub: 'Produtos, serviços, preço médio. O que vier na cabeça.', art: reelStories[1], ok: (b) => b.sells.trim().length > 2 },
  { key: 'publico', title: 'Pra quem você vende?', sub: 'Quem é o seu cliente ideal: idade, cidade, o que ele quer.', art: reelStories[4], ok: (b) => b.audience.trim().length > 2 },
  { key: 'tom', title: 'Como a sua marca fala?', sub: 'Todo texto e roteiro vai sair nesse tom.', art: clips.roteiro, ok: (b) => !!b.tone },
  { key: 'marca', title: 'Logo e cores', sub: 'Pra deixar tudo com a cara da sua marca.', art: clips.creditos, ok: () => true },
  { key: 'redes', title: 'Onde você posta?', sub: 'Suas redes. Pode deixar em branco o que não usa.', art: clips.videos, ok: () => true },
  { key: 'elenco', title: 'Seu elenco', sub: 'Personagens 3D com o seu rosto ou da sua equipe, pros vídeos.', art: clips.personagem, ok: () => true },
]

const STEP_KEY = 'plotoon:comecar:passo'

export function Onboarding() {
  const { business, saveBusiness } = useBusiness()
  const toast = useToast()
  const [step, setStep] = useState(() => {
    try {
      return Math.min(STEPS.length - 1, Number(sessionStorage.getItem(STEP_KEY)) || 0)
    } catch {
      return 0
    }
  })
  const [draft, setDraft] = useState<Business>(business)
  const [saving, setSaving] = useState(false)
  const synced = useRef(false)

  // quando o perfil chega do banco depois de abrir a tela
  useEffect(() => {
    if (synced.current) return
    if (business.name || business.niche) {
      setDraft(business)
      synced.current = true
    }
  }, [business])
  useEffect(() => setDraft((d) => ({ ...d, logo: business.logo, logoPath: business.logoPath })), [business.logo, business.logoPath])
  useEffect(() => {
    try {
      sessionStorage.setItem(STEP_KEY, String(step))
    } catch {
      /* sem armazenamento */
    }
  }, [step])

  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const set = (patch: Partial<Business>) => setDraft((d) => ({ ...d, ...patch }))

  async function next() {
    if (!s.ok(draft) || saving) return
    setSaving(true)
    const ok = await saveBusiness({ ...draft, completed: last })
    setSaving(false)
    if (!ok) return toast.show('Não deu pra salvar agora. Confere a internet e tenta de novo.')
    if (last) {
      try {
        sessionStorage.removeItem(STEP_KEY)
      } catch {
        /* sem armazenamento */
      }
      toast.show('Tudo pronto! Seu estúdio já conhece o seu negócio.')
      go('inicio')
    } else setStep(step + 1)
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col lg:grid lg:grid-cols-[1fr_minmax(380px,44%)]">
      <div className="relative flex flex-1 flex-col px-5 pb-6 pt-5 sm:px-10 lg:px-16 lg:pt-8">
        <div className="flex items-center justify-between gap-4">
          <Logo size="sm" />
          <span className="text-[13px] font-semibold text-muted">
            {step + 1} de {STEPS.length}
          </span>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {STEPS.map((x, i) => (
            <span key={x.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              {i <= step && <span className="bar-grow block h-full rounded-full bg-gradient-to-r from-accent to-[#ff5da2]" />}
            </span>
          ))}
        </div>
        <div role="progressbar" aria-label="Progresso do cadastro" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} className="sr-only" />

        <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center gap-7 py-8">
          {/* imagem do passo, só no celular */}
          <div key={`art-${s.key}`} className="pop relative mx-auto aspect-[16/9] w-full max-w-[420px] overflow-hidden rounded-[22px] border border-line-strong lg:hidden">
            <LoopVideo src={s.art.video} poster={s.art.poster} eager className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-bg/70 to-transparent" />
          </div>

          <div key={s.key} className="rise flex flex-col gap-2">
            <h1 className="m-0 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.025em] sm:text-[36px]">{s.title}</h1>
            <p className="m-0 text-[15px] text-muted sm:text-[16px]">{s.sub}</p>
          </div>

          <div key={`f-${s.key}`} className="rise rise-1">
            {s.key === 'nome' && (
              <input aria-label="Nome do negócio" autoFocus value={draft.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Ex.: Ateliê da Ju" className={inputCls} />
            )}
            {s.key === 'nicho' && <NicheChoice value={draft.niche} onChange={(niche) => set({ niche })} />}
            {s.key === 'vende' && (
              <textarea aria-label="O que você vende" autoFocus value={draft.sells} maxLength={400} rows={4} onChange={(e) => set({ sells: e.target.value })} placeholder="Ex.: Roupas femininas de festa, de R$ 89 a R$ 299, com entrega na cidade." className={cx(inputCls, 'resize-none py-3')} />
            )}
            {s.key === 'publico' && (
              <textarea aria-label="Pra quem você vende" autoFocus value={draft.audience} maxLength={400} rows={4} onChange={(e) => set({ audience: e.target.value })} placeholder="Ex.: Mulheres de 20 a 35 anos, de Campinas, que querem se arrumar pra eventos sem gastar muito." className={cx(inputCls, 'resize-none py-3')} />
            )}
            {s.key === 'tom' && <ToneChoice value={draft.tone} onChange={(tone) => set({ tone })} />}
            {s.key === 'marca' && <LogoAndColors business={draft} onColors={(colors) => set({ colors })} />}
            {s.key === 'redes' && <SocialsForm value={draft.socials} onChange={(socials) => set({ socials })} />}
            {s.key === 'elenco' && <CastStrip from="comecar" />}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-line bg-bg/90 px-5 py-3 backdrop-blur sm:-mx-10 sm:px-10 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
          {step > 0 ? (
            <Button variant="ghost" size="lg" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={18} /> Voltar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {(s.key === 'marca' || s.key === 'redes' || s.key === 'elenco') && (
              <Button variant="ghost" size="lg" onClick={next} disabled={saving}>
                Pular
              </Button>
            )}
            <Button size="lg" onClick={next} disabled={!s.ok(draft) || saving} className="min-w-[150px]">
              {saving ? 'Salvando...' : last ? 'Concluir' : 'Continuar'} {!saving && (last ? <Check size={18} /> : <ArrowRight size={18} />)}
            </Button>
          </div>
        </div>
      </div>

      {/* imagem grande do passo, no computador */}
      <aside aria-hidden className="relative hidden overflow-hidden border-l border-line lg:block">
        <div key={`big-${s.key}`} className="pop absolute inset-0">
          <LoopVideo src={s.art.video} poster={s.art.poster} eager className="h-full w-full object-cover" />
        </div>
        <span className="absolute inset-0 bg-gradient-to-r from-bg via-bg/10 to-transparent" />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/90 to-transparent" />
        {draft.name && (
          <div className="rise absolute bottom-10 left-10 right-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/45 p-3.5 backdrop-blur-md">
            {draft.logo ? (
              <img src={draft.logo} alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl text-[20px] font-bold text-white" style={{ background: draft.colors[0] ?? '#ff8a3d' }}>
                {draft.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-display text-[18px] font-bold text-white">{draft.name}</span>
              <span className="truncate text-[13px] text-white/70">{draft.niche || 'Seu estúdio de marketing'}</span>
            </span>
            <span className="ml-auto flex gap-1">
              {draft.colors.map((c) => (
                <span key={c} className="h-4 w-4 rounded-full border border-white/30" style={{ background: c }} />
              ))}
            </span>
          </div>
        )}
      </aside>
    </div>
  )
}

/* ---------- Meu Negócio (edição) ---------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rise flex flex-col gap-5 rounded-[22px] border border-line bg-surface p-5 sm:p-6">
      <h2 className="m-0 font-display text-[19px] font-bold">{title}</h2>
      {children}
    </section>
  )
}

export function MyBusiness() {
  const { business, saveBusiness, loaded } = useBusiness()
  const toast = useToast()
  const [draft, setDraft] = useState<Business>(business)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify({ ...draft, logo: 0, logoPath: 0 }) !== JSON.stringify({ ...business, logo: 0, logoPath: 0 })

  useEffect(() => {
    if (loaded && !dirty) setDraft(business)
  }, [business, loaded]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setDraft((d) => ({ ...d, logo: business.logo, logoPath: business.logoPath })), [business.logo, business.logoPath])

  const set = (patch: Partial<Business>) => setDraft((d) => ({ ...d, ...patch }))

  async function save() {
    if (draft.name.trim().length < 2) return toast.show('Coloque o nome do negócio.')
    setSaving(true)
    const ok = await saveBusiness({ ...draft, completed: true })
    setSaving(false)
    toast.show(ok ? 'Perfil salvo' : 'Não deu pra salvar agora. Tenta de novo.')
  }

  const saveBtn = (
    <Button size="lg" onClick={save} disabled={!dirty || saving}>
      {saving ? 'Salvando...' : dirty ? 'Salvar alterações' : 'Tudo salvo'} {!saving && !dirty && <Check size={18} />}
    </Button>
  )

  return (
    <AppShell active="meu-negocio">
      <ModuleHeader id="meu-negocio" actions={<span className="hidden lg:block">{saveBtn}</span>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Identidade">
          <Field id="neg-nome" label="Nome do negócio">
            <input id="neg-nome" value={draft.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-soft">Nicho</span>
            <NicheChoice value={draft.niche} onChange={(niche) => set({ niche })} />
          </div>
        </Section>

        <Section title="Marca">
          <LogoAndColors business={draft} onColors={(colors) => set({ colors })} />
        </Section>

        <Section title="O que vende e pra quem">
          <Field id="neg-vende" label="O que você vende">
            <textarea id="neg-vende" value={draft.sells} maxLength={400} rows={3} onChange={(e) => set({ sells: e.target.value })} className={cx(inputCls, 'resize-none py-3')} />
          </Field>
          <Field id="neg-publico" label="Seu público">
            <textarea id="neg-publico" value={draft.audience} maxLength={400} rows={3} onChange={(e) => set({ audience: e.target.value })} className={cx(inputCls, 'resize-none py-3')} />
          </Field>
        </Section>

        <Section title="Tom de voz">
          <ToneChoice value={draft.tone} onChange={(tone) => set({ tone })} />
        </Section>

        <Section title="Redes sociais">
          <SocialsForm value={draft.socials} onChange={(socials) => set({ socials })} />
        </Section>

        <Section title="Elenco de personagens">
          <p className="-mt-2 m-0 text-[14px] text-muted">Bonecos 3D com rosto travado, usados nos vídeos.</p>
          <CastStrip from="meu-negocio" />
          <a href="#elenco" className="self-start text-[14px] font-semibold text-accent-text no-underline hover:text-accent">
            Ver elenco completo
          </a>
        </Section>
      </div>

      <div className="sticky bottom-[92px] z-20 flex justify-end lg:hidden">{saveBtn}</div>
    </AppShell>
  )
}
