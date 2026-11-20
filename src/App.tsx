import { useEffect } from 'react'
import { useAuth } from './lib/auth'
import { go, useRoute, type Route } from './lib/router'
import { DEMO } from './lib/supabase'
import { Landing } from './pages/Landing'
import { Login, Signup } from './pages/Auth'
import { Home } from './pages/Home'
import { NewStory } from './pages/NewStory'
import { Editor } from './pages/Editor'
import { Cast, NewCharacter } from './pages/Cast'
import { Lessons } from './pages/Lessons'
import { Plans } from './pages/Plans'
import { Account } from './pages/Account'
import { Cursor } from './components/Cursor'
import { MyBusiness, Onboarding } from './pages/Business'
import { Library } from './pages/Library'
import { VideoStudio } from './pages/VideoStudio'
import { Ads, Clips, WhatsApp } from './pages/Soon'
import { ImagePage } from './pages/ImagePage'
import { CalendarPage } from './pages/CalendarPage'
import { AppsPage, PublicApp } from './pages/AppsPage'
import { MentorPage } from './pages/MentorPage'
import { CopyPage } from './pages/CopyPage'
import { useBusiness } from './lib/business'

const publicRoutes: Route[] = ['site', 'entrar', 'criar-conta', 'publico']
// telas que dá pra abrir antes de terminar o cadastro do negócio
const beforeSetup: Route[] = ['comecar', 'novo-personagem', 'conta', 'planos']

function Screen() {
  const route = useRoute()
  const { ready, session } = useAuth()
  const loggedIn = DEMO || !!session
  const isPublic = publicRoutes.includes(route)
  const { business, loaded: bizLoaded } = useBusiness()
  const needsSetup = loggedIn && bizLoaded && !business.completed

  useEffect(() => {
    if (!ready || DEMO) return
    if (!loggedIn && !isPublic) go('entrar')
    if (loggedIn && (route === 'entrar' || route === 'criar-conta')) go('inicio')
  }, [ready, loggedIn, isPublic, route])

  // primeiro acesso: cadastro do negócio antes de tudo
  useEffect(() => {
    if (!ready || isPublic) return
    if (needsSetup && !beforeSetup.includes(route)) go('comecar')
    if (loggedIn && bizLoaded && business.completed && route === 'comecar') go('inicio')
  }, [ready, isPublic, needsSetup, route, loggedIn, bizLoaded, business.completed])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-accent border-t-transparent" aria-label="Carregando" />
      </div>
    )
  }

  switch (route) {
    case 'publico':
      return <PublicApp />
    case 'site':
      return <Landing />
    case 'entrar':
      return <Login />
    case 'criar-conta':
      return <Signup />
  }

  if (!loggedIn) return <Login />

  switch (route) {
    case 'inicio':
      return <Home />
    case 'nova-historinha':
      return <NewStory />
    case 'editor':
      return <Editor />
    case 'videos':
    case 'estudio-video':
      return <VideoStudio />
    case 'comecar':
      return <Onboarding />
    case 'meu-negocio':
      return <MyBusiness />
    case 'biblioteca':
      return <Library />
    case 'mentor':
      return <MentorPage />
    case 'estudio-imagem':
      return <ImagePage />
    case 'cortes':
      return <Clips />
    case 'copy':
      return <CopyPage />
    case 'whatsapp':
      return <WhatsApp />
    case 'calendario':
      return <CalendarPage />
    case 'anuncios':
      return <Ads />
    case 'apps':
      return <AppsPage />
    case 'elenco':
      return <Cast />
    case 'novo-personagem':
      return <NewCharacter />
    case 'aulas':
      return <Lessons />
    case 'planos':
      return <Plans />
    case 'conta':
      return <Account />
    default:
      return <Home />
  }
}

export default function App() {
  const route = useRoute()
  return (
    <>
      {route !== 'publico' && <Cursor />}
      <Screen />
    </>
  )
}
