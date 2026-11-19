// Preços em créditos. No ar, os valores vêm da tabela "settings" do Supabase
// (edite lá e o app atualiza). Estes números são o padrão da prévia.

export let SECONDS_PER_PART = 10 // cada parte do vídeo tem até 10 segundos
export let MAX_PARTS = 6 // até 6 partes
export let CREDITS_PER_PART = 30 // gerar 1 parte
export let CREDITS_REDO_PART = 30 // refazer 1 parte
export let CREDITS_PER_CHARACTER = 5 // criar 1 personagem

export function applySettings(s: Record<string, number>) {
  if (s.seconds_per_part) SECONDS_PER_PART = s.seconds_per_part
  if (s.max_parts) MAX_PARTS = s.max_parts
  if (s.credits_per_part) CREDITS_PER_PART = s.credits_per_part
  if (s.credits_redo_part) CREDITS_REDO_PART = s.credits_redo_part
  if (s.credits_per_character) CREDITS_PER_CHARACTER = s.credits_per_character
}

export function storyCost(parts: number) {
  return parts * CREDITS_PER_PART
}

export function formatCredits(n: number) {
  return n.toLocaleString('pt-BR')
}
