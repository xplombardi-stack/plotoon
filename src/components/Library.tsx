// Biblioteca: junta tudo que a pessoa gerou (historinhas, personagens e itens dos outros módulos).
import { useEffect, useMemo } from 'react'
import { Clapperboard, Download, ExternalLink, FileText, Image as ImageIcon, RotateCcw, Scissors, User, X } from 'lucide-react'
import type { Backdrop, ToonLook } from './art'
import { Scene, Toon } from './art'
import { Button, cx, go, useToast, copyText } from './ui'
import { useBusiness, type LibraryKind } from '../lib/business'
import { timeAgo, useStore } from '../lib/store'
import type { Route } from '../lib/router'

export type Entry = {
  id: string
  kind: LibraryKind
  title: string
  createdAt: number
  status?: string
  image?: string
  video?: string
  look?: ToonLook
  backdrop?: Backdrop
  body?: string
  file?: string
  open?: () => void
  reuse: () => void
}

export const KIND_LABEL: Record<LibraryKind, string> = {
  historinha: 'Historinha',
  video: 'Vídeo',
  imagem: 'Imagem',
  corte: 'Corte',
  copy: 'Copy',
  personagem: 'Personagem',
  avatar: 'Avatar',
}

const KIND_ICON: Record<LibraryKind, typeof Clapperboard> = {
  historinha: Clapperboard,
  video: Clapperboard,
  imagem: ImageIcon,
  corte: Scissors,
  copy: FileText,
  personagem: User,
  avatar: User,
}

const MODULE_ROUTE: Record<LibraryKind, Route> = {
  historinha: 'nova-historinha',
  video: 'estudio-video',
  avatar: 'estudio-video',
  imagem: 'estudio-imagem',
  corte: 'cortes',
  copy: 'copy',
  personagem: 'novo-personagem',
}

function stash(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* sem armazenamento */
  }
}

export function useLibraryEntries(): Entry[] {
  const { stories, characters, openStory } = useStore()
  const { library } = useBusiness()
  return useMemo(() => {
    const out: Entry[] = []
    stories.forEach((s) => {
      out.push({
        id: `s-${s.id}`,
        kind: 'historinha',
        title: s.title,
        createdAt: s.createdAt,
        status: s.status === 'pronto' ? 'Pronto' : 'Gerando',
        look: characters.find((c) => c.id === s.characterIds[0])?.look,
        backdrop: s.parts[0]?.backdrop ?? 'noite',
        body: `${s.parts.length} partes de ${s.seconds}s`,
        open: () => {
          openStory(s.id)
          go('editor')
        },
        reuse: () => {
          stash('plotoon:rascunho', JSON.stringify({ step: 0, idea: s.idea, tone: s.tone, picked: s.characterIds, parts: s.parts.length, secs: s.seconds }))
          go('nova-historinha')
        },
      })
    })
    characters.forEach((c) => {
      out.push({
        id: `c-${c.id}`,
        kind: 'personagem',
        title: c.name,
        createdAt: c.createdAt,
        image: c.image ?? c.photo,
        look: c.look,
        file: c.image,
        open: () => go('elenco'),
        reuse: () => {
          stash('plotoon:rascunho', JSON.stringify({ step: 0, picked: [c.id] }))
          go('nova-historinha')
        },
      })
    })
    library.forEach((i) => {
      out.push({
        id: `l-${i.id}`,
        kind: i.kind,
        title: i.title,
        createdAt: i.createdAt,
        image: i.preview,
        video: i.file && /\.(mp4|webm|mov)(\?|$)/i.test(i.file) ? i.file : undefined,
        file: i.file,
        body: i.body,
        reuse: () => {
          if (i.kind === 'copy' && i.meta) stash('plotoon:copy', JSON.stringify({ tipo: i.meta.tipo, tema: i.meta.tema, extra: i.meta.extra }))
          else if (i.kind === 'imagem' && i.meta?.pedido) stash('plotoon:imagem', JSON.stringify({ pedido: i.meta.pedido, formato: i.meta.formato }))
          go(MODULE_ROUTE[i.kind])
        },
      })
    })
    return out.sort((a, b) => b.createdAt - a.createdAt)
  }, [stories, characters, library, openStory])
}

