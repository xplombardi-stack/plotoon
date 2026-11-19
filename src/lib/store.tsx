// Estado do app. Na prévia fica no navegador; no ar, lê e grava no Supabase.
import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { randomLook, sampleLooks, type Backdrop, type ToonLook } from '../components/art'
import type { Part, Tone } from './director'
import { CREDITS_PER_CHARACTER, SECONDS_PER_PART, partCost, storyCost } from './pricing'
import { useAuth } from './auth'
import { DEMO, supabase } from './supabase'

export type StyleId = 'cinema' | 'fofinho' | 'realista'

export const styleList: Array<{ id: StyleId; name: string }> = [
  { id: 'cinema', name: 'Cinema 3D' },
  { id: 'fofinho', name: 'Fofinho' },
  { id: 'realista', name: 'Realista' },
]

export type Character = {
  id: string
  name: string
  style: StyleId
  look: ToonLook
  photo?: string
  image?: string
  createdAt: number
}

export type Story = {
  id: string
  title: string
  idea: string
  tone: Tone
  characterIds: string[]
  parts: Part[]
  seconds: number
  status: 'gerando' | 'pronto'
  createdAt: number
}

export type Usage = { id: string; when: number; what: string; credits: number }

export type Plan = 'nenhum' | 'start' | 'estudio' | 'pro'

type State = {
  name: string
  plan: Plan
  credits: number
  characters: Character[]
  stories: Story[]
  openStoryId: string | null
  usage: Usage[]
  loaded: boolean
}

type NewCharacter = Omit<Character, 'id' | 'createdAt'> & { imagePath?: string; photoPath?: string }
export type BonecoResult = { ok: true; look: ToonLook; image?: string; imagePath?: string; photoPath?: string } | { ok: false; error: string }
type NewStory = { title: string; idea: string; tone: Tone; characterIds: string[]; parts: Part[]; seconds: number }

type Store = State & {
  live: boolean
  setName: (name: string) => void
  gerarBoneco: (foto: string, style: StyleId) => Promise<BonecoResult>
  addCharacter: (c: NewCharacter) => Promise<boolean>
  createStory: (s: NewStory) => Promise<string | null>
  updatePart: (storyId: string, num: number, patch: Partial<Part>) => void
  redoPart: (storyId: string, num: number) => Promise<boolean>
  openStory: (id: string) => void
  addCredits: (n: number, what: string) => boolean
  reset: () => void
  reload: () => Promise<void>
}

const KEY = 'plotoon:previa:v2'
const fresh: State = { name: '', plan: 'estudio', credits: 300, characters: [], stories: [], openStoryId: null, usage: [], loaded: true }
const empty: State = { name: '', plan: 'nenhum', credits: 0, characters: [], stories: [], openStoryId: null, usage: [], loaded: false }

const uid = () => Math.random().toString(36).slice(2, 10)

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const st = { ...fresh, ...JSON.parse(raw), loaded: true } as State
      return { ...st, stories: st.stories.map((s) => ({ ...s, seconds: s.seconds ?? SECONDS_PER_PART })) }
    }
  } catch {
    /* sem armazenamento */
  }
  return fresh
}

function lookFor(id: string): ToonLook {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return sampleLooks[Math.abs(h) % sampleLooks.length]
}

