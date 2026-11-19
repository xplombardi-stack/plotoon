// Diretor (simulado). Depois isso vira a chamada pro Claude no servidor.
import type { Backdrop } from '../components/art'
import { SECONDS_PER_PART } from './pricing'

export type Tone = 'motivacional' | 'engracado' | 'emocionante'

export const tones: Array<{ id: Tone; label: string }> = [
  { id: 'motivacional', label: 'Motivacional' },
  { id: 'engracado', label: 'Engraçado' },
  { id: 'emocionante', label: 'Emocionante' },
]

export type PartStatus = 'rascunho' | 'gerando' | 'pronta'

export type Part = {
  num: number
  beat: string
  scene: string
  fala: string
  prompt: string
  backdrop: Backdrop
  status: PartStatus
}

const beatsByCount: Record<number, string[]> = {
  1: ['História'],
  2: ['Gancho', 'Final'],
  3: ['Gancho', 'Virada', 'Final'],
  4: ['Gancho', 'Problema', 'Virada', 'Final'],
  5: ['Gancho', 'Problema', 'Virada', 'Conquista', 'Final'],
  6: ['Gancho', 'Problema', 'Tentativa', 'Virada', 'Conquista', 'Final'],
}

const falas: Record<Tone, Record<string, string>> = {
  motivacional: {
    História: 'Riram do meu sonho. Hoje eles batem palma.',
    Gancho: 'Todo mundo riu quando eu contei meu plano.',
    Problema: 'Eu não tinha dinheiro, nem apoio, nem tempo.',
    Tentativa: 'Mesmo assim, eu tentei todo santo dia.',
    Virada: 'Até que um dia, tudo começou a mudar.',
    Conquista: 'E hoje, olha onde eu cheguei.',
    Final: 'Quem riu, hoje pergunta como eu fiz.',
  },
  engracado: {
    História: 'Eu tinha um plano perfeito. Spoiler: quase deu certo.',
    Gancho: 'Eu tinha um plano perfeito. Spoiler: não era.',
    Problema: 'Deu tudo errado, do jeito mais ridículo possível.',
    Tentativa: 'Tentei de novo. Errei de novo. Mas rindo.',
    Virada: 'Aí eu tive a ideia mais genial da minha vida.',
    Conquista: 'E não é que deu certo?',
    Final: 'Moral da história: nunca duvide de um teimoso.',
  },
  emocionante: {
    História: 'Teve um dia em que eu quase desisti. Que bom que eu não desisti.',
    Gancho: 'Essa é a história que eu nunca contei.',
    Problema: 'Teve um dia em que eu quase desisti de tudo.',
    Tentativa: 'Mas eu lembrei de quem acreditava em mim.',
    Virada: 'E foi ali que tudo mudou.',
    Conquista: 'Hoje eu consigo olhar pra trás e sorrir.',
    Final: 'Se você está no começo, não desiste.',
  },
}

const backdropByBeat: Record<string, Backdrop> = {
  História: 'loja',
  Gancho: 'noite',
  Problema: 'quarto',
  Tentativa: 'escritorio',
  Virada: 'loja',
  Conquista: 'rua',
  Final: 'loja',
}

function sceneFor(beat: string, idea: string, p: string, s?: string) {
  switch (beat) {
    case 'História':
      return `${idea}. ${p} conta tudo numa cena só.`
    case 'Gancho':
      return `Abertura forte: ${p} olha pra câmera. Contexto: ${idea}.`
    case 'Problema':
      return `${p} enfrenta a maior dificuldade da história.${s ? ` ${s} aparece duvidando.` : ''}`
    case 'Tentativa':
      return `${p} insiste, mostrando o esforço do dia a dia.`
    case 'Virada':
      return `O momento em que tudo muda pra ${p}. Clima de surpresa.`
    case 'Conquista':
      return `${p} comemora a conquista${s ? ` ao lado de ${s}` : ''}.`
    default:
      return `${p} fecha a história olhando pra câmera, com confiança.`
  }
}

export function titleFromIdea(idea: string) {
  const clean = idea.trim().replace(/\s+/g, ' ').replace(/[.!?]+$/, '')
  if (!clean) return 'Nova historinha'
  const words = clean.split(' ')
  const short = words.slice(0, 7).join(' ') + (words.length > 7 ? '…' : '')
  return short.charAt(0).toUpperCase() + short.slice(1)
}

export function buildPrompt(opts: { styleName: string; names: string[]; num: number; beat: string; scene: string; fala: string }) {
  return `Animação 3D estilo ${opts.styleName.toLowerCase()}, vertical 9:16, ${SECONDS_PER_PART} segundos. Personagens fixos: ${opts.names.join(', ')} (mesmo rosto e mesma roupa em todas as partes). Parte ${opts.num}, ${opts.beat.toLowerCase()}: ${opts.scene} Fala em português do Brasil: “${opts.fala}”`
}

export function writeScript(opts: { idea: string; tone: Tone; names: string[]; styleName: string; parts: number }): { title: string; parts: Part[] } {
  const beats = beatsByCount[opts.parts] ?? beatsByCount[3]
  const [p = 'O personagem', s] = opts.names
  const parts = beats.map((beat, i) => {
    const scene = sceneFor(beat, opts.idea.trim().replace(/[.!?]+$/, ''), p, s)
    const fala = falas[opts.tone][beat]
    return {
      num: i + 1,
      beat,
      scene,
      fala,
      prompt: buildPrompt({ styleName: opts.styleName, names: opts.names, num: i + 1, beat, scene, fala }),
      backdrop: backdropByBeat[beat] ?? 'noite',
      status: 'rascunho' as const,
    }
  })
  return { title: titleFromIdea(opts.idea), parts }
}
