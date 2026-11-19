import { useEffect } from 'react'
import { useAuth } from './lib/auth'
import { go, useRoute, type Route } from './lib/router'
import { DEMO } from './lib/supabase'
import { Landing } from './pages/Landing'
import { Login, Signup } from './pages/Auth'
import { Home } from './pages/Home'
import { NewStory } from './pages/NewStory'
import { Editor } from './pages/Editor'
import { Videos } from './pages/Videos'
import { Cast, NewCharacter } from './pages/Cast'
import { Lessons } from './pages/Lessons'
import { Plans } from './pages/Plans'
import { Account } from './pages/Account'
import { Cursor } from './components/Cursor'

const publicRoutes: Route[] = ['site', 'entrar', 'criar-conta']

function Screen() {
  const route = useRoute()
  const { ready, session } = useAuth()
  const loggedIn = DEMO || !!session
  const isPublic = publicRoutes.includes(route)

  useEffect(() => {
    if (!ready || DEMO) return
    if (!loggedIn && !isPublic) go('entrar')
    if (loggedIn && (route === 'entrar' || route === 'criar-conta')) go('inicio')
  }, [ready, loggedIn, isPublic, route])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-accent border-t-transparent" aria-label="Carregando" />
      </div>
    )
  }

  switch (route) {
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
      return <Videos />
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
  return (
    <>
      <Cursor />
      <Screen />
    </>
  )
}
