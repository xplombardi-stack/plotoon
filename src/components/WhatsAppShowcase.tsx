// Atendente WhatsApp na vitrine: conversa animada de verdade (áudio, conta, taxa do bairro)
// e a comparação com o robô de menu "digite 1, 2 ou 3".
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bell, Check, CheckCheck, Ear, GraduationCap, Hand, MessageCircle, Mic, Play, Receipt, ShieldCheck, X } from 'lucide-react'
import { on, typed, useLoop } from './StepDemos'
import { cx } from './ui'

type Linha = { who: 'cliente' | 'ia'; at: number; text?: string; audio?: { dur: string; fala: string; ouviu: number } }

type Roteiro = { nome: string; emoji: string; fim: string; linhas: Linha[] }
// três ramos diferentes, um por volta: mostra que serve pra qualquer negócio
const ROTEIROS: Roteiro[] = [
  {
    nome: 'Use Mila',
    emoji: '👗',
    fim: 'Pedido pronto · te avisou',
    linhas: [
      { who: 'cliente', at: 400, text: 'oi! a jaqueta jeans ainda tem no M?' },
      { who: 'ia', at: 2600, text: 'Oi! Tem sim, é a última no M 🙌' },
      { who: 'ia', at: 3900, text: 'Ela sai R$ 189,90 e o frete pra sua cidade fica R$ 18.' },
      { who: 'cliente', at: 6200, audio: { dur: '0:05', fala: 'quero sim, pode mandar pro meu endereço de sempre que eu pago no pix', ouviu: 7300 } },
      { who: 'ia', at: 9700, text: 'Perfeito! Jaqueta jeans M + frete: R$ 207,90.' },
      { who: 'ia', at: 11200, text: 'Vou separar a sua e já te mando a chave do Pix 😉' },
      { who: 'cliente', at: 14200, text: 'fechou, obrigada!' },
      { who: 'ia', at: 16500, text: 'Eu que agradeço! Separei aqui pra você ✅' },
      { who: 'ia', at: 17800, text: 'Só um minuto que já te mando a chave.' },
    ],
  },
  {
    nome: 'Tráfego do Zero',
    emoji: '🎓',
    fim: 'Link de compra enviado',
    linhas: [
      { who: 'cliente', at: 400, text: 'vi seu anúncio. o curso serve pra quem nunca anunciou?' },
      { who: 'ia', at: 2600, text: 'Serve sim! Ele começa do zero, da conta de anúncio até a primeira venda 🚀' },
      { who: 'ia', at: 3900, text: 'São 42 aulas, acesso por 1 ano e suporte no grupo.' },
      { who: 'cliente', at: 6200, audio: { dur: '0:06', fala: 'e se eu não gostar? dá pra parcelar no cartão?', ouviu: 7300 } },
      { who: 'ia', at: 9700, text: 'Tem 7 dias de garantia: não curtiu, devolvemos tudo.' },
      { who: 'ia', at: 11200, text: 'E dá pra fazer em 12x de R$ 49,70 no cartão. Quer o link?' },
      { who: 'cliente', at: 14200, text: 'quero!' },
      { who: 'ia', at: 16500, text: 'Aqui está: pay.trafegodozero.com/curso ✅' },
      { who: 'ia', at: 17800, text: 'Assim que comprar, o acesso chega no seu e-mail.' },
    ],
  },
  {
    nome: 'Barbearia Navalha',
    emoji: '💈',
    fim: 'Horário marcado na agenda',
    linhas: [
      { who: 'cliente', at: 400, text: 'fala! tem horário amanhã pra corte e barba?' },
      { who: 'ia', at: 2600, text: 'Fala! Tem sim 😎' },
      { who: 'ia', at: 3900, text: 'Amanhã tenho 10h, 14h30 e 17h. Corte + barba sai R$ 70.' },
      { who: 'cliente', at: 6200, audio: { dur: '0:04', fala: 'pode ser às cinco da tarde, meu nome é Rafael', ouviu: 7300 } },
      { who: 'ia', at: 9700, text: 'Fechado, Rafael! Amanhã às 17h, corte + barba.' },
      { who: 'ia', at: 11200, text: 'Já deixei reservado. Se precisar remarcar é só chamar.' },
      { who: 'cliente', at: 14200, text: 'valeu, até amanhã' },
      { who: 'ia', at: 16500, text: 'Até amanhã! 💈' },
      { who: 'ia', at: 17800, text: 'Te mando um lembrete umas horas antes.' },
    ],
  },
  {
    nome: 'Forno da Vila',
    emoji: '🍕',
    fim: 'Pedido pronto · te avisou',
    linhas: [
      { who: 'cliente', at: 400, text: 'boa noite! vcs entregam no jardim américa?' },
      { who: 'ia', at: 2600, text: 'Boa noite! Entregamos sim 😊' },
      { who: 'ia', at: 3900, text: 'Pro Jardim América a taxa é R$ 8 e chega em uns 50 min.' },
      { who: 'cliente', at: 6200, audio: { dur: '0:06', fala: 'quero uma grande meio calabresa meio quatro queijos com borda de catupiry', ouviu: 7300 } },
      { who: 'ia', at: 9700, text: 'Anotado! Grande meio calabresa, meio quatro queijos, borda de catupiry.' },
      { who: 'ia', at: 11200, text: 'Fica R$ 69,90 + R$ 8 da entrega = R$ 77,90. Quer um refri 2L junto?' },
      { who: 'cliente', at: 14200, text: 'manda uma coca. pago no pix' },
      { who: 'ia', at: 16500, text: 'Fechou! Total de R$ 91,90 no Pix.' },
      { who: 'ia', at: 17800, text: 'Vou verificar aqui e já te mando a chave, só um minuto 🙏' },
    ],
  },
]
const DIGITANDO: Array<[number, number]> = [
  [1300, 2600],
  [8200, 9700],
  [15200, 16500],
]

