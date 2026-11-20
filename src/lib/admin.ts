// Painel Admin: quem é admin e os dados que o painel lê e edita.
import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { DEMO, supabase } from './supabase'

let cache: { uid: string; admin: boolean } | null = null

/** A conta logada é admin? (na prévia, sim, pra dar pra ver o painel) */
export function useIsAdmin() {
  const { session } = useAuth()
  const uid = session?.user.id ?? ''
  const [admin, setAdmin] = useState<boolean>(() => DEMO || (cache?.uid === uid && cache.admin))
  useEffect(() => {
    if (DEMO || !supabase || !uid) return
    if (cache?.uid === uid) return setAdmin(cache.admin)
    let off = false
    supabase.rpc('is_admin').then(({ data }) => {
      cache = { uid, admin: data === true }
      if (!off) setAdmin(data === true)
    })
    return () => {
      off = true
    }
  }, [uid])
  return admin
}

export type AdminUser = { id: string; email: string; name: string | null; plan: string | null; credits: number; gasto: number; comprado: number; created_at: string; ultimo_uso: string | null; admin: boolean }
export type Consumo = { dia: string; modulo: string; creditos: number; usos: number }
export type ApiCost = { key: string; label: string; unidade: string; custo_brl: number; acao: string | null }
export type Setting = { key: string; value: number; description: string | null }
export type Offer = { id: string; tipo: 'plano' | 'pacote'; nome: string; preco_brl: number; creditos: number; cakto_id: string | null; ativo: boolean; ordem: number }
export type Uso = { modulo: string; custo_usd: number; creditos: number; created_at: string }
export type Pagamento = { valor_brl: number; status: string; created_at: string; descricao: string | null }

export type AdminData = {
  users: AdminUser[]
  consumo: Consumo[]
  custos: ApiCost[]
  settings: Setting[]
  offers: Offer[]
  usos: Uso[]
  pagamentos: Pagamento[]
}

const dias = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

export async function loadAdmin(): Promise<AdminData> {
  if (DEMO || !supabase) return demoAdmin()
  const [u, c, k, s, o, a, p] = await Promise.all([
    supabase.rpc('admin_users'),
    supabase.rpc('admin_consumo', { p_dias: 30 }),
    supabase.from('api_costs').select('key, label, unidade, custo_brl, acao').order('label'),
    supabase.from('settings').select('key, value, description').order('key'),
    supabase.from('offers').select('*').order('tipo').order('ordem').order('preco_brl'),
    supabase.from('ai_usage').select('modulo, custo_usd, creditos, created_at').gte('created_at', dias(30)).limit(5000),
    supabase.from('payments').select('valor_brl, status, created_at, descricao').gte('created_at', dias(30)).limit(5000),
  ])
  const err = u.error || c.error || k.error || s.error || o.error
  if (err) throw err
  const num = <T extends Record<string, unknown>>(rows: T[] | null, keys: (keyof T)[]) => (rows ?? []).map((r) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, Number(r[k] ?? 0)])) })) as T[]
  return {
    users: num(u.data as AdminUser[], ['credits', 'gasto', 'comprado']),
    consumo: num(c.data as Consumo[], ['creditos', 'usos']),
    custos: num(k.data as ApiCost[], ['custo_brl']),
    settings: num(s.data as Setting[], ['value']),
    offers: num(o.data as Offer[], ['preco_brl', 'creditos', 'ordem']),
    usos: num(a.data as Uso[], ['custo_usd', 'creditos']),
    pagamentos: num(p.data as Pagamento[], ['valor_brl']),
  }
}

export async function saveSetting(key: string, value: number) {
  if (DEMO || !supabase) return true
  const { error } = await supabase.from('settings').update({ value }).eq('key', key)
  return !error
}
export async function saveCost(key: string, custo_brl: number) {
  if (DEMO || !supabase) return true
  const { error } = await supabase.from('api_costs').update({ custo_brl, updated_at: new Date().toISOString() }).eq('key', key)
  return !error
}
export async function saveOffer(o: Omit<Offer, 'id'> & { id?: string }) {
  if (DEMO || !supabase) return { ...o, id: o.id ?? crypto.randomUUID() } as Offer
  const row = { tipo: o.tipo, nome: o.nome, preco_brl: o.preco_brl, creditos: o.creditos, cakto_id: o.cakto_id, ativo: o.ativo, ordem: o.ordem }
  const q = o.id ? supabase.from('offers').update(row).eq('id', o.id).select().single() : supabase.from('offers').insert(row).select().single()
  const { data, error } = await q
  return error ? null : ({ ...data, preco_brl: Number(data.preco_brl), creditos: Number(data.creditos) } as Offer)
}
export async function deleteOffer(id: string) {
  if (DEMO || !supabase) return true
  const { error } = await supabase.from('offers').delete().eq('id', id)
  return !error
}

