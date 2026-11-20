// Planos e pacotes à venda (cadastrados no Painel Admin, com o link da Cakto).
import { useEffect, useState } from 'react'
import { DEMO, supabase } from './supabase'

export type Oferta = { id: string; tipo: 'plano' | 'pacote'; nome: string; preco_brl: number; creditos: number; cakto_id: string | null; slug: string | null }

/** Código da oferta a partir do link da Cakto (ou o próprio código). */
export function caktoId(v: string) {
  const s = v.trim()
  if (!s) return ''
  try {
    const u = new URL(s.startsWith('http') ? s : `https://x/${s}`)
    return u.pathname.split('/').filter(Boolean).pop() ?? ''
  } catch {
    return s
  }
}
export const checkoutUrl = (id: string) => `https://pay.cakto.com.br/${id}`

let cache: Oferta[] | null = null

export function useOffers() {
  const [list, setList] = useState<Oferta[] | null>(cache)
  useEffect(() => {
    if (DEMO || !supabase) return setList([])
    supabase
      .from('offers')
      .select('id, tipo, nome, preco_brl, creditos, cakto_id, slug')
      .eq('ativo', true)
      .order('ordem')
      .order('preco_brl')
      .then(({ data }) => {
        cache = (data ?? []).map((o) => ({ ...o, preco_brl: Number(o.preco_brl), creditos: Number(o.creditos) })) as Oferta[]
        setList(cache)
      })
  }, [])
  return list
}

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
