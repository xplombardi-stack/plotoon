// Perfil do negócio (base de todos os módulos) e itens da Biblioteca.
// Na prévia fica no navegador; no ar, lê e grava no Supabase.
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth'
import { CREDITS_PER_LOGO } from './pricing'
import { useStore } from './store'
import { DEMO, supabase } from './supabase'

export type Socials = { instagram?: string; tiktok?: string; youtube?: string; whatsapp?: string; site?: string }

export type Business = {
  name: string
  niche: string
  sells: string
  audience: string
  tone: string
  logo?: string // endereço pra mostrar
  logoPath?: string // caminho no armazenamento
  colors: string[]
  socials: Socials
  completed: boolean
  tipo?: string // tipo de negócio, igual ao do Atendente WhatsApp
}

export type LibraryKind = 'video' | 'historinha' | 'imagem' | 'corte' | 'copy' | 'personagem' | 'avatar'

export type LibraryItem = {
  id: string
  kind: LibraryKind
  module: string
  title: string
  preview?: string
  file?: string
  body?: string
  meta?: Record<string, unknown>
  createdAt: number
}

export const emptyBusiness: Business = { name: '', niche: '', sells: '', audience: '', tone: '', colors: [], socials: {}, completed: false }

export const NICHES = ['Loja de roupas', 'Restaurante e delivery', 'Beleza e estética', 'Academia e saúde', 'Imóveis', 'Carros e motos', 'Infoproduto e cursos', 'Serviços locais', 'Pet shop', 'Outro']
export const TONES = [
  { id: 'amigavel', label: 'Amigável', sub: 'Leve, próximo, com emoji na medida' },
  { id: 'divertido', label: 'Divertido', sub: 'Bem-humorado e cheio de energia' },
  { id: 'profissional', label: 'Profissional', sub: 'Direto, confiável e claro' },
  { id: 'luxo', label: 'Sofisticado', sub: 'Elegante, exclusivo, premium' },
  { id: 'urgente', label: 'Vendedor', sub: 'Chamada forte pra ação, oferta na frente' },
]
export const BRAND_COLORS = ['#ff8a3d', '#ff5da2', '#a78bfa', '#5b8cff', '#38bdf8', '#34d399', '#facc15', '#ef4444', '#111827', '#f5f5f4']

export type LogoStyle = 'moderna' | 'minimalista' | 'divertida' | 'elegante' | 'mascote'
export const LOGO_STYLES: Array<{ id: LogoStyle; label: string }> = [
  { id: 'moderna', label: 'Moderna' },
  { id: 'minimalista', label: 'Minimalista' },
  { id: 'divertida', label: 'Divertida' },
  { id: 'elegante', label: 'Elegante' },
  { id: 'mascote', label: 'Com mascote' },
]
export type LogoResult = { ok: true; url: string; path?: string } | { ok: false; error: string }

type Ctx = {
  business: Business
  loaded: boolean
  saveBusiness: (patch: Partial<Business>) => Promise<boolean>
  uploadLogo: (file: File) => Promise<boolean>
  createLogo: (opts: { name: string; niche: string; colors: string[]; style: LogoStyle; idea: string }) => Promise<LogoResult>
  applyLogo: (url: string, path?: string) => Promise<boolean>
  library: LibraryItem[]
  addLocalItem: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => void
  reloadLibrary: () => Promise<void>
}