/* ---------- prévia ---------- */
function demoAdmin(): AdminData {
  const hoje = new Date()
  const d = (n: number) => new Date(hoje.getTime() - n * 86400000).toISOString().slice(0, 10)
  const mods = ['Mentor', 'Vídeo do produto', 'Imagem', 'Copy', 'Calendário', 'Criador de apps', 'Logo']
  const consumo: Consumo[] = []
  for (let i = 0; i < 14; i++)
    mods.forEach((m, k) => {
      const v = Math.round((Math.sin(i * 0.7 + k) + 1.4) * [6, 40, 8, 3, 3, 8, 5][k])
      if (v > 0) consumo.push({ dia: d(i), modulo: m, creditos: v, usos: Math.max(1, Math.round(v / [1, 30, 2, 1, 3, 8, 5][k])) })
    })
  const users: AdminUser[] = [
    { id: '1', email: 'lombardimsp@gmail.com', name: 'Felipe', plan: 'estudio', credits: 1240, gasto: 860, comprado: 2100, created_at: d(20), ultimo_uso: d(0), admin: true },
    { id: '2', email: 'ana.doceria@gmail.com', name: 'Ana', plan: 'start', credits: 42, gasto: 258, comprado: 300, created_at: d(12), ultimo_uso: d(1), admin: false },
    { id: '3', email: 'barbearia.vip@gmail.com', name: 'Rafa', plan: 'pro', credits: 610, gasto: 390, comprado: 1000, created_at: d(6), ultimo_uso: d(0), admin: false },
    { id: '4', email: 'loja.bella@gmail.com', name: 'Bella', plan: 'nenhum', credits: 0, gasto: 0, comprado: 0, created_at: d(2), ultimo_uso: null, admin: false },
  ]
  return {
    users,
    consumo,
    custos: [
      { key: 'mentor', label: 'Mentor (Claude)', unidade: 'por mensagem', custo_brl: 0.12, acao: 'credits_per_mentor' },
      { key: 'imagem', label: 'Imagem (Gemini)', unidade: 'por imagem', custo_brl: 0.25, acao: 'credits_per_image' },
      { key: 'video_ia', label: 'Vídeo do produto feito do zero (Claude)', unidade: 'por segundo de vídeo', custo_brl: 0.17, acao: 'credits_per_video_second' },
      { key: 'historinha', label: 'Historinha com boneco (vídeo)', unidade: 'por segundo de vídeo', custo_brl: 0.9, acao: 'credits_per_second' },
      { key: 'app', label: 'Criador de apps (Claude)', unidade: 'por geração', custo_brl: 0.9, acao: 'credits_per_app' },
    ],
    settings: [
      { key: 'credits_per_mentor', value: 1, description: null },
      { key: 'credits_per_image', value: 2, description: null },
      { key: 'credits_per_video_second', value: 1, description: null },
      { key: 'credits_per_second', value: 3, description: null },
      { key: 'credits_per_app', value: 8, description: null },
      { key: 'referral_bonus', value: 50, description: null },
      { key: 'credit_value_cents', value: 20, description: null },
      { key: 'usd_brl_cents', value: 550, description: null },
    ],
    offers: [
      { id: 'o1', tipo: 'plano', nome: 'Start', preco_brl: 47, creditos: 200, cakto_id: null, ativo: true, ordem: 1 },
      { id: 'o2', tipo: 'plano', nome: 'Estúdio', preco_brl: 97, creditos: 500, cakto_id: null, ativo: true, ordem: 2 },
      { id: 'o3', tipo: 'pacote', nome: 'Teste', preco_brl: 4.99, creditos: 20, cakto_id: null, ativo: true, ordem: 0 },
    ],
    usos: [{ modulo: 'video_ia', custo_usd: 0.74, creditos: 30, created_at: d(1) }],
    pagamentos: [
      { valor_brl: 97, status: 'pago', created_at: d(3), descricao: 'Plano Estúdio' },
      { valor_brl: 47, status: 'pago', created_at: d(5), descricao: 'Plano Start' },
    ],
  }
}
