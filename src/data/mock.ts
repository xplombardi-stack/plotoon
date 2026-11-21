// Conteúdo fixo do site e da prévia. Elenco e vídeos de cada pessoa ficam no store (e depois no Supabase).
import type { Backdrop, ToonLook } from '../components/art'
import { sampleLooks } from '../components/art'

export const tints = {
  warm: 'linear-gradient(170deg, #4a2e1b 0%, #22160f 100%)',
  cool: 'linear-gradient(170deg, #1e3550 0%, #0f1825 100%)',
  gray: 'linear-gradient(170deg, #2b3240 0%, #151922 100%)',
  purple: 'linear-gradient(170deg, #33264a 0%, #17121f 100%)',
  green: 'linear-gradient(170deg, #23392e 0%, #111a15 100%)',
  rose: 'linear-gradient(170deg, #4a2742 0%, #1c111a 100%)',
  photo: 'linear-gradient(170deg, #3a3f4a 0%, #1a1d24 100%)',
} as const

export type Tint = keyof typeof tints

export const ideas = ['Motoboy que virou patrão', 'A primeira venda online', 'O amigo que duvidou', 'Do zero ao primeiro carro']

// Exemplos da página de vendas (ilustrações)
export const examples: Array<{ id: string; title: string; caption: string; backdrop: Backdrop; look: ToonLook }> = [
  { id: 'e1', title: 'O motoboy que virou patrão', caption: 'Hoje a frota é minha', backdrop: 'rua', look: sampleLooks[1] },
  { id: 'e2', title: 'A primeira venda online', caption: 'Plim! Venda aprovada', backdrop: 'quarto', look: sampleLooks[0] },
  { id: 'e3', title: 'O amigo que duvidou', caption: 'Ele riu. Eu insisti.', backdrop: 'noite', look: sampleLooks[2] },
  { id: 'e4', title: 'A loja que lotou', caption: 'Fila na porta', backdrop: 'loja', look: sampleLooks[3] },
  { id: 'e5', title: 'Do estágio ao escritório', caption: 'Minha sala agora', backdrop: 'escritorio', look: sampleLooks[4] },
]

export const modules = [
  { id: 'm1', title: 'Seu primeiro boneco', lessons: 4, tint: 'warm' as Tint },
  { id: 'm2', title: 'Uma ideia que prende', lessons: 5, tint: 'cool' as Tint },
  { id: 'm3', title: 'Partes sem erro', lessons: 6, tint: 'purple' as Tint },
  { id: 'm4', title: 'Montagem e legenda', lessons: 4, tint: 'green' as Tint },
  { id: 'm5', title: 'Postar e crescer', lessons: 5, tint: 'rose' as Tint },
  { id: 'm6', title: 'Vender com historinhas', lessons: 4, tint: 'gray' as Tint },
]

export type PlanInfo = {
  id: 'start' | 'estudio' | 'pro'
  name: string
  tagline: string
  price: string
  credits: string
  features: string[]
  highlight?: boolean
}

export const plans: PlanInfo[] = [
  {
    id: 'start', name: 'Start', tagline: 'Pra começar a postar', price: 'Em breve', credits: 'Créditos todo mês',
    features: ['Todos os estúdios: vídeo, imagem, logo, copy e cortes', 'Mentor de vendas com IA', 'Perfil do negócio e Biblioteca', 'Créditos pra começar a postar'],
  },
  {
    id: 'estudio', name: 'Estúdio', tagline: 'Pra postar toda semana', price: 'Em breve', credits: 'Mais créditos todo mês', highlight: true,
    features: ['Tudo do Start', 'Atendente de WhatsApp com IA', 'Calendário planejado pelo Mentor', 'Mais créditos e todas as aulas'],
  },
  {
    id: 'pro', name: 'Pro', tagline: 'Pra quem posta todo dia', price: 'Em breve', credits: 'Muito mais créditos todo mês',
    features: ['Tudo do Estúdio', 'Raio-x dos anúncios do Meta', 'Muito mais créditos e fila prioritária', 'Suporte no WhatsApp'],
  },
]

// Na prévia, comprar adiciona estes créditos pra você testar
export const creditPacks = [
  { id: 'c1', credits: 100, price: 'Preço em breve' },
  { id: 'c2', credits: 300, price: 'Preço em breve', highlight: true },
  { id: 'c3', credits: 1000, price: 'Preço em breve' },
]