// Logo de exemplo na prévia (sem gastar com IA): monograma com as cores da marca
function demoLogo(name: string, colors: string[], style: LogoStyle) {
  const a = colors[0] ?? '#ff8a3d'
  const b = colors[1] ?? '#5b8cff'
  const letter = (name.trim()[0] ?? 'P').toUpperCase()
  const shape =
    style === 'minimalista'
      ? `<circle cx="256" cy="200" r="92" fill="none" stroke="${a}" stroke-width="10"/>`
      : style === 'elegante'
        ? `<rect x="168" y="112" width="176" height="176" rx="8" transform="rotate(45 256 200)" fill="none" stroke="${a}" stroke-width="8"/>`
        : style === 'divertida' || style === 'mascote'
          ? `<circle cx="256" cy="200" r="100" fill="${a}"/><circle cx="320" cy="140" r="30" fill="${b}"/>`
          : `<rect x="160" y="104" width="192" height="192" rx="48" fill="url(#g)"/>`
  const font = style === 'elegante' ? 'Georgia,serif' : 'Arial,Helvetica,sans-serif'
  const fill = style === 'minimalista' || style === 'elegante' ? a : '#fff'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="512" height="512" fill="#fff"/>${shape}<text x="256" y="236" text-anchor="middle" font-family="${font}" font-weight="700" font-size="110" fill="${fill}">${letter}</text><text x="256" y="390" text-anchor="middle" font-family="${font}" font-weight="700" font-size="44" fill="#111827">${name.replace(/[<&>]/g, '').slice(0, 22)}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const KEY = 'plotoon:negocio:v1'
const LIB_KEY = 'plotoon:biblioteca:v1'
const BusinessContext = createContext<Ctx | null>(null)

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

// Diminui a logo pra caber bem (quadrado de até 512px), em PNG pra manter o fundo transparente
async function shrinkLogo(file: File, size = 512): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = fail
      i.src = url
    })
    const scale = Math.min(1, size / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error('logo'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

function blobToDataUrl(b: Blob) {
  return new Promise<string>((ok) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.readAsDataURL(b)
  })
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { credits, addCredits, reload: reloadStore } = useStore()
  const userId = session?.user.id ?? null
  const live = !DEMO && !!supabase
  const [business, setBusiness] = useState<Business>(() => (live ? emptyBusiness : readLocal(KEY, emptyBusiness)))
  const [library, setLibrary] = useState<LibraryItem[]>(() => {
    if (live) return []
    try {
      return JSON.parse(localStorage.getItem(LIB_KEY) ?? '[]') as LibraryItem[]
    } catch {
      return []
    }
  })
  const [loaded, setLoaded] = useState(!live)

  useEffect(() => {
    if (live) return
    try {
      localStorage.setItem(KEY, JSON.stringify(business))
    } catch {
      /* sem armazenamento */
    }
  }, [business, live])

  const load = useCallback(async () => {
    if (!supabase || !userId) return
    const [biz, lib] = await Promise.all([
      supabase.from('business_profiles').select('name, niche, sells, audience, tone, logo_path, colors, socials, completed_at, tipo').eq('user_id', userId).maybeSingle(),
      supabase.from('library_items').select('id, kind, module, title, preview_path, file_path, body, meta, created_at').order('created_at', { ascending: false }).limit(200),
    ])
    const paths = [biz.data?.logo_path, ...(lib.data ?? []).flatMap((i) => [i.preview_path, i.file_path])].filter(Boolean) as string[]
    const signed: Record<string, string> = {}
    if (paths.length) {
      const { data } = await supabase.storage.from('media').createSignedUrls(paths, 60 * 60)
      data?.forEach((d) => {
        if (d.path && d.signedUrl) signed[d.path] = d.signedUrl
      })
    }
    const b = biz.data
    setBusiness(
      b
        ? {
            name: b.name,
            niche: b.niche,
            sells: b.sells,
            audience: b.audience,
            tone: b.tone,
            logoPath: b.logo_path ?? undefined,
            logo: b.logo_path ? signed[b.logo_path] : undefined,
            colors: b.colors ?? [],
            socials: (b.socials as Socials) ?? {},
            completed: !!b.completed_at,
            tipo: b.tipo ?? undefined,
          }
        : emptyBusiness,
    )
    setLibrary(
      (lib.data ?? []).map((i) => ({
        id: i.id,
        kind: i.kind as LibraryKind,
        module: i.module,
        title: i.title,
        preview: i.preview_path ? signed[i.preview_path] : undefined,
        file: i.file_path ? signed[i.file_path] : undefined,
        body: i.body ?? undefined,
        meta: (i.meta as Record<string, unknown>) ?? undefined,
        createdAt: new Date(i.created_at).getTime(),
      })),
    )
    setLoaded(true)
  }, [userId])

  useEffect(() => {
    if (!live) return
    if (!userId) {
      setBusiness(emptyBusiness)
      setLibrary([])
      setLoaded(false)
      return
    }
    load()
  }, [live, userId, load])

  const saveBusiness = useCallback(
    async (patch: Partial<Business>) => {
      const next = { ...business, ...patch }
      setBusiness(next)
      if (!live) return true
      if (!supabase || !userId) return false
      const { error } = await supabase.from('business_profiles').upsert({
        user_id: userId,
        name: next.name.trim().slice(0, 80),
        niche: next.niche.trim().slice(0, 60),
        sells: next.sells.trim().slice(0, 400),
        audience: next.audience.trim().slice(0, 400),
        tone: next.tone.slice(0, 40),
        logo_path: next.logoPath ?? null,
        colors: next.colors.slice(0, 6),
        socials: next.socials,
        completed_at: next.completed ? new Date().toISOString() : null,
        ...(next.tipo ? { tipo: next.tipo } : {}),
      })
      return !error
    },
    [business, live, userId],
  )

  const uploadLogo = useCallback(
    async (file: File) => {
      try {
        const blob = await shrinkLogo(file)
        if (!live) {
          setBusiness((b) => ({ ...b, logo: undefined }))
          const dataUrl = await blobToDataUrl(blob)
          setBusiness((b) => ({ ...b, logo: dataUrl }))
          return true
        }
        if (!supabase || !userId) return false
        const path = `${userId}/negocio/logo-${Date.now()}.png`
        const up = await supabase.storage.from('media').upload(path, blob, { contentType: 'image/png', upsert: true })
        if (up.error) return false
        const { data } = await supabase.storage.from('media').createSignedUrl(path, 60 * 60)
        const prev = business.logoPath
        const ok = await saveBusiness({ logoPath: path, logo: data?.signedUrl })
        if (ok && prev && prev !== path && prev.includes('/negocio/')) await supabase.storage.from('media').remove([prev])
        return ok
      } catch {
        return false
      }
    },
    [live, userId, business.logoPath, saveBusiness],
  )

  const createLogo = useCallback(
    async (o: { name: string; niche: string; colors: string[]; style: LogoStyle; idea: string }): Promise<LogoResult> => {
      if (!live) {
        if (credits < CREDITS_PER_LOGO) return { ok: false, error: 'creditos_insuficientes' }
        addCredits(-CREDITS_PER_LOGO, 'Logo com IA')
        await new Promise((r) => window.setTimeout(r, 2200))
        const url = demoLogo(o.name, o.colors, o.style)
        setLibrary((l) => {
          const next = [{ id: Math.random().toString(36).slice(2), kind: 'imagem' as const, module: 'logo', title: `Logo ${o.name}`, preview: url, file: url, createdAt: Date.now() }, ...l]
          try {
            localStorage.setItem(LIB_KEY, JSON.stringify(next.slice(0, 60)))
          } catch {
            /* sem armazenamento */
          }
          return next
        })
        return { ok: true, url }
      }
      if (!supabase) return { ok: false, error: 'falha_logo' }
      const { data, error } = await supabase.functions.invoke('logo', { body: { nome: o.name, nicho: o.niche, cores: o.colors, estilo: o.style, ideia: o.idea } })
      if (error || !data?.imagem) {
        let code = 'falha_logo'
        try {
          const ctx = (error as { context?: Response } | null)?.context
          const body = ctx ? await ctx.json() : null
          if (body?.error) code = String(body.error)
        } catch {
          /* sem detalhe */
        }
        await reloadStore()
        return { ok: false, error: code }
      }
      await Promise.all([reloadStore(), load()])
      return { ok: true, url: data.imagem, path: data.imagem_path }
    },
    [live, credits, addCredits, reloadStore, load],
  )

  const applyLogo = useCallback(
    async (url: string, path?: string) => {
      if (!live) return saveBusiness({ logo: url })
      const prev = business.logoPath
      const ok = await saveBusiness({ logo: url, logoPath: path })
      // a logo antiga só sai do armazenamento se era uma enviada (as da IA ficam na Biblioteca)
      if (ok && supabase && prev && prev !== path && prev.includes('/negocio/')) await supabase.storage.from('media').remove([prev])
      return ok
    },
    [live, business.logoPath, saveBusiness],
  )

  // prévia: guarda na Biblioteca do navegador
  const addLocalItem = useCallback((item: Omit<LibraryItem, 'id' | 'createdAt'>) => {
    setLibrary((l) => {
      const next = [{ ...item, id: Math.random().toString(36).slice(2), createdAt: Date.now() }, ...l]
      try {
        localStorage.setItem(LIB_KEY, JSON.stringify(next.slice(0, 60)))
      } catch {
        /* sem armazenamento */
      }
      return next
    })
  }, [])
  const reloadLibrary = useCallback(async () => {
    if (live) await load()
  }, [live, load])

  const value = useMemo(
    () => ({ business, loaded, saveBusiness, uploadLogo, createLogo, applyLogo, library, addLocalItem, reloadLibrary }),
    [business, loaded, saveBusiness, uploadLogo, createLogo, applyLogo, library, addLocalItem, reloadLibrary],
  )
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusiness fora do BusinessProvider')
  return ctx
}

// Sugestão do dia do Mentor (fixa por nicho até o Mentor de verdade entrar na fase 2)
const tips: Record<string, Array<{ idea: string; why: string }>> = {
  'Loja de roupas': [
    { idea: 'Cliente entra na loja sem saber o que vestir e sai pronta pro encontro', why: 'Antes e depois prende e mostra o produto em uso.' },
    { idea: 'A peça que esgotou em 2 dias voltou ao estoque', why: 'Escassez dá vontade de comprar agora.' },
  ],
  'Restaurante e delivery': [
    { idea: 'O motoboy que chegou antes da fome bater', why: 'Mostra rapidez, que é o que mais pesa no delivery.' },
    { idea: 'O prato que fez o cliente voltar 3 vezes na mesma semana', why: 'Prova social vende mais que foto bonita.' },
  ],
  'Beleza e estética': [
    { idea: 'Ela chegou insegura e saiu se achando a mais linda do salão', why: 'Transformação é o gancho mais forte do nicho.' },
  ],
  'Infoproduto e cursos': [
    { idea: 'Ele riu do curso, 3 meses depois pediu ajuda pra começar', why: 'Virada de jogo é o roteiro que mais converte.' },
  ],
}
const genericTips = [
  { idea: 'O cliente que duvidou e virou o maior fã da marca', why: 'Historinha com virada prende até o final e termina com a chamada.' },
  { idea: 'Um dia normal no seu negócio, do começo ao fim', why: 'Bastidor gera confiança e aproxima quem ainda não comprou.' },
]

export function tipOfTheDay(b: Business) {
  const list = tips[b.niche] ?? genericTips
  const day = Math.floor(Date.now() / 86_400_000)
  return list[day % list.length]
}
