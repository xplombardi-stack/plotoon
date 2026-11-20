// Preços em créditos. Os valores vêm da tabela "settings" do banco e podem mudar sem mexer no código.
export let SECONDS_PER_PART = 10
export let MAX_PARTS = 10
export let MAX_SECONDS_PER_PART = 15
export let CREDITS_PER_SECOND = 3
export let CREDITS_PER_CHARACTER = 5
export let CREDITS_PER_LOGO = 5
export let CREDITS_PER_MENTOR = 1
export let CREDITS_PER_MENTOR_IMAGES = 2
export let CREDITS_PER_COPY = 1
export let CREDITS_PER_IMAGE = 2
export let CREDITS_PER_PLAN = 3
export let CREDITS_PER_APP = 8
export const PART_LENGTHS = [10, 15]

export function applySettings(s: Record<string, number>) {
  if (s.seconds_per_part) SECONDS_PER_PART = s.seconds_per_part
  if (s.max_parts) MAX_PARTS = s.max_parts
  if (s.max_seconds_per_part) MAX_SECONDS_PER_PART = s.max_seconds_per_part
  if (s.credits_per_second) CREDITS_PER_SECOND = s.credits_per_second
  if (s.credits_per_character) CREDITS_PER_CHARACTER = s.credits_per_character
  if (s.credits_per_logo) CREDITS_PER_LOGO = s.credits_per_logo
  if (s.credits_per_mentor) CREDITS_PER_MENTOR = s.credits_per_mentor
  if (s.credits_per_mentor_images) CREDITS_PER_MENTOR_IMAGES = s.credits_per_mentor_images
  if (s.credits_per_copy) CREDITS_PER_COPY = s.credits_per_copy
  if (s.credits_per_image) CREDITS_PER_IMAGE = s.credits_per_image
  if (s.credits_per_plan) CREDITS_PER_PLAN = s.credits_per_plan
  if (s.credits_per_app) CREDITS_PER_APP = s.credits_per_app
}

// custo de uma parte (gerar ou refazer)
export function partCost(seconds = SECONDS_PER_PART) {
  return Math.ceil(seconds) * CREDITS_PER_SECOND
}
export function storyCost(parts: number, seconds = SECONDS_PER_PART) {
  return parts * partCost(seconds)
}
export function formatCredits(n: number) {
  return n.toLocaleString('pt-BR')
}
