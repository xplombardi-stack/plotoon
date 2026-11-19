import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { Check, Coins, ImagePlus, Lock, Plus, RefreshCw } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { Toon, type ToonLook } from '../components/art'
import { ClipArt, clips } from '../components/Showcase'
import estiloCinema from '../assets/historias/trader-escritorio.webp'
import estiloFofinho from '../assets/historias/festa-risada.webp'
import estiloRealista from '../assets/inicio/criador-trabalhando.webp'

const styleThumb: Record<StyleId, string> = { cinema: estiloCinema, fofinho: estiloFofinho, realista: estiloRealista }
import { Badge, Button, Card, LinkButton, PageHeader, cx, go, useToast } from '../components/ui'
import { CREDITS_PER_CHARACTER, formatCredits } from '../lib/pricing'
import { photoThumb, styleList, timeAgo, useStore, type BonecoResult, type StyleId } from '../lib/store'

const styleBg: Record<StyleId, string> = {
  cinema: 'from-[#4a2e1b] to-[#1a120d]',
  fofinho: 'from-[#4a2742] to-[#1c111a]',
  realista: 'from-[#2b3240] to-[#121620]',
}

export function Cast() {
  const { characters } = useStore()
  return (
    <AppShell active="elenco">
      <PageHeader
        title="Elenco"
        subtitle="Seus personagens com o rosto travado."
        actions={
          <LinkButton to="novo-personagem" size="lg">
            <Plus size={18} /> Novo personagem
          </LinkButton>
        }
      />
      {characters.length === 0 ? (
        <div className="rise flex flex-col items-center gap-5 rounded-[22px] border border-dashed border-[#3a4152] px-6 py-14 text-center">
          <ClipArt clip={clips.personagem} pos="50% 30%" className="aspect-[4/3] w-full max-w-[320px] rounded-2xl" />
          <h2 className="m-0 font-display text-[24px] font-extrabold">Seu elenco está vazio</h2>
          <p className="m-0 max-w-[440px] text-[15px] text-muted">Mande uma foto e a gente cria o seu boneco 3D. Ele fica com o mesmo rosto em todos os vídeos.</p>
          <LinkButton to="novo-personagem" size="lg">
            <Plus size={18} /> Criar meu primeiro personagem
          </LinkButton>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {characters.map((c, i) => (
            <article key={c.id} className="pop lift flex flex-col gap-3 rounded-[22px]" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={cx('relative aspect-square overflow-hidden rounded-[22px] border border-line-strong bg-gradient-to-b', styleBg[c.style])}>
                {c.image || c.photo ? (
                  <img src={c.image ?? c.photo} alt={`Boneco de ${c.name}`} className="absolute inset-0 h-full w-full object-cover object-top" />
                ) : (
                  <Toon look={c.look} className="absolute inset-x-0 bottom-0 w-full" />
                )}
                <Badge tone="sky" className="absolute left-2.5 top-2.5 !bg-[#0a1a2bd9]">
                  <Lock size={12} aria-hidden /> Rosto travado
                </Badge>
                {c.photo && c.image && <img src={c.photo} alt="" className="absolute bottom-2.5 right-2.5 h-11 w-11 rounded-full border-2 border-bg object-cover" />}
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="m-0 text-[15px] font-bold">{c.name}</h2>
                <span className="text-[13px] text-muted">
                  {styleList.find((s) => s.id === c.style)?.name} · {timeAgo(c.createdAt)}
                </span>
              </div>
            </article>
          ))}
          <a href="#novo-personagem" className="press flex flex-col gap-3 text-ink no-underline">
            <span className="flex aspect-square flex-col items-center justify-center gap-3 rounded-[22px] border-[1.5px] border-dashed border-[#3a4152] hover:border-accent-line">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-accent">
                <Plus size={22} aria-hidden />
              </span>
              <span className="text-[14px] font-semibold">Novo personagem</span>
            </span>
          </a>
        </div>
      )}
    </AppShell>
  )
}

