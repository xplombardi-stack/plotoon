// Demonstrações animadas de cada função, usadas na página inicial (só ilustração).
import type { ReactNode } from 'react'
import { BadgeCheck, CalendarDays, Check, CheckCheck, Copy, Flame, LoaderCircle, MousePointer2, Pause, Rocket, Send, Sparkles, TrendingUp, Wand2 } from 'lucide-react'
import { LoopVideo } from './LoopVideo'
import { ModuleIcon, moduleArt } from './Module'
import { stories as reel } from './StoryReel'
import { on, typed, useLoop } from './StepDemos'
import { cx } from './ui'
import { MODULES, type ModuleId } from '../lib/modules'

const fadeOut = (t: number, total: number) => (t > total - 600 ? Math.max(0, (total - t) / 600) : 1)

function Frame({ children, className, innerRef, style }: { children: ReactNode; className?: string; innerRef?: React.Ref<HTMLDivElement>; style?: React.CSSProperties }) {
  return (
    <div ref={innerRef} aria-hidden className={cx('relative overflow-hidden rounded-[24px] border border-line-strong bg-[#0d1017] shadow-[0_30px_80px_-30px_#000]', className)} style={style}>
      {children}
    </div>
  )
}

function Typing() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  )
}

/* ---------- Topo: tudo num lugar só ---------- */

const HUB: ModuleId[] = ['mentor', 'estudio-video', 'estudio-imagem', 'cortes', 'copy', 'whatsapp', 'calendario', 'anuncios']

