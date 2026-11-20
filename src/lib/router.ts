import { useEffect, useState } from 'react'

// Navegação por #nome. Na prévia funciona sem servidor; no deploy dá pra trocar por rotas de verdade.
export const routes = [
  'site',
  'entrar',
  'criar-conta',
  'inicio',
  'nova-historinha',
  'editor',
  'videos',
  'elenco',
  'novo-personagem',
  'aulas',
  'planos',
  'conta',
  'comecar',
  'meu-negocio',
  'mentor',
  'estudio-video',
  'estudio-imagem',
  'cortes',
  'copy',
  'whatsapp',
  'calendario',
  'anuncios',
  'biblioteca',
  'apps',
  'admin',
  'publico',
] as const

export type Route = (typeof routes)[number]

const valid = new Set<string>(routes)

function read(): Route {
  const h = window.location.hash.replace('#', '')
  if (h.startsWith('p/')) return 'publico'
  return (valid.has(h) ? h : 'site') as Route
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(read)
  useEffect(() => {
    const onChange = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function go(route: Route) {
  if (window.location.hash === `#${route}`) return
  window.location.hash = route
}