export function NewCharacter() {
  const toast = useToast()
  const { credits, addCharacter, gerarBoneco } = useStore()
  const [photo, setPhoto] = useState<string | null>(null)
  const [style, setStyle] = useState<StyleId>('cinema')
  const [name, setName] = useState('')
  const [look, setLook] = useState<ToonLook | null>(null)
  const [made, setMade] = useState<Extract<BonecoResult, { ok: true }> | null>(null)
  const [madeStyle, setMadeStyle] = useState<StyleId>('cinema')
  const [working, setWorking] = useState(false)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPhoto(await photoThumb(file))
      setLook(null)
      setMade(null)
    } catch {
      toast.show('Não deu pra abrir essa foto. Tenta outra.')
    }
  }

  async function generate() {
    if (!photo || working) return
    if (credits < CREDITS_PER_CHARACTER) return toast.show('Créditos insuficientes')
    setWorking(true)
    const r = await gerarBoneco(photo, style)
    setWorking(false)
    if (!r.ok) {
      const msg: Record<string, string> = {
        creditos_insuficientes: 'Créditos insuficientes',
        foto_recusada: 'Não deu pra usar essa foto. Tenta outra, com o rosto de frente e boa luz.',
        boneco_sem_chave: 'A geração de boneco ainda não foi ligada.',
      }
      return toast.show(msg[r.error] ?? 'Não deu pra gerar agora. Seus créditos foram devolvidos.')
    }
    setMade(r)
    setMadeStyle(style)
    setLook(r.look)
  }

  const [saving, setSaving] = useState(false)

  async function save() {
    if (!look || saving) return
    setSaving(true)
    const ok = await addCharacter({
      name: name.trim().toUpperCase(),
      style: madeStyle,
      look,
      photo: photo ?? undefined,
      image: made?.image,
      imagePath: made?.imagePath,
      photoPath: made?.photoPath,
    })
    setSaving(false)
    if (!ok) return toast.show('Não deu pra salvar agora. Tenta de novo.')
    toast.show(`${name.trim().toUpperCase()} entrou pro elenco`)
    let back: string | null = null
    try {
      back = sessionStorage.getItem('plotoon:voltar')
      sessionStorage.removeItem('plotoon:voltar')
    } catch {
      /* sem armazenamento */
    }
    go(back === 'nova-historinha' ? 'nova-historinha' : 'elenco')
  }

  return (
    <AppShell active="novo-personagem">
      <PageHeader
        title="Criar personagem"
        subtitle={`Cada boneco gerado custa ${CREDITS_PER_CHARACTER} créditos · você tem ${formatCredits(credits)}`}
        actions={
<span className="hidden lg:block">
          <Button size="lg" disabled={!look || !name.trim() || saving} onClick={save} className={look && name.trim() ? 'pulse' : undefined}>
            <Check size={18} /> Salvar no elenco
          </Button>
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rise flex flex-col gap-4 p-5">
          <h2 className="m-0 flex items-center gap-3 text-[17px] font-bold">
            <span className={cx('flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] transition-colors', photo ? 'bg-sky-soft text-sky-text' : 'bg-accent text-accent-ink')}>
              {photo ? <Check size={16} strokeWidth={3} /> : 1}
            </span>
            Sua foto
          </h2>
          <label htmlFor="foto" className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[18px] border-[1.5px] border-dashed border-[#3a4152] text-center transition-colors hover:border-accent">
            {photo ? (
              <img src={photo} alt="Sua foto" className="pop absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <span className="float flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-accent">
                  <ImagePlus size={28} aria-hidden />
                </span>
                <span className="text-[16px] font-semibold">Enviar foto</span>
                <span className="px-6 text-[13px] text-muted">Rosto de frente e com boa luz</span>
              </>
            )}
          </label>
          <input id="foto" type="file" accept="image/*" onChange={onFile} className="sr-only" />
        </Card>

        <Card className="rise rise-1 flex flex-col gap-4 p-5">
          <h2 className="m-0 flex items-center gap-3 text-[17px] font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-display text-[15px] text-accent-ink">2</span>
            Estilo
          </h2>
          <div role="radiogroup" aria-label="Estilo do boneco" className="flex flex-col gap-2.5">
            {styleList.map((s) => {
              const on = s.id === style
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setStyle(s.id)}
                  className={cx('press flex cursor-pointer items-center gap-3 rounded-[18px] border-2 p-2 text-left transition-all', on ? 'border-accent bg-[#17130f] glow-accent' : 'border-line bg-[#0f1218] hover:border-line-strong')}
                >
                  <span className="relative h-[72px] w-24 shrink-0 overflow-hidden rounded-[12px] bg-side">
                    <img src={styleThumb[s.id]} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_25%]" />
                  </span>
                  <span className="flex-1 text-[15px] font-semibold text-ink">{s.name}</span>
                  <span className={cx('mr-1 h-5 w-5 rounded-full border-2 transition-colors', on ? 'border-accent bg-accent' : 'border-[#3a4152]')} aria-hidden />
                </button>
              )
            })}
          </div>
          <Button size="lg" className="mt-auto w-full" disabled={!photo || working} onClick={generate}>
            {working ? 'Gerando…' : look ? (
              <>
                <RefreshCw size={16} /> Gerar outro · {CREDITS_PER_CHARACTER}
              </>
            ) : (
              <>Gerar boneco · {CREDITS_PER_CHARACTER} créditos</>
            )}
          </Button>
          {!photo && <p className="m-0 text-center text-[13px] text-subtle">Envie a foto primeiro.</p>}
        </Card>

        <Card className={cx('rise rise-2 flex flex-col gap-4 p-5 transition-all', look && '!border-accent glow-accent')}>
          <h2 className="m-0 flex items-center gap-3 text-[17px] font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-display text-[15px] text-accent-ink">3</span>
            Seu boneco
          </h2>
          {look ? (
            <>
              <div className={cx('pop relative aspect-[3/4] overflow-hidden rounded-[18px] bg-gradient-to-b', styleBg[madeStyle])}>
                {made?.image ? (
                  <img src={made.image} alt="Seu boneco 3D" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Toon look={look} className="float absolute inset-x-0 bottom-0 w-full" />
                )}
                <Badge tone="sky" className="absolute right-2.5 top-2.5 !bg-[#0a1a2bd9]">
                  <Lock size={12} aria-hidden /> Rosto travado
                </Badge>
              </div>
              <label htmlFor="nome-p" className="text-[14px] font-medium text-muted">Nome do personagem</label>
              <input
                id="nome-p"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: seu nome"
                className="min-h-12 rounded-[12px] border border-line-strong bg-bg px-3.5 text-[16px] font-bold uppercase text-ink outline-none placeholder:font-normal placeholder:normal-case focus:border-accent"
              />
              <Button size="lg" disabled={!name.trim() || saving} onClick={save} className={cx('w-full lg:hidden', name.trim() && 'pulse')}>
                <Check size={18} /> Salvar no elenco
              </Button>
            </>
          ) : (
            <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-[18px] bg-[#0f1218] text-center">
              {working ? (
                <>
                  <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-accent border-t-transparent" aria-hidden />
                  <span className="text-[15px] font-semibold">Criando seu boneco…</span>
                </>
              ) : (
                <>
                  <Coins size={22} className="text-subtle" aria-hidden />
                  <span className="px-6 text-[14px] text-muted">Seu boneco aparece aqui</span>
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
