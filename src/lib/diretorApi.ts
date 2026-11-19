// Conversa com o Diretor de verdade (função "diretor" no Supabase, que chama o Claude)
import type { Backdrop } from '../components/art'
import type { Part, Tone } from './director'
import { SECONDS_PER_PART } from './pricing'
import { supabase } from './supabase'

type Personagem = { nome: string; estilo: string }

const cenarios: Backdrop[] = ['noite', 'quarto', 'loja', 'rua', 'escritorio']
const cenario = (v: unknown): Backdrop => (cenarios.includes(v as Backdrop) ? (v as Backdrop) : 'noite')

export type ModoDiretor = 'caprichado' | 'rapido'

export async function pedirRoteiro(opts: { ideia: string; clima: Tone; partes: number; segundos: number; modo: ModoDiretor; personagens: Personagem[] }): Promise<{ title: string; parts: Part[] } | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('diretor', {
      body: { action: 'roteiro', ideia: opts.ideia, clima: opts.clima, partes: opts.partes, segundos: opts.segundos, modo: opts.modo, personagens: opts.personagens },
    })
    const partes = data?.partes as Array<Record<string, unknown>> | undefined
    if (error || !Array.isArray(partes) || partes.length === 0) return null
    return {
      title: String(data.titulo ?? '').trim() || 'Nova historinha',
      parts: partes.map((p, i) => ({
        num: i + 1,
        beat: String(p.momento ?? `Parte ${i + 1}`),
        scene: String(p.cena ?? ''),
        fala: String(p.fala ?? ''),
        prompt: String(p.prompt ?? ''),
        backdrop: cenario(p.cenario),
        status: 'rascunho',
      })),
    }
  } catch {
    return null
  }
}

export async function pedirAjuste(opts: {
  pedido: string
  titulo: string
  ideia: string
  personagens: Personagem[]
  parte: Part
  segundos?: number
}): Promise<{ resposta: string; scene: string; fala: string; prompt: string } | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.functions.invoke('diretor', {
      body: {
        action: 'ajuste',
        pedido: opts.pedido,
        titulo: opts.titulo,
        ideia: opts.ideia,
        personagens: opts.personagens,
        segundos: opts.segundos ?? SECONDS_PER_PART,
        modo: 'rapido',
        parte: { numero: opts.parte.num, momento: opts.parte.beat, cena: opts.parte.scene, fala: opts.parte.fala, prompt: opts.parte.prompt },
      },
    })
    if (error || !data?.resposta) return null
    return {
      resposta: String(data.resposta),
      scene: String(data.cena ?? opts.parte.scene),
      fala: String(data.fala ?? opts.parte.fala),
      prompt: String(data.prompt ?? opts.parte.prompt),
    }
  } catch {
    return null
  }
}