export function DemoHub({ className }: { className?: string }) {
  const STEP = 2600
  const { ref, t } = useLoop(STEP * HUB.length, 0)
  const i = Math.floor(t / STEP) % HUB.length
  return (
    <Frame innerRef={ref} className={cx('flex flex-col', className)}>
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 rounded-md bg-surface px-3 py-1 text-[11px] text-subtle">plotoon.app</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[50px] shrink-0 flex-col items-center justify-center gap-1 border-r border-line bg-side py-2 sm:w-[60px]">
          {HUB.map((id, k) => (
            <span key={id} className={cx('rounded-[12px] p-0.5 transition-all duration-500', k === i ? 'scale-110 bg-[#ff8a3d26] shadow-[0_0_0_1px_#ff8a3d66]' : 'opacity-50')}>
              <ModuleIcon id={id} size="sm" />
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {HUB.map((id, k) => {
            const art = moduleArt[id]!
            const show = k === i
            return (
              <div key={id} className={cx('absolute inset-0 transition-opacity duration-700', show ? 'opacity-100' : 'opacity-0')}>
                {art.video ? <LoopVideo src={art.video} poster={art.poster} className="absolute inset-0 h-full w-full object-cover" /> : <img src={art.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                <span className="absolute inset-0 bg-gradient-to-t from-[#0d1017] via-[#0d1017]/40 to-transparent" />
                <div className={cx('absolute inset-x-4 bottom-4 flex flex-col gap-1 transition-all duration-700 sm:inset-x-6 sm:bottom-6', show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')}>
                  <span className="font-display text-[22px] font-extrabold text-white sm:text-[28px]">{MODULES[id].name}</span>
                  <span className="max-w-[420px] text-[13px] text-white/75 sm:text-[15px]">{MODULES[id].phrase}</span>
                </div>
              </div>
            )
          })}
          <div className="absolute inset-x-0 top-0 flex gap-1 p-3">
            {HUB.map((id, k) => (
              <span key={id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <span className="block h-full bg-white" style={{ width: k < i ? '100%' : k === i ? `${((t % STEP) / STEP) * 100}%` : '0%' }} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  )
}

/* ---------- 5 apps viram 1 ---------- */

const APPS = ['App de vídeo', 'App de design', 'Editor de texto', '30 abas de chat com IA', 'Planilha de posts', 'Gerenciador de anúncios', 'WhatsApp no braço', 'Criador de logo']

export function DemoChaos({ className }: { className?: string }) {
  const TOTAL = 9000
  const { ref, t } = useLoop(TOTAL, 7000)
  const struck = Math.floor(Math.max(0, t - 600) / 500)
  const merged = on(t, 600 + APPS.length * 500)
  return (
    <div ref={ref} aria-hidden className={cx('flex flex-col items-center gap-6', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="flex max-w-[620px] flex-wrap justify-center gap-2.5">
        {APPS.map((a, k) => (
          <span
            key={a}
            className={cx(
              'rounded-full border px-4 py-2 text-[14px] font-semibold transition-all duration-500',
              k < struck ? 'scale-95 border-line text-subtle line-through decoration-[#ef4444] decoration-2 opacity-50' : 'border-line-strong bg-surface text-soft',
            )}
          >
            {a}
          </span>
        ))}
      </div>
      <div className={cx('flex items-center gap-3 rounded-2xl border border-accent-line bg-[#ff8a3d14] px-5 py-3.5 transition-all duration-700 [transition-timing-function:var(--ease-spring)]', merged ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
        <BadgeCheck size={22} className="text-accent" />
        <span className="text-[16px] font-bold">Tudo isso dentro do Plotoon</span>
      </div>
    </div>
  )
}

/* ---------- Mentor ---------- */

const PERGUNTA = 'Minhas vendas caíram essa semana. O que eu posto?'
const RESPOSTA = 'Faz uma historinha com virada: a cliente que duvidou e virou fã. Termina chamando pro WhatsApp. Já deixei pronto:'

export function DemoMentor({ className }: { className?: string }) {
  const TOTAL = 12000
  const { ref, t } = useLoop(TOTAL, 9000)
  const q = typed(PERGUNTA, t, 300, 34)
  const thinking = t > 2000 && t < 3000
  const a = typed(RESPOSTA, t, 3000, 52)
  const card = on(t, 5400)
  const cursorIn = on(t, 6600)
  const clicked = on(t, 7500)
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3 p-4 sm:p-5', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <ModuleIcon id="mentor" size="sm" />
        <span className="text-[14px] font-bold">Mentor</span>
        <span className="ml-auto text-[11px] text-subtle">conhece o Ateliê da Ju</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3">
        {q && <p className="m-0 max-w-[85%] self-end rounded-[16px] rounded-br-md bg-accent px-3.5 py-2.5 text-[13.5px] font-medium text-accent-ink">{q}</p>}
        {thinking && (
          <span className="flex items-center gap-2 text-[#c4b5fd]">
            <Sparkles size={15} /> <Typing />
          </span>
        )}
        {a && <p className={cx('m-0 max-w-[92%] rounded-[16px] rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[13.5px] leading-relaxed text-soft', a.length < RESPOSTA.length && 'caret')}>{a}</p>}
        {card && (
          <div className={cx('pop flex flex-col gap-2.5 rounded-[16px] border p-3.5 transition-colors', clicked ? 'border-sky-line bg-sky-soft/40' : 'border-accent-line bg-[#ff8a3d10]')}>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-text">Ideia de vídeo</span>
            <span className="text-[14px] font-semibold">A cliente que duvidou e virou fã</span>
            {clicked ? (
              <span className="flex items-center gap-2 text-[13px] font-semibold text-sky-text">
                <Check size={16} /> Abrindo o Estúdio de Vídeo com o roteiro pronto
              </span>
            ) : (
              <span className="flex gap-2">
                <span className="relative inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] font-bold text-accent-ink">
                  Gerar esse vídeo
                  <MousePointer2
                    size={22}
                    className="absolute text-white drop-shadow-[0_2px_4px_#000] transition-all duration-700"
                    style={{ left: cursorIn ? '70%' : '160%', top: cursorIn ? '55%' : '160%' }}
                    fill="#111"
                  />
                </span>
                <span className="rounded-lg border border-line-strong px-3 py-2 text-[12.5px] font-semibold text-soft">Agendar</span>
              </span>
            )}
          </div>
        )}
      </div>
    </Frame>
  )
}

/* ---------- WhatsApp ---------- */

const ZAP: Array<{ who: 'cliente' | 'ia'; text: string; at: number }> = [
  { who: 'cliente', text: 'Oi! Tem esse vestido no M?', at: 400 },
  { who: 'ia', text: 'Tem sim! 💛 É o último M. Quer que eu separe pra você?', at: 2600 },
  { who: 'cliente', text: 'Quero! Aceita Pix?', at: 5600 },
  { who: 'ia', text: 'Aceita! Te mandei o link do Pix com 5% off. Entrega amanhã 🚚', at: 7600 },
]

export function DemoWhatsApp({ className }: { className?: string }) {
  const TOTAL = 14000
  const { ref, t } = useLoop(TOTAL, 12000)
  const typingNow = (t > 1300 && t < 2600) || (t > 6400 && t < 7600)
  const hot = on(t, 10600)
  const sold = on(t, 11400)
  return (
    <div ref={ref} aria-hidden className={cx('relative mx-auto w-full max-w-[330px]', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="relative overflow-hidden rounded-[38px] border-[6px] border-[#1f2430] bg-[#0b141a] shadow-[0_30px_80px_-30px_#000]">
        <div className="flex items-center gap-2.5 bg-[#1f2c33] px-4 pb-2.5 pt-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#ff5da2] text-[14px] font-bold text-white">A</span>
          <span className="flex flex-col leading-tight">
            <span className="text-[14px] font-bold text-white">Ateliê da Ju</span>
            <span className="text-[11.5px] text-[#8fd1a0]">{typingNow ? 'digitando…' : 'online · atendente com IA'}</span>
          </span>
        </div>
        <div className="flex h-[380px] flex-col justify-end gap-2 bg-[#0b141a] bg-[radial-gradient(circle_at_20%_20%,#ffffff08_1px,transparent_1px)] bg-[length:18px_18px] p-3">
          {ZAP.filter((m) => on(t, m.at)).map((m) => {
            const text = m.who === 'ia' ? typed(m.text, t, m.at, 46) : m.text
            return (
              <div key={m.at} className={cx('pop max-w-[82%] rounded-xl px-3 py-2 text-[13.5px] leading-snug text-white', m.who === 'cliente' ? 'self-start rounded-tl-sm bg-[#202c33]' : 'self-end rounded-tr-sm bg-[#005c4b]')}>
                {text}
                {m.who === 'ia' && text.length === m.text.length && <CheckCheck size={14} className="ml-1 inline text-[#53bdeb]" />}
              </div>
            )
          })}
          {typingNow && (
            <span className="self-end rounded-xl bg-[#005c4b] px-3 py-2.5 text-white">
              <Typing />
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2.5">
          <span className="flex-1 rounded-full bg-[#2a3942] px-3.5 py-2 text-[12.5px] text-[#8696a0]">Mensagem</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Send size={15} />
          </span>
        </div>
      </div>
      <div className={cx('absolute -left-4 top-24 flex items-center gap-2 rounded-xl border border-accent-line bg-[#1a120c] px-3 py-2 text-[12.5px] font-bold shadow-xl transition-all duration-500 [transition-timing-function:var(--ease-spring)] sm:-left-12', hot ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
        <Flame size={16} className="text-accent" /> Cliente quente: quer comprar
      </div>
      <div className={cx('absolute -right-3 bottom-24 flex items-center gap-2 rounded-xl border border-[#34d39966] bg-[#0c1a14] px-3 py-2 text-[12.5px] font-bold text-[#6ee7b7] shadow-xl transition-all duration-500 [transition-timing-function:var(--ease-spring)] sm:-right-10', sold ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
        <Check size={16} /> Venda fechada · R$ 189
      </div>
    </div>
  )
}

/* ---------- Logo ---------- */

function LogoArt({ v, className }: { v: 0 | 1 | 2; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className}>
      <defs>
        <linearGradient id={`lg${v}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff5da2" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="#fff" />
      {v === 0 && (
        <>
          <rect x="62" y="34" width="76" height="76" rx="22" fill={`url(#lg${v})`} />
          <text x="100" y="88" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="48" fill="#fff">A</text>
        </>
      )}
      {v === 1 && (
        <>
          <circle cx="100" cy="72" r="38" fill="none" stroke="#ff5da2" strokeWidth="3" />
          <text x="100" y="88" textAnchor="middle" fontFamily="Georgia,serif" fontStyle="italic" fontSize="46" fill="#ff5da2">A</text>
        </>
      )}
      {v === 2 && (
        <>
          <path d="M60 104 Q100 20 140 104 Z" fill="#ff8a3d" />
          <circle cx="124" cy="52" r="12" fill="#ff5da2" />
          <text x="100" y="98" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="30" fill="#fff">A</text>
        </>
      )}
      <text x="100" y="152" textAnchor="middle" fontFamily={v === 1 ? 'Georgia,serif' : 'Arial'} fontWeight="700" fontSize="21" fill="#111827">
        Ateliê da Ju
      </text>
    </svg>
  )
}

export function DemoLogo({ className }: { className?: string }) {
  const TOTAL = 12500
  const { ref, t } = useLoop(TOTAL, 10500)
  const name = typed('Ateliê da Ju', t, 300, 12)
  const style = on(t, 1600)
  const press = t > 2200 && t < 2500
  const loading = t > 2500 && t < 4600
  const done = on(t, 4600)
  const picked = on(t, 6400)
  const applied = on(t, 7400)
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3.5 p-4 sm:p-5', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="flex items-center gap-2">
        <Sparkles size={17} className="text-[#c4b5fd]" />
        <span className="text-[14px] font-bold">Criar logo com IA</span>
      </div>
      <div className={cx('rounded-xl border border-line-strong bg-bg/70 px-3.5 py-2.5 text-[14px]', name.length < 12 && t < 1600 && 'caret')}>{name || <span className="text-subtle">Nome do negócio</span>}</div>
      <div className="flex flex-wrap gap-1.5">
        {['Moderna', 'Elegante', 'Divertida', 'Minimalista'].map((s) => (
          <span key={s} className={cx('rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors', style && s === 'Elegante' ? 'border-[#a78bfa] bg-[#a78bfa26] text-ink' : 'border-line-strong text-muted')}>
            {s}
          </span>
        ))}
      </div>
      <span className={cx('flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-[13.5px] font-bold text-accent-ink transition-transform', press && 'scale-95')}>
        {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Wand2 size={16} />} {loading ? 'Desenhando…' : 'Criar logo'}
      </span>
      <div className="grid grid-cols-3 gap-2">
        {([0, 1, 2] as const).map((v) => (
          <span key={v} className={cx('relative aspect-square overflow-hidden rounded-xl border-2 bg-white/5 transition-all duration-500', picked && v === 1 ? 'border-accent shadow-[0_0_0_3px_#ff8a3d55]' : 'border-transparent')}>
            {loading && <span className="shimmer absolute inset-0" />}
            {done && <LogoArt v={v} className="pop absolute inset-0 h-full w-full" />}
            {picked && v === 1 && <span className="absolute inset-x-1 bottom-1 rounded-md bg-accent py-0.5 text-center text-[10px] font-bold text-accent-ink">Em uso</span>}
          </span>
        ))}
      </div>
      <div className={cx('flex items-center gap-3 transition-all duration-700', applied ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')}>
        <span className="h-12 w-12 overflow-hidden rounded-full border-2 border-[#ff5da2]">
          <LogoArt v={1} className="h-full w-full" />
        </span>
        <span className="flex h-12 w-10 items-end overflow-hidden rounded-md bg-[#f5f5f4] p-1">
          <LogoArt v={1} className="h-8 w-8" />
        </span>
        <span className="text-[12.5px] text-muted">Já aplicada no perfil, nos posts e nos vídeos</span>
      </div>
    </Frame>
  )
}

/* ---------- Copy ---------- */

const COPIES = [
  { tab: 'Legenda', text: 'Chegou a coleção que faltava no seu guarda-roupa ✨ Peças únicas, do P ao GG, com entrega amanhã. Corre que o M já tá acabando! 👉 Chama no direct' },
  { tab: 'Anúncio', text: 'Vai num evento esse mês? Vestido de festa a partir de R$ 89, com troca grátis. Toque em "Enviar mensagem" e escolha o seu hoje.' },
]

export function DemoCopy({ className }: { className?: string }) {
  const HALF = 6500
  const { ref, t } = useLoop(HALF * 2, 5000)
  const k = t < HALF ? 0 : 1
  const local = t % HALF
  const text = typed(COPIES[k].text, local, 600, 55)
  const copied = local > 4800
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3.5 p-4 sm:p-5', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {['Legenda', 'Gancho', 'Anúncio', 'Mensagem de venda'].map((tb) => (
          <span key={tb} className={cx('rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors', COPIES[k].tab === tb ? 'bg-ink text-bg' : 'border border-line-strong text-muted')}>
            {tb}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[12px] text-muted">
        Tom: <span className="rounded-full bg-[#facc1522] px-2 py-0.5 font-semibold text-[#fde68a]">Amigável</span> · Público: mulheres 20–35
      </div>
      <p className={cx('m-0 min-h-[132px] flex-1 rounded-xl border border-line bg-surface p-3.5 text-[14px] leading-relaxed text-soft', text.length < COPIES[k].text.length && 'caret')}>{text}</p>
      <span className={cx('flex items-center gap-1.5 self-end rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition-all', copied ? 'bg-sky text-[#06121f]' : 'border border-line-strong text-muted')}>
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
      </span>
    </Frame>
  )
}

/* ---------- Cortes ---------- */

const CORTES = [
  { n: 6, cap: 'O ERRO QUE TODO MUNDO COMETE' },
  { n: 10, cap: 'NINGUÉM TE CONTA ISSO' },
  { n: 2, cap: 'FAZ ISSO HOJE' },
]

export function DemoCortes({ className }: { className?: string }) {
  const TOTAL = 11000
  const { ref, t } = useLoop(TOTAL, 9000)
  const head = Math.min(100, (t / 3600) * 100)
  const marks = [22, 51, 78].filter((m) => head >= m)
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3 p-4 sm:p-5', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="relative aspect-[16/7] overflow-hidden rounded-xl">
        <LoopVideo src={reel[0].video} poster={reel[0].poster} className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">1:12:40</span>
        <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">Live de 1 hora</span>
      </div>
      <div className="relative h-8 overflow-hidden rounded-lg bg-[repeating-linear-gradient(90deg,#1d2230_0_10px,#232937_10px_20px)]">
        {marks.map((m) => (
          <span key={m} className="pop absolute inset-y-0 rounded bg-accent/70 shadow-[0_0_12px_#ff8a3d]" style={{ left: `${m - 6}%`, width: '9%' }} />
        ))}
        <span className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_#fff]" style={{ left: `${head}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {CORTES.map((c, k) => {
          const show = on(t, 4000 + k * 600)
          return (
            <span key={c.cap} className={cx('relative aspect-[3/4] overflow-hidden rounded-xl border border-line-strong transition-all duration-500 [transition-timing-function:var(--ease-spring)]', show ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
              <LoopVideo src={reel[c.n].video} poster={reel[c.n].poster} className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-x-1.5 bottom-[18%] rounded bg-black/75 px-1 py-0.5 text-center text-[9.5px] font-extrabold leading-tight text-white sm:text-[10.5px]">{c.cap}</span>
              <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1.5 text-[9.5px] font-bold text-accent-ink">9:16</span>
            </span>
          )
        })}
      </div>
    </Frame>
  )
}

/* ---------- Imagem (antes e depois) ---------- */

function Bottle({ studio }: { studio: boolean }) {
  return (
    <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={studio ? 'bgS' : 'bgP'} x1="0" y1="0" x2="0" y2="1">
          {studio ? (
            <>
              <stop offset="0" stopColor="#ffb08a" />
              <stop offset="1" stopColor="#ff5da2" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#5b5f66" />
              <stop offset="1" stopColor="#3b3e44" />
            </>
          )}
        </linearGradient>
        <linearGradient id={studio ? 'glS' : 'glP'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={studio ? '#fff6' : '#bbb6'} />
          <stop offset="0.5" stopColor={studio ? '#ffd9c7' : '#9a9a9a'} />
          <stop offset="1" stopColor={studio ? '#fff3' : '#7776'} />
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill={`url(#${studio ? 'bgS' : 'bgP'})`} />
      {studio ? (
        <>
          <circle cx="235" cy="70" r="38" fill="#ffffff33" />
          <circle cx="60" cy="110" r="18" fill="#ffffff22" />
          <ellipse cx="150" cy="250" rx="95" ry="20" fill="#ffffff55" />
          <rect x="55" y="236" width="190" height="64" rx="8" fill="#ffe3d6" />
          <ellipse cx="150" cy="238" rx="70" ry="8" fill="#0002" />
        </>
      ) : (
        <>
          <rect x="0" y="210" width="300" height="90" fill="#6b5a4a" />
          <rect x="190" y="150" width="70" height="66" rx="4" fill="#8a8f96" transform="rotate(-8 225 183)" />
          <circle cx="70" cy="200" r="22" fill="#a39b8e" />
        </>
      )}
      <g transform={studio ? 'translate(0 0)' : 'translate(-6 8) rotate(-4 150 160)'}>
        <rect x="126" y="70" width="48" height="34" rx="6" fill={studio ? '#1f2937' : '#2b2b2b'} />
        <rect x="104" y="100" width="92" height="140" rx="20" fill={`url(#${studio ? 'glS' : 'glP'})`} stroke={studio ? '#fff' : '#999'} strokeOpacity="0.6" strokeWidth="2" />
        <rect x="120" y="150" width="60" height="34" rx="4" fill={studio ? '#ffffffdd' : '#ddd'} />
        <text x="150" y="172" textAnchor="middle" fontFamily="Georgia,serif" fontSize="13" fill="#7a2e4a">
          Aurora
        </text>
        {studio && <rect x="114" y="110" width="10" height="110" rx="5" fill="#ffffff66" />}
      </g>
    </svg>
  )
}

export function DemoImagem({ className }: { className?: string }) {
  const TOTAL = 9500
  const { ref, t } = useLoop(TOTAL, 5000)
  const p = t < 1000 ? 0 : t < 3400 ? ((t - 1000) / 2400) * 100 : t < 7600 ? 100 : Math.max(0, 100 - ((t - 7600) / 1400) * 100)
  const formats = on(t, 3800) && t < 7600
  return (
    <Frame innerRef={ref} className={cx('aspect-square', className)}>
      <Bottle studio={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - p}% 0 0)` }}>
        <Bottle studio />
      </div>
      <span className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_12px_#fff]" style={{ left: `${p}%` }} />
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11.5px] font-bold text-white">Foto do celular</span>
      <span className={cx('absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#7a2e4a] transition-opacity', p > 60 ? 'opacity-100' : 'opacity-0')}>Foto de estúdio com IA</span>
      <div className={cx('absolute inset-x-3 bottom-3 flex justify-center gap-2 transition-all duration-500', formats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')}>
        {['Post 1:1', 'Story 9:16', 'Banner', 'Capa'].map((f, k) => (
          <span key={f} className="pop rounded-lg bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur" style={{ animationDelay: `${k * 90}ms` }}>
            {f}
          </span>
        ))}
      </div>
    </Frame>
  )
}

/* ---------- Calendário ---------- */

const PLAN: Record<number, string> = { 3: 'bg-accent', 5: 'bg-sky', 8: 'bg-accent', 10: 'bg-[#facc15]', 12: 'bg-accent', 15: 'bg-sky', 17: 'bg-accent', 19: 'bg-[#facc15]', 21: 'bg-accent', 24: 'bg-sky', 26: 'bg-accent', 28: 'bg-[#facc15]' }

export function DemoCalendario({ className }: { className?: string }) {
  const TOTAL = 10500
  const { ref, t } = useLoop(TOTAL, 8000)
  const planning = t < 1500
  const shown = Object.keys(PLAN).map(Number).filter((_, k) => on(t, 1500 + k * 220))
  const pop = on(t, 5000)
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3 p-4 sm:p-5', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[15px] font-bold">
          <CalendarDays size={17} className="text-[#9db8ff]" /> Seu mês
        </span>
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#c4b5fd]">
          {planning ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />} {planning ? 'Mentor planejando…' : `${shown.length} posts planejados`}
        </span>
      </div>
      <div className="relative grid grid-cols-7 gap-1">
        {Array.from({ length: 30 }).map((_, k) => {
          const d = k + 1
          const has = shown.includes(d)
          return (
            <span key={d} className={cx('flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] transition-colors', d === 21 && pop ? 'border-accent bg-[#ff8a3d1f] text-ink' : 'border-line bg-bg/40 text-muted')}>
              {d}
              <span className={cx('h-1.5 w-1.5 rounded-full transition-transform duration-300', has ? `${PLAN[d]} scale-100` : 'scale-0')} />
            </span>
          )
        })}
        <div className={cx('absolute bottom-0 left-1/2 flex w-[86%] -translate-x-1/2 flex-col gap-2 rounded-2xl border border-accent-line bg-[#16110d] p-3 shadow-2xl transition-all duration-500 [transition-timing-function:var(--ease-spring)]', pop ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0')}>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-text">Sex, 21 · Reels</span>
          <span className="text-[13px] font-semibold">Historinha: a peça que esgotou em 2 dias</span>
          <span className="self-start rounded-lg bg-accent px-3 py-1.5 text-[12px] font-bold text-accent-ink">Gerar agora</span>
        </div>
      </div>
    </Frame>
  )
}

/* ---------- Anúncios ---------- */

const CAMPS = [
  { c: 'Coleção verão · Reels', roas: '4,1x', v: 'Escalar', tone: 'bg-[#34d39922] text-[#6ee7b7]', icon: Rocket },
  { c: 'Remarketing carrinho', roas: '2,6x', v: 'Manter', tone: 'bg-[#5b8cff22] text-[#9db8ff]', icon: TrendingUp },
  { c: 'Público frio · Stories', roas: '0,7x', v: 'Pausar', tone: 'bg-[#ef444422] text-[#fca5a5]', icon: Pause },
  { c: 'Promoção sexta', roas: '1,4x', v: 'Trocar criativo', tone: 'bg-[#facc1522] text-[#fde68a]', icon: Wand2 },
]

export function DemoAnuncios({ className }: { className?: string }) {
  const TOTAL = 10000
  const { ref, t } = useLoop(TOTAL, 8000)
  const scan = t < 2600 ? (t / 2600) * 100 : -10
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-2.5 p-4 sm:p-5', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[15px] font-bold">
          <ModuleIcon id="anuncios" size="sm" /> Raio-x das campanhas
        </span>
        <span className="text-[12px] text-muted">últimos 7 dias</span>
      </div>
      <div className="relative flex flex-col gap-2">
        {scan >= 0 && <span className="pointer-events-none absolute inset-x-0 z-10 h-10 bg-gradient-to-b from-transparent via-[#38bdf833] to-transparent" style={{ top: `calc(${scan}% - 20px)` }} />}
        {CAMPS.map((r, k) => {
          const v = on(t, 2800 + k * 550)
          return (
            <div key={r.c} className="flex items-center gap-3 rounded-xl border border-line bg-bg/50 px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{r.c}</span>
              <span className="text-[12px] text-muted">ROAS {r.roas}</span>
              <span className={cx('flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold transition-all duration-300 [transition-timing-function:var(--ease-spring)]', r.tone, v ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}>
                <r.icon size={12} /> {r.v}
              </span>
            </div>
          )
        })}
      </div>
      <p className={cx('m-0 rounded-xl border border-[#34d39940] bg-[#34d39912] px-3 py-2 text-[12.5px] text-[#a7f3d0] transition-all duration-500', on(t, 5400) ? 'opacity-100' : 'opacity-0')}>
        Pausando 1 campanha e escalando a melhor, você economiza uns R$ 290 por semana.
      </p>
    </Frame>
  )
}