function dataUrlToBlob(dataUrl: string) {
  const [head, body] = dataUrl.split(',')
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/jpeg'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const live = !DEMO && !!supabase
  const [state, setState] = useState<State>(() => (live ? empty : loadLocal()))
  const openRef = useRef<string | null>(null)

  // ---------- prévia: guarda no navegador ----------
  useEffect(() => {
    if (live) return
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* sem armazenamento */
    }
  }, [state, live])

  // ---------- no ar: carrega do Supabase ----------
  const reload = useCallback(async () => {
    if (!supabase || !userId) return
    const [prof, chars, sts, scs, links, tx] = await Promise.all([
      supabase.from('profiles').select('name, plan, credits').eq('id', userId).single(),
      supabase.from('characters').select('id, name, style, look, photo_path, image_path, created_at').order('created_at', { ascending: false }),
      supabase.from('stories').select('id, title, idea, tone, status, created_at, parts_count, duration_seconds').order('created_at', { ascending: false }),
      supabase.from('scenes').select('story_id, position, beat, description, dialogue, prompt, backdrop, status').order('position'),
      supabase.from('story_characters').select('story_id, character_id'),
      supabase.from('credit_transactions').select('id, amount, reason, created_at').order('created_at', { ascending: false }).limit(30),
    ])

    const paths = (chars.data ?? []).flatMap((c) => [c.photo_path, c.image_path]).filter(Boolean) as string[]
    const signed: Record<string, string> = {}
    if (paths.length) {
      const { data } = await supabase.storage.from('media').createSignedUrls(paths, 60 * 60)
      data?.forEach((d) => {
        if (d.path && d.signedUrl) signed[d.path] = d.signedUrl
      })
    }

    const characters: Character[] = (chars.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      style: (c.style ?? 'cinema') as StyleId,
      look: (c.look as ToonLook | null) ?? lookFor(c.id),
      photo: c.photo_path ? signed[c.photo_path] : undefined,
      image: c.image_path ? signed[c.image_path] : undefined,
      createdAt: new Date(c.created_at).getTime(),
    }))

    const stories: Story[] = (sts.data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      idea: s.idea ?? '',
      tone: (s.tone ?? 'motivacional') as Tone,
      seconds: s.parts_count && s.duration_seconds ? Math.round(Number(s.duration_seconds) / s.parts_count) : SECONDS_PER_PART,
      status: s.status === 'pronto' ? 'pronto' : 'gerando',
      createdAt: new Date(s.created_at).getTime(),
      characterIds: (links.data ?? []).filter((l) => l.story_id === s.id).map((l) => l.character_id),
      parts: (scs.data ?? [])
        .filter((p) => p.story_id === s.id)
        .map((p) => ({
          num: p.position,
          beat: p.beat ?? `Parte ${p.position}`,
          scene: p.description ?? '',
          fala: p.dialogue ?? '',
          prompt: p.prompt ?? '',
          backdrop: (p.backdrop ?? 'noite') as Backdrop,
          status: p.status === 'pronta' ? 'pronta' : p.status === 'gerando' ? 'gerando' : 'rascunho',
        })),
    }))

    setState((st) => ({
      ...st,
      loaded: true,
      name: prof.data?.name ?? '',
      plan: (prof.data?.plan ?? 'nenhum') as Plan,
      credits: prof.data?.credits ?? 0,
      characters,
      stories,
      openStoryId: openRef.current ?? st.openStoryId,
      usage: (tx.data ?? []).map((t) => ({ id: t.id, when: new Date(t.created_at).getTime(), what: t.reason, credits: t.amount })),
    }))
  }, [userId])

  useEffect(() => {
    if (!live) return
    if (!userId) {
      setState(empty)
      return
    }
    reload()
  }, [live, userId, reload])

  // ---------- simula a geração das partes (até ligar o gerador de vídeo) ----------
  const generating = state.stories.some((s) => s.parts.some((p) => p.status === 'gerando'))
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])
  useEffect(() => {
    if (!generating) return
    const t = window.setInterval(() => {
      const st = stateRef.current
      st.stories.forEach((s) => {
        const next = s.parts.find((p) => p.status === 'gerando')
        if (!next) return
        const remaining = s.parts.filter((p) => p.status === 'gerando').length
        setState((cur) => ({
          ...cur,
          stories: cur.stories.map((x) =>
            x.id === s.id
              ? { ...x, status: remaining === 1 ? 'pronto' : 'gerando', parts: x.parts.map((p) => (p.num === next.num ? { ...p, status: 'pronta' } : p)) }
              : x,
          ),
        }))
        if (live && supabase) {
          supabase.from('scenes').update({ status: 'pronta' }).eq('story_id', s.id).eq('position', next.num).then(() => {
            if (remaining === 1) supabase!.from('stories').update({ status: 'pronto' }).eq('id', s.id).then(() => undefined)
          })
        }
      })
    }, 1600)
    return () => window.clearInterval(t)
  }, [generating, live])

  const spendLocal = (st: State, amount: number, what: string): State | null => {
    if (st.credits < amount) return null
    return { ...st, credits: st.credits - amount, usage: [{ id: uid(), when: Date.now(), what, credits: -amount }, ...st.usage].slice(0, 30) }
  }

  const store = useMemo<Store>(() => {
    const local = {
      setName: (name: string) => setState((st) => ({ ...st, name })),
      gerarBoneco: async (): Promise<BonecoResult> => {
        if (state.credits < CREDITS_PER_CHARACTER) return { ok: false, error: 'creditos_insuficientes' }
        setState((st) => spendLocal(st, CREDITS_PER_CHARACTER, 'Boneco 3D') ?? st)
        await new Promise((r) => window.setTimeout(r, 1800))
        return { ok: true, look: randomLook() }
      },
      addCharacter: async (c: NewCharacter) => {
        const { imagePath: _i, photoPath: _p, ...rest } = c
        void _i
        void _p
        setState((st) => ({ ...st, characters: [{ ...rest, id: uid(), createdAt: Date.now() }, ...st.characters] }))
        return true
      },
      createStory: async (s: NewStory) => {
        const cost = storyCost(s.parts.length, s.seconds)
        if (state.credits < cost) return null
        const id = uid()
        setState((st) => {
          const after = spendLocal(st, cost, `${s.parts.length} partes de ${s.seconds}s · ${s.title}`)
          if (!after) return st
          const story: Story = { ...s, id, parts: s.parts.map((p) => ({ ...p, status: 'gerando' })), status: 'gerando', createdAt: Date.now() }
          return { ...after, stories: [story, ...after.stories], openStoryId: id }
        })
        return id
      },
      redoPart: async (storyId: string, num: number) => {
        const secs = state.stories.find((x) => x.id === storyId)?.seconds ?? SECONDS_PER_PART
        if (state.credits < partCost(secs)) return false
        setState((st) => {
          const after = spendLocal(st, partCost(secs), `Refazer parte ${num}`)
          if (!after) return st
          return {
            ...after,
            stories: after.stories.map((s) => (s.id === storyId ? { ...s, status: 'gerando', parts: s.parts.map((p) => (p.num === num ? { ...p, status: 'gerando' } : p)) } : s)),
          }
        })
        return true
      },
      addCredits: (n: number, what: string) => {
        setState((st) => ({ ...st, credits: st.credits + n, usage: [{ id: uid(), when: Date.now(), what, credits: n }, ...st.usage].slice(0, 30) }))
        return true
      },
    }

    const remote = {
      setName: (name: string) => {
        setState((st) => ({ ...st, name }))
        if (supabase && userId) supabase.from('profiles').update({ name }).eq('id', userId).then(() => undefined)
      },
      gerarBoneco: async (foto: string, style: StyleId): Promise<BonecoResult> => {
        if (!supabase) return { ok: false, error: 'falha_boneco' }
        const { data, error } = await supabase.functions.invoke('boneco', { body: { foto, estilo: style } })
        if (error) {
          let code = 'falha_boneco'
          try {
            const ctx = (error as { context?: Response }).context
            const body = ctx ? await ctx.json() : null
            if (body?.error) code = String(body.error)
          } catch {
            /* sem detalhe */
          }
          await reload()
          return { ok: false, error: code }
        }
        await reload()
        return { ok: true, look: randomLook(), image: data?.imagem, imagePath: data?.imagem_path, photoPath: data?.foto_path }
      },
      addCharacter: async (c: NewCharacter) => {
        if (!supabase || !userId) return false
        let photoPath: string | null = c.photoPath ?? null
        if (!photoPath && c.photo?.startsWith('data:')) {
          photoPath = `${userId}/fotos/${Date.now()}.jpg`
          const { error } = await supabase.storage.from('media').upload(photoPath, dataUrlToBlob(c.photo), { contentType: 'image/jpeg' })
          if (error) photoPath = null
        }
        const { error } = await supabase.rpc('save_character', {
          p_name: c.name,
          p_style: c.style,
          p_look: c.look,
          p_photo_path: photoPath,
          p_image_path: c.imagePath ?? null,
        })
        if (error) return false
        await reload()
        return true
      },
      createStory: async (s: NewStory) => {
        if (!supabase) return null
        const { data, error } = await supabase.rpc('create_story', {
          p_title: s.title,
          p_idea: s.idea,
          p_tone: s.tone,
          p_character_ids: s.characterIds,
          p_parts: s.parts.map((p) => ({ beat: p.beat, scene: p.scene, fala: p.fala, prompt: p.prompt, backdrop: p.backdrop })),
          p_seconds: s.seconds,
        })
        if (error || !data) return null
        openRef.current = data as string
        await reload()
        setState((st) => ({ ...st, openStoryId: data as string }))
        return data as string
      },
      redoPart: async (storyId: string, num: number) => {
        if (!supabase) return false
        const { error } = await supabase.rpc('redo_part', { p_story: storyId, p_position: num })
        if (error) return false
        await reload()
        return true
      },
      addCredits: () => false,
    }

    const impl = live ? remote : local
    return {
      ...state,
      live,
      ...impl,
      updatePart: (storyId, num, patch) => {
        setState((st) => ({
          ...st,
          stories: st.stories.map((s) => (s.id === storyId ? { ...s, parts: s.parts.map((p) => (p.num === num ? { ...p, ...patch } : p)) } : s)),
        }))
        if (live && supabase) {
          const row: Record<string, string> = {}
          if (patch.fala !== undefined) {
            row.dialogue = patch.fala
            row.caption = patch.fala
          }
          if (patch.scene !== undefined) row.description = patch.scene
          if (patch.prompt !== undefined) row.prompt = patch.prompt
          if (Object.keys(row).length) supabase.from('scenes').update(row).eq('story_id', storyId).eq('position', num).then(() => undefined)
        }
      },
      openStory: (id) => {
        openRef.current = id
        setState((st) => ({ ...st, openStoryId: id }))
      },
      reset: () => {
        if (!live) setState({ ...fresh, name: state.name })
      },
      reload,
    }
  }, [state, live, userId, reload])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore fora do StoreProvider')
  return ctx
}

export function timeAgo(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

// Reduz a foto pra uma miniatura leve
export function photoThumb(file: File, size = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('sem canvas'))
      const s = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}
