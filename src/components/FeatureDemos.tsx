// Demonstrações animadas de cada função, usadas na página inicial (só ilustração).
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, CalendarDays, Check, CheckCheck, Copy, FileText, Film, Flame, LoaderCircle, MousePointer2, Palette, Pause, PenTool, Rocket, Send, Sparkles, TrendingUp, Wand2 } from 'lucide-react'
import { ModuleIcon } from './Module'
import { StepIdea, on, typed, useLoop } from './StepDemos'
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

/* ---------- Encaixa uma demo em qualquer espaço (diminui mantendo a proporção) ---------- */

export function Fit({ base = 460, children, className, align = 'center' }: { base?: number; children: ReactNode; className?: string; align?: 'center' | 'top' }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ s: 1, x: 0, y: 0 })
  useEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const measure = () => {
      const w = o.clientWidth
      const h = o.clientHeight
      const ih = i.offsetHeight || 1
      const s = Math.min(w / base, h / ih)
      setBox({ s, x: (w - base * s) / 2, y: align === 'top' ? 0 : Math.max(0, (h - ih * s) / 2) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [base, align])
  return (
    <div aria-hidden className={cx('overflow-hidden', className)}>
      <div ref={outer} className="relative h-full w-full overflow-hidden">
        <div ref={inner} className="absolute left-0 top-0 origin-top-left" style={{ width: base, transform: `translate(${box.x}px, ${box.y}px) scale(${box.s})` }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ---------- Mentor: conversas de verdade, uma atrás da outra ---------- */

type Msg =
  | { at: number; who: 'user' | 'mentor'; text: string }
  | { at: number; who: 'mentor'; kind: 'insta' }
  | { at: number; who: 'mentor'; kind: 'plan'; title: string; items: Array<{ t: string; btn: string; done: string }>; click: number; clickAt: number }

type Story = { len: number; msgs: Msg[] }

const STORIES: Story[] = [
  {
    len: 17500,
    msgs: [
      { at: 2000, who: 'user', text: 'Tô perdida. Vendo bolo de pote e não vende. O que eu faço?' },
      { at: 3300, who: 'mentor', text: 'Bora resolver! Me passa o @ do seu Instagram que eu analiso.' },
      { at: 6000, who: 'user', text: '@doce.da.bia' },
      { at: 6400, who: 'mentor', kind: 'insta' },
      { at: 10600, who: 'mentor', text: 'O bolo é bom, o problema é a vitrine. Seu plano da semana:' },
      {
        at: 12300,
        who: 'mentor',
        kind: 'plan',
        title: 'Plano da semana',
        items: [
          { t: 'Bio nova com chamada pro WhatsApp', btn: 'Criar', done: 'Pronta' },
          { t: 'Foto do bolo com cara de vitrine', btn: 'Gerar', done: 'Abrindo o Estúdio de Imagem' },
          { t: 'Vídeo: do forno até o pote', btn: 'Gerar', done: 'Pronto' },
        ],
        click: 1,
        clickAt: 15000,
      },
    ],
  },
  {
    len: 12500,
    msgs: [
      { at: 1900, who: 'user', text: 'Minhas vendas caíram essa semana. O que eu posto?' },
      { at: 3200, who: 'mentor', text: 'Faz uma historinha com virada: a cliente que duvidou e virou fã. Termina chamando pro WhatsApp.' },
      {
        at: 6400,
        who: 'mentor',
        kind: 'plan',
        title: 'Ideia de vídeo',
        items: [{ t: 'A cliente que duvidou e virou fã', btn: 'Gerar vídeo', done: 'Abrindo o Estúdio de Vídeo com o roteiro pronto' }],
        click: 0,
        clickAt: 9000,
      },
    ],
  },
  {
    len: 15500,
    msgs: [
      { at: 1900, who: 'user', text: 'Abri uma barbearia. Quanto eu cobro no corte?' },
      { at: 3200, who: 'mentor', text: 'Me diz o bairro e se você faz barba também.' },
      { at: 5600, who: 'user', text: 'Centro de Campinas. Faço sim' },
      { at: 6900, who: 'mentor', text: 'Na sua região o corte sai de R$ 35 a R$ 50. Cobra R$ 45 e cria o combo corte + barba por R$ 65: é ali que está o lucro.' },
      {
        at: 10600,
        who: 'mentor',
        kind: 'plan',
        title: 'Próximo passo',
        items: [
          { t: 'Post com a tabela de preços', btn: 'Gerar', done: 'Abrindo o Estúdio de Imagem' },
          { t: 'Mensagem pros clientes antigos', btn: 'Escrever', done: 'Pronta' },
        ],
        click: 0,
        clickAt: 13000,
      },
    ],
  },
]

const INPUT_LEAD = 1500 // a pessoa digita antes de enviar

function InstaScan({ t }: { t: number }) {
  const scan = Math.min(1, t / 2400)
  const found = ['Bio sem chamada pra ação', 'Fotos escuras: o bolo não brilha', 'Nenhum vídeo nos últimos 30 dias']
  return (
    <div className="pop flex flex-col gap-3 rounded-[16px] border border-[#a78bfa55] bg-[#a78bfa10] p-3.5">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#c4b5fd]">
        {scan < 1 ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />} {scan < 1 ? 'Analisando o perfil…' : 'Análise pronta'}
      </span>
      <div className="flex gap-3">
        <div className="relative w-[118px] shrink-0 overflow-hidden rounded-xl border border-line bg-[#0b0d12] p-2">
          <div className="flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#f9a8d4] to-[#fcd34d]" />
            <span className="flex flex-col leading-none">
              <span className="text-[9px] font-bold">doce.da.bia</span>
              <span className="text-[8px] text-muted">312 seguidores</span>
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-0.5">
            {['#4a3b33', '#3d3530', '#57463c', '#3a322e', '#4d4038', '#40362f'].map((c, k) => (
              <span key={k} className="aspect-square rounded-[2px]" style={{ background: c }} />
            ))}
          </div>
          <span className="absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-[#a78bfa66] to-transparent" style={{ top: `${scan * 100 - 10}%`, opacity: scan < 1 ? 1 : 0 }} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {found.map((f, k) => (
            <span key={f} className={cx('flex items-start gap-1.5 text-[12px] leading-snug text-soft transition-all duration-500', t > 1800 + k * 550 ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0')}>
              <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-[#f87171]" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function PlanCard({ m, t }: { m: Extract<Msg, { kind: 'plan' }>; t: number }) {
  const cursorIn = t >= m.clickAt - 1000
  const clicked = t >= m.clickAt
  return (
    <div className="pop flex flex-col gap-2 rounded-[16px] border border-accent-line bg-[#ff8a3d10] p-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-text">{m.title}</span>
      {m.items.map((it, k) => {
        const done = clicked && k === m.click
        return (
          <div key={it.t} className={cx('flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors', done ? 'bg-sky-soft/50' : 'bg-bg/50')} style={{ animation: `pop .45s var(--ease-spring) ${k * 120}ms both` }}>
            <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug">{done ? it.done : it.t}</span>
            {done ? (
              <Check size={16} className="shrink-0 text-sky-text" />
            ) : (
              <span className="relative shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-[11.5px] font-bold text-accent-ink">
                {it.btn}
                {k === m.click && (
                  <MousePointer2 size={20} className="absolute text-white drop-shadow-[0_2px_4px_#000] transition-all duration-700" style={{ left: cursorIn ? '55%' : '170%', top: cursorIn ? '50%' : '190%' }} fill="#111" />
                )}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MentorChat({ story, t }: { story: Story; t: number }) {
  const shown = story.msgs.filter((m) => t >= m.at)
  const pendingUser = story.msgs.find((m) => m.who === 'user' && 'text' in m && t < m.at && t >= m.at - INPUT_LEAD) as Extract<Msg, { text: string }> | undefined
  const thinking = story.msgs.some((m) => m.who === 'mentor' && t < m.at && t >= m.at - 900 && !('kind' in m && m.kind === 'plan'))
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden">
        {shown.map((m) => {
          if ('kind' in m) return m.kind === 'insta' ? <InstaScan key={m.at} t={t - m.at} /> : <PlanCard key={m.at} m={m} t={t} />
          if (m.who === 'user')
            return (
              <p key={m.at} className="pop m-0 max-w-[85%] shrink-0 self-end rounded-[16px] rounded-br-md bg-accent px-3.5 py-2.5 text-[13.5px] font-medium text-accent-ink">
                {m.text}
              </p>
            )
          const txt = typed(m.text, t, m.at, 55)
          return (
            <p key={m.at} className={cx('m-0 max-w-[92%] shrink-0 rounded-[16px] rounded-tl-md border border-line bg-surface px-3.5 py-2.5 text-[13.5px] leading-relaxed text-soft', txt.length < m.text.length && 'caret')}>
              {txt}
            </p>
          )
        })}
        {thinking && (
          <span className="flex shrink-0 items-center gap-2 text-[#c4b5fd]">
            <Sparkles size={15} /> <Typing />
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-[14px] border border-line-strong bg-bg/70 p-1.5 pl-3.5">
        <span className={cx('min-w-0 flex-1 truncate text-[13px]', pendingUser ? 'caret text-ink' : 'text-subtle')}>
          {pendingUser ? typed(pendingUser.text, t, pendingUser.at - INPUT_LEAD, Math.max(20, (pendingUser.text.length / (INPUT_LEAD - 200)) * 1000)) : 'Pergunte ao Mentor…'}
        </span>
        <span className={cx('flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent text-accent-ink transition-transform', pendingUser && t > pendingUser.at - 180 && 'scale-90')}>
          <Send size={15} />
        </span>
      </div>
    </>
  )
}

export function DemoMentor({ className, story }: { className?: string; story?: number }) {
  const list = story === undefined ? STORIES : [STORIES[story]]
  const total = list.reduce((a, s) => a + s.len, 0)
  const { ref, t } = useLoop(total, list[0].len - 1500)
  let acc = 0
  let k = 0
  while (k < list.length - 1 && t >= acc + list[k].len) acc += list[k++].len
  const local = t - acc
  const cur = list[k]
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3 p-4 sm:p-5', className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-line pb-3">
        <ModuleIcon id="mentor" size="sm" />
        <span className="text-[14px] font-bold">Mentor</span>
        {list.length > 1 && (
          <span className="ml-auto flex gap-1">
            {list.map((_, i) => (
              <span key={i} className={cx('h-1.5 rounded-full transition-all', i === k ? 'w-5 bg-[#a78bfa]' : 'w-1.5 bg-line-strong')} />
            ))}
          </span>
        )}
      </div>
      <div key={k} className="flex min-h-0 flex-1 flex-col gap-3" style={{ opacity: fadeOut(local, cur.len) }}>
        <MentorChat story={cur} t={local} />
      </div>
    </Frame>
  )
}

/* ---------- 5 apps viram 1: ícones de app sendo apagados ---------- */

// Ícones de app desenhados por categoria (sem marca de ninguém)
function AppGlyph({ k }: { k: number }) {
  const common = { viewBox: '0 0 56 56', className: 'h-full w-full' }
  switch (k) {
    case 0: // editar vídeo: claquete + linha do tempo
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="#14161c" />
          <path d="M12 14h32v8H12z" fill="#f5f5f4" />
          <path d="M15 14l4 8M23 14l4 8M31 14l4 8M39 14l4 8" stroke="#14161c" strokeWidth="2.5" />
          <rect x="12" y="24" width="32" height="10" rx="2" fill="#2b2f3a" />
          <rect x="12" y="38" width="12" height="5" rx="1.5" fill="#22d3ee" />
          <rect x="26" y="38" width="9" height="5" rx="1.5" fill="#f472b6" />
          <rect x="37" y="38" width="7" height="5" rx="1.5" fill="#facc15" />
          <path d="M30 26v14" stroke="#fff" strokeWidth="1.5" />
        </svg>
      )
    case 1: // arte: camadas + pincel
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="url(#g-arte)" />
          <defs>
            <linearGradient id="g-arte" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7c3aed" />
              <stop offset="1" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <rect x="12" y="20" width="22" height="22" rx="4" fill="#ffffff40" />
          <rect x="17" y="15" width="22" height="22" rx="4" fill="#ffffff70" />
          <rect x="22" y="10" width="22" height="22" rx="4" fill="#fff" />
          <circle cx="28" cy="18" r="3" fill="#f472b6" />
          <circle cx="36" cy="18" r="3" fill="#facc15" />
          <circle cx="32" cy="25" r="3" fill="#22d3ee" />
          <path d="M36 46l8-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 2: // editor de texto: folha com linhas
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="#2563eb" />
          <path d="M16 10h18l8 8v28H16z" fill="#fff" />
          <path d="M34 10v8h8" fill="#bfdbfe" />
          <text x="20" y="28" fontFamily="Georgia,serif" fontSize="10" fontWeight="700" fill="#1e3a8a">Aa</text>
          <path d="M20 33h18M20 37h18M20 41h12" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 3: // vários chats de IA: janelas empilhadas + balão com brilho de IA
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="#18181b" />
          <rect x="14" y="8" width="30" height="20" rx="5" fill="#3f3f46" />
          <rect x="10" y="13" width="32" height="22" rx="5" fill="#52525b" />
          <path d="M9 19h34a4 4 0 0 1 4 4v15a4 4 0 0 1-4 4H21l-8 6v-6H9a4 4 0 0 1-4-4V23a4 4 0 0 1 4-4z" fill="#fafafa" />
          <path d="M26 24l2.2 5.3L33.5 31.5l-5.3 2.2L26 39l-2.2-5.3-5.3-2.2 5.3-2.2z" fill="#a78bfa" />
          <path d="M37 25l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#f472b6" />
          <circle cx="46" cy="11" r="8" fill="#ef4444" />
          <text x="46" y="14" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="8.5" fill="#fff">30</text>
        </svg>
      )
    case 4: // planilha: grade verde
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="#15803d" />
          <rect x="11" y="12" width="34" height="32" rx="3" fill="#fff" />
          <rect x="11" y="12" width="34" height="8" rx="3" fill="#bbf7d0" />
          <path d="M22 12v32M33 12v32M11 28h34M11 36h34" stroke="#16a34a" strokeWidth="1.5" />
        </svg>
      )
    case 5: // gerenciador de anúncios: gráfico + megafone
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="#1e3a8a" />
          <rect x="11" y="30" width="6" height="14" rx="1.5" fill="#93c5fd" />
          <rect x="20" y="24" width="6" height="20" rx="1.5" fill="#60a5fa" />
          <rect x="29" y="18" width="6" height="26" rx="1.5" fill="#3b82f6" />
          <path d="M36 14l9-4v16l-9-4z" fill="#facc15" />
          <rect x="33" y="14" width="4" height="8" rx="1" fill="#fde68a" />
        </svg>
      )
    case 6: // atender no braço: celular cheio de notificação
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="#334155" />
          <rect x="17" y="8" width="22" height="40" rx="5" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
          <rect x="21" y="16" width="12" height="5" rx="2.5" fill="#e2e8f0" />
          <rect x="23" y="24" width="12" height="5" rx="2.5" fill="#86efac" />
          <rect x="21" y="32" width="10" height="5" rx="2.5" fill="#e2e8f0" />
          <circle cx="40" cy="12" r="8" fill="#ef4444" />
          <text x="40" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="7.5" fill="#fff">99+</text>
        </svg>
      )
    default: // site de criar logo: formas + caneta
      return (
        <svg {...common}>
          <rect width="56" height="56" rx="14" fill="url(#g-logo)" />
          <defs>
            <linearGradient id="g-logo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#db2777" />
              <stop offset="1" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="22" r="8" fill="#fff" />
          <path d="M30 30l8-14 8 14z" fill="#ffffffb0" />
          <rect x="12" y="34" width="14" height="10" rx="2" fill="#ffffff80" />
          <path d="M44 34l-12 12-4 1 1-4 12-12z" fill="#fff" />
        </svg>
      )
  }
}

const APPS = ['App de editar vídeo', 'App de arte', 'Editor de texto', 'Vários chats de IA', 'Planilha de posts', 'Gerenciador de anúncios', 'Atender no WhatsApp na mão', 'Site de criar logo']

export function DemoChaos({ className }: { className?: string }) {
  const TOTAL = 10500
  const { ref, t } = useLoop(TOTAL, 8500)
  const step = 520
  const gone = (k: number) => t > 900 + k * step + 380
  const erasing = (k: number) => t > 900 + k * step && !gone(k)
  const merged = on(t, 900 + APPS.length * step + 300)
  return (
    <div ref={ref} aria-hidden className={cx('relative flex flex-col items-center', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="grid grid-cols-4 gap-4 sm:grid-cols-8 sm:gap-5">
        {APPS.map((name, k) => (
          <div key={name} className={cx('flex w-[76px] flex-col items-center gap-2 transition-all duration-500', gone(k) && 'translate-y-6 scale-50 opacity-0 blur-sm')}>
            <span className="relative h-[60px] w-[60px] overflow-hidden rounded-[16px] shadow-[0_10px_24px_-10px_#000]">
              <AppGlyph k={k} />
              {erasing(k) && <span className="eraser absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/90 to-transparent" />}
            </span>
            <span className="text-center text-[11.5px] font-semibold leading-tight text-muted">{name}</span>
          </div>
        ))}
      </div>
      <div className={cx('absolute inset-0 m-auto flex h-fit w-fit flex-col items-center gap-3 rounded-[22px] border border-accent-line bg-[#1a120c] px-6 py-4 shadow-[0_20px_60px_-20px_#ff8a3d66] transition-all duration-700 [transition-timing-function:var(--ease-spring)]', merged ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0')}>
        <span className="flex items-center gap-2 text-[16px] font-bold">
          <BadgeCheck size={20} className="text-accent" /> Tudo isso dentro do Plotoon
        </span>
        <span className="flex gap-1.5">
          {HUB.map((id, k) => (
            <span key={id} style={{ animation: merged ? `pop .45s var(--ease-spring) ${k * 70}ms both` : undefined }}>
              <ModuleIcon id={id} size="sm" />
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

/* ---------- Topo: o app mostrando cada função acontecendo ---------- */

const HUB: ModuleId[] = ['mentor', 'estudio-video', 'estudio-imagem', 'cortes', 'copy', 'whatsapp', 'calendario', 'anuncios']
const HUB_MS: Record<string, number> = { mentor: 17500, 'estudio-video': 12500, 'estudio-imagem': 9500, cortes: 11000, copy: 6500, whatsapp: 13500, calendario: 10500, anuncios: 10000 }

// A demo de cada módulo, do tamanho que precisar
export function ModuleDemo({ id, className, base }: { id: ModuleId; className?: string; base?: number }) {
  const demo =
    id === 'mentor' ? (
      <DemoMentor story={0} className="h-[430px]" />
    ) : id === 'estudio-video' ? (
      <StepIdea className="aspect-[4/3.3] w-full overflow-hidden rounded-[24px] border border-line-strong" />
    ) : id === 'estudio-imagem' ? (
      <DemoImagem className="w-full" />
    ) : id === 'cortes' ? (
      <DemoCortes className="w-full" />
    ) : id === 'copy' ? (
      <DemoCopy className="w-full" />
    ) : id === 'whatsapp' ? (
      <DemoWhatsApp className="py-2" />
    ) : id === 'calendario' ? (
      <DemoCalendario className="w-full" />
    ) : id === 'anuncios' ? (
      <DemoAnuncios className="w-full" />
    ) : id === 'biblioteca' ? (
      <DemoBiblioteca className="w-full" />
    ) : (
      <DemoLogo className="w-full" />
    )
  return (
    <Fit base={base ?? 460} className={className}>
      {demo}
    </Fit>
  )
}

export function DemoHub({ className }: { className?: string }) {
  const [i, setI] = useState(0)
  const [started, setStarted] = useState(0)
  const [now, setNow] = useState(0)
  const id = HUB[i]
  const dur = HUB_MS[id]
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const begin = performance.now()
    setStarted(begin)
    const tick = window.setInterval(() => setNow(performance.now()), 100)
    const next = window.setTimeout(() => setI((x) => (x + 1) % HUB.length), dur)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(next)
    }
  }, [i, dur])
  const progress = started ? Math.min(1, (now - started) / dur) : 0
  return (
    <div className={cx('relative flex flex-col overflow-hidden rounded-[24px] border border-line-strong bg-[#0d1017] shadow-[0_30px_80px_-30px_#000]', className)}>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 truncate rounded-md bg-surface px-3 py-1 text-[11px] text-subtle">plotoon · {MODULES[id].name}</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[50px] shrink-0 flex-col items-center justify-center gap-1 border-r border-line bg-side py-2 sm:w-[60px]">
          {HUB.map((m, k) => (
            <button
              key={m}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Ver ${MODULES[m].name}`}
              aria-pressed={k === i}
              className={cx('relative cursor-pointer rounded-[12px] p-0.5 transition-all duration-500', k === i ? 'scale-110 bg-[#ff8a3d26] shadow-[0_0_0_1px_#ff8a3d66]' : 'opacity-50 hover:opacity-90')}
            >
              <ModuleIcon id={m} size="sm" />
              {k === i && (
                <svg viewBox="0 0 36 36" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="17" fill="none" stroke="#ff8a3d" strokeWidth="1.5" strokeDasharray={`${progress * 107} 107`} />
                </svg>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div key={`t-${id}`} className="rise flex shrink-0 flex-col gap-0.5 px-4 pb-1 pt-3 sm:px-5">
            <span className="font-display text-[18px] font-extrabold leading-tight sm:text-[21px]">{MODULES[id].name}</span>
            <span className="truncate text-[12.5px] text-muted sm:text-[13px]">{MODULES[id].phrase}</span>
          </div>
          <div key={id} className="pop min-h-0 flex-1 p-3 sm:p-4">
            <ModuleDemo id={id} className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Biblioteca: tudo chegando no mesmo lugar ---------- */

export function DemoBiblioteca({ className }: { className?: string }) {
  const TOTAL = 8000
  const { ref, t } = useLoop(TOTAL, 6000)
  const items: Array<{ k: string; tone: string; icon: typeof Film }> = [
    { k: 'Vídeo', tone: 'from-[#ff8a3d] to-[#ff5da2]', icon: Film },
    { k: 'Logo', tone: 'from-[#a78bfa] to-[#5b8cff]', icon: PenTool },
    { k: 'Imagem', tone: 'from-[#38bdf8] to-[#5b8cff]', icon: Palette },
    { k: 'Copy', tone: 'from-[#facc15] to-[#ff8a3d]', icon: FileText },
    { k: 'Corte', tone: 'from-[#f472b6] to-[#ff5d5d]', icon: Film },
    { k: 'Personagem', tone: 'from-[#34d399] to-[#10b981]', icon: Sparkles },
  ]
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3 p-4', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <span className="flex items-center gap-2 text-[14px] font-bold">
        <ModuleIcon id="biblioteca" size="sm" /> Biblioteca
      </span>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((it, k) => (
          <span key={it.k} className={cx('relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br p-2 transition-all duration-500 [transition-timing-function:var(--ease-spring)]', it.tone, on(t, 300 + k * 450) ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
            <it.icon size={26} className="absolute inset-0 m-auto text-white/80" />
            <span className="relative rounded-md bg-black/45 px-1.5 py-0.5 text-[10.5px] font-bold text-white">{it.k}</span>
          </span>
        ))}
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

/* ---------- Cortes: uma live de podcast virando vídeos verticais ---------- */

// Cenário de podcast desenhado; "foco" escolhe o enquadramento (vídeo inteiro ou um corte vertical)
function Podcast({ t, focus = 'full' }: { t: number; focus?: 'full' | 'esq' | 'dir' | 'meio' }) {
  const vb = focus === 'full' ? '0 0 320 180' : focus === 'esq' ? '20 0 101 180' : focus === 'dir' ? '196 0 101 180' : '110 0 101 180'
  const talkL = Math.sin(t / 140) > 0
  const talkR = Math.sin(t / 170 + 2) > 0.3
  const bars = Array.from({ length: 18 }, (_, k) => 4 + Math.abs(Math.sin(t / 120 + k)) * 14)
  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="pc-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b1530" />
          <stop offset="1" stopColor="#0d1324" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#pc-bg)" />
      <rect x="120" y="22" width="80" height="22" rx="6" fill="#ff5da2" opacity="0.9" />
      <text x="160" y="37" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="10" fill="#fff">
        PODCAST
      </text>
      {bars.map((h, k) => (
        <rect key={k} x={124 + k * 4.2} y={78 - h / 2} width="2.4" height={h} rx="1.2" fill="#a78bfa" opacity="0.8" />
      ))}
      <rect x="0" y="140" width="320" height="40" fill="#2a2140" />
      {/* pessoa da esquerda */}
      <circle cx="70" cy="78" r="20" fill="#e8b48f" />
      <path d="M50 70 Q70 46 90 70 L90 64 Q70 52 50 64 Z" fill="#2b1d14" />
      <ellipse cx="70" cy="90" rx="6" ry={talkL ? 3.5 : 1.2} fill="#7a2e3a" />
      <rect x="44" y="100" width="52" height="46" rx="16" fill="#ff8a3d" />
      <rect x="92" y="96" width="5" height="34" rx="2.5" fill="#222" />
      <circle cx="94" cy="94" r="6" fill="#444" />
      {/* pessoa da direita */}
      <circle cx="250" cy="78" r="20" fill="#9a6a4f" />
      <path d="M229 76 Q230 50 250 54 Q272 50 271 76 Q266 58 250 60 Q234 58 229 76 Z" fill="#111" />
      <ellipse cx="250" cy="90" rx="6" ry={talkR ? 3.5 : 1.2} fill="#5a2230" />
      <rect x="224" y="100" width="52" height="46" rx="16" fill="#5b8cff" />
      <rect x="223" y="96" width="5" height="34" rx="2.5" fill="#222" />
      <circle cx="226" cy="94" r="6" fill="#444" />
      <rect x="130" y="128" width="60" height="16" rx="3" fill="#3a2e55" />
    </svg>
  )
}

const CORTES = [
  { focus: 'esq' as const, cap: 'O ERRO QUE TODO MUNDO COMETE' },
  { focus: 'dir' as const, cap: 'NINGUÉM TE CONTA ISSO' },
  { focus: 'meio' as const, cap: 'FAZ ISSO HOJE' },
]

export function DemoCortes({ className }: { className?: string }) {
  const TOTAL = 11000
  const { ref, t } = useLoop(TOTAL, 9000)
  const head = Math.min(100, (t / 3600) * 100)
  const marks = [22, 51, 78].filter((m) => head >= m)
  const secs = Math.floor(t / 1000) + 2531
  return (
    <Frame innerRef={ref} className={cx('flex flex-col gap-3 p-4 sm:p-5', className)} style={{ opacity: fadeOut(t, TOTAL) }}>
      <div className="relative aspect-[16/8] overflow-hidden rounded-xl">
        <Podcast t={t} />
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-[#ef4444] px-1.5 py-0.5 text-[10.5px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> AO VIVO
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {Math.floor(secs / 3600)}:{String(Math.floor((secs % 3600) / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')} / 1:12:40
        </span>
      </div>
      <div className="relative h-8 overflow-hidden rounded-lg bg-[repeating-linear-gradient(90deg,#1d2230_0_10px,#232937_10px_20px)]">
        {marks.map((m) => (
          <span key={m} className="pop absolute inset-y-0 rounded bg-accent/70 shadow-[0_0_12px_#ff8a3d]" style={{ left: `${m - 6}%`, width: '9%' }} />
        ))}
        <span className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_#fff]" style={{ left: `${head}%` }} />
        {head < 100 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold text-muted">IA procurando os melhores trechos…</span>}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {CORTES.map((c, k) => {
          const show = on(t, 4000 + k * 600)
          return (
            <span key={c.cap} className={cx('relative aspect-[9/14] overflow-hidden rounded-xl border border-line-strong transition-all duration-500 [transition-timing-function:var(--ease-spring)]', show ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
              <Podcast t={t} focus={c.focus} />
              <span className="absolute inset-x-1.5 bottom-[16%] rounded bg-black/75 px-1 py-0.5 text-center text-[9.5px] font-extrabold leading-tight text-white sm:text-[10.5px]">{c.cap}</span>
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