export function EntryThumb({ e, className }: { e: Entry; className?: string }) {
  if (e.video) return <video src={e.video} poster={e.image} muted loop playsInline autoPlay className={cx('absolute inset-0 h-full w-full object-cover', className)} />
  if (e.image) return <img src={e.image} alt="" className={cx('absolute inset-0 h-full w-full object-cover object-top', className)} />
  if (e.kind === 'historinha') return <Scene backdrop={e.backdrop ?? 'noite'} look={e.look} className={cx('absolute inset-0 h-full w-full', className)} />
  if (e.kind === 'personagem' && e.look)
    return (
      <span className={cx('absolute inset-0 bg-gradient-to-b from-[#2a1a12] to-[#120d0a]', className)}>
        <Toon look={e.look} className="absolute inset-x-0 bottom-0 w-full" />
      </span>
    )
  return (
    <span className={cx('absolute inset-0 flex items-center bg-gradient-to-br from-[#1d2230] to-[#12151d] p-4', className)}>
      <span className="line-clamp-6 text-[13px] leading-snug text-soft">{e.body ?? e.title}</span>
    </span>
  )
}

export function EntryCard({ e, onPick, i = 0 }: { e: Entry; onPick: (e: Entry) => void; i?: number }) {
  const Icon = KIND_ICON[e.kind]
  return (
    <button type="button" onClick={() => onPick(e)} className="pop lift group flex cursor-pointer flex-col gap-2.5 rounded-2xl text-left text-ink" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
      <span className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line-strong bg-side">
        <EntryThumb e={e} className="transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-bold text-white backdrop-blur">
            <Icon size={12} aria-hidden /> {KIND_LABEL[e.kind]}
          </span>
          {e.status && <span className={cx('rounded-full px-2 py-1 text-[11px] font-bold', e.status === 'Pronto' ? 'bg-sky text-[#06121f]' : 'bg-accent text-accent-ink')}>{e.status}</span>}
        </span>
      </span>
      <span className="flex flex-col gap-0.5 px-0.5">
        <span className="line-clamp-2 text-[14px] font-semibold leading-snug">{e.title}</span>
        <span className="text-[12.5px] text-muted">{timeAgo(e.createdAt)}</span>
      </span>
    </button>
  )
}

export function EntryPreview({ e, onClose }: { e: Entry; onClose: () => void }) {
  const toast = useToast()
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={e.title}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="sheet-up relative flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-t-[26px] border border-line-strong bg-side sm:rounded-[26px] sm:[animation-name:pop] md:flex-row">
        <div className="relative aspect-[4/5] max-h-[52vh] w-full shrink-0 overflow-hidden bg-bg md:aspect-auto md:max-h-none md:w-[46%]">
          <EntryThumb e={e} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-accent-text">{KIND_LABEL[e.kind]}</span>
              <h2 className="m-0 font-display text-[22px] font-bold leading-tight">{e.title}</h2>
              <span className="text-[13px] text-muted">
                {timeAgo(e.createdAt)}
                {e.status ? ` · ${e.status}` : ''}
              </span>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar" className="press -mr-2 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-surface">
              <X size={22} />
            </button>
          </div>
          {e.body && <p className="m-0 whitespace-pre-wrap rounded-xl border border-line bg-surface p-3.5 text-[14px] leading-relaxed text-soft">{e.body}</p>}
          <div className="mt-auto flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Button size="lg" onClick={e.reuse}>
              <RotateCcw size={18} /> Usar de novo
            </Button>
            {e.file ? (
              <a href={e.file} target="_blank" rel="noreferrer" download className="press inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-line-strong px-6 text-[15px] font-semibold text-ink no-underline hover:border-accent-line">
                <Download size={18} /> Baixar
              </a>
            ) : e.kind === 'copy' && e.body ? (
              <Button variant="secondary" size="lg" onClick={async () => toast.show((await copyText(e.body!)) ? 'Texto copiado' : 'Não deu pra copiar')}>
                <Download size={18} /> Copiar texto
              </Button>
            ) : (
              <Button variant="secondary" size="lg" disabled title="O download libera quando o vídeo final estiver pronto">
                <Download size={18} /> Baixar
              </Button>
            )}
            {e.open && (
              <Button variant="ghost" size="lg" onClick={e.open}>
                <ExternalLink size={18} /> Abrir
              </Button>
            )}
          </div>
          {!e.file && e.kind === 'historinha' && <p className="m-0 text-[12.5px] text-muted">O download do vídeo final libera quando a geração de vídeo e a montagem estiverem ligadas.</p>}
        </div>
      </div>
    </div>
  )
}
