// Ações sugeridas pelo Mentor: abrem o módulo certo já preenchido.
import { go } from './router'
import type { ModuleId } from './modules'

export type MentorAction = { tipo: 'video' | 'copy' | 'imagem' | 'calendario' | 'whatsapp' | 'anuncios'; titulo: string; detalhe: string; formato?: string }

export const ACTION_MODULE: Record<MentorAction['tipo'], ModuleId> = {
  video: 'estudio-video',
  copy: 'copy',
  imagem: 'estudio-imagem',
  calendario: 'calendario',
  whatsapp: 'whatsapp',
  anuncios: 'anuncios',
}

export const ACTION_BUTTON: Record<MentorAction['tipo'], string> = {
  video: 'Gerar vídeo',
  copy: 'Escrever',
  imagem: 'Gerar imagem',
  calendario: 'Planejar',
  whatsapp: 'Abrir',
  anuncios: 'Abrir',
}

function stash(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* sem armazenamento */
  }
}

const COPY_TIPOS = ['legenda', 'gancho', 'anuncio', 'venda']

export function runAction(a: MentorAction) {
  switch (a.tipo) {
    case 'video':
      stash('plotoon:ideia', a.detalhe)
      try {
        sessionStorage.removeItem('plotoon:rascunho')
      } catch {
        /* sem armazenamento */
      }
      return go('nova-historinha')
    case 'copy':
      stash('plotoon:copy', JSON.stringify({ tipo: COPY_TIPOS.includes(String(a.formato)) ? a.formato : 'legenda', tema: a.detalhe }))
      return go('copy')
    case 'imagem':
      stash('plotoon:imagem', JSON.stringify({ pedido: a.detalhe, formato: a.formato }))
      return go('estudio-imagem')
    case 'calendario':
      stash('plotoon:calendario', a.detalhe)
      return go('calendario')
    default:
      return go(a.tipo)
  }
}