function Onda({ tocando }: { tocando: boolean }) {
  const barras = [5, 9, 14, 8, 12, 17, 10, 6, 13, 16, 9, 12, 7, 15, 10, 6, 11, 8, 13, 5]
  return (
    <span className="flex h-6 items-center gap-[2px]">
      {barras.map((h, i) => (
        <span key={i} className={cx('w-[2.5px] rounded-full bg-[#8fa3ad]', tocando && 'animate-pulse')} style={{ height: h, animationDelay: `${i * 60}ms` }} />
      ))}
    </span>
  )
}

/* ---------- a conversa no celular ---------- */
export function DemoAtendente({ className, compact }: { className?: string; compact?: boolean }) {
  const TOTAL = 23000
  const { ref, t } = useLoop(TOTAL, 20500)
  const [idx, setIdx] = useState(0)
  const antes = useRef(0)
  useEffect(() => {
    if (t < antes.current) setIdx((i) => (i + 1) % ROTEIROS.length)
    antes.current = t
  }, [t])
  const R = ROTEIROS[idx]
  const CONVERSA = R.linhas
  const digitando = DIGITANDO.some(([a, b]) => t > a && t < b)
  const ouviu = on(t, 7400) && t < 12500
  const avisou = on(t, 19000)
  const fade = t > TOTAL - 600 ? Math.max(0, (TOTAL - t) / 600) : 1

  return (
    <div ref={ref} aria-hidden className={cx('relative mx-auto w-full max-w-[340px]', className)} style={{ opacity: fade }}>
      <div className="relative overflow-hidden rounded-[40px] border-[7px] border-[#1f2430] bg-[#0b141a] shadow-[0_40px_90px_-30px_#000]">
        <div className="flex items-center gap-2.5 bg-[#1f2c33] px-4 pb-2.5 pt-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2a3942] text-[17px]">{R.emoji}</span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[14px] font-bold text-white">{R.nome}</span>
            <span className="text-[11.5px] text-[#8fd1a0]">{digitando ? 'digitando…' : 'online'}</span>
          </span>
        </div>
        <div className={cx('flex flex-col justify-end gap-1.5 overflow-hidden', compact ? 'h-[330px]' : 'h-[430px]', ' bg-[#0b141a] bg-[radial-gradient(circle_at_20%_20%,#ffffff08_1px,transparent_1px)] bg-[length:18px_18px] p-3')}>
          {CONVERSA.filter((m) => on(t, m.at)).map((m) => {
            if (m.audio) {
              const transcrito = on(t, m.audio.ouviu)
              return (
                <div key={m.at} className="pop flex max-w-[86%] flex-col gap-1.5 self-start rounded-xl rounded-tl-sm bg-[#202c33] px-2.5 py-2">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
                      <Play size={14} fill="currentColor" />
                    </span>
                    <Onda tocando={!transcrito} />
                    <span className="text-[11px] text-[#8696a0]">{m.audio.dur}</span>
                  </span>
                  {transcrito && <span className="pop border-t border-white/5 pt-1.5 text-[12px] italic leading-snug text-[#b9c6cc]">"{m.audio.fala}"</span>}
                </div>
              )
            }
            const texto = m.who === 'ia' ? typed(m.text!, t, m.at, 52) : m.text!
            return (
              <div key={m.at} className={cx('pop max-w-[84%] rounded-xl px-3 py-[7px] text-[13.5px] leading-snug text-white', m.who === 'cliente' ? 'self-start rounded-tl-sm bg-[#202c33]' : 'self-end rounded-tr-sm bg-[#005c4b]')}>
                {texto}
                {m.who === 'ia' && texto.length === m.text!.length && <CheckCheck size={14} className="ml-1 inline text-[#53bdeb]" />}
              </div>
            )
          })}
          {digitando && (
            <span className="self-end rounded-xl bg-[#005c4b] px-3 py-2.5 text-white">
              <span className="inline-flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 bg-[#1f2c33] px-3 py-2.5">
          <span className="flex-1 rounded-full bg-[#2a3942] px-3.5 py-2 text-[12.5px] text-[#8696a0]">Mensagem</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white">
            <Mic size={16} />
          </span>
        </div>
      </div>
      <div className={cx('absolute -left-3 top-[44%] flex items-center gap-2 rounded-xl border border-[#38bdf866] bg-[#0b1620] px-3 py-2 text-[12.5px] font-bold text-[#7dd3fc] shadow-xl transition-all duration-500 [transition-timing-function:var(--ease-spring)] sm:-left-14', ouviu ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
        <Ear size={16} /> Ouviu o áudio
      </div>
      <div className={cx('absolute -right-3 bottom-20 flex items-center gap-2 rounded-xl border border-[#34d39966] bg-[#0c1a14] px-3 py-2 text-[12.5px] font-bold text-[#6ee7b7] shadow-xl transition-all duration-500 [transition-timing-function:var(--ease-spring)] sm:-right-12', avisou ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
        <Bell size={16} /> {R.fim}
      </div>
    </div>
  )
}

/* ---------- robô de menu x atendente que conversa ---------- */
function Bolha({ de, children, ruim }: { de: 'cliente' | 'bot'; children: ReactNode; ruim?: boolean }) {
  return (
    <div className={cx('max-w-[88%] whitespace-pre-line rounded-xl px-3 py-2 text-[13.5px] leading-snug', de === 'cliente' ? 'self-end rounded-tr-sm bg-[#005c4b] text-white' : ruim ? 'self-start rounded-tl-sm bg-[#262a31] font-mono text-[12.5px] text-[#c3c8d0]' : 'self-start rounded-tl-sm bg-[#202c33] text-white')}>
      {children}
    </div>
  )
}

export function RoboVsAtendente({ className }: { className?: string }) {
  return (
    <div className={cx('grid gap-4 md:grid-cols-2', className)}>
      <div className="flex flex-col gap-3 rounded-[24px] border border-line bg-[#101217] p-4 sm:p-5">
        <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[#f87171]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f8717122]">
            <X size={14} strokeWidth={3} />
          </span>
          Robô de menu comum
        </span>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-[#0b0d11] p-3 opacity-90">
          <Bolha de="bot" ruim>{'Olá! Bem-vindo(a) à Pizzaria.\nDigite o número da opção:\n1 - Cardápio\n2 - Fazer pedido\n3 - Falar com atendente'}</Bolha>
          <Bolha de="cliente">quanto ta a calabresa?</Bolha>
          <Bolha de="bot" ruim>{'Opção inválida.\nDigite 1, 2 ou 3.'}</Bolha>
          <Bolha de="cliente">🙄 deixa</Bolha>
        </div>
        <p className="m-0 text-[13.5px] text-muted">Responde seco, não entende o que o cliente escreve e faz ele desistir.</p>
      </div>
      <div className="neon-border flex flex-col gap-3 rounded-[24px] bg-[#0f1713] p-4 sm:p-5">
        <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[#6ee7b7]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#34d39922]">
            <Check size={14} strokeWidth={3} />
          </span>
          Atendente do Plotoon
        </span>
        <div className="flex flex-col gap-1.5 rounded-2xl bg-[#0b141a] p-3">
          <Bolha de="cliente">quanto ta a calabresa?</Bolha>
          <Bolha de="bot">A grande sai R$ 52,90 🍕</Bolha>
          <Bolha de="bot">Vai querer inteira ou meio a meio com outro sabor?</Bolha>
          <Bolha de="cliente">meio 4 queijos! entrega no centro?</Bolha>
          <Bolha de="bot">Entrega sim, a taxa pro Centro é R$ 5 e chega em uns 35 min 😉</Bolha>
        </div>
        <p className="m-0 text-[13.5px] text-soft">Entende o que a pessoa escreveu do jeito dela, responde como gente e já conduz pra venda.</p>
      </div>
    </div>
  )
}

export const DIFERENCIAIS = [
  { icon: MessageCircle, t: 'Conversa como gente', d: 'Mensagens curtas, "digitando…" e espera o cliente terminar de escrever. Sem menu de números.' },
  { icon: Ear, t: 'Ouve áudio e vê foto', d: 'O cliente manda áudio ou print e ele entende e responde na hora.' },
  { icon: Receipt, t: 'Fecha a conta certa', d: 'Soma o pedido com a taxa de entrega do bairro do cliente.' },
  { icon: ShieldCheck, t: 'Não inventa preço', d: 'Só usa o que você ensinou. Pode mandar até foto do cardápio.' },
  { icon: Hand, t: 'Você assume quando quiser', d: 'Quando precisa de você, ele diz "só um minuto" e te avisa.' },
  { icon: GraduationCap, t: 'Aprende com você', d: 'Não gostou de uma resposta? Corrige uma vez e ele aprende.' },
]

export function Diferenciais({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <ul className={cx('m-0 grid list-none gap-3 p-0', compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3', className)}>
      {DIFERENCIAIS.map((x) => (
        <li key={x.t} className={cx('flex items-start gap-3', !compact && 'rounded-[18px] border border-line bg-surface p-4')}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#34d39918] text-[#6ee7b7]">
            <x.icon size={18} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-bold text-ink">{x.t}</span>
            {!compact && <span className="text-[13.5px] leading-snug text-muted">{x.d}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

