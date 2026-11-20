// Mapa dos módulos do Estúdio: usado no menu, no cabeçalho de cada tela e nos atalhos.
import type { ComponentType } from 'react'
import { AppWindow, BookOpen, CalendarDays, Clapperboard, Coins, FolderOpen, House, Image, MessageCircle, PenLine, Scissors, Store, TrendingUp } from 'lucide-react'
import { MentorIcon } from '../components/MentorIcon'
import type { Route } from './router'

export type ModuleId =
  | 'inicio'
  | 'mentor'
  | 'estudio-video'
  | 'estudio-imagem'
  | 'cortes'
  | 'copy'
  | 'apps'
  | 'whatsapp'
  | 'calendario'
  | 'anuncios'
  | 'biblioteca'
  | 'aulas'
  | 'meu-negocio'
  | 'planos'

export type ModuleInfo = {
  id: ModuleId
  name: string
  short?: string // nome curto pro menu do celular
  phrase: string
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>
  color: string // cor do ícone (gradiente)
  ready: boolean // a função principal já está ligada?
  match?: Route[] // outras telas que acendem este item no menu
}

export const MODULES: Record<ModuleId, ModuleInfo> = {
  inicio: { id: 'inicio', name: 'Início', phrase: 'Seu painel: créditos, atalhos e o que você criou por último.', icon: House, color: 'from-[#ff8a3d] to-[#ff5da2]', ready: true },
  mentor: { id: 'mentor', name: 'Mentor', phrase: 'Converse sobre vendas, ideias e estratégia. Ele conhece o seu negócio.', icon: MentorIcon, color: 'from-[#a78bfa] to-[#5b8cff]', ready: true },
  'estudio-video': {
    id: 'estudio-video',
    name: 'Estúdio de Vídeo',
    short: 'Vídeo',
    phrase: 'Vídeo do seu produto, historinhas com boneco 3D, criativos e avatar.',
    icon: Clapperboard,
    color: 'from-[#ff8a3d] to-[#ffb547]',
    ready: true,
    match: ['nova-historinha', 'editor', 'videos'],
  },
  'estudio-imagem': { id: 'estudio-imagem', name: 'Estúdio de Imagem', short: 'Imagem', phrase: 'Foto de produto profissional, post, banner e capa.', icon: Image, color: 'from-[#38bdf8] to-[#5b8cff]', ready: true },
  cortes: { id: 'cortes', name: 'Cortes', phrase: 'Suba um vídeo longo e receba cortes verticais com legenda.', icon: Scissors, color: 'from-[#f472b6] to-[#ff5d5d]', ready: false },
  copy: { id: 'copy', name: 'Copy', phrase: 'Legenda, gancho, anúncio e mensagem de venda no tom do seu negócio.', icon: PenLine, color: 'from-[#facc15] to-[#ff8a3d]', ready: true },
  apps: { id: 'apps', name: 'Criador de Apps', short: 'Apps', phrase: 'Crie o app ou site do seu negócio conversando com a IA.', icon: AppWindow, color: 'from-[#22d3ee] to-[#a78bfa]', ready: true },
  whatsapp: { id: 'whatsapp', name: 'Atendente WhatsApp', short: 'WhatsApp', phrase: 'Um atendente com IA respondendo seus clientes e achando quem quer comprar.', icon: MessageCircle, color: 'from-[#34d399] to-[#10b981]', ready: false },
  calendario: { id: 'calendario', name: 'Calendário', phrase: 'O mês planejado pelo Mentor. Cada post sai direto do dia.', icon: CalendarDays, color: 'from-[#5b8cff] to-[#a78bfa]', ready: true },
  anuncios: { id: 'anuncios', name: 'Anúncios', phrase: 'Raio-x das suas campanhas do Meta: o que pausar, escalar ou trocar.', icon: TrendingUp, color: 'from-[#38bdf8] to-[#34d399]', ready: false },
  biblioteca: { id: 'biblioteca', name: 'Biblioteca', phrase: 'Tudo que você gerou, guardado num lugar só.', icon: FolderOpen, color: 'from-[#94a3b8] to-[#64748b]', ready: true },
  aulas: { id: 'aulas', name: 'Aulas', phrase: 'Passo a passo pra criar, postar e vender mais.', icon: BookOpen, color: 'from-[#a78bfa] to-[#f472b6]', ready: false },
  'meu-negocio': {
    id: 'meu-negocio',
    name: 'Meu Negócio',
    phrase: 'O perfil que todos os módulos usam: marca, público, tom e elenco.',
    icon: Store,
    color: 'from-[#ff8a3d] to-[#5b8cff]',
    ready: true,
    match: ['elenco', 'novo-personagem', 'comecar'],
  },
  planos: { id: 'planos', name: 'Créditos e planos', short: 'Créditos', phrase: 'Seu saldo, quanto custa cada coisa e os planos.', icon: Coins, color: 'from-[#ff8a3d] to-[#facc15]', ready: true },
}

// Menu do computador, agrupado
export const NAV_GROUPS: Array<{ title?: string; items: ModuleId[] }> = [
  { items: ['inicio', 'mentor'] },
  { title: 'Criar', items: ['estudio-video', 'estudio-imagem', 'apps', 'cortes', 'copy'] },
  { title: 'Vender', items: ['whatsapp'] },
  { title: 'Planejar', items: ['calendario'] },
  { title: 'Analisar', items: ['anuncios'] },
  { items: ['biblioteca', 'aulas', 'meu-negocio'] },
]

export const CREATE_MODULES: ModuleId[] = ['estudio-video', 'estudio-imagem', 'apps', 'copy', 'cortes']

export function moduleFor(route: Route): ModuleInfo | undefined {
  return Object.values(MODULES).find((m) => m.id === route || m.match?.includes(route))
}
