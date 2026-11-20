// Tarefas que continuam rodando quando a pessoa troca de tela (criar app, roteiro de vídeo, Mentor).
// Ficam fora dos componentes; a tela, quando volta, pega o resultado. Um aviso no canto mostra o andamento.
import { useSyncExternalStore } from 'react'
import type { Route } from './router'

export type JobKind = 'app' | 'video' | 'mentor'
export type Job = {
  id: string
  kind: JobKind
  label: string // "Criando seu app"
  doneLabel: string // "Seu app está pronto"
  route: Route
  status: 'running' | 'done' | 'error'
  startedAt: number
  input?: unknown
  result?: unknown
  error?: string
  consumed: boolean // a tela já usou o resultado
  progress?: unknown // andamento (ex.: cenas prontas)
}

let jobs: Job[] = []
const subs = new Set<() => void>()
const emit = () => {
  jobs = [...jobs]
  subs.forEach((f) => f())
}

export function subscribe(f: () => void) {
  subs.add(f)
  return () => subs.delete(f)
}
const snapshot = () => jobs

export function useJobs() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Começa uma tarefa. A promessa devolve o resultado ou lança um erro com o código. */
export function startJob<T>(o: { kind: JobKind; label: string; doneLabel: string; route: Route; input?: unknown; run: () => Promise<T> }) {
  // uma tarefa de cada tipo por vez: a antiga já consumida sai da lista
  jobs = jobs.filter((j) => !(j.kind === o.kind && j.status !== 'running'))
  const job: Job = { id: Math.random().toString(36).slice(2), kind: o.kind, label: o.label, doneLabel: o.doneLabel, route: o.route, status: 'running', startedAt: Date.now(), input: o.input, consumed: false }
  jobs.push(job)
  emit()
  o.run()
    .then((r) => {
      job.status = 'done'
      job.result = r
    })
    .catch((e) => {
      job.status = 'error'
      job.error = String(e?.message ?? e ?? 'erro')
    })
    .finally(emit)
  return job.id
}

export function latestJob(kind: JobKind) {
  for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].kind === kind) return jobs[i]
  return undefined
}

export function consumeJob(id: string) {
  const j = jobs.find((x) => x.id === id)
  if (j && !j.consumed) {
    j.consumed = true
    emit()
  }
}

export function dismissJob(id: string) {
  jobs = jobs.filter((j) => j.id !== id)
  emit()
}

/** Atualiza o andamento de uma tarefa (a tela mostra enquanto roda). */
export function updateJob(id: string, progress: unknown) {
  const j = jobs.find((x) => x.id === id)
  if (!j) return
  j.progress = progress
  emit()
}
